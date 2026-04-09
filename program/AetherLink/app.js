/**
 * AetherLink Web — Full-Featured Client with Picture-in-Picture
 * Features: multi-peer, device naming, previous devices, group broadcast,
 *           auto-reconnect, always-visible messages, mini widget, QR share,
 *           Picture-in-Picture mode for overlay display
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

function saveName(name) {
    localStorage.setItem(SK.NAME, name);
}

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
const CHUNK_SIZE = 256 * 1024;
const SIG_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://aetherlink-server.onrender.com';

let deviceName   = loadName();
let roomId       = '';
let isHost       = false;
let isMinimized  = false;
let pipWindow    = null;
let pipDocument  = null;

// Map<socketId, {peer, name, connected}>
const peers = new Map();

// File send state
let sendQueue             = [];
let currentSend           = null;
let cancelFlag            = false;

// Map<fileId, {meta, buffer, received, fromPeer}>
const recvMap = new Map();

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

    const D = 155; // max connection distance

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
//  Picture-in-Picture Functions
// ─────────────────────────────────────────
async function enterPiPMode() {
    try {
        // Try Document Picture-in-Picture API first (Chrome 116+)
        if ('documentPictureInPicture' in window) {
            pipWindow = await window.documentPictureInPicture.requestWindow({
                width: 400,
                height: 300,
                disallowReturnToOpener: false
            });
            
            pipDocument = pipWindow.document;
            
            // Copy styles to PiP window
            const styles = document.querySelectorAll('link[rel="stylesheet"], style');
            styles.forEach(style => {
                pipDocument.head.appendChild(style.cloneNode(true));
            });
            
            // Create PiP content
            setupPiPContent();
            
            // Handle PiP window close
            pipWindow.addEventListener('pagehide', () => {
                setMini(false);
            });
            
            toast('وضع النافذة العائمة مفعل', 'success');
            return true;
        }
        
        // Fallback: Use custom floating div
        showCustomPiP();
        return true;
        
    } catch (err) {
        console.error('PiP error:', err);
        // Fallback to mini widget
        showMiniWidget();
        return false;
    }
}

function setupPiPContent() {
    if (!pipDocument) return;
    
    const connected = getConnected();
    const n = connected.length;
    
    pipDocument.body.innerHTML = `
        <div class="pip-app" style="
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #020a18 0%, #0a1a30 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Tajawal', sans-serif;
            color: #dde4f0;
            position: relative;
            overflow: hidden;
        ">
            <div class="pip-bg" style="
                position: absolute;
                inset: 0;
                background: radial-gradient(circle at 40% 50%, rgba(58,123,213,0.3) 0%, transparent 60%),
                            radial-gradient(circle at 70% 30%, rgba(155,89,182,0.2) 0%, transparent 50%);
            "></div>
            
            <div class="pip-content" style="
                position: relative;
                z-index: 1;
                text-align: center;
                padding: 20px;
            ">
                <h1 style="
                    font-size: 1.8rem;
                    font-weight: 900;
                    background: linear-gradient(120deg, #00d2ff 0%, #3a7bd5 60%, #9b59b6 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin-bottom: 8px;
                ">AetherLink</h1>
                
                <div class="pip-device" style="
                    font-size: 0.9rem;
                    color: #00d2ff;
                    margin-bottom: 16px;
                ">📡 ${esc(deviceName)}</div>
                
                <div class="pip-status" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: ${n > 0 ? 'rgba(67,233,123,0.15)' : 'rgba(255,193,7,0.15)'};
                    border: 1px solid ${n > 0 ? 'rgba(67,233,123,0.3)' : 'rgba(255,193,7,0.3)'};
                    border-radius: 20px;
                    color: ${n > 0 ? '#43e97b' : '#ffc107'};
                    font-weight: 700;
                ">
                    <span class="pip-dot" style="
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: ${n > 0 ? '#43e97b' : '#ffc107'};
                        ${n > 0 ? 'animation: pulse 2s ease-in-out infinite;' : ''}
                    "></span>
                    ${n > 0 ? `${n} متصل` : 'في الانتظار...'}
                </div>
                
                ${n > 0 ? `
                <div class="pip-peers" style="
                    margin-top: 12px;
                    font-size: 0.75rem;
                    color: #8899aa;
                ">
                    ${connected.map(([_, p]) => `📱 ${esc(p.name)}`).join('<br>')}
                </div>
                ` : ''}
            </div>
            
            <button class="pip-expand" style="
                position: absolute;
                bottom: 12px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #00d2ff, #3a7bd5);
                border: none;
                border-radius: 20px;
                padding: 8px 20px;
                color: #fff;
                font-family: 'Tajawal', sans-serif;
                font-weight: 700;
                cursor: pointer;
                z-index: 2;
            ">⤢ توسيع</button>
        </div>
    `;
    
    // Add pulse animation
    const style = pipDocument.createElement('style');
    style.textContent = `
        @keyframes pulse { 0%,100%{ opacity:1; } 50%{ opacity:0.5; } }
    `;
    pipDocument.head.appendChild(style);
    
    // Bind expand button
    pipDocument.querySelector('.pip-expand')?.addEventListener('click', () => {
        setMini(false);
    });
}

function showCustomPiP() {
    const pipContainer = document.getElementById('pip-container');
    if (!pipContainer) return;
    
    pipContainer.classList.remove('hidden');
    updateCustomPiP();
    initPiPDrag();
}

function updateCustomPiP() {
    const pipContainer = document.getElementById('pip-container');
    const videoContainer = document.getElementById('pip-video-container');
    if (!pipContainer || !videoContainer) return;
    
    const connected = getConnected();
    const n = connected.length;
    
    videoContainer.innerHTML = `
        <div style="
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 16px;
            text-align: center;
        ">
            <h2 style="
                font-size: 1.3rem;
                font-weight: 900;
                background: linear-gradient(120deg, #00d2ff 0%, #3a7bd5 60%, #9b59b6 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 4px;
            ">AetherLink</h2>
            
            <div style="font-size: 0.75rem; color: #00d2ff; margin-bottom: 12px;">📡 ${esc(deviceName)}</div>
            
            <div class="pip-status">
                <span class="pip-status-dot" style="background: ${n > 0 ? '#43e97b' : '#ffc107'};"></span>
                <span>${n > 0 ? `${n} متصل` : 'في الانتظار...'}</span>
            </div>
            
            ${n > 0 ? `
            <div style="margin-top: 8px; font-size: 0.7rem; color: #8899aa;">
                ${connected.map(([_, p]) => `📱 ${esc(p.name)}`).join('<br>')}
            </div>
            ` : ''}
            
            <div class="pip-controls">
                <button class="pip-btn pip-expand-btn" title="توسيع">⤢</button>
                <button class="pip-btn pip-close-btn" title="إغلاق">✕</button>
            </div>
        </div>
    `;
    
    // Bind buttons
    videoContainer.querySelector('.pip-expand-btn')?.addEventListener('click', () => {
        setMini(false);
    });
    
    videoContainer.querySelector('.pip-close-btn')?.addEventListener('click', () => {
        pipContainer.classList.add('hidden');
    });
}

function hidePiP() {
    // Close Document PiP if open
    if (pipWindow && !pipWindow.closed) {
        pipWindow.close();
        pipWindow = null;
        pipDocument = null;
    }
    
    // Hide custom PiP
    const pipContainer = document.getElementById('pip-container');
    if (pipContainer) {
        pipContainer.classList.add('hidden');
    }
}

function initPiPDrag() {
    const pipContainer = document.getElementById('pip-container');
    if (!pipContainer) return;
    
    let ox = 0, oy = 0, startL = 0, startT = 0, dragging = false;
    
    const start = (cx, cy) => {
        // Don't drag if clicking buttons
        if (event.target.closest('button')) return;
        dragging = true;
        ox = cx; oy = cy;
        const r = pipContainer.getBoundingClientRect();
        startL = r.left; startT = r.top;
    };
    
    const move = (cx, cy) => {
        if (!dragging) return;
        pipContainer.style.left = `${startL + cx - ox}px`;
        pipContainer.style.top = `${startT + cy - oy}px`;
        pipContainer.style.right = 'auto';
        pipContainer.style.bottom = 'auto';
    };
    
    const stop = () => { dragging = false; };
    
    pipContainer.addEventListener('mousedown', (e) => start(e.clientX, e.clientY));
    document.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    document.addEventListener('mouseup', stop);
    
    pipContainer.addEventListener('touchstart', (e) => { 
        const t = e.touches[0]; 
        start(t.clientX, t.clientY); 
    }, { passive: true });
    
    pipContainer.addEventListener('touchmove', (e) => { 
        const t = e.touches[0]; 
        move(t.clientX, t.clientY); 
    }, { passive: true });
    
    pipContainer.addEventListener('touchend', stop);
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
    const mini = document.getElementById('mini-widget');
    if (mini) mini.classList.add('hidden');
}

// ─────────────────────────────────────────
//  Socket listeners
// ─────────────────────────────────────────
function setupSocket() {
    socket.on('connect', () => {
        console.log('✅ Socket:', socket.id);
        // Destroy all old peers on reconnect
        peers.forEach(({ peer }) => { try { peer.destroy(); } catch (_) {} });
        peers.clear();
        if (roomId) socket.emit('join-room', { roomId, deviceName });
    });

    socket.on('connect_error', () => toast('خطأ في الاتصال بالخادم', 'error'));

    socket.on('waiting-for-peer', () => setStatus('في انتظار انضمام الطرف الآخر...'));

    // Existing peers when we join
    socket.on('room-peers', (list) => {
        if (list.length === 0) return setStatus('في انتظار انضمام الطرف الآخر...');
        list.forEach(({ id, name }) => makePeer(id, name, true));
    });

    // New peer joined the room
    socket.on('new-peer', ({ id, name }) => {
        makePeer(id, name, false);
    });

    // WebRTC signal relay
    socket.on('receive-signal', ({ signal, from }) => {
        const pi = peers.get(from);
        if (pi) pi.peer.signal(signal);
    });

    // Peer left
    socket.on('peer-left', ({ id, name }) => {
        const pi = peers.get(id);
        if (pi) { try { pi.peer.destroy(); } catch (_) {} peers.delete(id); }
        addToPrev(name);
        updatePeersUI();
        updatePiPStatus();
        toast(`${name} غادر الجلسة`, 'warning');
        if (getConnected().length === 0) setBadge('warn', '● منقطع');
    });

    // Reconnect handshake
    socket.on('reconnect-request', ({ from, fromName }) => {
        showReconnectModal(fromName, from);
    });

    socket.on('reconnect-accepted', ({ newRoomId }) => {
        window.location.search = `?id=${newRoomId}`;
    });

    socket.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect')
            toast('جاري إعادة الاتصال بالخادم...', 'warning');
    });
}

function updatePiPStatus() {
    if (pipWindow && !pipWindow.closed) {
        setupPiPContent();
    } else if (!document.getElementById('pip-container')?.classList.contains('hidden')) {
        updateCustomPiP();
    }
}

// ─────────────────────────────────────────
//  Peer management
// ─────────────────────────────────────────
function makePeer(peerId, peerName, initiator) {
    const peer = new SimplePeer({
        initiator,
        trickle: false,
        config: { iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ]},
    });

    peers.set(peerId, { peer, name: peerName, connected: false });

    peer.on('signal', (data) => socket.emit('send-signal', { to: peerId, signal: data }));

    peer.on('connect', () => {
        const pi = peers.get(peerId);
        if (pi) pi.connected = true;
        addToPrev(peerName);
        // Send our device name
        try { peer.send(JSON.stringify({ type: 'hello', name: deviceName })); } catch (_) {}
        updatePeersUI();
        updatePiPStatus();
        renderConnectedUI();
        toast(`✅ متصل بـ ${peerName}`, 'success');
    });

    peer.on('data', (data) => onData(data, peerId));

    peer.on('close', () => {
        peers.delete(peerId);
        updatePeersUI();
        updatePiPStatus();
    });

    peer.on('error', (e) => {
        console.error('Peer error', e);
        peers.delete(peerId);
        updatePeersUI();
        updatePiPStatus();
    });
}

function getConnected() {
    return [...peers.entries()].filter(([_, p]) => p.connected);
}

// ─────────────────────────────────────────
//  Incoming data handler
// ─────────────────────────────────────────
function onData(raw, fromId) {
    try {
        const msg = JSON.parse(raw.toString());
        switch (msg.type) {
            case 'hello': {
                const pi = peers.get(fromId);
                if (pi) { pi.name = msg.name; updatePeersUI(); updatePiPStatus(); }
                break;
            }
            case 'metadata':
                recvMap.set(msg.payload.fileId, {
                    meta: msg.payload, buffer: [], received: 0, fromId,
                });
                updateTransferItem(msg.payload, 0, 'جاري الاستلام...');
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
            default:
                recvChunk(raw, fromId);
        }
    } catch (_) {
        recvChunk(raw, fromId);
    }
}

function recvChunk(chunk, fromId) {
    for (const [fid, entry] of recvMap) {
        if (entry.fromId === fromId) {
            entry.buffer.push(chunk);
            entry.received += chunk.length;
            const pct = Math.round((entry.received / entry.meta.fileSize) * 100);
            updateTransferItem(entry.meta, pct, 'جاري الاستلام...');
            if (entry.received >= entry.meta.fileSize) {
                downloadBlob(new Blob(entry.buffer), entry.meta.fileName);
                updateTransferItem(entry.meta, 100, 'اكتمل الاستلام ✓', true);
                recvMap.delete(fid);
            }
            return;
        }
    }
}

function cancelRecv(fileId, reason) {
    const e = recvMap.get(fileId);
    if (e) { updateTransferItem(e.meta, 0, reason, true, true); recvMap.delete(fileId); }
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
          <button class="icon-btn" id="minimize-btn" title="تصغير">⊟</button>
        </div>
      </header>

      <div class="home-content">
        <!-- QR -->
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
    </div>`;

    generateQR(joinUrl);
    bindHomeEvents(joinUrl);
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
//  UI — Connected (transfer + messages)
// ─────────────────────────────────────────
function renderConnectedUI() {
    // Already rendered? Just update peers panel.
    if (document.getElementById('transfer-section')) { updatePeersUI(); return; }

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
          <button class="icon-btn" id="minimize-btn" title="تصغير">⊟</button>
        </div>
      </header>

      <!-- Peers panel -->
      <div class="peers-panel" id="peers-panel">
        <span class="peers-count" id="peers-count">0 متصل</span>
        <div class="peer-chips" id="peer-chips"></div>
        <button class="broadcast-btn" id="broadcast-btn">📡 إرسال للجميع</button>
      </div>

      <!-- Transfer area -->
      <div class="transfer-section" id="transfer-section">
        <div class="drop-zone" id="drop-zone">
          <div class="drop-icon">📁</div>
          <p class="drop-label">أسقط ملفات هنا أو انقر للاختيار</p>
          <p class="drop-hint">يمكن إرسال ملفات متعددة في وقت واحد</p>
          <input type="file" id="file-input" multiple>
        </div>
        <div class="transfer-list" id="transfer-list"></div>
      </div>

      <!-- Messages -->
      <div class="messages-section">
        <div class="messages-list" id="msg-list"></div>
        <div class="msg-bar">
          <input type="text" class="msg-field" id="msg-field" placeholder="اكتب رسالة..." autocomplete="off">
          <button class="send-btn" id="send-btn">↑</button>
        </div>
      </div>
    </div>`;

    updatePeersUI();
    bindTransferEvents();
    bindMsgEvents();
    bindMinBtn();
}

// ─────────────────────────────────────────
//  Peers panel update
// ─────────────────────────────────────────
function updatePeersUI() {
    const panel      = document.getElementById('peers-panel');
    const countEl    = document.getElementById('peers-count');
    const chipsEl    = document.getElementById('peer-chips');
    const bcastBtn   = document.getElementById('broadcast-btn');
    if (!panel) return;

    const connected = getConnected();
    if (countEl)  countEl.textContent = `${connected.length} متصل`;
    if (chipsEl)  chipsEl.innerHTML   = connected.map(([_, p]) => `<span class="peer-chip">📱 ${esc(p.name)}</span>`).join('');
    if (bcastBtn) {
        bcastBtn.className = `broadcast-btn${connected.length > 1 ? ' visible' : ''}`;
    }
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

    // Edit device name
    document.getElementById('edit-name-btn')?.addEventListener('click', () => {
        const chip  = document.getElementById('chip-name');
        const input = document.createElement('input');
        input.className = 'name-edit-field';
        input.value     = deviceName;
        chip.replaceWith(input);
        input.focus();
        input.select();
        const commit = () => {
            const v = input.value.trim() || deviceName;
            deviceName = v; saveName(v);
            input.replaceWith(Object.assign(document.createElement('span'), {
                className: 'device-chip-name', id: 'chip-name', textContent: v
            }));
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    });

    // Copy link
    document.getElementById('btn-copy')?.addEventListener('click', () => {
        navigator.clipboard.writeText(joinUrl).then(() => {
            const b = document.getElementById('btn-copy');
            if (b) { b.textContent = '✅ تم النسخ!'; setTimeout(() => { b.textContent = '📋 نسخ الرابط'; }, 2000); }
        });
    });

    // WhatsApp
    document.getElementById('btn-wa')?.addEventListener('click', () => {
        open(`https://wa.me/?text=${encodeURIComponent('انضم لجلستي على AetherLink:\n' + joinUrl)}`, '_blank');
    });

    // Native share / Twitter fallback
    document.getElementById('btn-share')?.addEventListener('click', async () => {
        if (navigator.share) {
            try { await navigator.share({ title: 'AetherLink', url: joinUrl }); return; } catch (_) {}
        }
        open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('AetherLink - نقل الملفات الآمن\n' + joinUrl)}`, '_blank');
    });

    // Previous devices — create new session
    document.querySelectorAll('[data-pname]').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.getAttribute('data-pname');
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
//  Event binding — transfer
// ─────────────────────────────────────────
function bindTransferEvents() {
    const dz   = document.getElementById('drop-zone');
    const fi   = document.getElementById('file-input');
    const bcast = document.getElementById('broadcast-btn');

    dz?.addEventListener('click', () => fi?.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev =>
        dz?.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); })
    );
    dz?.addEventListener('dragenter', () => dz.classList.add('drag-over'));
    dz?.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz?.addEventListener('drop', (e) => { dz.classList.remove('drag-over'); queueFiles(e.dataTransfer.files, false); });
    fi?.addEventListener('change', (e) => {
        const isBcast = fi.dataset.broadcast === '1';
        fi.removeAttribute('data-broadcast');
        queueFiles(e.target.files, isBcast);
        fi.value = '';
    });

    bcast?.addEventListener('click', () => {
        if (fi) fi.dataset.broadcast = '1';
        fi?.click();
    });
}

// ─────────────────────────────────────────
//  Event binding — messages
// ─────────────────────────────────────────
function bindMsgEvents() {
    const field = document.getElementById('msg-field');
    const btn   = document.getElementById('send-btn');

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
    field?.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
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
        // Try PiP first
        const pipSuccess = await enterPiPMode();
        if (!pipSuccess) {
            showMiniWidget();
        } else {
            hideMiniWidget();
        }
    } else {
        // Restore from PiP
        hidePiP();
        hideMiniWidget();
        
        // Close Document PiP window if open
        if (pipWindow && !pipWindow.closed) {
            pipWindow.close();
            pipWindow = null;
            pipDocument = null;
        }
    }
}

// Make mini widget draggable
function initMiniDrag() {
    const el = document.getElementById('mini-widget');
    if (!el) return;
    let ox = 0, oy = 0, startL = 0, startT = 0, dragging = false;

    const start = (cx, cy) => {
        dragging = true;
        ox = cx; oy = cy;
        const r = el.getBoundingClientRect();
        startL = r.left; startT = r.top;
        el.style.left = startL + 'px'; el.style.bottom = 'auto'; el.style.top = startT + 'px';
    };
    const move = (cx, cy) => {
        if (!dragging) return;
        el.style.left = `${startL + cx - ox}px`;
        el.style.top  = `${startT + cy - oy}px`;
    };
    const stop = () => { dragging = false; };

    el.addEventListener('mousedown', (e) => { if (e.target.closest('button')) return; start(e.clientX, e.clientY); });
    document.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    document.addEventListener('mouseup', stop);

    el.addEventListener('touchstart', (e) => { const t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
    el.addEventListener('touchmove', (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true });
    el.addEventListener('touchend', stop);
}

// ─────────────────────────────────────────
//  File send queue
// ─────────────────────────────────────────
function queueFiles(files, broadcast) {
    if (!files.length) return;
    const targets = broadcast
        ? getConnected().map(([id]) => id)
        : (getConnected()[0] ? [getConnected()[0][0]] : []);

    if (!targets.length) { toast('لا يوجد أجهزة متصلة', 'error'); return; }

    for (const f of files) sendQueue.push({ file: f, targets });
    if (!currentSend) runQueue();
}

function runQueue() {
    if (!sendQueue.length) { currentSend = null; return; }
    currentSend = sendQueue.shift();
    sendFileTo(currentSend.file, currentSend.targets);
}

function sendFileTo(file, peerIds) {
    cancelFlag = false;
    const meta = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileId:   `${file.name}-${file.size}-${Date.now()}`,
    };

    peerIds.forEach(id => {
        const pi = peers.get(id);
        if (pi?.connected) try { pi.peer.send(JSON.stringify({ type: 'metadata', payload: meta })); } catch (_) {}
    });

    updateTransferItem(meta, 0, `جاري إرسال ${fmtBytes(file.size)}...`);

    const reader = new FileReader();
    let offset = 0;

    reader.onload = (e) => {
        if (cancelFlag || !e.target.result) return;
        try {
            peerIds.forEach(id => {
                const pi = peers.get(id);
                if (pi?.connected) try { pi.peer.send(e.target.result); } catch (_) {}
            });
            offset += e.target.result.byteLength;
            const pct = Math.round((offset / file.size) * 100);
            updateTransferItem(meta, pct, `جاري إرسال ${fmtBytes(file.size)}...`);
            if (offset < file.size) {
                reader.readAsArrayBuffer(file.slice(offset, offset + CHUNK_SIZE));
            } else {
                updateTransferItem(meta, 100, 'تم الإرسال بنجاح ✓', true);
                runQueue();
            }
        } catch (err) {
            updateTransferItem(meta, 0, 'فشل في الإرسال', true, true);
            peerIds.forEach(id => {
                const pi = peers.get(id);
                if (pi?.connected) try { pi.peer.send(JSON.stringify({ type: 'error', payload: meta })); } catch (_) {}
            });
            runQueue();
        }
    };

    reader.onerror = () => { updateTransferItem(meta, 0, 'فشل قراءة الملف', true, true); runQueue(); };
    reader.readAsArrayBuffer(file.slice(0, CHUNK_SIZE));
}

// ─────────────────────────────────────────
//  Transfer item UI (newest first)
// ─────────────────────────────────────────
function updateTransferItem(meta, pct, statusText, done = false, err = false) {
    const list = document.getElementById('transfer-list');
    if (!list) return;

    const id  = `tr-${meta.fileId}`;
    let   el  = document.getElementById(id);

    if (!el) {
        el = document.createElement('div');
        el.className = 'tr-item';
        el.id = id;
        list.insertBefore(el, list.firstChild); // newest at top
    }

    const cls = done ? (err ? 'error' : 'done') : '';
    const showCancel = !done && statusText.includes('إرسال');

    el.innerHTML = `
      <div class="tr-header">
        <span class="tr-name" title="${esc(meta.fileName)}">${esc(meta.fileName)}</span>
        <span class="tr-pct">${pct}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-inner ${cls}" style="width:${pct}%"></div>
      </div>
      <div class="tr-status ${cls}">${esc(statusText)}</div>
      ${showCancel ? `<button class="cancel-btn" data-fid="${esc(meta.fileId)}">إلغاء</button>` : ''}
    `;

    el.querySelector('.cancel-btn')?.addEventListener('click', () => {
        cancelFlag = true;
        getConnected().forEach(([_, p]) => {
            try { p.peer.send(JSON.stringify({ type: 'cancel', payload: meta })); } catch (_) {}
        });
        updateTransferItem(meta, pct, 'تم الإلغاء', true, true);
        runQueue();
    });
}

// ─────────────────────────────────────────
//  Chat messages (newest first)
// ─────────────────────────────────────────
function appendMsg(text, sent, senderName) {
    const list = document.getElementById('msg-list');
    if (!list) return;
    const div = document.createElement('div');
    div.className = `msg ${sent ? 'sent' : 'received'}`;
    div.innerHTML = `
      <span class="msg-sender">${esc(senderName)}</span>
      <span class="msg-bubble">${esc(text)}</span>
    `;
    list.insertBefore(div, list.firstChild); // prepend
}

// ─────────────────────────────────────────
//  QR code generation
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
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 150);
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
        setTimeout(() => el.remove(), 350);
    }, 3200);
}

// ─────────────────────────────────────────
//  Bootstrap
// ─────────────────────────────────────────
// ─────────────────────────────────────────
//  Force container size on desktop
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