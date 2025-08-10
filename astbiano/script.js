// Universal Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyA4idIicapTuRwacbuzFeoAEJE6iUpQG9Y",
    authDomain: "mcqs-28ac8.firebaseapp.com",
    databaseURL: "https://mcqs-28ac8-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mcqs-28ac8",
    storageBucket: "mcqs-28ac8.appspot.com",
    messagingSenderId: "305239385864",
    appId: "1:305239385864:web:d2d44dd61f73a502b96ebd",
    measurementId: "G-2E3137CYTR"
};

// --- INITIALIZATION ---
try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase initialization error:", e);
    document.body.innerHTML = '<h1>خطأ فادح: فشل الاتصال بقاعدة البيانات.</h1>';
}
const db = firebase.firestore();

// --- GLOBALS ---
let currentSurveyData = null;
let currentSurveyResponses = [];
let currentIndividualResponseIndex = 0;

// --- HELPER FUNCTIONS ---
const showAlert = (message, type, duration = 4000) => {
    const container = document.getElementById('alert-container');
    if (!container) return;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.textContent = message;
    container.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), duration);
};
const showLoader = (show = true) => {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = show ? 'block' : 'none';
};
const getSurveyIdFromUrl = () => new URLSearchParams(window.location.search).get('id');
const hashPassword = async (password) => {
    try {
        const data = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            hash = (hash << 5) - hash + password.charCodeAt(i);
            hash |= 0;
        }
        return "fb_" + Math.abs(hash).toString(16);
    }
};
const copyToClipboard = (text, btn) => {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'تم النسخ!';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
    });
};

// --- LOCAL STORAGE FOR DASHBOARD ---
const getManagedSurveys = () => JSON.parse(localStorage.getItem('managedSurveys') || '[]');
const saveManagedSurvey = (id, pin, title) => {
    const surveys = getManagedSurveys();
    const existingIndex = surveys.findIndex(s => s.id === id);
    if (existingIndex > -1) {
        surveys[existingIndex].pin = pin || surveys[existingIndex].pin;
        surveys[existingIndex].title = title;
    } else {
        surveys.push({ id, pin, title });
    }
    localStorage.setItem('managedSurveys', JSON.stringify(surveys));
};

// ====== DASHBOARD PAGE LOGIC ======
function initDashboardPage() {
    const surveyLookupForm = document.getElementById('survey-lookup-form');
    const mySurveysList = document.getElementById('my-surveys-list');
    
    const surveys = getManagedSurveys();
    mySurveysList.innerHTML = surveys.length ? '' : '<p>لم تقم بإدارة أي استبيان بعد. ابدأ بإنشاء واحد جديد أو ابحث عن استبيان موجود.</p>';
    surveys.forEach(survey => {
        const surveyCard = document.createElement('div');
        surveyCard.className = 'survey-item-card';
        surveyCard.innerHTML = `<h3>${survey.title || 'استبيان بدون عنوان'}</h3><code>ID: ${survey.id}</code>`;
        surveyCard.onclick = () => loadSurveyForManagement(survey.id, survey.pin);
        mySurveysList.appendChild(surveyCard);
    });

    surveyLookupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('survey-id-input').value.trim();
        const pin = document.getElementById('survey-pin-input').value.trim();
        if (!id || !pin) return showAlert('الرجاء إدخال المعرف والرمز السري.', 'error');
        
        showLoader(true);
        try {
            const surveyDoc = await db.collection('surveys').doc(id).get();
            if (!surveyDoc.exists) throw new Error('لم يتم العثور على استبيان بهذا المعرف.');
            const data = surveyDoc.data();
            if ((await hashPassword(pin)) !== data.adminPinHash) throw new Error('الرمز السري غير صحيح.');
            
            saveManagedSurvey(id, pin, data.title);
            loadSurveyForManagement(id, pin);
        } catch (error) {
            showAlert(error.message, 'error');
        } finally {
            showLoader(false);
        }
    });

    document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
        document.getElementById('survey-management-view').style.display = 'none';
        document.getElementById('dashboard-home').style.display = 'block';
        initDashboardPage();
    });
}

async function loadSurveyForManagement(surveyId, surveyPin) {
    document.getElementById('dashboard-home').style.display = 'none';
    document.getElementById('survey-management-view').style.display = 'block';
    showLoader(true);
    
    try {
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) throw new Error("لم يتم العثور على الاستبيان.");
        currentSurveyData = { id: surveyDoc.id, ...surveyDoc.data() };
        
        const responsesSnapshot = await db.collection('responses').where('surveyId', '==', surveyId).orderBy('timestamp', 'desc').get();
        currentSurveyResponses = responsesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        document.getElementById('survey-title-header').textContent = currentSurveyData.title;
        document.getElementById('response-count-tab').textContent = currentSurveyResponses.length;
        document.getElementById('edit-survey-link').href = `admin.html?id=${surveyId}`;
        
        const shareLink = `${window.location.origin}${window.location.pathname.replace(/dashboard\.html|admin\.html|results\.html/, 'survey.html')}?id=${surveyId}`;
        document.getElementById('survey-share-link-dashboard').value = shareLink;
        document.getElementById('copy-share-link-dashboard').onclick = () => copyToClipboard(shareLink, document.getElementById('copy-share-link-dashboard'));

        setupDashboardControls();
        renderAllResponseViews();
        setupExportButtons(surveyId);

    } catch (error) {
        showAlert(error.message, 'error');
        document.getElementById('back-to-dashboard-btn').click();
    } finally {
        showLoader(false);
    }
}

function setupDashboardControls() {
    // Setup Tabs
    const setup = (btnClass, paneClass) => {
        const buttons = document.querySelectorAll(btnClass);
        const panes = document.querySelectorAll(paneClass);
        buttons.forEach(button => {
            button.onclick = () => {
                buttons.forEach(b => b.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));
                button.classList.add('active');
                const targetPane = document.getElementById(button.dataset.tab + '-content') || document.getElementById(button.dataset.subtab + '-view');
                if (targetPane) targetPane.classList.add('active');
            };
        });
    };
    setup('.tab-btn', '.tab-pane');
    setup('.sub-tab-btn', '.sub-tab-pane');

    // Setup Toggle Switch
    const toggle = document.getElementById('accepting-responses-toggle');
    toggle.checked = currentSurveyData.settings.acceptingResponses;
    toggle.onchange = async () => {
        const newState = toggle.checked;
        showLoader(true);
        try {
            await db.collection('surveys').doc(currentSurveyData.id).update({ 'settings.acceptingResponses': newState });
            currentSurveyData.settings.acceptingResponses = newState;
            showAlert(`تم ${newState ? 'فتح' : 'إغلاق'} استقبال الردود.`, 'success');
        } catch (err) {
            showAlert('فشل تحديث الحالة.', 'error');
            toggle.checked = !newState; // Revert on failure
        } finally {
            showLoader(false);
        }
    };
}

function renderAllResponseViews() {
    const settings = currentSurveyData.settings || {};
    document.getElementById('settings-summary-area').innerHTML = `
        <p><strong>حالة الاستبيان:</strong> ${settings.acceptingResponses ? '<span style="color:var(--success-color);">يستقبل الردود</span>' : '<span style="color:var(--error-color);">مغلق</span>'}</p>
        <p><strong>عرض النتائج للعامة:</strong> ${settings.allowResultsView ? 'مسموح' : 'غير مسموح'}</p>
        <p><strong>شريط التقدم:</strong> ${settings.showProgress ? 'مُفعّل' : 'غير مُفعّل'}</p>
        <p><strong>تاريخ البدء:</strong> ${settings.startDate ? new Date(settings.startDate + 'T' + (settings.startTime || '00:00')).toLocaleString('ar-SA') : 'فوري'}</p>
        <p><strong>تاريخ الانتهاء:</strong> ${settings.endDate ? new Date(settings.endDate + 'T' + (settings.endTime || '23:59')).toLocaleString('ar-SA') : 'لا يوجد'}</p>
    `;

    if (currentSurveyResponses.length === 0) {
        const msg = '<div class="card" style="text-align:center;"><p>لا توجد ردود لعرضها حتى الآن.</p></div>';
        document.getElementById('summary-view').innerHTML = msg;
        document.getElementById('individual-view').innerHTML = msg;
        return;
    }

    renderSummaryView();
    renderIndividualView(0);
    setupIndividualNav();
}

function renderSummaryView(containerId = 'summary-view') {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    currentSurveyData.questions.forEach(q => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${q.text}</h3>`;
        const responsesForQ = currentSurveyResponses.map(r => r.answers.find(a => a.questionId === q.id)?.answer).filter(a => a != null && a !== '');

        if (['radio', 'checkbox', 'dropdown', 'rating'].includes(q.type)) {
            const counts = {};
            let totalVotes = 0;
            responsesForQ.forEach(answer => {
                const answers = Array.isArray(answer) ? answer : [answer];
                answers.forEach(opt => { counts[opt] = (counts[opt] || 0) + 1; });
                totalVotes++;
            });
            const denominator = q.type === 'checkbox' ? responsesForQ.length : Object.values(counts).reduce((a, b) => a + b, 0);
            (q.options || (q.type === 'rating' ? ['5', '4', '3', '2', '1'] : [])).forEach(opt => {
                const count = counts[opt] || 0;
                const percentage = denominator > 0 ? ((count / denominator) * 100).toFixed(1) : 0;
                card.innerHTML += `
                    <div class="progress-bar-container">
                        <div class="progress-bar-info"><span>${opt}${q.type === 'rating' ? ' نجوم' : ''}</span><span>${count} (${percentage}%)</span></div>
                        <div class="progress-bar-track"><div class="progress-bar" style="width:${percentage}%;"></div></div>
                    </div>`;
            });
        } else {
            card.innerHTML += `<div class="answers-list" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;">
                ${responsesForQ.map(ans => `<p style="border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">${ans}</p>`).join('') || '<em>لا توجد إجابات نصية.</em>'}
            </div>`;
        }
        container.appendChild(card);
    });
}

function renderIndividualView(index) {
    currentIndividualResponseIndex = index;
    const container = document.getElementById('individual-response-content');
    const response = currentSurveyResponses[index];
    container.innerHTML = `<small style="color:var(--text-muted)">تاريخ الرد: ${response.timestamp.toDate().toLocaleString('ar-SA')}</small>`;
    
    response.answers.forEach(answer => {
        const answerText = (answer.answer && answer.answer.length) ? (Array.isArray(answer.answer) ? answer.answer.join('، ') : answer.answer) : '<em>لم تتم الإجابة</em>';
        container.innerHTML += `<div class="question-response"><div class="question-title">${answer.questionText}</div><div class="answer-text">${answerText}</div></div>`;
    });
    
    document.getElementById('individual-counter').textContent = `عرض ${index + 1} من ${currentSurveyResponses.length}`;
    document.getElementById('prev-response-btn').disabled = (index === 0);
    document.getElementById('next-response-btn').disabled = (index === currentSurveyResponses.length - 1);
}

function setupIndividualNav() {
    document.getElementById('next-response-btn').onclick = () => renderIndividualView(Math.min(currentIndividualResponseIndex + 1, currentSurveyResponses.length - 1));
    document.getElementById('prev-response-btn').onclick = () => renderIndividualView(Math.max(currentIndividualResponseIndex - 1, 0));
}

// ====== ADMIN/CREATE PAGE LOGIC ======
function initAdminPage() {
    const surveyId = getSurveyIdFromUrl();
    let questionCounter = 0;

    const addQuestion = (data = {}) => {
        const qId = `q_${++questionCounter}`;
        const qCard = document.createElement('div');
        qCard.className = 'admin-question-card';
        qCard.innerHTML = `
            <div class="admin-question-header"><h4>السؤال ${questionCounter}</h4><button type="button" class="btn small" onclick="this.closest('.admin-question-card').remove()">حذف</button></div>
            <div class="form-group"><input type="text" class="q-text" value="${data.text || ''}" placeholder="نص السؤال" required></div>
            <div class="form-group"><select class="q-type"><option value="text">نص قصير</option><option value="textarea">نص طويل</option><option value="radio">اختيار واحد</option><option value="checkbox">اختيار متعدد</option><option value="dropdown">قائمة منسدلة</option><option value="date">تاريخ</option><option value="time">وقت</option><option value="rating">تقييم نجوم</option></select></div>
            <div class="q-options-container" style="display:none;"></div>
            <div class="form-group checkbox-group"><input type="checkbox" class="q-required" id="q-req-${qId}" ${data.required ? 'checked':''}><label for="q-req-${qId}">سؤال إجباري</label></div>`;
        
        document.getElementById('questions-container').appendChild(qCard);
        const typeSelect = qCard.querySelector('.q-type');
        typeSelect.value = data.type || 'text';

        const handleTypeChange = () => {
            const optionsContainer = qCard.querySelector('.q-options-container');
            if (['radio', 'checkbox', 'dropdown'].includes(typeSelect.value)) {
                optionsContainer.style.display = 'block';
                if (!optionsContainer.innerHTML) {
                    optionsContainer.innerHTML = '<h6>الخيارات:</h6><div class="options-list"></div><button type="button" class="btn secondary small add-option-btn">إضافة خيار</button>';
                    optionsContainer.querySelector('.add-option-btn').onclick = () => addOptionToList(optionsContainer.querySelector('.options-list'));
                }
                const optionsList = optionsContainer.querySelector('.options-list');
                optionsList.innerHTML = '';
                (data.options && data.options.length ? data.options : ['']).forEach(opt => addOptionToList(optionsList, opt));
            } else {
                optionsContainer.style.display = 'none';
            }
        };
        const addOptionToList = (list, text = '') => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item';
            optionDiv.innerHTML = `<input type="text" value="${text}" placeholder="نص الخيار"><button type="button" class="btn small" onclick="this.parentElement.remove()">X</button>`;
            list.appendChild(optionDiv);
        };
        typeSelect.onchange = handleTypeChange;
        handleTypeChange();
    };

    document.getElementById('add-question-btn').onclick = () => addQuestion();

    if (surveyId) {
        document.getElementById('admin-page-heading').textContent = 'تعديل الاستبيان';
        showLoader(true);
        db.collection('surveys').doc(surveyId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const settings = data.settings || {};
                document.getElementById('survey-title').value = data.title;
                document.getElementById('survey-description').value = data.description;
                document.getElementById('survey-admin-pin').placeholder = "اتركه فارغاً للحفاظ على الرمز القديم";
                document.getElementById('survey-admin-pin').required = false;
                document.getElementById('accepting-responses').checked = settings.acceptingResponses !== false;
                document.getElementById('allow-results-view').checked = settings.allowResultsView || false;
                document.getElementById('show-progress').checked = settings.showProgress || false;
                document.getElementById('start-date').value = settings.startDate || '';
                document.getElementById('start-time').value = settings.startTime || '';
                document.getElementById('end-date').value = settings.endDate || '';
                document.getElementById('end-time').value = settings.endTime || '';
                document.getElementById('survey-logo-url').value = data.logoUrl || '';
                document.getElementById('background-color').value = settings.backgroundColor || '#F0F2F5';
                document.getElementById('thank-you-message').value = settings.thankYouMessage || '';
                data.questions.forEach(q => addQuestion(q));
            }
        }).finally(() => showLoader(false));
    } else {
        addQuestion({text: "اكتب رسالتك هنا...", type: "textarea", required: true});
    }

    document.getElementById('publish-btn').onclick = async () => {
        showLoader(true);
        const title = document.getElementById('survey-title').value;
        const pin = document.getElementById('survey-admin-pin').value;
        if (!title || (!surveyId && (!pin || pin.length < 4))) {
            showAlert('العنوان ورمز سري من 4 خانات على الأقل مطلوبان.', 'error');
            return showLoader(false);
        }

        const surveyData = {
            title,
            description: document.getElementById('survey-description').value,
            logoUrl: document.getElementById('survey-logo-url').value.trim() || null,
            settings: {
                acceptingResponses: document.getElementById('accepting-responses').checked,
                allowResultsView: document.getElementById('allow-results-view').checked,
                showProgress: document.getElementById('show-progress').checked,
                startDate: document.getElementById('start-date').value || null,
                startTime: document.getElementById('start-time').value || null,
                endDate: document.getElementById('end-date').value || null,
                endTime: document.getElementById('end-time').value || null,
                thankYouMessage: document.getElementById('thank-you-message').value,
                backgroundColor: document.getElementById('background-color').value,
            },
            questions: Array.from(document.querySelectorAll('.admin-question-card')).map(card => ({
                id: `q_${Math.random().toString(36).substr(2, 9)}`,
                text: card.querySelector('.q-text').value,
                type: card.querySelector('.q-type').value,
                required: card.querySelector('.q-required').checked,
                options: Array.from(card.querySelectorAll('.option-item input')).map(inp => inp.value.trim()).filter(Boolean)
            })),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (pin) surveyData.adminPinHash = await hashPassword(pin);
        
        try {
            let finalId = surveyId;
            if (surveyId) {
                await db.collection('surveys').doc(surveyId).set(surveyData, { merge: true });
            } else {
                surveyData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const docRef = await db.collection('surveys').add(surveyData);
                finalId = docRef.id;
            }
            saveManagedSurvey(finalId, pin, title);
            showAlert('تم النشر بنجاح! سيتم توجيهك للوحة التحكم.', 'success');
            setTimeout(() => window.location.href = `dashboard.html`, 1500);
        } catch (error) {
            showAlert(`فشل النشر: ${error.message}`, 'error');
        } finally {
            showLoader(false);
        }
    };
}

// ====== SURVEY PAGE LOGIC ======
async function initSurveyPage() {
    const surveyId = getSurveyIdFromUrl();
    const statusContainer = document.getElementById('status-container');
    if (!surveyId) {
        statusContainer.style.display = 'block';
        document.getElementById('status-text').textContent = 'معرف الاستبيان مفقود من الرابط.';
        return showLoader(false);
    }
    showLoader(true);
    try {
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) throw new Error('لم يتم العثور على الاستبيان.');
        
        const data = { id: surveyDoc.id, ...surveyDoc.data() };
        currentSurveyData = data;
        const settings = data.settings || {};

        // --- Check Survey Status ---
        const now = new Date();
        if (!settings.acceptingResponses) throw new Error('هذا الاستبيان مغلق حاليًا ولا يستقبل ردودًا جديدة.');
        if (settings.startDate) {
            const start = new Date(settings.startDate + 'T' + (settings.startTime || '00:00'));
            if (now < start) throw new Error(`هذا الاستبيان لم يبدأ بعد. سيبدأ في: ${start.toLocaleString('ar-SA')}`);
        }
        if (settings.endDate) {
            const end = new Date(settings.endDate + 'T' + (settings.endTime || '23:59'));
            if (now > end) throw new Error(`هذا الاستبيان قد انتهى في: ${end.toLocaleString('ar-SA')}`);
        }

        // --- Apply Theme ---
        const isMailbox = data.questions.length === 1 && data.questions[0].type === 'textarea';
        document.body.className = isMailbox ? 'mailbox-theme' : 'standard-theme';
        document.body.style.backgroundColor = isMailbox ? '' : (settings.backgroundColor || '#F0F2F5');
        
        const header = document.querySelector('.survey-header');
        if (!isMailbox && header) {
            header.style.display = 'block';
            document.getElementById('survey-title-display').textContent = data.title;
            if (data.logoUrl) {
                const logo = document.getElementById('survey-logo-display');
                logo.src = data.logoUrl; logo.style.display = 'block';
            }
        }
        
        // --- Render Form ---
        document.getElementById('responder-form-content').innerHTML = data.questions.map(q => `
            <div class="question-card-responder">
                <label for="q-${q.id}" class="question-text">${q.text} ${q.required ? '<span style="color:red;">*</span>' : ''}</label>
                ${renderQuestionInputForResponder(q)}
            </div>`).join('');
        document.getElementById('survey-form-responder').style.display = 'flex';
        
        if (settings.showProgress) {
             document.getElementById('progress-container').style.display = 'block';
             updateProgressBar(); // Initial call
        }
        
        // --- Form Submission ---
        document.getElementById('survey-form-responder').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const answers = [];
            let allValid = true;

            data.questions.forEach(q => {
                const answer = q.type === 'checkbox' ? formData.getAll(`q-${q.id}`) : formData.get(`q-${q.id}`);
                if (q.required && (!answer || answer.length === 0)) allValid = false;
                answers.push({ questionId: q.id, questionText: q.text, answer });
            });

            if (!allValid) return showAlert('الرجاء تعبئة الحقول الإجبارية.', 'error');
            
            showLoader(true);
            await db.collection('responses').add({ surveyId: data.id, answers, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            
            document.getElementById('survey-form-responder').style.display = 'none';
            if (header) header.style.display = 'none';
            if (document.getElementById('progress-container')) document.getElementById('progress-container').style.display = 'none';
            
            document.getElementById('thank-you-text').textContent = settings.thankYouMessage || 'شكرًا لك، تم استلام ردك بنجاح.';
            if(settings.allowResultsView){
                const resultsLink = document.getElementById('view-results-link');
                resultsLink.href = `results.html?id=${data.id}`;
                resultsLink.style.display = 'inline-block';
            }
            document.getElementById('thank-you-container').style.display = 'block';
            showLoader(false);
        });

    } catch (error) {
        statusContainer.style.display = 'block';
        document.getElementById('status-text').textContent = error.message;
    } finally {
        showLoader(false);
    }
}

function renderQuestionInputForResponder(q) {
    const name = `q-${q.id}`; const req = q.required ? 'required' : '';
    const onchange = currentSurveyData.settings.showProgress ? `onchange="updateProgressBar()"` : '';
    switch (q.type) {
        case 'text': case 'textarea': case 'date': case 'time': case 'dropdown':
            const type = q.type === 'textarea' ? 'textarea' : 'input';
            const inputType = q.type === 'dropdown' ? '' : `type="${q.type}"`;
            if (q.type === 'dropdown') return `<select id="${name}" name="${name}" ${req} ${onchange}><option value="">-- اختر --</option>${q.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
            return `<${type==='textarea'?'textarea':'input'} id="${name}" name="${name}" ${inputType} placeholder="إجابتك..." ${req} ${onchange}></${type==='textarea'?'textarea':'input'}>`;
        case 'radio': return q.options.map((o, i) => `<div class="checkbox-group"><input type="radio" id="${name}-o-${i}" name="${name}" value="${o}" ${req} ${onchange}><label for="${name}-o-${i}">${o}</label></div>`).join('');
        case 'checkbox': return q.options.map((o, i) => `<div class="checkbox-group"><input type="checkbox" id="${name}-o-${i}" name="${name}" value="${o}" ${onchange}><label for="${name}-o-${i}">${o}</label></div>`).join('');
        case 'rating': return `<div class="rating-stars">${Array.from({length: 5}, (_, i) => 5 - i).map(v => `<input type="radio" id="${name}-r-${v}" name="${name}" value="${v}" ${req} ${onchange}><label for="${name}-r-${v}" title="${v} نجوم">★</label>`).join('')}</div>`;
        default: return '<p>نوع غير مدعوم.</p>';
    }
}

function updateProgressBar() {
    const requiredInputs = currentSurveyData.questions.filter(q => q.required);
    if (requiredInputs.length === 0) return;

    let filledCount = 0;
    requiredInputs.forEach(q => {
        const el = document.querySelector(`[name="q-${q.id}"]`);
        if (el) {
            if (q.type === 'checkbox') {
                if (document.querySelector(`[name="q-${q.id}"]:checked`)) filledCount++;
            } else if (el.value) {
                filledCount++;
            }
        }
    });
    
    const percentage = (filledCount / requiredInputs.length) * 100;
    document.getElementById('progress-bar-fill').style.width = `${percentage}%`;
}


// ====== PUBLIC RESULTS PAGE LOGIC ======
async function initResultsPage() {
    const surveyId = getSurveyIdFromUrl();
    const contentDiv = document.getElementById('public-results-content');
    if (!surveyId) return contentDiv.innerHTML = '<h1>معرف الاستبيان مفقود.</h1>';
    
    showLoader(true);
    try {
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) throw new Error("الاستبيان غير موجود.");
        currentSurveyData = { id: surveyDoc.id, ...surveyDoc.data() };

        if (!currentSurveyData.settings?.allowResultsView) {
            throw new Error("عذرًا، نتائج هذا الاستبيان ليست متاحة للعرض العام.");
        }
        document.getElementById('results-title').textContent = `نتائج: ${currentSurveyData.title}`;

        const responsesSnapshot = await db.collection('responses').where('surveyId', '==', surveyId).get();
        currentSurveyResponses = responsesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        renderSummaryView('public-results-content');

    } catch (error) {
        contentDiv.innerHTML = `<div class="card" style="text-align:center;"><h2 style="color:var(--error-color);">خطأ</h2><p>${error.message}</p></div>`;
    } finally {
        showLoader(false);
    }
}


// ====== EXPORT FUNCTIONS (for Dashboard) ======
function exportResponsesToCSV(surveyId) {
    if (!currentSurveyData || currentSurveyResponses.length === 0) return showAlert('لا توجد بيانات للتصدير.', 'info');
    showAlert('جاري تجهيز ملف CSV...', 'info');
    const headers = ['ResponseID', 'Timestamp', ...currentSurveyData.questions.map(q => `"${q.text.replace(/"/g, '""')}"`)];
    let csvContent = '\uFEFF' + headers.join(',') + '\r\n';
    currentSurveyResponses.forEach(response => {
        const rowData = [
            response.id,
            `"${response.timestamp?.toDate ? response.timestamp.toDate().toLocaleString('ar-SA') : 'N/A'}"`,
            ...currentSurveyData.questions.map(q => {
                const ans = response.answers.find(a => a.questionId === q.id)?.answer;
                if (ans == null) return '""';
                const text = Array.isArray(ans) ? ans.join('; ') : String(ans);
                return `"${text.replace(/"/g, '""')}"`;
            })
        ];
        csvContent += rowData.join(',') + '\r\n';
    });
    const link = document.createElement("a");
    link.setAttribute("href", 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    link.setAttribute("download", `survey_${surveyId}_responses.csv`);
    link.click();
}
function exportResponsesToPDF(surveyId) {
    if (!currentSurveyData || currentSurveyResponses.length === 0) return showAlert('لا توجد بيانات للتصدير.', 'info');
    showAlert('جاري تجهيز ملف PDF...', 'info');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.addFont('Amiri-Regular-normal.js', 'Amiri-Regular', 'normal');
    doc.setFont('Amiri-Regular');
    const tableHeaders = [['#', 'تاريخ الإجابة', ...currentSurveyData.questions.map(q => q.text)]];
    const tableBody = currentSurveyResponses.map((response, index) => [
        index + 1,
        response.timestamp?.toDate ? response.timestamp.toDate().toLocaleDateString('ar-SA') : 'N/A',
        ...currentSurveyData.questions.map(q => {
            const ans = response.answers.find(a => a.questionId === q.id)?.answer;
            return ans == null ? '' : (Array.isArray(ans) ? ans.join('، ') : String(ans));
        })
    ]);
    doc.autoTable({
        head: tableHeaders, body: tableBody, startY: 25,
        theme: 'grid', styles: { font: 'Amiri-Regular', halign: 'right', fontSize: 8 },
        headStyles: { fillColor: [74, 85, 162], textColor: 255, fontStyle: 'bold', halign: 'center' },
        didDrawPage: data => {
            doc.setR2L(true); doc.setFontSize(18);
            doc.text(`نتائج: ${currentSurveyData.title}`, doc.internal.pageSize.getWidth() - 14, 15, { align: 'right' });
        },
    });
    doc.save(`survey_${surveyId}_responses.pdf`);
}


// ====== PAGE ROUTER ======
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) initDashboardPage();
    else if (path.includes('survey.html')) initSurveyPage();
    else if (path.includes('admin.html')) initAdminPage();
    else if (path.includes('results.html')) initResultsPage();
});