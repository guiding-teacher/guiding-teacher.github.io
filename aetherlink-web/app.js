// AetherLink Web Logic - Upgraded Version

console.log("AetherLink Web is running!");

// --- 1. إعداد العناصر والمتغيرات ---
const mainContainer = document.querySelector('.glass-container');
const SIGNALING_SERVER_URL = 'http://localhost:3000';
const socket = io(SIGNALING_SERVER_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
});
const CHUNK_SIZE = 64 * 1024; // 64 KB

let peer;
let fileToSend;
let receivingFileMeta;
let receivingFileBuffer = [];
let receivedFileSize = 0;
let roomId;

// --- 2. منطق بدء التشغيل ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomId = urlParams.get('id');

    if (!roomId) {
        roomId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newUrl = `${window.location.pathname}?id=${roomId}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
        renderInitialUI(window.location.href);
    } else {
        renderJoinerUI();
    }
});

// --- 3. إدارة الاتصال مع خادم الإشارة ---
socket.on('connect', () => {
    console.log('Connected to signaling server with ID:', socket.id);
    if (roomId) {
        socket.emit('join-room', roomId);
    }
});

socket.on('room-full', () => {
    updateInstructions('هذه الجلسة ممتلئة. لا يمكن الانضمام.', true);
});

socket.on('ready-to-connect', ({ initiator, peerId }) => {
    updateInstructions('جاري إنشاء اتصال آمن...');
    initializePeer(initiator, peerId);
});

socket.on('receive-signal', (payload) => peer?.signal(payload.signal));

// --- التحسين: الاستماع لحدث انقطاع اتصال الطرف الآخر ---
socket.on('peer-disconnected', () => {
    handleDisconnection('لقد قام الطرف الآخر بقطع الاتصال.');
});


// --- 4. وظيفة تهيئة WebRTC (SimplePeer) ---
function initializePeer(isInitiator, peerId) {
    if (peer) peer.destroy();
    
    peer = new SimplePeer({ 
        initiator: isInitiator, 
        trickle: false,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
            ]
        } 
    });

    peer.on('error', err => {
        console.error('Peer error:', err);
        handleDisconnection('حدث خطأ في الاتصال.');
    });

    peer.on('connect', () => {
        console.log('✅ PEER CONNECTED SUCCESSFULLY!');
        renderFileTransferUI();
    });
    
    peer.on('signal', data => socket.emit('send-signal', { to: peerId, signal: data }));
    
    // --- التحسين: معالجة انقطاع الاتصال مباشرة من Peer ---
    peer.on('close', () => {
        handleDisconnection('تم إغلاق الاتصال.');
    });
    
    peer.on('data', data => {
        try {
            // أول رسالة نتوقعها هي بيانات الملف (metadata)
            const metadata = JSON.parse(data.toString());
            if (metadata.fileName && metadata.fileSize) {
                receivingFileMeta = metadata;
                receivingFileBuffer = [];
                receivedFileSize = 0;
                updateTransferStatus(metadata.fileName, 0, 'جاري الاستلام...');
                return;
            }
        } catch (e) {
            // إذا فشل التحويل إلى JSON، فهذا يعني أنها قطعة من الملف
            if (!receivingFileMeta) return; // تجاهل البيانات إذا لم نستقبل بيانات الملف أولاً

            receivingFileBuffer.push(data);
            receivedFileSize += data.length;
            const progress = Math.round((receivedFileSize / receivingFileMeta.fileSize) * 100);
            updateTransferStatus(receivingFileMeta.fileName, progress, 'جاري الاستلام...');

            if (receivedFileSize === receivingFileMeta.fileSize) {
                const fileBlob = new Blob(receivingFileBuffer);
                downloadFile(fileBlob, receivingFileMeta.fileName);
                updateTransferStatus(receivingFileMeta.fileName, 100, 'اكتمل الاستلام بنجاح!', true);
                receivingFileMeta = null;
            }
        }
    });
}

// --- 5. وظائف الواجهة الرسومية (UI Rendering & Updates) ---
function renderInitialUI(joinUrl) {
    mainContainer.innerHTML = `
        <header class="app-header"><h1>AetherLink</h1><p>نقل الملفات الفوري والآمن</p></header>
        <section id="start-screen">
            <div class="qr-code-placeholder"></div>
            <p class="instructions">امسح الرمز أو شارك الرابط لبدء الاتصال</p>
            <button class="action-button">نسخ الرابط</button>
        </section>
    `;
    generateQRCode(joinUrl);
    mainContainer.querySelector('.action-button').addEventListener('click', () => {
        navigator.clipboard.writeText(joinUrl).then(() => {
            updateInstructions('تم نسخ الرابط بنجاح!');
        });
    });
}

function renderJoinerUI() {
    mainContainer.innerHTML = `
        <header class="app-header"><h1>AetherLink</h1><p>نقل الملفات الفوري والآمن</p></header>
        <section id="start-screen">
             <div class="loader"></div>
            <p class="instructions">جاري الانضمام للجلسة...</p>
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
                <p>أفلت ملفاً هنا أو انقر للاختيار</p>
                <input type="file" id="file-input">
            </div>
            <div id="transfer-status"></div>
            <button class="action-button secondary" id="reset-button" style="display: none;">إرسال ملف آخر</button>
        </div>
    `;

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
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
    });
    
    dropZone.addEventListener('dragenter', () => dropZone.classList.add('drag-over'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    
    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) { 
            fileToSend = e.dataTransfer.files[0]; 
            sendFile(); 
        }
    });

    resetButton.addEventListener('click', () => {
        document.getElementById('transfer-status').innerHTML = '';
        fileInput.value = ''; // إعادة تعيين حقل الإدخال
        resetButton.style.display = 'none';
        dropZone.style.display = 'block';
    });
}

function updateInstructions(message, isError = false) {
    const instructions = mainContainer.querySelector('.instructions');
    if (instructions) {
        instructions.textContent = message;
        instructions.style.color = isError ? '#ff6b6b' : '#c0c0c0';
    }
}

// --- 6. منطق إرسال واستقبال الملفات ---
function sendFile() {
    if (!fileToSend || !peer || !peer.connected) {
        alert('الاتصال غير جاهز. يرجى الانتظار.');
        return;
    }
    
    document.getElementById('drop-zone').style.display = 'none';
    document.getElementById('reset-button').style.display = 'none';

    const metadata = { fileName: fileToSend.name, fileSize: fileToSend.size };
    peer.send(JSON.stringify(metadata));

    const fileReader = new FileReader();
    let offset = 0;
    
    const statusText = `جاري إرسال ${formatBytes(fileToSend.size)}...`;
    updateTransferStatus(fileToSend.name, 0, statusText);

    fileReader.onload = (e) => {
        if (!e.target.result) return;
        
        peer.send(e.target.result);
        offset += e.target.result.byteLength;
        const progress = Math.round((offset / fileToSend.size) * 100);
        updateTransferStatus(fileToSend.name, progress, statusText);

        if (offset < fileToSend.size) { 
            readSlice(offset); 
        } else { 
            updateTransferStatus(fileToSend.name, 100, 'تم الإرسال بنجاح!', true); 
        }
    };
    
    fileReader.onerror = (error) => {
        console.error('File Reader Error:', error);
        updateTransferStatus(fileToSend.name, 0, 'فشل في قراءة الملف.', true, true);
    };

    const readSlice = (o) => {
        const slice = fileToSend.slice(o, o + CHUNK_SIZE);
        fileReader.readAsArrayBuffer(slice);
    };

    readSlice(0);
}

function updateTransferStatus(fileName, progress, statusText, isComplete = false, isError = false) {
    const transferStatusDiv = document.getElementById('transfer-status');
    if (!transferStatusDiv) return;

    let fileProgressDiv = document.getElementById(`file-progress`);
    if (!fileProgressDiv) {
        fileProgressDiv = document.createElement('div');
        fileProgressDiv.className = 'file-progress';
        fileProgressDiv.id = `file-progress`;
        transferStatusDiv.innerHTML = ''; // استبدال أي حالة سابقة
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
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function handleDisconnection(message) {
    if (peer) {
        peer.destroy();
        peer = null;
    }
    const statusElement = document.querySelector('.connection-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.classList.remove('success');
        statusElement.classList.add('error');
        document.getElementById('transfer-container').style.opacity = '0.5';
        document.getElementById('transfer-container').style.pointerEvents = 'none';
    } else {
        renderJoinerUI();
        updateInstructions(message, true);
    }
}

// --- 7. وظائف مساعدة ---
function generateQRCode(url) {
    const qrPlaceholder = mainContainer.querySelector('.qr-code-placeholder');
    if (!qrPlaceholder) return;
    qrPlaceholder.innerHTML = '';
    const qr = qrcode(0, 'L');
    qr.addData(url);
    qr.make();
    qrPlaceholder.innerHTML = qr.createImgTag(5, 10);
    const qrImg = qrPlaceholder.querySelector('img');
    if (qrImg) { qrImg.style.cssText = "width: 100%; height: 100%; border-radius: 10px;"; }
}

// --- التحسين: وظيفة لتنسيق حجم الملفات ---
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}