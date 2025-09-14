// AetherLink Web Logic - Multi-file & Robust Version

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

const CHUNK_SIZE = 64 * 1024; // 64 KB لأداء سريع

let peer = null;
let roomId = null;
let connectionTimeout = null;

// *** تعديل 4: متغيرات جديدة لدعم الملفات المتعددة ***
let fileQueue = [];
let currentFileIndex = 0;
let isTransferCancelled = false;
let currentFileReader = null; // لتتبع قارئ الملفات الحالي وإلغائه

// متغيرات الاستلام
let receivingFileMeta = null;
let receivingFileBuffer = [];
let receivedFileSize = 0;
let receivingBatchInfo = null;
let receivedFileCount = 0;


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
  socket.on('receive-signal', (payload) => peer && !peer.destroyed && peer.signal(payload.signal));
  socket.on('peer-disconnected', () => handleDisconnection('لقد قام الطرف الآخر بقطع الاتصال.'));
  socket.on('disconnect', (reason) => reason === 'io server disconnect' && handleDisconnection('تم قطع الاتصال بالخادم.'));
}

// --- إدارة اتصال WebRTC ---
function initializePeerConnection(isInitiator) {
  if (peer) peer.destroy();
  peer = new SimplePeer({
    initiator: isInitiator,
    trickle: false,
    config: { iceServers: [ { urls: 'stun:stun.l.google.com:19302' } ] }
  });
  peer.on('error', handlePeerError);
  peer.on('connect', handlePeerConnect);
  peer.on('close', handlePeerClose);
  peer.on('signal', (data) => socket.emit('send-signal', { to: roomId, signal: data }));
  peer.on('data', handlePeerData);
  setConnectionTimeout();
}

function handlePeerError(err) {
  console.error('❌ Peer error:', err);
  const message = err.code === 'ERR_WEBRTC_SUPPORT' ? 'متصفحك لا يدعم WebRTC.' : `حدث خطأ في الاتصال: ${err.message}`;
  handleDisconnection(message);
}

function handlePeerConnect() {
  console.log('✅ PEER CONNECTION ESTABLISHED!');
  clearConnectionTimeout();
  renderFileTransferUI();
}

function handlePeerClose() {
  console.log('🔒 Peer connection closed');
  handleDisconnection('تم إغلاق الاتصال.');
}

function handlePeerData(data) {
  try {
    const msg = JSON.parse(data.toString());
    // *** تعديل 3 & 4: معالجة الرسائل الجديدة (خطأ، إلغاء، دفعة ملفات) ***
    if (msg.type === 'batch_start') {
        receivingBatchInfo = msg.files;
        receivedFileCount = 0;
        updateTransferStatus(null, 0, `استلام دفعة من ${receivingBatchInfo.length} ملفات...`);
        return;
    }
    if (msg.type === 'file_meta') {
      receivingFileMeta = msg;
      receivingFileBuffer = [];
      receivedFileSize = 0;
      receivedFileCount++;
      updateTransferStatus(msg.fileName, 0, 'جاري الاستلام...');
      return;
    }
    if (msg.type === 'cancel') {
        handleTransferCancellation(true);
        return;
    }
    if (msg.type === 'transfer_error') {
        handleTransferFailure(msg.fileName);
        return;
    }
  } catch (e) {
    if (!receivingFileMeta) return;
    receivingFileBuffer.push(data);
    receivedFileSize += data.length;
    const progress = Math.round((receivedFileSize / receivingFileMeta.fileSize) * 100);
    updateTransferStatus(receivingFileMeta.fileName, progress, 'جاري الاستلام...');
    if (receivedFileSize >= receivingFileMeta.fileSize) {
      completeFileTransfer();
    }
  }
}

function completeFileTransfer() {
  const fileBlob = new Blob(receivingFileBuffer);
  downloadFile(fileBlob, receivingFileMeta.fileName);
  updateTransferStatus(receivingFileMeta.fileName, 100, 'اكتمل الاستلام بنجاح!', true);
  
  // التحقق إذا كان هناك ملفات أخرى في الدفعة
  if (receivingBatchInfo && receivedFileCount < receivingBatchInfo.length) {
     // انتظر الملف التالي
  } else {
    receivingBatchInfo = null; // انتهت الدفعة
    document.getElementById('reset-button').style.display = 'inline-block';
  }

  receivingFileMeta = null;
  receivingFileBuffer = [];
  receivedFileSize = 0;
}

// --- إدارة المهلات ---
function setConnectionTimeout() {
  clearConnectionTimeout();
  connectionTimeout = setTimeout(() => handleDisconnection('انتهت مهلة الاتصال.'), 30000);
}
function clearConnectionTimeout() {
  if (connectionTimeout) clearTimeout(connectionTimeout);
  connectionTimeout = null;
}

// --- واجهة المستخدم (تعديلات طفيفة) ---
function renderInitialUI(joinUrl) { /* ... no changes ... */ }
function renderJoinerUI() { /* ... no changes ... */ }
// الكود الأصلي لواجهات المستخدم الأولية موجود في إجابتك السابقة وهو صحيح.

function renderFileTransferUI() {
  mainContainer.innerHTML = `
    <header class="app-header">
      <h1>AetherLink</h1>
      <p class="connection-status success">متصل وجاهز للنقل</p>
    </header>
    <div id="transfer-container">
      <div id="drop-zone">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p>أسقط ملفات هنا أو انقر للاختيار</p>
        <input type="file" id="file-input" multiple> <!-- *** تعديل 4: إضافة multiple *** -->
      </div>
      <div id="transfer-status"></div>
      <button class="action-button secondary" id="reset-button" style="display: none;">إرسال ملفات أخرى</button>
    </div>`;
  setupFileTransferEvents();
}

function setupFileTransferEvents() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  
  const handleFiles = (files) => {
    if (files.length > 0) {
      startBatchTransfer(Array.from(files));
    }
  };
  
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
  });
  ['dragenter', 'dragover'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over')));
  ['dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over')));
  dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
  document.getElementById('reset-button').addEventListener('click', resetFileTransfer);
}

function resetFileTransfer() {
  document.getElementById('transfer-status').innerHTML = '';
  document.getElementById('file-input').value = '';
  document.getElementById('reset-button').style.display = 'none';
  document.getElementById('drop-zone').style.display = 'flex';
  fileQueue = [];
  currentFileIndex = 0;
  isTransferCancelled = false;
  if (currentFileReader) {
    currentFileReader.abort();
    currentFileReader = null;
  }
}

// --- نقل الملفات (إعادة هيكلة كاملة) ---
function startBatchTransfer(files) {
    if (!peer || !peer.connected) {
        alert('الاتصال غير جاهز.');
        return;
    }
    fileQueue = files;
    currentFileIndex = 0;
    isTransferCancelled = false;
    document.getElementById('drop-zone').style.display = 'none';
    document.getElementById('reset-button').style.display = 'none';
    
    // إعلام الطرف الآخر ببدء دفعة جديدة
    const batchMeta = {
        type: 'batch_start',
        files: fileQueue.map(f => ({ name: f.name, size: f.size }))
    };
    peer.send(JSON.stringify(batchMeta));
    
    sendFileFromQueue();
}

function sendFileFromQueue() {
  if (currentFileIndex >= fileQueue.length || isTransferCancelled) {
    if (!isTransferCancelled) {
        console.log('Batch transfer complete.');
        // يمكن إضافة رسالة اكتمال الدفعة هنا
    }
    document.getElementById('reset-button').style.display = 'inline-block';
    return;
  }

  const file = fileQueue[currentFileIndex];
  const metadata = {
    type: 'file_meta',
    fileName: file.name,
    fileSize: file.size
  };
  peer.send(JSON.stringify(metadata));

  currentFileReader = new FileReader();
  let offset = 0;
  
  updateTransferStatus(file.name, 0, `جاري الإرسال...`);

  currentFileReader.onload = (e) => {
    if (isTransferCancelled || !e.target.result) return;
    try {
      peer.send(e.target.result);
      offset += e.target.result.byteLength;
      const progress = Math.round((offset / file.size) * 100);
      updateTransferStatus(file.name, progress, `جاري الإرسال...`);
      if (offset < file.size) {
        readNextChunk(offset);
      } else {
        updateTransferStatus(file.name, 100, 'تم الإرسال بنجاح!', true, false);
        currentFileIndex++;
        setTimeout(sendFileFromQueue, 500); // إعطاء فرصة للواجهة للتحديث قبل بدء التالي
      }
    } catch (error) {
      handleSendError(error, file.name);
    }
  };

  currentFileReader.onerror = (error) => handleSendError(error, file.name);

  function readNextChunk(start) {
    if (isTransferCancelled) return;
    const chunk = file.slice(start, start + CHUNK_SIZE);
    currentFileReader.readAsArrayBuffer(chunk);
  }

  readNextChunk(0);
}

function handleSendError(error, fileName) {
    console.error('File send error:', error);
    updateTransferStatus(fileName, 0, 'فشل في الإرسال', true, true);
    // *** تعديل 3: إبلاغ الطرف الآخر بالفشل ***
    peer.send(JSON.stringify({ type: 'transfer_error', fileName: fileName }));
    // إيقاف الدفعة
    isTransferCancelled = true;
    document.getElementById('reset-button').style.display = 'inline-block';
}


function handleTransferCancellation(isRemote = false) {
    const file = isRemote ? receivingFileMeta : fileQueue[currentFileIndex];
    if (!file) return;

    if (!isRemote) { // المرسل ألغى
        isTransferCancelled = true;
        if(currentFileReader) currentFileReader.abort();
        peer.send(JSON.stringify({ type: 'cancel' }));
        updateTransferStatus(file.name, 0, 'تم الإلغاء', true, true);
    } else { // المستلم تلقى رسالة إلغاء
        updateTransferStatus(file.fileName, 0, 'تم إلغاء النقل', true, true);
        receivingFileMeta = null;
        receivingFileBuffer = [];
        receivedFileSize = 0;
        receivingBatchInfo = null;
    }
    document.getElementById('reset-button').style.display = 'inline-block';
}


function handleTransferFailure(fileName) {
    updateTransferStatus(fileName, 0, 'فشل النقل (خطأ من المرسل)', true, true);
    receivingFileMeta = null;
    receivingFileBuffer = [];
    receivedFileSize = 0;
    receivingBatchInfo = null;
    document.getElementById('reset-button').style.display = 'inline-block';
}

function updateTransferStatus(fileName, progress, statusText, isComplete = false, isError = false) {
    const transferStatusDiv = document.getElementById('transfer-status');
    if (!transferStatusDiv) return;

    let batchInfoHtml = '';
    const batchInfo = fileQueue.length > 0 ? fileQueue : receivingBatchInfo;
    const count = fileQueue.length > 0 ? currentFileIndex + 1 : receivedFileCount;

    if (batchInfo && batchInfo.length > 1) {
        batchInfoHtml = `<div class="batch-info">الملف ${count} من ${batchInfo.length}</div>`;
    }

    const statusClass = isComplete ? (isError ? 'error' : 'success') : '';
    const showCancelButton = !isComplete && !isError;

    transferStatusDiv.innerHTML = `
        ${fileName ? `
        ${batchInfoHtml}
        <div class="file-progress" id="file-progress">
            <div class="file-info">
                <span class="file-name">${fileName}</span>
                <span class="percentage">${progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-inner ${statusClass}" style="width: ${progress}%"></div>
            </div>
            <div class="status-text ${statusClass}">${statusText}</div>
        </div>
        ` : `<div class="status-text">${statusText}</div>`}
        ${showCancelButton ? `<button class="action-button cancel" id="cancel-button">إلغاء</button>` : ''}
    `;

    if (showCancelButton) {
        document.getElementById('cancel-button').addEventListener('click', () => handleTransferCancellation(false));
    }
}


// الكود الأصلي لهذه الدوال موجود في إجابتك السابقة وهو صحيح.

function downloadFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

function handleDisconnection(message) {
  console.log('🔌 Handling disconnection:', message);
  
  clearConnectionTimeout();
  
  if (peer) {
    peer.destroy();
    peer = null;
  }
  
  const statusElement = document.querySelector('.connection-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.classList.remove('success');
    statusElement.classList.add('error');
    
    const transferContainer = document.getElementById('transfer-container');
    if (transferContainer) {
      transferContainer.style.opacity = '0.5';
      transferContainer.style.pointerEvents = 'none';
    }
  } else {
    renderJoinerUI();
    updateInstructions(message, true);
  }
}

// --- الأدوات المساعدة ---
function generateQRCode(url) {
  const qrPlaceholder = mainContainer.querySelector('.qr-code-placeholder');
  if (!qrPlaceholder) return;
  
  qrPlaceholder.innerHTML = '';
  const qr = qrcode(0, 'L');
  qr.addData(url);
  qr.make();
  qrPlaceholder.innerHTML = qr.createImgTag(5, 10);
  
  const qrImg = qrPlaceholder.querySelector('img');
  if (qrImg) {
    qrImg.style.cssText = "width: 100%; height: 100%; border-radius: 10px;";
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
