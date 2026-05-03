/**
 * AetherLink Web — Multi-Peer P2P File Transfer (Large File Ready)
 * v3: sequential queue · small chunks · back-pressure · disk writes
 */

// ─────────────────────────────────────────
//  Storage helpers
// ─────────────────────────────────────────
const SK = {
    NAME: 'aetherlink-device-name',
    PREV: 'aetherlink-prev-devices',
    HOST_ROOM: 'aetherlink-host-room',
};

function loadName() {
    let n = localStorage.getItem(SK.NAME);
    if (!n) {
        n = `AetherLink-${Math.floor(Math.random() * 9000) + 1000}`;
        localStorage.setItem(SK.NAME, n);
    }
    return n;
}

function saveName(name) { localStorage.setItem(SK.NAME, name); }

function loadPrev() {
    try { return JSON.parse(localStorage.getItem(SK.PREV) || '[]'); } catch { return []; }
}

function addToPrev(name) {
    const list = loadPrev().filter(d => d.name !== name);
    list.unshift({ name, ts: Date.now() });
    localStorage.setItem(SK.PREV, JSON.stringify(list.slice(0, 12)));
}

// ── إدارة تذكر المضيف ──
function setHostRoom(roomId) {
    if (roomId) localStorage.setItem(SK.HOST_ROOM, roomId);
    else localStorage.removeItem(SK.HOST_ROOM);
}
function getHostRoom() { return localStorage.getItem(SK.HOST_ROOM); }
function clearHostRoom() { localStorage.removeItem(SK.HOST_ROOM); }

// ─────────────────────────────────────────
//  Transfer constants
// ─────────────────────────────────────────
const CHUNK_SIZE = 64 * 1024;        // 64 KB — maximum transfer speed
const BUFFER_HIGH = 4 * 1024 * 1024; // 4 MB — generous buffer
const BUFFER_LOW  = 1 * 1024 * 1024; // 1 MB — resume below this
const SEND_DELAY_MS = 0;             // zero delay — raw speed

const SIG_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://aetherlink-server.onrender.com';

// ─────────────────────────────────────────
//  Global state
// ─────────────────────────────────────────
let deviceName        = loadName();
let roomId            = '';
let isHost            = false;
let isMinimized       = false;
let isLocalConnection = false;
let pipWindow         = null;
let pipDocument       = null;

const peers = new Map();
const localDiscovery = new Map();
const localConnected = new Set();
const reconnectTimers = new Map();
let isDiscovering    = false;

// Send queue: sequential file sending
const sendQueue = [];
let isSendingQueue = false;
const sendingFiles = new Map(); // fileId -> {cancelled}
const ackTimeouts  = new Map(); // fileId -> timeoutId (fallback removal if ACK never arrives)

// Pending queue: visible file list
const pendingFiles = new Map(); // fileId -> {file, status: 'waiting'|'sending'|'done', objectUrl}

// Receive map
const recvMap = new Map(); // fileId -> {meta, writer, received, fromId}
const downloadedFiles = new Map();

let sessionMessages = [];
let sessionFiles    = [];

const mainEl = document.getElementById('main-container');

// ─────────────────────────────────────────
//  Socket
// ─────────────────────────────────────────
const socket = io(SIG_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 300,
    reconnectionDelayMax: 3000,
    timeout: 10000,
    transports: ['websocket'], // ✅ WebSocket مباشرةً — بدون تأخير polling
});

// ─────────────────────────────────────────
//  Chunk protocol — fileId-prefixed binary
//  Format: [4 bytes: idLen LE][idLen bytes: fileId][chunk data]
// ─────────────────────────────────────────
function makeChunkWithId(fileId, chunkArrayBuffer) {
    const idBytes = new TextEncoder().encode(fileId);
    const out = new Uint8Array(4 + idBytes.length + chunkArrayBuffer.byteLength);
    new DataView(out.buffer).setUint32(0, idBytes.length, true);
    out.set(idBytes, 4);
    out.set(new Uint8Array(chunkArrayBuffer), 4 + idBytes.length);
    return out;
}

function parseChunkWithId(raw) {
    const ab = (raw.buffer && raw.byteOffset !== undefined)
        ? raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
        : (raw instanceof ArrayBuffer ? raw : raw.buffer);
    const view   = new DataView(ab);
    const idLen  = view.getUint32(0, true);
    const fileId = new TextDecoder().decode(new Uint8Array(ab, 4, idLen));
    const chunk  = ab.slice(4 + idLen);
    return { fileId, chunk };
}

// ─────────────────────────────────────────
//  File System Writer — writes directly to disk
//  Falls back to in-memory buffer for unsupported browsers
// ─────────────────────────────────────────
class FileWriter {
    constructor(fileName, fileSize) {
        this.fileName = fileName;
        this.fileSize = fileSize;
        this.received = 0;
        this.chunks = [];       // fallback buffer
        this.stream = null;     // FileSystemWritableFileStream
        this.writer = null;     // WritableStreamDefaultWriter
        this.closed = false;
    }

    async open() {
        // Try File System Access API (Chrome/Edge)
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: this.fileName,
                });
                this.stream = await handle.createWritable();
                this.writer = this.stream.getWriter();
                return true;
            } catch (err) {
                // User cancelled or API failed — fall back
            }
        }
        // Fallback: accumulate in memory
        this.chunks = [];
        return false;
    }

    async write(chunk) {
        if (this.closed) return;
        if (this.writer) {
            await this.writer.write(new Uint8Array(chunk));
        } else {
            this.chunks.push(chunk);
        }
        this.received += chunk.byteLength;
    }

    async close() {
        if (this.closed) return;
        this.closed = true;
        if (this.writer) {
            await this.writer.close();
            return null; // already saved to disk
        }
        // Fallback: create Blob from accumulated chunks
        return new Blob(this.chunks);
    }

    async abort() {
        if (this.closed) return;
        this.closed = true;
        if (this.writer) {
            try { await this.writer.abort(); } catch (_) {}
        }
        this.chunks = [];
    }
}

// ─────────────────────────────────────────
//  Canvas particle network
// ─────────────────────────────────────────
function addPendingQueueStyles() {
    if (document.getElementById('pending-queue-styles')) return;
    const style = document.createElement('style');
    style.id = 'pending-queue-styles';
    style.textContent = `
    .pending-queue-panel { 
        background: rgba(10,26,48,0.7); 
        border: 1px solid rgba(0,210,255,0.15); 
        border-radius: 12px; 
        margin: 8px 16px; 
        padding: 12px; 
        max-height: 160px; 
        overflow-y: auto; 
        backdrop-filter: blur(8px);
    }
    .pending-queue-title { 
        font-size: .78rem; 
        font-weight: 700; 
        color: #00d2ff; 
        margin-bottom: 8px; 
        display: flex; 
        align-items: center; 
        gap: 6px; 
    }
    .pending-queue-grid { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 8px; 
    }
    .pending-item { 
        position: relative; 
        width: 72px; 
        height: 72px; 
        border-radius: 8px; 
        overflow: hidden; 
        border: 2px solid rgba(0,210,255,0.2); 
        background: rgba(0,0,0,0.3); 
        flex-shrink: 0;
        transition: transform .2s, border-color .2s;
    }
    .pending-item:hover { 
        transform: scale(1.05); 
        border-color: rgba(0,210,255,0.5); 
    }
    .pending-item img, .pending-item video { 
        width: 100%; 
        height: 100%; 
        object-fit: cover; 
    }
    .pending-item-icon { 
        width: 100%; 
        height: 100%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 1.6rem; 
    }
    .pending-item-del { 
        position: absolute; 
        top: 2px; 
        right: 2px; 
        width: 20px; 
        height: 20px; 
        border-radius: 50%; 
        background: rgba(255,80,80,0.85); 
        color: #fff; 
        border: none; 
        font-size: .65rem; 
        cursor: pointer; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        opacity: 0; 
        transition: opacity .2s;
        line-height: 1;
        padding: 0;
    }
    .pending-item:hover .pending-item-del { 
        opacity: 1; 
    }
    .pending-item-name { 
        position: absolute; 
        bottom: 0; 
        left: 0; 
        right: 0; 
        background: rgba(0,0,0,0.65); 
        color: #fff; 
        font-size: .55rem; 
        padding: 2px 4px; 
        white-space: nowrap; 
        overflow: hidden; 
        text-overflow: ellipsis;
        direction: ltr;
        text-align: center;
    }
    .pending-item.waiting { 
        border-color: rgba(255,193,7,0.5); 
        animation: pendingPulse 1.5s ease-in-out infinite; 
    }
    @keyframes pendingPulse { 
        0%,100% { opacity: 1; } 
        50% { opacity: .6; } 
    }
    .pending-item.sending { 
        border-color: rgba(67,233,123,0.5); 
    }
    .pending-item.done { 
        border-color: rgba(67,233,123,0.8); 
        opacity: .7;
    }
    .home-return-btn {
        background: linear-gradient(135deg, rgba(0,210,255,.12), rgba(58,123,213,.12));
        border: 1px solid rgba(0,210,255,.25);
        border-radius: 20px;
        padding: 6px 14px;
        color: #00d2ff;
        font-family: 'Tajawal', sans-serif;
        font-size: .78rem;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all .3s;
        backdrop-filter: blur(4px);
    }
    .home-return-btn:hover {
        background: linear-gradient(135deg, rgba(0,210,255,.25), rgba(58,123,213,.25));
        border-color: rgba(0,210,255,.5);
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(0,210,255,.15);
    }
    .home-return-icon { font-size: .9rem; }
    .sender-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 4px;
    }
    .cancel-send-btn {
        background: rgba(255,80,80,.15);
        border: 1px solid rgba(255,80,80,.35);
        border-radius: 6px;
        padding: 3px 8px;
        color: #ff6b6b;
        font-family: 'Tajawal',sans-serif;
        font-size: .68rem;
        font-weight: 700;
        cursor: pointer;
        transition: all .2s;
        white-space: nowrap;
    }
    .cancel-send-btn:hover {
        background: rgba(255,80,80,.3);
        border-color: rgba(255,80,80,.6);
    }
    .file-msg-box.cancelled {
        opacity: .5;
        filter: grayscale(.7);
    }
    `;
    document.head.appendChild(style);
}

function initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let pts = [];

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        const n = Math.min(Math.floor((canvas.width * canvas.height) / 10000), 110);
        pts = Array.from({ length: n }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.45,
            vy: (Math.random() - 0.5) * 0.45,
            r: Math.random() * 1.8 + 0.6,
        }));
    }

    resize();
    window.addEventListener('resize', resize);

    const D = 155;

    (function frame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const W = canvas.width, H = canvas.height;

        for (const p of pts) {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0)  { p.x = 0;  p.vx *= -1; }
            if (p.x > W)  { p.x = W;  p.vx *= -1; }
            if (p.y < 0)  { p.y = 0;  p.vy *= -1; }
            if (p.y > H)  { p.y = H;  p.vy *= -1; }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(120,190,255,0.75)';
            ctx.fill();
        }

        for (let i = 0; i < pts.length - 1; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x;
                const dy = pts[i].y - pts[j].y;
                const d  = Math.sqrt(dx * dx + dy * dy);
                if (d < D) {
                    ctx.beginPath();
                    ctx.moveTo(pts[i].x, pts[i].y);
                    ctx.lineTo(pts[j].x, pts[j].y);
                    ctx.strokeStyle = `rgba(58,123,213,${(1 - d / D) * 0.45})`;
                    ctx.lineWidth   = 0.8;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(frame);
    })();
}

// ─────────────────────────────────────────
//  Picture-in-Picture
// ─────────────────────────────────────────
async function enterPiPMode() {
    try {
        if ('documentPictureInPicture' in window) {
            pipWindow = await window.documentPictureInPicture.requestWindow({ width: 400, height: 300, disallowReturnToOpener: false });
            pipDocument = pipWindow.document;
            document.querySelectorAll('link[rel="stylesheet"], style').forEach(s => {
                pipDocument.head.appendChild(s.cloneNode(true));
            });
            setupPiPContent();
            pipWindow.addEventListener('pagehide', () => setMini(false));
            toast('وضع النافذة العائمة مفعل', 'success');
            return true;
        }
        showCustomPiP();
        return true;
    } catch (err) {
        console.error('PiP error:', err);
        showMiniWidget();
        return false;
    }
}

function setupPiPContent() {
    if (!pipDocument) return;
    const connected = getConnected();
    const n = connected.length;
    pipDocument.body.innerHTML = `
        <div style="width:100%;height:100%;background:linear-gradient(135deg,#020a18,#0a1a30);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Tajawal',sans-serif;color:#dde4f0;position:relative;overflow:hidden;">
            <div style="position:absolute;inset:0;background:radial-gradient(circle at 40% 50%,rgba(58,123,213,.3) 0%,transparent 60%),radial-gradient(circle at 70% 30%,rgba(155,89,182,.2) 0%,transparent 50%);"></div>
            <div style="position:relative;z-index:1;text-align:center;padding:20px;">
                <h1 style="font-size:1.8rem;font-weight:900;background:linear-gradient(120deg,#00d2ff,#3a7bd5,#9b59b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px;">AetherLink</h1>
                <div style="font-size:.9rem;color:#00d2ff;margin-bottom:16px;">📡 ${esc(deviceName)}</div>
                <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 16px;background:${n > 0 ? 'rgba(67,233,123,.15)' : 'rgba(255,193,7,.15)'};border:1px solid ${n > 0 ? 'rgba(67,233,123,.3)' : 'rgba(255,193,7,.3)'};border-radius:20px;color:${n > 0 ? '#43e97b' : '#ffc107'};font-weight:700;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${n > 0 ? '#43e97b' : '#ffc107'};${n > 0 ? 'animation:pulse 2s ease-in-out infinite;' : ''}"></span>
                    ${n > 0 ? `${n} متصل` : 'في الانتظار...'}
                </div>
                ${n > 0 ? `<div style="margin-top:12px;font-size:.75rem;color:#8899aa;">${connected.map(([_, p]) => `📱 ${esc(p.name)}`).join('<br>')}</div>` : ''}
            </div>
            <button onclick="this.closest('body').dispatchEvent(new Event('pip-expand'))" style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#00d2ff,#3a7bd5);border:none;border-radius:20px;padding:8px 20px;color:#fff;font-family:'Tajawal',sans-serif;font-weight:700;cursor:pointer;z-index:2;">⤢ توسيع</button>
        </div>`;
    const style = pipDocument.createElement('style');
    style.textContent = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`;
    pipDocument.head.appendChild(style);
    pipDocument.body.addEventListener('pip-expand', () => setMini(false));
}

function showCustomPiP() {
    const pip = document.getElementById('pip-container');
    if (!pip) return;
    pip.classList.remove('hidden');
    updateCustomPiP();
    initPiPDrag();
}

function updateCustomPiP() {
    const pip = document.getElementById('pip-container');
    const vc  = document.getElementById('pip-video-container');
    if (!pip || !vc) return;
    const connected = getConnected();
    const n = connected.length;
    vc.innerHTML = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center;">
            <h2 style="font-size:1.3rem;font-weight:900;background:linear-gradient(120deg,#00d2ff,#3a7bd5,#9b59b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px;">AetherLink</h2>
            <div style="font-size:.75rem;color:#00d2ff;margin-bottom:12px;">📡 ${esc(deviceName)}</div>
            <div class="pip-status">
                <span class="pip-status-dot" style="background:${n > 0 ? '#43e97b' : '#ffc107'};"></span>
                <span>${n > 0 ? `${n} متصل` : 'في الانتظار...'}</span>
            </div>
            ${n > 0 ? `<div style="margin-top:8px;font-size:.7rem;color:#8899aa;">${connected.map(([_, p]) => `📱 ${esc(p.name)}`).join('<br>')}</div>` : ''}
            <div class="pip-controls">
                <button class="pip-btn pip-expand-btn" title="توسيع">⤢</button>
                <button class="pip-btn pip-close-btn" title="إغلاق">✕</button>
            </div>
        </div>`;
    vc.querySelector('.pip-expand-btn')?.addEventListener('click', () => setMini(false));
    vc.querySelector('.pip-close-btn')?.addEventListener('click', () => pip.classList.add('hidden'));
}

function hidePiP() {
    if (pipWindow && !pipWindow.closed) { pipWindow.close(); pipWindow = null; pipDocument = null; }
    document.getElementById('pip-container')?.classList.add('hidden');
}

function initPiPDrag() {
    const pip = document.getElementById('pip-container');
    if (!pip) return;
    let ox = 0, oy = 0, sl = 0, st = 0, drag = false;
    const start = (cx, cy) => {
        if (event?.target?.closest('button')) return;
        drag = true; ox = cx; oy = cy;
        const r = pip.getBoundingClientRect(); sl = r.left; st = r.top;
    };
    const move = (cx, cy) => {
        if (!drag) return;
        pip.style.left = `${sl + cx - ox}px`; pip.style.top = `${st + cy - oy}px`;
        pip.style.right = 'auto'; pip.style.bottom = 'auto';
    };
    const stop = () => { drag = false; };
    pip.addEventListener('mousedown', e => start(e.clientX, e.clientY));
    document.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    document.addEventListener('mouseup', stop);
    pip.addEventListener('touchstart', e => { const t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
    pip.addEventListener('touchmove',  e => { const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true });
    pip.addEventListener('touchend', stop);
}

function showMiniWidget() {
    const mini = document.getElementById('mini-widget');
    if (!mini) return;
    mini.classList.remove('hidden');
    const n = getConnected().length;
    document.getElementById('mini-dot').className = `mini-dot${n > 0 ? ' on' : ''}`;
    document.getElementById('mini-label').textContent = 'AetherLink';
    document.getElementById('mini-peer-count').textContent = n > 0 ? `(${n} متصل)` : '';
}

function hideMiniWidget() {
    document.getElementById('mini-widget')?.classList.add('hidden');
}

// ─────────────────────────────────────────
//  Socket listeners
// ─────────────────────────────────────────
function setupSocket() {
    
     socket.on('connect', () => {
        console.log('✅ Socket:', socket.id);

        // ألغِ كل timers إعادة الاتصال — socket IDs قد تغيّرت
        reconnectTimers.forEach(({ timer }) => clearTimeout(timer));
        reconnectTimers.clear();

        // دمّر جميع الـ peers غير المتصلة
        const toDestroy = [];
        peers.forEach(({ peer, connected }, id) => {
            if (!connected) toDestroy.push({ id, peer });
        });
        toDestroy.forEach(({ id, peer }) => {
            try { peer.destroy(); } catch (_) {}
            peers.delete(id);
        });

        // إعادة الانضمام للغرفة (ليُرسل الخادم room-peers من جديد)
        if (roomId) socket.emit('join-room', { roomId, deviceName });
    });

    socket.on('connect_error', () => toast('خطأ في الاتصال بالخادم', 'error'));
    socket.on('waiting-for-peer', () => setStatus('في انتظار انضمام الطرف الآخر...'));

    socket.on('room-peers', (list) => {
        if (list.length === 0) return setStatus('في انتظار انضمام الطرف الآخر...');
        list.forEach(({ id, name }) => makePeer(id, name, true));
    });

    socket.on('new-peer', ({ id, name }) => makePeer(id, name, false));

    socket.on('receive-signal', ({ signal, from }) => {
        const pi = peers.get(from);
        if (pi) pi.peer.signal(signal);
    });

    socket.on('peer-left', ({ id, name }) => {
        const pi = peers.get(id);
        if (pi) { try { pi.peer.destroy(); } catch (_) {} peers.delete(id); }
        addToPrev(name);
        updatePeersUI(); updatePiPStatus();
        toast(`${name} غادر الجلسة`, 'warning');
        if (getConnected().length === 0) setBadge('warn', '● منقطع');
    });

    // ── socket قديم لنفس الجهاز أعاد الاتصال — نظّف بصمت بدون reconnect ──
    socket.on('peer-stale', ({ id }) => {
        const pi = peers.get(id);
        if (!pi) return;
        if (pi._keepalive) clearInterval(pi._keepalive);
        try { pi.peer.destroy(); } catch (_) {}
        peers.delete(id);
        if (reconnectTimers.has(id)) {
            clearTimeout(reconnectTimers.get(id).timer);
            reconnectTimers.delete(id);
        }
        console.log(`♻️  نُظِّف socket قديم ${id.slice(0,8)}…`);
    });

    socket.on('reconnect-request', ({ from, fromName }) => showReconnectModal(fromName, from));

    socket.on('reconnect-accepted', ({ newRoomId }) => {
        window.location.search = `?id=${newRoomId}`;
    });

    socket.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect')
            toast('جاري إعادة الاتصال بالخادم...', 'warning');
    });

    // ── Local Discovery events ───────────────
    socket.on('discovery-update', (devices) => {
        localDiscovery.clear();
        devices.forEach(d => {
            if (d.socketId !== socket.id) localDiscovery.set(d.socketId, d);
        });
        updateLocalDevicesUI();
    });

    socket.on('connect-invite', ({ from, fromName, roomId: inviteRoomId }) => {
        showLocalInviteModal(from, fromName, inviteRoomId);
    });

    socket.on('connect-invite-response', ({ accepted, roomId: inviteRoomId }) => {
        if (accepted) {
            toast('✅ تم قبول الاتصال! جاري إنشاء الاتصال...', 'success');
        } else {
            toast('رفض الجهاز الاتصال', 'warning');
            const btn = document.querySelector('[data-sid] .local-connect-btn');
            if (btn) { btn.textContent = 'اتصال'; btn.disabled = false; }
        }
    });
}

function updatePiPStatus() {
    if (pipWindow && !pipWindow.closed) setupPiPContent();
    else if (!document.getElementById('pip-container')?.classList.contains('hidden')) updateCustomPiP();
}

// ─────────────────────────────────────────
//  Peer management
// ─────────────────────────────────────────
function makePeer(peerId, peerName, initiator) {
    if (reconnectTimers.has(peerId)) {
        clearTimeout(reconnectTimers.get(peerId).timer);
        reconnectTimers.delete(peerId);
    }

    for (const [oldId, info] of reconnectTimers.entries()) {
        if (info.peerName === peerName) {
            clearTimeout(info.timer);
            reconnectTimers.delete(oldId);
            const oldPi = peers.get(oldId);
            if (oldPi) {
                if (oldPi._keepalive) clearInterval(oldPi._keepalive);
                try { oldPi.peer.destroy(); } catch (_) {}
                peers.delete(oldId);
            }
        }
    }
 
    const peer = new SimplePeer({
        initiator,
        trickle: true,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:openrelay.metered.ca:80' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
            ],
            iceCandidatePoolSize: 10,
            iceTransportPolicy: 'all',
        },
        channelConfig: {
            ordered: true,
            maxRetransmits: 3,
        },
    });
 
    peers.set(peerId, { peer, name: peerName, connected: false });
 
    peer.on('signal', (data) => socket.emit('send-signal', { to: peerId, signal: data }));
 
    peer.on('connect', () => {
        const pi = peers.get(peerId);
        if (pi) pi.connected = true;
        addToPrev(peerName);
 
        try { peer.send(JSON.stringify({ type: 'hello', name: deviceName })); } catch (_) {}
 
        updatePeersUI();
        updatePiPStatus();
        renderConnectedUI();
        setBadge('ok', '● متصل');
        toast(`✅ متصل بـ ${peerName}`, 'success');
 
        if (isLocalConnection) localConnected.add(peerId);
 
        const kTimer = setInterval(() => {
            const p = peers.get(peerId);
            if (!p || !p.connected) { clearInterval(kTimer); return; }
            try {
                p.peer.send(JSON.stringify({ type: 'ping' }));
            } catch (_) {
                clearInterval(kTimer);
            }
        }, 5000);
 
        if (peers.has(peerId)) peers.get(peerId)._keepalive = kTimer;
    });
 
    peer.on('data', (data) => onData(data, peerId));
 
    peer.on('close', () => {
        const pi = peers.get(peerId);
        if (!pi) return;
        const wasConnected = pi.connected ?? false;
        if (pi._keepalive) clearInterval(pi._keepalive);

        peers.delete(peerId);
        localConnected.delete(peerId);
        try { peer.destroy(); } catch (_) {}

        updatePeersUI();
        updatePiPStatus();

        if (wasConnected) {
            toast(`⚠️ انقطع الاتصال مع ${peerName}، جاري إعادة المحاولة...`, 'warning');
            scheduleReconnect(peerId, peerName, 1);
        }
    });
 
    peer.on('error', (e) => {
        console.error('Peer error', peerId, e);
        const pi = peers.get(peerId);
        if (!pi) return;
        const wasConnected = pi.connected ?? false;
        if (pi._keepalive) clearInterval(pi._keepalive);

        peers.delete(peerId);
        localConnected.delete(peerId);
        try { peer.destroy(); } catch (_) {}

        updatePeersUI();
        updatePiPStatus();
        scheduleReconnect(peerId, peerName, wasConnected ? 1 : 2);
    });
}
 

function getConnected() {
    return [...peers.entries()].filter(([_, p]) => p.connected);
}

function scheduleReconnect(peerId, peerName, attempt = 1) {
    if (reconnectTimers.has(peerId)) {
        clearTimeout(reconnectTimers.get(peerId).timer);
    }

    const delay = Math.min(500 * attempt, 10000);
    console.log(`🔄 إعادة الاتصال بـ ${peerName} بعد ${delay}ms (محاولة ${attempt})`);

    const timer = setTimeout(() => {
        reconnectTimers.delete(peerId);

        if (!socket.connected) {
            scheduleReconnect(peerId, peerName, attempt + 1);
            return;
        }

        const current = peers.get(peerId);
        if (current && current.connected) return;

        const initiator = socket.id < peerId;
        makePeer(peerId, peerName, initiator);
    }, delay);

    reconnectTimers.set(peerId, { timer, attempt, peerName });
    setBadge('warn', `● إعادة الاتصال... (${attempt})`);
}

// ─────────────────────────────────────────
//  Incoming data handler
// ─────────────────────────────────────────
function onData(raw, fromId) {
    if (typeof raw === 'string') {
        try {
            const msg = JSON.parse(raw);
            handleJsonMsg(msg, fromId);
        } catch (_) {}
        return;
    }
    const firstByte = raw[0];
    if (firstByte === 0x7B) {
        try {
            const msg = JSON.parse(raw.toString());
            handleJsonMsg(msg, fromId);
            return;
        } catch (_) {}
    }
    recvChunk(raw, fromId);
}

 function handleJsonMsg(msg, fromId) {
    switch (msg.type) {
        case 'hello': {
            const pi = peers.get(fromId);
            if (pi) { pi.name = msg.name; updatePeersUI(); updatePiPStatus(); }
            break;
        }
        case 'ping': {
            const pi = peers.get(fromId);
            if (pi?.connected) {
                try { pi.peer.send(JSON.stringify({ type: 'pong' })); } catch (_) {}
            }
            break;
        }
        case 'pong':
            break;
        case 'metadata': {
            // إذا كان هناك استقبال سابق لنفس الملف، ألغِه
            const existingEntry = recvMap.get(msg.payload.fileId);
            if (existingEntry) {
                existingEntry.writer.abort().catch(() => {});
                recvMap.delete(msg.payload.fileId);
                resetRecvUI(msg.payload.fileId);
            }
            // إنشاء writer جديد وابدأ الاستقبال
            const writer = new FileWriter(msg.payload.fileName, msg.payload.fileSize);
            recvMap.set(msg.payload.fileId, {
                meta: msg.payload,
                writer: writer,
                received: 0,
                fromId,
            });
            // افتح الملف على القرص
            writer.open().then(() => {
                createReceivingFileBox(msg.payload, fromId);
            }).catch(err => {
                console.error('Failed to open file writer:', err);
                createReceivingFileBox(msg.payload, fromId);
            });
            break;
        }
        case 'ack': {
            const ackFileId = msg.payload?.fileId;
            // ✅ ACK = المستلم استلم الملف فعلاً — احذف من الطابور بصمت
            if (ackFileId) removePendingFile(ackFileId, true);
            break;
        }
        case 'cancel':
            cancelRecv(msg.payload.fileId, 'تم إلغاء الإرسال من المرسل');
            break;
        case 'error':
            cancelRecv(msg.payload.fileId, 'فشل الإرسال من المصدر');
            break;
        case 'chat': {
            const pi = peers.get(fromId);
            appendMsg(msg.text, false, pi?.name || 'مجهول');
            break;
        }
    }
}

function resetRecvUI(fileId) {
    const pEl = document.getElementById(`recv-progress-${fileId}`);
    const tEl = document.getElementById(`recv-pct-${fileId}`);
    const sEl = document.getElementById(`recv-status-${fileId}`);
    if (pEl) { pEl.style.width = '0%'; pEl.classList.remove('done', 'error'); }
    if (tEl) { tEl.textContent = '0%'; tEl.style.color = ''; }
    if (sEl) { sEl.textContent = 'جاري الاستلام... (إعادة)'; sEl.classList.remove('done', 'error'); }
}
 

// ─────────────────────────────────────────
//  Receive chunks — writes directly to disk
// ─────────────────────────────────────────
async function recvChunk(raw, fromId) {
    try {
        const { fileId, chunk } = parseChunkWithId(raw);
        const entry = recvMap.get(fileId);
        if (!entry) return;

        await entry.writer.write(chunk);
        // Use writer.received as single source of truth (FileWriter increments internally)
        const pct = Math.min(100, Math.round((entry.writer.received / entry.meta.fileSize) * 100));
        updateReceivingFileBox(entry.meta, pct, entry.fromId);

        if (entry.writer.received >= entry.meta.fileSize) {
            const blob = await entry.writer.close();
            const pi   = peers.get(fromId);
            completeReceivingFileBox(entry.meta, blob, pi?.name || 'مجهول');
            recvMap.delete(fileId);
            // Send ACK back to sender so they remove from queue
            if (pi?.connected) {
                try { pi.peer.send(JSON.stringify({ type: 'ack', payload: { fileId } })); } catch (_) {}
            }
        }
    } catch (e) {
        console.error('recvChunk error', e);
    }
}

function cancelRecv(fileId, reason) {
    const e = recvMap.get(fileId);
    if (e) {
        e.writer.abort().catch(() => {});
        updateReceivingFileBox(e.meta, 0, e.fromId, true, reason);
        recvMap.delete(fileId);
    }
}

// ─────────────────────────────────────────
//  Receiving File Box UI
// ─────────────────────────────────────────
function createReceivingFileBox(meta, fromId) {
    const list = document.getElementById('msg-list');
    if (!list) return;

    const { fileId } = meta;
    const pi = peers.get(fromId);
    const senderName = pi?.name || 'مجهول';
    const time = new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

    const isImage = meta.fileType?.startsWith('image/');
    const isVideo = meta.fileType?.startsWith('video/');

    let iconHtml = '<div class="file-icon">📄</div>';
    if (isImage)                             iconHtml = '<div class="file-icon">🖼️</div>';
    else if (isVideo)                        iconHtml = '<div class="file-icon">🎬</div>';
    else if (meta.fileType?.includes('pdf')) iconHtml = '<div class="file-icon">📕</div>';
    else if (meta.fileType?.includes('audio')) iconHtml = '<div class="file-icon">🎵</div>';
    else if (/zip|rar|7z/.test(meta.fileType || '')) iconHtml = '<div class="file-icon">📦</div>';

    const div = document.createElement('div');
    div.className = 'msg received';
    div.id = `recv-file-${fileId}`;
    div.innerHTML = `
      <span class="msg-sender">${esc(senderName)}</span>
      <div class="file-msg-box receiving" id="file-box-${fileId}">
        <div class="file-preview">${iconHtml}</div>
        <div class="file-info">
          <span class="file-name">${esc(meta.fileName)}</span>
          <span class="file-meta">${fmtBytes(meta.fileSize)} • ${time}</span>
          <div class="file-progress">
            <div class="file-progress-bar">
              <div class="file-progress-inner" id="recv-progress-${fileId}" style="width:0%"></div>
            </div>
            <span class="file-pct" id="recv-pct-${fileId}">0%</span>
          </div>
          <div class="tr-status" id="recv-status-${fileId}" style="font-size:.75rem;color:#8899aa;">جاري الاستلام...</div>
        </div>
      </div>`;

    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

function updateReceivingFileBox(meta, pct, fromId, done = false, errorMsg = null) {
    const progressEl = document.getElementById(`recv-progress-${meta.fileId}`);
    const pctEl      = document.getElementById(`recv-pct-${meta.fileId}`);
    const statusEl   = document.getElementById(`recv-status-${meta.fileId}`);

    if (progressEl) {
        progressEl.style.width = `${pct}%`;
        if (done) progressEl.classList.add(errorMsg ? 'error' : 'done');
    }
    if (pctEl)    { pctEl.textContent = errorMsg || `${pct}%`; if (errorMsg) pctEl.style.color = '#ff6b6b'; }
    if (statusEl) { statusEl.textContent = errorMsg || (done ? 'اكتمل ✓' : 'جاري الاستلام...'); if (errorMsg) statusEl.classList.add('error'); }
}

function completeReceivingFileBox(meta, blob, senderName) {
    const { fileId } = meta;
    const box = document.getElementById(`file-box-${fileId}`);
    if (!box) return;

    const isImage = meta.fileType?.startsWith('image/');
    const isVideo = meta.fileType?.startsWith('video/');

    let objectUrl = null;
    // If blob is null, it was saved directly to disk — just show completion
    // If blob exists (fallback mode), create URL and offer download
    if (blob) {
        objectUrl = URL.createObjectURL(blob);
        downloadedFiles.set(fileId, { blob, meta, sender: senderName, url: objectUrl });
        sessionFiles.push({ fileId, meta, sender: senderName });
        // Auto-download for fallback mode
        downloadBlob(blob, meta.fileName);
    } else {
        // Saved to disk directly via File System Access API
        downloadedFiles.set(fileId, { blob: null, meta, sender: senderName, url: null });
        sessionFiles.push({ fileId, meta, sender: senderName });
        // Notify receiver that file was saved to disk
        toast(`تم حفظ الملف على القرص: ${esc(meta.fileName)}`, 'success');
        // Also trigger a hidden download to show in browser's download bar
        triggerDiskDownloadNotification(meta.fileName);
    }

    const previewDiv = box.querySelector('.file-preview');
    if (previewDiv && isImage && objectUrl) {
        previewDiv.innerHTML = `<img src="${objectUrl}" alt="${esc(meta.fileName)}">`;
    } else if (previewDiv && isVideo && objectUrl) {
        previewDiv.innerHTML = `
            <video src="${objectUrl}" style="width:100%;height:100%;object-fit:cover;" preload="metadata"></video>
            <div class="file-preview-overlay"><span>▶</span></div>`;
    }

    const progressEl = document.getElementById(`recv-progress-${fileId}`);
    const pctEl      = document.getElementById(`recv-pct-${fileId}`);
    const statusEl   = document.getElementById(`recv-status-${fileId}`);
    if (progressEl) { progressEl.style.width = '100%'; progressEl.classList.add('done'); }
    if (pctEl)    { pctEl.textContent = '100%'; pctEl.style.color = '#43e97b'; }
    if (statusEl) { statusEl.textContent = blob ? 'تم الحفظ تلقائياً ✓' : 'تم الحفظ على القرص ✓'; statusEl.classList.add('done'); }

    const infoDiv = box.querySelector('.file-info');
    if (infoDiv) {
        const actDiv = document.createElement('div');
        actDiv.className = 'file-actions';
        if ((isImage || isVideo) && objectUrl) {
            actDiv.innerHTML = `
                <button class="file-action-btn download" onclick="openFullscreen('${fileId}')">👁 فتح</button>
                <button class="file-action-btn delete" onclick="deleteFile('${fileId}')">🗑 حذف</button>`;
        } else {
            actDiv.innerHTML = `
                <button class="file-action-btn download" onclick="downloadFileById('${fileId}')">⬇ تحميل</button>
                <button class="file-action-btn delete" onclick="deleteFile('${fileId}')">🗑 حذف</button>`;
        }
        infoDiv.appendChild(actDiv);
    }

    box.classList.remove('receiving');
    if ((isImage || isVideo) && objectUrl) {
        box.onclick = () => openFullscreen(fileId);
        box.style.cursor = 'pointer';
    }
}

function downloadFileById(fileId) {
    const f = downloadedFiles.get(fileId);
    if (f?.blob) downloadBlob(f.blob, f.meta.fileName);
    else if (f) toast('الملف محفوظ على القرص مسبقاً', 'info');
    else toast('الملف غير متوفر', 'error');
}

function deleteFile(fileId) {
    const f = downloadedFiles.get(fileId);
    if (f) { if (f.url) URL.revokeObjectURL(f.url); downloadedFiles.delete(fileId); }
    document.getElementById(`recv-file-${fileId}`)?.remove();
    sessionFiles = sessionFiles.filter(x => x.fileId !== fileId);
    toast('تم حذف الملف', 'success');
}

function openFullscreen(fileId) {
    const f = downloadedFiles.get(fileId);
    if (!f || !f.url) return;
    const isImage = f.meta.fileType?.startsWith('image/');
    const isVideo = f.meta.fileType?.startsWith('video/');
    if (!isImage && !isVideo) return;

    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-viewer';
    overlay.innerHTML = isImage
        ? `<img src="${f.url}" alt="${esc(f.meta.fileName)}"><button class="fullscreen-close">✕</button>`
        : `<video src="${f.url}" controls autoplay style="max-width:100%;max-height:100%;"></video><button class="fullscreen-close">✕</button>`;

    document.body.appendChild(overlay);
    overlay.querySelector('.fullscreen-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ─────────────────────────────────────────
//  Local Discovery
// ─────────────────────────────────────────
function startDiscovery() {
    if (isDiscovering) return;
    isDiscovering = true;
    socket.emit('discover-join', { deviceName });
    const icon = document.getElementById('scan-icon');
    const btn  = document.getElementById('btn-start-scan');
    if (icon) icon.classList.add('scanning');
    if (btn)  { btn.textContent = '⏹ إيقاف البحث'; btn.onclick = stopDiscovery; }
    updateLocalDevicesUI();
    toast('📶 جاري البحث عن الأجهزة...', 'info');
}

function stopDiscovery() {
    if (!isDiscovering) return;
    isDiscovering = false;
    socket.emit('discover-leave');
    localDiscovery.clear();
    const icon = document.getElementById('scan-icon');
    const btn  = document.getElementById('btn-start-scan');
    if (icon) icon.classList.remove('scanning');
    if (btn)  { btn.textContent = '🔍 بدء البحث'; btn.onclick = startDiscovery; }
    updateLocalDevicesUI();
}

function updateLocalDevicesUI() {
    const list = document.getElementById('local-devices-list');
    if (!list) return;

    if (!isDiscovering) { list.innerHTML = ''; return; }

    if (localDiscovery.size === 0) {
        list.innerHTML = `
          <div class="local-no-devices">
            <div class="local-pulse-ring"></div>
            <p>جاري البحث عن الأجهزة...</p>
            <small>تأكد من أن الأجهزة الأخرى مفتوحة على AetherLink</small>
          </div>`;
        return;
    }

    const connectedNames = new Set([...peers.values()].filter(p => p.connected).map(p => p.name));
    const devices = [...localDiscovery.values()];

    list.innerHTML = `
      <p class="local-found-label">● ${devices.length} جهاز متاح</p>
      ${devices.map(d => {
          const alreadyConn = localConnected.has(d.socketId) || connectedNames.has(d.deviceName);
          return `
            <div class="local-device-card" data-sid="${esc(d.socketId)}">
              <div class="local-device-dot${alreadyConn ? ' connected' : ''}"></div>
              <div class="local-device-info">
                <span class="local-device-name">📱 ${esc(d.deviceName)}</span>
                <span class="local-device-status${alreadyConn ? ' connected' : ''}">
                  ${alreadyConn ? '● متصل حالياً' : 'متاح للاتصال المباشر'}
                </span>
              </div>
              <button class="local-connect-btn ${alreadyConn ? 'new-session' : ''}" data-connected="${alreadyConn}">
                ${alreadyConn ? '+ جلسة جديدة' : 'اتصال'}
              </button>
            </div>`;
      }).join('')}`;

    list.querySelectorAll('.local-device-card').forEach(card => {
        const sid = card.getAttribute('data-sid');
        const d   = localDiscovery.get(sid);
        if (!d) return;
        const btn = card.querySelector('.local-connect-btn');
        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const alreadyConn = btn.dataset.connected === 'true';
            if (alreadyConn) {
                window.open(location.origin + location.pathname, '_blank');
            } else {
                inviteLocalPeer(sid, d.deviceName);
            }
        });
        card.addEventListener('click', () => {
            if (btn?.dataset.connected !== 'true') inviteLocalPeer(sid, d.deviceName);
        });
    });
}

function inviteLocalPeer(socketId, peerName) {
    const newRoomId = mkId();
    socket.emit('connect-invite', { to: socketId, roomId: newRoomId });

    isLocalConnection = true;
    roomId = newRoomId;
    isHost = true;
    setHostRoom(newRoomId);
    history.replaceState({}, '', `?id=${newRoomId}`);
    socket.emit('join-room', { roomId, deviceName });

    toast(`⏳ انتظار رد ${peerName}...`, 'info');

    const btn = document.querySelector(`[data-sid="${socketId}"] .local-connect-btn`);
    if (btn) { btn.textContent = '⏳ انتظار...'; btn.disabled = true; }
}

function showLocalInviteModal(from, fromName, inviteRoomId) {
    document.querySelector('.local-invite-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay local-invite-overlay';
    overlay.innerHTML = `
      <div class="modal-box local-invite-box">
        <div class="local-invite-icon">📡</div>
        <h3>طلب اتصال</h3>
        <p class="local-invite-from">${esc(fromName)}</p>
        <p class="local-invite-sub">يريد الاتصال بجهازك مباشرةً</p>
        <div class="modal-actions">
          <button class="action-button" id="invite-accept">✅ قبول</button>
          <button class="action-button secondary" id="invite-decline">❌ رفض</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#invite-accept')?.addEventListener('click', () => {
        socket.emit('connect-invite-response', { to: from, accepted: true, roomId: inviteRoomId });
        overlay.remove();
        isLocalConnection = true;
        joinDiscoveredRoom(inviteRoomId);
    });

    overlay.querySelector('#invite-decline')?.addEventListener('click', () => {
        socket.emit('connect-invite-response', { to: from, accepted: false });
        overlay.remove();
        toast('تم رفض طلب الاتصال', 'info');
    });
}

function joinDiscoveredRoom(newRoomId) {
    isLocalConnection = true;
    roomId  = newRoomId;
    isHost  = false;
    history.replaceState({}, '', `?id=${newRoomId}`);
    renderJoinerUI();
    socket.emit('join-room', { roomId, deviceName });
}

function bindTabEvents() {
    const tabInternet   = document.getElementById('tab-internet');
    const tabLocal      = document.getElementById('tab-local');
    const panelInternet = document.getElementById('panel-internet');
    const panelLocal    = document.getElementById('panel-local');

    tabInternet?.addEventListener('click', () => {
        tabInternet.classList.add('active');
        tabLocal.classList.remove('active');
        panelInternet.classList.remove('hidden');
        panelLocal.classList.add('hidden');
    });

    tabLocal?.addEventListener('click', () => {
        tabLocal.classList.add('active');
        tabInternet.classList.remove('active');
        panelLocal.classList.remove('hidden');
        panelInternet.classList.add('hidden');
        if (!isDiscovering) startDiscovery();
    });

    document.getElementById('btn-start-scan')?.addEventListener('click', startDiscovery);
}

// ─────────────────────────────────────────
//  UI — Home (host)
// ─────────────────────────────────────────
function renderHomeUI(joinUrl) {
    const prev = loadPrev();

    mainEl.innerHTML = `
    <div class="app-layout">
      <header class="app-header">
        <div class="header-left">
          <span class="app-title">AetherLink</span>
          <span class="header-sub">نقل الملفات الفوري والآمن</span>
        </div>
        <div class="header-right">
          <div class="device-chip" id="name-chip">
            <span>📡</span>
            <span class="device-chip-name" id="chip-name">${esc(deviceName)}</span>
            <button class="icon-btn" id="edit-name-btn" title="تغيير الاسم">✏️</button>
          </div>
          <button class="home-return-btn" id="new-session-btn" title="العودة للرئيسية"><span class="home-return-icon">🏠</span><span>العودة للرئيسية</span></button>
          <button class="icon-btn" id="minimize-btn" title="تصغير">⊟</button>
        </div>
      </header>

      <!-- Mode Tabs -->
      <div class="mode-tabs">
        <button class="mode-tab active" id="tab-internet">🌐 عبر الإنترنت</button>
        <button class="mode-tab" id="tab-local">📶 الأجهزة القريبة</button>
      </div>

      <div class="home-content">

        <!-- ── Internet Panel ── -->
        <div id="panel-internet" class="tab-panel">
          <div class="qr-section">
            <div class="qr-box" id="qr-box"><div id="qr-inner"></div></div>
            <p class="scan-hint">امسح الرمز أو شارك الرابط لبدء الاتصال</p>
            <p class="wait-status" id="status-line">
              <span class="wait-dot"></span>
              في انتظار انضمام الطرف الآخر...
            </p>
            <div class="share-row">
              <button class="share-btn btn-copy" id="btn-copy">📋 نسخ الرابط</button>
              <button class="share-btn btn-whatsapp" id="btn-wa">💬 واتساب</button>
              <button class="share-btn btn-share" id="btn-share">↗ مشاركة</button>
            </div>
          </div>

          ${prev.length ? `
          <div class="prev-section">
            <p class="section-label">📱 الأجهزة السابقة</p>
            <div class="prev-list" id="prev-list">
              ${prev.map(d => `
                <div class="prev-item">
                  <span class="prev-icon">📡</span>
                  <span class="prev-name">${esc(d.name)}</span>
                  <span class="prev-time">${fmtDate(d.ts)}</span>
                  <button class="action-button secondary small" data-pname="${esc(d.name)}">إعادة الاتصال</button>
                </div>`).join('')}
            </div>
          </div>` : ''}
        </div>

        <!-- ── Local Discovery Panel ── -->
        <div id="panel-local" class="tab-panel hidden">
          <div class="local-discovery-panel">
            <div class="local-scan-header">
              <span class="local-scan-icon" id="scan-icon">📶</span>
              <p class="local-scan-title">اكتشاف الأجهزة القريبة</p>
              <p class="local-scan-subtitle">
                ابحث عن أجهزة أخرى تفتح AetherLink على نفس الشبكة<br>
                <small>اتصال مباشر P2P — البيانات لا تمر عبر السيرفر</small>
              </p>
              <button class="action-button" id="btn-start-scan">🔍 بدء البحث</button>
            </div>
            <div class="local-devices-list" id="local-devices-list"></div>
          </div>
        </div>

      </div>
    </div>`;

    generateQR(joinUrl);
    bindHomeEvents(joinUrl);
    bindTabEvents();
}

// ─────────────────────────────────────────
//  UI — Joiner (loading)
// ─────────────────────────────────────────
function renderJoinerUI() {
    mainEl.innerHTML = `
    <div class="app-layout">
      <header class="app-header">
        <div class="header-left">
          <span class="app-title">AetherLink</span>
          <span class="header-sub">نقل الملفات الفوري والآمن</span>
        </div>
        <div class="header-right">
          <div class="device-chip">
            <span>📡</span>
            <span class="device-chip-name">${esc(deviceName)}</span>
          </div>
          <button class="home-return-btn" id="new-session-btn" title="العودة للرئيسية"><span class="home-return-icon">🏠</span><span>العودة للرئيسية</span></button>
          <button class="icon-btn" id="minimize-btn" title="تصغير">⊟</button>
        </div>
      </header>
      <div class="center-content">
        <div class="loader"></div>
        <p class="instructions" id="status-line">جاري الانضمام للجلسة...</p>
      </div>
    </div>`;
    bindMinBtn();
}

// ─────────────────────────────────────────
//  UI — Connected
// ─────────────────────────────────────────
function renderConnectedUI() {
    if (document.getElementById('messages-section')) { updatePeersUI(); return; }

    mainEl.innerHTML = `
    <div class="app-layout">
      <header class="app-header">
        <div class="header-left">
          <span class="app-title">AetherLink</span>
          <span class="header-sub">${isLocalConnection ? '📶 اتصال محلي مباشر' : 'نقل الملفات الفوري والآمن'}</span>
        </div>
        <div class="header-right">
          <div class="header-actions">
            <button class="header-action-btn show-users" id="show-users-btn" title="المتصلين">👥 المتصلين</button>
            ${!isLocalConnection ? `<button class="header-action-btn group-link" id="group-link-btn" title="رابط الجلسة">🔗 مشاركة</button>` : ''}
          </div>
          <div class="device-chip" id="name-chip">
            <span>📡</span>
            <span class="device-chip-name" id="chip-name">${esc(deviceName)}</span>
            <button class="icon-btn" id="edit-name-btn" title="تغيير الاسم">✏️</button>
          </div>
          <button class="home-return-btn" id="new-session-btn" title="العودة للرئيسية"><span class="home-return-icon">🏠</span><span>العودة للرئيسية</span></button>
          <button class="icon-btn" id="minimize-btn" title="تصغير">⊟</button>
        </div>
      </header>

      <!-- Peers panel -->
      <div class="peers-panel" id="peers-panel">
        <span class="peers-count" id="peers-count">0 متصل</span>
        <div class="peer-chips" id="peer-chips"></div>
      </div>

      <!-- Pending Queue Panel -->
      <div class="pending-queue-panel hidden" id="pending-panel">
        <div class="pending-queue-title">⏳ ملفات في الانتظار (<span id="pending-count">0</span>)</div>
        <div class="pending-queue-grid" id="pending-list"></div>
      </div>

      <!-- Messages Section -->
      <div class="messages-section-full" id="messages-section">
        <div class="messages-list" id="msg-list"></div>
        <div class="msg-bar">
          <input type="file" id="file-input" multiple style="display:none">
          <button class="file-input-btn" id="file-btn" title="إرسال ملف (حتى 50 ملف)">📎</button>
          <input type="text" class="msg-field" id="msg-field" placeholder="اكتب رسالة..." autocomplete="off">
          <button class="send-btn" id="send-btn">↑</button>
        </div>
      </div>
    </div>`;

    updatePeersUI();
    bindMsgEvents();
    bindMinBtn();
    bindHeaderActions();
    restoreSessionMessages();
}

// ─────────────────────────────────────────
//  Peers panel update
// ─────────────────────────────────────────
function updatePeersUI() {
    const countEl = document.getElementById('peers-count');
    const chipsEl = document.getElementById('peer-chips');
    if (!countEl) return;
    const connected = getConnected();
    countEl.textContent = `${connected.length} متصل`;
    if (chipsEl) chipsEl.innerHTML = connected.map(([_, p]) => `<span class="peer-chip">📱 ${esc(p.name)}</span>`).join('');
}

// ─────────────────────────────────────────
//  Status / badge helpers
// ─────────────────────────────────────────
function setStatus(msg) {
    const el = document.getElementById('status-line');
    if (el) el.innerHTML = `<span class="wait-dot"></span>${esc(msg)}`;
}

function setBadge(type, text) {
    const el = document.getElementById('conn-badge');
    if (el) { el.className = `conn-badge ${type}`; el.textContent = text; }
}

// ─────────────────────────────────────────
//  Event binding — home
// ─────────────────────────────────────────
function bindHomeEvents(joinUrl) {
    bindMinBtn();

    document.getElementById('edit-name-btn')?.addEventListener('click', () => {
        const chip  = document.getElementById('chip-name');
        const input = document.createElement('input');
        input.className = 'name-edit-field';
        input.value = deviceName;
        chip.replaceWith(input);
        input.focus(); input.select();
        const commit = () => {
            const v = input.value.trim() || deviceName;
            deviceName = v; saveName(v);
            input.replaceWith(Object.assign(document.createElement('span'), {
                className: 'device-chip-name', id: 'chip-name', textContent: v
            }));
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });
    });

    document.getElementById('btn-copy')?.addEventListener('click', () => {
        navigator.clipboard.writeText(joinUrl).then(() => {
            const b = document.getElementById('btn-copy');
            if (b) { b.textContent = '✅ تم النسخ!'; setTimeout(() => b.textContent = '📋 نسخ الرابط', 2000); }
        });
    });

    document.getElementById('btn-wa')?.addEventListener('click', () => {
        open(`https://wa.me/?text=${encodeURIComponent('انضم لجلستي على AetherLink:\n' + joinUrl)}`, '_blank');
    });

    document.getElementById('btn-share')?.addEventListener('click', async () => {
        if (navigator.share) {
            try { await navigator.share({ title: 'AetherLink', url: joinUrl }); return; } catch (_) {}
        }
        open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('AetherLink - نقل الملفات الآمن\n' + joinUrl)}`, '_blank');
    });

    document.querySelectorAll('[data-pname]').forEach(btn => {
        btn.addEventListener('click', () => {
            const name    = btn.getAttribute('data-pname');
            const newRoom = mkId();
            const newUrl  = `${location.origin}${location.pathname}?id=${newRoom}`;
            roomId        = newRoom;
            setHostRoom(newRoom);
            history.replaceState({}, '', `?id=${newRoom}`);
            socket.emit('join-room', { roomId, deviceName });
            renderHomeUI(newUrl);
            toast(`جلسة جديدة للاتصال بـ ${name} — شارك الرابط`, 'info');
        });
    });
}

// ═════════════════════════════════════════
//  SEQUENTIAL FILE SEND QUEUE
//  The key improvement: files are sent one
//  after another, not in parallel.
// ═════════════════════════════════════════

function bindMsgEvents() {
    const field     = document.getElementById('msg-field');
    const btn       = document.getElementById('send-btn');
    const fileBtn   = document.getElementById('file-btn');
    const fileInput = document.getElementById('file-input');

    const send = () => {
        const txt = field?.value.trim();
        if (!txt) return;
        getConnected().forEach(([_, p]) => {
            try { p.peer.send(JSON.stringify({ type: 'chat', text: txt })); } catch (_) {}
        });
        appendMsg(txt, true, deviceName);
        if (field) field.value = '';
    };

    btn?.addEventListener('click', send);
    field?.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    fileBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
        const all = Array.from(e.target.files || []);
        if (!all.length) return;

        if (all.length > 50) {
            toast(`تم اختيار ${all.length} ملف — سيتم إرسال أول 50 فقط`, 'warning');
        }
        const files = all.slice(0, 50);

        const targets = getConnected().map(([id]) => id);
        if (!targets.length) {
            toast('لا يوجد أجهزة متصلة', 'error');
            fileInput.value = '';
            return;
        }

        // Add all files to the sequential queue
        files.forEach(f => enqueueFileSend(f, targets));
        fileInput.value = '';
    });
}

// ── Pending Queue UI ──
function addPendingFile(file, fileId) {
    const panel = document.getElementById('pending-panel');
    const list = document.getElementById('pending-list');
    const count = document.getElementById('pending-count');
    if (!panel || !list) return;

    panel.classList.remove('hidden');

    const isImage = file.type?.startsWith('image/');
    const isVideo = file.type?.startsWith('video/');
    let preview = '';
    if (isImage) {
        const url = URL.createObjectURL(file);
        preview = `<img src="${url}" alt="">`;
        pendingFiles.set(fileId, { file, status: 'waiting', objectUrl: url });
    } else if (isVideo) {
        const url = URL.createObjectURL(file);
        preview = `<video src="${url}" muted></video>`;
        pendingFiles.set(fileId, { file, status: 'waiting', objectUrl: url });
    } else {
        let icon = '📄';
        if (file.type?.includes('pdf')) icon = '📕';
        else if (file.type?.includes('audio')) icon = '🎵';
        else if (/zip|rar|7z/.test(file.type || '')) icon = '📦';
        preview = `<div class="pending-item-icon">${icon}</div>`;
        pendingFiles.set(fileId, { file, status: 'waiting', objectUrl: null });
    }

    const div = document.createElement('div');
    div.className = 'pending-item waiting';
    div.id = `pending-item-${fileId}`;
    div.innerHTML = `
        ${preview}
        <div class="pending-item-name">${esc(file.name)}</div>
        <button class="pending-item-del" onclick="removePendingFile('${fileId}')" title="حذف">×</button>`;
    list.appendChild(div);
    if (count) count.textContent = pendingFiles.size;
}

function removePendingFile(fileId, silent = false) {
    // ✅ ألغِ timeout الـ ACK الاحتياطي إن وُجد
    if (ackTimeouts.has(fileId)) {
        clearTimeout(ackTimeouts.get(fileId));
        ackTimeouts.delete(fileId);
    }
    const pf = pendingFiles.get(fileId);
    if (pf) {
        if (pf.objectUrl) URL.revokeObjectURL(pf.objectUrl);
        pendingFiles.delete(fileId);
    }
    document.getElementById(`pending-item-${fileId}`)?.remove();
    const count = document.getElementById('pending-count');
    if (count) count.textContent = pendingFiles.size;
    if (pendingFiles.size === 0) {
        document.getElementById('pending-panel')?.classList.add('hidden');
    }
    // Also mark sending as cancelled if still in queue
    const sf = sendingFiles.get(fileId);
    if (sf) sf.cancelled = true;
    // Remove from sendQueue
    const idx = sendQueue.findIndex(q => q.file.fileId === fileId);
    if (idx !== -1) sendQueue.splice(idx, 1);
    // ✅ أظهر toast فقط عند الحذف اليدوي (silent=false)
    if (!silent) toast('تم حذف الملف من الطابور', 'success');
}

function updatePendingStatus(fileId, status) {
    const item = document.getElementById(`pending-item-${fileId}`);
    if (!item) return;
    item.classList.remove('waiting', 'sending', 'done');
    item.classList.add(status);
    const pf = pendingFiles.get(fileId);
    if (pf) pf.status = status;
}

// ── Sequential send queue ──
function enqueueFileSend(file, peerIds) {
    // Generate fileId here so we can track it in pending queue
    const fileId = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    file.fileId = fileId; // attach to file object
    sendQueue.push({ file, peerIds, fileId });
    addPendingFile(file, fileId);
    processSendQueue();
}

async function processSendQueue() {
    if (isSendingQueue || sendQueue.length === 0) return;
    isSendingQueue = true;

    while (sendQueue.length > 0) {
        const { file, peerIds, fileId } = sendQueue.shift();
        updatePendingStatus(fileId, 'sending');
        await sendFileSequential(file, peerIds, fileId);
        updatePendingStatus(fileId, 'done');
        // ✅ لا نحذف تلقائياً — ننتظر ACK من المستلم (handleJsonMsg → 'ack')
        // Fallback: إذا لم يصل ACK خلال 60 ثانية، احذف بصمت
        const ackTimeout = setTimeout(() => {
            if (pendingFiles.has(fileId)) removePendingFile(fileId, true);
        }, 60000);
        ackTimeouts.set(fileId, ackTimeout);
    }

    isSendingQueue = false;
}

// ─────────────────────────────────────────
//  Sequential file send — one file at a time
//  with back-pressure and reconnection support
// ─────────────────────────────────────────
async function sendFileSequential(file, peerIds, fileId) {
    fileId = fileId || `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const meta   = { fileName: file.name, fileSize: file.size, fileType: file.type, fileId };

    sendingFiles.set(fileId, { cancelled: false });

    const metaMsg = JSON.stringify({ type: 'metadata', payload: meta });

    // Send metadata to all peers
    const connectedPeers = [];
    peerIds.forEach(id => {
        const pi = peers.get(id);
        if (pi?.connected) {
            try { pi.peer.send(metaMsg); connectedPeers.push(id); } catch (_) {}
        }
    });

    if (connectedPeers.length === 0) {
        toast('لا يوجد أجهزة متصلة لإرسال الملف', 'error');
        sendingFiles.delete(fileId);
        return;
    }

    createSenderFileBox(file, meta);

    let offset = 0;
    let retries = 0;
    const MAX_RETRIES = 3;

    try {
        SEND_LOOP: while (offset < file.size) {
            const sf = sendingFiles.get(fileId);
            if (!sf || sf.cancelled) break;

            const end      = Math.min(offset + CHUNK_SIZE, file.size);
            const chunkBuf = await file.slice(offset, end).arrayBuffer();
            const tagged   = makeChunkWithId(fileId, chunkBuf);

            // Send this chunk to all connected peers sequentially
            let allSent = true;
            for (const id of connectedPeers) {
                let pi = peers.get(id);

                // If peer disconnected, try to wait for reconnection
                if (!pi?.connected) {
                    if (retries < MAX_RETRIES) {
                        toast(`⏳ انتظار إعادة الاتصال...`, 'warning');
                        updateSenderFileBox(fileId, Math.round((offset / file.size) * 100), false, null);

                        const reconn = await waitForPeer(id, 90000);
                        if (reconn) {
                            retries++;
                            // Resend metadata to the reconnected peer
                            try { reconn.peer.send(metaMsg); } catch (_) {}
                            // Don't reset offset — just retry this chunk
                            continue;
                        }
                    }
                    // Peer not coming back — skip it for remaining chunks
                    console.warn(`Peer ${id} failed to reconnect, skipping`);
                    continue;
                }

                // ── Back-pressure: wait for buffer to drain ──
                const ch = pi.peer._channel;
                if (ch) {
                    while (ch.bufferedAmount > BUFFER_HIGH) {
                        await sleep(30);
                        const check = peers.get(id);
                        if (!check?.connected) {
                            allSent = false;
                            continue;
                        }
                    }
                }

                // ── Send the chunk ──
                let sent = false;
                try {
                    const cur = peers.get(id);
                    if (cur?.connected && cur.peer._channel?.readyState === 'open') {
                        cur.peer.send(tagged);
                        sent = true;
                    }
                } catch (sendErr) {
                    console.warn(`Send error for peer ${id}:`, sendErr.message);
                    allSent = false;
                }

                if (!sent) allSent = false;
            }

            if (allSent) {
                // ✅ Chunk sent successfully — advance to next chunk
                offset = end;
                retries = 0;
            } else {
                // ✅ Chunk failed — retry without advancing offset
                retries++;
                if (retries >= MAX_RETRIES) {
                    throw new Error('Too many send failures');
                }
                await sleep(300 * retries); // brief back-off before retry
                // offset intentionally NOT advanced — retry same chunk
            }

            updateSenderFileBox(fileId, Math.round((offset / file.size) * 100));

            // Small delay for GC and to prevent overwhelming the channel
            if (offset < file.size) {
                await sleep(SEND_DELAY_MS);
            }
        }

        const sf = sendingFiles.get(fileId);
        if (sf && !sf.cancelled) finalizeSenderFileBox(fileId);

    } catch (err) {
        console.error('sendFileSequential error', err);
        updateSenderFileBox(fileId, Math.round((offset / file.size) * 100), true, 'فشل الإرسال');
        connectedPeers.forEach(id => {
            const pi = peers.get(id);
            if (pi?.connected) {
                try { pi.peer.send(JSON.stringify({ type: 'error', payload: meta })); } catch (_) {}
            }
        });
    }

    sendingFiles.delete(fileId);
}

// ─────────────────────────────────────────
//  Transfer helpers
// ─────────────────────────────────────────

/**
 * Wait until the given peer reconnects and is connected again.
 */
async function waitForPeer(peerId, maxMs = 90000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
        const pi = peers.get(peerId);
        if (pi?.connected) return pi;
        await sleep(200);
    }
    return null;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────
//  Sender File Box UI
// ─────────────────────────────────────────
function createSenderFileBox(file, meta) {
    const list = document.getElementById('msg-list');
    if (!list) return;

    const isImage = file.type?.startsWith('image/');
    const isVideo = file.type?.startsWith('video/');
    const time    = new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

    let previewHtml = '';
    if (isImage) {
        previewHtml = `<img src="${URL.createObjectURL(file)}" alt="${esc(meta.fileName)}">`;
    } else if (isVideo) {
        previewHtml = `<video src="${URL.createObjectURL(file)}"></video>`;
    } else {
        let icon = '📄';
        if (file.type?.includes('pdf'))   icon = '📕';
        else if (file.type?.includes('audio')) icon = '🎵';
        else if (/zip|rar|7z/.test(file.type || '')) icon = '📦';
        previewHtml = `<div class="file-icon">${icon}</div>`;
    }

    const div = document.createElement('div');
    div.className = 'msg sent';
    div.id = `sender-file-${meta.fileId}`;
    div.innerHTML = `
      <span class="msg-sender">أنت</span>
      <div class="file-msg-box sending" id="sender-box-${meta.fileId}">
        <div class="file-preview">${previewHtml}</div>
        <div class="file-info">
          <span class="file-name">${esc(meta.fileName)}</span>
          <span class="file-meta">${fmtBytes(meta.fileSize)} • ${time}</span>
          <div class="file-progress">
            <div class="file-progress-bar">
              <div class="file-progress-inner" id="sender-progress-${meta.fileId}" style="width:0%"></div>
            </div>
            <span class="file-pct" id="sender-pct-${meta.fileId}">0%</span>
          </div>
          <div class="sender-actions">
            <div class="tr-status" id="sender-status-${meta.fileId}">جاري الإرسال...</div>
            <button class="cancel-send-btn" onclick="cancelSenderFile('${meta.fileId}')" title="إلغاء الإرسال">❌ إلغاء</button>
          </div>
        </div>
      </div>`;

    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

function updateSenderFileBox(fileId, pct, done = false, errorMsg = null) {
    const progressEl = document.getElementById(`sender-progress-${fileId}`);
    const pctEl      = document.getElementById(`sender-pct-${fileId}`);
    const statusEl   = document.getElementById(`sender-status-${fileId}`);
    if (progressEl) { progressEl.style.width = `${pct}%`; if (done) progressEl.classList.add(errorMsg ? 'error' : 'done'); }
    if (pctEl)    { pctEl.textContent = errorMsg || `${pct}%`; if (errorMsg) pctEl.style.color = '#ff6b6b'; }
    if (statusEl) { statusEl.textContent = errorMsg || (done ? 'تم الإرسال ✓' : 'جاري الإرسال...'); if (errorMsg) statusEl.classList.add('error'); }
}

function finalizeSenderFileBox(fileId) {
    const progressEl = document.getElementById(`sender-progress-${fileId}`);
    const pctEl      = document.getElementById(`sender-pct-${fileId}`);
    const statusEl   = document.getElementById(`sender-status-${fileId}`);
    const box        = document.getElementById(`sender-box-${fileId}`);

    if (progressEl) { progressEl.style.width = '100%'; progressEl.classList.add('done'); }
    if (pctEl)    { pctEl.textContent = '100%'; pctEl.style.color = '#43e97b'; }
    if (statusEl) { statusEl.textContent = 'تم الإرسال ✓'; statusEl.classList.add('done'); }

    if (box) {
        const infoDiv = box.querySelector('.file-info');
        // Remove cancel button if exists
        const cancelBtn = infoDiv?.querySelector('.cancel-send-btn');
        if (cancelBtn) cancelBtn.remove();
        if (infoDiv && !infoDiv.querySelector('.file-actions')) {
            const actDiv = document.createElement('div');
            actDiv.className = 'file-actions';
            actDiv.innerHTML = `<button class="file-action-btn delete" onclick="deleteSenderFile('${fileId}')">🗑 حذف</button>`;
            infoDiv.appendChild(actDiv);
        }
        box.classList.remove('sending');
        box.onclick = () => openSenderFullscreen(fileId);
        box.style.cursor = 'pointer';
    }
}

function deleteSenderFile(fileId) {
    document.getElementById(`sender-file-${fileId}`)?.remove();
    toast('تم حذف الملف', 'success');
}

function cancelSenderFile(fileId) {
    const sf = sendingFiles.get(fileId);
    if (sf) {
        sf.cancelled = true;
        sendingFiles.delete(fileId);
    }
    // Send cancel to all connected peers
    getConnected().forEach(([_, p]) => {
        try {
            p.peer.send(JSON.stringify({ type: 'cancel', payload: { fileId } }));
        } catch (_) {}
    });
    const box = document.getElementById(`sender-box-${fileId}`);
    if (box) {
        box.classList.remove('sending');
        box.classList.add('cancelled');
    }
    const status = document.getElementById(`sender-status-${fileId}`);
    if (status) status.textContent = 'تم إلغاء الإرسال';
    const progress = document.getElementById(`sender-progress-${fileId}`);
    if (progress) { progress.style.width = '0%'; progress.classList.add('error'); }
    const pct = document.getElementById(`sender-pct-${fileId}`);
    if (pct) { pct.textContent = 'ملغى'; pct.style.color = '#ff6b6b'; }
    toast('تم إلغاء إرسال الملف', 'warning');
}

function openSenderFullscreen(fileId) {
    const el = document.getElementById(`sender-file-${fileId}`);
    if (!el) return;
    const img   = el.querySelector('img');
    const video = el.querySelector('video');
    if (!img && !video) return;

    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-viewer';
    overlay.innerHTML = img
        ? `<img src="${img.src}" alt="fullscreen"><button class="fullscreen-close">✕</button>`
        : `<video src="${video.src}" controls autoplay style="max-width:100%;max-height:100%;"></video><button class="fullscreen-close">✕</button>`;

    document.body.appendChild(overlay);
    overlay.querySelector('.fullscreen-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ─────────────────────────────────────────
//  Header Actions
// ─────────────────────────────────────────
function bindHeaderActions() {
    document.getElementById('edit-name-btn')?.addEventListener('click', () => {
        const chip  = document.getElementById('chip-name');
        const input = document.createElement('input');
        input.className = 'name-edit-field';
        input.value = deviceName;
        input.style.cssText = 'background:rgba(255,255,255,.06);border:1px solid rgba(0,210,255,.4);border-radius:8px;color:#00d2ff;font-family:"Tajawal",sans-serif;font-size:.78rem;font-weight:700;padding:3px 8px;outline:none;width:100px;';
        chip.replaceWith(input);
        input.focus(); input.select();
        const commit = () => {
            const v = input.value.trim() || deviceName;
            deviceName = v; saveName(v);
            const s = document.createElement('span');
            s.className = 'device-chip-name'; s.id = 'chip-name'; s.textContent = v;
            input.replaceWith(s);
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });
    });

    document.getElementById('show-users-btn')?.addEventListener('click', showUsersModal);
    document.getElementById('group-link-btn')?.addEventListener('click', showGroupLinkModal);
    document.getElementById('new-session-btn')?.addEventListener('click', newSession);
}

function showUsersModal() {
    const connected = getConnected();
    const overlay = document.createElement('div');
    overlay.className = 'users-modal-overlay';
    overlay.innerHTML = `
      <div class="users-modal">
        <h3>👥 المتصلون (${connected.length})</h3>
        <div class="users-list">
          ${connected.length === 0 ? '<p style="text-align:center;color:#8899aa;">لا يوجد متصلين</p>' :
            connected.map(([_, p]) => `
              <div class="user-item">
                <span class="user-icon">📱</span>
                <span class="user-name">${esc(p.name)}</span>
              </div>`).join('')}
        </div>
        <button class="users-modal-close">إغلاق</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.users-modal-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function showGroupLinkModal() {
    const joinUrl = `${location.origin}${location.pathname}?id=${roomId}`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>🔗 رابط الجلسة</h3>
        <p>شارك هذا الرابط لدعوة آخرين للانضمام</p>
        <div style="background:rgba(0,0,0,.3);padding:12px;border-radius:8px;word-break:break-all;font-size:.8rem;color:#00d2ff;margin:10px 0;">${esc(joinUrl)}</div>
        <div class="modal-actions">
          <button class="action-button" id="modal-copy">📋 نسخ</button>
          <button class="action-button secondary" id="modal-share">↗ مشاركة</button>
          <button class="action-button secondary" id="modal-close">إغلاق</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#modal-copy')?.addEventListener('click', () => {
        navigator.clipboard.writeText(joinUrl).then(() => toast('تم نسخ الرابط!', 'success'));
    });
    overlay.querySelector('#modal-share')?.addEventListener('click', async () => {
        if (navigator.share) { try { await navigator.share({ title: 'AetherLink', url: joinUrl }); } catch (_) {} }
        else open(`https://wa.me/?text=${encodeURIComponent('انضم لجلستي على AetherLink:\n' + joinUrl)}`, '_blank');
    });
    overlay.querySelector('#modal-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function endSession() {
    if (!confirm('هل أنت متأكد من إنهاء الجلسة؟ سيتم حذف جميع الرسائل والملفات.')) return;

    sessionMessages = []; sessionFiles = [];
    downloadedFiles.clear();
    recvMap.forEach(e => e.writer.abort().catch(() => {}));
    recvMap.clear();
    sendingFiles.forEach(sf => sf.cancelled = true);
    sendingFiles.clear();
    sendQueue.length = 0;
    isSendingQueue = false;

    peers.forEach(({ peer }) => { try { peer.destroy(); } catch (_) {} });
    peers.clear();
    localConnected.clear();

    socket.emit('leave-room');
    isLocalConnection = false;
    roomId = mkId();
    setHostRoom(roomId);
    history.replaceState({}, '', `?id=${roomId}`);
    renderHomeUI(`${location.origin}${location.pathname}?id=${roomId}`);
    socket.emit('join-room', { roomId, deviceName });
    toast('تم إنهاء الجلسة', 'success');
}

function newSession() {
    // Destroy previous session and show home immediately (no confirmation)
    sessionMessages = []; sessionFiles = [];
    downloadedFiles.clear();
    recvMap.forEach(e => e.writer.abort().catch(() => {}));
    recvMap.clear();
    sendingFiles.forEach(sf => sf.cancelled = true);
    sendingFiles.clear();
    sendQueue.length = 0;
    isSendingQueue = false;

    peers.forEach(({ peer }) => { try { peer.destroy(); } catch (_) {} });
    peers.clear();
    localConnected.clear();

    socket.emit('leave-room');
    isLocalConnection = false;
    roomId = mkId();
    setHostRoom(roomId);
    history.replaceState({}, '', `?id=${roomId}`);
    renderHomeUI(`${location.origin}${location.pathname}?id=${roomId}`);
    socket.emit('join-room', { roomId, deviceName });
    toast('تم إنشاء جلسة جديدة', 'success');
}

function restoreSessionMessages() {
    const list = document.getElementById('msg-list');
    if (!list || sessionMessages.length === 0) return;
    sessionMessages.forEach(({ text, sent, sender }) => appendMsgToList(text, sent, sender, false));
}

// ─────────────────────────────────────────
//  Minimize / PiP / Mini widget
// ─────────────────────────────────────────
function bindMinBtn() {
    document.getElementById('new-session-btn')?.addEventListener('click', newSession);
    document.getElementById('minimize-btn')?.addEventListener('click', () => setMini(true));
    document.getElementById('mini-expand-btn')?.addEventListener('click', () => setMini(false));
}

async function setMini(on) {
    isMinimized = on;
    mainEl.classList.toggle('hidden', on);
    if (on) {
        const ok = await enterPiPMode();
        if (!ok) showMiniWidget(); else hideMiniWidget();
    } else {
        hidePiP(); hideMiniWidget();
        if (pipWindow && !pipWindow.closed) { pipWindow.close(); pipWindow = null; pipDocument = null; }
    }
}

function initMiniDrag() {
    const el = document.getElementById('mini-widget');
    if (!el) return;
    let ox = 0, oy = 0, sl = 0, st = 0, drag = false;
    const start = (cx, cy) => {
        drag = true; ox = cx; oy = cy;
        const r = el.getBoundingClientRect(); sl = r.left; st = r.top;
        el.style.left = sl + 'px'; el.style.bottom = 'auto'; el.style.top = st + 'px';
    };
    const move = (cx, cy) => { if (!drag) return; el.style.left = `${sl + cx - ox}px`; el.style.top = `${st + cy - oy}px`; };
    const stop = () => { drag = false; };
    el.addEventListener('mousedown', e => { if (e.target.closest('button')) return; start(e.clientX, e.clientY); });
    document.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    document.addEventListener('mouseup', stop);
    el.addEventListener('touchstart', e => { const t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
    el.addEventListener('touchmove',  e => { const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true });
    el.addEventListener('touchend', stop);
}

// ─────────────────────────────────────────
//  Chat messages
// ─────────────────────────────────────────
function appendMsg(text, sent, senderName) {
    sessionMessages.push({ text, sent, sender: senderName });
    appendMsgToList(text, sent, senderName, true);
}

function appendMsgToList(text, sent, senderName, scroll = true) {
    const list = document.getElementById('msg-list');
    if (!list) return;
    const time = new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    const div  = document.createElement('div');
    div.className = `msg ${sent ? 'sent' : 'received'}`;
    div.innerHTML = `
      <span class="msg-sender">${esc(senderName)}</span>
      <span class="msg-bubble">${esc(text)}</span>
      <span class="msg-time">${time}</span>`;
    list.appendChild(div);
    if (scroll) list.scrollTop = list.scrollHeight;
}

// ─────────────────────────────────────────
//  QR code
// ─────────────────────────────────────────
function generateQR(url) {
    const qr = qrcode(0, 'L');
    qr.addData(url);
    qr.make();
    const el = document.getElementById('qr-inner');
    if (el) {
        el.innerHTML = qr.createImgTag(4, 8);
        const img = el.querySelector('img');
        if (img) img.style.cssText = 'width:100%;height:100%;display:block;border-radius:12px;';
    }
}

// ─────────────────────────────────────────
//  Reconnect modal
// ─────────────────────────────────────────
function showReconnectModal(fromName, fromSocketId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>📡 طلب اتصال</h3>
        <p>${esc(fromName)} يطلب إعادة الاتصال</p>
        <div class="modal-actions">
          <button class="action-button" id="modal-accept">قبول</button>
          <button class="action-button secondary" id="modal-decline">رفض</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#modal-accept').addEventListener('click', () => {
        const nr  = mkId();
        const url = `${location.origin}${location.pathname}?id=${nr}`;
        socket.emit('reconnect-accept', { to: fromSocketId, newRoomId: nr });
        overlay.remove();
        roomId = nr;
        setHostRoom(nr);
        history.replaceState({}, '', `?id=${nr}`);
        renderHomeUI(url);
        socket.emit('join-room', { roomId, deviceName });
        toast('تم إنشاء جلسة جديدة', 'success');
    });
    overlay.querySelector('#modal-decline').addEventListener('click', () => overlay.remove());
}

// ─────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────
function mkId() { return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; }

function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: name, style: 'display:none' });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
}

function triggerDiskDownloadNotification(fileName) {
    // Creates a tiny blob to trigger browser download bar so user sees activity
    const blob = new Blob(['File saved via File System Access API: ' + fileName], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
        href: url,
        download: fileName + '.saved.txt',
        style: 'display:none'
    });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
}

function fmtBytes(b) {
    if (!b) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), u.length - 1);
    return `${(b / 1024 ** i).toFixed(i > 0 ? 1 : 0)} ${u[i]}`;
}

function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
}

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

let _toastTimer = null;
function toast(msg, type = 'info') {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.className   = `toast ${type}`;
    clearTimeout(_toastTimer);
    setTimeout(() => el.classList.add('show'), 10);
    _toastTimer = setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el?.remove(), 350);
    }, 3200);
}

// ─────────────────────────────────────────
//  Responsive container
// ─────────────────────────────────────────
function resizeContainer() {
    const w = window.innerWidth;
    if (w >= 768) {
        const pct    = w >= 1920 ? 0.82 : w >= 1440 ? 0.88 : w >= 1024 ? 0.92 : 0.94;
        const margin = w >= 1920 ? 60   : w >= 1440 ? 50   : w >= 1024 ? 40   : 30;
        const radius = w >= 1920 ? '36px' : w >= 1440 ? '32px' : w >= 1024 ? '28px' : '24px';
        Object.assign(mainEl.style, {
            position    : 'fixed',
            top         : '50%',
            left        : '50%',
            transform   : 'translate(-50%, -50%)',
            width       : Math.round(w * pct) + 'px',
            maxWidth    : 'none',
            height      : `calc(100vh - ${margin}px)`,
            borderRadius: radius,
            margin      : '0',
        });
    } else {
        ['position','top','left','transform','width','maxWidth','height','borderRadius','margin']
            .forEach(p => mainEl.style[p] = '');
    }
}

// ─────────────────────────────────────────
//  Bootstrap
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    addPendingQueueStyles();
    initCanvas();
    initMiniDrag();
    initPiPDrag();
    resizeContainer();
    window.addEventListener('resize', resizeContainer);

    const params = new URLSearchParams(location.search);
    const urlRoomId = params.get('id') || '';
    const storedHostRoom = getHostRoom();

    if (urlRoomId && storedHostRoom === urlRoomId) {
        isHost = true;
        roomId = urlRoomId;
        renderHomeUI(`${location.origin}${location.pathname}?id=${roomId}`);
        setHostRoom(roomId);
    } else if (urlRoomId) {
        isHost = false;
        roomId = urlRoomId;
        renderJoinerUI();
        clearHostRoom();
    } else {
        isHost = true;
        roomId = mkId();
        setHostRoom(roomId);
        history.replaceState({}, '', `?id=${roomId}`);
        renderHomeUI(`${location.origin}${location.pathname}?id=${roomId}`);
    }

    setupSocket();
});