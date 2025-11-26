// =============================================================
// إعدادات التطبيق والمتغيرات (نسخة آمنة للأندرويد)
// =============================================================
let currentGrade = 1;
let currentLessonIndex = 0;
let isTeaching = false;
let voices = [];
const lessonsData = {}; 
let isSpellingActive = false; 
const baseUrl = "https://guiding-teacher.github.io/drsne/";

// متغير فحص أمان للمتصفح
const hasBrowserSpeech = typeof speechSynthesis !== 'undefined';

let currentSpeakingResolve = null; 
let currentSpeakTimeout = null;

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
// دوال النطق
// =============================================================
function populateVoiceList() {
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

function speak(text) {
    return new Promise((resolve) => {
        if (!text) { resolve(); return; }

        let resolved = false;
        const finish = () => {
            if (!resolved) { resolved = true; resolve(); }
        };

        setTimeout(finish, 3000);

        try {
            let rate = userSettings.speechRate || 1;
            let pitch = userSettings.voicePitch || 1;

            if (typeof Android !== 'undefined') {
                Android.speakArabic(text, rate.toString(), pitch.toString());
                let charDelay = 120 / rate; 
                let estimatedTime = Math.max(1000, text.length * charDelay);
                setTimeout(finish, estimatedTime);
                return;
            }

            if (hasBrowserSpeech) {
                if (speechSynthesis.speaking) {
                    speechSynthesis.cancel();
                }

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ar-SA';
                utterance.rate = parseFloat(rate);
                utterance.pitch = parseFloat(pitch);
                
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
// تحميل البيانات وعرض الدروس
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
        return [];
    }
}

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

        const titleEl = document.getElementById('lesson-title');
        const numEl = document.getElementById('lesson-number');
        if(titleEl) titleEl.textContent = lesson.title;
        if(numEl) numEl.textContent = lesson.id;

        const imgContainer = document.getElementById('lesson-image');
        if (imgContainer) {
            const img = imgContainer.querySelector('img');
            
            if (img && lesson.image) {
                let imageUrl = lesson.image;
                if (!imageUrl.startsWith('http')) {
                    if (imageUrl.startsWith('/')) imageUrl = imageUrl.substring(1);
                    if (imageUrl.startsWith('drsne/')) imageUrl = imageUrl.replace('drsne/', '');
                    imageUrl = baseUrl + imageUrl;
                }
                img.src = imageUrl;
                img.alt = lesson.title;
                img.style.display = 'block'; 
                imgContainer.style.display = 'block';
            } else {
                imgContainer.style.display = 'none';
            }
        }

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
        speak("أَهْلًا بِكَ يَا صَدِيقِي، سَوْفَ نَدْرُسُ مَعًا الآنَ دَرْسَ الْقِرَاءَةِ. رَدِّدْ وَرَائِي الْكَلِمَاتِ التَّالِيَةَ لِتَحْفَظَهَا."); 
        await new Promise(r => setTimeout(r, 10000));

        for (const wordEl of wordElements) {
            if (!isTeaching) break;
            const wordText = wordEl.dataset.wordText;
            const repetitions = parseInt(userSettings.wordRepetitions) || 3;
            
            for (let i = 0; i < repetitions; i++) {
                if (!isTeaching) break;
                
                wordElements.forEach(w => w.classList.remove('active-reading'));
                wordEl.classList.add('active-reading');
                
                await speak(wordText);
                
                if (isTeaching && i < repetitions - 1) {
                    await new Promise(r => setTimeout(r, 1000)); 
                }
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
             alert('لا توجد كلمات كافية للاختبار');
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
// منطق التهجئة
// =============================================================
async function startSpelling() {
    const gradeData = lessonsData[currentGrade];
    if(!gradeData) return;
    const lesson = gradeData[currentLessonIndex];
    if(!lesson || !lesson.words.length) return;

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
            if (!isSpellingActive) return;
            await speak("هَيَّا نَتَهَجَّى");
            
            if (!isSpellingActive) return;
            await new Promise(r => setTimeout(r, 500));

            for (let item of syllableElements) {
                if (!isSpellingActive) break; 
                item.el.style.background = "#ffff00";
                item.el.style.transform = "scale(1.1)";
                await speak(item.text);
                if (!isSpellingActive) break; 
                item.el.style.background = "#e3f2fd";
                item.el.style.transform = "scale(1)";
                await new Promise(r => setTimeout(r, 300));
            }

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

function splitIntoSyllables(word) {
    const syllables = [];
    let currentChunk = "";
    
    const harakat = ['َ', 'ُ', 'ِ', 'ً', 'ٌ', 'ٍ'];
    const sukun = 'ْ';
    const shadda = 'ّ';
    const longVowels = ['ا', 'و', 'ي', 'ى']; 

    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const nextChar = word[i + 1];
        currentChunk += char;

        if (harakat.includes(char) || char === sukun || char === shadda) {
            continue;
        }

        if (!nextChar) {
            syllables.push(currentChunk);
            currentChunk = "";
            continue;
        }

        if (harakat.includes(nextChar) || nextChar === sukun || nextChar === shadda) {
            continue;
        }

        const afterNext = word[i + 2];
        const isNextLongVowel = longVowels.includes(nextChar) && 
                                (!afterNext || (!harakat.includes(afterNext) && afterNext !== sukun && afterNext !== shadda));

        if (isNextLongVowel) {
            continue;
        }
        
        syllables.push(currentChunk);
        currentChunk = "";
    }

    if (currentChunk) syllables.push(currentChunk);
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

    const voicePitchEl = document.getElementById('voicePitch');
    if (voicePitchEl) {
        voicePitchEl.innerHTML = `
            <option value="0.5">غليظ (منخفض)</option>
            <option value="1">طبيعي</option>
            <option value="1.5">حاد (مرتفع)</option>
        `;
        voicePitchEl.value = userSettings.voicePitch || 1;
    }

    const highlightHarakatEl = document.getElementById('highlightHarakat');
    if (highlightHarakatEl) {
        highlightHarakatEl.innerHTML = `
            <option value="true">مفعل (تلوين الحركات)</option>
            <option value="false">غير مفعل</option>
        `;
        highlightHarakatEl.value = userSettings.highlightHarakat;
    }

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
            item.innerHTML = `<i class="fas fa-book-open" style="margin-left:8px;"></i> ${lesson.id}. ${lesson.title}`;
            
            item.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                const backdrop = document.getElementById('sidebarBackdrop');
                if(sidebar) sidebar.classList.remove('active');
                if(backdrop) backdrop.classList.remove('active');

                const mainNav = document.getElementById('mainNavigation');
                const appCont = document.getElementById('appContainer');
                if(mainNav) mainNav.style.display = 'none';
                if(appCont) appCont.style.display = 'flex';

                loadLesson(1, index);
            });
            listContainer.appendChild(item);
        });
        
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
        
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if(sidebar) sidebar.classList.remove('active');
        if(backdrop) backdrop.classList.remove('active');
    }
}

// =============================================================
// تهيئة التطبيق (نقطة الدخول والروابط)
// =============================================================

function attachGlobalListeners() {
    // 1. القائمة الجانبية
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const closeSidebarBtn = document.getElementById('closeSidebar');

    if(menuBtn) menuBtn.onclick = () => { if(sidebar) sidebar.classList.add('active'); if(backdrop) backdrop.classList.add('active'); };
    if(closeSidebarBtn) closeSidebarBtn.onclick = () => { if(sidebar) sidebar.classList.remove('active'); if(backdrop) backdrop.classList.remove('active'); };
    if(backdrop) backdrop.onclick = () => { if(sidebar) sidebar.classList.remove('active'); if(backdrop) backdrop.classList.remove('active'); };

    // 2. زر التهيئة (للتأكد من عمله من جميع الأماكن)
    const prepBtn = document.getElementById('gradePrepBtn');
    if (prepBtn) {
        prepBtn.onclick = () => {
            if (typeof window.showPrepCards === 'function') window.showPrepCards();
            else document.getElementById('prepCardsPopup').style.display = 'flex';
        };
    }
    const closePrepBtn = document.getElementById('closePrepCards');
    const prepPopup = document.getElementById('prepCardsPopup');
    if (closePrepBtn && prepPopup) closePrepBtn.onclick = () => prepPopup.style.display = 'none';

    // 3. أزرار المعلومات
    const aboutBtn = document.getElementById('aboutUs');
    if (aboutBtn) aboutBtn.onclick = () => showInfoPopup('من نحن', '<p style="text-align:center;">تطبيق القارئ الصغير</p>');
    
    const contactBtn = document.getElementById('contactUs');
    if (contactBtn) contactBtn.onclick = () => showInfoPopup('اتصل بنا', '<p style="text-align:center;">support@example.com</p>');

    const privacyBtn = document.getElementById('privacyPolicy');
    if (privacyBtn) privacyBtn.onclick = () => showInfoPopup('سياسة الخصوصية', '<p style="text-align:center;">نحترم خصوصيتك.</p>');

    const settingsMenuBtn = document.getElementById('settingsMenu');
    const settingsPopup = document.getElementById('settingsPopup');
    if (settingsMenuBtn && settingsPopup) settingsMenuBtn.onclick = () => {
        if(sidebar) sidebar.classList.remove('active');
        if(backdrop) backdrop.classList.remove('active');
        settingsPopup.style.display = 'flex';
    };

    const closeInfoBtn = document.getElementById('closeInfo');
    const infoPopup = document.getElementById('infoPopup');
    if (closeInfoBtn && infoPopup) closeInfoBtn.onclick = () => infoPopup.style.display = 'none';

    // 4. أزرار التحكم الرئيسية
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

    // ########################################################
    // حل مشكلة زر "السؤال التالي"
    // ########################################################
    const nextTestBtn = document.getElementById('nextTest');
    if(nextTestBtn) {
        nextTestBtn.onclick = () => {
            // ببساطة نعيد استدعاء دالة بدء الاختبار لتوليد سؤال جديد
            startTest();
        };
    }

    const spellBtn = document.getElementById('spell-button');
    if(spellBtn) spellBtn.onclick = startSpelling;
    
    const closeSpell = document.getElementById('closeSpell');
    const spellPopup = document.getElementById('spellPopup');
    if(closeSpell && spellPopup) {
        closeSpell.onclick = () => {
            spellPopup.style.display = 'none';
            isSpellingActive = false; 
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
    
    const saveSettingsBtn = document.getElementById('saveSettings');
    if(saveSettingsBtn) {
        saveSettingsBtn.onclick = () => {
            const wordRepVal = document.getElementById('wordRepetitions');
            if(wordRepVal) userSettings.wordRepetitions = wordRepVal.value;
            localStorage.setItem('readingAppSettings', JSON.stringify(userSettings));
            if(settingsPopup) settingsPopup.style.display = 'none';
        };
    }

    // ########################################################
    // حل مشكلة زر البحث (اذهب)
    // ########################################################
    const searchBtn = document.getElementById('search-button');
    const searchInput = document.getElementById('lesson-search');

    if (searchBtn && searchInput) {
        const performSearch = () => {
            const val = parseInt(searchInput.value);
            if (!val) {
                alert('الرجاء إدخال رقم الدرس');
                return;
            }
            
            // التأكد من أن البيانات محملة
            if (!lessonsData[currentGrade] || lessonsData[currentGrade].length === 0) {
                 // محاولة تحميل البيانات إذا لم تكن موجودة
                 fetchLessonData(currentGrade).then(() => performSearch());
                 return;
            }

            // البحث عن الدرس الذي يحمل هذا الـ ID
            const data = lessonsData[currentGrade];
            const foundIndex = data.findIndex(lesson => lesson.id == val);

            if (foundIndex !== -1) {
                loadLesson(currentGrade, foundIndex);
                searchInput.value = ''; // مسح الخانة
            } else {
                alert('رقم الدرس غير موجود');
            }
        };

        searchBtn.onclick = performSearch;

        // تفعيل البحث عند الضغط على Enter
        searchInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                performSearch();
            }
        });
    }

    // تفعيل القوائم المنسدلة في الإعدادات
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
}

async function preloadAllContent() {
    try {
        const data = await fetchLessonData(1);
        if (!data || !data.length) return;
        data.forEach(lesson => {
            if (lesson.image) {
                let imageUrl = lesson.image;
                if (!imageUrl.startsWith('http')) {
                    if (imageUrl.startsWith('/')) imageUrl = imageUrl.substring(1);
                    if (imageUrl.startsWith('drsne/')) imageUrl = imageUrl.replace('drsne/', '');
                    imageUrl = baseUrl + imageUrl;
                }
                const img = new Image();
                img.src = imageUrl;
            }
        });
    } catch (e) {
        console.error("Preload error:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeSettingsUI();
        attachGlobalListeners();
        if (hasBrowserSpeech) {
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = populateVoiceList;
            }
            populateVoiceList();
        }
        initializeSidebar();
        updateProgressBar();
        preloadAllContent(); 
    } catch (e) {
        console.error("Critical Init Error:", e);
        initializeSidebar();
    }
});