// AetherLink Web Logic - Advanced Version

console.log("AetherLink Web is running!");

// --- المتغيرات العامة ---
const mainContainer = document.querySelector('.glass-container');
const SIGNALING_SERVER_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://aetherlink-server.onrender.com';

const socket = io(SIGNALING_SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000
});

// *** تعديل 1: زيادة حجم القطعة لتسريع النقل بشكل كبير ***
const CHUNK_SIZE = 256 * 1024; // 256 KB لأقصى أداء ممكن

let peer = null;
let roomId = null;
let connectionTimeout = null;

// *** تعديل 4: إدارة قائمة انتظار الملفات المتعددة ***
let filesToSendQueue = [];
let currentFileBeingSent = null;
let isTransferCancelled = false;

let receivingFileMeta = null;
let receivingFileBuffer = [];
let receivedFileSize = 0;

// --- تهيئة التطبيق ---
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  roomId = urlParams.get('id');

  if (!roomId) {
    roomId = generateRoomId();
    const newUrl = `${window.location.origin}${window.location.pathname}?id=${roomId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
    renderInitialUI(newUrl);
  } else {
    renderJoinerUI();
  }
  setupSocketListeners();
}

function generateRoomId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// --- إعداد مستمعي Socket.io ---
function setupSocketListeners() {
  socket.on('connect', () => {
    console.log('✅ Connected to signaling server:', socket.id);
    if (roomId) socket.emit('join-room', roomId);
  });
  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
    updateInstructions('خطأ في الاتصال بالخادم', true);
  });
  socket.on('waiting-for-peer', () => updateInstructions('في انتظار انضمام الطرف الآخر...'));
  socket.on('room-full', () => updateInstructions('هذه الجلسة ممتلئة. لا يمكن الانضمام.', true));
  socket.on('ready-to-connect', ({ initiator }) => {
    updateInstructions('جاري إنشاء اتصال آمن...');
    clearConnectionTimeout();
    initializePeerConnection(initiator);
  });
  socket.on('receive-signal', (payload) => peer?.signal(payload.signal));
  socket.on('peer-disconnected', () => handleDisconnection('لقد قام الطرف الآخر بقطع الاتصال.'));
  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') handleDisconnection('تم قطع الاتصال بالخادم.');
  });
}

// --- إدارة اتصال WebRTC ---
function initializePeerConnection(isInitiator) {
  peer?.destroy();
  peer = new SimplePeer({
    initiator: isInitiator,
    trickle: false,
    config: { iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }
    ]}
  });
  peer.on('error', handlePeerError);
  peer.on('connect', handlePeerConnect);
  peer.on('close', () => handleDisconnection('تم إغلاق الاتصال.'));
  peer.on('signal', (data) => socket.emit('send-signal', { to: roomId, signal: data }));
  peer.on('data', handlePeerData);
  setConnectionTimeout();
}

function handlePeerError(err) {
  console.error('❌ Peer error:', err);
  handleDisconnection(`حدث خطأ في الاتصال: ${err.message}`);
}

function handlePeerConnect() {
  console.log('✅ PEER CONNECTION ESTABLISHED!');
  clearConnectionTimeout();
  renderFileTransferUI();
}

function handlePeerData(data) {
  try {
    const message = JSON.parse(data.toString());
    // *** تعديل 3 و 4: معالجة الرسائل المختلفة (ملف جديد، إلغاء، خطأ) ***
    switch(message.type) {
        case 'metadata':
            receivingFileMeta = message.payload;
            receivingFileBuffer = [];
            receivedFileSize = 0;
            updateTransferStatus(receivingFileMeta, 0, 'جاري الاستلام...');
            break;
        case 'cancel':
            handleTransferCancellation(message.payload, 'تم إلغاء النقل من قبل المرسل');
            break;
        case 'error':
            handleTransferCancellation(message.payload, 'فشل الإرسال من المصدر');
            break;
        default:
             // بيانات الملف العادية
            processFileChunk(data);
    }
  } catch (e) {
    // إذا فشل التحليل، فهي قطعة من الملف
    processFileChunk(data);
  }
}

function processFileChunk(chunk) {
    if (!receivingFileMeta) return;
    receivingFileBuffer.push(chunk);
    receivedFileSize += chunk.length;
    const progress = Math.round((receivedFileSize / receivingFileMeta.fileSize) * 100);
    updateTransferStatus(receivingFileMeta, progress, 'جاري الاستلام...');
    if (receivedFileSize >= receivingFileMeta.fileSize) {
      completeFileTransfer();
    }
}

function completeFileTransfer() {
  const fileBlob = new Blob(receivingFileBuffer);
  downloadFile(fileBlob, receivingFileMeta.fileName);
  updateTransferStatus(receivingFileMeta, 100, 'اكتمل الاستلام بنجاح!', true);
  receivingFileMeta = null;
}

function handleTransferCancellation(fileMeta, reason) {
    if (receivingFileMeta && receivingFileMeta.fileId === fileMeta.fileId) {
        receivingFileMeta = null;
        receivingFileBuffer = [];
        receivedFileSize = 0;
    }
    updateTransferStatus(fileMeta, 0, reason, true, true);
}


// --- المهلات وواجهة المستخدم (UI) ---
function setConnectionTimeout() {
  clearConnectionTimeout();
  connectionTimeout = setTimeout(() => handleDisconnection('انتهت مهلة الاتصال.'), 30000);
}

function clearConnectionTimeout() {
  if (connectionTimeout) clearTimeout(connectionTimeout);
  connectionTimeout = null;
}

function renderInitialUI(joinUrl) {
  mainContainer.innerHTML = `
    <header class="app-header"><h1>AetherLink</h1><p>نقل الملفات الفوري والآمن</p></header>
    <section id="start-screen">
      <div class="qr-code-placeholder"></div>
      <p class="instructions">امسح الرمز أو شارك الرابط لبدء الاتصال</p>
      <button class="action-button">نسخ الرابط</button>
    </section>`;
  generateQRCode(joinUrl);
  mainContainer.querySelector('.action-button').addEventListener('click', () => copyUrl(joinUrl));
}

function renderJoinerUI() {
  mainContainer.innerHTML = `
    <header class="app-header"><h1>AetherLink</h1><p>نقل الملفات الفوري والآمن</p></header>
    <section id="start-screen">
      <div class="loader"></div>
      <p class="instructions">جاري الانضمام للجلسة...</p>
    </section>`;
}

function renderFileTransferUI() {
  mainContainer.innerHTML = `
    <header class="app-header"><h1>AetherLink</h1><p class="connection-status success">متصل وجاهز للنقل</p></header>
    <div id="transfer-container">
      <div id="drop-zone">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        <p>أسقط ملفات هنا أو انقر للاختيار</p>
        <!-- *** تعديل 4: إضافة "multiple" للسماح بملفات متعددة *** -->
        <input type="file" id="file-input" multiple>
      </div>
      <div id="transfer-list"></div> <!-- حاوية لقائمة الملفات المنقولة -->
      <button class="action-button secondary" id="reset-button" style="display: none;">إرسال ملفات أخرى</button>
    </div>`;
  setupFileTransferEvents();
}

function setupFileTransferEvents() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', () => fileInput.click());
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, preventDefaults, false));
  dropZone.addEventListener('dragenter', () => dropZone.classList.add('drag-over'));
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
  dropZone.addEventListener('drop', (e) => {
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
  
  document.getElementById('reset-button').addEventListener('click', resetFileTransfer);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function resetFileTransfer() {
    document.getElementById('transfer-list').innerHTML = '';
    document.getElementById('file-input').value = '';
    document.getElementById('reset-button').style.display = 'none';
    document.getElementById('drop-zone').style.display = 'flex';
    filesToSendQueue = [];
    currentFileBeingSent = null;
}

// --- منطق نقل الملفات المحسّن ---

function handleFiles(files) {
    if (files.length === 0) return;
    for (const file of files) {
        filesToSendQueue.push(file);
    }
    document.getElementById('drop-zone').style.display = 'none';
    if (!currentFileBeingSent) {
        processFileQueue();
    }
}

function processFileQueue() {
    if (filesToSendQueue.length === 0) {
        console.log('✅ All files sent.');
        currentFileBeingSent = null;
        document.getElementById('reset-button').style.display = 'inline-block';
        return;
    }
    currentFileBeingSent = filesToSendQueue.shift();
    sendFile(currentFileBeingSent);
}

function sendFile(file) {
  if (!file || !peer || !peer.connected) {
    alert('الاتصال غير جاهز.');
    processFileQueue(); // محاولة إرسال الملف التالي
    return;
  }
  isTransferCancelled = false;
  
  const metadata = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileId: `${file.name}-${file.size}-${file.lastModified}` // معرف فريد للملف
  };
  currentFileBeingSent.meta = metadata; // تخزين الميتاداتا
  
  peer.send(JSON.stringify({ type: 'metadata', payload: metadata }));

  const fileReader = new FileReader();
  let offset = 0;
  updateTransferStatus(metadata, 0, `جاري إرسال ${formatBytes(file.size)}...`);

  fileReader.onload = (e) => {
    if (isTransferCancelled) return;
    if (e.target.result) {
        try {
            peer.send(e.target.result);
            offset += e.target.result.byteLength;
            const progress = Math.round((offset / file.size) * 100);
            updateTransferStatus(metadata, progress, `جاري إرسال ${formatBytes(file.size)}...`);
            if (offset < file.size) {
                readNextChunk(offset);
            } else {
                updateTransferStatus(metadata, 100, 'تم الإرسال بنجاح!', true);
                processFileQueue(); // إرسال الملف التالي في القائمة
            }
        } catch (error) {
            handleSendError(metadata, 'فشل في الإرسال');
        }
    }
  };

  fileReader.onerror = () => handleSendError(metadata, 'فشل في قراءة الملف');
  
  const readNextChunk = (start) => {
      const chunk = file.slice(start, start + CHUNK_SIZE);
      fileReader.readAsArrayBuffer(chunk);
  }

  readNextChunk(0);
}

function handleSendError(metadata, reason) {
    console.error(reason, metadata.fileName);
    updateTransferStatus(metadata, 0, reason, true, true);
    // *** تعديل 3: إبلاغ الطرف الآخر بالخطأ ***
    peer.send(JSON.stringify({ type: 'error', payload: metadata }));
    processFileQueue(); // محاولة إرسال الملف التالي
}


function updateTransferStatus(fileMeta, progress, statusText, isComplete = false, isError = false) {
  const transferListDiv = document.getElementById('transfer-list');
  if (!transferListDiv) return;

  const fileProgressId = `progress-${fileMeta.fileId}`;
  let fileProgressDiv = document.getElementById(fileProgressId);
  
  if (!fileProgressDiv) {
    fileProgressDiv = document.createElement('div');
    fileProgressDiv.className = 'file-progress';
    fileProgressDiv.id = fileProgressId;
    transferListDiv.appendChild(fileProgressDiv);
  }
  
  const statusClass = isComplete ? (isError ? 'error' : 'success') : '';
  const isSending = statusText.includes('إرسال');
  const showCancelButton = !isComplete && isSending;

  fileProgressDiv.innerHTML = `
    <div class="file-info">
      <span class="file-name">${fileMeta.fileName}</span>
      <span class="percentage">${progress}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-bar-inner ${statusClass}" style="width: ${progress}%"></div>
    </div>
    <div class="status-text ${statusClass}">${statusText}</div>
    ${showCancelButton ? `<button class="action-button cancel" id="cancel-${fileMeta.fileId}">إلغاء</button>` : ''}
  `;

  if (showCancelButton) {
      document.getElementById(`cancel-${fileMeta.fileId}`).addEventListener('click', () => {
          isTransferCancelled = true;
          peer.send(JSON.stringify({ type: 'cancel', payload: fileMeta }));
          updateTransferStatus(fileMeta, progress, 'تم الإلغاء', true, true);
          processFileQueue(); // الانتقال للملف التالي
      });
  }
}

// --- الأدوات المساعدة ---
function downloadFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

function handleDisconnection(message) {
  console.log('🔌 Handling disconnection:', message);
  clearConnectionTimeout();
  peer?.destroy();
  peer = null;
  const statusElement = document.querySelector('.connection-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.classList.replace('success', 'error');
    document.getElementById('transfer-container').style.pointerEvents = 'none';
  } else {
    renderJoinerUI();
    updateInstructions(message, true);
  }
}

function updateInstructions(message, isError = false) {
    const el = mainContainer.querySelector('.instructions');
    if(el) { el.textContent = message; el.style.color = isError ? '#ff6b6b' : '#c0c0c0'; }
}

function generateQRCode(url) {
  const qr = qrcode(0, 'L');
  qr.addData(url);
  qr.make();
  mainContainer.querySelector('.qr-code-placeholder').innerHTML = qr.createImgTag(5, 10);
  mainContainer.querySelector('img').style.cssText = "width: 100%; height: 100%; border-radius: 10px;";
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals < 0 ? 0 : decimals))} ${sizes[i]}`;
}

function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        const btn = mainContainer.querySelector('.action-button');
        btn.textContent = 'تم النسخ!';
        setTimeout(() => { btn.textContent = 'نسخ الرابط'; }, 2000);
    });
}