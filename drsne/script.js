// =============================================================
// إعدادات التطبيق والمتغيرات (نسخة آمنة للأندرويد)
// =============================================================
let currentGrade = 1;
let currentLessonIndex = 0;
let isTeaching = false;
let voices = [];
const lessonsData = {}; 
let isSpellingActive = false; // متغير جديد للتحكم في التهجئة
// رابط موقعك الأساسي (تأكد من وجود الشرطة المائلة في النهاية)
const baseUrl = "https://guiding-teacher.github.io/drsne/";

// متغير فحص أمان للمتصفح (هل يدعم الصوت؟)
const hasBrowserSpeech = typeof speechSynthesis !== 'undefined';

// متغيرات للتحكم في النطق
let currentSpeakingResolve = null; 
let currentSpeakTimeout = null;

// تحميل الإعدادات المحفوظة
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
// دوال النطق الآمنة (تم الإصلاح لمنع الكراش)
// =============================================================

function populateVoiceList() {
    // حماية قصوى: لا تنفذ شيئاً إذا لم يكن المتصفح يدعم الصوت
    if (!hasBrowserSpeech) return;

    try {
        voices = speechSynthesis.getVoices();
        const arabicVoices = voices.filter(voice => voice.lang.startsWith('ar'));
        const voiceSelectEl = document.getElementById('voiceSelect');
        
        if (voiceSelectEl) {
            voiceSelectEl.innerHTML = '<option value="">الصوت الافتراضي</option>';
            arabicVoices.forEach(voice => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.voiceURI;
                voiceSelectEl.appendChild(option);
            });
            voiceSelectEl.value = userSettings.selectedVoiceURI || '';
        }
    } catch (e) {
        console.warn("Error getting voices:", e);
    }
}

// دالة النطق الرئيسية (مصححة 100%)
 // دالة النطق الرئيسية (تدعم السرعة والنبرة في التطبيق)
function speak(text) {
    return new Promise((resolve) => {
        if (!text) { resolve(); return; }

        let resolved = false;
        const finish = () => {
            if (!resolved) { resolved = true; resolve(); }
        };

        // مؤقت أمان
        setTimeout(finish, 3000);

        try {
            // جلب الإعدادات الحالية من المتغيرات
            let rate = userSettings.speechRate || 1;
            let pitch = userSettings.voicePitch || 1;

            // 1. الأولوية لتطبيق الأندرويد (نرسل النص + السرعة + النبرة)
            if (typeof Android !== 'undefined') {
                // نرسل الأرقام كنصوص (String) لتجنب مشاكل التوافق
                Android.speakArabic(text, rate.toString(), pitch.toString());
                
                // تقدير وقت الانتظار بناءً على السرعة
                // كلما زادت السرعة، قل وقت الانتظار
                let charDelay = 120 / rate; 
                let estimatedTime = Math.max(1000, text.length * charDelay);
                
                setTimeout(finish, estimatedTime);
                return;
            }

            // 2. المتصفح العادي
            if (hasBrowserSpeech) {
                if (speechSynthesis.speaking) {
                    speechSynthesis.cancel();
                }

                const utterance = new SpeechSynthesisUtterance(text);
                
                // إعدادات المتصفح
                utterance.lang = 'ar-SA';
                utterance.rate = parseFloat(rate);
                utterance.pitch = parseFloat(pitch);
                
                // محاولة اختيار الصوت المفضل للمتصفح فقط
                if (voices.length > 0 && userSettings.selectedVoiceURI) {
                    const selectedVoice = voices.find(v => v.voiceURI === userSettings.selectedVoiceURI);
                    if (selectedVoice) utterance.voice = selectedVoice;
                }
                
                utterance.onend = finish;
                utterance.onerror = finish;
                
                speechSynthesis.speak(utterance);
            } else {
                finish();
            }
            
        } catch (error) {
            console.error("Speech error:", error);
            finish();
        }
    });
}

const stopTeaching = () => {
    isTeaching = false;
    
    // إيقاف آمن
    if (typeof Android !== 'undefined') {
        Android.stopSpeaking();
    } else if (hasBrowserSpeech) {
        speechSynthesis.cancel();
    }
    
    if (currentSpeakTimeout) clearTimeout(currentSpeakTimeout);
    if (currentSpeakingResolve) currentSpeakingResolve();
    
    const teachBtn = document.getElementById('teach-me-button');
    if(teachBtn) teachBtn.disabled = false;
    document.querySelectorAll('.word').forEach(word => word.classList.remove('active-reading'));
};

// =============================================================
// تحميل البيانات وعرض الدروس (مع إصلاح الصور)
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
        if(typeof Android === 'undefined') alert("فشل تحميل البيانات: " + error.message);
        return [];
    }
}

// =============================================================
// عرض الدرس (مع إصلاح نهائي لمسار الصور)
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

        // 1. تحديث العناوين
        const titleEl = document.getElementById('lesson-title');
        const numEl = document.getElementById('lesson-number');
        if(titleEl) titleEl.textContent = lesson.title;
        if(numEl) numEl.textContent = lesson.id;

        // 2. إصلاح الصور (الجزء المهم)
        const imgContainer = document.getElementById('lesson-image');
        if (imgContainer) {
            const img = imgContainer.querySelector('img');
            
            if (img && lesson.image) {
                let imageUrl = lesson.image;

                // إذا لم يكن الرابط يبدأ بـ http (أي أنه رابط داخلي)
                if (!imageUrl.startsWith('http')) {
                    
                    // تنظيف الرابط من أي شرطة مائلة في البداية
                    if (imageUrl.startsWith('/')) imageUrl = imageUrl.substring(1);
                    
                    // منع تكرار اسم المجلد "drsne" إذا كان موجوداً في البيانات
                    if (imageUrl.startsWith('drsne/')) {
                        imageUrl = imageUrl.replace('drsne/', '');
                    }
                    
                    // دمج الرابط الأساسي مع مسار الصورة النظيف
                    imageUrl = baseUrl + imageUrl;
                }

                // تعيين الرابط وإجبار الصورة على الظهور
                img.src = imageUrl;
                img.alt = lesson.title;
                img.style.display = 'block'; 
                imgContainer.style.display = 'block';
                
            } else {
                // في حال عدم وجود صورة، نخفي الحاوية حتى لا تأخذ مساحة
                imgContainer.style.display = 'none';
            }
        }

        // 3. تحديث الكلمات
        const wordsContainer = document.getElementById('words-container');
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

        const prevBtn = document.getElementById('prev-lesson');
        const nextBtn = document.getElementById('next-lesson');
        if(prevBtn) prevBtn.disabled = index === 0;
        if(nextBtn) nextBtn.disabled = index === gradeData.length - 1;

    } catch (e) {
        console.error("Error in loadLesson:", e);
    }
}

// =============================================================
// منطق التعليم والاختبار
// =============================================================

async function startTeaching() {
    if (isTeaching) return;
    isTeaching = true;
    const teachBtn = document.getElementById('teach-me-button');
    if(teachBtn) teachBtn.disabled = true;

    const wordElements = Array.from(document.querySelectorAll('.word'));
    if (wordElements.length === 0) { stopTeaching(); return; }

    try {
        // ============================================================
        // 👇 التعديل هنا: تسريع البداية
        // ============================================================
        
        // 1. نرسل أمر النطق (بدون await) لكي لا يوقف الكود
        speak("أَهْلًا بِكَ يَا صَدِيقِي، سَوْفَ نَدْرُسُ مَعًا الآنَ دَرْسَ الْقِرَاءَةِ. رَدِّدْ وَرَائِي الْكَلِمَاتِ التَّالِيَةَ لِتَحْفَظَهَا."); 
        
        // 2. ننتظر ثانيتين فقط (2000 ميلي ثانية) ثم نبدأ الدرس فوراً
        await new Promise(r => setTimeout(r, 10000));

        // ============================================================

        for (const wordEl of wordElements) {
            if (!isTeaching) break;
            const wordText = wordEl.dataset.wordText;
            const repetitions = parseInt(userSettings.wordRepetitions) || 3;
            
            for (let i = 0; i < repetitions; i++) {
                if (!isTeaching) break;
                
                // تلوين الكلمة
                wordElements.forEach(w => w.classList.remove('active-reading'));
                wordEl.classList.add('active-reading');
                
                // نطق الكلمة
                await speak(wordText);
                
                // الانتظار بين التكرارات
                if (isTeaching && i < repetitions - 1) {
                    await new Promise(r => setTimeout(r, 1000)); // ثانية واحدة بين التكرار
                }
            }
            // الانتظار قبل الانتقال للكلمة التالية
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

 // =============================================================
// منطق التهجئة (تقسيم الكلمة صوتياً)
// =============================================================
async function startSpelling() {
    const gradeData = lessonsData[currentGrade];
    if(!gradeData) return;
    const lesson = gradeData[currentLessonIndex];
    if(!lesson || !lesson.words.length) return;

    // تفعيل المتغير عند البدء
    isSpellingActive = true; 

    const randomWord = lesson.words[Math.floor(Math.random() * lesson.words.length)];
    const wordText = randomWord.text;
    
    const spellPopup = document.getElementById('spellPopup');
    const spellWord = document.getElementById('spellWord');
    const spellSyl = document.getElementById('spellSyllables');
    
    if(spellPopup) {
        spellWord.textContent = wordText;
        spellSyl.innerHTML = '';

        const syllables = splitIntoSyllables(wordText);
        const syllableElements = [];

        syllables.forEach((syl, index) => {
            const span = document.createElement('span');
            span.className = 'syllable-box';
            span.textContent = syl;
            span.style.cssText = "display:inline-block; margin:5px; padding:10px 15px; background:#e3f2fd; border:2px solid #2196F3; border-radius:10px; cursor:pointer; font-size:24px;";
            
            span.onclick = () => {
                span.style.background = "#ffff00";
                speak(syl).then(() => {
                    span.style.background = "#e3f2fd";
                });
            };
            
            spellSyl.appendChild(span);
            syllableElements.push({ el: span, text: syl });

            if (index < syllables.length - 1) {
                const dash = document.createElement('span');
                dash.textContent = "-";
                dash.style.margin = "0 5px";
                dash.style.color = "#ccc";
                spellSyl.appendChild(dash);
            }
        });

        spellPopup.style.display = 'flex';

        try {
            // التحقق قبل النطق الأول
            if (!isSpellingActive) return;
            await speak("هَيَّا نَتَهَجَّى");
            
            if (!isSpellingActive) return;
            await new Promise(r => setTimeout(r, 500));

            // الحلقة: التحقق قبل نطق كل مقطع
            for (let item of syllableElements) {
                if (!isSpellingActive) break; // توقف إذا أغلقت النافذة

                item.el.style.background = "#ffff00";
                item.el.style.transform = "scale(1.1)";
                
                await speak(item.text);
                
                if (!isSpellingActive) break; // توقف مرة أخرى للتأكيد

                item.el.style.background = "#e3f2fd";
                item.el.style.transform = "scale(1)";
                await new Promise(r => setTimeout(r, 300));
            }

            // النطق النهائي
            if (isSpellingActive) {
                await new Promise(r => setTimeout(r, 500));
                if (!isSpellingActive) return;
                
                spellWord.style.color = "green";
                await speak(wordText);
                spellWord.style.color = "";
            }

        } catch(e) { console.error(e); }
    }
}


// دالة تقسيم الكلمة العربية إلى مقاطع صوتية (ذكية)
function splitIntoSyllables(word) {
    const syllables = [];
    let currentChunk = "";
    
    // الحروف المتحركة والحركات
    const harakat = ['َ', 'ُ', 'ِ', 'ً', 'ٌ', 'ٍ'];
    const sukun = 'ْ';
    const shadda = 'ّ';
    const longVowels = ['ا', 'و', 'ي', 'ى']; 

    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const nextChar = word[i + 1];
        
        currentChunk += char;

        // إذا كان الحرف الحالي حركة أو شدة، نتابع للحرف التالي ولا نقطع هنا
        if (harakat.includes(char) || char === sukun || char === shadda) {
            continue;
        }

        // قواعد القطع:
        // 1. إذا وصلنا لآخر حرف، انتهى المقطع.
        if (!nextChar) {
            syllables.push(currentChunk);
            currentChunk = "";
            continue;
        }

        // 2. إذا كان الحرف القادم شدة أو حركة أو سكون، فهو تابع للحرف الحالي (لا تقطع).
        if (harakat.includes(nextChar) || nextChar === sukun || nextChar === shadda) {
            continue;
        }

        // 3. حروف المد (ا، و، ي) الساكنة تتبع ما قبلها (مقطع طويل)
        // الشرط: الحرف القادم حرف مد وليس عليه حركة
        const afterNext = word[i + 2];
        const isNextLongVowel = longVowels.includes(nextChar) && 
                                (!afterNext || (!harakat.includes(afterNext) && afterNext !== sukun && afterNext !== shadda));

        if (isNextLongVowel) {
            continue; // الحرف القادم مد، ضمه للمقطع الحالي
        }
        
        // 4. الحرف الساكن يتبع ما قبله (المقطع الساكن)
        // تم التعامل معه في الخطوة رقم 2 (nextChar === sukun)

        // إذا لم تنطبق الشروط أعلاه، فهذا يعني بداية مقطع جديد
        syllables.push(currentChunk);
        currentChunk = "";
    }

    // إضافة ما تبقى إن وجد
    if (currentChunk) syllables.push(currentChunk);

    // تنظيف المقاطع الفارغة
    return syllables.filter(s => s.trim().length > 0);
}

// =============================================================
// واجهة التنقل والقوائم
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
            circles.innerHTML = '<div style="width:100%; text-align:center;">جاري التحميل...</div>';
            fetchLessonData(1).then(data => {
                circles.innerHTML = '';
                if(!data || !data.length) { circles.innerHTML = 'لا توجد دروس'; return; }
                data.forEach((lesson, idx) => {
                    const div = document.createElement('div');
                    div.className = 'lesson-circle';
                    
                    // تصحيح مسار الصورة في الدوائر أيضاً
                    let imgUrl = lesson.image || '';
                    if (imgUrl && !imgUrl.startsWith('http')) {
                        if (imgUrl.startsWith('/')) imgUrl = imgUrl.substring(1);
                        if (imgUrl.startsWith('drsne/')) imgUrl = imgUrl.replace('drsne/', '');
                        imgUrl = baseUrl + imgUrl;
                    }
                    
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
 
function initializeSettingsUI() {
    // 1. ملء قائمة سرعة التحدث
    const speechRateEl = document.getElementById('speechRate');
    if (speechRateEl) {
        speechRateEl.innerHTML = `
            <option value="0.5">بطيء جداً</option>
            <option value="0.75">بطيء</option>
            <option value="1">عادي</option>
            <option value="1.25">سريع</option>
            <option value="1.5">سريع جداً</option>
        `;
        speechRateEl.value = userSettings.speechRate || 0.75;
    }

    // 2. ملء قائمة نبرة الصوت
    const voicePitchEl = document.getElementById('voicePitch');
    if (voicePitchEl) {
        voicePitchEl.innerHTML = `
            <option value="0.5">غليظ (منخفض)</option>
            <option value="1">طبيعي</option>
            <option value="1.5">حاد (مرتفع)</option>
        `;
        voicePitchEl.value = userSettings.voicePitch || 1;
    }

    // 3. ملء قائمة تمييز الحركات
    const highlightHarakatEl = document.getElementById('highlightHarakat');
    if (highlightHarakatEl) {
        highlightHarakatEl.innerHTML = `
            <option value="true">مفعل (تلوين الحركات)</option>
            <option value="false">غير مفعل</option>
        `;
        highlightHarakatEl.value = userSettings.highlightHarakat;
    }

    // 4. إعداد القيم الرقمية (التكرار والوقت)
    const wordRepetitionsEl = document.getElementById('wordRepetitions');
    if(wordRepetitionsEl) wordRepetitionsEl.value = userSettings.wordRepetitions || 3;

    const wordIntervalEl = document.getElementById('wordInterval');
    if(wordIntervalEl) wordIntervalEl.value = userSettings.wordInterval || 3;
}


async function initializeSidebar() {
    const listContainer = document.getElementById('grade1-lessons');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<div style="padding:10px; text-align:center;">جاري التحميل...</div>';
    
    try {
        const data = await fetchLessonData(1);
        listContainer.innerHTML = ''; 

        if (!data || data.length === 0) {
            listContainer.innerHTML = '<div style="padding:10px;">لا توجد دروس.</div>';
            return;
        }

        data.forEach((lesson, index) => {
            const item = document.createElement('div');
            item.className = 'lesson-item';
            // أيقونة واسم الدرس
            item.innerHTML = `<i class="fas fa-book-open" style="margin-left:8px;"></i> ${lesson.id}. ${lesson.title}`;
            
            item.addEventListener('click', () => {
                // عند الضغط: نغلق القائمة ونحمل الدرس
                const sidebar = document.getElementById('sidebar');
                const backdrop = document.getElementById('sidebarBackdrop');
                if(sidebar) sidebar.classList.remove('active');
                if(backdrop) backdrop.classList.remove('active');

                // إخفاء القائمة الرئيسية وإظهار الدرس
                const mainNav = document.getElementById('mainNavigation');
                const appCont = document.getElementById('appContainer');
                if(mainNav) mainNav.style.display = 'none';
                if(appCont) appCont.style.display = 'flex';

                loadLesson(1, index);
            });
            listContainer.appendChild(item);
        });
        
        // فتح القسم الخاص بالصف الأول تلقائياً
        const parentSection = listContainer.closest('.grade-section');
        if (parentSection) parentSection.classList.add('active');

    } catch(e) {
        console.error(e);
        listContainer.innerHTML = '<div style="color:red; padding:10px;">فشل التحميل</div>';
    }
}

async function updateProgressBar() {
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

function showInfoPopup(title, content) {
    const popup = document.getElementById('infoPopup');
    const titleEl = document.getElementById('infoTitle');
    const bodyEl = document.getElementById('infoBody');
    
    if (popup && titleEl && bodyEl) {
        titleEl.textContent = title;
        bodyEl.innerHTML = content;
        popup.style.display = 'flex';
        
        // إغلاق القائمة الجانبية عند فتح النافذة ليكون المظهر أفضل
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if(sidebar) sidebar.classList.remove('active');
        if(backdrop) backdrop.classList.remove('active');
    }
}


// =============================================================
// تهيئة التطبيق (نقطة الدخول)
// =============================================================

// إضافة المستمعين للأزرار
 function attachGlobalListeners() {
    // 1. أزرار القائمة الجانبية (الفتح والإغلاق)
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const closeSidebarBtn = document.getElementById('closeSidebar');

    if(menuBtn) {
        menuBtn.onclick = () => {
            if(sidebar) sidebar.classList.add('active');
            if(backdrop) backdrop.classList.add('active');
        };
    }

    if(closeSidebarBtn) {
        closeSidebarBtn.onclick = () => {
            if(sidebar) sidebar.classList.remove('active');
            if(backdrop) backdrop.classList.remove('active');
        };
    }

    if(backdrop) {
        backdrop.onclick = () => {
            if(sidebar) sidebar.classList.remove('active');
            if(backdrop) backdrop.classList.remove('active');
        };
    }

    // ============================================================
    // 👇 الجزء الجديد: إصلاح زر التهيئة والتدريب
    // ============================================================
    const prepBtn = document.getElementById('gradePrepBtn');
    if (prepBtn) {
        prepBtn.onclick = () => {
            // نحاول استدعاء الدالة من ملف prep.js
            if (typeof window.showPrepCards === 'function') {
                window.showPrepCards(1); // 1 = الصف الأول
            } else {
                // إذا لم يعمل ملف prep.js، نقوم بفتح النافذة يدوياً كحل احتياطي
                const popup = document.getElementById('prepCardsPopup');
                if (popup) popup.style.display = 'flex';
                else alert("نافذة التهيئة غير موجودة");
            }
        };
    }

    // زر إغلاق نافذة التهيئة
    const closePrepBtn = document.getElementById('closePrepCards');
    const prepPopup = document.getElementById('prepCardsPopup');
    if (closePrepBtn && prepPopup) {
        closePrepBtn.onclick = () => prepPopup.style.display = 'none';
    }
    // ============================================================


    // 2. أزرار المعلومات (من نحن، اتصل بنا...)
    // 1. زر من نحن (مع الوصف الجديد والأيقونات)
    const aboutBtn = document.getElementById('aboutUs');
    if (aboutBtn) {
        aboutBtn.onclick = () => {
            const content = `
                <div style="text-align: right; padding: 10px; font-family: 'Amiri', Tahoma, sans-serif; line-height: 1.8;">
                    <p style="color:#555; margin-bottom:15px; font-size:16px;">
                        <strong>تطبيق القارئ الصغير</strong> هو رفيق طفلك الذكي لتأسيس مهارات القراءة واللغة العربية للصف الأول الابتدائي.
                    </p>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        <li style="margin-bottom: 10px;">
                            📚 <strong>دروس شاملة:</strong> منهج متكامل مع صور توضيحية جذابة.
                        </li>
                        <li style="margin-bottom: 10px;">
                            🔊 <strong>نطق فصيح:</strong> استماع للنطق الصحيح لكل كلمة بوضوح.
                        </li>
                        <li style="margin-bottom: 10px;">
                            👨‍🏫 <strong>ميزة درسني:</strong> تكرار آلي للكلمات وكأن المعلم معك.
                        </li>
                        <li style="margin-bottom: 10px;">
                            🧩 <strong>التهجي الذكي:</strong> تحليل الكلمات إلى مقاطع صوتية ملونة.
                        </li>
                        <li style="margin-bottom: 10px;">
                            🏆 <strong>اختبارات ممتعة:</strong> تقييم مستوى الطفل بطريقة شيقة.
                        </li>
                        <li style="margin-bottom: 10px;">
                            ⚙️ <strong>إعدادات مرنة:</strong> تحكم في سرعة الصوت والتكرار.
                        </li>
                    </ul>
                    <div style="text-align:center; margin-top:20px; color:#4CAF50; font-weight:bold;">
                        صنع بحب ❤️ لأجل أطفالنا
                    </div>
                </div>
            `;
            showInfoPopup('من نحن', content);
        };
    }

    const contactBtn = document.getElementById('contactUs');
    if (contactBtn) {
        contactBtn.onclick = () => {
            // محتوى اتصل بنا مع الأيقونات
            const content = `
                <div style="text-align:center; padding:10px; font-family: Tahoma, sans-serif;">
                    <p style="margin-bottom:20px; color:#555;">تواصل معنا عبر:</p>
                    <a href="tel:+9647700000000" style="display:block; background:#f9f9f9; padding:10px; margin-bottom:10px; border-radius:10px; text-decoration:none; color:#333; border:1px solid #eee;">
                        <i class="fas fa-phone-alt" style="color:#4CAF50; margin-left:10px;"></i>
                        <span dir="ltr">+964 770 000 0000</span>
                    </a>
                    <a href="mailto:support@example.com" style="display:block; background:#f9f9f9; padding:10px; margin-bottom:20px; border-radius:10px; text-decoration:none; color:#333; border:1px solid #eee;">
                        <i class="fas fa-envelope" style="color:#F44336; margin-left:10px;"></i>
                        support@example.com
                    </a>
                    <div style="display:flex; justify-content:center; gap:25px; font-size:35px;">
                        <a href="https://api.whatsapp.com/send?phone=9647708077310" style="color:#25D366;"><i class="fab fa-whatsapp"></i></a>
                        <a href="tg://resolve?domain=T_abrahim" style="color:#0088cc;"><i class="fab fa-telegram"></i></a>
                        <a href="https://facebook.com/abrahimaabd" style="color:#1877F2;"><i class="fab fa-facebook"></i></a>
                    </div>
                </div>
            `;
            showInfoPopup('اتصل بنا', content);
        };
    }

    const privacyBtn = document.getElementById('privacyPolicy');
    if (privacyBtn) {
        privacyBtn.onclick = () => showInfoPopup('سياسة الخصوصية', '<p style="text-align:center; padding:10px;">نحن نحترم خصوصية الأطفال ولا نقوم بجمع اي بيانات عنهم او انشطتهم بالتطبيق مطلقا.</p>');
    }

    const settingsMenuBtn = document.getElementById('settingsMenu');
    const settingsPopup = document.getElementById('settingsPopup');
    if (settingsMenuBtn && settingsPopup) {
        settingsMenuBtn.onclick = () => {
            if(sidebar) sidebar.classList.remove('active');
            if(backdrop) backdrop.classList.remove('active');
            settingsPopup.style.display = 'flex';
        };
    }

    const closeInfoBtn = document.getElementById('closeInfo');
    const infoPopup = document.getElementById('infoPopup');
    if (closeInfoBtn && infoPopup) {
        closeInfoBtn.onclick = () => infoPopup.style.display = 'none';
    }

    // 3. الأزرار الأساسية (تشغيل، إعدادات، اختبار...)
    const startBtn = document.getElementById('startButton');
    if(startBtn) startBtn.onclick = showMainNavigation;
    
    const settingsBtn = document.getElementById('settings-button');
    if(settingsBtn && settingsPopup) settingsBtn.onclick = () => settingsPopup.style.display = 'flex';
    
    const closeSettings = document.getElementById('cancelSettings');
    if(closeSettings && settingsPopup) closeSettings.onclick = () => settingsPopup.style.display = 'none';

    const testBtn = document.getElementById('test-button');
    if(testBtn) testBtn.onclick = startTest;
    
    const closeTest = document.getElementById('closeTest');
    const testPopup = document.getElementById('testPopup');
    if(closeTest && testPopup) closeTest.onclick = () => testPopup.style.display = 'none';

    const spellBtn = document.getElementById('spell-button');
    if(spellBtn) spellBtn.onclick = startSpelling;
    
    const closeSpell = document.getElementById('closeSpell');
    const spellPopup = document.getElementById('spellPopup');
    if(closeSpell && spellPopup) {
        closeSpell.onclick = () => {
            spellPopup.style.display = 'none';
            
            // 1. تغيير المتغير لإيقاف الحلقة
            isSpellingActive = false; 
            
            // 2. إيقاف الصوت الحالي فوراً
            stopTeaching(); 
        };
    }
    
    const prevBtn = document.getElementById('prev-lesson');
    if(prevBtn) prevBtn.onclick = () => loadLesson(currentGrade, currentLessonIndex - 1);

    const nextBtn = document.getElementById('next-lesson');
    if(nextBtn) nextBtn.onclick = () => loadLesson(currentGrade, currentLessonIndex + 1);

    const teachBtn = document.getElementById('teach-me-button');
    if(teachBtn) teachBtn.onclick = startTeaching;
    
    const refreshBtn = document.getElementById('refresh-button');
    if(refreshBtn) refreshBtn.onclick = () => {
        if(isTeaching) stopTeaching();
        else loadLesson(currentGrade, currentLessonIndex);
    };

    const homeBtn = document.getElementById('home-button');
    if(homeBtn) homeBtn.onclick = showMainNavigation;
    
    // إعدادات قابلة للطي
    const settingsHeaders = document.querySelectorAll('.settings-section-header');
    settingsHeaders.forEach(header => {
        header.onclick = function() {
            const section = this.parentElement;
            section.classList.toggle('open');
            const content = section.querySelector('.settings-section-content');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        };
    });
    
    const saveSettingsBtn = document.getElementById('saveSettings');
    if(saveSettingsBtn) {
        saveSettingsBtn.onclick = () => {
            const wordRepVal = document.getElementById('wordRepetitions');
            if(wordRepVal) userSettings.wordRepetitions = wordRepVal.value;
            localStorage.setItem('readingAppSettings', JSON.stringify(userSettings));
            if(settingsPopup) settingsPopup.style.display = 'none';
        };
    }
}

// =============================================================
// دالة التحميل المسبق (لعمل التطبيق بدون إنترنت)
// =============================================================
async function preloadAllContent() {
    console.log("Starting preload...");
    try {
        // 1. جلب بيانات الدروس
        const data = await fetchLessonData(1);
        if (!data || !data.length) return;

        // 2. المرور على كل درس وتحميل صورته
        data.forEach(lesson => {
            if (lesson.image) {
                // معالجة الرابط (نفس المنطق المستخدم في عرض الدرس لضمان تطابق الكاش)
                let imageUrl = lesson.image;
                if (!imageUrl.startsWith('http')) {
                    if (imageUrl.startsWith('/')) imageUrl = imageUrl.substring(1);
                    if (imageUrl.startsWith('drsne/')) imageUrl = imageUrl.replace('drsne/', '');
                    imageUrl = baseUrl + imageUrl;
                }

                // 3. خدعة التحميل: إنشاء صورة مخفية
                // هذا السطر يجبر المتصفح على تحميل الصورة وحفظها في الكاش
                const img = new Image();
                img.src = imageUrl;
            }
        });
        
        console.log("Preloading images started in background...");
        
    } catch (e) {
        console.error("Preload error:", e);
    }
}


// التشغيل الآمن عند بدء التحميل
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("App initializing...");
        initializeSettingsUI();
        attachGlobalListeners();

        // حماية كود الصوت
        if (hasBrowserSpeech) {
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = populateVoiceList;
            }
            populateVoiceList();
        }

        initializeSidebar();
        updateProgressBar();
        
        // 👇👇 أضف هذا السطر هنا 👇👇
        preloadAllContent(); 
        // 👆👆 سيقوم بتحميل الصور في الخلفية فور فتح التطبيق 👆👆

        
    } catch (e) {
        console.error("Critical Init Error:", e);
        // حتى لو فشل شيء ما، نحاول عرض القائمة
        initializeSidebar();
    }
});