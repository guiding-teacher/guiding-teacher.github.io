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

// Map<fileId, {blob, meta, sender}> - for downloaded files
const downloadedFiles = new Map();

// Session messages and files (cleared on session end)
let sessionMessages = [];
let sessionFiles = [];

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
            updateFileMessageBox(entry.meta, pct, entry.fromId);
            if (entry.received >= entry.meta.fileSize) {
                const blob = new Blob(entry.buffer);
                const pi = peers.get(fromId);
                const senderName = pi?.name || 'مجهول';
                createFileMessageBox(entry.meta, blob, senderName, true);
                recvMap.delete(fid);
            }
            return;
        }
    }
}

function cancelRecv(fileId, reason) {
    const e = recvMap.get(fileId);
    if (e) { 
        updateFileMessageBox(e.meta, 0, e.fromId, true, reason); 
        recvMap.delete(fileId); 
    }
}

// ─────────────────────────────────────────
//  File Message Box UI
// ─────────────────────────────────────────
function createFileMessageBox(meta, blob, senderName, isReceived = false) {
    const list = document.getElementById('msg-list');
    if (!list) return;
    
    const fileId = meta.fileId;
    const isImage = meta.fileType?.startsWith('image/');
    const isVideo = meta.fileType?.startsWith('video/');
    const objectUrl = URL.createObjectURL(blob);
    
    // Store for download
    downloadedFiles.set(fileId, { blob, meta, sender: senderName, url: objectUrl });
    sessionFiles.push({ fileId, meta, sender: senderName });
    
    const div = document.createElement('div');
    div.className = `msg ${isReceived ? 'received' : 'sent'}`;
    div.id = `file-msg-${fileId}`;
    
    let previewHtml = '';
    if (isImage) {
        previewHtml = `<img src="${objectUrl}" alt="${esc(meta.fileName)}">`;
    } else if (isVideo) {
        previewHtml = `<video src="${objectUrl}" controls></video>`;
    } else {
        previewHtml = `<div class="file-icon">📄</div>`;
    }
    
    const timeStr = new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
      <span class="msg-sender">${esc(senderName)}</span>
      <div class="file-msg-box" onclick="openFullscreen('${fileId}')">
        <div class="file-preview">
          ${previewHtml}
          <div class="file-preview-overlay"><span>🔍</span></div>
        </div>
        <div class="file-info">
          <span class="file-name">${esc(meta.fileName)}</span>
          <span class="file-size">${fmtBytes(meta.fileSize)} · ${timeStr}</span>
          <div class="file-progress">
            <div class="file-progress-bar">
              <div class="file-progress-inner done" style="width:100%"></div>
            </div>
            <span class="file-pct">✓ مكتمل</span>
          </div>
          <div class="file-actions">
            <button class="file-action-btn download" onclick="event.stopPropagation(); downloadFileById('${fileId}')">⬇ تحميل</button>
            <button class="file-action-btn delete" onclick="event.stopPropagation(); deleteFile('${fileId}')">🗑 حذف</button>
          </div>
        </div>
      </div>
    `;
    
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

function updateFileMessageBox(meta, pct, fromId, done = false, errorMsg = null) {
    const list = document.getElementById('msg-list');
    if (!list) return;
    
    const fileId = meta.fileId;
    let el = document.getElementById(`file-msg-${fileId}`);
    
    const pi = peers.get(fromId);
    const senderName = pi?.name || 'مجهول';
    
    if (!el) {
        // Create initial box with progress
        el = document.createElement('div');
        el.className = 'msg received';
        el.id = `file-msg-${fileId}`;
        
        const isImage = meta.fileType?.startsWith('image/');
        const isVideo = meta.fileType?.startsWith('video/');
        let iconHtml = '';
        if (isImage) {
            iconHtml = `<div class="file-icon">🖼️</div>`;
        } else if (isVideo) {
            iconHtml = `<div class="file-icon">🎬</div>`;
        } else {
            iconHtml = `<div class="file-icon">📄</div>`;
        }
        
        const cls = done ? (errorMsg ? 'error' : 'done') : '';
        const statusText = errorMsg || (done ? 'اكتمل ✓' : 'جاري الاستلام...');
        
        el.innerHTML = `
          <span class="msg-sender">${esc(senderName)}</span>
          <div class="file-msg-box">
            <div class="file-preview">
              ${iconHtml}
            </div>
            <div class="file-info">
              <span class="file-name">${esc(meta.fileName)}</span>
              <span class="file-size">${fmtBytes(meta.fileSize)}</span>
              <div class="file-progress">
                <div class="file-progress-bar">
                  <div class="file-progress-inner ${cls}" style="width:${pct}%"></div>
                </div>
                <span class="file-pct">${pct}%</span>
              </div>
              <div class="tr-status ${cls}" style="font-size:0.75rem;color:#8899aa;">${esc(statusText)}</div>
            </div>
          </div>
        `;
        
        list.appendChild(el);
        list.scrollTop = list.scrollHeight;
    } else {
        // Update progress
        const progressInner = el.querySelector('.file-progress-inner');
        const pctEl = el.querySelector('.file-pct');
        if (progressInner) progressInner.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%`;
    }
}

function downloadFileById(fileId) {
    const file = downloadedFiles.get(fileId);
    if (file) {
        downloadBlob(file.blob, file.meta.fileName);
    } else {
        toast('الملف غير متوفر', 'error');
    }
}

function deleteFile(fileId) {
    const file = downloadedFiles.get(fileId);
    if (file) {
        URL.revokeObjectURL(file.url);
        downloadedFiles.delete(fileId);
    }
    const el = document.getElementById(`file-msg-${fileId}`);
    if (el) {
        el.remove();
    }
    sessionFiles = sessionFiles.filter(f => f.fileId !== fileId);
    toast('تم حذف الملف', 'success');
}

function openFullscreen(fileId) {
    const file = downloadedFiles.get(fileId);
    if (!file) return;
    
    const isImage = file.meta.fileType?.startsWith('image/');
    const isVideo = file.meta.fileType?.startsWith('video/');
    
    if (!isImage && !isVideo) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-viewer';
    
    let contentHtml = '';
    if (isImage) {
        contentHtml = `<img src="${file.url}" alt="${esc(file.meta.fileName)}">`;
    } else if (isVideo) {
        contentHtml = `<video src="${file.url}" controls autoplay></video>`;
    }
    
    overlay.innerHTML = `
      ${contentHtml}
      <button class="fullscreen-close">✕</button>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.querySelector('.fullscreen-close')?.addEventListener('click', () => {
        overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
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
    if (document.getElementById('msg-list') && document.getElementById('peers-panel')) { updatePeersUI(); return; }

    mainEl.innerHTML = `
    <div class="app-layout">
      <header class="app-header">
        <div class="header-left">
          <span class="app-title">AetherLink</span>
          <span class="header-sub">نقل الملفات الفوري والآمن</span>
        </div>
        <div class="header-right">
          <div class="header-actions">
            <button class="header-action-btn session-link" id="session-link-btn" title="رابط الجلسة">🔗 الجلسة</button>
            <button class="header-action-btn show-users" id="show-users-btn" title="المتصلين">👥 المتصلين</button>
            <button class="header-action-btn end-session" id="end-session-btn" title="إنهاء الجلسة">✕ إنهاء</button>
          </div>
          <div class="device-chip" id="name-chip">
            <span>📡</span>
            <span class="device-chip-name" id="chip-name">${esc(deviceName)}</span>
            <button class="icon-btn" id="edit-name-btn" title="تغيير الاسم">✏️</button>
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

      <!-- Messages — full height chat area with file support -->
      <div class="messages-section messages-full">
        <div class="messages-list" id="msg-list"></div>
        <div class="msg-bar">
          <input type="file" id="file-input" multiple style="display:none">
          <input type="text" class="msg-field" id="msg-field" placeholder="اكتب رسالة..." autocomplete="off">
          <button class="file-input-btn" id="file-btn" title="إرفاق ملف">📎</button>
          <button class="send-btn" id="send-btn">↑</button>
        </div>
      </div>
    </div>`;

    updatePeersUI();
    bindTransferEvents();
    bindMsgEvents();
    bindMinBtn();
    bindHeaderActions();
    restoreSessionMessages();

    // Drag & drop on the chat area
    const msgList = document.getElementById('msg-list');
    if (msgList) {
        ['dragenter','dragover','dragleave','drop'].forEach(ev =>
            msgList.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); })
        );
        msgList.addEventListener('dragenter', () => msgList.classList.add('drag-over-chat'));
        msgList.addEventListener('dragleave', () => msgList.classList.remove('drag-over-chat'));
        msgList.addEventListener('drop', (e) => {
            msgList.classList.remove('drag-over-chat');
            const isBcast = document.getElementById('broadcast-btn')?.dataset.broadcast === '1';
            queueFiles(e.dataTransfer.files, isBcast);
        });
    }
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
    const fi    = document.getElementById('file-input');
    const bcast = document.getElementById('broadcast-btn');

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
    const field   = document.getElementById('msg-field');
    const btn     = document.getElementById('send-btn');
    const fileBtn = document.getElementById('file-btn');
    const fi      = document.getElementById('file-input');

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

    fileBtn?.addEventListener('click', () => fi?.click());
}

// ─────────────────────────────────────────
//  Header Actions
// ─────────────────────────────────────────
function bindHeaderActions() {
    // Edit device name
    document.getElementById('edit-name-btn')?.addEventListener('click', () => {
        const chip = document.getElementById('chip-name');
        const input = document.createElement('input');
        input.className = 'name-edit-field';
        input.value = deviceName;
        input.style.cssText = 'background:rgba(255,255,255,0.06);border:1px solid rgba(0,210,255,0.4);border-radius:8px;color:#00d2ff;font-family:"Tajawal",sans-serif;font-size:0.78rem;font-weight:700;padding:3px 8px;outline:none;width:100px;';
        chip.replaceWith(input);
        input.focus();
        input.select();
        const commit = () => {
            const v = input.value.trim() || deviceName;
            deviceName = v; saveName(v);
            const newChip = document.createElement('span');
            newChip.className = 'device-chip-name';
            newChip.id = 'chip-name';
            newChip.textContent = v;
            input.replaceWith(newChip);
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    });

    // Show connected users
    document.getElementById('show-users-btn')?.addEventListener('click', showUsersModal);

    // Session link
    document.getElementById('session-link-btn')?.addEventListener('click', showSessionLinkModal);

    // End session
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
              </div>
            `).join('')}
        </div>
        <button class="users-modal-close">إغلاق</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.users-modal-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function showSessionLinkModal() {
    const sessionUrl = `${location.origin}${location.pathname}?id=${roomId}`;
    const overlay = document.createElement('div');
    overlay.className = 'users-modal-overlay';
    overlay.innerHTML = `
      <div class="users-modal session-modal">
        <h3>🔗 رابط الجلسة الجماعية</h3>
        <p class="session-modal-hint">شارك هذا الرابط ليتمكن أي شخص من الانضمام</p>
        <div class="session-url-box">
          <span class="session-url-text" id="session-url-text">${esc(sessionUrl)}</span>
        </div>
        <div class="session-modal-qr" id="session-modal-qr"></div>
        <div class="session-modal-actions">
          <button class="session-copy-btn" id="scopy-btn">📋 نسخ الرابط</button>
          <button class="session-wa-btn" id="swa-btn">💬 واتساب</button>
          <button class="session-share-btn" id="sshare-btn">↗ مشاركة</button>
        </div>
        <button class="users-modal-close" id="sclose-btn">إغلاق</button>
      </div>`;
    document.body.appendChild(overlay);

    // Generate QR
    try {
        const qr = qrcode(0, 'L');
        qr.addData(sessionUrl);
        qr.make();
        const qrEl = overlay.querySelector('#session-modal-qr');
        if (qrEl) {
            qrEl.innerHTML = qr.createImgTag(3, 6);
            const img = qrEl.querySelector('img');
            if (img) img.style.cssText = 'width:120px;height:120px;display:block;border-radius:10px;margin:0 auto;';
        }
    } catch(_) {}

    overlay.querySelector('#scopy-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(sessionUrl).then(() => {
            const b = overlay.querySelector('#scopy-btn');
            if (b) { b.textContent = '✅ تم النسخ!'; setTimeout(() => { b.textContent = '📋 نسخ الرابط'; }, 2000); }
        });
    });
    overlay.querySelector('#swa-btn')?.addEventListener('click', () => {
        open(`https://wa.me/?text=${encodeURIComponent('انضم لجلستي على AetherLink:\n' + sessionUrl)}`, '_blank');
    });
    overlay.querySelector('#sshare-btn')?.addEventListener('click', async () => {
        if (navigator.share) {
            try { await navigator.share({ title: 'AetherLink', url: sessionUrl }); return; } catch(_) {}
        }
        open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('AetherLink - نقل الملفات الآمن\n' + sessionUrl)}`, '_blank');
    });
    overlay.querySelector('#sclose-btn')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function endSession() {
    if (!confirm('هل أنت متأكد من إنهاء الجلسة؟ سيتم حذف جميع الرسائل والملفات.')) return;
    
    // Clear session data
    sessionMessages = [];
    sessionFiles = [];
    downloadedFiles.clear();
    recvMap.clear();
    sendQueue = [];
    currentSend = null;
    cancelFlag = true;
    
    // Disconnect all peers
    peers.forEach(({ peer }) => { try { peer.destroy(); } catch (_) {} });
    peers.clear();
    
    // Leave room
    socket.emit('leave-room');
    
    // Clear URL params and go to home
    roomId = '';
    history.replaceState({}, '', location.pathname);
    
    // Reinitialize as host
    roomId = mkId();
    history.replaceState({}, '', `?id=${roomId}`);
    renderHomeUI(`${location.origin}${location.pathname}?id=${roomId}`);
    socket.emit('join-room', { roomId, deviceName });
    
    toast('تم إنهاء الجلسة', 'success');
}

function restoreSessionMessages() {
    const list = document.getElementById('msg-list');
    if (!list || sessionMessages.length === 0) return;
    
    sessionMessages.forEach(({ text, sent, sender }) => {
        appendMsgToList(text, sent, sender, false);
    });
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

    // Create sender file box
    createSenderFileBox(file, meta);

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
            updateSenderFileBox(meta.fileId, pct);
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

    reader.onerror = () => { 
        updateTransferItem(meta, 0, 'فشل قراءة الملف', true, true); 
        updateSenderFileBox(meta.fileId, 0, true, 'فشل قراءة الملف');
        runQueue(); 
    };
    reader.readAsArrayBuffer(file.slice(0, CHUNK_SIZE));
}

// ─────────────────────────────────────────
//  Sender File Box UI
// ─────────────────────────────────────────
function createSenderFileBox(file, meta) {
    const list = document.getElementById('msg-list');
    if (!list) return;
    
    const isImage = file.type?.startsWith('image/');
    const isVideo = file.type?.startsWith('video/');
    
    const div = document.createElement('div');
    div.className = 'msg sent';
    div.id = `sender-file-${meta.fileId}`;
    
    let previewHtml = '';
    if (isImage) {
        const url = URL.createObjectURL(file);
        previewHtml = `<img src="${url}" alt="${esc(meta.fileName)}">`;
    } else if (isVideo) {
        const url = URL.createObjectURL(file);
        previewHtml = `<video src="${url}"></video>`;
    } else {
        previewHtml = `<div class="file-icon">📄</div>`;
    }
    
    const timeStr = new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
      <span class="msg-sender">أنت</span>
      <div class="file-msg-box" onclick="openSenderFullscreen('${meta.fileId}')">
        <div class="file-preview">
          ${previewHtml}
          <div class="file-preview-overlay"><span>🔍</span></div>
        </div>
        <div class="file-info">
          <span class="file-name">${esc(meta.fileName)}</span>
          <span class="file-size">${fmtBytes(meta.fileSize)} · ${timeStr}</span>
          <div class="file-progress">
            <div class="file-progress-bar">
              <div class="file-progress-inner" id="sender-progress-${meta.fileId}" style="width:0%"></div>
            </div>
            <span class="file-pct" id="sender-pct-${meta.fileId}">0%</span>
          </div>
          <div class="file-actions">
            <button class="file-action-btn delete" onclick="event.stopPropagation(); deleteSenderFile('${meta.fileId}')">🗑 حذف</button>
          </div>
        </div>
      </div>
    `;
    
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

function updateSenderFileBox(fileId, pct, done = false, errorMsg = null) {
    const progressEl = document.getElementById(`sender-progress-${fileId}`);
    const pctEl = document.getElementById(`sender-pct-${fileId}`);
    
    if (progressEl) {
        progressEl.style.width = `${pct}%`;
        if (done) {
            if (errorMsg) {
                progressEl.classList.add('error');
            } else {
                progressEl.classList.add('done');
            }
        }
    }
    if (pctEl) {
        if (errorMsg) { pctEl.textContent = errorMsg; pctEl.style.color = '#ff6b6b'; }
        else if (done && pct >= 100) { pctEl.textContent = '✓ تم الإرسال'; pctEl.style.color = '#43e97b'; }
        else { pctEl.textContent = `${pct}%`; }
    }
}

function deleteSenderFile(fileId) {
    const el = document.getElementById(`sender-file-${fileId}`);
    if (el) {
        el.remove();
    }
    toast('تم حذف الملف', 'success');
}

function openSenderFullscreen(fileId) {
    const el = document.getElementById(`sender-file-${fileId}`);
    if (!el) return;
    
    const img = el.querySelector('img');
    const video = el.querySelector('video');
    
    if (!img && !video) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-viewer';
    
    let contentHtml = '';
    if (img) {
        contentHtml = `<img src="${img.src}" alt="fullscreen">`;
    } else if (video) {
        contentHtml = `<video src="${video.src}" controls autoplay></video>`;
    }
    
    overlay.innerHTML = `
      ${contentHtml}
      <button class="fullscreen-close">✕</button>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.querySelector('.fullscreen-close')?.addEventListener('click', () => {
        overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// ─────────────────────────────────────────
//  Transfer item UI (newest first)
// ─────────────────────────────────────────
function updateTransferItem(meta, pct, statusText, done = false, err = false) {
    // Transfer items are now shown as file message boxes in the chat.
    // This function is kept for compatibility but does nothing visible.
    return;
}

// ─────────────────────────────────────────
//  Chat messages (newest at bottom)
// ─────────────────────────────────────────
function appendMsg(text, sent, senderName) {
    // Save to session
    sessionMessages.push({ text, sent, sender: senderName });
    appendMsgToList(text, sent, senderName, true);
}

function appendMsgToList(text, sent, senderName, scroll = true) {
    const list = document.getElementById('msg-list');
    if (!list) return;
    const div = document.createElement('div');
    div.className = `msg ${sent ? 'sent' : 'received'}`;
    div.innerHTML = `
      <span class="msg-sender">${esc(senderName)}</span>
      <span class="msg-bubble">${esc(text)}</span>
    `;
    list.appendChild(div); // append to bottom (newest at bottom)
    if (scroll) list.scrollTop = list.scrollHeight;
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