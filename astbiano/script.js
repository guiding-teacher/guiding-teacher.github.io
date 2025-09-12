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
    mySurveysList.innerHTML = surveys.length ? '' : '<p>لم تقم بإدارة أي استفتاء بعد. ابدأ بإنشاء واحد جديد أو ابحث عن استفتاء موجود.</p>';
    surveys.forEach(survey => {
        const surveyCard = document.createElement('div');
        surveyCard.className = 'survey-item-card';
        surveyCard.innerHTML = `
            <div class="survey-item-header">
                <h3>${survey.title || 'استفتاء بدون عنوان'}</h3>
                <button class="delete-survey-btn" title="حذف الاستفتاء نهائياً">&#10006;</button>
            </div>
            <code>ID: ${survey.id}</code>`;

        surveyCard.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-survey-btn')) {
                loadSurveyForManagement(survey.id, survey.pin);
            }
        });

        surveyCard.querySelector('.delete-survey-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('هل أنت متأكد من رغبتك في حذف هذا الاستفتاء وكل ردوده بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.')) {
                deleteSurvey(survey.id);
            }
        });

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
            if (!surveyDoc.exists) throw new Error('لم يتم العثور على استفتاء بهذا المعرف.');
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

async function deleteSurvey(surveyId) {
    showLoader(true);
    try {
        const responsesQuery = await db.collection('responses').where('surveyId', '==', surveyId).get();
        if (!responsesQuery.empty) {
            const batch = db.batch();
            responsesQuery.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        await db.collection('surveys').doc(surveyId).delete();

        let surveys = getManagedSurveys();
        surveys = surveys.filter(s => s.id !== surveyId);
        localStorage.setItem('managedSurveys', JSON.stringify(surveys));
        
        showAlert('تم حذف الاستفتاء بنجاح.', 'success');
        initDashboardPage(); // Refresh list
    } catch (error) {
        console.error("Error deleting survey:", error);
        showAlert('حدث خطأ أثناء حذف الاستفتاء.', 'error');
    } finally {
        showLoader(false);
    }
}

async function loadSurveyForManagement(surveyId, surveyPin) {
    document.getElementById('dashboard-home').style.display = 'none';
    document.getElementById('survey-management-view').style.display = 'block';
    showLoader(true);
    
    try {
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) throw new Error("لم يتم العثور على الاستفتاء.");
        currentSurveyData = { id: surveyDoc.id, ...surveyDoc.data() };
        
        const responsesSnapshot = await db.collection('responses').where('surveyId', '==', surveyId).orderBy('timestamp', 'desc').get();
        currentSurveyResponses = responsesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        document.getElementById('survey-title-header').textContent = currentSurveyData.title;
        document.getElementById('response-count-tab').textContent = currentSurveyResponses.length;
        document.getElementById('edit-survey-link').href = `admin.html?id=${surveyId}`;
        document.getElementById('view-survey-link').href = `survey.html?id=${surveyId}`;
        
        const shareLink = `${window.location.origin}${window.location.pathname.replace(/dashboard\.html|admin\.html|results\.html/, 'survey.html')}?id=${surveyId}`;
        document.getElementById('survey-share-link-dashboard').value = shareLink;
        document.getElementById('copy-share-link-dashboard').onclick = () => copyToClipboard(shareLink, document.getElementById('copy-share-link-dashboard'));

        const savedIndexStr = localStorage.getItem(`lastViewedIndex_${surveyId}`);
        const savedIndex = savedIndexStr ? parseInt(savedIndexStr, 10) : 0;
        const initialIndex = (currentSurveyResponses.length > 0 && savedIndex < currentSurveyResponses.length) ? savedIndex : 0;

        setupDashboardControls();
        renderAllResponseViews(initialIndex);
        setupExportButtons(surveyId);

    } catch (error) {
        showAlert(error.message, 'error');
        document.getElementById('back-to-dashboard-btn').click();
    } finally {
        showLoader(false);
    }
}

function setupDashboardControls() {
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

    const toggle = document.getElementById('accepting-responses-toggle');
    toggle.checked = currentSurveyData.settings.acceptingResponses;
    toggle.onchange = async () => {
        const newState = toggle.checked;
        showLoader(true);
        try {
            await db.collection('surveys').doc(currentSurveyData.id).update({ 'settings.acceptingResponses': newState });
            currentSurveyData.settings.acceptingResponses = newState;
            showAlert(`تم ${newState ? 'فتح' : 'إغلاق'} استقبال الردود.`, 'success');
            renderAllResponseViews();
        } catch (err) {
            showAlert('فشل تحديث الحالة.', 'error');
            toggle.checked = !newState;
        } finally {
            showLoader(false);
        }
    };
}

function renderAllResponseViews(initialIndividualIndex = 0) {
    const settings = currentSurveyData.settings || {};
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', calendar: 'gregory', numberingSystem: 'latn' };
    document.getElementById('settings-summary-area').innerHTML = `
        <p><strong>حالة الاستفتاء:</strong> ${settings.acceptingResponses ? '<span style="color:var(--success-color);">يستقبل الردود</span>' : '<span style="color:var(--error-color);">مغلق</span>'}</p>
        <p><strong>الإجابات المتعددة:</strong> ${settings.allowMultipleSubmissions ? 'مسموح بها' : 'غير مسموح بها'}</p>
        <p><strong>عرض النتائج للعامة:</strong> ${settings.allowResultsView ? 'مسموح' : 'غير مسموح'}</p>
        <p><strong>شريط التقدم:</strong> ${settings.showProgress ? 'مُفعّل' : 'غير مُفعّل'}</p>
        <p><strong>تاريخ البدء:</strong> ${settings.startDate ? new Date(settings.startDate + 'T' + (settings.startTime || '00:00')).toLocaleString('ar-EG', dateOptions) : 'فوري'}</p>
        <p><strong>تاريخ الانتهاء:</strong> ${settings.endDate ? new Date(settings.endDate + 'T' + (settings.endTime || '23:59')).toLocaleString('ar-EG', dateOptions) : 'لا يوجد'}</p>
    `;

    if (currentSurveyResponses.length === 0) {
        const msg = '<div class="card" style="text-align:center;"><p>لا توجد ردود لعرضها حتى الآن.</p></div>';
        document.getElementById('summary-view').innerHTML = msg;
        document.getElementById('individual-view').innerHTML = msg;
        return;
    }
    renderSummaryView();
    renderIndividualView(initialIndividualIndex);
    setupIndividualNav();
}

function renderSummaryView(containerId = 'summary-view') {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    currentSurveyData.questions.forEach(q => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${q.text}</h3>`;
        const responsesForQ = currentSurveyResponses.map(r => r.answers.find(a => a.questionId === q.id)?.answer).filter(a => a != null && (Array.isArray(a) ? a.length > 0 : a !== ''));

        card.innerHTML += `<div class="answers-list">${responsesForQ.map(ans => `<p>${Array.isArray(ans) ? ans.join('، ') : ans}</p>`).join('') || '<em>لا توجد إجابات لهذا السؤال.</em>'}</div>`;

        const statsDiv = document.createElement('div');
        if (['radio', 'checkbox', 'dropdown', 'rating'].includes(q.type)) {
            const counts = {};
            responsesForQ.forEach(answer => {
                const answers = Array.isArray(answer) ? answer : [answer];
                answers.forEach(opt => { counts[opt] = (counts[opt] || 0) + 1; });
            });
            const denominator = q.type === 'checkbox' ? responsesForQ.length : Object.values(counts).reduce((a, b) => a + b, 0);
            (q.options || (q.type === 'rating' ? ['5', '4', '3', '2', '1'] : [])).forEach(opt => {
                const count = counts[opt] || 0;
                const percentage = denominator > 0 ? ((count / denominator) * 100).toFixed(1) : 0;
                statsDiv.innerHTML += `<div class="progress-bar-container"><div class="progress-bar-info"><span>${opt}${q.type === 'rating' ? ' نجوم' : ''}</span><span>${count} (${percentage}%)</span></div><div class="progress-bar-track"><div class="progress-bar" style="width:${percentage}%;"></div></div></div>`;
            });
        }
        statsDiv.innerHTML += `<p class="question-stats">إجمالي الردود على هذا السؤال: <strong>${responsesForQ.length}</strong> من أصل ${currentSurveyResponses.length} إجابة كلية.</p>`;
        card.appendChild(statsDiv);
        container.appendChild(card);
    });
}

function renderIndividualView(index) {
    if (currentSurveyData && currentSurveyData.id) {
        localStorage.setItem(`lastViewedIndex_${currentSurveyData.id}`, index);
    }
    currentIndividualResponseIndex = index;
    const container = document.getElementById('individual-response-content');
    const response = currentSurveyResponses[index];
    container.innerHTML = '';

    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', calendar: 'gregory', numberingSystem: 'latn' };
    const formattedDate = response.timestamp.toDate().toLocaleString('ar-EG', dateOptions);

    response.answers.forEach(answer => {
        const rawAnswer = answer.answer;
        const answerText = (rawAnswer && rawAnswer.length > 0) ? (Array.isArray(rawAnswer) ? rawAnswer.join('، ') : String(rawAnswer)) : '<em>لم تتم الإجابة</em>';
        const textToCopy = (rawAnswer && rawAnswer.length > 0) ? (Array.isArray(rawAnswer) ? rawAnswer.join('\n') : String(rawAnswer)) : '';
        const escapedTextToCopy = textToCopy.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/(\r\n|\n|\r)/gm, "\\n");

        container.innerHTML += `
            <div class="question-response">
                <div class="question-title">${answer.questionText}</div>
                <div class="answer-text">${answerText}</div>
                <div class="answer-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                    <span class="response-timestamp-small" style="font-size: 0.8em; color: #666;">${formattedDate}</span>
                    <button class="btn secondary small" onclick="copyToClipboard('${escapedTextToCopy}', this)">نسخ الرد</button>
                </div>
            </div>`;
    });
    
    const totalResponses = currentSurveyResponses.length;
    const displayIndex = totalResponses - index;
    document.getElementById('individual-counter').textContent = `عرض ${displayIndex} من ${totalResponses}`;
    document.getElementById('prev-response-btn').disabled = (index === 0);
    document.getElementById('next-response-btn').disabled = (index === totalResponses - 1);
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
        qCard.innerHTML = `<div class="admin-question-header"><h4>السؤال ${questionCounter}</h4><button type="button" class="btn small" onclick="this.closest('.admin-question-card').remove()">حذف</button></div><div class="form-group"><input type="text" class="q-text" value="${data.text || ''}" placeholder="نص السؤال" required></div><div class="form-group"><select class="q-type"><option value="text">نص قصير</option><option value="textarea">نص طويل</option><option value="radio">اختيار واحد</option><option value="checkbox">اختيار متعدد</option><option value="dropdown">قائمة منسدلة</option><option value="date">تاريخ</option><option value="time">وقت</option><option value="rating">تقييم نجوم</option></select></div><div class="q-options-container" style="display:none;"></div><div class="form-group checkbox-group"><input type="checkbox" class="q-required" id="q-req-${qId}" ${data.required ? 'checked':''}><label for="q-req-${qId}">سؤال إجباري</label></div>`;
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
            } else { optionsContainer.style.display = 'none'; }
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
        document.getElementById('admin-page-heading').textContent = 'تعديل الاستفتاء';
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
                document.getElementById('allow-multiple-submissions').checked = settings.allowMultipleSubmissions || false;
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
    } else { addQuestion({text: "اكتب هنا ", type: "textarea", required: true}); }
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
                allowMultipleSubmissions: document.getElementById('allow-multiple-submissions').checked,
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
        } finally { showLoader(false); }
    };
}

// ====== SURVEY PAGE LOGIC ======
async function initSurveyPage() {
    const surveyId = getSurveyIdFromUrl();
    const statusContainer = document.getElementById('status-container');
    const header = document.querySelector('.dashboard-header');
    
    const showStatus = (message, isError = true) => {
        if (header) header.style.display = 'none'; // Hide header on error
        document.getElementById('survey-main-content').innerHTML = '';
        const statusDiv = document.getElementById('status-container') || document.createElement('div');
        statusDiv.className = 'card';
        statusDiv.style.cssText = 'display: block; text-align: center; max-width: 600px; margin: 2rem auto;';
        statusDiv.innerHTML = `<h2 id="status-text">${message}</h2>`;
        if (isError) statusDiv.querySelector('h2').style.color = 'var(--error-color)';
        document.getElementById('survey-main-content').appendChild(statusDiv);
    };

    if (!surveyId) {
        showStatus('معرف الاستفتاء مفقود من الرابط.');
        return showLoader(false);
    }
    showLoader(true);
    
    try {
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) throw new Error('لم يتم العثور على الاستفتاء.');
        
        currentSurveyData = { id: surveyDoc.id, ...surveyDoc.data() };
        const settings = currentSurveyData.settings || {};
        
        // Populate header with survey details
        document.getElementById('survey-title-display').textContent = currentSurveyData.title;
        document.getElementById('survey-description-display').textContent = currentSurveyData.description || '';
        if (currentSurveyData.logoUrl) {
            document.getElementById('survey-logo-display').src = currentSurveyData.logoUrl;
            document.getElementById('survey-logo-display').style.display = 'block';
        }

        if (settings.allowMultipleSubmissions === false && localStorage.getItem(`submitted_${surveyId}`)) {
            const alreadySubmittedContainer = document.getElementById('already-submitted-container');
            const shareLinkInput = document.getElementById('survey-share-link-submitted');
            const shareLinkBtn = document.getElementById('copy-share-link-submitted');
            const shareLink = window.location.href;
            shareLinkInput.value = shareLink;
            shareLinkBtn.onclick = () => copyToClipboard(shareLink, shareLinkBtn);
            document.getElementById('survey-main-content').innerHTML = '';
            alreadySubmittedContainer.style.display = 'block';
            document.getElementById('survey-main-content').appendChild(alreadySubmittedContainer);
            return;
        }
        
        const now = new Date();
        if (settings.acceptingResponses === false) throw new Error('هذا الاستفتاء مغلق حاليًا ولا يستقبل ردودًا جديدة.');
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', calendar: 'gregory', numberingSystem: 'latn' };
        if (settings.startDate) {
            const start = new Date(settings.startDate + 'T' + (settings.startTime || '00:00'));
            if (now < start) throw new Error(`هذا الاستفتاء لم يبدأ بعد. سيبدأ في: ${start.toLocaleString('ar-EG', dateOptions)}`);
        }
        if (settings.endDate) {
            const end = new Date(settings.endDate + 'T' + (settings.endTime || '23:59'));
            if (now > end) throw new Error(`هذا الاستفتاء قد انتهى في: ${end.toLocaleString('ar-EG', dateOptions)}`);
        }

        const isMailbox = currentSurveyData.questions.length === 1 && currentSurveyData.questions[0].type === 'textarea';
        document.body.className = isMailbox ? 'mailbox-theme' : 'standard-theme';
        document.body.style.backgroundColor = isMailbox ? '' : (settings.backgroundColor || '#F0F2F5');
        
        document.getElementById('responder-form-content').innerHTML = currentSurveyData.questions.map(q => `<div class="question-card-responder"><label for="q-${q.id}" class="question-text">${q.text} ${q.required ? '<span style="color:red;">*</span>' : ''}</label>${renderQuestionInputForResponder(q)}</div>`).join('');
        const form = document.getElementById('survey-form-responder');
        form.style.display = 'flex';
        
        if (settings.showProgress) {
             document.getElementById('progress-container').style.display = 'block';
             form.addEventListener('input', updateProgressBar);
             updateProgressBar();
        }
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            let allValid = true;
            const answers = currentSurveyData.questions.map(q => {
                const answer = q.type === 'checkbox' ? formData.getAll(`q-${q.id}`) : formData.get(`q-${q.id}`);
                if (q.required && (!answer || answer.length === 0)) allValid = false;
                return { questionId: q.id, questionText: q.text, answer };
            });

            if (!allValid) return showAlert('الرجاء تعبئة الحقول الإجبارية.', 'error');
            
            showLoader(true);
            await db.collection('responses').add({ surveyId: currentSurveyData.id, answers, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            
            if(settings.allowMultipleSubmissions) {
                showAlert('تم إرسال إجابتك بنجاح!', 'success');
                e.target.reset();
                updateProgressBar();
            } else {
                localStorage.setItem(`submitted_${surveyId}`, 'true');
                document.getElementById('survey-main-content').innerHTML = '';
                const thankYouContainer = document.getElementById('thank-you-container');
                thankYouContainer.style.display = 'block';
                document.getElementById('survey-main-content').appendChild(thankYouContainer);
                
                document.getElementById('thank-you-text').textContent = settings.thankYouMessage || 'شكرًا لك، تم استلام ردك بنجاح.';
                
                const shareContainer = thankYouContainer.querySelector('.share-container');
                shareContainer.style.display = 'block';
                const shareLinkInput = document.getElementById('survey-share-link-after');
                const shareLinkBtn = document.getElementById('copy-share-link-after');
                const shareLink = window.location.href;
                shareLinkInput.value = shareLink;
                shareLinkBtn.onclick = () => copyToClipboard(shareLink, shareLinkBtn);

                if (settings.allowResultsView) {
                    document.getElementById('view-results-link').href = `results.html?id=${currentSurveyData.id}`;
                    document.getElementById('view-results-link').style.display = 'inline-block';
                }
            }
            showLoader(false);
        });

    } catch (error) {
        showStatus(error.message);
    } finally {
        showLoader(false);
    }
}

function renderQuestionInputForResponder(q) {
    const name = `q-${q.id}`; const req = q.required ? 'required' : '';
    switch (q.type) {
        case 'text': return `<input type="text" id="${name}" name="${name}" placeholder="إجابتك" ${req}>`;
        case 'textarea': return `<textarea id="${name}" name="${name}" placeholder="إجابتك المفصلة..." ${req}></textarea>`;
        case 'date': return `<input type="date" id="${name}" name="${name}" ${req}>`;
        case 'time': return `<input type="time" id="${name}" name="${name}" ${req}>`;
        case 'radio': return q.options.map((o, i) => `<div class="checkbox-group"><input type="radio" id="${name}-o-${i}" name="${name}" value="${o}" ${req}><label for="${name}-o-${i}">${o}</label></div>`).join('');
        case 'checkbox': return q.options.map((o, i) => `<div class="checkbox-group"><input type="checkbox" id="${name}-o-${i}" name="${name}" value="${o}"><label for="${name}-o-${i}">${o}</label></div>`).join('');
        case 'dropdown': return `<select id="${name}" name="${name}" ${req}><option value="">-- اختر --</option>${q.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
        case 'rating': return `<div class="rating-stars">${Array.from({length: 5}, (_, i) => 5 - i).map(v => `<input type="radio" id="${name}-r-${v}" name="${name}" value="${v}" ${req}><label for="${name}-r-${v}" title="${v} نجوم">★</label>`).join('')}</div>`;
        default: return '<p>نوع غير مدعوم.</p>';
    }
}

function updateProgressBar() {
    const form = document.getElementById('survey-form-responder');
    if (!form || !currentSurveyData) return;
    const requiredQuestions = currentSurveyData.questions.filter(q => q.required);
    if (requiredQuestions.length === 0) {
        document.getElementById('progress-bar-fill').style.width = '100%';
        return;
    }
    let filledCount = 0;
    const formData = new FormData(form);
    requiredQuestions.forEach(q => {
        const answer = q.type === 'checkbox' ? formData.getAll(`q-${q.id}`) : formData.get(`q-${q.id}`);
        if (answer && answer.length > 0) filledCount++;
    });
    const percentage = (filledCount / requiredQuestions.length) * 100;
    document.getElementById('progress-bar-fill').style.width = `${percentage}%`;
}

// ====== PUBLIC RESULTS PAGE LOGIC ======
async function initResultsPage() {
    const surveyId = getSurveyIdFromUrl();
    const contentDiv = document.getElementById('public-results-content');
    if (!surveyId) return contentDiv.innerHTML = '<h1>معرف الاستفتاء مفقود.</h1>';
    
    showLoader(true);
    try {
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) throw new Error("الاستفتاء غير موجود.");
        currentSurveyData = { id: surveyDoc.id, ...surveyDoc.data() };
        if (!currentSurveyData.settings?.allowResultsView) throw new Error("عذرًا، نتائج هذا الاستفتاء ليست متاحة للعرض العام.");
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
function setupExportButtons(surveyId) {
    document.getElementById('export-csv-btn').onclick = () => exportResponsesToCSV(surveyId);
    document.getElementById('export-pdf-btn').onclick = () => exportResponsesToPDF(surveyId);
}
function exportResponsesToCSV(surveyId) {
    if (!currentSurveyData || currentSurveyResponses.length === 0) return showAlert('لا توجد بيانات للتصدير.', 'info');
    showAlert('جاري تجهيز ملف CSV...', 'info');
    const headers = ['ResponseID', 'Timestamp', ...currentSurveyData.questions.map(q => `"${q.text.replace(/"/g, '""')}"`)];
    let csvContent = '\uFEFF' + headers.join(',') + '\r\n';
    currentSurveyResponses.forEach(response => {
        const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', calendar: 'gregory', numberingSystem: 'latn' };
        const rowData = [ response.id, `"${response.timestamp?.toDate ? response.timestamp.toDate().toLocaleString('en-CA', dateOptions) : 'N/A'}"`, ...currentSurveyData.questions.map(q => {
                const ans = response.answers.find(a => a.questionId === q.id)?.answer;
                if (ans == null) return '""';
                const text = Array.isArray(ans) ? ans.join('; ') : String(ans);
                return `"${text.replace(/"/g, '""')}"`;
            })];
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
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', calendar: 'gregory', numberingSystem: 'latn' };
    const tableBody = currentSurveyResponses.map((response, index) => [ index + 1, response.timestamp?.toDate ? response.timestamp.toDate().toLocaleDateString('ar-EG', dateOptions) : 'N/A', ...currentSurveyData.questions.map(q => {
            const ans = response.answers.find(a => a.questionId === q.id)?.answer;
            return ans == null ? '' : (Array.isArray(ans) ? ans.join('، ') : String(ans));
        })]);
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
    const yearSpan = document.getElementById('current-year');
    if(yearSpan) yearSpan.textContent = new Date().getFullYear();
    
    if (path.includes('dashboard.html')) initDashboardPage();
    else if (path.includes('survey.html')) initSurveyPage();
    else if (path.includes('admin.html')) initAdminPage();
    else if (path.includes('results.html')) initResultsPage();
});