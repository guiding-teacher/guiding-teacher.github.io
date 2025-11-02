/**
 * رحلة الكاتب السومري: إرث الرافدين
 *
 * هذا هو المحرك البرمجي الكامل للتطبيق التفاعلي.
 * @version 2.0 (النسخة النهائية والشاملة)
 * @author (تم التطوير بواسطة نموذج لغة متقدم)
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. التهيئة العامة وشاشة التحميل ---
    const loader = document.getElementById('loader');
    window.addEventListener('load', () => {
        // تأخير بسيط لإعطاء إحساس بالتحميل الفعلي
        setTimeout(() => {
            document.body.classList.add('loaded');
        }, 500);
    });

    // --- 2. إدارة الإعدادات والمؤثرات الصوتية ---
    const sfx = {
        click: document.getElementById('click-sound'),
        success: document.getElementById('success-sound'),
        achievement: document.getElementById('achievement-sound'),
        error: document.getElementById('error-sound'),
    };
    let sfxEnabled = true;
    let voiceEnabled = true;

    const sfxToggle = document.getElementById('sfx-toggle');
    const voiceToggle = document.getElementById('voice-toggle');

    sfxToggle.addEventListener('click', () => {
        sfxEnabled = !sfxEnabled;
        sfxToggle.classList.toggle('active', sfxEnabled);
        playSound('click');
    });
    voiceToggle.addEventListener('click', () => {
        voiceEnabled = !voiceEnabled;
        voiceToggle.classList.toggle('active', voiceEnabled);
        playSound('click');
        if (!voiceEnabled) window.speechSynthesis.cancel();
    });

    function playSound(sound) {
        if (sfxEnabled && sfx[sound]) {
            sfx[sound].currentTime = 0;
            sfx[sound].play().catch(e => console.error("خطأ في تشغيل الصوت:", e));
        }
    }

    function speak(text) {
        if (voiceEnabled) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.95; // سرعة نطق مناسبة
            window.speechSynthesis.speak(utterance);
        }
    }

    // --- 3. نظام الإنجازات (لوح الحكمة) ---
    const achievements = {
        cuneiform: false, inventions: false, artifacts: false, quiz: false
    };
    function unlockAchievement(name) {
        if (!achievements[name]) {
            achievements[name] = true;
            const seal = document.getElementById(`seal-${name}`);
            seal.classList.add('unlocked');
            seal.title = `تم فتح إنجاز: ${seal.title.split(': ')[1]}`;
            playSound('achievement');
        }
    }

    // --- 4. نظام التبويبات الرئيسي ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            const tabId = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // --- 5. قسم شريط الزمن التفاعلي ---
    const timelineEvents = document.querySelectorAll('.timeline-event');
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const closeBtn = document.querySelector('.close-btn');

    timelineEvents.forEach(event => {
        event.addEventListener('click', () => {
            playSound('click');
            const title = event.querySelector('span').textContent;
            const year = event.dataset.year;
            const info = event.dataset.info;
            modalBody.innerHTML = `<h3>${title} (${year})</h3><p>${info}</p>`;
            modal.style.display = 'block';
            speak(`${title}. ${info}`);
        });
    });
    closeBtn.onclick = () => { playSound('click'); modal.style.display = 'none'; window.speechSynthesis.cancel(); };
    window.onclick = (event) => { if (event.target == modal) { playSound('click'); modal.style.display = 'none'; window.speechSynthesis.cancel(); }};

    // --- 6. قسم الكتابة المسمارية ---
    function initializeCuneiformWriter() {
        const section = document.getElementById('cuneiform-tab');
        section.innerHTML = `
            <div class="center-title"><h2 class="section-title">✍️ لوح الطين الرقمي</h2></div>
            <div id="cuneiform-writer">
                <div class="cuneiform-output-area">
                    <div class="cuneiform-display" id="cuneiform-output"></div>
                    <div class="arabic-display" id="arabic-output"></div>
                </div>
                <div id="cuneiform-keyboard"></div>
                <div class="cuneiform-controls">
                    <button id="clear-cuneiform-btn">مسح اللوح</button>
                    <button id="speak-cuneiform-btn">🔊 نطق الكلمة</button>
                </div>
                <p class="helper-text">انقر على الرموز لكتابة اسمك أو كلمات بسيطة!</p>
            </div>
        `;

        const keyboard = document.getElementById('cuneiform-keyboard');
        const cuneiformOutput = document.getElementById('cuneiform-output');
        const arabicOutput = document.getElementById('arabic-output');
        
        const alphabet = {
            'ا': '𒀀', 'ب': '𒁀', 'ت': '𒋫', 'ج': '𒊭', 'د': '𒁕', 'ر': '𒊏',
            'ز': '𒍝', 'س': '𒊓', 'ش': '𒊺', 'ص': '𒍣', 'ك': '𒆠', 'ل': '𒆷',
            'م': '𒈠', 'ن': '𒈾', 'هـ': '𒄩', 'و': '𒌋', 'ي': '𒅀', 'ح': ''
        };

        Object.entries(alphabet).forEach(([arabic, cuneiform]) => {
            const key = document.createElement('div');
            key.className = 'cuneiform-key';
            key.textContent = cuneiform;
            key.title = arabic;
            key.addEventListener('click', () => {
                cuneiformOutput.textContent += cuneiform;
                arabicOutput.textContent += arabic;
                speak(arabic);
                if (arabicOutput.textContent.length > 5) {
                    unlockAchievement('cuneiform');
                }
            });
            keyboard.appendChild(key);
        });

        document.getElementById('clear-cuneiform-btn').addEventListener('click', () => {
            playSound('click');
            cuneiformOutput.textContent = '';
            arabicOutput.textContent = '';
        });
        document.getElementById('speak-cuneiform-btn').addEventListener('click', () => {
            if (arabicOutput.textContent) speak(arabicOutput.textContent);
        });
    }

    // --- 7. قسم الاختراعات الخالدة ---
    function initializeInventions() {
        const section = document.getElementById('inventions-tab');
        section.innerHTML = `
            <div class="center-title"><h2 class="section-title">⚙️ شرارة الإبداع</h2></div>
            <div class="invention-gallery">
                <div class="invention-selector">
                    <button class="invention-btn active" data-invention="wheel"><i class="fas fa-circle-notch"></i><span>العجلة</span></button>
                    <button class="invention-btn" data-invention="plow"><i class="fas fa-tractor"></i><span>المحراث</span></button>
                    <button class="invention-btn" data-invention="sailboat"><i class="fas fa-ship"></i><span>الشراع</span></button>
                </div>
                <div id="invention-display-area"></div>
            </div>
        `;

        const displayArea = document.getElementById('invention-display-area');
        const inventionBtns = document.querySelectorAll('.invention-btn');
        const inventionsData = {
            wheel: { title: 'العجلة: ثورة في النقل', steps: [{ img: "https://cdn-icons-png.flaticon.com/512/3043/3043429.png", text: "1. نبدأ بقطع جذع شجرة كبير وقوي." }, { img: "https://cdn-icons-png.flaticon.com/512/995/995111.png", text: "2. نقطع الجذع إلى أقراص دائرية سميكة." }, { img: "https://cdn-icons-png.flaticon.com/512/2821/2821387.png", text: "3. نحفر ثقبًا دقيقًا في المنتصف لتركيب المحور." }, { img: "https://cdn-icons-png.flaticon.com/512/1004/1004739.png", text: "4. نصنع محورًا يربط بين عجلتين، وهكذا نحصل على عربة بسيطة!" }] },
            plow: { title: 'المحراث: ثورة في الزراعة', steps: [{ img: "https://cdn-icons-png.flaticon.com/512/2312/2312682.png", text: "1. قديماً، كان المزارعون يحرثون الأرض بأيديهم، وهذا كان عملاً شاقاً." }, { img: "https://cdn-icons-png.flaticon.com/512/8151/8151522.png", text: "2. لاحظ السومريون أن جر الأدوات يسهل العمل، فصنعوا محراثاً بسيطاً من الخشب." }, { img: "https://cdn-icons-png.flaticon.com/512/346/346641.png", text: "3. ثم قاموا بربط المحراث بالثيران القوية، مما جعل حراثة الحقول أسرع وأعمق." }, { img: "https://cdn-icons-png.flaticon.com/512/2942/2942893.png", text: "4. بفضل المحراث، زاد إنتاج الطعام ونمت المدن وازدهرت الحضارة." }] },
            sailboat: { title: 'الشراع: غزو الأنهار والبحار', steps: [{ img: "https://cdn-icons-png.flaticon.com/512/3144/3144422.png", text: "1. كانت القوارب تعتمد على التجديف، مما جعل السفر لمسافات طويلة صعباً." }, { img: "https://cdn-icons-png.flaticon.com/512/2939/2939985.png", text: "2. اكتشف السومريون قوة الرياح، فقاموا بوضع قطعة قماش مربعة على القارب." }, { img: "https://cdn-icons-png.flaticon.com/512/1078/1078996.png", text: "3. هذا الشراع البسيط سمح للرياح بدفع القارب، مما سهل التجارة والسفر." }, { img: "https://cdn-icons-png.flaticon.com/512/91/91143.png", text: "4. تطورت السفن الشراعية وأصبحت وسيلة رئيسية للتجارة واستكشاف العالم." }] }
        };

        function loadInvention(inventionKey) {
            const data = inventionsData[inventionKey];
            let currentStep = 0;
            displayArea.innerHTML = `
                <h3 class="invention-title">${data.title}</h3>
                <div class="wheel-presentation"></div>
                <div class="presentation-controls">
                    <button id="prev-step-btn" disabled>السابق</button>
                    <span id="step-counter"></span>
                    <button id="next-step-btn">التالي</button>
                </div>`;

            const presentation = displayArea.querySelector('.wheel-presentation');
            const nextBtn = displayArea.querySelector('#next-step-btn');
            const prevBtn = displayArea.querySelector('#prev-step-btn');
            const stepCounter = displayArea.querySelector('#step-counter');

            function showStep(index) {
                const step = data.steps[index];
                presentation.innerHTML = `<div class="presentation-step active"><img src="${step.img}" alt=""><p>${step.text}</p></div>`;
                speak(step.text);
                stepCounter.textContent = `${index + 1} / ${data.steps.length}`;
                prevBtn.disabled = index === 0;
                nextBtn.disabled = index === data.steps.length - 1;
                if (nextBtn.disabled) unlockAchievement('inventions');
            }

            nextBtn.addEventListener('click', () => { playSound('click'); if(currentStep < data.steps.length - 1) showStep(++currentStep); });
            prevBtn.addEventListener('click', () => { playSound('click'); if(currentStep > 0) showStep(--currentStep); });
            showStep(0);
        }

        inventionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                playSound('click');
                inventionBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadInvention(btn.dataset.invention);
            });
        });
        loadInvention('wheel');
    }

    // --- 8. قسم تجميع الآثار ---
    function initializeArtifacts() {
        const artifactGameContainer = document.getElementById('artifact-assembly-game');
        const artifactChoiceBtns = document.querySelectorAll('.artifact-choice-btn');
        const artifactsData = {
            helmet: { name: "خوذة مسكلامدك الذهبية", image: "https://www.worldhistory.org/img/c/p/1200x627/5333.jpg", pieces: 4 },
            standard: { name: "معيار أور (وجه الحرب)", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Standard_of_Ur_-_War.jpg/1280px-Standard_of_Ur_-_War.jpg", pieces: 4 }
        };

        function loadArtifactGame(key) {
            const data = artifactsData[key];
            let placedPieces = 0;
            artifactGameContainer.innerHTML = `
                <div id="artifact-target"></div>
                <div id="artifact-pieces-box"></div>
                <p id="artifact-feedback"></p>`;

            const target = document.getElementById('artifact-target');
            const piecesBox = document.getElementById('artifact-pieces-box');
            const feedback = document.getElementById('artifact-feedback');
            target.style.backgroundImage = `url('${data.image}')`;
            
            const pieceOrder = Array.from({ length: data.pieces }, (_, i) => i + 1).sort(() => Math.random() - 0.5);

            for (let i = 1; i <= data.pieces; i++) {
                const slot = document.createElement('div');
                slot.className = 'piece-slot'; slot.dataset.piece = i; target.appendChild(slot);
                const piece = document.createElement('div');
                piece.className = 'artifact-piece';
                piece.dataset.piece = pieceOrder[i - 1];
                piece.draggable = true;
                piece.style.backgroundImage = `url('${data.image}')`;
                const cols = 2, rows = 2;
                const col = (pieceOrder[i - 1] - 1) % cols;
                const row = Math.floor((pieceOrder[i - 1] - 1) / cols);
                piece.style.backgroundPosition = `${-col * 150}px ${-row * 150}px`;
                piecesBox.appendChild(piece);
            }
            
            let draggedPiece = null;
            document.querySelectorAll('.artifact-piece').forEach(p => {
                p.addEventListener('dragstart', e => { draggedPiece = e.target; setTimeout(() => e.target.style.opacity = '0.5', 0); });
                p.addEventListener('dragend', e => { e.target.style.opacity = '1'; });
            });
            document.querySelectorAll('.piece-slot').forEach(slot => {
                slot.addEventListener('dragover', e => e.preventDefault());
                slot.addEventListener('drop', e => {
                    e.preventDefault();
                    if (draggedPiece && slot.dataset.piece === draggedPiece.dataset.piece) {
                        slot.appendChild(draggedPiece);
                        draggedPiece.draggable = false;
                        slot.classList.add('filled');
                        playSound('success');
                        placedPieces++;
                        if (placedPieces === data.pieces) {
                            feedback.textContent = `رائع! لقد أكملت ${data.name}!`;
                            target.classList.add('completed');
                            unlockAchievement('artifacts');
                            speak(`رائع! لقد أكملت ${data.name}!`);
                        }
                    } else {
                        playSound('error');
                    }
                });
            });
        }
        artifactChoiceBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                playSound('click');
                artifactChoiceBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                loadArtifactGame(e.currentTarget.dataset.artifact);
            });
        });
        loadArtifactGame('helmet');
    }

    // --- 9. قسم اختبار الحكمة ---
    function initializeQuiz() {
        const section = document.getElementById('quiz-tab');
        section.innerHTML = `
            <div class="center-title"><h2 class="section-title">🧠 اختبر حكمتك</h2></div>
            <div id="quiz-container">
                <p id="question"></p>
                <div class="options-grid" id="options"></div>
                <p id="quiz-result"></p>
                <button id="restart-quiz-btn" style="display:none;">إعادة الاختبار</button>
            </div>`;

        const questionEl = document.getElementById('question');
        const optionsEl = document.getElementById('options');
        const resultEl = document.getElementById('quiz-result');
        const restartBtn = document.getElementById('restart-quiz-btn');

        const quizData = [
            { question: "أي حضارة اخترعت الكتابة المسمارية؟", options: ["المصرية القديمة", "السومرية", "الإغريقية", "الرومانية"], correct: "السومرية" },
            { question: "ما هو أساس النظام العددي الذي استخدمه البابليون وما زال يستخدم في قياس الوقت؟", options: ["العشري (10)", "الثنائي (2)", "الستيني (60)", "الثماني (8)"], correct: "الستيني (60)" },
            { question: "حدائق بابل المعلقة، إحدى عجائب الدنيا السبع، تنسب إلى أي ملك؟", options: ["حمورابي", "جلجامش", "نبوخذ نصر الثاني", "سرجون الأكدي"], correct: "نبوخذ نصر الثاني" },
            { question: "ما هو أقدم عمل أدبي ملحمي مكتوب في التاريخ؟", options: ["الإلياذة", "ملحمة جلجامش", "الأوديسة", "كتاب الموتى"], correct: "ملحمة جلجامش" },
            { question: "ما هو الاختراع السومري الذي أحدث ثورة في الزراعة بجعل حرث الأرض أسهل بكثير؟", options: ["العجلة", "المحراث", "الساعة المائية", "الشراع"], correct: "المحراث" }
        ];

        let currentQuestionIndex, score;

        function startQuiz() {
            currentQuestionIndex = 0; score = 0;
            resultEl.textContent = '';
            restartBtn.style.display = 'none';
            loadQuiz();
        }

        function loadQuiz() {
            const currentQuestion = quizData[currentQuestionIndex];
            questionEl.textContent = `السؤال ${currentQuestionIndex + 1}: ${currentQuestion.question}`;
            optionsEl.innerHTML = '';
            currentQuestion.options.forEach(option => {
                const button = document.createElement('button');
                button.textContent = option;
                button.classList.add('option-btn');
                button.addEventListener('click', () => selectAnswer(option, button));
                optionsEl.appendChild(button);
            });
        }

        function selectAnswer(selectedOption, btn) {
            const isCorrect = selectedOption === quizData[currentQuestionIndex].correct;
            btn.style.backgroundColor = isCorrect ? 'var(--success-color)' : 'var(--error-color)';
            playSound(isCorrect ? 'success' : 'error');
            if (isCorrect) score++;

            Array.from(optionsEl.children).forEach(b => b.disabled = true);
            setTimeout(() => {
                currentQuestionIndex++;
                if (currentQuestionIndex < quizData.length) {
                    loadQuiz();
                } else {
                    showResults();
                }
            }, 1200);
        }

        function showResults() {
            questionEl.textContent = 'انتهى الاختبار!';
            optionsEl.innerHTML = '';
            const percentage = Math.round((score / quizData.length) * 100);
            resultEl.textContent = `نتيجتك: ${score} من ${quizData.length} (${percentage}%)`;
            if (percentage >= 80) {
                resultEl.textContent += ' - أحسنت! أنت حكيم من حكماء الرافدين!';
                unlockAchievement('quiz');
            } else {
                resultEl.textContent += ' - معرفة جيدة! استمر في التعلم.';
            }
            restartBtn.style.display = 'block';
        }
        restartBtn.addEventListener('click', () => { playSound('click'); startQuiz(); });
        startQuiz();
    }

    // --- 10. مساعد الذكاء الاصطناعي "جلجامش" ---
    function initializeAI() {
        const section = document.getElementById('ai-tab');
        section.innerHTML = `
            <div class="center-title"><h2 class="section-title">🤖 اسأل الحكيم جلجامش</h2></div>
            <div id="chat-window" class="chat-window"></div>
            <div class="chat-input-area">
                <input type="text" id="chat-input" placeholder="اكتب سؤالك عن تاريخ الرافدين...">
                <button id="send-btn" title="إرسال"><i class="fas fa-paper-plane"></i></button>
            </div>`;
        
        const chatWindow = document.getElementById('chat-window');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const API_KEY = 'AIzaSyA65PsCnOL7wiTuHe1vazJbSzJWwfWdHkk';
        const PROXY_URL = `https://gemini-proxy.free.beeceptor.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

        function addMessage(text, sender, isLoading = false) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', sender);
            if (isLoading) {
                messageDiv.classList.add('loading');
                messageDiv.innerHTML = `<span class="sender">جلجامش يفكر...</span><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>`;
            } else if (sender === 'bot') {
                messageDiv.innerHTML = `<span class="sender">جلجامش</span> ${text.replace(/\n/g, '<br>')}`;
            } else {
                messageDiv.textContent = text;
            }
            chatWindow.appendChild(messageDiv);
            chatWindow.scrollTop = chatWindow.scrollHeight;
            return messageDiv;
        }

        async function getAIResponse(prompt) {
            if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
                return "عذراً أيها الصديق، يبدو أن لوح الحكمة الخاص بي غير متصل. يرجى التأكد من تكوين مفتاح API في الكود البرمجي.";
            }
            try {
                const response = await fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `أنت مساعد ذكاء اصطناعي خبير اسمه 'جلجامش'. تجيب على أسئلة حول تاريخ بلاد الرافدين (سومر، بابل، آشور) فقط. أجب بأسلوب شيق وحكيم ومناسب للأطفال، واستخدم فقرات قصيرة. إذا سُئلت عن أي شيء آخر، أجب بلطف أن معرفتك تقتصر على تاريخ أرض النهرين. السؤال هو: ${prompt}` }] }]
                    })
                });
                if (!response.ok) throw new Error(`خطأ في الاتصال: ${response.status}`);
                const data = await response.json();
                return data.candidates[0].content.parts[0].text;
            } catch (error) {
                console.error("خطأ في جلب استجابة الذكاء الاصطناعي:", error);
                return "عذراً، يبدو أن هناك عاصفة رملية تعيق وصول حكمتي إليك الآن. حاول مرة أخرى بعد قليل.";
            }
        }

        async function handleChat() {
            const userInput = chatInput.value.trim();
            if (!userInput) return;
            addMessage(userInput, 'user');
            chatInput.value = '';
            const loadingMessage = addMessage('', 'bot', true);
            const aiResponse = await getAIResponse(userInput);
            loadingMessage.remove();
            addMessage(aiResponse, 'bot');
            speak(aiResponse.substring(0, 200)); // نطق بداية الإجابة
        }

        sendBtn.addEventListener('click', handleChat);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });
        setTimeout(() => {
            addMessage("أهلاً بك يا باحث المعرفة! أنا جلجامش، ملك أوروك وحارس حكمة الرافدين. سلني ما تشاء عن تاريخ أرضنا العظيمة.", 'bot');
        }, 1500);
    }
    
    // --- التنفيذ المبدئي للتطبيق ---
    function initializeApplication() {
        initializeCuneiformWriter();
        initializeInventions();
        initializeArtifacts();
        initializeQuiz();
        initializeAI();
    }

    initializeApplication();
});