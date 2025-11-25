// =============================================================
// الإعدادات والمتغيرات الرئيسية
// =============================================================
let currentGrade = 1;
let currentLessonIndex = 0;
let isTeaching = false;
let voices = [];
const lessonsData = {}; 

// رابط موقعك الأساسي
const baseUrl = "https://guiding-teacher.github.io/drsne/";

// متغيرات للتحكم في النطق
let currentSpeakingResolve = null; 
let currentSpeakTimeout = null;

// تحميل الإعدادات
let userProgress = JSON.parse(localStorage.getItem('readingAppProgress')) || {};
let userSettings = JSON.parse(localStorage.getItem('readingAppSettings')) || {
    wordRepetitions: 3,
    speechRate: 0.75,
    voicePitch: 1,
    wordInterval: 3,
    highlightHarakat: true,
    selectedVoiceURI: ''
};

// =============================================================
// دوال النطق الآمنة (الحل الجذري للمشكلة)
// =============================================================

// دالة آمنة لجلب الأصوات لا تسبب انهيار التطبيق
function safeGetVoices() {
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis) {
        return speechSynthesis.getVoices();
    }
    return [];
}

 function populateVoiceList() {
    // هذا السطر الجديد يمنع الخطأ إذا كان المتصفح لا يدعم الصوت
    if (!('speechSynthesis' in window)) return; 

    voices = speechSynthesis.getVoices();
    const arabicVoices = voices.filter(voice => voice.lang.startsWith('ar'));
    
    if (voiceSelectEl) {
        voiceSelectEl.innerHTML = '<option value="">الصوت الافتراضي</option>';
        arabicVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.voiceURI;
            voiceSelectEl.appendChild(option);
        });
        voiceSelectEl.value = userSettings.selectedVoiceURI;
    }
}

// دالة النطق الرئيسية المعدلة (آمنة 100%)
function speak(text) {
    return new Promise((resolve) => {
        if (!text) { resolve(); return; }

        let resolved = false;
        const finish = () => {
            if (!resolved) { resolved = true; resolve(); }
        };

        // مؤقت أمان لضمان عدم التعليق
        setTimeout(finish, 3000);

        try {
            // 1. الأولوية لتطبيق الأندرويد
            if (typeof Android !== 'undefined') {
                Android.speakArabic(text);
                let estimatedTime = Math.max(1000, text.length * 120);
                setTimeout(finish, estimatedTime);
                return;
            }

            // 2. المتصفح (مع فحص الأمان)
            if (typeof speechSynthesis !== 'undefined' && speechSynthesis) {
                // المتصفح (حماية من الخطأ)
            if ('speechSynthesis' in window && speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }

                const utterance = new SpeechSynthesisUtterance(text);
                const selectedVoice = voices.find(voice => voice.voiceURI === userSettings.selectedVoiceURI);
                utterance.voice = selectedVoice || null;
                if (!selectedVoice) utterance.lang = 'ar-SA';
                
                utterance.rate = parseFloat(userSettings.speechRate) || 1;
                utterance.pitch = parseFloat(userSettings.voicePitch) || 1;
                
                utterance.onend = finish;
                utterance.onerror = finish;
                
                speechSynthesis.speak(utterance);
            } else {
                // إذا لم يكن هناك دعم للصوت، ننهي الوعد فوراً
                console.warn("Speech Synthesis not supported");
                finish();
            }
            
        } catch (error) {
            console.error("Speech error:", error);
            finish();
        }
    });
}

// =============================================================
// تحميل البيانات
// =============================================================
async function fetchLessonData(grade) {
    grade = 1; 
    if (lessonsData[grade]) return lessonsData[grade];
    
    try {
        const timestamp = new Date().getTime(); 
        const fullUrl = `${baseUrl}data/grade${grade}.json?t=${timestamp}`;
        
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const data = await response.json();
        lessonsData[grade] = data;
        return data;
    } catch (error) {
        console.error("Failed to load lesson data:", error);
        // في حال الخطأ نعرض تنبيهاً صغيراً
        if(typeof Android === 'undefined') alert("خطأ تحميل البيانات: " + error.message);
        return [];
    }
}

// =============================================================
// عرض الدرس (مع إصلاح الصور)
// =============================================================
async function loadLesson(grade, index) {
    try {
        grade = 1;
        const gradeData = await fetchLessonData(grade);
        
        if (!gradeData || !gradeData.length) return;
        if (index < 0 || index >= gradeData.length) return;
        
        stopTeaching();

        currentGrade = grade;
        currentLessonIndex = index;
        const lesson = gradeData[currentLessonIndex];

        // عناصر DOM
        const titleEl = document.getElementById('lesson-title');
        const numEl = document.getElementById('lesson-number');
        const imgContainer = document.getElementById('lesson-image');
        const wordsContainer = document.getElementById('words-container');
        const prevBtn = document.getElementById('prev-lesson');
        const nextBtn = document.getElementById('next-lesson');

        if(titleEl) titleEl.textContent = lesson.title;
        if(numEl) numEl.textContent = lesson.id;

        // إصلاح الصور
        if (imgContainer) {
            const img = imgContainer.querySelector('img');
            if (img && lesson.image) {
                let imageUrl = lesson.image;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = baseUrl + imageUrl;
                }
                img.src = imageUrl;
                img.style.display = 'inline-block';
            }
        }

        // عرض الكلمات
        if(wordsContainer) {
            wordsContainer.innerHTML = '';
            if (lesson.words) {
                lesson.words.forEach(word => {
                    const wordEl = document.createElement('div');
                    wordEl.className = 'word';
                    wordEl.dataset.wordText = word.text;

                    let wordHtml = word.text;
                    if (userSettings.highlightHarakat && word.harakaPos) {
                         wordHtml = [...word.text].map((char, i) =>
                            word.harakaPos.includes(i) ? `<span class="haraka">${char}</span>` : char
                        ).join('');
                    }
                    wordEl.innerHTML = wordHtml;

                    wordEl.addEventListener('click', function() {
                        if (isTeaching) return;
                        speak(this.dataset.wordText);
                        document.querySelectorAll('.word').forEach(w => w.classList.remove('highlighted'));
                        this.classList.add('highlighted');
                    });
                    wordsContainer.appendChild(wordEl);
                });
            }
        }
        
        // حفظ التقدم
        const lessonKey = `${currentGrade}-${lesson.id}`;
        if (!userProgress[lessonKey]) {
            userProgress[lessonKey] = { viewed: true };
            localStorage.setItem('readingAppProgress', JSON.stringify(userProgress));
            updateProgressBar();
        }

        if(prevBtn) prevBtn.disabled = index === 0;
        if(nextBtn) nextBtn.disabled = index === gradeData.length - 1;

    } catch (e) {
        console.error("Error in loadLesson:", e);
    }
}

// =============================================================
// دوال مساعدة
// =============================================================

const stopTeaching = () => {
    isTeaching = false;
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis) speechSynthesis.cancel();
    if (typeof Android !== 'undefined') Android.stopSpeaking();
    
    if (currentSpeakTimeout) clearTimeout(currentSpeakTimeout);
    if (currentSpeakingResolve) currentSpeakingResolve();
    
    const teachBtn = document.getElementById('teach-me-button');
    if(teachBtn) teachBtn.disabled = false;
    document.querySelectorAll('.word').forEach(word => word.classList.remove('active-reading'));
};

async function startTeaching() {
    if (isTeaching) return;
    isTeaching = true;
    const teachBtn = document.getElementById('teach-me-button');
    if(teachBtn) teachBtn.disabled = true;

    const wordElements = Array.from(document.querySelectorAll('.word'));
    if (wordElements.length === 0) { stopTeaching(); return; }

    try {
        await speak("أَهْلًا بِكَ يَا صَدِيقِي.");
        for (const wordEl of wordElements) {
            if (!isTeaching) break;
            const wordText = wordEl.dataset.wordText;
            const repetitions = parseInt(userSettings.wordRepetitions) || 3;
            
            for (let i = 0; i < repetitions; i++) {
                if (!isTeaching) break;
                wordElements.forEach(w => w.classList.remove('active-reading'));
                wordEl.classList.add('active-reading');
                await speak(wordText);
                if (isTeaching && i < repetitions - 1) await new Promise(r => setTimeout(r, 2000));
            }
            if (isTeaching) await new Promise(r => setTimeout(r, 500));
        }
    } catch (error) { console.log(error); } 
    finally { stopTeaching(); }
}

async function startTest() {
    try {
        const gradeData = lessonsData[currentGrade];
        if (!gradeData) return;
        const lesson = gradeData[currentLessonIndex];
        if (!lesson || !lesson.words || lesson.words.length < 2) {
             if(typeof Android === 'undefined') alert('لا توجد كلمات كافية');
             return;
        }

        const testPopup = document.getElementById('testPopup');
        const testOptions = document.getElementById('testOptions');
        const testResult = document.getElementById('testResult');
        
        if(!testPopup || !testOptions) return;

        testResult.textContent = '';
        testOptions.innerHTML = '';
        testOptions.classList.remove('answered');

        const correctWord = lesson.words[Math.floor(Math.random() * lesson.words.length)];
        let options = [correctWord];
        
        // توليد خيارات عشوائية
        let safeCounter = 0;
        while (options.length < Math.min(4, lesson.words.length) && safeCounter < 50) {
            safeCounter++;
            const random = lesson.words[Math.floor(Math.random() * lesson.words.length)];
            if (!options.some(o => o.text === random.text)) options.push(random);
        }
        options.sort(() => Math.random() - 0.5);

        options.forEach(option => {
            const el = document.createElement('div');
            el.className = 'test-option';
            el.textContent = option.text;
            el.onclick = function() {
                if (testOptions.classList.contains('answered')) return;
                testOptions.classList.add('answered');
                if (option.text === correctWord.text) {
                    this.classList.add('correct');
                    testResult.textContent = 'أحسنت!';
                    testResult.style.color = 'green';
                    speak('أحسنت');
                } else {
                    this.classList.add('incorrect');
                    testResult.textContent = 'حاول مرة أخرى';
                    testResult.style.color = 'red';
                    speak('إجابة خاطئة');
                }
            };
            testOptions.appendChild(el);
        });

        testPopup.style.display = 'flex';
        setTimeout(() => speak(correctWord.text), 500);
        
    } catch(e) { console.error(e); }
}

async function startSpelling() {
    const gradeData = lessonsData[currentGrade];
    if(!gradeData) return;
    const lesson = gradeData[currentLessonIndex];
    if(!lesson || !lesson.words.length) return;

    const randomWord = lesson.words[Math.floor(Math.random() * lesson.words.length)];
    const wordText = randomWord.text.replace(/[.,!?;:]/g, '');
    
    const spellPopup = document.getElementById('spellPopup');
    const spellWord = document.getElementById('spellWord');
    const spellSyl = document.getElementById('spellSyllables');
    
    if(spellPopup) {
        spellWord.textContent = wordText;
        spellSyl.innerHTML = '';
        // تبسيط التهجئة هنا لتجنب التعقيد
        spellSyl.textContent = wordText; 
        spellPopup.style.display = 'flex';
        speak(wordText);
    }
}

// =============================================================
// تهيئة التطبيق
// =============================================================

function showMainNavigation() {
    const welcome = document.getElementById('welcomePopup');
    const mainNav = document.getElementById('mainNavigation');
    const appCont = document.getElementById('appContainer');
    
    if(welcome) welcome.style.display = 'none';
    if(appCont) appCont.style.display = 'none';
    if(mainNav) {
        mainNav.style.display = 'flex';
        const circles = document.getElementById('lessonsCirclesContainer');
        if(circles) {
            circles.innerHTML = '<div>جاري التحميل...</div>';
            fetchLessonData(1).then(data => {
                circles.innerHTML = '';
                if(!data || !data.length) { circles.innerHTML = 'لا توجد دروس'; return; }
                data.forEach((lesson, idx) => {
                    const div = document.createElement('div');
                    div.className = 'lesson-circle';
                    
                    let imgUrl = lesson.image || '';
                    if (imgUrl && !imgUrl.startsWith('http')) imgUrl = baseUrl + imgUrl;
                    
                    div.style.backgroundImage = `url('${imgUrl}')`;
                    div.innerHTML = `<div class="lesson-circle-content"><span class="number">${lesson.id}</span>${lesson.title}</div>`;
                    div.onclick = () => {
                        mainNav.style.display = 'none';
                        if(appCont) appCont.style.display = 'flex';
                        loadLesson(1, idx);
                    };
                    circles.appendChild(div);
                });
            });
        }
    }
}

async function updateProgressBar() {
    // تحديث بسيط للتقدم
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    if(fill && text) {
        const data = await fetchLessonData(1);
        if(!data.length) return;
        const done = Object.keys(userProgress).filter(k => k.startsWith('1-')).length;
        const pct = Math.round((done / data.length) * 100);
        fill.style.width = `${pct}%`;
        text.textContent = `التقدم: ${pct}%`;
    }
}

// تهيئة الأحداث عند التحميل
// =============================================================
// تهيئة التطبيق عند تحميل الصفحة (مصحح لمنع الانهيار)
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeSettingsUI();

        // حماية كود الصوت من التسبب في إيقاف التطبيق
        if ('speechSynthesis' in window) {
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = populateVoiceList;
            }
            populateVoiceList();
        }

        initializeSidebar();
        updateProgressBar();
    } catch (e) {
        console.error("Critical Init Error:", e);
        // في حال حدوث خطأ، نحاول تشغيل القائمة على الأقل
        initializeSidebar();
    }
});