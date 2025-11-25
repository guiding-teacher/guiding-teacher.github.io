// =============================================================
// الإعدادات والمتغيرات الرئيسية
// =============================================================
let currentGrade = 1; // تثبيت الصف على 1
let currentLessonIndex = 0;
let isTeaching = false;
let voices = [];
const lessonsData = {}; 

// متغيرات للتحكم في النطق والإيقاف الفوري
let currentSpeakingResolve = null; // لحل الوعد (Promise) يدوياً عند الإيقاف
let currentSpeakTimeout = null;    // لإلغاء التوقيت عند الإيقاف

// تحميل الإعدادات والتقدم المحفوظ
let userProgress = JSON.parse(localStorage.getItem('readingAppProgress')) || {};

// الإعدادات الافتراضية
let userSettings = JSON.parse(localStorage.getItem('readingAppSettings')) || {
    wordRepetitions: 3,
    speechRate: 0.75,
    voicePitch: 1,
    wordInterval: 3,
    highlightHarakat: true,
    selectedVoiceURI: ''
};

// =============================================================
// تعريف عناصر DOM
// =============================================================
const welcomePopupEl = document.getElementById('welcomePopup');
const startButtonEl = document.getElementById('startButton');
const lessonNumberEl = document.getElementById('lesson-number');
const lessonTitleEl = document.getElementById('lesson-title');
const lessonImageEl = document.getElementById('lesson-image');
const wordsContainerEl = document.getElementById('words-container');
const prevLessonBtn = document.getElementById('prev-lesson');
const nextLessonBtn = document.getElementById('next-lesson');
const lessonSearchEl = document.getElementById('lesson-search');
const searchButtonEl = document.getElementById('search-button');
const teachMeButtonEl = document.getElementById('teach-me-button');
const refreshButtonEl = document.getElementById('refresh-button');
const settingsButtonEl = document.getElementById('settings-button');
const testButtonEl = document.getElementById('test-button');
const spellButtonEl = document.getElementById('spell-button');
const settingsPopupEl = document.getElementById('settingsPopup');
const testPopupEl = document.getElementById('testPopup');
const spellPopupEl = document.getElementById('spellPopup');
const infoPopupEl = document.getElementById('infoPopup');
const voiceSelectEl = document.getElementById('voiceSelect');
const wordRepetitionsEl = document.getElementById('wordRepetitions');
const speechRateEl = document.getElementById('speechRate');
const voicePitchEl = document.getElementById('voicePitch');
const wordIntervalEl = document.getElementById('wordInterval');
const highlightHarakatEl = document.getElementById('highlightHarakat');
const saveSettingsEl = document.getElementById('saveSettings');
const cancelSettingsEl = document.getElementById('cancelSettings');
const progressFillEl = document.getElementById('progressFill');
const progressTextEl = document.getElementById('progressText');
const testOptionsEl = document.getElementById('testOptions');
const testQuestionEl = document.getElementById('testQuestion');
const testResultEl = document.getElementById('testResult');
const closeTestEl = document.getElementById('closeTest');
const nextTestEl = document.getElementById('nextTest');
const spellWordEl = document.getElementById('spellWord');
const spellSyllablesEl = document.getElementById('spellSyllables');
const closeSpellEl = document.getElementById('closeSpell');
const spellAgainEl = document.getElementById('spellAgain');
const menuToggleEl = document.getElementById('menuToggle');
const sidebarEl = document.getElementById('sidebar');
const sidebarBackdropEl = document.getElementById('sidebarBackdrop');
const closeSidebarEl = document.getElementById('closeSidebar');
const aboutUsEl = document.getElementById('aboutUs');
const contactUsEl = document.getElementById('contactUs');
const privacyPolicyEl = document.getElementById('privacyPolicy');
const settingsMenuEl = document.getElementById('settingsMenu');
const allSettingsSections = document.querySelectorAll('.settings-section');
const infoTitleEl = document.getElementById('infoTitle');
const infoBodyEl = document.getElementById('infoBody');
const closeInfoEl = document.getElementById('closeInfo');

// =============================================================
// تحميل البيانات الديناميكي
// =============================================================
async function fetchLessonData(grade) {
    grade = 1; // تثبيت الصف
    if (lessonsData[grade]) {
        return lessonsData[grade];
    }
    try {
        const timestamp = new Date().getTime(); 
        const response = await fetch(`./data/grade${grade}.json?t=${timestamp}`);
        
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        
        const data = await response.json();
        lessonsData[grade] = data;
        return data;
    } catch (error) {
        console.error("Failed to load lesson data:", error);
        return [];
    }
}

// =============================================================
// دالة النطق المحسّنة (Fix 1: تحكم كامل في الإنهاء)
// =============================================================
 function speak(text) {
    return new Promise((resolve) => {
        // حماية: إذا كان النص فارغاً
        if (!text) { resolve(); return; }

        let resolved = false;
        
        // دالة لإنهاء الـ Promise مرة واحدة فقط
        const finish = () => {
            if (!resolved) {
                resolved = true;
                resolve();
            }
        };

        // 1. وضع مهلة زمنية قصوى (مثلاً 3 ثواني) لضمان عدم تعليق التطبيق أبداً
        setTimeout(finish, 3000);

        try {
            // أندرويد
            if (typeof Android !== 'undefined') {
                Android.speakArabic(text);
                // تقدير الوقت: 120ms لكل حرف، بحد أدنى ثانية واحدة
                let estimatedTime = Math.max(1000, text.length * 120);
                setTimeout(finish, estimatedTime);
                return;
            }

            // المتصفح
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }

            const utterance = new SpeechSynthesisUtterance(text);
            const selectedVoice = voices.find(voice => voice.voiceURI === userSettings.selectedVoiceURI);
            utterance.voice = selectedVoice || null;
            if (!selectedVoice) utterance.lang = 'ar-SA';
            
            utterance.rate = parseFloat(userSettings.speechRate) || 1;
            utterance.pitch = parseFloat(userSettings.voicePitch) || 1;
            
            utterance.onend = finish;
            utterance.onerror = finish; // في حال الخطأ نتابع ولا نتوقف
            
            speechSynthesis.speak(utterance);
            
        } catch (error) {
            console.error("Speech error:", error);
            finish(); // في حال انهيار الكود، نتابع فوراً
        }
    });
}

// =============================================================
// دوال التطبيق الرئيسية
// =============================================================

async function loadLesson(grade, index) {
    grade = 1;
    const gradeData = await fetchLessonData(grade);
    if (!gradeData || index < 0 || index >= gradeData.length) return;
    
    // تأكد من إيقاف أي درس سابق بشكل كامل
    stopTeaching();

    currentGrade = grade;
    currentLessonIndex = index;
    const lesson = gradeData[currentLessonIndex];

    lessonNumberEl.textContent = lesson.id;
    lessonTitleEl.textContent = lesson.title;
    lessonImageEl.querySelector('img').src = lesson.image;
    lessonImageEl.querySelector('img').alt = `صورة لدرس ${lesson.title}`;
    
    wordsContainerEl.innerHTML = '';
    lesson.words.forEach(word => {
        const wordEl = document.createElement('div');
        wordEl.className = 'word';
        wordEl.dataset.wordText = word.text;

        let wordHtml = '';
        if (userSettings.highlightHarakat && word.harakaPos && word.harakaPos.length > 0) {
            wordHtml = [...word.text].map((char, i) =>
                word.harakaPos.includes(i) ? `<span class="haraka">${char}</span>` : char
            ).join('');
        } else {
            wordHtml = word.text;
        }
        wordEl.innerHTML = wordHtml;

        wordEl.addEventListener('click', function() {
            if (isTeaching) return;
            speak(this.dataset.wordText);
            document.querySelectorAll('.word').forEach(w => w.classList.remove('highlighted'));
            this.classList.add('highlighted');
        });
        wordsContainerEl.appendChild(wordEl);
    });

    const lessonKey = `${currentGrade}-${lesson.id}`;
    if (!userProgress[lessonKey]) {
        userProgress[lessonKey] = { viewed: true };
        localStorage.setItem('readingAppProgress', JSON.stringify(userProgress));
        updateProgressBar();
    }

    prevLessonBtn.disabled = index === 0;
    nextLessonBtn.disabled = index === gradeData.length - 1;
}

// دالة إيقاف التدريس (مصححة لإلغاء التعليق)
const stopTeaching = () => {
    isTeaching = false;
    
    // 1. إيقاف المتصفح
    speechSynthesis.cancel();

    // 2. إيقاف التطبيق (أندرويد)
    if (typeof Android !== 'undefined') {
        Android.stopSpeaking();
    }

    // 3. (مهم جداً) إنهاء أي عملية انتظار حالية فوراً
    if (currentSpeakTimeout) {
        clearTimeout(currentSpeakTimeout);
        currentSpeakTimeout = null;
    }
    if (currentSpeakingResolve) {
        currentSpeakingResolve(); // هذا يحرر حلقة التكرار في startTeaching فوراً
        currentSpeakingResolve = null;
    }

    // إعادة حالة الأزرار والكلمات
    teachMeButtonEl.disabled = false;
    document.querySelectorAll('.word').forEach(word => word.classList.remove('active-reading'));
};

async function startTeaching() {
    if (isTeaching) return;
    isTeaching = true;
    teachMeButtonEl.disabled = true;

    const wordElements = Array.from(document.querySelectorAll('.word'));
    if (wordElements.length === 0) { stopTeaching(); return; }

    try {
        await speak("أَهْلًا بِكَ يَا صَدِيقِي، سَوْفَ نَدْرُسُ مَعًا الآنَ دَرْسَ الْقِرَاءَةِ. رَدِّدْ وَرَائِي الْكَلِمَاتِ التَّالِيَةَ لِتَحْفَظَهَا.");
        
        for (const wordEl of wordElements) {
            if (!isTeaching) break;
            
            const wordText = wordEl.dataset.wordText;
            const repetitions = parseInt(userSettings.wordRepetitions);
            const interval = parseInt(userSettings.wordInterval) * 1000;

            for (let i = 0; i < repetitions; i++) {
                if (!isTeaching) break;
                
                wordElements.forEach(w => w.classList.remove('active-reading'));
                wordEl.classList.add('active-reading');
                
                await speak(wordText);
                
                if (isTeaching && i < repetitions - 1) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                }
            }
            if (isTeaching) await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.log("Teaching stopped or error occurred", error);
    } finally {
        stopTeaching();
    }
}

// دالة الاختبار (Fix 2: ضمان ظهور النافذة قبل النطق)
/* في ملف script.js - استبدل دالة startTest القديمة بهذه الدالة المحسنة */
async function startTest() {
    console.log("Starting test..."); // للتجربة

    // 1. التأكد من وجود البيانات
    const gradeData = lessonsData[currentGrade];
    const lesson = gradeData ? gradeData[currentLessonIndex] : null;

    if (!lesson || !lesson.words || lesson.words.length < 2) {
        alert('لا توجد كلمات كافية في هذا الدرس لبدء الاختبار.');
        return;
    }

    try {
        // 2. إغلاق القوائم الأخرى وتنظيف الواجهة
        if (typeof sidebarEl !== 'undefined' && sidebarEl) sidebarEl.classList.remove('active');
        if (typeof sidebarBackdropEl !== 'undefined' && sidebarBackdropEl) sidebarBackdropEl.classList.remove('active');
        
        testResultEl.textContent = '';
        testOptionsEl.innerHTML = '';
        testOptionsEl.classList.remove('answered');

        // 3. اختيار الكزمة الصحيحة
        const correctWord = lesson.words[Math.floor(Math.random() * lesson.words.length)];
        
        // 4. تجهيز الخيارات (بدون حلقة لانهائية تسبب التعليق)
        // نأخذ كل الكلمات الأخرى، ونزيل الكلمة الصحيحة، ونزيل التكرار
        let otherWords = lesson.words.filter(w => w.text !== correctWord.text);
        
        // إزالة التكرار بناءً على نص الكلمة
        const uniqueOtherWords = [];
        const map = new Map();
        for (const item of otherWords) {
            if(!map.has(item.text)){
                map.set(item.text, true);
                uniqueOtherWords.push(item);
            }
        }

        // خلط الكلمات الأخرى واختيار 3 منها كحد أقصى
        uniqueOtherWords.sort(() => Math.random() - 0.5);
        const wrongOptions = uniqueOtherWords.slice(0, 3);

        // دمج الصحيحة مع الخاطئة
        let finalOptions = [correctWord, ...wrongOptions];
        
        // خلط الخيارات النهائية
        finalOptions.sort(() => Math.random() - 0.5);

        // 5. بناء واجهة الخيارات
        finalOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'test-option';
            optionEl.textContent = option.text;
            
            // إضافة مستمع الحدث (Click)
            optionEl.onclick = function() {
                if (testOptionsEl.classList.contains('answered')) return;
                testOptionsEl.classList.add('answered');

                if (option.text === correctWord.text) {
                    this.classList.add('correct');
                    testResultEl.textContent = 'إجابة صحيحة! أحسنت!';
                    testResultEl.style.color = '#4CAF50';
                    speak('أحسنت');
                } else {
                    this.classList.add('incorrect');
                    testResultEl.textContent = 'إجابة خاطئة، حاول مرة أخرى!';
                    testResultEl.style.color = '#f44336';
                    
                    // تمييز الإجابة الصحيحة
                    const allOptions = document.querySelectorAll('.test-option');
                    allOptions.forEach(opt => {
                        if (opt.textContent === correctWord.text) opt.classList.add('correct');
                    });
                    speak('إجابة خاطئة');
                }
            };
            testOptionsEl.appendChild(optionEl);
        });

        // 6. إظهار النافذة أخيراً
        testPopupEl.style.display = 'flex';

        // 7. نطق الكلمة (مع تأخير بسيط جداً لضمان رسم الواجهة أولاً)
        setTimeout(() => {
            speak(correctWord.text).catch(e => console.log("Speech error ignored"));
        }, 300);

    } catch (e) {
        console.error("Error in startTest:", e);
        alert("حدث خطأ غير متوقع في الاختبار، يرجى المحاولة مرة أخرى.");
        testPopupEl.style.display = 'none';
    }
}
 


async function startSpelling() {
    const gradeData = lessonsData[currentGrade];
    const lesson = gradeData ? gradeData[currentLessonIndex] : null;

    if (!lesson || lesson.words.length === 0) {
        alert('لا توجد كلمات في هذا الدرس للتهجئة.');
        return;
    }

    const randomWord = lesson.words[Math.floor(Math.random() * lesson.words.length)];
    const wordText = randomWord.text.replace(/[.,!?;:]/g, '');
    
    spellWordEl.textContent = wordText;
    spellSyllablesEl.innerHTML = '';

    const syllables = splitIntoSyllables(wordText);
    
    syllables.forEach((syllable, index) => {
        const syllableEl = document.createElement('span');
        syllableEl.className = 'syllable';
        syllableEl.textContent = syllable;
        syllableEl.addEventListener('click', () => {
            speak(syllable);
        });
        spellSyllablesEl.appendChild(syllableEl);
        
        if (index < syllables.length - 1) {
            const separator = document.createElement('span');
            separator.className = 'syllable-separator';
            separator.textContent = ' - ';
            spellSyllablesEl.appendChild(separator);
        }
    });

    spellPopupEl.style.display = 'flex';
    try {
        await speak(wordText);
    } catch(e) { console.error(e); }
}

function splitIntoSyllables(word) {
    const syllables = [];
    let currentSyllable = '';
    const harakat = 'ًٌٍَُِّْ';
    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        currentSyllable += char;
        if (harakat.includes(char)) {
             syllables.push(currentSyllable);
             currentSyllable = '';
        } else if (i + 1 < word.length && harakat.includes(word[i+1]) === false) {
             syllables.push(currentSyllable);
             currentSyllable = '';
        }
    }
    if (currentSyllable) {
        syllables.push(currentSyllable);
    }
    return syllables.length > 0 ? syllables : [word];
}

function showInfoPopup(title, content) {
    infoTitleEl.textContent = title;
    infoBodyEl.innerHTML = content;
    infoPopupEl.style.display = 'flex';
}

// =============================================================
// دوال التهيئة والمساعدة
// =============================================================

function populateVoiceList() {
    voices = speechSynthesis.getVoices();
    const arabicVoices = voices.filter(voice => voice.lang.startsWith('ar'));
    voiceSelectEl.innerHTML = '<option value="">الصوت الافتراضي</option>';
    arabicVoices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.voiceURI;
        voiceSelectEl.appendChild(option);
    });
    voiceSelectEl.value = userSettings.selectedVoiceURI;
}

function initializeSettingsUI() {
    speechRateEl.innerHTML = `
        <option value="0.5">بطيء جداً</option>
        <option value="0.75">بطيء</option>
        <option value="1">عادي</option>
        <option value="1.25">سريع</option>
        <option value="1.5">سريع جداً</option>`;
    voicePitchEl.innerHTML = `
        <option value="0.5">منخفض</option>
        <option value="1">عادي</option>
        <option value="1.5">مرتفع</option>`;
    highlightHarakatEl.innerHTML = `
        <option value="true">مفعل</option>
        <option value="false">غير مفعل</option>`;
        
    wordRepetitionsEl.value = userSettings.wordRepetitions;
    speechRateEl.value = userSettings.speechRate;
    voicePitchEl.value = userSettings.voicePitch;
    wordIntervalEl.value = userSettings.wordInterval;
    highlightHarakatEl.value = userSettings.highlightHarakat;
}

 async function initializeSidebar() {
    const grade = 1;
    const lessonsListEl = document.getElementById(`grade1-lessons`);
    if (!lessonsListEl) return;
    
    lessonsListEl.innerHTML = `<div style="padding:10px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>`;
    
    try {
        const gradeData = await fetchLessonData(grade);
        lessonsListEl.innerHTML = ''; 

        if (gradeData.length === 0) {
            lessonsListEl.innerHTML = `<div style="padding:10px;">لا توجد دروس.</div>`;
            return;
        }

        gradeData.forEach((lesson, index) => {
            const lessonItem = document.createElement('div');
            lessonItem.className = 'lesson-item';
            lessonItem.innerHTML = `<i class="fas fa-book-open" style="margin-left:8px; color:#4CAF50;"></i> ${lesson.id}. ${lesson.title}`;
            
            lessonItem.addEventListener('click', () => {
                loadLesson(grade, index);
                
                const sidebar = document.getElementById('sidebar');
                const backdrop = document.getElementById('sidebarBackdrop');
                if(sidebar) sidebar.classList.remove('active');
                if(backdrop) backdrop.classList.remove('active');

                const mainNav = document.getElementById('mainNavigation');
                const appCont = document.getElementById('appContainer');
                if(mainNav) mainNav.style.display = 'none';
                if(appCont) appCont.style.display = 'flex';
            });
            lessonsListEl.appendChild(lessonItem);
        });

        const parentSection = lessonsListEl.closest('.grade-section');
        if (parentSection) {
            parentSection.classList.add('active');
            lessonsListEl.style.display = 'block'; 
            lessonsListEl.style.maxHeight = '2000px'; 
        }

    } catch(e) {
        console.error(e);
        lessonsListEl.innerHTML = `<div style="padding:10px; color:red;">فشل التحميل.</div>`;
    }
}

async function updateProgressBar() {
    const gradeData = await fetchLessonData(1).catch(()=>[]);
    const totalLessons = gradeData.length;
    
    if (totalLessons === 0) {
        progressTextEl.textContent = `التقدم: (جاري التحميل)`;
        return;
    }
    
    const completedLessons = Object.keys(userProgress).filter(k => k.startsWith('1-')).length;
    const progressPercentage = Math.round((completedLessons / totalLessons) * 100);
    
    progressFillEl.style.width = `${progressPercentage}%`;
    progressTextEl.textContent = `التقدم: ${progressPercentage}%`;
}

// =============================================================
// إضافة أحداث المستخدم
// =============================================================

menuToggleEl.addEventListener('click', () => {
    sidebarEl.classList.toggle('active');
    sidebarBackdropEl.classList.toggle('active');
});
closeSidebarEl.addEventListener('click', () => {
    sidebarEl.classList.remove('active');
    sidebarBackdropEl.classList.remove('active');
});
sidebarBackdropEl.addEventListener('click', () => {
    sidebarEl.classList.remove('active');
    sidebarBackdropEl.classList.remove('active');
});
settingsButtonEl.addEventListener('click', () => {
    initializeSettingsUI();
    settingsPopupEl.style.display = 'flex';
});

testButtonEl.addEventListener('click', startTest);
spellButtonEl.addEventListener('click', startSpelling);

startButtonEl.addEventListener('click', () => {
    showMainNavigation();
});

allSettingsSections.forEach(section => {
    const header = section.querySelector('.settings-section-header');
    header.addEventListener('click', () => {
         section.classList.toggle('open');
         const content = section.querySelector('.settings-section-content');
         if (content.style.maxHeight) {
            content.style.maxHeight = null;
         } else {
            content.style.maxHeight = content.scrollHeight + "px";
         }
    });
});
saveSettingsEl.addEventListener('click', () => {
    userSettings = {
        wordRepetitions: parseInt(wordRepetitionsEl.value),
        speechRate: parseFloat(speechRateEl.value),
        voicePitch: parseFloat(voicePitchEl.value),
        wordInterval: parseInt(wordIntervalEl.value),
        highlightHarakat: highlightHarakatEl.value === 'true',
        selectedVoiceURI: voiceSelectEl.value
    };
    localStorage.setItem('readingAppSettings', JSON.stringify(userSettings));
    settingsPopupEl.style.display = 'none';
    loadLesson(currentGrade, currentLessonIndex);
});
cancelSettingsEl.addEventListener('click', () => {
    settingsPopupEl.style.display = 'none';
    initializeSettingsUI();
});

closeTestEl.addEventListener('click', () => testPopupEl.style.display = 'none');
nextTestEl.addEventListener('click', startTest);

closeSpellEl.addEventListener('click', () => spellPopupEl.style.display = 'none');
spellAgainEl.addEventListener('click', startSpelling);

closeInfoEl.addEventListener('click', () => infoPopupEl.style.display = 'none');

prevLessonBtn.addEventListener('click', () => loadLesson(currentGrade, currentLessonIndex - 1));
nextLessonBtn.addEventListener('click', () => loadLesson(currentGrade, currentLessonIndex + 1));
searchButtonEl.addEventListener('click', async () => {
    const lessonId = parseInt(lessonSearchEl.value);
    if (isNaN(lessonId)) return;
    const gradeData = await fetchLessonData(currentGrade);
    const lessonIndex = gradeData.findIndex(lesson => lesson.id === lessonId);
    if (lessonIndex !== -1) {
        loadLesson(currentGrade, lessonIndex);
        lessonSearchEl.value = '';
    } else {
        alert(`الدرس رقم ${lessonId} غير موجود.`);
    }
});

teachMeButtonEl.addEventListener('click', startTeaching);

refreshButtonEl.addEventListener('click', () => {
    // الزر البرتقالي: إما يوقف التدريس أو يعيد تحميل الدرس
    if (isTeaching) {
        stopTeaching();
    } else {
       loadLesson(currentGrade, currentLessonIndex);
    }
});

aboutUsEl.addEventListener('click', () => {
    showInfoPopup('من نحن', `<p>تطبيق تعليم القراءة للصف الأول الابتدائي هو تطبيق تفاعلي مصمم لمساعدة الأطفال على تعلم القراءة بطريقة ممتعة.</p>`);
});
 
contactUsEl.addEventListener('click', () => {
    showInfoPopup('اتصل بنا', `<p>للتواصل معنا: info@readingapp.com</p>`);
});

privacyPolicyEl.addEventListener('click', () => {
    showInfoPopup('سياسة الخصوصية', `<p>نحن نحرص على خصوصية بيانات أطفالكم ولا نجمع أي معلومات شخصية.</p>`);
});
settingsMenuEl.addEventListener('click', () => {
    initializeSettingsUI();
    settingsPopupEl.style.display = 'flex';
    sidebarEl.classList.remove('active');
    sidebarBackdropEl.classList.remove('active');
});

// =============================================================
// دوال واجهة التنقل
// =============================================================

function showMainNavigation() {
    document.getElementById('welcomePopup').style.display = 'none';
    document.getElementById('appContainer').style.display = 'none';
    
    document.getElementById('mainNavigation').style.display = 'flex';
    document.getElementById('lessonSelection').style.display = 'block';
    
    showLessonsCircles(1);
}

async function showLessonsCircles(grade) {
    grade = 1;
    const container = document.getElementById('lessonsCirclesContainer');
    const title = document.getElementById('selectedGradeTitle');
    
    const prepBtn = document.getElementById('gradePrepBtn');
    if (prepBtn) {
        prepBtn.onclick = function() {
            if (typeof window.showPrepCards === 'function') {
                window.showPrepCards(grade);
            }
        };
    }
    
    container.innerHTML = '<div style="font-size:20px; width:100%; text-align:center;"><i class="fas fa-spinner fa-spin"></i> جاري جلب الدروس...</div>';
    title.textContent = `دروس الصف الأول`;

    try {
        const data = await fetchLessonData(grade);
        container.innerHTML = ''; 

        if (data.length === 0) {
            container.innerHTML = '<h3>لا توجد دروس متاحة حالياً.</h3>';
            return;
        }

        data.forEach((lesson, index) => {
            const circle = document.createElement('div');
            circle.className = 'lesson-circle';
            circle.style.backgroundImage = `url('${lesson.image}')`; 
            
            circle.innerHTML = `
                <div class="lesson-circle-content">
                    <span class="number">درس ${lesson.id}</span>
                    ${lesson.title}
                </div>
            `;
            
            circle.addEventListener('click', () => {
                document.getElementById('mainNavigation').style.display = 'none';
                document.getElementById('appContainer').style.display = 'flex';
                loadLesson(grade, index);
            });

            container.appendChild(circle);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<h3 style="color:red">حدث خطأ في تحميل البيانات</h3>';
    }
}

function startMicrophone() {
    if (typeof Android !== 'undefined') {
        Android.startListening();
    } else {
        console.log("Using standard browser speech api");
    }
}

// =============================================================
// تهيئة التطبيق عند تحميل الصفحة
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    initializeSettingsUI();

    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList();
    
    initializeSidebar();
    updateProgressBar();
});