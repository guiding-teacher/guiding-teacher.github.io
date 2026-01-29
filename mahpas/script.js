document.addEventListener('DOMContentLoaded', function() {
    // تهيئة Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyD_7PrXfJAnEEx2q12LGGwdlpflfBEYgP4",
        authDomain: "iraq-mheibs-game.firebaseapp.com",
        databaseURL: "https://iraq-mheibs-game-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "iraq-mheibs-game",
        storageBucket: "iraq-mheibs-game.appspot.com",
        messagingSenderId: "83560429652",
        appId: "1:83560429652:web:1420dacee1690da03e55c1",
        measurementId: "G-28WYG704BH"
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    // تعريف العناصر (تم حذف عناصر المشرف)
    const elements = {
        handsContainer: document.getElementById('hands-container'),
        timerElement: document.getElementById('timer'),
        resultElement: document.getElementById('result'),
        nameModal: document.getElementById('name-modal'),
        playerNameInput: document.getElementById('player-name'),
        confirmNameBtn: document.getElementById('confirm-name'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmMessage: document.getElementById('confirm-message'),
        selectedHandNumber: document.getElementById('selected-hand-number'),
        confirmChoiceBtn: document.getElementById('confirm-choice'),
        cancelChoiceBtn: document.getElementById('cancel-choice'),
        participantsBody: document.getElementById('participants-body'),
        winnersContainer: document.getElementById('winners-container'),
        winnersList: document.getElementById('winners-list'),
        waitingMessage: document.getElementById('waiting-message'),
        playersCount: document.getElementById('players-count'),
        connectionStatus: document.getElementById('connection-status'),
        playerChoiceInfo: document.getElementById('player-choice-info'),
        playerChoiceNumber: document.getElementById('player-choice-number'),
        chatContainer: document.getElementById('chat-container'),
        chatMessages: document.getElementById('chat-messages'),
        chatInput: document.getElementById('chat-input'),
        sendBtn: document.getElementById('send-btn'),
        emojiBtn: document.getElementById('emoji-btn'),
        emojiPicker: document.getElementById('emoji-picker'),
        chatStatus: document.getElementById('chat-status'),
        adminNote: document.getElementById('admin-note'),
        gameHistoryContainer: document.getElementById('game-history-container'),
        gameHistoryTable: document.getElementById('game-history-table'),
        gameHistoryBody: document.getElementById('game-history-body'),
        charCounter: document.getElementById('char-counter')
    };

    // المتغيرات العامة
    let timer;
    let gameStarted = false;
    let ringHandIndex = -1;
    let selectedHandIndex = -1;
    let playerName = '';
    let hands = [];
    let currentGameId = 'default';
    let playerId = generatePlayerId();
    let players = {};
    let participants = {};
    let gameDuration = 60;
    let gameEndTime = 0;
    let timeLeft = 60;
    let playerChoice = null;
    let chatEnabled = true;
    let deviceId = getDeviceId();
    let gameHistory = {};
    let hasParticipated = false;

    function generatePlayerId() {
        return 'player-' + Math.random().toString(36).substr(2, 9);
    }

    function getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    function updateConnectionStatus(connected) {
        if (connected) {
            elements.connectionStatus.textContent = 'متصل';
            elements.connectionStatus.classList.remove('disconnected');
            elements.connectionStatus.classList.add('connected');
        } else {
            elements.connectionStatus.textContent = 'غير متصل - تحقق من اتصالك بالإنترنت';
            elements.connectionStatus.classList.remove('connected');
            elements.connectionStatus.classList.add('disconnected');
        }
    }

    function setupGameListeners() {
        const gameRef = database.ref('games/' + currentGameId);

        // مستمع حالة اللعبة
        gameRef.child('gameState').on('value', (snapshot) => {
            const gameState = snapshot.val() || {};
            gameStarted = gameState.started || false;
            gameEndTime = gameState.gameEndTime || 0;
            ringHandIndex = gameState.ringHandIndex || -1;
            gameDuration = gameState.gameDuration || 60;

            if (gameStarted) {
                elements.waitingMessage.style.display = 'none';
                
                const now = Date.now();
                timeLeft = Math.max(0, Math.floor((gameEndTime - now) / 1000));
                
                if (timeLeft > 0) {
                    startTimerFromServer(timeLeft);
                } else {
                    endGameFromServer();
                }
            } else {
                clearInterval(timer);
                elements.waitingMessage.style.display = 'block';
                timeLeft = gameDuration;
                updateTimerDisplay();
            }

            if (gameState.gameOver) {
                endGameFromServer();
            }
            
            updateHandsUI();
        });

        // مستمع المشاركين
        gameRef.child('participants').on('value', (snapshot) => {
            participants = snapshot.val() || {};
            updateParticipantsTable();
            
            const participant = Object.values(participants).find(p => p.deviceId === deviceId);
            if (participant) {
                hasParticipated = true;
                playerName = participant.name;
                playerChoice = participant.hand;
                elements.playerChoiceNumber.textContent = participant.hand;
                elements.playerChoiceInfo.style.display = 'block';
                elements.nameModal.style.display = 'none';
            } else {
                if (!hasParticipated && !playerName) {
                    elements.nameModal.style.display = 'flex';
                }
                elements.playerChoiceInfo.style.display = 'none';
                playerChoice = null;
            }
            
            if (timeLeft <= 0) {
                showFinalResults();
            }
        });

        // مستمع اللاعبين المتصلين
        gameRef.child('players').on('value', (snapshot) => {
            players = snapshot.val() || {};
            updatePlayersCount();
        });
        
        // مستمع حالة الدردشة
        gameRef.child('chatEnabled').on('value', (snapshot) => {
            chatEnabled = snapshot.val() !== false;
            updateChatStatus();
        });
        
        // مستمع رسائل الدردشة
        gameRef.child('messages').on('value', (snapshot) => {
            const messages = snapshot.val() || {};
            updateChatMessages(messages);
            
            setTimeout(() => {
                elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
            }, 100);
        });
        
        // مستمع الملاحظة الإدارية
        gameRef.child('adminNote').on('value', (snapshot) => {
            const note = snapshot.val();
            if (note) {
                elements.adminNote.textContent = note;
                elements.adminNote.style.display = 'block';
            } else {
                elements.adminNote.style.display = 'none';
            }
        });
        
        // مستمع سجل الجولات
        gameRef.child('gameHistory').on('value', (snapshot) => {
            gameHistory = snapshot.val() || {};
            updateGameHistoryTable();
        });
    }

    function updateGameHistoryTable() {
        if (!elements.gameHistoryBody) return; // حماية ضد الأخطاء إذا تم حذف العنصر من HTML
        
        elements.gameHistoryBody.innerHTML = '';
        
        const sortedHistory = Object.entries(gameHistory)
            .map(([id, game]) => ({ id, ...game }))
            .sort((a, b) => b.timestamp - a.timestamp);
        
        const uniqueNames = new Set();
        let displayCount = 0; // عرض آخر 5 فائزين فقط للاعبين لتجنب الازدحام
        
        sortedHistory.forEach((game, index) => {
            if (!uniqueNames.has(game.winnerName) && displayCount < 5) {
                uniqueNames.add(game.winnerName);
                displayCount++;
                
                const row = document.createElement('tr');
                row.className = 'animate__animated animate__fadeIn';
                
                const winnerCell = document.createElement('td');
                winnerCell.textContent = game.winnerName || 'لا يوجد';
                
                const handCell = document.createElement('td');
                handCell.textContent = game.winningHand || '؟';
                
                row.appendChild(winnerCell);
                row.appendChild(handCell);
                elements.gameHistoryBody.appendChild(row);
            }
        });
        
        // إظهار القسم فقط إذا كان هناك بيانات
        if (displayCount > 0 && elements.gameHistoryContainer) {
            elements.gameHistoryContainer.style.display = 'block';
        }
    }

    function updateChatMessages(messages) {
        const wasScrolledToBottom = elements.chatMessages.scrollHeight - elements.chatMessages.scrollTop === elements.chatMessages.clientHeight;
        
        const messagesArray = Object.entries(messages).map(([id, message]) => ({ id, ...message }));
        messagesArray.sort((a, b) => a.timestamp - b.timestamp);
        
        const fragment = document.createDocumentFragment();
        
        messagesArray.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            
            if (message.senderId === playerId) {
                messageDiv.classList.add('message-current-user');
            } else if (message.isAdmin) {
                messageDiv.classList.add('message-admin');
            } else {
                messageDiv.classList.add('message-user');
            }
            
            if (/^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u.test(message.text)) {
                messageDiv.classList.add('message-emoji');
            }
            
            const messageHeader = document.createElement('div');
            messageHeader.className = 'message-header';
            
            const messageSender = document.createElement('span');
            messageSender.className = 'message-sender';
            messageSender.textContent = message.isAdmin ? "المشرف" : message.senderName;
            if (message.isAdmin) {
                messageSender.classList.add('admin');
            }
            
            messageHeader.appendChild(messageSender);
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.textContent = message.text;
            
            messageDiv.appendChild(messageHeader);
            messageDiv.appendChild(messageContent);
            fragment.appendChild(messageDiv);
        });
        
        elements.chatMessages.innerHTML = '';
        elements.chatMessages.appendChild(fragment);
        
        if (wasScrolledToBottom) {
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        }
    }

    function updateChatStatus() {
        if (chatEnabled) {
            elements.chatStatus.textContent = 'مفتوحة';
            elements.chatStatus.style.backgroundColor = '#4CAF50';
            elements.chatInput.disabled = false;
            elements.sendBtn.disabled = elements.chatInput.value.trim() === '';
        } else {
            elements.chatStatus.textContent = 'مغلقة';
            elements.chatStatus.style.backgroundColor = '#F44336';
            elements.chatInput.disabled = true;
            elements.sendBtn.disabled = true;
        }
    }

    function sendMessage() {
        const text = elements.chatInput.value.trim();
        if (!text || !playerName || !chatEnabled) return;
        
        const message = {
            text: text,
            senderId: playerId,
            senderName: playerName,
            isAdmin: false,
            timestamp: Date.now()
        };
        
        database.ref('games/' + currentGameId + '/messages').push(message)
            .then(() => {
                elements.chatInput.value = '';
                elements.sendBtn.disabled = true;
            })
            .catch(error => {
                console.error('Error sending message:', error);
            });
    }

    function updatePlayersCount() {
        const count = Object.keys(players).length;
        elements.playersCount.textContent = `عدد اللاعبين: ${count}`;
    }

    function updateHandsUI() {
        hands.forEach((hand, index) => {
            hand.classList.remove('has-ring', 'selected', 'disabled');
            
            if (playerChoice || (gameStarted && isParticipant(playerName))) {
                hand.classList.add('disabled');
            }
            
            if (playerChoice && index === playerChoice - 1) {
                hand.classList.add('selected');
            }
            
            // اللاعبون يرون المحبس فقط عندما ينتهي الوقت
            if (index === ringHandIndex && timeLeft <= 0) {
                hand.classList.add('has-ring');
            }
        });
    }

    function startTimerFromServer(initialTime) {
        timeLeft = initialTime;
        updateTimerDisplay();
        
        clearInterval(timer);
        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            
            if (timeLeft <= 0) {
                clearInterval(timer);
            }
        }, 1000);
    }

    function endGameFromServer() {
        gameStarted = false;
        clearInterval(timer);
        
        if (ringHandIndex >= 0 && ringHandIndex < hands.length) {
            hands[ringHandIndex].classList.add('has-ring');
            elements.resultElement.textContent = 'انتهى الوقت! المحبس كان في اليد رقم ' + (ringHandIndex + 1);
            elements.resultElement.classList.add('highlight');
            
            showFinalResults();
            createConfetti();
        }
    }

    function createHands() {
        elements.handsContainer.innerHTML = '';
        hands = [];
        
        for (let i = 0; i < 24; i++) {
            const hand = document.createElement('div');
            hand.className = 'hand';
            hand.dataset.index = i;
            
            const handImg = document.createElement('img');
            handImg.src = 'mag.png';
            handImg.alt = 'يد مقبوضة';
            handImg.onerror = function() {
                this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238b4513"><path d="M7 12c0 2.8 2.2 5 5 5s5-2.2 5-5-2.2-5-5-5-5 2.2-5 5zm5 3c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"></path><path d="M6 7c-.6 0-1 .4-1 1v3H3c-.6 0-1 .4-1 1s.4 1 1 1h2v3c0 .6.4 1 1 1s1-.4 1-1v-3h2c.6 0 1-.4 1-1s-.4-1-1-1H7V8c0-.6-.4-1-1-1z"></path></svg>';
            };
            
            const handNumber = document.createElement('div');
            handNumber.className = 'hand-number';
            handNumber.textContent = i + 1;
            
            const ring = document.createElement('div');
            ring.className = 'ring';
            
            hand.appendChild(handImg);
            hand.appendChild(handNumber);
            hand.appendChild(ring);
            elements.handsContainer.appendChild(hand);
            
            hand.addEventListener('click', function() {
                if (playerChoice || !gameStarted || isParticipant(playerName)) return;
                
                const index = parseInt(this.dataset.index);
                showConfirmationModal(index);
            });
            
            hands.push(hand);
        }
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        elements.timerElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function createConfetti() {
        const colors = ['#8b4513', '#a0522d', '#D4AF37', '#f5f7fa', '#c3cfe2'];
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            confetti.style.animationDuration = Math.random() * 3 + 2 + 's';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    }

    function showFinalResults() {
        elements.winnersContainer.style.display = 'block';
        elements.winnersList.innerHTML = '';
        
        if (ringHandIndex === -1) {
            elements.winnersList.innerHTML = '<p>لم يتم تحديد اليد الفائزة بعد</p>';
            return;
        }
        
        const winners = Object.values(participants)
            .filter(p => p.hand === ringHandIndex + 1)
            .sort((a, b) => a.timestamp - b.timestamp);
        
        if (winners.length === 0) {
            elements.winnersList.innerHTML = '<p>لا يوجد فائزين في هذه الجولة💔</p>';
        } else {
            winners.forEach((winner, index) => {
                const winnerDiv = document.createElement('div');
                winnerDiv.className = 'winner animate__animated animate__fadeInUp';
                winnerDiv.style.animationDelay = (index * 0.2) + 's';
                winnerDiv.innerHTML = `
                    <strong>الفائز ${index + 1}:</strong> ${winner.name}
                    <small>الوقت: ${winner.timeString}</small>
                `;
                elements.winnersList.appendChild(winnerDiv);
            });
        }
    }

    function showConfirmationModal(index) {
        selectedHandIndex = index;
        elements.selectedHandNumber.textContent = index + 1;
        elements.confirmModal.style.display = 'flex';
    }

    function confirmSelection() {
        if (selectedHandIndex === -1) return;
        
        hands.forEach((hand, idx) => {
            if (idx === selectedHandIndex) {
                hand.classList.add('selected');
            } else {
                hand.classList.add('disabled');
            }
        });
        
        addParticipant(playerName, selectedHandIndex + 1);
        elements.confirmModal.style.display = 'none';
        hasParticipated = true;
    }

    function addParticipant(name, handNumber) {
        const now = new Date();
        const participant = {
            name: name,
            hand: handNumber,
            timestamp: now.getTime(),
            timeString: now.toLocaleTimeString(),
            deviceId: deviceId
        };
        
        database.ref('games/' + currentGameId + '/participants/' + playerId).set(participant);
    }

    function isParticipant(name) {
        return Object.values(participants).some(p => p.name === name);
    }

    function updateParticipantsTable() {
        elements.participantsBody.innerHTML = '';
        
        const sortedParticipants = Object.entries(participants)
            .map(([id, participant]) => ({ id, ...participant }))
            .sort((a, b) => a.timestamp - b.timestamp);
        
        sortedParticipants.forEach((participant, index) => {
            const row = document.createElement('tr');
            row.className = 'animate__animated animate__fadeIn';
            row.style.animationDelay = (index * 0.1) + 's';
            
            const nameCell = document.createElement('td');
            nameCell.textContent = participant.name;
            
            const handCell = document.createElement('td');
            handCell.textContent = participant.hand;
            
            const timeCell = document.createElement('td');
            timeCell.className = 'time-cell';
            timeCell.textContent = participant.timeString;
            
            row.appendChild(nameCell);
            row.appendChild(handCell);
            row.appendChild(timeCell);
            elements.participantsBody.appendChild(row);
        });
    }

    function initGame() {
        updateTimerDisplay();

        elements.playerNameInput.addEventListener('input', function() {
            const remaining = 12 - this.value.length;
            elements.charCounter.textContent = `الأحرف المتبقية: ${remaining}`;
        });
        
        elements.confirmNameBtn.addEventListener('click', function() {
            const name = elements.playerNameInput.value.trim();
            if (name === '') {
                alert('الرجاء إدخال اسمك');
                return;
            }
            else if (name.length > 12) {
                alert('الاسم يجب ألا يتجاوز 12 حرفًا');
                return;
            }
            else if (!/^[\u0600-\u06FFA-Za-z0-9 ]+$/.test(name)) {
                alert('يسمح فقط بالأحرف العربية والإنجليزية والأرقام');
                return;
            }

            database.ref('games/' + currentGameId + '/participants').once('value').then((snapshot) => {
                const participants = snapshot.val() || {};
                const existingParticipant = Object.values(participants).find(p => p.deviceId === deviceId);
                
                if (existingParticipant) {
                    playerName = existingParticipant.name;
                    playerChoice = existingParticipant.hand;
                    elements.playerChoiceNumber.textContent = existingParticipant.hand;
                    elements.playerChoiceInfo.style.display = 'block';
                    elements.nameModal.style.display = 'none';
                    hasParticipated = true;
                    
                    database.ref('games/' + currentGameId + '/players/' + playerId).set({
                        name: playerName,
                        isAdmin: false
                    });
                } else {
                    if (confirm(`يسمح لك التسجيل مرة واحدة في كل جولة، هل أنت متأكد من اسمك "${name}"؟`)) {
                        playerName = name;
                        elements.nameModal.style.display = 'none';
                        
                        database.ref('games/' + currentGameId + '/players/' + playerId).set({
                            name: playerName,
                            isAdmin: false
                        });
                    }
                }
            }).catch(error => {
                console.error('Error checking name:', error);
                alert('حدث خطأ أثناء التحقق من الاسم');
            });
        });
        
        elements.confirmChoiceBtn.addEventListener('click', confirmSelection);
        elements.cancelChoiceBtn.addEventListener('click', function() {
            elements.confirmModal.style.display = 'none';
            selectedHandIndex = -1;
        });
        
        // أحداث الدردشة
        elements.chatInput.addEventListener('input', function() {
            elements.sendBtn.disabled = this.value.trim() === '' || !chatEnabled;
        });
        
        elements.chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim() !== '' && chatEnabled) {
                sendMessage();
            }
        });
        
        elements.sendBtn.addEventListener('click', sendMessage);
        
        elements.emojiBtn.addEventListener('click', function() {
            elements.emojiPicker.style.display = elements.emojiPicker.style.display === 'block' ? 'none' : 'block';
        });
        
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                elements.chatInput.value += this.textContent;
                elements.sendBtn.disabled = false;
                elements.emojiPicker.style.display = 'none';
                elements.chatInput.focus();
            });
        });
        
        document.addEventListener('click', function(e) {
            if (!elements.emojiBtn.contains(e.target) && !elements.emojiPicker.contains(e.target)) {
                elements.emojiPicker.style.display = 'none';
            }
        });
    }

    firebase.database().ref('.info/connected').on('value', function(snapshot) {
        updateConnectionStatus(snapshot.val());
    });

    setupGameListeners();
    createHands();
    initGame();
    
    window.addEventListener('beforeunload', function() {
        if (playerId) {
            database.ref('games/' + currentGameId + '/players/' + playerId).remove();
        }
    });
});