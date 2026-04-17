/**
 * AetherLink Web — Multi-Peer P2P File Transfer
 * v2: parallel transfers · auto-save · fast local · instant session
 * FIXED: Bidirectional P2P — all peers are initiators for full duplex communication
 */

// ─────────────────────────────────────────
//  Storage helpers
// ─────────────────────────────────────────
const SK = {
    NAME: 'aetherlink-device-name',
    PREV: 'aetherlink-prev-devices',
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

// ─────────────────────────────────────────
//  Global state
// ─────────────────────────────────────────
const CHUNK_SIZE    = 1024 * 1024; // 1 MB — fast for LAN
const SIG_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://aetherlink-server.onrender.com';

let deviceName        = loadName();
let roomId            = '';
let isHost            = false;
let isMinimized       = false;
let isLocalConnection = false;
let pipWindow         = null;
let pipDocument       = null;

// Map<socketId, {peer, name, connected}>
const peers = new Map();

// ✅ Track connection state to prevent duplicates
let isJoiningRoom = false;
let lastJoinTime = 0;

// Local discovery
const localDiscovery = new Map(); // socketId → {socketId, deviceName}
const localConnected = new Set(); // socketIds connected locally
const reconnectTimers = new Map(); // peerId → {timer, attempt}
let isDiscovering    = false;

// Parallel sends: Map<fileId, {cancelled}>
const sendingFiles = new Map();

// Map<fileId, {meta, buffer[], received, fromId}>
const recvMap = new Map();

// Map<fileId, {blob, meta, sender, url}>
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
    reconnectionDelay: 1500,
    timeout: 20000,
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
    // raw is Buffer/Uint8Array from SimplePeer
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
//  Canvas particle network
// ─────────────────────────────────────────
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
        
        // ✅ لا تدمر الـ peers النشطة عند إعادة الاتصال بالـ socket
        // في وضع الإنترنت، نحتفظ بالاتصالات النشطة ما لم تنقطع فعلياً
        if (isLocalConnection) {
            // في الوضع المحلي فقط، نظف الاتصالات غير النشطة
            const toDestroy = [];
            peers.forEach(({ peer, connected }, id) => {
                if (!connected) toDestroy.push({ id, peer });
            });
            toDestroy.forEach(({ id, peer }) => {
                try { peer.destroy(); } catch (_) {}
                peers.delete(id);
            });
        }
 
        // إعادة الانضمام للغرفة فقط إذا لم نكن متصلين بالفعل
        if (roomId && peers.size === 0 && !isJoiningRoom) {
            isJoiningRoom = true;
            socket.emit('join-room', { roomId, deviceName });
            setTimeout(() => { isJoiningRoom = false; }, 1000);
        }
    });

    socket.on('connect_error', () => toast('خطأ في الاتصال بالخادم', 'error'));
    socket.on('waiting-for-peer', () => setStatus('في انتظار انضمام الطرف الآخر...'));

    // ═══════════════════════════════════════════════════════════════════
    //  ✅ FIX: Bidirectional P2P — كلاهما initiators للاتصال ثنائي الاتجاه
    // ═══════════════════════════════════════════════════════════════════
    socket.on('room-peers', (list) => {
        if (list.length === 0) return setStatus('في انتظار انضمام الطرف الآخر...');
        
        // ✅ لا تنشئ اتصالات جديدة إذا كنا متصلين بالفعل
        if (peers.size > 0) {
            console.log('⚠️ Already have peers, skipping duplicate connections');
            return;
        }
        
        list.forEach(({ id, name }) => {
            // تحقق من عدم وجود اتصال مسبق بهذا الـ peer
            if (!peers.has(id)) {
                // ✅ FIX: اتصال ثنائي الاتجاه — كلاهما initiators
                // هذا يمكّن كل المتصلين من الإرسال والاستقبال
                makePeer(id, name, true);
            }
        });
    });

    // ✅ المضيف يستقبل new-peer ويبدأ الاتصال (initiator=true)
    socket.on('new-peer', ({ id, name }) => makePeer(id, name, true));

    socket.on('receive-signal', ({ signal, from }) => {
        const pi = peers.get(from);
        if (pi) pi.peer.signal(signal);
    });

    socket.on('peer-left', ({ id, name }) => {
        const pi = peers.get(id);
        if (pi) { 
            if (pi._keepalive) clearInterval(pi._keepalive);
            try { pi.peer.destroy(); } catch (_) {} 
            peers.delete(id); 
        }
        localConnected.delete(id);
        addToPrev(name);
        updatePeersUI(); updatePiPStatus();
        toast(`${name} غادر الجلسة - سيتم إنهاء الجلسة`, 'warning');
        
        // إنهاء الجلسة فوراً للطرف الآخر عند مغادرة أي طرف
        setTimeout(() => {
            goHome();
            toast('تم إنهاء الجلسة بسبب مغادرة الطرف الآخر', 'info');
        }, 2000);
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

    // ✅ FIX: Inviter already in room — do NOT call joinDiscoveredRoom
    socket.on('connect-invite-response', ({ accepted, roomId: inviteRoomId }) => {
        if (accepted) {
            toast('✅ تم قبول الاتصال! جاري إنشاء الاتصال...', 'success');
            // The server will send 'new-peer' which triggers makePeer → renderConnectedUI
        } else {
            toast('رفض الجهاز الاتصال', 'warning');
            // Re-enable connect button
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
    // ✅ تحقق مما إذا كان هناك اتصال نشط بالفعل - لا تكرر
    const existing = peers.get(peerId);
    if (existing) {
        if (existing.connected) {
            console.log(`⚠️ Peer ${peerName} already connected, skipping duplicate`);
            return;
        }
        // إذا كان هناك peer غير متصل، دمره أولاً
        try { existing.peer.destroy(); } catch (_) {}
        if (existing._keepalive) clearInterval(existing._keepalive);
    }
    
    // أوقف أي reconnect timer قديم لهذا الـ peer
    if (reconnectTimers.has(peerId)) {
        clearTimeout(reconnectTimers.get(peerId).timer);
        reconnectTimers.delete(peerId);
    }
    
    console.log(`🔌 Creating peer connection to ${peerName} (initiator: ${initiator}, isHost: ${isHost})`);
 
    const peer = new SimplePeer({
        initiator,
        trickle: false,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
            ],
        },
    });
 
    peers.set(peerId, { peer, name: peerName, connected: false });
 
    peer.on('signal', (data) => {
        // ✅ تأكد من أننا لا نرسل إشارات بعد إغلاق الاتصال
        const pi = peers.get(peerId);
        if (!pi || pi.connected === 'destroyed') return;
        socket.emit('send-signal', { to: peerId, signal: data });
    });
 
    peer.on('connect', () => {
        const pi = peers.get(peerId);
        if (!pi || pi.connected === 'destroyed') return;
        
        pi.connected = true;
        addToPrev(peerName);
 
        try { peer.send(JSON.stringify({ type: 'hello', name: deviceName })); } catch (_) {}
 
        updatePeersUI();
        updatePiPStatus();
        renderConnectedUI();
        setBadge('ok', '● متصل');
        toast(`✅ متصل بـ ${peerName}`, 'success');
 
        if (isLocalConnection) localConnected.add(peerId);
 
        // ── Keepalive ping كل 15 ثانية ──────────────
        const kTimer = setInterval(() => {
            const p = peers.get(peerId);
            if (!p || !p.connected || p.connected === 'destroyed') { 
                clearInterval(kTimer); 
                return; 
            }
            try {
                p.peer.send(JSON.stringify({ type: 'ping' }));
            } catch (_) {
                clearInterval(kTimer);
            }
        }, 15000);
 
        if (peers.has(peerId)) peers.get(peerId)._keepalive = kTimer;
    });
 
    peer.on('data', (data) => onData(data, peerId));
 
    peer.on('close', () => {
        const pi = peers.get(peerId);
        const wasConnected = pi?.connected === true;
        if (pi?._keepalive) clearInterval(pi._keepalive);
        
        // ✅ علم الـ peer كـ destroyed لتجنب العمليات عليه
        if (pi) pi.connected = 'destroyed';
        
        peers.delete(peerId);
        localConnected.delete(peerId);
        updatePeersUI();
        updatePiPStatus();
 
        if (wasConnected) {
            toast(`⚠️ انقطع الاتصال مع ${peerName}، جاري إعادة المحاولة...`, 'warning');
            scheduleReconnect(peerId, peerName, 1);
        }
    });
 
    peer.on('error', (e) => {
        console.error('Peer error', peerId, e.message || e);
        const pi = peers.get(peerId);
        const wasConnected = pi?.connected === true;
        
        // ✅ في وضع الإنترنت، لا نحاول إعادة الاتصال على الفور عند الخطأ
        // نترك للـ 'close' event أن يتعامل مع ذلك
        if (!isLocalConnection && !wasConnected) {
            console.log('Internet mode: ignoring early error, waiting for close event');
            return;
        }
        
        if (pi?._keepalive) clearInterval(pi._keepalive);
        if (pi) pi.connected = 'destroyed';
        
        peers.delete(peerId);
        localConnected.delete(peerId);
        updatePeersUI();
        updatePiPStatus();
 
        scheduleReconnect(peerId, peerName, wasConnected ? 1 : 2);
    });
}
 

function getConnected() {
    return [...peers.entries()].filter(([_, p]) => p.connected);
}

function scheduleReconnect(peerId, peerName, attempt = 1) {
    // إذا عاد الاتصال مسبقاً — لا تفعل شيئاً
    const existing = peers.get(peerId);
    if (existing && existing.connected) return;
    
    // ✅ في وضع الإنترنت، لا نحاول إعادة الاتصال كثيراً
    // نكتفي بمحاولة واحدة فقط ثم ننهي الجلسة
    if (!isLocalConnection && attempt > 1) {
        console.log(`🚫 Internet mode: giving up reconnection after first attempt`);
        toast('انقطع الاتصال - سيتم إنهاء الجلسة', 'warning');
        setTimeout(() => goHome(), 2000);
        return;
    }
 
    // امسح أي مؤقت سابق لنفس الـ peer
    if (reconnectTimers.has(peerId)) {
        clearTimeout(reconnectTimers.get(peerId).timer);
    }
 
    // ✅ تأخير أطول للإنترنت، أقصر للشبكة المحلية
    const baseDelay = isLocalConnection ? 2000 : 5000;
    const delay = Math.min(baseDelay * attempt, isLocalConnection ? 30000 : 10000);
    console.log(`🔄 إعادة الاتصال بـ ${peerName} بعد ${delay}ms (محاولة ${attempt}) - ${isLocalConnection ? 'Local' : 'Internet'}`);
 
    const timer = setTimeout(() => {
        reconnectTimers.delete(peerId);
 
        // إذا كان الـ socket غير متصل، أعد المحاولة لاحقاً (للشبكة المحلية فقط)
        if (!socket.connected) {
            if (isLocalConnection) {
                scheduleReconnect(peerId, peerName, attempt + 1);
            } else {
                // في الإنترنت، ننتظر قليلاً ثم ننهي الجلسة
                toast('انقطع الاتصال بالخادم - سيتم إنهاء الجلسة', 'warning');
                setTimeout(() => goHome(), 2000);
            }
            return;
        }
 
        // إذا تم الاتصال بالفعل عبر مسار آخر — توقف
        const current = peers.get(peerId);
        if (current && current.connected) return;
        
        // ✅ في وضع الإنترنت، لا نعيد بناء Peer إذا كان قد تم الاتصال من قبل
        if (!isLocalConnection && attempt > 1) {
            toast('فشل إعادة الاتصال - سيتم إنهاء الجلسة', 'warning');
            setTimeout(() => goHome(), 2000);
            return;
        }
 
        // ✅ FIX: اتصال ثنائي الاتجاه — كلاهما initiators
        const shouldInitiate = true;
        makePeer(peerId, peerName, shouldInitiate);
    }, delay);
 
    reconnectTimers.set(peerId, { timer, attempt });
    setBadge('warn', `● إعادة الاتصال... (${attempt})`);
}
// ─────────────────────────────────────────
//  Incoming data handler
// ─────────────────────────────────────────
function onData(raw, fromId) {
    // SimplePeer: strings stay strings, binary arrives as Buffer/Uint8Array
    if (typeof raw === 'string') {
        try {
            const msg = JSON.parse(raw);
            handleJsonMsg(msg, fromId);
        } catch (_) {}
        return;
    }
    // Binary: might be old-style JSON (first byte = '{' = 0x7B) or new chunk protocol
    const firstByte = raw[0];
    if (firstByte === 0x7B) { // '{'
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
            // رد على الـ ping بـ pong لإبقاء الاتصال حياً
            const pi = peers.get(fromId);
            if (pi?.connected) {
                try { pi.peer.send(JSON.stringify({ type: 'pong' })); } catch (_) {}
            }
            break;
        }
        case 'pong':
            // الاتصال لا يزال حياً — لا إجراء مطلوب
            break;
        case 'metadata':
            recvMap.set(msg.payload.fileId, {
                meta: msg.payload, buffer: [], received: 0, fromId,
            });
            createReceivingFileBox(msg.payload, fromId);
            break;
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
 

// ─────────────────────────────────────────
//  Receive chunks — fileId-routed
// ─────────────────────────────────────────
function recvChunk(raw, fromId) {
    try {
        const { fileId, chunk } = parseChunkWithId(raw);
        const entry = recvMap.get(fileId);
        if (!entry) return;

        entry.buffer.push(chunk);
        entry.received += chunk.byteLength;
        const pct = Math.round((entry.received / entry.meta.fileSize) * 100);
        updateReceivingFileBox(entry.meta, pct, entry.fromId);

        if (entry.received >= entry.meta.fileSize) {
            const blob = new Blob(entry.buffer);
            const pi   = peers.get(fromId);
            completeReceivingFileBox(entry.meta, blob, pi?.name || 'مجهول');
            recvMap.delete(fileId);
        }
    } catch (e) {
        console.error('recvChunk error', e);
    }
}

function cancelRecv(fileId, reason) {
    const e = recvMap.get(fileId);
    if (e) { updateReceivingFileBox(e.meta, 0, e.fromId, true, reason); recvMap.delete(fileId); }
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

    const objectUrl = URL.createObjectURL(blob);
    downloadedFiles.set(fileId, { blob, meta, sender: senderName, url: objectUrl });
    sessionFiles.push({ fileId, meta, sender: senderName });

    // ✅ AUTO-SAVE: trigger download immediately
    downloadBlob(blob, meta.fileName);

    const isImage = meta.fileType?.startsWith('image/');
    const isVideo = meta.fileType?.startsWith('video/');

    // Update preview for image/video
    const previewDiv = box.querySelector('.file-preview');
    if (previewDiv && isImage) {
        previewDiv.innerHTML = `<img src="${objectUrl}" alt="${esc(meta.fileName)}">`;
    } else if (previewDiv && isVideo) {
        previewDiv.innerHTML = `
            <video src="${objectUrl}" style="width:100%;height:100%;object-fit:cover;" preload="metadata"></video>
            <div class="file-preview-overlay"><span>▶</span></div>`;
    }

    // Update progress
    const progressEl = document.getElementById(`recv-progress-${fileId}`);
    const pctEl      = document.getElementById(`recv-pct-${fileId}`);
    const statusEl   = document.getElementById(`recv-status-${fileId}`);
    if (progressEl) { progressEl.style.width = '100%'; progressEl.classList.add('done'); }
    if (pctEl)    { pctEl.textContent = '100%'; pctEl.style.color = '#43e97b'; }
    if (statusEl) { statusEl.textContent = 'تم الحفظ تلقائياً ✓'; statusEl.classList.add('done'); }

    // Action buttons
    const infoDiv = box.querySelector('.file-info');
    if (infoDiv) {
        const actDiv = document.createElement('div');
        actDiv.className = 'file-actions';
        if (isImage || isVideo) {
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
    if (isImage || isVideo) {
        box.onclick = () => openFullscreen(fileId);
        box.style.cursor = 'pointer';
    }
}

function downloadFileById(fileId) {
    const f = downloadedFiles.get(fileId);
    if (f) downloadBlob(f.blob, f.meta.fileName);
    else toast('الملف غير متوفر', 'error');
}

function deleteFile(fileId) {
    const f = downloadedFiles.get(fileId);
    if (f) { URL.revokeObjectURL(f.url); downloadedFiles.delete(fileId); }
    document.getElementById(`recv-file-${fileId}`)?.remove();
    sessionFiles = sessionFiles.filter(x => x.fileId !== fileId);
    toast('تم حذف الملف', 'success');
}

function openFullscreen(fileId) {
    const f = downloadedFiles.get(fileId);
    if (!f) return;
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

    // Determine which discovered devices are already connected
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
                // Open a new tab for a fresh parallel session
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

    // Set local connection flags
    isLocalConnection = true;
    roomId = newRoomId;
    isHost = true;
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
        // ✅ Set local connection before joining
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
          <button class="icon-btn" id="home-btn" title="الرئيسية" onclick="goHome()">🏠</button>
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
          <button class="icon-btn" id="home-btn" title="الرئيسية" onclick="goHome()">🏠</button>
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
            <button class="header-action-btn end-session" id="end-session-btn" title="إنهاء الجلسة">✕ إنهاء</button>
          </div>
          <div class="device-chip" id="name-chip">
            <span>📡</span>
            <span class="device-chip-name" id="chip-name">${esc(deviceName)}</span>
            <button class="icon-btn" id="edit-name-btn" title="تغيير الاسم">✏️</button>
          </div>
          <button class="icon-btn" id="home-btn" title="الرئيسية" onclick="goHome()">🏠</button>
          <button class="icon-btn" id="minimize-btn" title="تصغير">⊟</button>
        </div>
      </header>

      <!-- Peers panel -->
      <div class="peers-panel" id="peers-panel">
        <span class="peers-count" id="peers-count">0 متصل</span>
        <div class="peer-chips" id="peer-chips"></div>
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
            history.replaceState({}, '', `?id=${newRoom}`);
            socket.emit('join-room', { roomId, deviceName });
            renderHomeUI(newUrl);
            toast(`جلسة جديدة للاتصال بـ ${name} — شارك الرابط`, 'info');
        });
    });
}

// ─────────────────────────────────────────
//  Event binding — messages & file send
// ─────────────────────────────────────────
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

        // ✅ Limit to 50 files
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

        // ✅ Send all files in PARALLEL — no queue
        files.forEach(f => sendFileParallel(f, targets));
        fileInput.value = '';
    });
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
    document.getElementById('end-session-btn')?.addEventListener('click', endSession);
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
    goHome();
    toast('تم إنهاء الجلسة', 'success');
}

function goHome() {
    sessionMessages = []; sessionFiles = [];
    downloadedFiles.clear(); recvMap.clear();
    sendingFiles.forEach(sf => sf.cancelled = true);
    sendingFiles.clear();

    peers.forEach(({ peer }) => { try { peer.destroy(); } catch (_) {} });
    peers.clear();
    localConnected.clear();

    socket.emit('leave-room');
    isLocalConnection = false;
    isHost = true; // ✅ نحن الآن مضيفون لجلسة جديدة
    roomId = mkId();
    history.replaceState({}, '', `?id=${roomId}`);
    renderHomeUI(`${location.origin}${location.pathname}?id=${roomId}`);
    socket.emit('join-room', { roomId, deviceName });
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
//  Parallel file send — async, no queue
// ─────────────────────────────────────────
// ─────────────────────────────────────────
//  Parallel file send — async, no queue
// ─────────────────────────────────────────
async function sendFileParallel(file, peerIds) {
    const fileId = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const meta   = { fileName: file.name, fileSize: file.size, fileType: file.type, fileId };
 
    sendingFiles.set(fileId, { cancelled: false });
 
    // أرسل الـ metadata لكل الـ peers المتصلين
    const metaMsg = JSON.stringify({ type: 'metadata', payload: meta });
    peerIds.forEach(id => {
        const pi = peers.get(id);
        if (pi?.connected) {
            try { 
                pi.peer.send(metaMsg); 
            } catch (_) {}
        }
    });
 
    createSenderFileBox(file, meta);
 
    let offset = 0;
    let lastProgress = 0;
    
    try {
        while (offset < file.size) {
            const sf = sendingFiles.get(fileId);
            if (!sf || sf.cancelled) {
                console.log(`📤 File ${fileId} cancelled`);
                break;
            }
 
            const end      = Math.min(offset + CHUNK_SIZE, file.size);
            const chunkBuf = await file.slice(offset, end).arrayBuffer();
            const tagged   = makeChunkWithId(fileId, chunkBuf);
 
            // إرسال لكل الـ peers المتصلين
            for (const id of peerIds) {
                const pi = peers.get(id);
                if (!pi?.connected) {
                    console.warn(`⚠️ Peer ${id} not connected, skipping chunk`);
                    continue;
                }
 
                // ✅ Backpressure: انتظر إذا كان Buffer ممتلئاً (16MB)
                let waits = 0;
                const MAX_WAITS = 500;
                const BUFFER_LIMIT = 16 * 1024 * 1024; // 16MB
                
                while (
                    pi.peer._channel &&
                    pi.peer._channel.bufferedAmount > BUFFER_LIMIT &&
                    waits < MAX_WAITS
                ) {
                    await new Promise(r => setTimeout(r, 20));
                    waits++;
 
                    // تحقق من الاتصال أثناء الانتظار
                    const current = peers.get(id);
                    if (!current?.connected) {
                        console.warn(`⚠️ Peer ${id} disconnected during backpressure wait`);
                        break;
                    }
                }
 
                if (waits >= MAX_WAITS) {
                    console.warn(`⏱️ Backpressure timeout for peer ${id}`);
                }
 
                // ✅ محاولة الإرسال مع retry
                let sent = false;
                const MAX_RETRIES = 3;
                
                for (let retry = 0; retry < MAX_RETRIES; retry++) {
                    const currentPi = peers.get(id);
                    
                    if (!currentPi?.connected) {
                        // انتظر إعادة الاتصال (حتى 5 ثواني)
                        let waitConn = 0;
                        while (waitConn < 50) {
                            await new Promise(r => setTimeout(r, 100));
                            if (peers.get(id)?.connected) break;
                            waitConn++;
                        }
                        continue;
                    }
                    
                    try {
                        currentPi.peer.send(tagged);
                        sent = true;
                        break;
                    } catch (sendErr) {
                        console.warn(`❌ Send retry ${retry + 1}/${MAX_RETRIES} failed for ${fileId}:`, sendErr.message);
                        if (retry < MAX_RETRIES - 1) {
                            await new Promise(r => setTimeout(r, 300 * (retry + 1)));
                        }
                    }
                }
 
                if (!sent) {
                    console.error(`🚫 Failed to send chunk to peer ${id} after ${MAX_RETRIES} retries`);
                    // لا توقف الإرسال، استمر مع باقي الـ peers
                }
            }
 
            offset = end;
            const progress = Math.round((offset / file.size) * 100);
            
            // تحديث UI فقط إذا تغير التقدم
            if (progress !== lastProgress) {
                updateSenderFileBox(fileId, progress);
                lastProgress = progress;
            }
 
            // ✅ أعطِ للمتصفح فرصة لمعالجة الأحداث (كل 10 chunks)
            if (offset % (CHUNK_SIZE * 10) === 0) {
                await new Promise(r => setTimeout(r, 0));
            }
        }
 
        const sf = sendingFiles.get(fileId);
        if (sf && !sf.cancelled) {
            finalizeSenderFileBox(fileId);
            console.log(`✅ File ${file.name} sent successfully`);
        }
 
    } catch (err) {
        console.error('💥 sendFileParallel error:', err);
        updateSenderFileBox(fileId, lastProgress, true, 'فشل إرسال الملف');
        
        // أبلغ الـ peers بالخطأ
        peerIds.forEach(id => {
            const pi = peers.get(id);
            if (pi?.connected) {
                try { 
                    pi.peer.send(JSON.stringify({ type: 'error', payload: { fileId } })); 
                } catch (_) {}
            }
        });
    }
 
    sendingFiles.delete(fileId);
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
          <div class="tr-status" id="sender-status-${meta.fileId}" style="font-size:.75rem;color:#8899aa;">جاري الإرسال...</div>
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

function fmtBytes(b) {
    if (!b) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / 1024 ** i).toFixed(1)} ${u[i]}`;
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
    initCanvas();
    initMiniDrag();
    initPiPDrag();
    resizeContainer();
    window.addEventListener('resize', resizeContainer);

    const params = new URLSearchParams(location.search);
    roomId = params.get('id') || '';
    isHost = !roomId;

    if (isHost) {
        roomId = mkId();
        history.replaceState({}, '', `?id=${roomId}`);
        renderHomeUI(`${location.origin}${location.pathname}?id=${roomId}`);
    } else {
        renderJoinerUI();
    }

    setupSocket();
});