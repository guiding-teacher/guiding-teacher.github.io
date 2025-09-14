// AetherLink Web Logic - Fixed Version

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

const CHUNK_SIZE = 16 * 1024; // 16 KB لأفضل أداء

let peer = null;
let fileToSend = null;
let receivingFileMeta = null;
let receivingFileBuffer = [];
let receivedFileSize = 0;
let roomId = null;
let connectionTimeout = null;

// --- تهيئة التطبيق ---
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  roomId = urlParams.get('id');

  if (!roomId) {
    // إنشاء غرفة جديدة
    roomId = generateRoomId();
    const newUrl = `${window.location.origin}${window.location.pathname}?id=${roomId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
    renderInitialUI(newUrl);
  } else {
    // الانضمام إلى غرفة موجودة
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
    if (roomId) {
      socket.emit('join-room', roomId);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
    updateInstructions('خطأ في الاتصال بالخادم', true);
  });

  socket.on('waiting-for-peer', () => {
    console.log('⏳ Waiting for peer to join');
    updateInstructions('في انتظار انضمام الطرف الآخر...');
  });

  socket.on('room-full', () => {
    console.log('🚪 Room is full');
    updateInstructions('هذه الجلسة ممتلئة. لا يمكن الانضمام.', true);
  });

  socket.on('ready-to-connect', ({ initiator, peerId }) => {
    console.log('🎉 Ready to connect with peer:', peerId, 'Initiator:', initiator);
    updateInstructions('جاري إنشاء اتصال آمن...');
    clearConnectionTimeout();
    initializePeerConnection(initiator, peerId);
  });

  socket.on('receive-signal', (payload) => {
    console.log('📨 Received signal from:', payload.from);
    if (peer && !peer.destroyed) {
      peer.signal(payload.signal);
    }
  });

  socket.on('peer-disconnected', () => {
    console.log('👋 Peer disconnected');
    handleDisconnection('لقد قام الطرف الآخر بقطع الاتصال.');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      handleDisconnection('تم قطع الاتصال بالخادم.');
    }
  });
}

// --- إدارة اتصال WebRTC ---
function initializePeerConnection(isInitiator, peerId) {
  // تنظيف أي اتصال سابق
  if (peer) {
    peer.destroy();
    peer = null;
  }

  console.log('🔄 Initializing peer connection, initiator:', isInitiator);
  
  peer = new SimplePeer({
    initiator: isInitiator,
    trickle: false,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        {
          urls: 'turn:global.relay.metered.ca:80',
          username: 'aetherlink',
          credential: 'aetherlink123'
        },
        {
          urls: 'turn:global.relay.metered.ca:443',
          username: 'aetherlink',
          credential: 'aetherlink123'
        },
        {
          urls: 'turn:global.relay.metered.ca:80?transport=tcp',
          username: 'aetherlink',
          credential: 'aetherlink123'
        }
      ]
    }
  });

  // معالجة أحداث Peer
  peer.on('error', handlePeerError);
  peer.on('connect', handlePeerConnect);
  peer.on('close', handlePeerClose);
  peer.on('signal', handlePeerSignal);
  peer.on('data', handlePeerData);

  // ضبط مهلة للاتصال
  setConnectionTimeout();
}

function handlePeerError(err) {
  console.error('❌ Peer error:', err);
  if (err.code === 'ERR_WEBRTC_SUPPORT') {
    handleDisconnection('متصفحك لا يدعم WebRTC. يرجى استخدام متصفح حديث.');
  } else {
    handleDisconnection('حدث خطأ في الاتصال: ' + err.message);
  }
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

function handlePeerSignal(data) {
  console.log('📤 Sending signal to peer');
  socket.emit('send-signal', {
    to: roomId, // إرسال إلى الغرفة بدلاً من peerId محدد
    signal: data
  });
}

function handlePeerData(data) {
  try {
    // محاولة تحليل البيانات كـ JSON (ميتاداتا الملف)
    const metadata = JSON.parse(data.toString());
    if (metadata.fileName && metadata.fileSize) {
      receivingFileMeta = metadata;
      receivingFileBuffer = [];
      receivedFileSize = 0;
      updateTransferStatus(metadata.fileName, 0, 'جاري الاستلام...');
      return;
    }
  } catch (e) {
    // البيانات هي جزء من الملف
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
  receivingFileMeta = null;
  receivingFileBuffer = [];
  receivedFileSize = 0;
}

// --- إدارة المهلات ---
function setConnectionTimeout() {
  clearConnectionTimeout();
  connectionTimeout = setTimeout(() => {
    handleDisconnection('انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.');
  }, 30000); // 30 ثانية
}

function clearConnectionTimeout() {
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }
}

// --- واجهة المستخدم ---
function renderInitialUI(joinUrl) {
  mainContainer.innerHTML = `
    <header class="app-header">
      <h1>AetherLink</h1>
      <p>نقل الملفات الفوري والآمن</p>
    </header>
    <section id="start-screen">
      <div class="qr-code-placeholder"></div>
      <p class="instructions">امسح الرمز أو شارك الرابط لبدء الاتصال</p>
      <button class="action-button">نسخ الرابط</button>
    </section>
  `;
  
  generateQRCode(joinUrl);
  
  const copyButton = mainContainer.querySelector('.action-button');
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(joinUrl).then(() => {
      updateInstructions('تم نسخ الرابط بنجاح!');
      copyButton.textContent = 'تم النسخ!';
      setTimeout(() => {
        copyButton.textContent = 'نسخ الرابط';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      updateInstructions('فشل في نسخ الرابط', true);
    });
  });
}

function renderJoinerUI() {
  mainContainer.innerHTML = `
    <header class="app-header">
      <h1>AetherLink</h1>
      <p>نقل الملفات الفوري والآمن</p>
    </header>
    <section id="start-screen">
      <div class="loader"></div>
      <p class="instructions">جاري الانضمام للجلسة...</p>
      <p class="sub-instructions">قد يستغرق الاتصال بضع ثوانٍ</p>
    </section>
  `;
}

function renderFileTransferUI() {
  mainContainer.innerHTML = `
    <header class="app-header">
      <h1>AetherLink</h1>
      <p class="connection-status success">متصل وجاهز للنقل</p>
    </header>
    <div id="transfer-container">
      <div id="drop-zone">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p>أسقط ملف هنا أو انقر للاختيار</p>
        <input type="file" id="file-input">
      </div>
      <div id="transfer-status"></div>
      <button class="action-button secondary" id="reset-button" style="display: none;">إرسال ملف آخر</button>
    </div>
  `;

  setupFileTransferEvents();
}

function setupFileTransferEvents() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const resetButton = document.getElementById('reset-button');

  dropZone.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      fileToSend = e.target.files[0];
      sendFile();
    }
  });

  // منع السلوك الافتراضي لأحداث السحب والإفلات
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  dropZone.addEventListener('dragenter', () => {
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      fileToSend = e.dataTransfer.files[0];
      sendFile();
    }
  });

  resetButton.addEventListener('click', resetFileTransfer);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function resetFileTransfer() {
  document.getElementById('transfer-status').innerHTML = '';
  document.getElementById('file-input').value = '';
  document.getElementById('reset-button').style.display = 'none';
  document.getElementById('drop-zone').style.display = 'flex';
  fileToSend = null;
}

function updateInstructions(message, isError = false) {
  const instructions = mainContainer.querySelector('.instructions');
  if (instructions) {
    instructions.textContent = message;
    instructions.style.color = isError ? '#ff6b6b' : '#c0c0c0';
  }
}

// --- نقل الملفات ---
function sendFile() {
  if (!fileToSend) return;
  
  if (!peer || !peer.connected) {
    alert('الاتصال غير جاهز. يرجى الانتظار حتى اكتمال الاتصال.');
    return;
  }

  document.getElementById('drop-zone').style.display = 'none';
  document.getElementById('reset-button').style.display = 'none';

  // إرسال ميتاداتا الملف أولاً
  const metadata = {
    fileName: fileToSend.name,
    fileSize: fileToSend.size,
    fileType: fileToSend.type
  };
  
  peer.send(JSON.stringify(metadata));

  const fileReader = new FileReader();
  let offset = 0;
  
  const statusText = `جاري إرسال ${formatBytes(fileToSend.size)}...`;
  updateTransferStatus(fileToSend.name, 0, statusText);

  fileReader.onload = function(e) {
    if (!e.target.result) return;
    
    try {
      peer.send(e.target.result);
      offset += e.target.result.byteLength;
      
      const progress = Math.round((offset / fileToSend.size) * 100);
      updateTransferStatus(fileToSend.name, progress, statusText);

      if (offset < fileToSend.size) {
        readNextChunk(offset);
      } else {
        updateTransferStatus(fileToSend.name, 100, 'تم الإرسال بنجاح!', true);
        document.getElementById('reset-button').style.display = 'inline-block';
      }
    } catch (error) {
      console.error('Error sending chunk:', error);
      updateTransferStatus(fileToSend.name, 0, 'فشل في الإرسال', true, true);
    }
  };

  fileReader.onerror = function(error) {
    console.error('File reader error:', error);
    updateTransferStatus(fileToSend.name, 0, 'فشل في قراءة الملف', true, true);
  };

  function readNextChunk(start) {
    const chunk = fileToSend.slice(start, start + CHUNK_SIZE);
    fileReader.readAsArrayBuffer(chunk);
  }

  readNextChunk(0);
}

function updateTransferStatus(fileName, progress, statusText, isComplete = false, isError = false) {
  const transferStatusDiv = document.getElementById('transfer-status');
  if (!transferStatusDiv) return;

  let fileProgressDiv = document.getElementById('file-progress');
  if (!fileProgressDiv) {
    fileProgressDiv = document.createElement('div');
    fileProgressDiv.className = 'file-progress';
    fileProgressDiv.id = 'file-progress';
    transferStatusDiv.appendChild(fileProgressDiv);
  }
  
  const statusClass = isComplete ? (isError ? 'error' : 'success') : '';

  fileProgressDiv.innerHTML = `
    <div class="file-info">
      <span class="file-name">${fileName}</span>
      <span class="percentage">${progress}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-bar-inner ${statusClass}" style="width: ${progress}%"></div>
    </div>
    <div class="status-text ${statusClass}">${statusText}</div>
  `;

  if (isComplete && !isError) {
    document.getElementById('reset-button').style.display = 'inline-block';
  }
}

function downloadFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  
  // تنظيف الذاكرة
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
