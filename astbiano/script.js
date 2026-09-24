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
let pendingImages = {}; // صور المجيب قبل الإرسال: { questionId: dataURL }

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isImageData = (v) => typeof v === 'string' && /^data:image\//.test(v);
const isEmptyAnswer = (a) => a == null || a === '' || (Array.isArray(a) && a.length === 0);

const showAlert = (message, type, duration = 4000) => {
    const container = $('alert-container');
    if (!container) return;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.textContent = message;
    container.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), duration);
};
const showLoader = (show = true) => {
    const spinner = $('loading-spinner');
    if (spinner) spinner.style.display = show ? 'block' : 'none';
};
const getSurveyIdFromUrl = () => new URLSearchParams(window.location.search).get('id');
const buildSurveyLink = (surveyId) => {
    const u = new URL('survey.html', window.location.href);
    u.search = `?id=${encodeURIComponent(surveyId)}`;
    u.hash = '';
    return u.toString();
};
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

// --- Clipboard ---
const flashBtn = (btn, text) => {
    if (!btn) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    btn.textContent = text;
    clearTimeout(btn._flashTimer);
    btn._flashTimer = setTimeout(() => { btn.textContent = btn.dataset.orig; }, 2000);
};
const fallbackCopy = (text, onDone) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); if (onDone) onDone(); }
    catch (e) { showAlert('تعذّر النسخ.', 'error'); }
    ta.remove();
};
const copyToClipboard = (text, btn) => {
    const done = () => flashBtn(btn, 'تم النسخ!');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
        fallbackCopy(text, done);
    }
};
// الحافظة تقبل صور PNG فقط، لذلك نحوّل أي صورة إلى PNG قبل النسخ
const dataUrlToPngBlob = (dataUrl) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        c.toBlob(b => b ? resolve(b) : reject(new Error('blob')), 'image/png');
    };
    img.onerror = reject;
    img.src = dataUrl;
});
async function copyImageToClipboard(dataUrl, btn) {
    try {
        if (!navigator.clipboard || !window.ClipboardItem) throw new Error('unsupported');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': dataUrlToPngBlob(dataUrl) })]);
        flashBtn(btn, 'تم نسخ الصورة!');
    } catch (e) {
        console.error(e);
        showAlert('تعذّر نسخ الصورة تلقائياً في هذا المتصفح. اضغط بزر الفأرة الأيمن على الصورة واختر "نسخ الصورة".', 'error', 6000);
    }
}
// نسخ HTML (نص/صور مضمّنة) مع نص عادي احتياطي
async function copyRich(html, plain, btn, okMsg) {
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error('unsupported');
    await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' })
    })]);
    flashBtn(btn, okMsg);
}
const answerDateHtml = (d) => d ? `<p style="color:#666;font-size:12px;">${esc(d)}</p>` : '';
async function copySingleAnswer(raw, dateText, btn) {
    if (isImageData(raw)) {
        // صورة + التاريخ تحتها
        const html = `<div dir="rtl"><p><img src="${raw}" alt="" style="max-width:480px;height:auto;"></p>${answerDateHtml(dateText)}</div>`;
        try { await copyRich(html, dateText ? `[صورة مرفقة]\n\n${dateText}` : '[صورة مرفقة]', btn, 'تم نسخ الصورة مع التاريخ!'); }
        catch (e) { console.error(e); await copyImageToClipboard(raw, btn); }
        return;
    }
    const body = isEmptyAnswer(raw) ? '' : (Array.isArray(raw) ? raw.join('\n') : String(raw));
    const plain = dateText ? `${body}\n\n${dateText}` : body;
    const html = `<div dir="rtl"><p>${esc(body).replace(/\n/g, '<br>')}</p>${answerDateHtml(dateText)}</div>`;
    try { await copyRich(html, plain, btn, 'تم نسخ الرد مع التاريخ!'); }
    catch (e) { console.error(e); copyToClipboard(plain, btn); }
}
// نسخ الرد كاملاً (نصوص + صور مضمّنة) بصيغة HTML مع نص عادي احتياطي
async function copyFullResponse(response, btn) {
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', calendar: 'gregory', numberingSystem: 'latn' };
    const dateText = response.timestamp?.toDate ? response.timestamp.toDate().toLocaleString('ar-EG', dateOptions) : '';
    // بدون عناوين الأسئلة: فقط ما كتبه المرسل (نص/صورة) ثم التاريخ في الأسفل
    let html = `<div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;">`;
    const plainParts = [];
    response.answers.forEach(a => {
        const raw = a.answer;
        if (isEmptyAnswer(raw)) return;
        if (isImageData(raw)) {
            html += `<p><img src="${raw}" alt="" style="max-width:480px;height:auto;"></p>`;
            plainParts.push('[صورة مرفقة]');
        } else {
            const txt = Array.isArray(raw) ? raw.join('، ') : String(raw);
            html += `<p>${esc(txt).replace(/\n/g, '<br>')}</p>`;
            plainParts.push(txt);
        }
    });
    if (dateText) { html += `<p style="color:#666;font-size:12px;">${esc(dateText)}</p>`; plainParts.push(dateText); }
    html += '</div>';
    const plain = plainParts.join('\n\n');
    try {
        if (!navigator.clipboard || !window.ClipboardItem) throw new Error('unsupported');
        await navigator.clipboard.write([new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' })
        })]);
        flashBtn(btn, 'تم نسخ الرد مع الصور!');
    } catch (e) {
        console.error(e);
        copyToClipboard(plain, btn);
        showAlert('متصفحك لا يدعم نسخ الصور ضمن النص؛ تم نسخ النص فقط.', 'info', 5000);
    }
}

// =====================================================================
// IMAGE HANDLING (ضغط الصور وتحويلها إلى Data URL لتخزينها مع البيانات)
// =====================================================================
const IMAGE_PRESETS = {
    cover: { mime: 'image/jpeg', maxChars: 380000, steps: [[1600, 0.8], [1400, 0.7], [1200, 0.6], [1000, 0.5], [800, 0.45]] },
    logo: { mime: 'image/png', maxChars: 130000, steps: [[300, 1], [240, 1], [300, 0.8, 'image/jpeg'], [200, 0.7, 'image/jpeg']] },
    answer: { mime: 'image/jpeg', maxChars: 800000, steps: [[1000, 0.75], [800, 0.62], [640, 0.5], [480, 0.4], [360, 0.35]] }
};
const loadImageFromFile = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('تعذّر قراءة الصورة. استخدم صيغة JPG أو PNG أو WEBP.')); };
    img.src = url;
});
const renderImageToDataURL = (img, maxSide, quality, mime) => {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (mime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL(mime, quality);
};
async function compressImageFile(file, preset, maxCharsOverride) {
    if (!file || !file.type.startsWith('image/')) throw new Error('الملف المختار ليس صورة.');
    if (file.size > 25 * 1024 * 1024) throw new Error('حجم الصورة كبير جداً (الحد 25 ميجابايت).');
    const img = await loadImageFromFile(file);
    const maxChars = maxCharsOverride || preset.maxChars;
    for (const [side, quality, mime] of preset.steps) {
        const out = renderImageToDataURL(img, side, quality, mime || preset.mime);
        if (out.length <= maxChars) return out;
    }
    throw new Error('حجم الصورة كبير جداً حتى بعد الضغط، اختر صورة أصغر.');
}

// =====================================================================
// DAILY LIMIT (الحد اليومي لكل مستخدم/جهاز)
// =====================================================================
const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dailyStorageKey = (id) => `daily_${id}_${todayKey()}`;
const getDailyCount = (id) => parseInt(localStorage.getItem(dailyStorageKey(id)) || '0', 10) || 0;
const incrementDailyCount = (id) => {
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith(`daily_${id}_`) && k !== dailyStorageKey(id)) localStorage.removeItem(k);
    });
    localStorage.setItem(dailyStorageKey(id), String(getDailyCount(id) + 1));
};

// =====================================================================
// THEME (المظهر والتنسيق)
// =====================================================================
const FONT_OPTIONS = ['Cairo', 'Tajawal', 'Almarai', 'Amiri', 'Noto Naskh Arabic', 'Changa', 'El Messiri', 'IBM Plex Sans Arabic', 'Reem Kufi'];
const FONT_SIZES = { small: '14px', medium: '16px', large: '18px', xlarge: '20px' };
const DEFAULT_THEME = { pageBg: '#F0F2F5', cardBg: '#FFFFFF', textColor: '#333333', titleColor: '#4A55A2', accent: '#4A55A2', fontFamily: 'Cairo', fontSize: 'medium' };
const THEME_PRESETS = {
    'افتراضي': { ...DEFAULT_THEME },
    'داكن': { pageBg: '#12141C', cardBg: '#1E2230', textColor: '#E7E9F0', titleColor: '#9FB4FF', accent: '#5B7CFA', fontFamily: 'Tajawal', fontSize: 'medium' },
    'دافئ': { pageBg: '#FBF3E6', cardBg: '#FFFFFF', textColor: '#4A3B2A', titleColor: '#A5522D', accent: '#B8623A', fontFamily: 'Amiri', fontSize: 'large' },
    'طبيعي': { pageBg: '#EEF5EF', cardBg: '#FFFFFF', textColor: '#26382C', titleColor: '#2F6B45', accent: '#3C8A5A', fontFamily: 'Almarai', fontSize: 'medium' },
    'أنيق': { pageBg: '#F7F5FB', cardBg: '#FFFFFF', textColor: '#2C2740', titleColor: '#5B3CC4', accent: '#6C4AE0', fontFamily: 'El Messiri', fontSize: 'medium' }
};
const hexToRgb = (hex) => {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return (h.length !== 6 || isNaN(n)) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb) => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
const shade = (hex, amt) => amt < 0 ? mixHex(hex, '#000000', -amt) : mixHex(hex, '#ffffff', amt);
const luminance = (hex) => {
    const [r, g, b] = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const readableOn = (hex) => luminance(hex) > 0.45 ? '#1f2937' : '#ffffff';

const loadGoogleFont = (name) => {
    if (!name || document.querySelector(`link[data-font="${name}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.font = name;
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
};
function applyTheme(theme, target = document.documentElement) {
    const t = { ...DEFAULT_THEME, ...(theme || {}) };
    loadGoogleFont(t.fontFamily);
    const s = target.style;
    const darkCard = luminance(t.cardBg) < 0.3;
    s.setProperty('--bg-color', t.pageBg);
    s.setProperty('--card-bg-color', t.cardBg);
    s.setProperty('--text-color', t.textColor);
    s.setProperty('--title-color', t.titleColor);
    s.setProperty('--primary-color', t.accent);
    s.setProperty('--primary-hover', shade(t.accent, -0.15));
    s.setProperty('--secondary-color', shade(t.accent, 0.3));
    s.setProperty('--accent-color', shade(t.accent, 0.55));
    s.setProperty('--btn-text-color', readableOn(t.accent));
    s.setProperty('--text-muted', mixHex(t.textColor, t.cardBg, 0.4));
    s.setProperty('--border-color', mixHex(t.cardBg, t.textColor, 0.16));
    s.setProperty('--input-bg', darkCard ? shade(t.cardBg, 0.08) : mixHex(t.cardBg, '#ffffff', 0.6));
    s.setProperty('--font-family', `"${t.fontFamily}"`);
    const px = FONT_SIZES[t.fontSize] || FONT_SIZES.medium;
    if (target === document.documentElement) s.setProperty('--base-font-size', px);
    else s.fontSize = px;
}

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

// تكبير/تصغير الصور عند الضغط عليها
document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('answer-img')) e.target.classList.toggle('expanded');
});

// =====================================================================
// DASHBOARD PAGE LOGIC
// =====================================================================
function renderMySurveysList() {
    const mySurveysList = $('my-surveys-list');
    if (!mySurveysList) return;
    const surveys = getManagedSurveys();
    mySurveysList.innerHTML = surveys.length ? '' : '<p>لم تقم بإدارة أي استفتاء بعد. ابدأ بإنشاء واحد جديد أو ابحث عن استفتاء موجود.</p>';
    surveys.forEach(survey => {
        const surveyCard = document.createElement('div');
        surveyCard.className = 'survey-item-card';
        surveyCard.innerHTML = `
            <div class="survey-item-header">
                <h3>${esc(survey.title || 'استفتاء بدون عنوان')}</h3>
                <button class="delete-survey-btn" title="حذف الاستفتاء نهائياً">&#10006;</button>
            </div>
            <code>ID: ${esc(survey.id)}</code>`;

        surveyCard.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-survey-btn')) loadSurveyForManagement(survey.id, survey.pin);
        });
        surveyCard.querySelector('.delete-survey-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('هل أنت متأكد من رغبتك في حذف هذا الاستفتاء وكل ردوده بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.')) {
                deleteSurvey(survey.id);
            }
        });
        mySurveysList.appendChild(surveyCard);
    });
}

// تُستدعى مرة واحدة فقط (كانت تُستدعى عدة مرات وتكرر المستمعات)
function initDashboardPage() {
    renderMySurveysList();

    $('survey-lookup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = $('survey-id-input').value.trim();
        const pin = $('survey-pin-input').value.trim();
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

    $('back-to-dashboard-btn').addEventListener('click', () => {
        $('survey-management-view').style.display = 'none';
        $('dashboard-home').style.display = '';
        renderMySurveysList();
    });
}

async function deleteSurvey(surveyId) {
    showLoader(true);
    try {
        const responsesQuery = await db.collection('responses').where('surveyId', '==', surveyId).get();
        if (!responsesQuery.empty) {
            // الدُفعة الواحدة محدودة بـ 500 عملية، لذا نقسمها
            const docs = responsesQuery.docs;
            for (let i = 0; i < docs.length; i += 400) {
                const batch = db.batch();
                docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        }
        await db.collection('surveys').doc(surveyId).delete();
        localStorage.setItem('managedSurveys', JSON.stringify(getManagedSurveys().filter(s => s.id !== surveyId)));
        showAlert('تم حذف الاستفتاء بنجاح.', 'success');
        renderMySurveysList();
    } catch (error) {
        console.error("Error deleting survey:", error);
        showAlert('حدث خطأ أثناء حذف الاستفتاء.', 'error');
    } finally {
        showLoader(false);
    }
}

async function loadSurveyForManagement(surveyId, surveyPin) {
    $('dashboard-home').style.display = 'none';
    $('survey-management-view').style.display = '';
    showLoader(true);

    try {
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) throw new Error("لم يتم العثور على الاستفتاء.");
        currentSurveyData = { id: surveyDoc.id, ...surveyDoc.data() };

        const responsesSnapshot = await db.collection('responses').where('surveyId', '==', surveyId).orderBy('timestamp', 'desc').get();
        currentSurveyResponses = responsesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse(); // الأقدم أولاً، والجديد في النهاية

        $('survey-title-header').textContent = currentSurveyData.title;
        $('response-count-tab').textContent = currentSurveyResponses.length;
        $('edit-survey-link').href = `admin.html?id=${surveyId}`;
        $('view-survey-link').href = `survey.html?id=${surveyId}`;

        const shareLink = buildSurveyLink(surveyId);
        $('survey-share-link-dashboard').value = shareLink;
        $('copy-share-link-dashboard').onclick = () => copyToClipboard(shareLink, $('copy-share-link-dashboard'));

        let initialIndex = 0;
        const savedId = localStorage.getItem(`lastViewedResponse_${surveyId}`);
        if (savedId) {
            const found = currentSurveyResponses.findIndex(r => r.id === savedId);
            if (found > -1) initialIndex = found;
        }

        setupDashboardControls();
        renderAllResponseViews(initialIndex);
        setupExportButtons(surveyId);
    } catch (error) {
        console.error(error);
        showAlert(error.message, 'error');
        $('back-to-dashboard-btn').click();
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
                const targetPane = $(button.dataset.tab + '-content') || $(button.dataset.subtab + '-view');
                if (targetPane) targetPane.classList.add('active');
            };
        });
    };
    setup('.tab-btn', '.tab-pane');
    setup('.sub-tab-btn', '.sub-tab-pane');

    const toggle = $('accepting-responses-toggle');
    toggle.checked = !!(currentSurveyData.settings && currentSurveyData.settings.acceptingResponses);
    toggle.onchange = async () => {
        const newState = toggle.checked;
        showLoader(true);
        try {
            await db.collection('surveys').doc(currentSurveyData.id).update({ 'settings.acceptingResponses': newState });
            currentSurveyData.settings.acceptingResponses = newState;
            showAlert(`تم ${newState ? 'فتح' : 'إغلاق'} استقبال الردود.`, 'success');
            renderSettingsSummary();
        } catch (err) {
            showAlert('فشل تحديث الحالة.', 'error');
            toggle.checked = !newState;
        } finally {
            showLoader(false);
        }
    };
}

function renderSettingsSummary() {
    const settings = currentSurveyData.settings || {};
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', calendar: 'gregory', numberingSystem: 'latn' };
    $('settings-summary-area').innerHTML = `
        <p><strong>حالة الاستفتاء:</strong> ${settings.acceptingResponses ? '<span style="color:var(--success-color);">يستقبل الردود</span>' : '<span style="color:var(--error-color);">مغلق</span>'}</p>
        <p><strong>الإجابات المتعددة:</strong> ${settings.allowMultipleSubmissions ? 'مسموح بها' : 'غير مسموح بها'}</p>
        <p><strong>الحد اليومي لكل مستخدم:</strong> ${settings.dailyLimit ? settings.dailyLimit + ' ردود/يوم' : 'بدون حد'}</p>
        <p><strong>عرض النتائج للعامة:</strong> ${settings.allowResultsView ? 'مسموح' : 'غير مسموح'}</p>
        <p><strong>شريط التقدم:</strong> ${settings.showProgress ? 'مُفعّل' : 'غير مُفعّل'}</p>
        <p><strong>الغلاف / الشعار:</strong> ${currentSurveyData.coverUrl ? 'غلاف ✓' : 'بدون غلاف'} / ${currentSurveyData.logoUrl ? 'شعار ✓' : 'بدون شعار'}</p>
        <p><strong>التنسيق المخصص:</strong> ${settings.theme ? `مُفعّل (الخط: ${esc(settings.theme.fontFamily)})` : 'الافتراضي'}</p>
        <p><strong>تاريخ البدء:</strong> ${settings.startDate ? new Date(settings.startDate + 'T' + (settings.startTime || '00:00')).toLocaleString('ar-EG', dateOptions) : 'فوري'}</p>
        <p><strong>تاريخ الانتهاء:</strong> ${settings.endDate ? new Date(settings.endDate + 'T' + (settings.endTime || '23:59')).toLocaleString('ar-EG', dateOptions) : 'لا يوجد'}</p>
    `;
}

// ملاحظة: لا نستبدل innerHTML للعناصر التي تحتوي أزرار التنقل (كان هذا سبب الخطأ
// "Cannot set properties of null (setting 'innerHTML')" عند فتح استفتاء بعد آخر بلا ردود)
function renderAllResponseViews(initialIndividualIndex = 0) {
    renderSettingsSummary();

    const controls = document.querySelector('.individual-controls');
    if (currentSurveyResponses.length === 0) {
        const msg = '<div class="card" style="text-align:center;"><p>لا توجد ردود لعرضها حتى الآن.</p></div>';
        $('summary-view').innerHTML = msg;
        $('individual-response-content').innerHTML = msg;
        if (controls) controls.style.display = 'none';
        return;
    }
    if (controls) controls.style.display = '';
    renderSummaryView();
    renderIndividualView(initialIndividualIndex);
    setupIndividualNav();
}

function buildAnswerNode(raw) {
    const div = document.createElement('div');
    div.className = 'answer-text';
    if (isImageData(raw)) {
        div.style.padding = '0.5rem';
        const img = document.createElement('img');
        img.src = raw; img.alt = 'صورة مرفوعة'; img.className = 'answer-img';
        div.appendChild(img);
    } else if (isEmptyAnswer(raw)) {
        div.innerHTML = '<em>لم تتم الإجابة</em>';
    } else {
        div.textContent = Array.isArray(raw) ? raw.join('، ') : String(raw);
    }
    return div;
}

function renderSummaryView(containerId = 'summary-view', opts = {}) {
    const hideImages = !!opts.hideImages;
    const container = $(containerId);
    container.innerHTML = '';
    currentSurveyData.questions.forEach(q => {
        const card = document.createElement('div');
        card.className = 'card';
        const h = document.createElement('h3');
        h.textContent = q.text;
        card.appendChild(h);

        const responsesForQ = currentSurveyResponses
            .map(r => (r.answers || []).find(a => a.questionId === q.id)?.answer)
            .filter(a => !isEmptyAnswer(a));

        if (q.type === 'image') {
            const imgs = responsesForQ.filter(isImageData);
            if (hideImages) {
                card.insertAdjacentHTML('beforeend', `<p>تم رفع ${imgs.length} صورة (لا تُعرض الصور للعامة).</p>`);
            } else if (imgs.length) {
                const gallery = document.createElement('div');
                gallery.className = 'image-gallery';
                imgs.forEach(src => { const im = document.createElement('img'); im.src = src; im.className = 'answer-img'; im.alt = 'صورة مرفوعة'; gallery.appendChild(im); });
                card.appendChild(gallery);
            } else {
                card.insertAdjacentHTML('beforeend', '<div class="answers-list"><em>لا توجد صور لهذا السؤال.</em></div>');
            }
        } else {
            card.insertAdjacentHTML('beforeend', `<div class="answers-list">${responsesForQ.map(ans => `<p>${esc(Array.isArray(ans) ? ans.join('، ') : ans)}</p>`).join('') || '<em>لا توجد إجابات لهذا السؤال.</em>'}</div>`);
        }

        const statsDiv = document.createElement('div');
        if (['radio', 'checkbox', 'dropdown', 'rating'].includes(q.type)) {
            const counts = {};
            responsesForQ.forEach(answer => {
                (Array.isArray(answer) ? answer : [answer]).forEach(opt => { counts[opt] = (counts[opt] || 0) + 1; });
            });
            const denominator = q.type === 'checkbox' ? responsesForQ.length : Object.values(counts).reduce((a, b) => a + b, 0);
            const opts2 = (q.options && q.options.length) ? q.options : (q.type === 'rating' ? ['5', '4', '3', '2', '1'] : []);
            opts2.forEach(opt => {
                const count = counts[opt] || 0;
                const percentage = denominator > 0 ? ((count / denominator) * 100).toFixed(1) : 0;
                statsDiv.innerHTML += `<div class="progress-bar-container"><div class="progress-bar-info"><span>${esc(opt)}${q.type === 'rating' ? ' نجوم' : ''}</span><span>${count} (${percentage}%)</span></div><div class="progress-bar-track"><div class="progress-bar" style="width:${percentage}%;"></div></div></div>`;
            });
        }
        statsDiv.innerHTML += `<p class="question-stats">إجمالي الردود على هذا السؤال: <strong>${responsesForQ.length}</strong> من أصل ${currentSurveyResponses.length} إجابة كلية.</p>`;
        card.appendChild(statsDiv);
        container.appendChild(card);
    });
}

function renderIndividualView(index) {
    currentIndividualResponseIndex = index;
    if (currentSurveyData && currentSurveyData.id && currentSurveyResponses[index]) {
        localStorage.setItem(`lastViewedResponse_${currentSurveyData.id}`, currentSurveyResponses[index].id);
    }
    const container = $('individual-response-content');
    const response = currentSurveyResponses[index];
    container.innerHTML = '';
    if (!response) return;

    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', calendar: 'gregory', numberingSystem: 'latn' };
    const formattedDate = response.timestamp?.toDate ? response.timestamp.toDate().toLocaleString('ar-EG', dateOptions) : '';

    response.answers.forEach(answer => {
        const raw = answer.answer;
        const wrap = document.createElement('div');
        wrap.className = 'question-response';

        const title = document.createElement('div');
        title.className = 'question-title';
        title.textContent = answer.questionText;
        wrap.appendChild(title);
        wrap.appendChild(buildAnswerNode(raw));

        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;justify-content:flex-end;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid #eee;';
        const btn = document.createElement('button');
        btn.className = 'btn secondary small';
        btn.textContent = isImageData(raw) ? 'نسخ الصورة' : 'نسخ الرد';
        btn.onclick = () => copySingleAnswer(raw, formattedDate, btn);
        footer.appendChild(btn);
        wrap.appendChild(footer);
        container.appendChild(wrap);
    });

    const bottom = document.createElement('div');
    bottom.className = 'response-timestamp';
    bottom.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;';
    const dateSpan = document.createElement('span');
    dateSpan.textContent = formattedDate;
    const copyAllBtn = document.createElement('button');
    copyAllBtn.className = 'btn primary small';
    copyAllBtn.textContent = 'النسخ كاملاً مع الصور';
    copyAllBtn.onclick = () => copyFullResponse(response, copyAllBtn);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn small';
    delBtn.style.cssText = 'background:var(--error-color);color:#fff;';
    delBtn.textContent = 'حذف هذا الرد';
    delBtn.onclick = () => deleteSingleResponse(index);
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:0.5rem;flex-wrap:wrap;';
    btnGroup.appendChild(copyAllBtn);
    btnGroup.appendChild(delBtn);
    bottom.appendChild(dateSpan);
    bottom.appendChild(btnGroup);
    container.appendChild(bottom);

    const totalResponses = currentSurveyResponses.length;
    $('individual-counter').textContent = `عرض ${index + 1} من ${totalResponses}`;
    $('prev-response-btn').disabled = (index === 0);
    $('next-response-btn').disabled = (index === totalResponses - 1);
}

const updateResponseCount = () => {
    const el = $('response-count-tab');
    if (el) el.textContent = currentSurveyResponses.length;
    const allBtn = $('delete-all-responses-btn');
    if (allBtn) allBtn.disabled = currentSurveyResponses.length === 0;
};

async function deleteSingleResponse(index) {
    const response = currentSurveyResponses[index];
    if (!response) return;
    if (!confirm('هل أنت متأكد من حذف هذا الرد نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    showLoader(true);
    try {
        await db.collection('responses').doc(response.id).delete();
        currentSurveyResponses.splice(index, 1);
        updateResponseCount();
        renderAllResponseViews(Math.max(0, Math.min(index, currentSurveyResponses.length - 1)));
        showAlert('تم حذف الرد.', 'success');
    } catch (err) {
        console.error(err);
        showAlert('فشل حذف الرد: ' + err.message, 'error');
    } finally {
        showLoader(false);
    }
}

async function deleteAllResponses() {
    const total = currentSurveyResponses.length;
    if (!total) return showAlert('لا توجد ردود لحذفها.', 'info');
    if (!confirm(`سيتم حذف جميع الردود (${total}) نهائياً ولا يمكن التراجع. هل تريد المتابعة؟`)) return;
    if (!confirm('تأكيد أخير: حذف كل الردود؟')) return;
    showLoader(true);
    try {
        const docs = currentSurveyResponses.slice();
        for (let i = 0; i < docs.length; i += 400) {
            const batch = db.batch();
            docs.slice(i, i + 400).forEach(r => batch.delete(db.collection('responses').doc(r.id)));
            await batch.commit();
        }
        currentSurveyResponses = [];
        updateResponseCount();
        renderAllResponseViews(0);
        showAlert(`تم حذف ${total} رد.`, 'success');
    } catch (err) {
        console.error(err);
        showAlert('فشل حذف الردود: ' + err.message, 'error');
    } finally {
        showLoader(false);
    }
}

function setupIndividualNav() {
    $('next-response-btn').onclick = () => renderIndividualView(Math.min(currentIndividualResponseIndex + 1, currentSurveyResponses.length - 1));
    $('prev-response-btn').onclick = () => renderIndividualView(Math.max(currentIndividualResponseIndex - 1, 0));
}

// =====================================================================
// ADMIN/CREATE PAGE LOGIC
// =====================================================================
function initAdminPage() {
    const surveyId = getSurveyIdFromUrl();
    let questionCounter = 0;
    let coverData = null;
    let logoData = null;
    let legacyBg = '#F0F2F5';

    // ---------- الغلاف والشعار ----------
    const updateMediaPreview = () => {
        const set = (imgId, phId, data, removeId) => {
            const img = $(imgId);
            if (data) img.src = data;
            img.style.display = data ? 'block' : 'none';
            $(phId).style.display = data ? 'none' : 'block';
            $(removeId).style.display = data ? 'inline-flex' : 'none';
        };
        set('mp-cover-img', 'mp-cover-placeholder', coverData, 'remove-cover-btn');
        set('mp-logo-img', 'mp-logo-placeholder', logoData, 'remove-logo-btn');
    };
    const bindImageInput = (inputId, preset, setter) => {
        $(inputId).addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            showLoader(true);
            try {
                setter(await compressImageFile(file, preset));
                updateMediaPreview();
            } catch (err) {
                showAlert(err.message, 'error', 6000);
            } finally {
                showLoader(false);
                e.target.value = '';
            }
        });
    };
    bindImageInput('survey-cover-file', IMAGE_PRESETS.cover, d => { coverData = d; });
    bindImageInput('survey-logo-file', IMAGE_PRESETS.logo, d => { logoData = d; });
    $('remove-cover-btn').onclick = () => { coverData = null; updateMediaPreview(); };
    $('remove-logo-btn').onclick = () => { logoData = null; updateMediaPreview(); };

    // ---------- المظهر ----------
    const themeFields = { pageBg: 'theme-page-bg', cardBg: 'theme-card-bg', textColor: 'theme-text', titleColor: 'theme-title', accent: 'theme-accent', fontFamily: 'theme-font', fontSize: 'theme-size' };
    $('theme-font').innerHTML = FONT_OPTIONS.map(f => `<option value="${f}">${f}</option>`).join('');
    const readTheme = () => Object.fromEntries(Object.entries(themeFields).map(([k, id]) => [k, $(id).value]));
    const writeTheme = (t) => { const m = { ...DEFAULT_THEME, ...(t || {}) }; Object.entries(themeFields).forEach(([k, id]) => { $(id).value = m[k]; }); };
    const refreshThemePreview = () => {
        $('theme-panel').classList.toggle('disabled', !$('theme-enabled').checked);
        applyTheme(readTheme(), $('theme-preview'));
    };
    Object.values(themeFields).forEach(id => { $(id).addEventListener('input', refreshThemePreview); $(id).addEventListener('change', refreshThemePreview); });
    $('theme-enabled').addEventListener('change', refreshThemePreview);
    Object.entries(THEME_PRESETS).forEach(([name, preset]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn secondary small'; b.textContent = name;
        b.onclick = () => { writeTheme(preset); refreshThemePreview(); };
        $('preset-row').appendChild(b);
    });
    writeTheme(DEFAULT_THEME);
    refreshThemePreview();

    // ---------- الحد اليومي ----------
    const syncLimit = () => {
        const multi = $('allow-multiple-submissions').checked;
        $('daily-limit').disabled = !multi;
        if (!multi) $('daily-limit').value = '';
    };
    $('allow-multiple-submissions').addEventListener('change', syncLimit);

    // ---------- الأسئلة ----------
    const addQuestion = (data = {}) => {
        const qId = `q_${++questionCounter}`;
        const qCard = document.createElement('div');
        qCard.className = 'admin-question-card';
        if (data.id) qCard.dataset.qid = data.id; // نحافظ على المعرّف حتى لا تضيع ارتباطات الردود القديمة عند التعديل
        qCard.innerHTML = `<div class="admin-question-header"><h4>السؤال ${questionCounter}</h4><button type="button" class="btn small" onclick="this.closest('.admin-question-card').remove()">حذف</button></div><div class="form-group"><input type="text" class="q-text" value="${esc(data.text || '')}" placeholder="نص السؤال" required></div><div class="form-group"><select class="q-type"><option value="text">نص قصير</option><option value="textarea">نص طويل</option><option value="radio">اختيار واحد</option><option value="checkbox">اختيار متعدد</option><option value="dropdown">قائمة منسدلة</option><option value="date">تاريخ</option><option value="time">وقت</option><option value="rating">تقييم نجوم</option><option value="image">رفع صورة</option></select></div><div class="q-options-container" style="display:none;"></div><div class="form-group checkbox-group"><input type="checkbox" class="q-required" id="q-req-${qId}" ${data.required ? 'checked' : ''}><label for="q-req-${qId}">سؤال إجباري</label></div>`;
        $('questions-container').appendChild(qCard);
        const typeSelect = qCard.querySelector('.q-type');
        typeSelect.value = data.type || 'text';
        const addOptionToList = (list, text = '') => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item';
            optionDiv.innerHTML = `<input type="text" value="${esc(text)}" placeholder="نص الخيار"><button type="button" class="btn small" onclick="this.parentElement.remove()">X</button>`;
            list.appendChild(optionDiv);
        };
        const handleTypeChange = () => {
            const optionsContainer = qCard.querySelector('.q-options-container');
            if (['radio', 'checkbox', 'dropdown'].includes(typeSelect.value)) {
                optionsContainer.style.display = 'block';
                if (!optionsContainer.innerHTML) {
                    optionsContainer.innerHTML = '<h6>الخيارات:</h6><div class="options-list"></div><button type="button" class="btn secondary small add-option-btn">إضافة خيار</button>';
                    optionsContainer.querySelector('.add-option-btn').onclick = () => addOptionToList(optionsContainer.querySelector('.options-list'));
                }
                const optionsList = optionsContainer.querySelector('.options-list');
                if (!optionsList.children.length) (data.options && data.options.length ? data.options : ['']).forEach(opt => addOptionToList(optionsList, opt));
            } else {
                optionsContainer.style.display = 'none';
            }
        };
        typeSelect.onchange = handleTypeChange;
        handleTypeChange();
    };
    $('add-question-btn').onclick = () => addQuestion();

    // ---------- تحميل استفتاء موجود ----------
    if (surveyId) {
        $('admin-page-heading').textContent = 'تعديل الاستفتاء';
        showLoader(true);
        db.collection('surveys').doc(surveyId).get().then(doc => {
            if (!doc.exists) return;
            const data = doc.data();
            const settings = data.settings || {};
            $('survey-title').value = data.title || '';
            $('survey-description').value = data.description || '';
            $('survey-admin-pin').placeholder = "اتركه فارغاً للحفاظ على الرمز القديم";
            $('survey-admin-pin').required = false;
            $('accepting-responses').checked = settings.acceptingResponses !== false;
            $('allow-multiple-submissions').checked = settings.allowMultipleSubmissions || false;
            $('daily-limit').value = settings.dailyLimit || '';
            syncLimit();
            if (settings.dailyLimit) $('daily-limit').value = settings.dailyLimit;
            $('allow-results-view').checked = settings.allowResultsView || false;
            $('show-progress').checked = settings.showProgress || false;
            $('start-date').value = settings.startDate || '';
            $('start-time').value = settings.startTime || '';
            $('end-date').value = settings.endDate || '';
            $('end-time').value = settings.endTime || '';
            $('thank-you-message').value = settings.thankYouMessage || '';
            legacyBg = settings.backgroundColor || legacyBg;
            coverData = data.coverUrl || null;
            logoData = data.logoUrl || null;
            updateMediaPreview();
            if (settings.theme) {
                $('theme-enabled').checked = true;
                writeTheme(settings.theme);
            } else {
                writeTheme({ ...DEFAULT_THEME, pageBg: legacyBg });
            }
            refreshThemePreview();
            (data.questions || []).forEach(q => addQuestion(q));
        }).catch(err => showAlert('تعذّر تحميل الاستفتاء: ' + err.message, 'error'))
            .finally(() => showLoader(false));
    } else {
        addQuestion({ text: "اكتب هنا ", type: "textarea", required: true });
        updateMediaPreview();
    }

    // ---------- النشر ----------
    $('publish-btn').onclick = async () => {
        showLoader(true);
        const title = $('survey-title').value.trim();
        const pin = $('survey-admin-pin').value;
        if (!title || (!surveyId && (!pin || pin.length < 4))) {
            showAlert('العنوان ورمز سري من 4 خانات على الأقل مطلوبان.', 'error');
            return showLoader(false);
        }
        const cards = Array.from(document.querySelectorAll('.admin-question-card'));
        if (!cards.length) { showAlert('أضف سؤالاً واحداً على الأقل.', 'error'); return showLoader(false); }

        const questions = [];
        for (const card of cards) {
            const q = {
                id: card.dataset.qid || `q_${Math.random().toString(36).substr(2, 9)}`,
                text: card.querySelector('.q-text').value.trim(),
                type: card.querySelector('.q-type').value,
                required: card.querySelector('.q-required').checked,
                options: Array.from(card.querySelectorAll('.option-item input')).map(inp => inp.value.trim()).filter(Boolean)
            };
            if (!q.text) { showAlert('يوجد سؤال بلا نص.', 'error'); return showLoader(false); }
            if (['radio', 'checkbox', 'dropdown'].includes(q.type)) {
                if (q.options.length < 2) { showAlert(`السؤال "${q.text}" يحتاج خيارين على الأقل.`, 'error'); return showLoader(false); }
            } else {
                q.options = [];
            }
            questions.push(q);
        }

        const themeOn = $('theme-enabled').checked;
        const dailyRaw = parseInt($('daily-limit').value, 10);
        const multi = $('allow-multiple-submissions').checked;
        const surveyData = {
            title,
            description: $('survey-description').value,
            coverUrl: coverData || null,
            logoUrl: logoData || null,
            settings: {
                acceptingResponses: $('accepting-responses').checked,
                allowMultipleSubmissions: multi,
                dailyLimit: (multi && dailyRaw > 0) ? dailyRaw : null,
                allowResultsView: $('allow-results-view').checked,
                showProgress: $('show-progress').checked,
                startDate: $('start-date').value || null,
                startTime: $('start-time').value || null,
                endDate: $('end-date').value || null,
                endTime: $('end-time').value || null,
                thankYouMessage: $('thank-you-message').value,
                backgroundColor: themeOn ? $('theme-page-bg').value : legacyBg,
                theme: themeOn ? readTheme() : null
            },
            questions,
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
            const tooBig = /too large|exceeds|size/i.test(error.message || '');
            showAlert(tooBig ? 'حجم الاستفتاء (الصور) كبير جداً، جرّب غلافاً أو شعاراً أصغر.' : `فشل النشر: ${error.message}`, 'error', 6000);
        } finally { showLoader(false); }
    };
}

// =====================================================================
// SURVEY PAGE LOGIC
// =====================================================================
async function initSurveyPage() {
    const surveyId = getSurveyIdFromUrl();
    const PANELS = ['survey-hero', 'progress-container', 'survey-form-responder', 'thank-you-container', 'already-submitted-container', 'status-container'];
    // نُظهر لوحات محددة فقط دون حذف أي عنصر من الصفحة
    const showPanels = (...ids) => PANELS.forEach(id => {
        const el = $(id);
        if (el) el.style.display = ids.includes(id) ? (id === 'survey-form-responder' ? 'flex' : 'block') : 'none';
    });
    let heroReady = false;
    const showStatus = (message, isError = true) => {
        const h2 = $('status-text');
        h2.textContent = message;
        h2.style.color = isError ? 'var(--error-color)' : '';
        showPanels(...(heroReady ? ['survey-hero'] : []), 'status-container');
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
        const questions = currentSurveyData.questions || [];
        document.title = currentSurveyData.title || 'استفتاء';

        // ----- المظهر -----
        const isMailbox = !settings.theme && questions.length === 1 && questions[0].type === 'textarea';
        document.body.className = isMailbox ? 'mailbox-theme' : 'standard-theme';
        if (settings.theme) applyTheme(settings.theme);
        else if (!isMailbox && settings.backgroundColor) document.body.style.backgroundColor = settings.backgroundColor;

        // ----- الغلاف والشعار والعنوان -----
        $('survey-title-display').textContent = currentSurveyData.title || '';
        $('survey-description-display').textContent = currentSurveyData.description || '';
        const hero = $('survey-hero');
        const setImg = (imgId, wrapId, src) => {
            const img = $(imgId), wrap = wrapId ? $(wrapId) : img;
            if (!src) { wrap.style.display = 'none'; return false; }
            img.onerror = () => { wrap.style.display = 'none'; if (wrapId) hero.classList.remove('has-cover'); };
            img.src = src;
            wrap.style.display = 'block';
            return true;
        };
        hero.classList.toggle('has-cover', setImg('survey-cover-display', 'survey-cover-wrap', currentSurveyData.coverUrl));
        setImg('survey-logo-display', null, currentSurveyData.logoUrl);
        heroReady = true;

        // ----- شروط الوصول -----
        const shareLink = window.location.href;
        if (settings.allowMultipleSubmissions === false && localStorage.getItem(`submitted_${surveyId}`)) {
            $('survey-share-link-submitted').value = shareLink;
            $('copy-share-link-submitted').onclick = () => copyToClipboard(shareLink, $('copy-share-link-submitted'));
            showPanels('survey-hero', 'already-submitted-container');
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

        const dailyLimit = (settings.allowMultipleSubmissions && settings.dailyLimit > 0) ? settings.dailyLimit : 0;
        const limitMessage = () => `وصلت إلى الحد الأقصى للردود اليوم (${dailyLimit}). يمكنك المشاركة مجدداً غداً.`;
        const updateDailyNote = () => {
            const note = $('daily-limit-note');
            if (!dailyLimit) { note.style.display = 'none'; return; }
            const left = Math.max(0, dailyLimit - getDailyCount(surveyId));
            note.textContent = `عدد الردود المتبقية لك اليوم: ${left} من ${dailyLimit}`;
            note.style.display = 'block';
        };
        if (dailyLimit && getDailyCount(surveyId) >= dailyLimit) {
            showStatus(limitMessage(), false);
            return;
        }

        // ----- بناء النموذج -----
        const imageQs = questions.filter(q => q.type === 'image');
        const perImageChars = Math.floor(800000 / Math.max(1, imageQs.length));
        pendingImages = {};

        $('responder-form-content').innerHTML = questions.map(q => `<div class="question-card-responder"><label for="q-${esc(q.id)}" class="question-text">${esc(q.text)} ${q.required ? '<span style="color:red;">*</span>' : ''}</label>${renderQuestionInputForResponder(q)}</div>`).join('');
        const form = $('survey-form-responder');
        updateDailyNote();

        // رفع الصور
        form.addEventListener('change', async (e) => {
            const inp = e.target;
            if (!inp.matches || !inp.matches('input[type="file"][data-qid]')) return;
            const qid = inp.dataset.qid;
            const wrap = inp.closest('.img-upload');
            const file = inp.files[0];
            if (!file) return;
            showLoader(true);
            try {
                pendingImages[qid] = await compressImageFile(file, IMAGE_PRESETS.answer, perImageChars);
                const prev = wrap.querySelector('.img-preview');
                prev.src = pendingImages[qid];
                prev.style.display = 'block';
                wrap.querySelector('.img-remove').style.display = 'inline-flex';
            } catch (err) {
                showAlert(err.message, 'error', 6000);
                delete pendingImages[qid];
            } finally {
                inp.value = '';
                showLoader(false);
                updateProgressBar();
            }
        });
        form.addEventListener('click', (e) => {
            const btn = e.target.closest ? e.target.closest('.img-remove') : null;
            if (!btn) return;
            const wrap = btn.closest('.img-upload');
            delete pendingImages[wrap.dataset.qid];
            wrap.querySelector('.img-preview').style.display = 'none';
            btn.style.display = 'none';
            updateProgressBar();
        });

        showPanels('survey-hero', 'survey-form-responder');

        if (settings.showProgress) {
            $('progress-container').style.display = 'block';
            form.addEventListener('input', updateProgressBar);
            updateProgressBar();
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (dailyLimit && getDailyCount(surveyId) >= dailyLimit) return showStatus(limitMessage(), false);

            const formData = new FormData(form);
            let allValid = true;
            const answers = questions.map(q => {
                const answer = getAnswerValue(q, formData);
                if (q.required && isEmptyAnswer(answer)) allValid = false;
                return { questionId: q.id, questionText: q.text, answer };
            });
            if (!allValid) return showAlert('الرجاء تعبئة الحقول الإجبارية.', 'error');

            showLoader(true);
            try {
                await db.collection('responses').add({ surveyId: currentSurveyData.id, answers, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            } catch (err) {
                console.error(err);
                showLoader(false);
                return showAlert(/too large|exceeds|size/i.test(err.message || '') ? 'حجم الصور كبير جداً، جرّب صوراً أصغر.' : 'فشل إرسال الإجابة، حاول مرة أخرى.', 'error', 6000);
            }
            incrementDailyCount(surveyId);

            if (settings.allowMultipleSubmissions) {
                form.reset();
                pendingImages = {};
                form.querySelectorAll('.img-preview').forEach(p => { p.style.display = 'none'; });
                form.querySelectorAll('.img-remove').forEach(b => { b.style.display = 'none'; });
                updateProgressBar();
                if (dailyLimit && getDailyCount(surveyId) >= dailyLimit) {
                    showStatus(`تم إرسال إجابتك بنجاح! ${limitMessage()}`, false);
                } else {
                    updateDailyNote();
                    showAlert('تم إرسال إجابتك بنجاح!', 'success');
                }
            } else {
                localStorage.setItem(`submitted_${surveyId}`, 'true');
                $('thank-you-text').textContent = settings.thankYouMessage || 'شكرًا لك، تم استلام ردك بنجاح.';
                const shareContainer = document.querySelector('#thank-you-container .share-container');
                shareContainer.style.display = 'block';
                $('survey-share-link-after').value = shareLink;
                $('copy-share-link-after').onclick = () => copyToClipboard(shareLink, $('copy-share-link-after'));
                if (settings.allowResultsView) {
                    $('view-results-link').href = `results.html?id=${currentSurveyData.id}`;
                    $('view-results-link').style.display = 'inline-block';
                }
                showPanels('survey-hero', 'thank-you-container');
            }
            showLoader(false);
        });
    } catch (error) {
        console.error(error);
        showStatus(error.message);
    } finally {
        showLoader(false);
    }
}

function getAnswerValue(q, formData) {
    if (q.type === 'image') return pendingImages[q.id] || '';
    if (q.type === 'checkbox') return formData.getAll(`q-${q.id}`);
    return formData.get(`q-${q.id}`) ?? '';
}

function renderQuestionInputForResponder(q) {
    const name = `q-${esc(q.id)}`;
    const req = q.required ? 'required' : '';
    const options = q.options || [];
    switch (q.type) {
        case 'text': return `<input type="text" id="${name}" name="${name}" placeholder="إجابتك" ${req}>`;
        case 'textarea': return `<textarea id="${name}" name="${name}" placeholder="إجابتك المفصلة..." ${req}></textarea>`;
        case 'date': return `<input type="date" id="${name}" name="${name}" ${req}>`;
        case 'time': return `<input type="time" id="${name}" name="${name}" ${req}>`;
        case 'radio': return options.map((o, i) => `<div class="checkbox-group"><input type="radio" id="${name}-o-${i}" name="${name}" value="${esc(o)}" ${req}><label for="${name}-o-${i}">${esc(o)}</label></div>`).join('');
        case 'checkbox': return options.map((o, i) => `<div class="checkbox-group"><input type="checkbox" id="${name}-o-${i}" name="${name}" value="${esc(o)}"><label for="${name}-o-${i}">${esc(o)}</label></div>`).join('');
        case 'dropdown': return `<select id="${name}" name="${name}" ${req}><option value="">-- اختر --</option>${options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
        case 'rating': return `<div class="rating-stars">${[5, 4, 3, 2, 1].map(v => `<input type="radio" id="${name}-r-${v}" name="${name}" value="${v}" ${req}><label for="${name}-r-${v}" title="${v} نجوم">★</label>`).join('')}</div>`;
        case 'image': return `<div class="img-upload" data-qid="${esc(q.id)}"><label for="${name}" class="btn secondary">📷 اختر صورة</label><input type="file" id="${name}" data-qid="${esc(q.id)}" accept="image/*"><img class="img-preview" alt="معاينة الصورة"><button type="button" class="btn secondary small img-remove">إزالة الصورة</button></div>`;
        default: return '<p>نوع غير مدعوم.</p>';
    }
}

function updateProgressBar() {
    const form = $('survey-form-responder');
    const fill = $('progress-bar-fill');
    if (!form || !fill || !currentSurveyData) return;
    const requiredQuestions = (currentSurveyData.questions || []).filter(q => q.required);
    if (requiredQuestions.length === 0) { fill.style.width = '100%'; return; }
    const formData = new FormData(form);
    const filled = requiredQuestions.filter(q => !isEmptyAnswer(getAnswerValue(q, formData))).length;
    fill.style.width = `${(filled / requiredQuestions.length) * 100}%`;
}

// =====================================================================
// PUBLIC RESULTS PAGE LOGIC
// =====================================================================
async function initResultsPage() {
    const surveyId = getSurveyIdFromUrl();
    const contentDiv = $('public-results-content');
    if (!surveyId) { showLoader(false); return contentDiv.innerHTML = '<h1>معرف الاستفتاء مفقود.</h1>'; }

    showLoader(true);
    try {
        const surveyDoc = await db.collection('surveys').doc(surveyId).get();
        if (!surveyDoc.exists) throw new Error("الاستفتاء غير موجود.");
        currentSurveyData = { id: surveyDoc.id, ...surveyDoc.data() };
        if (!currentSurveyData.settings?.allowResultsView) throw new Error("عذرًا، نتائج هذا الاستفتاء ليست متاحة للعرض العام.");
        if (currentSurveyData.settings.theme) applyTheme(currentSurveyData.settings.theme);
        $('results-title').textContent = `نتائج: ${currentSurveyData.title}`;
        const responsesSnapshot = await db.collection('responses').where('surveyId', '==', surveyId).get();
        currentSurveyResponses = responsesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSummaryView('public-results-content', { hideImages: true });
    } catch (error) {
        contentDiv.innerHTML = `<div class="card" style="text-align:center;"><h2 style="color:var(--error-color);">خطأ</h2><p>${esc(error.message)}</p></div>`;
    } finally {
        showLoader(false);
    }
}

// =====================================================================
// EXPORT FUNCTIONS (for Dashboard)
// الصور لا تُضمَّن في CSV/PDF (حجمها أكبر من حدّ الخلية)، وتُستبدل بعلامة [صورة]
// =====================================================================
const answerToPlain = (ans, sep) => {
    if (isImageData(ans)) return '[صورة]';
    if (ans == null) return '';
    return Array.isArray(ans) ? ans.join(sep) : String(ans);
};
function setupExportButtons(surveyId) {
    const actions = document.querySelector('.action-buttons');
    if (actions && !$('delete-all-responses-btn')) {
        const b = document.createElement('button');
        b.id = 'delete-all-responses-btn';
        b.className = 'btn small';
        b.style.cssText = 'background:var(--error-color);color:#fff;';
        b.textContent = 'حذف الكل ';
        actions.appendChild(b);
    }
    $('delete-all-responses-btn').onclick = deleteAllResponses;
    updateResponseCount();
    $('export-csv-btn').onclick = () => exportResponsesToCSV(surveyId);
    $('export-pdf-btn').onclick = () => exportResponsesToPDF(surveyId);
}
function exportResponsesToCSV(surveyId) {
    if (!currentSurveyData || currentSurveyResponses.length === 0) return showAlert('لا توجد بيانات للتصدير.', 'info');
    showAlert('جاري تجهيز ملف CSV...', 'info');
    const headers = ['ResponseID', 'Timestamp', ...currentSurveyData.questions.map(q => `"${q.text.replace(/"/g, '""')}"`)];
    let csvContent = '\uFEFF' + headers.join(',') + '\r\n';
    currentSurveyResponses.forEach(response => {
        const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', calendar: 'gregory', numberingSystem: 'latn' };
        const rowData = [response.id, `"${response.timestamp?.toDate ? response.timestamp.toDate().toLocaleString('en-CA', dateOptions) : 'N/A'}"`, ...currentSurveyData.questions.map(q => {
            const ans = response.answers.find(a => a.questionId === q.id)?.answer;
            return `"${answerToPlain(ans, '; ').replace(/"/g, '""')}"`;
        })];
        csvContent += rowData.join(',') + '\r\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `survey_${surveyId}_responses.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
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
    const tableBody = currentSurveyResponses.map((response, index) => [index + 1, response.timestamp?.toDate ? response.timestamp.toDate().toLocaleDateString('ar-EG', dateOptions) : 'N/A', ...currentSurveyData.questions.map(q => {
        const ans = response.answers.find(a => a.questionId === q.id)?.answer;
        return answerToPlain(ans, '، ');
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

// =====================================================================
// PAGE ROUTER — يعتمد على عناصر الصفحة (وليس اسم الملف)
// حتى لا يتعارض مثلاً master_dashboard.html مع dashboard.html
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    const yearSpan = $('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    if ($('survey-lookup-form')) initDashboardPage();
    else if ($('survey-form-responder')) initSurveyPage();
    else if ($('admin-mode-content')) initAdminPage();
    else if ($('public-results-content')) initResultsPage();
});
