// script.js (Your code with new features integrated)

// ====== Firebase Configuration ======
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

try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully.");
    } else {
        console.log("Firebase already initialized.");
    }
} catch (e) {
    console.error("Firebase initialization error:", e);
    const ac = document.getElementById('alert-container');
    if (ac) ac.innerHTML = `<div class="alert error" style="display:block;">خطأ فادح: فشل تهيئة Firebase. تأكد من صحة إعدادات FirebaseConfig في script.js. (${e.message})</div>`;
    throw new Error("Firebase initialization failed, stopping script execution.");
}

const db = firebase.firestore();
const storage = firebase.storage();

// ====== Common Helper Functions ======
function showAlert(message, type, duration = 5000, containerId = 'alert-container') {
    const alertContainer = document.getElementById(containerId);
    if (!alertContainer) {
        console.warn(`Alert container with ID "${containerId}" not found.`);
        window.alert(`${type.toUpperCase()}: ${message}`);
        return;
    }
    const alertId = 'alert-' + Date.now();
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.id = alertId;
    alertDiv.style.display = 'block';
    alertDiv.innerHTML = message;
    
    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
        const currentAlert = document.getElementById(alertId);
        if (currentAlert) {
           currentAlert.remove();
        }
    }, duration);
}


function generateUniqueId(prefix = '') {
    return prefix + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function getSurveyIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

async function hashPassword(password) {
    if (!password) return null;
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error("Hashing error (ensure HTTPS/localhost for Web Crypto API):", error);
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            hash = ((hash << 5) - hash) + password.charCodeAt(i);
            hash |= 0;
        }
        return "simplehash_" + Math.abs(hash).toString(36);
    }
}

function showLoadingSpinner(show = true) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = show ? 'block' : 'none';
}

// --- NEW HELPER ---
function showLoader(loaderId, show = true) {
    const loader = document.getElementById(loaderId);
    if (loader) loader.style.display = show ? 'block' : 'none';
}


function copyToClipboard(textToCopy, buttonElement, successMessage) {
    if (!navigator.clipboard) {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            if (buttonElement) {
                const originalText = buttonElement.innerHTML;
                buttonElement.innerHTML = 'تم النسخ!';
                setTimeout(() => { buttonElement.innerHTML = originalText; }, 2000);
            }
            if (successMessage) showAlert(successMessage, 'success');
        } catch (err) {
            showAlert('فشل النسخ. حاول يدوياً.', 'error');
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
        return;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
        if (buttonElement) {
            const originalText = buttonElement.innerHTML;
            buttonElement.innerHTML = 'تم النسخ!';
            setTimeout(() => { buttonElement.innerHTML = originalText; }, 2000);
        }
        if (successMessage) showAlert(successMessage, 'success');
    }).catch(err => {
        showAlert('فشل النسخ. حاول يدوياً.', 'error');
        console.error('Clipboard copy failed', err);
    });
}

function renderQuestionInputForPreview(q) {
    let inputHtml = ''; const disabledAttr = 'disabled';
    const qId = q.id || generateUniqueId('prev_q');
    switch (q.type) {
        case 'text': inputHtml = `<input type="text" placeholder="إجابة نصية قصيرة" ${disabledAttr}>`; break;
        case 'textarea': inputHtml = `<textarea placeholder="إجابة نصية طويلة" ${disabledAttr}></textarea>`; break;
        case 'radio': inputHtml = (q.options || []).map((opt, i) => `<div class="checkbox-group"><input type="radio" ${disabledAttr} id="prev-${qId}-opt-${i}" name="prev-${qId}"><label class="option-label" for="prev-${qId}-opt-${i}">${opt}</label></div>`).join(''); break;
        case 'checkbox': inputHtml = (q.options || []).map((opt,i) => `<div class="checkbox-group"><input type="checkbox" ${disabledAttr} id="prev-${qId}-opt-${i}"><label class="option-label" for="prev-${qId}-opt-${i}">${opt}</label></div>`).join(''); break;
        case 'dropdown': inputHtml = `<select ${disabledAttr}><option value="">اختر...</option>${(q.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}</select>`; break;
        case 'date': inputHtml = `<input type="date" ${disabledAttr}>`; break;
        case 'time': inputHtml = `<input type="time" ${disabledAttr}>`; break;
        case 'rating':
            inputHtml = `<div class="rating-stars">`;
            for (let val = 5; val >= 1; val--) inputHtml += `<input type="radio" name="prev-q-${qId}-rating" value="${val}" ${disabledAttr} id="prev-q-${qId}-rating-${val}"><label for="prev-q-${qId}-rating-${val}">★</label>`;
            inputHtml += `</div>`;
            break;
        default: inputHtml = `<p>نوع السؤال غير مدعوم.</p>`;
    }
    return inputHtml;
}

function openImageModal(src, caption) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('image-modal-content');
    const modalCaption = document.getElementById('image-modal-caption');
    if (modal && modalImg && modalCaption) {
        modal.style.display = "block";
        modalImg.src = src;
        modalCaption.innerHTML = caption;
    }
}

// ====== Global State ======
let currentSurveyData = null;
let currentSurveyResponses = [];
let lastEnteredAdminPin = null;


// ====== ADMIN PAGE (admin.html) LOGIC ======
function initAdminPage(surveyIdForEdit) {
    console.log("Admin Page: Initializing. Editing survey ID:", surveyIdForEdit);
    const pageTitle = document.getElementById('page-title');
    const headerDescription = document.getElementById('header-description');
    const adminPageHeading = document.getElementById('admin-page-heading');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const publishBtn = document.getElementById('publish-btn');
    const saveLocalBtn = document.getElementById('save-local-btn');

    const adminLinkContainer = document.getElementById('admin-link-container');
    const publishedSurveyIdOutput = document.getElementById('published-survey-id-output');
    const copyPublishedIdBtn = document.getElementById('copy-published-id-btn');
    const publishedSurveyPinInfo = document.getElementById('published-survey-pin-info');
    const publishedSurveyPinOutput = document.getElementById('published-survey-pin-output');
    const copyPublishedPinBtn = document.getElementById('copy-published-pin-btn');
    const publishedSurveyPinReminder = document.getElementById('published-survey-pin-reminder');
    const surveyShareLinkOutput = document.getElementById('survey-share-link-output');
    const copyShareLinkBtn = document.getElementById('copy-share-link-btn');
    const surveyAdminViewLinkOutput = document.getElementById('survey-admin-view-link-output');
    const copyAdminViewLinkBtn = document.getElementById('copy-admin-view-link-btn');
    const goToPublishedSurveyBtn = document.getElementById('go-to-published-survey-btn');

    const surveyLogoInput = document.getElementById('survey-logo');
    const logoPreview = document.getElementById('logo-preview');
    const surveyLogoUrlInput = document.getElementById('survey-logo-url');

    const previewSurveyBtn = document.getElementById('preview-survey-btn');
    const previewModal = document.getElementById('preview-modal');
    const closePreviewModalBtn = document.getElementById('close-preview-modal');
    const previewSurveyContent = document.getElementById('preview-survey-content');
    const previewModalTitle = document.getElementById('preview-modal-title');
    const exportSurveyBtn = document.getElementById('export-survey-btn');
    const importSurveyFile = document.getElementById('import-survey-file');

    let questionCounter = 0;
    let currentEditingSurveyId = surveyIdForEdit;
    let draggedQuestion = null;

    if (pageTitle) pageTitle.textContent = currentEditingSurveyId ? 'تعديل استبيان' : 'إنشاء استبيان';
    if (headerDescription) headerDescription.textContent = currentEditingSurveyId ? 'قم بتعديل تفاصيل استبيانك الحالي.' : 'صمم استبيانًا جديدًا بكل سهولة.';
    if (adminPageHeading) adminPageHeading.textContent = currentEditingSurveyId ? 'تعديل الاستبيان' : 'إنشاء استبيان جديد';

    async function loadSurveyForEditing(surveyId) {
        showLoadingSpinner(true);
        try {
            const surveyDoc = await db.collection('surveys').doc(surveyId).get();
            if (surveyDoc.exists) {
                const surveyData = surveyDoc.data();
                currentSurveyData = surveyData;

                if (sessionStorage.getItem(`adminPinVerified_${surveyId}`) === 'true') {
                    showAlert('تم التحقق من الرمز السري سابقاً لهذه الجلسة.', 'success');
                    populateFormWithSurveyData(surveyData);
                } else {
                    const enteredPin = prompt(`الرجاء إدخال الرمز السري (PIN) لتعديل هذا الاستبيان:`);
                    if (enteredPin === null) { showAlert('تم إلغاء التعديل.', 'info'); window.location.href = 'admin.html'; return; }
                    if (!surveyData.adminPinHash) { console.error("Critical: adminPinHash missing for survey " + surveyId); showAlert("خطأ في بيانات الاستبيان، الرمز السري مفقود.", "error"); window.location.href = "admin.html"; return; }

                    const enteredPinHash = await hashPassword(enteredPin);
                    if (enteredPinHash !== surveyData.adminPinHash) { showAlert('الرمز السري غير صحيح.', 'error'); window.location.href = 'admin.html'; return; }

                    sessionStorage.setItem(`adminPinVerified_${surveyId}`, 'true');
                    lastEnteredAdminPin = enteredPin;
                    showAlert('الرمز السري صحيح. تم تحميل الاستبيان للتعديل.', 'success');
                    populateFormWithSurveyData(surveyData);
                }

                if (adminLinkContainer && currentEditingSurveyId) {
                    if (publishedSurveyIdOutput) publishedSurveyIdOutput.value = currentEditingSurveyId;
                    if (copyPublishedIdBtn && publishedSurveyIdOutput) copyPublishedIdBtn.onclick = () => copyToClipboard(publishedSurveyIdOutput.value, copyPublishedIdBtn, 'تم نسخ معرف الاستبيان!');

                    if (publishedSurveyPinInfo) publishedSurveyPinInfo.style.display = 'none';
                    if (publishedSurveyPinReminder) publishedSurveyPinReminder.style.display = 'block';

                    const baseUrl = `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))}`;
                    if (surveyShareLinkOutput) surveyShareLinkOutput.value = `${baseUrl}/survey.html?id=${currentEditingSurveyId}`;
                    if (surveyAdminViewLinkOutput) surveyAdminViewLinkOutput.value = `${baseUrl}/results.html?id=${currentEditingSurveyId}`; // Points to results page
                    if (goToPublishedSurveyBtn) goToPublishedSurveyBtn.href = `survey.html?id=${currentEditingSurveyId}&mode=published`;
                    adminLinkContainer.style.display = 'block';
                }


            } else {
                showAlert('لم يتم العثور على الاستبيان المطلوب للتعديل.', 'error');
                currentEditingSurveyId = null; currentSurveyData = null; loadLocalSurvey();
                if (adminLinkContainer) adminLinkContainer.style.display = 'none';
            }
        } catch (error) {
            console.error("Admin Page: Error loading survey for editing:", error);
            showAlert('خطأ في تحميل الاستبيان للتعديل.', 'error');
            currentEditingSurveyId = null; currentSurveyData = null; loadLocalSurvey();
            if (adminLinkContainer) adminLinkContainer.style.display = 'none';
        } finally { showLoadingSpinner(false); }
    }

    function addQuestion(questionData = {}) {
        questionCounter++;
        const qId = questionData.id || generateUniqueId('q');
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-card';
        questionDiv.dataset.id = qId;
        questionDiv.setAttribute('draggable', true);
        questionDiv.innerHTML = `
            <div class="question-card-header"><h3>السؤال <span class="q-number">${questionCounter}</span></h3><span class="drag-handle" title="اسحب لإعادة الترتيب">☰</span></div>
            <div class="form-group"><label for="q-text-${qId}">نص السؤال:</label><input type="text" id="q-text-${qId}" value="${questionData.text || ''}" placeholder="أدخل نص السؤال" required></div>
            <div class="form-group"><label for="q-type-${qId}">نوع السؤال:</label><select id="q-type-${qId}">
                <option value="text" ${questionData.type === 'text' ? 'selected' : ''}>نص قصير</option><option value="textarea" ${questionData.type === 'textarea' ? 'selected' : ''}>نص طويل</option>
                <option value="radio" ${questionData.type === 'radio' ? 'selected' : ''}>اختيار واحد</option><option value="checkbox" ${questionData.type === 'checkbox' ? 'selected' : ''}>اختيار متعدد</option>
                <option value="dropdown" ${questionData.type === 'dropdown' ? 'selected' : ''}>قائمة منسدلة</option><option value="date" ${questionData.type === 'date' ? 'selected' : ''}>تاريخ</option>
                <option value="time" ${questionData.type === 'time' ? 'selected' : ''}>وقت</option><option value="rating" ${questionData.type === 'rating' ? 'selected' : ''}>تقييم نجوم</option></select></div>
            <div class="form-group checkbox-group"><input type="checkbox" id="q-required-${qId}" ${questionData.required ? 'checked':''}><label for="q-required-${qId}">سؤال إجباري</label></div>
            <div class="question-options-container" id="q-options-${qId}" style="display: ${['radio', 'checkbox', 'dropdown'].includes(questionData.type) ? 'block' : 'none'};"><h4>خيارات السؤال:</h4><div class="options-list"></div><button type="button" class="add-option-btn secondary"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left:8px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>إضافة خيار</button></div>
            <div class="action-buttons"><button type="button" class="delete-question-btn danger">حذف السؤال</button></div>`;
        if (questionsContainer) questionsContainer.appendChild(questionDiv);
        const qTypeSelect = questionDiv.querySelector(`#q-type-${qId}`);
        const qOptionsContainer = questionDiv.querySelector(`#q-options-${qId}`);
        const addOptionBtnElement = questionDiv.querySelector('.add-option-btn');

        qTypeSelect.addEventListener('change', () => {
            qOptionsContainer.style.display = ['radio', 'checkbox', 'dropdown'].includes(qTypeSelect.value) ? 'block' : 'none';
            if (['radio', 'checkbox', 'dropdown'].includes(qTypeSelect.value) && qOptionsContainer.querySelector('.options-list').children.length === 0) addOptionToContainer(qOptionsContainer.querySelector('.options-list'));
        });
        addOptionBtnElement.addEventListener('click', () => addOptionToContainer(qOptionsContainer.querySelector('.options-list')));
        questionDiv.querySelector('.delete-question-btn').addEventListener('click', () => { questionDiv.remove(); updateQuestionNumbers(); });
        questionDiv.addEventListener('dragstart', handleDragStart); questionDiv.addEventListener('dragover', handleDragOver);
        questionDiv.addEventListener('drop', handleDrop); questionDiv.addEventListener('dragend', handleDragEnd);
        if (questionData.options?.length) questionData.options.forEach(opt => addOptionToContainer(qOptionsContainer.querySelector('.options-list'), opt));
        else if (['radio', 'checkbox', 'dropdown'].includes(questionData.type)) addOptionToContainer(qOptionsContainer.querySelector('.options-list'));
        updateQuestionNumbers();
    }

    function handleImagePreview(event, previewElement) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewElement.src = e.target.result;
                previewElement.style.display = 'block';
                delete event.target.dataset.existingUrl;
            };
            reader.readAsDataURL(file);
            if (surveyLogoUrlInput) surveyLogoUrlInput.value = '';
        } else if (!event.target.dataset.existingUrl) {
            previewElement.src = '#';
            previewElement.style.display = 'none';
        }
    }

    function addOptionToContainer(optionsListContainer, optionText = '') {
        const optionDiv = document.createElement('div'); optionDiv.className = 'option-item';
        optionDiv.innerHTML = `<input type="text" value="${optionText}" placeholder="نص الخيار" required><button type="button" class="remove-option-btn danger" aria-label="حذف">×</button>`;
        optionsListContainer.appendChild(optionDiv);
        optionDiv.querySelector('.remove-option-btn').addEventListener('click', () => optionDiv.remove());
    }
    function updateQuestionNumbers() {
        document.querySelectorAll('#questions-container .question-card .q-number').forEach((span, i) => { if (span) span.textContent = i + 1; });
        questionCounter = document.querySelectorAll('#questions-container .question-card').length;
    }
    function handleDragStart(e) { draggedQuestion = e.target.closest('.question-card'); if (draggedQuestion) { e.dataTransfer.effectAllowed = 'move'; draggedQuestion.classList.add('dragging'); } }
    function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    function handleDrop(e) {
        e.preventDefault(); const target = e.target.closest('.question-card');
        if (target && draggedQuestion && target !== draggedQuestion && questionsContainer) {
            const list = questionsContainer;
            if (draggedQuestion.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) {
                list.insertBefore(draggedQuestion, target);
            } else {
                list.insertBefore(draggedQuestion, target.nextSibling);
            }
            updateQuestionNumbers();
        }
    }
    function handleDragEnd() { if (draggedQuestion) draggedQuestion.classList.remove('dragging'); draggedQuestion = null; }

    async function collectSurveyDataForAdmin(forPreview = false) {
        const data = {
            title: document.getElementById('survey-title').value.trim(),
            description: document.getElementById('survey-description').value.trim(),
            settings: {
                backgroundColor: document.getElementById('background-color').value,
                allowAnonymous: document.getElementById('allow-anonymous').checked,
                allowResultsView: document.getElementById('allow-results-view').checked,
                startDate: document.getElementById('start-date').value || null,
                startTime: document.getElementById('start-time').value || null,
                endDate: document.getElementById('end-date').value || null,
                endTime: document.getElementById('end-time').value || null,
                thankYouMessage: document.getElementById('thank-you-message').value.trim() || 'شكراً لك على إجابتك!',
                showProgress: document.getElementById('show-progress').checked,
                randomizeQuestions: document.getElementById('randomize-questions').checked,
            },
            questions: [], logoUrl: null, adminPinHash: null
        };
        if (!data.title && !forPreview) { showAlert('الرجاء إدخال عنوان الاستبيان.', 'error'); return null; }

        const adminPinInputEl = document.getElementById('survey-admin-pin');
        const adminPin = adminPinInputEl ? adminPinInputEl.value : null;
        lastEnteredAdminPin = null;

        if (currentEditingSurveyId) {
            if (adminPin) {
                if (adminPin.length < 4 && !forPreview) {
                    showAlert('يجب أن يتكون الرمز السري من 4 أحرف/أرقام على الأقل.', 'error');
                    adminPinInputEl.focus(); return null;
                }
                data.adminPinHash = await hashPassword(adminPin);
                lastEnteredAdminPin = adminPin;
            } else if (currentSurveyData?.adminPinHash) {
                data.adminPinHash = currentSurveyData.adminPinHash;
            } else if (!forPreview) {
                showAlert('الرمز السري للمشرف مطلوب.', 'error');
                adminPinInputEl.focus(); return null;
            }
        } else {
            if (!adminPin && !forPreview) {
                showAlert('الرمز السري للمشرف مطلوب عند إنشاء استبيان جديد.', 'error');
                adminPinInputEl.focus(); return null;
            }
            if (adminPin && adminPin.length < 4 && !forPreview) {
                showAlert('يجب أن يتكون الرمز السري من 4 أحرف/أرقام على الأقل.', 'error');
                adminPinInputEl.focus(); return null;
            }
            if (adminPin) {
                data.adminPinHash = await hashPassword(adminPin);
                lastEnteredAdminPin = adminPin;
            }
        }

        data.logoUrl = null;
        const logoUrlFromField = surveyLogoUrlInput.value.trim();
        const logoFile = surveyLogoInput.files[0];
        
        if (logoUrlFromField && (logoUrlFromField.startsWith('http://') || logoUrlFromField.startsWith('https://'))) {
            data.logoUrl = logoUrlFromField;
        } else if (logoFile && !forPreview) {
            showLoadingSpinner(true);
            showAlert('جاري رفع شعار الاستبيان...', 'info', 15000);
            try {
                const oldLogoUrlToDelete = currentSurveyData?.logoUrl || logoPreview?.dataset?.existingUrl;
                if (oldLogoUrlToDelete && oldLogoUrlToDelete.includes('firebasestorage.googleapis.com')) {
                    try {
                        await storage.refFromURL(oldLogoUrlToDelete).delete();
                    } catch (e) {
                         console.warn("Failed to delete old logo:", oldLogoUrlToDelete, "Error:", e.message);
                    }
                }
                const surveyNamespace = currentEditingSurveyId || `new_${generateUniqueId('s')}`;
                const logoRefName = `survey_logos/${surveyNamespace}/${generateUniqueId('logo_')}_${logoFile.name}`;
                const snapshot = await storage.ref(logoRefName).put(logoFile);
                data.logoUrl = await snapshot.ref.getDownloadURL();
                if (logoPreview) {
                    logoPreview.dataset.uploadedUrl = data.logoUrl;
                }
                showAlert('تم رفع الشعار بنجاح!', 'success');
            } catch (e) {
                showAlert(`فشل رفع شعار الاستبيان: ${e.message}`, 'error', 10000);
                showLoadingSpinner(false);
                return null;
            } finally {
                showLoadingSpinner(false);
            }
        } else if (logoPreview && logoPreview.dataset.uploadedUrl) {
            data.logoUrl = logoPreview.dataset.uploadedUrl;
        } else if (forPreview && logoPreview && logoPreview.src && logoPreview.src.startsWith('data:')) {
            data.logoUrl = logoPreview.src;
        } else if (currentSurveyData?.logoUrl && !logoFile && !logoUrlFromField) {
            data.logoUrl = currentSurveyData.logoUrl;
        }

        const questionCards = document.querySelectorAll('#questions-container .question-card');
        for (const [index, card] of questionCards.entries()) {
            const qId = card.dataset.id;
            const qData = {
                id: qId,
                text: card.querySelector(`#q-text-${qId}`).value.trim(),
                type: card.querySelector(`#q-type-${qId}`).value,
                required: card.querySelector(`#q-required-${qId}`).checked
            };
            if (!qData.text && !forPreview) { showAlert(`نص السؤال ${index + 1} مطلوب.`, 'error'); return null; }

            if (['radio', 'checkbox', 'dropdown'].includes(qData.type)) {
                qData.options = Array.from(card.querySelectorAll(`#q-options-${qId} .options-list input[type="text"]`))
                    .map(inp => inp.value.trim()).filter(Boolean);
                if (qData.options.length === 0 && !forPreview) { showAlert(`خيارات السؤال ${index + 1} مطلوبة.`, 'error'); return null; }
            }
            data.questions.push(qData);
        }
        if (data.questions.length === 0 && !forPreview) { showAlert('الرجاء إضافة سؤال واحد على الأقل.', 'error'); return null; }
        data.createdAt = forPreview ? new Date().toISOString() : (currentEditingSurveyId && currentSurveyData?.createdAt ? currentSurveyData.createdAt : firebase.firestore.FieldValue.serverTimestamp());
        data.updatedAt = forPreview ? new Date().toISOString() : firebase.firestore.FieldValue.serverTimestamp();
        return data;
    }

    function populateFormWithSurveyData(surveyData) {
        if (document.getElementById('survey-title')) document.getElementById('survey-title').value = surveyData.title || '';
        if (document.getElementById('survey-description')) document.getElementById('survey-description').value = surveyData.description || '';

        const adminPinField = document.getElementById('survey-admin-pin');
        if (adminPinField) {
            adminPinField.value = '';
            adminPinField.placeholder = surveyData.adminPinHash ? "لتغيير الرمز السري، أدخل رمزاً جديداً" : "أدخل رمز سري للمشرف (مطلوب، 4+ أحرف)";
            adminPinField.required = true;
        }

        const settings = surveyData.settings || {};
        if (document.getElementById('background-color')) document.getElementById('background-color').value = settings.backgroundColor || '#f8f9fa';
        if (document.getElementById('allow-anonymous')) document.getElementById('allow-anonymous').checked = settings.allowAnonymous || false;
        if (document.getElementById('allow-results-view')) document.getElementById('allow-results-view').checked = settings.allowResultsView || false;
        if (document.getElementById('start-date')) document.getElementById('start-date').value = settings.startDate || '';
        if (document.getElementById('start-time')) document.getElementById('start-time').value = settings.startTime || '';
        if (document.getElementById('end-date')) document.getElementById('end-date').value = settings.endDate || '';
        if (document.getElementById('end-time')) document.getElementById('end-time').value = settings.endTime || '';
        if (document.getElementById('thank-you-message')) document.getElementById('thank-you-message').value = settings.thankYouMessage || 'شكراً لك على إجابتك!';
        if (document.getElementById('show-progress')) document.getElementById('show-progress').checked = settings.showProgress || false;
        if (document.getElementById('randomize-questions')) document.getElementById('randomize-questions').checked = settings.randomizeQuestions || false;

        if (surveyData.logoUrl) {
            if (logoPreview) {
                logoPreview.src = surveyData.logoUrl;
                logoPreview.style.display = 'block';
                logoPreview.dataset.uploadedUrl = surveyData.logoUrl;
                logoPreview.dataset.existingUrl = surveyData.logoUrl;
                if (surveyLogoUrlInput) {
                    surveyLogoUrlInput.value = surveyData.logoUrl.startsWith('http') ? surveyData.logoUrl : '';
                }
            }
        } else {
            if (logoPreview) { logoPreview.src = '#'; logoPreview.style.display = 'none'; delete logoPreview.dataset.uploadedUrl; delete logoPreview.dataset.existingUrl; }
            if (surveyLogoUrlInput) surveyLogoUrlInput.value = '';
        }
        if (surveyLogoInput) surveyLogoInput.value = '';

        if (questionsContainer) questionsContainer.innerHTML = ''; questionCounter = 0;
        if (surveyData.questions?.length) surveyData.questions.forEach(q => addQuestion(q)); else addQuestion();
    }

    function loadLocalSurvey() {
        try {
            const draft = localStorage.getItem('savedSurveyDraft');
            if (draft) { populateFormWithSurveyData(JSON.parse(draft)); showAlert('تم تحميل مسودة محفوظة.', 'info'); }
            else addQuestion();
        } catch (e) { console.error('Admin Page: Error loading local draft:', e); localStorage.removeItem('savedSurveyDraft'); addQuestion(); }
    }

    if (publishBtn) {
        publishBtn.addEventListener('click', async () => {
            showLoadingSpinner(true); showAlert('جاري النشر...', 'info', 15000);
            
            try {
                const surveyDataToPublish = await collectSurveyDataForAdmin();
                if (!surveyDataToPublish) { showLoadingSpinner(false); return; }

                let surveyIdToUse = currentEditingSurveyId;
                let isNewSurvey = false;
                if (currentEditingSurveyId) {
                    await db.collection('surveys').doc(currentEditingSurveyId).set(surveyDataToPublish, { merge: true });
                } else {
                    const ref = await db.collection('surveys').add(surveyDataToPublish);
                    surveyIdToUse = ref.id;
                    isNewSurvey = true;
                }
                currentEditingSurveyId = surveyIdToUse;
                currentSurveyData = surveyDataToPublish;
                sessionStorage.setItem(`adminPinVerified_${surveyIdToUse}`, 'true');
                localStorage.removeItem('savedSurveyDraft');
                
                showAlert('تم نشر/تحديث الاستبيان بنجاح!', 'success');
                const baseUrl = `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))}`;
                let finalRedirectUrl = `${baseUrl}/survey.html?id=${surveyIdToUse}&mode=published`;
                if (lastEnteredAdminPin) {
                    finalRedirectUrl += `&pin=${encodeURIComponent(lastEnteredAdminPin)}`;
                }
                window.location.href = finalRedirectUrl;

            } catch (e) {
                console.error('Admin Page: Publish error:', e); showAlert(`فشل النشر: ${e.message}`, 'error');
            } finally { showLoadingSpinner(false); }
        });
    }
    if (saveLocalBtn) saveLocalBtn.addEventListener('click', async () => {
        const data = await collectSurveyDataForAdmin(true); if (!data) return;
        try { localStorage.setItem('savedSurveyDraft', JSON.stringify(data)); showAlert('تم الحفظ محلياً!', 'success'); }
        catch (e) { console.error("Admin Page: Local save error", e); showAlert("خطأ في الحفظ المحلي", "error"); }
    });
    if (addQuestionBtn) addQuestionBtn.addEventListener('click', (e) => { e.preventDefault(); addQuestion(); });

    if (surveyLogoInput) surveyLogoInput.addEventListener('change', (e) => handleImagePreview(e, logoPreview));
    
    if (previewSurveyBtn) previewSurveyBtn.addEventListener('click', async () => {
        const data = await collectSurveyDataForAdmin(true); if (!data) { showAlert('املأ الحقول المطلوبة للمعاينة.', 'info'); return; }
        if (previewModalTitle) previewModalTitle.textContent = data.title || "معاينة الاستبيان";
        if (previewSurveyContent) renderSurveyForPreviewAdmin(data, previewSurveyContent);
        if (previewModal) previewModal.style.display = 'block';
    });
    if (closePreviewModalBtn) closePreviewModalBtn.onclick = () => { if (previewModal) previewModal.style.display = 'none'; }
    window.addEventListener('click', (e) => { if (e.target == previewModal && previewModal) previewModal.style.display = 'none'; });

    if (exportSurveyBtn) exportSurveyBtn.addEventListener('click', async () => {
        const data = await collectSurveyDataForAdmin(true); if (!data) return;
        const json = JSON.stringify(data, null, 2); const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `${(data.title || 'survey').replace(/\s+/g, '_')}.json`; a.click(); URL.revokeObjectURL(a.href);
        showAlert('تم تصدير الاستبيان.', 'success');
    });
    if (importSurveyFile) importSurveyFile.addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
            try {
                const data = JSON.parse(re.target.result);
                if (data && data.title && data.questions && data.settings && data.adminPinHash) {
                    populateFormWithSurveyData(data);
                    showAlert('تم الاستيراد! راجع البيانات ثم قم بالنشر/التحديث.', 'success');
                    currentEditingSurveyId = null;
                    currentSurveyData = data;
                    if (adminLinkContainer) adminLinkContainer.style.display = 'none';
                } else {
                    showAlert('ملف الاستبيان غير صالح أو يفتقد لحقول أساسية.', 'error');
                }
            } catch (err) { console.error("Admin Page: Import error:", err); showAlert(`خطأ استيراد: ${err.message}`, 'error'); }
        }; reader.readAsText(file); importSurveyFile.value = '';
    });
    function renderSurveyForPreviewAdmin(surveyData, container) {
        if (!container) return; container.innerHTML = ''; const form = document.createElement('form'); form.style.pointerEvents = 'none';
        (surveyData.questions || []).forEach((q, i) => {
            const div = document.createElement('div'); div.className = 'question-card';
            div.innerHTML = `<label>${i + 1}. ${q.text}</label>${renderQuestionInputForPreview(q)}`;
            form.appendChild(div);
        }); container.appendChild(form);
    }
    
    if (currentEditingSurveyId) {
        loadSurveyForEditing(currentEditingSurveyId);
    } else {
        loadLocalSurvey();
        if (adminLinkContainer) adminLinkContainer.style.display = 'none';
    }
}


// ====== SURVEY PAGE (survey.html) LOGIC ======
async function initSurveyPage(surveyIdFromUrl) {
    console.log("Survey Page: Initializing. Survey ID from URL:", surveyIdFromUrl);
    const surveyPageContent = document.getElementById('survey-page-content');
    const timingInfoContainer = document.getElementById('survey-timing-info-container');

    const responderContainer = document.getElementById('responder-form-container');
    const surveyForm = document.getElementById('survey-form-responder');
    const thankYouContainer = document.getElementById('thank-you-container');
    const thankYouText = document.getElementById('thank-you-text');
    const viewResultsLink = document.getElementById('view-results-after-submission-link');
    const shareSurveyAfterSubmissionContainer = document.getElementById('share-survey-after-submission-container');
    const shareSurveyLinkOutputResp = document.getElementById('share-survey-link-output-resp');
    const copyShareLinkBtnResp = document.getElementById('copy-share-link-btn-resp');
    const publicResultsContainer = document.getElementById('public-results-container');
    const adminSection = document.getElementById('survey-admin-section'); 
    const adminPinFormContainer = document.getElementById('admin-login-form-container'); 
    const adminPinForm = document.getElementById('admin-pin-form');
    const adminPinInput = document.getElementById('admin-pin-input');
    const showAdminLoginBtnContainer = document.getElementById('show-admin-login-button-container');
    const showAdminLoginBtn = document.getElementById('show-admin-login-btn');
    const publishedModeContainer = document.getElementById('published-mode-info-container');
    const publishedSurveyIdDisplay = document.getElementById('published-survey-id-display');
    const publishedSurveyPinInfoDisplay = document.getElementById('published-survey-pin-info-display');
    const publishedSurveyPinTextDisplay = document.getElementById('published-survey-pin-text-display');
    const publishedLinkInput = document.getElementById('published-survey-link-input');
    const copyPublishedBtn = document.getElementById('copy-published-link-btn');
    const manageSurveyBtn = document.getElementById('manage-survey-after-publish-btn');
    const viewResultsAfterPublishLink = document.getElementById('view-results-after-publish-link');
    const publishedReadOnlyView = document.getElementById('published-survey-readonly-view');


    if (!surveyIdFromUrl) {
        showLoadingSpinner(false);
        const surveyIdInputContainer = document.getElementById('survey-id-input-container');
        const surveyIdLookupForm = document.getElementById('survey-id-lookup-form');
        const surveyIdInputEl = document.getElementById('survey-id-input');
        const surveyPinInputForLookupEl = document.getElementById('survey-pin-input-for-lookup');
        const surveyMainTitleHeader = document.getElementById('survey-main-title');

        if (surveyMainTitleHeader) surveyMainTitleHeader.textContent = 'الوصول إلى استبيان';
        if (timingInfoContainer) timingInfoContainer.style.display = 'none';
        
        const elementsToHide = [responderContainer, thankYouContainer, publicResultsContainer, adminSection, publishedModeContainer, showAdminLoginBtnContainer];
        elementsToHide.forEach(el => { if(el) el.style.display = 'none'; });

        if (surveyIdInputContainer) surveyIdInputContainer.style.display = 'block';
        if (surveyIdLookupForm) {
            surveyIdLookupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const enteredId = surveyIdInputEl ? surveyIdInputEl.value.trim() : null;
                const enteredPin = surveyPinInputForLookupEl ? surveyPinInputForLookupEl.value : null;
                if (!enteredId) { showAlert('الرجاء إدخال معرف الاستبيان.', 'error'); return; }
                if (!enteredPin) { showAlert('الرجاء إدخال الرمز السري للمشرف.', 'error'); return; }
                showLoadingSpinner(true);
                try {
                    const doc = await db.collection('surveys').doc(enteredId).get();
                    if (!doc.exists) { showAlert('لم يتم العثور على استبيان بهذا المعرف.', 'error'); showLoadingSpinner(false); return; }
                    const data = { id: doc.id, ...doc.data() };
                    if (!data.adminPinHash) { showAlert("خطأ في بيانات الاستبيان، رمز سري مفقود.", "error"); showLoadingSpinner(false); return; }

                    if (await hashPassword(enteredPin) === data.adminPinHash) {
                        sessionStorage.setItem(`adminPinVerified_${enteredId}`, 'true');
                        lastEnteredAdminPin = enteredPin;
                        window.location.href = `admin.html?id=${enteredId}`;
                    } else showAlert('الرمز السري غير صحيح.', 'error');
                } catch (err) {
                    console.error("Survey lookup error:", err); showAlert("خطأ أثناء البحث عن الاستبيان.", "error");
                } finally { showLoadingSpinner(false); }
            });
        }
        return;
    }

    const pageTitle = document.getElementById('page-title');
    const surveyMainTitle = document.getElementById('survey-main-title');
    const surveyMainDescription = document.getElementById('survey-main-description');
    const surveyMainLogo = document.getElementById('survey-main-logo');
    
    const imageModal = document.getElementById('image-modal'),
        imageModalCloseBtn = document.getElementById('image-modal-close-btn');
    if (imageModalCloseBtn) imageModalCloseBtn.onclick = () => { if (imageModal) imageModal.style.display = "none"; };
    window.addEventListener('click', (event) => { if (event.target == imageModal && imageModal) imageModal.style.display = "none"; });

    showLoadingSpinner(true);
    try {
        const surveyDoc = await db.collection('surveys').doc(surveyIdFromUrl).get();
        if (!surveyDoc.exists) {
            showAlert('الاستبيان المحدد غير موجود.', 'error'); if (surveyMainTitle) surveyMainTitle.textContent = 'الاستبيان غير موجود';
            const elementsToHide = [timingInfoContainer, responderContainer, thankYouContainer, publicResultsContainer, adminSection, publishedModeContainer, showAdminLoginBtnContainer];
            elementsToHide.forEach(el => { if(el) el.style.display = 'none'; });
            showLoadingSpinner(false); return;
        }
        currentSurveyData = { id: surveyDoc.id, ...surveyDoc.data() };
        
        if (!currentSurveyData || !currentSurveyData.questions || currentSurveyData.questions.length === 0) {
            showAlert('بيانات الاستبيان الأساسية أو الأسئلة مفقودة.', 'error', 10000);
            if (pageTitle) pageTitle.textContent = "خطأ في بيانات الاستبيان";
            if (surveyMainTitle) surveyMainTitle.textContent = "خطأ في بيانات الاستبيان";
            showLoadingSpinner(false);
            if(showAdminLoginBtnContainer) showAdminLoginBtnContainer.style.display = 'block';
            return;
        }

        if (pageTitle) pageTitle.textContent = currentSurveyData.title || 'استبيان';
        if (surveyMainTitle) surveyMainTitle.textContent = currentSurveyData.title || 'استبيان';
        if (surveyMainDescription) surveyMainDescription.textContent = currentSurveyData.description || '';
        if (surveyMainLogo) { if (currentSurveyData.logoUrl && currentSurveyData.logoUrl !== '#') { surveyMainLogo.src = currentSurveyData.logoUrl; surveyMainLogo.style.display = 'block'; } else surveyMainLogo.style.display = 'none'; }
        if (currentSurveyData.settings?.backgroundColor) document.body.style.backgroundColor = currentSurveyData.settings.backgroundColor;

        if (timingInfoContainer && currentSurveyData.settings) {
            const settings = currentSurveyData.settings; let timingHTML = '';
            const now = new Date(); let startDate, endDate, surveyActive = true;

            if (settings.startDate) startDate = new Date(settings.startDate + (settings.startTime ? 'T' + settings.startTime : 'T00:00:00'));
            if (settings.endDate) endDate = new Date(settings.endDate + (settings.endTime ? 'T' + settings.endTime : 'T23:59:59'));

            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const dateFormatter = new Intl.DateTimeFormat('ar-SA', options);

            if (startDate && now < startDate) { surveyActive = false; }
            if (endDate && now > endDate) { surveyActive = false; }
            
            if (!surveyActive && responderContainer) {
                responderContainer.innerHTML = `<div class="page-container" style="text-align:center;"><p style="color:var(--error-color); font-size:1.2em;">هذا الاستبيان غير متاح حالياً.</p></div>`;
            }
        }


        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const adminPinFromQuery = urlParams.get('pin');

        const elementsToHide = [responderContainer, thankYouContainer, publicResultsContainer, adminSection, publishedModeContainer, showAdminLoginBtnContainer];
        elementsToHide.forEach(el => { if(el) el.style.display = 'none'; });

        if (mode === 'published') {
            if (publishedModeContainer) publishedModeContainer.style.display = 'block';
            if (publishedSurveyIdDisplay) publishedSurveyIdDisplay.textContent = surveyIdFromUrl;
            if (adminPinFromQuery && publishedSurveyPinInfoDisplay && publishedSurveyPinTextDisplay) {
                publishedSurveyPinTextDisplay.textContent = decodeURIComponent(adminPinFromQuery);
                publishedSurveyPinInfoDisplay.style.display = 'block';
            }
            if (publishedReadOnlyView) renderSurveyForReadOnlyView(currentSurveyData, publishedReadOnlyView);
            const shareLink = `${window.location.origin}${window.location.pathname.replace(/admin\.html|results\.html/, 'survey.html')}?id=${surveyIdFromUrl}`;
            if (publishedLinkInput) publishedLinkInput.value = shareLink;
            if (copyPublishedBtn && publishedLinkInput) copyPublishedBtn.onclick = () => copyToClipboard(shareLink, copyPublishedBtn, "تم نسخ رابط المشاركة!");
            if (manageSurveyBtn) manageSurveyBtn.onclick = () => { window.location.href = `admin.html?id=${surveyIdFromUrl}`; };
            if (viewResultsAfterPublishLink) viewResultsAfterPublishLink.href = `results.html?id=${surveyIdFromUrl}`;
        } else if (urlParams.get('view') === 'results' && currentSurveyData.settings?.allowResultsView) {
            if(publicResultsContainer) publicResultsContainer.style.display = 'block';
            if(showAdminLoginBtnContainer) showAdminLoginBtnContainer.style.display = 'block';
            const backToSurvey = document.getElementById('back-to-survey-btn');
            if(backToSurvey) { backToSurvey.style.display = 'inline-block'; backToSurvey.onclick = () => { window.location.href = `survey.html?id=${surveyIdFromUrl}`; };}
            await loadAndDisplayResults(surveyIdFromUrl, document.getElementById('public-questions-results-display'), false);
        } else {
            const submitted = localStorage.getItem(`submitted_${surveyIdFromUrl}`);
            if (submitted && !currentSurveyData.settings?.allowMultipleSubmissions) {
                if (thankYouContainer) thankYouContainer.style.display = 'block';
                if (thankYouText) thankYouText.textContent = currentSurveyData.settings?.thankYouMessage || 'شكراً، لقد أجبت على هذا الاستبيان مسبقاً.';
                if (viewResultsLink && currentSurveyData.settings?.allowResultsView) { viewResultsLink.style.display = 'inline-block'; viewResultsLink.href = `survey.html?id=${surveyIdFromUrl}&view=results`; } 
                if (shareSurveyAfterSubmissionContainer) shareSurveyAfterSubmissionContainer.style.display = 'block';
                if (shareSurveyLinkOutputResp && copyShareLinkBtnResp) {
                    const surveyLink = `${window.location.origin}${window.location.pathname.replace(/admin\.html|results\.html/, 'survey.html')}?id=${surveyIdFromUrl}`;
                    shareSurveyLinkOutputResp.value = surveyLink;
                    copyShareLinkBtnResp.onclick = () => copyToClipboard(surveyLink, copyShareLinkBtnResp, 'تم نسخ رابط الاستبيان!');
                }
                if (showAdminLoginBtnContainer) showAdminLoginBtnContainer.style.display = 'block';
            } else {
                 if (responderContainer && surveyForm) { responderContainer.style.display = 'block'; renderSurveyForResponder(currentSurveyData, surveyForm); }
                 if (showAdminLoginBtnContainer) showAdminLoginBtnContainer.style.display = 'block';
            }
        }
    } catch (e) {
        console.error("Survey Page: Main init error:", e); showAlert('خطأ فادح في تحميل صفحة الاستبيان.', 'error');
    } finally { showLoadingSpinner(false); }

    if (adminPinForm && surveyIdFromUrl) adminPinForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!adminPinInput) return; const pin = adminPinInput.value;
        if (!pin) { showAlert('أدخل الرمز السري.', 'error'); return; }
        if (!currentSurveyData?.adminPinHash) {
            showAlert("خطأ داخلي، بيانات الرمز السري مفقودة.", "error"); return;
        }
        if (await hashPassword(pin) === currentSurveyData.adminPinHash) {
            sessionStorage.setItem(`adminPinVerified_${surveyIdFromUrl}`, 'true');
            lastEnteredAdminPin = pin;
            showAlert('تم التحقق. جاري التوجيه لصفحة النتائج...', 'success');
            window.location.href = `results.html?id=${surveyIdFromUrl}`; 
        } else { showAlert('رمز سري غير صحيح.', 'error'); if (adminPinInput) adminPinInput.value = ''; }
    });

    if (showAdminLoginBtn && surveyIdFromUrl) showAdminLoginBtn.addEventListener('click', () => {
        const isSessionAdminVerified = sessionStorage.getItem(`adminPinVerified_${surveyIdFromUrl}`) === 'true';
        if(isSessionAdminVerified) {
            window.location.href = `results.html?id=${surveyIdFromUrl}`;
        } else {
             const elementsToHide = [responderContainer, thankYouContainer, publicResultsContainer, showAdminLoginBtnContainer, publishedModeContainer];
             elementsToHide.forEach(el => { if (el) el.style.display = 'none'; });
             if (adminSection) adminSection.style.display = 'block'; 
             if (adminPinFormContainer) adminPinFormContainer.style.display = 'block'; 
             if (adminPinInput) adminPinInput.focus();
        }
    });

    if (surveyForm && surveyIdFromUrl) surveyForm.addEventListener('submit', async (e) => {
        e.preventDefault(); showLoadingSpinner(true); showAlert('جاري الإرسال...', 'info', 10000);
        const answers = [], formData = new FormData(surveyForm);
        for (const q of currentSurveyData.questions) {
            let ansVal = null;
            switch (q.type) {
                case 'text': case 'textarea': case 'dropdown': case 'date': case 'time': case 'rating': case 'radio': ansVal = formData.get(`q-${q.id}`); break;
                case 'checkbox': ansVal = formData.getAll(`q-${q.id}`); if (q.required && ansVal.length === 0) { showAlert(`اختر خياراً للسؤال "${q.text}".`, 'error'); showLoadingSpinner(false); return; } break; default: ansVal = 'N/A';
            }
            answers.push({ questionId: q.id, questionText: q.text, answer: ansVal });
        }
        const responseData = { surveyId: surveyIdFromUrl, surveyTitle: currentSurveyData.title, answers, timestamp: firebase.firestore.FieldValue.serverTimestamp(), userAgent: navigator.userAgent };
        try {
            await db.collection('responses').add(responseData);
            localStorage.setItem(`submitted_${surveyIdFromUrl}`, 'true');
            if (responderContainer) responderContainer.style.display = 'none';
            if (thankYouContainer) thankYouContainer.style.display = 'block';
            if (thankYouText) thankYouText.textContent = currentSurveyData.settings?.thankYouMessage || 'شكراً لك!';
            if (viewResultsLink && currentSurveyData.settings?.allowResultsView) { viewResultsLink.style.display = 'inline-block'; viewResultsLink.href = `survey.html?id=${surveyIdFromUrl}&view=results`; }
            if (shareSurveyAfterSubmissionContainer) shareSurveyAfterSubmissionContainer.style.display = 'block';

            showAlert('تم الإرسال بنجاح!', 'success'); window.scrollTo(0, 0);
        } catch (err) {
            console.error('Survey Page: Response submit error:', err); showAlert('فشل الإرسال.', 'error');
        } finally { showLoadingSpinner(false); }
    });
}
function renderSurveyForReadOnlyView(surveyData, containerElement) {
    if (!containerElement) { return; }
    containerElement.innerHTML = ''; const div = document.createElement('div'); div.className = 'survey-display-card';
    (surveyData.questions || []).forEach((q, i) => {
        const qDiv = document.createElement('div'); qDiv.className = 'question-card';
        qDiv.innerHTML = `<label>${i + 1}. ${q.text}</label>${renderQuestionInputForPreview(q)}`;
        div.appendChild(qDiv);
    }); containerElement.appendChild(div);
}
function renderSurveyForResponder(surveyData, formElement) {
    if (!formElement) { return; }
    formElement.innerHTML = '';
    (surveyData.questions || []).forEach((q, index) => {
        const div = document.createElement('div'); div.className = 'question-card';
        div.innerHTML = `<label for="q-${q.id}">${index + 1}. ${q.text} ${q.required ? '<span style="color:red;">*</span>' : ''}</label>${renderQuestionInputForResponder(q)}`;
        formElement.appendChild(div);
    });
    formElement.appendChild(Object.assign(document.createElement('button'), { type: 'submit', textContent: 'إرسال الإجابات' }));
}
function renderQuestionInputForResponder(q) {
    let html = ''; const name = `q-${q.id}`; const req = q.required ? 'required' : '';
    switch (q.type) {
        case 'text': html = `<input type="text" id="${name}" name="${name}" placeholder="إجابتك" ${req}>`; break;
        case 'textarea': html = `<textarea id="${name}" name="${name}" placeholder="إجابتك المفصلة" ${req}></textarea>`; break;
        case 'radio': html = (q.options || []).map((o, i) => `<div class="checkbox-group"><input type="radio" id="${name}-o-${i}" name="${name}" value="${o}" ${req}><label for="${name}-o-${i}" class="option-label">${o}</label></div>`).join(''); break;
        case 'checkbox': html = (q.options || []).map((o, i) => `<div class="checkbox-group"><input type="checkbox" id="${name}-o-${i}" name="${name}" value="${o}"><label for="${name}-o-${i}" class="option-label">${o}</label></div>`).join(''); if (q.required) html += `<input type="text" style="opacity:0;width:0;height:0;position:absolute" oninvalid="this.setCustomValidity('الرجاء تحديد خيار واحد على الأقل')" oninput="this.setCustomValidity('')" required value="${Array.from(document.querySelectorAll(`input[name='${name}']:checked`)).length ? 'checked' : ''}">`; break;
        case 'dropdown': html = `<select id="${name}" name="${name}" ${req}><option value="">-- اختر --</option>${(q.options || []).map(o => `<option value="${o}">${o}</option>`).join('')}</select>`; break;
        case 'date': html = `<input type="date" id="${name}" name="${name}" ${req}>`; break;
        case 'time': html = `<input type="time" id="${name}" name="${name}" ${req}>`; break;
        case 'rating': html = `<div class="rating-stars">`; for (let v = 5; v >= 1; v--) html += `<input type="radio" id="${name}-r-${v}" name="${name}" value="${v}" ${req}><label for="${name}-r-${v}" title="${v} نجوم">★</label>`; html += `</div>`; break;
        default: html = '<p>نوع غير مدعوم.</p>';
    } return html;
}

// ====== RESULTS PAGE LOGIC (REFACTORED) ======

async function loadAndDisplayResults(surveyId, displayContainer, isAdminResults) {
    showLoader('loading-results-message', true);
    if (!currentSurveyData || !currentSurveyData.questions) {
        showAlert('بيانات أسئلة الاستبيان غير محملة.', 'error');
        if (displayContainer) displayContainer.innerHTML = '<p>خطأ: بيانات أسئلة الاستبيان مفقودة.</p>';
        showLoader('loading-results-message', false);
        return;
    }

    if (!currentSurveyResponses || currentSurveyResponses.length === 0) {
        displayContainer.innerHTML = '<p>لا توجد استجابات لعرضها.</p>';
        showLoader('loading-results-message', false);
        return;
    }
    
    displayContainer.innerHTML = '';
    
    currentSurveyData.questions.forEach((q, index) => {
        const questionCardDiv = document.createElement('div');
        questionCardDiv.className = 'question-card';
        questionCardDiv.innerHTML = `<label>${index + 1}. ${q.text}</label><div class="answer-summary"></div>`;
        displayContainer.appendChild(questionCardDiv);
        displayQuestionResult(q, currentSurveyResponses, questionCardDiv.querySelector('.answer-summary'), isAdminResults);
    });
    
    showLoader('loading-results-message', false);
}

function displayQuestionResult(question, allResponses, summaryContainerElement, isAdmin) {
    if (!summaryContainerElement) return;
    summaryContainerElement.innerHTML = '';

    const questionSpecificResponses = allResponses.map(response => response.answers?.find(ans => ans.questionId === question.id)).filter(Boolean);

    if (questionSpecificResponses.length === 0) {
        summaryContainerElement.innerHTML = '<p>لا توجد إجابات مسجلة لهذا السؤال.</p>';
        return;
    }

    if (['radio', 'checkbox', 'dropdown', 'rating'].includes(question.type)) {
        const answerCounts = {};
        let totalVotes = 0;
        questionSpecificResponses.forEach(respObj => {
            if (Array.isArray(respObj.answer)) {
                respObj.answer.forEach(singleAnswer => { answerCounts[singleAnswer] = (answerCounts[singleAnswer] || 0) + 1; });
                totalVotes++;
            } else if (respObj.answer != null) {
                answerCounts[respObj.answer] = (answerCounts[respObj.answer] || 0) + 1;
                totalVotes++;
            }
        });
        const predefinedOptions = question.options || (question.type === 'rating' ? ['5', '4', '3', '2', '1'] : []);
        predefinedOptions.forEach(opt => { if (!answerCounts.hasOwnProperty(opt)) { answerCounts[opt] = 0; } });
        
        const sortedOptions = Object.keys(answerCounts).sort((a,b) => (answerCounts[b] || 0) - (answerCounts[a] || 0));

        sortedOptions.forEach(option => {
            const count = answerCounts[option] || 0;
            const percentage = totalVotes > 0 ? ((count / (question.type === 'checkbox' ? questionSpecificResponses.length : totalVotes)) * 100).toFixed(1) : 0;
            summaryContainerElement.innerHTML += `
                <div class="progress-bar-container" style="margin-top: 1rem;">
                    <div class="progress-bar-info" style="display:flex; justify-content:space-between; font-size: 0.9em;">
                        <span>${option}${question.type === 'rating' ? ' نجوم' : ''}</span>
                        <span>${count} إجابة (${percentage}%)</span>
                    </div>
                    <div class="progress-bar-track" style="background-color: #e9ecef; border-radius: 1rem; overflow: hidden;">
                        <div class="progress-bar" style="height: 12px; background-color: var(--primary-blue); width:${percentage}%; border-radius: 1rem;"></div>
                    </div>
                </div>`;
        });
    } else { 
        const textAnswersContainer = document.createElement('div');
        textAnswersContainer.className = 'text-answers-summary';
        textAnswersContainer.style.maxHeight = '250px';
        textAnswersContainer.style.overflowY = 'auto';
        textAnswersContainer.style.border = '1px solid var(--border-color)';
        textAnswersContainer.style.borderRadius = 'var(--border-radius)';
        textAnswersContainer.style.padding = '1rem';
        textAnswersContainer.style.marginTop = '1rem';
        
        const validResponses = questionSpecificResponses.filter(r => r.answer != null && r.answer !== '');
        
        if (validResponses.length > 0) {
            validResponses.forEach(respObj => {
                const answerItem = document.createElement('div');
                answerItem.className = 'text-answer-item';
                answerItem.style.padding = '0.5rem';
                answerItem.style.borderBottom = '1px solid #eee';
                answerItem.textContent = respObj.answer;
                textAnswersContainer.appendChild(answerItem);
            });
            if(textAnswersContainer.lastChild) {
                textAnswersContainer.lastChild.style.borderBottom = 'none';
            }
        } else {
            textAnswersContainer.innerHTML = '<p style="color: var(--text-secondary);">لا توجد إجابات نصية لهذا السؤال.</p>';
        }
        
        summaryContainerElement.appendChild(textAnswersContainer);
    }
}

// ====== TABS AND MODAL LOGIC ======
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
}

function loadIndividualResponses() {
    const tbody = document.getElementById('responses-list-tbody');
    tbody.innerHTML = '';
    showLoader('loader-responses', true);

    if (currentSurveyResponses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem;">لا توجد إجابات فردية لعرضها.</td></tr>`;
        showLoader('loader-responses', false);
        return;
    }

    const firstQuestionId = currentSurveyData.questions?.[0]?.id;

    currentSurveyResponses.forEach((response, index) => {
        let firstAnswerText = '—'; 
        if (firstQuestionId) {
            const answerObj = response.answers?.find(a => a.questionId === firstQuestionId);
            if (answerObj && answerObj.answer != null && answerObj.answer !== '') {
                firstAnswerText = Array.isArray(answerObj.answer) ? answerObj.answer.join(', ') : String(answerObj.answer);
            }
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${response.timestamp?.toDate ? response.timestamp.toDate().toLocaleString('ar-EG') : 'غير محدد'}</td>
            <td>${firstAnswerText}</td>
            <td><span class="link-like" data-response-id="${response.id}">عرض التفاصيل</span></td>
        `;
        tbody.appendChild(row);
    });

    tbody.querySelectorAll('.link-like').forEach(link => {
        link.addEventListener('click', (e) => {
            const response = currentSurveyResponses.find(r => r.id === e.target.dataset.responseId);
            showResponseDetails(response, currentSurveyData.questions);
        });
    });
    
    showLoader('loader-responses', false);
}

function showResponseDetails(response, surveyQuestions) {
    const modal = document.getElementById('response-modal');
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = '';

    surveyQuestions.forEach((question, index) => {
        const answerObj = response.answers.find(a => a.questionId === question.id);
        let answerText = '<em style="color: var(--text-secondary)">(لا توجد إجابة)</em>';
        if (answerObj && answerObj.answer != null) {
            answerText = Array.isArray(answerObj.answer) ? answerObj.answer.join('، ') || answerText : String(answerObj.answer);
        }
        modalBody.innerHTML += `<div class="response-item"><p class="question">${index + 1}. ${question.text}</p><div class="answer">${answerText}</div></div>`;
    });
    
    modal.style.display = 'flex';
}

// ====== EXPORT FUNCTIONS (REVISED) ======
function exportResponsesToCSV(surveyId) {
    if (!currentSurveyData || !currentSurveyResponses || currentSurveyResponses.length === 0) {
        showAlert('لا توجد بيانات لتصديرها.', 'info');
        return;
    }
    showAlert('جاري تجهيز ملف CSV...', 'info', 4000);
    try {
        const questions = currentSurveyData.questions;
        // Header row: 'ResponseID', 'Timestamp', followed by each question's text.
        // We escape commas in question text to prevent CSV corruption.
        const headers = ['ResponseID', 'Timestamp', ...questions.map(q => `"${q.text.replace(/"/g, '""')}"`)];
        
        // Add UTF-8 BOM for Excel to recognize Arabic characters correctly.
        let csvContent = '\uFEFF' + headers.join(',') + '\r\n';

        // Data rows
        currentSurveyResponses.forEach(response => {
            const rowData = [
                response.id,
                `"${response.timestamp?.toDate ? response.timestamp.toDate().toLocaleString('ar-SA') : 'N/A'}"`,
                ...questions.map(q => {
                    const answerObj = response.answers.find(a => a.questionId === q.id);
                    if (!answerObj || answerObj.answer == null || answerObj.answer === '') return '""';
                    
                    // Format answer: join arrays, convert others to string.
                    const text = Array.isArray(answerObj.answer) ? answerObj.answer.join('; ') : String(answerObj.answer);
                    
                    // Escape double quotes within the answer itself.
                    return `"${text.replace(/"/g, '""')}"`;
                })
            ];
            csvContent += rowData.join(',') + '\r\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `survey_${surveyId}_responses.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showAlert('تم بدء تحميل ملف Excel (CSV).', 'success');
    } catch (error) {
        console.error("CSV Export Error:", error);
        showAlert(`فشل تصدير CSV: ${error.message}`, 'error');
    }
}

function exportResponsesToPDF(surveyId) {
    if (!currentSurveyData || !currentSurveyResponses || currentSurveyResponses.length === 0) {
        showAlert('لا توجد بيانات للتصدير.', 'info');
        return;
    }
    showAlert('جاري تجهيز ملف PDF...', 'info', 10000);
    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        // Ensure the Amiri font is loaded from the script tag in HTML
        // This font is registered as 'Amiri-Regular'
        doc.addFont('Amiri-Regular-normal.js', 'Amiri-Regular', 'normal');

        const questions = currentSurveyData.questions;
        const tableHeaders = [['#', 'تاريخ الإجابة', ...questions.map(q => q.text)]];
        
        const tableBody = currentSurveyResponses.map((response, index) => [
            index + 1,
            response.timestamp?.toDate ? response.timestamp.toDate().toLocaleDateString('ar-SA') : 'N/A',
            ...questions.map(q => {
                const answerObj = response.answers.find(a => a.questionId === q.id);
                if (!answerObj || answerObj.answer == null) return '';
                // Format answer for PDF, using a different separator for clarity.
                return Array.isArray(answerObj.answer) ? answerObj.answer.join('، ') : String(answerObj.answer);
            })
        ]);

        doc.autoTable({
            head: tableHeaders,
            body: tableBody,
            startY: 25,
            theme: 'grid',
            styles: {
                font: 'Amiri-Regular', // Use the registered font name
                halign: 'right', // Align all cell content to the right for RTL
                fontSize: 8,
            },
            headStyles: {
                fillColor: [13, 110, 253],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center', // Center align header text
            },
            didDrawPage: function (data) {
                // Add header on each page
                doc.setR2L(true);
                doc.setFont('Amiri-Regular', 'normal');
                doc.setFontSize(18);
                const title = `نتائج استبيان: ${currentSurveyData.title}`;
                doc.text(title, doc.internal.pageSize.getWidth() - 14, 15, { align: 'right' });
            },
        });

        doc.save(`survey_${surveyId}_responses.pdf`);
        showAlert('تم بدء تحميل ملف PDF.', 'success');
    } catch (error) {
        console.error("PDF Export Error:", error);
        showAlert(`فشل تصدير PDF: ${error.message}`, 'error');
    }
}


// ====== REWRITTEN initResultsPage FUNCTION ======
async function initResultsPage(surveyIdFromUrl) {
    console.log("Results Page: Initializing with new logic. Survey ID:", surveyIdFromUrl);

    // Initial references
    const pageTitle = document.getElementById('page-title');
    const surveyMainTitleResults = document.getElementById('survey-main-title-results');
    const surveyMainDescriptionResults = document.getElementById('survey-main-description-results');
    const surveyMainLogoResults = document.getElementById('survey-main-logo-results');
    const totalResponsesElem = document.getElementById('total-responses-results');

    // Modal listeners
    const responseModal = document.getElementById('response-modal');
    document.getElementById('modal-close-btn')?.addEventListener('click', () => responseModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target == responseModal) responseModal.style.display = 'none';
    });
    
    if (!surveyIdFromUrl) {
        showAlert('معرف الاستبيان مفقود من الرابط.', 'error');
        return;
    }

    showLoadingSpinner(true);
    try {
        const surveyDoc = await db.collection('surveys').doc(surveyIdFromUrl).get();
        if (!surveyDoc.exists) {
            showAlert('الاستبيان المحدد غير موجود.', 'error');
            showLoadingSpinner(false);
            return;
        }
        currentSurveyData = { id: surveyDoc.id, ...surveyDoc.data() };

        const isAdminVerified = await (async () => {
            if (sessionStorage.getItem(`adminPinVerified_${surveyIdFromUrl}`) === 'true') return true;
            const pin = prompt("للوصول لصفحة النتائج، يرجى إدخال الرمز السري للمشرف:");
            if (pin && await hashPassword(pin) === currentSurveyData.adminPinHash) {
                sessionStorage.setItem(`adminPinVerified_${surveyIdFromUrl}`, 'true');
                showAlert('تم التحقق بنجاح.', 'success');
                return true;
            }
            return false;
        })();

        if (!isAdminVerified) {
            showAlert('الرمز السري غير صحيح أو تم الإلغاء. لا يمكن عرض النتائج.', 'error');
            window.location.href = `survey.html?id=${surveyIdFromUrl}`;
            return;
        }
        
        const responsesSnapshot = await db.collection('responses').where('surveyId', '==', surveyIdFromUrl).orderBy('timestamp', 'desc').get();
        currentSurveyResponses = responsesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        pageTitle.textContent = `نتائج: ${currentSurveyData.title}`;
        surveyMainTitleResults.textContent = currentSurveyData.title;
        surveyMainDescriptionResults.textContent = currentSurveyData.description || '';
        if (currentSurveyData.logoUrl && currentSurveyData.logoUrl !== '#') {
            surveyMainLogoResults.src = currentSurveyData.logoUrl;
            surveyMainLogoResults.style.display = 'block';
        }
        totalResponsesElem.textContent = currentSurveyResponses.length;

        const dynamicHeader = document.getElementById('individual-responses-dynamic-header');
        if (dynamicHeader && currentSurveyData.questions && currentSurveyData.questions.length > 0) {
            dynamicHeader.textContent = currentSurveyData.questions[0].text || 'المُعرِّف الأول';
        }

        setupAdminControlsResultsPage(surveyIdFromUrl, true);
        setupTabs();
        
        loadSummaryResults();
        loadIndividualResponses();
        
    } catch (error) {
        console.error("Results Page: Initialization error:", error);
        showAlert(`حدث خطأ أثناء تهيئة صفحة النتائج: ${error.message}`, 'error');
    } finally {
        showLoadingSpinner(false);
    }
}

function loadSummaryResults() {
    const container = document.getElementById('questions-results-display-container');
    container.innerHTML = '';
    const loadingMsgEl = document.getElementById('loading-results-message');
    if (loadingMsgEl) loadingMsgEl.style.display = 'none';

    if (currentSurveyResponses.length === 0) {
        container.innerHTML = '<p>لا توجد إجابات لعرض ملخص لها.</p>';
        return;
    }
    loadAndDisplayResults(currentSurveyData.id, container, true);
}

function setupAdminControlsResultsPage(surveyId, isAdminVerified) {
    const toggleBtn = document.getElementById('toggle-results-view-btn-results');
    const exportCsvBtn = document.getElementById('export-responses-csv-btn-results');
    const exportPdfBtn = document.getElementById('export-responses-pdf-btn-results');
    const editLink = document.getElementById('edit-survey-link-results');
    const adminControlsContainer = document.getElementById('admin-controls-results-page');

    if(isAdminVerified) {
        if(adminControlsContainer) adminControlsContainer.style.display = 'block';
        if(toggleBtn) toggleBtn.style.display = 'inline-flex';
        if(exportCsvBtn) exportCsvBtn.style.display = 'inline-flex';
        if(exportPdfBtn) exportPdfBtn.style.display = 'inline-flex';
        if(editLink) {
             editLink.style.display = 'inline-flex';
             editLink.href = `admin.html?id=${surveyId}`;
             editLink.textContent = "تعديل الاستبيان";
        }
        
        const updateToggleText = () => { 
            if(toggleBtn && currentSurveyData?.settings) {
                const isAllowed = currentSurveyData.settings.allowResultsView;
                toggleBtn.innerHTML = (isAllowed ? 'إخفاء النتائج عن العامة' : 'السماح بعرض النتائج للعامة');
            }
        };

        if(toggleBtn && currentSurveyData && surveyId) {
            updateToggleText();
            toggleBtn.onclick = async () => {
                showLoadingSpinner(true);
                try {
                    const newState = !currentSurveyData.settings.allowResultsView;
                    await db.collection('surveys').doc(surveyId).update({'settings.allowResultsView':newState});
                    currentSurveyData.settings.allowResultsView = newState; 
                    updateToggleText();
                    showAlert(`تم ${newState?'السماح':'منع'} عرض النتائج للعامة.`, 'success');
                } catch(e){ 
                    showAlert('خطأ في تحديث الإعداد.', 'error');
                } finally { 
                    showLoadingSpinner(false); 
                }
            };
        }
        
        if(exportCsvBtn && surveyId) exportCsvBtn.onclick = () => exportResponsesToCSV(surveyId);
        if(exportPdfBtn && surveyId) exportPdfBtn.onclick = () => exportResponsesToPDF(surveyId);

    } else { 
        if(adminControlsContainer) adminControlsContainer.style.display = 'none';
    }
}

// ====== Page Initialization Router ======
document.addEventListener('DOMContentLoaded', () => {
    const pathname = window.location.pathname;
    const surveyId = getSurveyIdFromUrl();

    // Simplified Router
    if (pathname.includes('admin.html')) {
        initAdminPage(surveyId);
    } else if (pathname.includes('survey.html')) {
        initSurveyPage(surveyId);
    } else if (pathname.includes('results.html')) { 
        initResultsPage(surveyId);
    } else {
        console.warn("No specific page content recognized for initialization in script.js.");
    }

    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
});