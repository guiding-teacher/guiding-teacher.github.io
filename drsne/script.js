// =============================================================
// الإعدادات والمتغيرات الرئيسية
// =============================================================
let currentGrade = 1; // تثبيت الصف على 1
let currentLessonIndex = 0;
let isTeaching = false;
let voices = [];
const lessonsData = {}; 

// تحميل الإعدادات والتقدم المحفوظ
let userProgress = JSON.parse(localStorage.getItem('readingAppProgress')) || {};

// --- تعديل: جعل الصوت الافتراضي بطيء (0.75) ليتطابق مع القائمة ويظهر بشكل صحيح ---
let userSettings = JSON.parse(localStorage.getItem('readingAppSettings')) || {
    wordRepetitions: 3,
    speechRate: 0.75, // تم التغيير من 0.3 إلى 0.75 (بطيء)
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
const gradeTitles = document.querySelectorAll('.grade-title');
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
    // دائماً نستخدم الصف الأول
    grade = 1;
    if (lessonsData[grade]) {
        return lessonsData[grade];
    }
    try {
        const response = await fetch(`data/grade${grade}.json`);
        
        if (!response.ok) throw new Error(`Could not fetch grade ${grade} data.`);
        const data = await response.json();
        lessonsData[grade] = data;
        return data;
    } catch (error) {
        console.error("Failed to load lesson data:", error);
        alert(`حدث خطأ أثناء تحميل البيانات.`);
        return [];
    }
}

// =============================================================
// دالة النطق المحسّنة (تدعم التطبيق والمتصفح)
// =============================================================
function speak(text) {
    return new Promise((resolve, reject) => {
        
        // 1. التحقق هل نحن داخل تطبيق الأندرويد؟
        if (typeof Android !== 'undefined') {
            Android.speakArabic(text);
            
            // تقدير الوقت لانتظار النطق في الأندرويد
            let estimatedTime = text.length * 120; 
            if (estimatedTime < 1000) estimatedTime = 1000; 
            
            setTimeout(() => {
                resolve();
            }, estimatedTime);
            return; 
        }

        // 2. المتصفح العادي
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }

        // --- تعديل: تقليل وقت الانتظار ---
        setTimeout(() => {
            if (!text || !isTeaching && text.length > 20) { 
                // إذا تم الإيقاف، لا تكمل إلا إذا كانت جملة قصيرة
            } 
            
            const utterance = new SpeechSynthesisUtterance(text);
            const selectedVoice = voices.find(voice => voice.voiceURI === userSettings.selectedVoiceURI);
            utterance.voice = selectedVoice || null;
            if (!selectedVoice) utterance.lang = 'ar-SA';
            
            utterance.rate = parseFloat(userSettings.speechRate);
            utterance.pitch = parseFloat(userSettings.voicePitch);
            
            utterance.onend = () => resolve();
            
            // --- تعديل هام: حل مشكلة التعليق عند الخطأ أو الإيقاف ---
            utterance.onerror = (event) => {
                // في حال حدوث خطأ أو إلغاء، ننهي الوعد فوراً لكي لا يعلق الزر
                resolve(); 
            };
            
            speechSynthesis.speak(utterance);
        }, 50);
    });
}

// =============================================================
// دوال التطبيق الرئيسية
// =============================================================

async function loadLesson(grade, index) {
    grade = 1;
    const gradeData = await fetchLessonData(grade);
    if (!gradeData || index < 0 || index >= gradeData.length) return;
    
    if (isTeaching) stopTeaching();

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

// --- تعديل: دالة إيقاف التدريس لضمان تفعيل الزر ---
const stopTeaching = () => {
    isTeaching = false;
    speechSynthesis.cancel();
    teachMeButtonEl.disabled = false; // إعادة تفعيل الزر إجبارياً
    document.querySelectorAll('.word').forEach(word => word.classList.remove('active-reading'));
};

async function startTeaching() {
    if (isTeaching) return;
    isTeaching = true;
    teachMeButtonEl.disabled = true;

    const wordElements = Array.from(document.querySelectorAll('.word'));
    if (wordElements.length === 0) {
        stopTeaching();
        return;
    }

    try {
        await speak(" أهلاً بك يا صديقي، سوف ندرس معاً الآن. ردد ورائي الكلمات التالية لتحفظها.");
        // التحقق بعد كل عملية نطق
        if (!isTeaching) throw new Error("Stopped");

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
        console.log("Teaching stopped or error:", error);
    } finally {
        stopTeaching(); // ضمان استدعاء التوقف في النهاية
    }
}

async function startTest() {
    const gradeData = lessonsData[currentGrade];
    const lesson = gradeData ? gradeData[currentLessonIndex] : null;

    if (!lesson || lesson.words.length < 2) {
        alert('لا توجد كلمات كافية لبدء الاختبار في هذا الدرس.');
        return;
    }
    
    testPopupEl.style.display = 'none';
    await new Promise(resolve => setTimeout(resolve, 200));

    const correctWord = lesson.words[Math.floor(Math.random() * lesson.words.length)];
    let options = [correctWord];

    while (options.length < Math.min(4, lesson.words.length)) {
        const randomWord = lesson.words[Math.floor(Math.random() * lesson.words.length)];
        if (!options.some(opt => opt.text === randomWord.text)) {
            options.push(randomWord);
        }
    }

    options.sort(() => Math.random() - 0.5);

    testResultEl.textContent = '';
    testOptionsEl.innerHTML = '';
    testOptionsEl.classList.remove('answered');

    options.forEach(option => {
        const optionEl = document.createElement('div');
        optionEl.className = 'test-option';
        optionEl.textContent = option.text;
        optionEl.addEventListener('click', function() {
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
                document.querySelectorAll('.test-option').forEach(opt => {
                    if (opt.textContent === correctWord.text) opt.classList.add('correct');
                });
                speak('إجابة خاطئة');
            }
        });
        testOptionsEl.appendChild(optionEl);
    });

    testPopupEl.style.display = 'flex';
    await new Promise(resolve => setTimeout(resolve, 1000));
    await speak(correctWord.text);
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
    await speak(wordText);
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
    // إعادة تعيين القيمة بعد ملء القائمة
    voiceSelectEl.value = userSettings.selectedVoiceURI;
}

function initializeSettingsUI() {
    // بناء القوائم أولاً
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
        
    // تعيين القيم من الإعدادات المحفوظة
    // تأكدنا في بداية الكود أن القيمة الافتراضية هي 0.75 إذا لم تكن موجودة
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
    
    lessonsListEl.innerHTML = `<div><i class="fas fa-spinner fa-spin"></i> جاري تحميل الدروس...</div>`;
    try {
        const gradeData = await fetchLessonData(grade);
        lessonsListEl.innerHTML = ''; 

        if (gradeData.length === 0) {
                lessonsListEl.innerHTML = `<div>لا توجد دروس حالياً.</div>`;
                return;
        }

        gradeData.forEach((lesson, index) => {
            const lessonItem = document.createElement('div');
            lessonItem.className = 'lesson-item';
            lessonItem.textContent = `${lesson.id}. ${lesson.title}`;
            lessonItem.addEventListener('click', () => {
                loadLesson(grade, index);
                sidebarEl.classList.remove('active');
                sidebarBackdropEl.classList.remove('active');
                document.getElementById('mainNavigation').style.display = 'none';
                document.getElementById('appContainer').style.display = 'flex';
            });
            lessonsListEl.appendChild(lessonItem);
        });
    } catch(e) {
            lessonsListEl.innerHTML = `<div><i class="fas fa-exclamation-triangle"></i> فشل تحميل الدروس.</div>`;
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
    // تحديث الواجهة عند فتح الإعدادات للتأكد من ظهور القيم
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

function sendTextToWeb(text) {
    var inputField = document.getElementById("search_input"); 
    if(inputField) {
        inputField.value = text;
    }
    alert("تم التعرف على: " + text); 
}

// =============================================================
// تهيئة التطبيق عند تحميل الصفحة
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    // تهيئة واجهة الإعدادات أولاً لتفادي الحقول الفارغة
    initializeSettingsUI();

    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    populateVoiceList();
    
    initializeSidebar();
    updateProgressBar();
});