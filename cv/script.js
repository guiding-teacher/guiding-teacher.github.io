/* ====================================================
   APP STATE - ENHANCED (AI removed)
==================================================== */
const APP = {
  templateId: '1',
  themeColor: '#4f8ef7',
  font: 'Cairo',
  fontScale: 100,
  lineHeight: 1.6,
  fontWeight: 400,
  zoom: 100,
  photoShape: 'circle',
  secStyle: 'default',
  history: [],
  historyIndex: -1,
  currentEditable: null,
  saveTimer: null,
  sortableInstance: null,
  devicePreview: 'desktop',
  cloudData: null,
  stats: { words: 0, chars: 0, sections: 0, readTime: 0 },
  borderStyle: 'none',
  borderWidth: 2,
  borderColor: '#5b8ef0'
};

const THEME_COLORS = [
  '#4f8ef7','#e74c3c','#14b8a6','#f39c12','#8e44ad','#22c55e',
  '#e91e8c','#1a237e','#00bcd4','#795548','#4caf50','#ff5722',
  '#2c3e50','#16a085','#d35400','#8e44ad','#c0392b','#27ae60',
  '#2980b9','#8c3a4a','#f0b429','#0d2c4a','#3d5a80','#5f8b8a',
  '#6c5ce7','#00b894','#fd79a8','#e17055','#74b9ff','#a29bfe',
];

const TEMPLATES = [
  {id:'1',nameAr:'أناقة الكريم',category:'classic',dir:'rtl',badge:'',color:'#c5a686'},
  {id:'2',nameAr:'أزرق عصري',category:'modern',dir:'rtl',badge:'popular',color:'#0d2c4a'},
  {id:'3',nameAr:'رمادي جريء',category:'creative',dir:'rtl',badge:'',color:'#4a4a4a'},
  {id:'4',nameAr:'لهجة حمراء',category:'modern',dir:'rtl',badge:'',color:'#3d5a80'},
  {id:'5',nameAr:'بني وبيج',category:'classic',dir:'rtl',badge:'',color:'#8a6d54'},
  {id:'6',nameAr:'بورغندي احترافي',category:'modern',dir:'ltr',badge:'',color:'#8c3a4a'},
  {id:'7',nameAr:'شركاتي نظيف',category:'classic',dir:'ltr',badge:'new',color:'#1e3a5f'},
  {id:'8',nameAr:'برتقالي وأسود',category:'creative',dir:'rtl',badge:'',color:'#f39c12'},
  {id:'9',nameAr:'أزرق مينيمال',category:'modern',dir:'rtl',badge:'',color:'#3498db'},
  {id:'10',nameAr:'خط زمني مركزي',category:'classic',dir:'rtl',badge:'',color:'#555'},
  {id:'11',nameAr:'فيروزي احترافي',category:'modern',dir:'ltr',badge:'',color:'#3a8a88'},
  {id:'12',nameAr:'دوائر إبداعية',category:'creative',dir:'rtl',badge:'new',color:'#5f8b8a'},
];

const ICONS = [
  'fa-phone','fa-envelope','fa-globe','fa-map-marker-alt','fa-linkedin','fa-github',
  'fa-twitter','fa-instagram','fa-facebook','fa-youtube','fa-user','fa-briefcase',
  'fa-graduation-cap','fa-heart','fa-star','fa-code','fa-database','fa-server',
  'fa-paint-brush','fa-camera','fa-music','fa-book','fa-car','fa-home','fa-trophy',
  'fa-certificate','fa-award','fa-handshake','fa-users','fa-chart-bar','fa-chart-line',
  'fa-tasks','fa-project-diagram','fa-cog','fa-wrench','fa-microscope','fa-flask',
  'fa-stethoscope','fa-gavel','fa-calculator','fa-pen','fa-pencil-alt','fa-search',
  'fa-language','fa-globe-americas','fa-flag','fa-fax','fa-mobile','fa-laptop',
  'fa-rocket','fa-lightbulb','fa-shield-alt','fa-leaf','fa-fire','fa-cube',
  'fa-brain','fa-robot','fa-magic','fa-sparkles','fa-gem','fa-crown',
];

const SECTION_LABELS = {
  about:'نبذة عني',experience:'الخبرة المهنية',education:'التعليم',
  contact:'معلومات التواصل',skills:'المهارات',languages:'اللغات',
  projects:'المشاريع',certifications:'الشهادات والدورات',hobbies:'الهوايات',
  references:'المراجع',volunteer:'العمل التطوعي',awards:'الجوائز والتكريمات',
  publications:'المنشورات والأبحاث',portfolio:'المحفظة الإبداعية',custom:'قسم مخصص',
};

/* ====================================================
   VIEW MANAGEMENT
==================================================== */
function showView(view, tplId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  if (view === 'editor') {
    if (tplId) APP.templateId = tplId;
    initEditor(APP.templateId);
  }
}

function scrollToTemplates() {
  document.getElementById('templates-section').scrollIntoView({behavior:'smooth'});
}

/* ====================================================
   HOME — GALLERY
==================================================== */
function renderGallery() {
  const grid = document.getElementById('template-grid');
  grid.innerHTML = TEMPLATES.map((t, i) => `
    <div class="tpl-card" data-cat="${t.category}" data-dir="${t.dir}" onclick="showView('editor','${t.id}')" style="animation-delay:${i * 0.05}s;">
      ${t.badge ? `<div class="tpl-badge ${t.badge}">${t.badge==='new'?'جديد':'الأشهر'}</div>` : ''}
      <div class="tpl-preview">
        <div style="width:100%;height:100%;background:${getTemplateBg(t.id)};display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${getMiniPreview(t)}
        </div>
        <div class="tpl-overlay">
          <button class="btn btn-primary overlay-btn" onclick="event.stopPropagation();showView('editor','${t.id}')">
            <i class="fas fa-edit"></i> استخدم هذا القالب
          </button>
          <button class="btn btn-ghost overlay-btn" onclick="event.stopPropagation();previewTemplate('${t.id}')">
            <i class="fas fa-eye"></i> معاينة
          </button>
        </div>
      </div>
      <div class="tpl-info">
        <h3>${t.nameAr}</h3>
        <p>${t.dir==='rtl'?'سيرة عربية':'English CV'}</p>
        <div class="tpl-meta">
          <span class="tpl-category">${{classic:'كلاسيكي',modern:'عصري',creative:'إبداعي'}[t.category]}</span>
          <button class="tpl-action" onclick="event.stopPropagation();showView('editor','${t.id}')">استخدم</button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterTemplates(filter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tpl-card').forEach(card => {
    const show = filter === 'all' || card.dataset.cat === filter || card.dataset.dir === filter;
    card.style.display = show ? '' : 'none';
    if (show) card.style.animation = 'fadeInUp 0.5s ease forwards';
  });
}

function getTemplateBg(id) {
  const bgs = {1:'#f7f3ef',2:'#0d2c4a',3:'#4a4a4a',4:'#3d5a80',5:'#e6e2dd',6:'#8c3a4a',7:'#f4f7fa',8:'#2c3e50',9:'#ecf0f1',10:'#fff',11:'#f0f5f5',12:'#5f8b8a'};
  return bgs[id]||'#f0f0f0';
}

function getMiniPreview(t) {
  return `<div style="width:90%;padding:12px;direction:${t.dir};text-align:${t.dir==='rtl'?'right':'left'}">
    <div style="width:55px;height:55px;background:${t.color};border-radius:50%;margin:0 auto 10px;box-shadow:0 4px 15px rgba(0,0,0,0.2);"></div>
    <div style="height:8px;background:${t.color};border-radius:4px;margin-bottom:6px;"></div>
    <div style="height:5px;background:#ccc;border-radius:4px;margin-bottom:4px;width:75%;"></div>
    <div style="height:5px;background:#ccc;border-radius:4px;margin-bottom:10px;width:55%;"></div>
    <div style="height:4px;background:${t.color};margin-bottom:5px;width:45%;"></div>
    <div style="height:4px;background:#ddd;margin-bottom:4px;"></div>
    <div style="height:4px;background:#ddd;margin-bottom:4px;width:85%;"></div>
  </div>`;
}

function previewTemplate(id) {
  toast(`🎨 معاينة القالب ${id}`, 'info');
}

/* ====================================================
   PARTICLES ANIMATION
==================================================== */
function initParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;
  
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (4 + Math.random() * 4) + 's';
    particle.style.opacity = 0.1 + Math.random() * 0.3;
    container.appendChild(particle);
  }
}

function initNavScroll() {
  const nav = document.getElementById('home-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });
}

/* ====================================================
   EDITOR INIT
==================================================== */
function initEditor(id) {
  const cv = document.getElementById('cv-container');
  cv.setAttribute('data-tpl', id);
  cv.style.direction = TEMPLATES.find(t=>t.id===id)?.dir || 'rtl';
  APP.themeColor = TEMPLATES.find(t=>t.id===id)?.color || '#4f8ef7';
  cv.style.setProperty('--tc', APP.themeColor);

  const saved = localStorage.getItem(`cv_pro_${id}`);
  cv.innerHTML = saved || getTemplateHTML(id);

  const savedColor = localStorage.getItem(`cv_pro_color_${id}`);
  if (savedColor) { APP.themeColor = savedColor; cv.style.setProperty('--tc', savedColor); }
  const savedFont = localStorage.getItem(`cv_pro_font_${id}`);
  if (savedFont) { APP.font = savedFont; cv.style.fontFamily = `'${savedFont}',sans-serif`; }

  document.getElementById('tpl-name-display').textContent = TEMPLATES.find(t=>t.id===id)?.nameAr || `القالب ${id}`;
  document.getElementById('dir-badge').textContent = TEMPLATES.find(t=>t.id===id)?.dir?.toUpperCase() || 'RTL';
  document.getElementById('custom-color').value = APP.themeColor;

  // Load border settings
  const savedBorderStyle = localStorage.getItem(`cv_border_style_${id}`);
  const savedBorderWidth = localStorage.getItem(`cv_border_width_${id}`);
  const savedBorderColor = localStorage.getItem(`cv_border_color_${id}`);
  if (savedBorderStyle) APP.borderStyle = savedBorderStyle;
  if (savedBorderWidth) APP.borderWidth = parseInt(savedBorderWidth);
  if (savedBorderColor) APP.borderColor = savedBorderColor;
  applyBorderToCV();
  if(document.getElementById('border-style-select')) document.getElementById('border-style-select').value = APP.borderStyle;
  if(document.getElementById('border-color-picker')) document.getElementById('border-color-picker').value = APP.borderColor;
  if(document.getElementById('border-width-val')) document.getElementById('border-width-val').innerText = APP.borderWidth + 'px';
  if(document.querySelector('#border-style-select + .slider-wrap input')) document.querySelector('#border-style-select + .slider-wrap input').value = APP.borderWidth;

  bindImageUpload();
  renderColorSwatches();
  renderMiniSwitcher();
  renderSectionsManager();
  initHistory();
  setupFormatBubble();
  initSectionsDnD();
  applyZoom(APP.zoom);
  updateProgress();
  updateStats();
}

function restoreEditorBindings() {
  bindImageUpload();
  renderSectionsManager();
  initSectionsDnD();
  updateProgress();
  updateStats();
}

/* ====================================================
   BORDER FRAME CONTROLS
==================================================== */
function setBorderStyle(style) {
  APP.borderStyle = style;
  localStorage.setItem(`cv_border_style_${APP.templateId}`, style);
  applyBorderToCV();
  saveAuto();
  toast('🖼️ تم تغيير نمط الإطار', 'info');
}

function setBorderWidth(val) {
  APP.borderWidth = parseInt(val);
  document.getElementById('border-width-val').innerText = APP.borderWidth + 'px';
  localStorage.setItem(`cv_border_width_${APP.templateId}`, APP.borderWidth);
  applyBorderToCV();
  saveAuto();
}

function setBorderColor(color) {
  APP.borderColor = color;
  localStorage.setItem(`cv_border_color_${APP.templateId}`, color);
  applyBorderToCV();
  saveAuto();
}

function applyBorderToCV() {
  const cv = document.getElementById('cv-container');
  if (APP.borderStyle === 'none') {
    cv.style.border = 'none';
  } else {
    cv.style.border = `${APP.borderWidth}px ${APP.borderStyle} ${APP.borderColor}`;
  }
}

/* ====================================================
   FORMAT BUBBLE
==================================================== */
let bubbleSetup = false;
function setupFormatBubble() {
  if (bubbleSetup) return;
  bubbleSetup = true;
  const bubble = document.getElementById('format-bubble');

  bubble.addEventListener('mousedown', e => {
    if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
    }
  });

  document.addEventListener('focusin', e => {
    const cv = document.getElementById('cv-container');
    if (e.target.isContentEditable && cv && cv.contains(e.target)) {
      APP.currentEditable = e.target;
      bubble.style.display = 'flex';
    }
  });

  document.addEventListener('focusout', e => {
    setTimeout(() => {
      const cv = document.getElementById('cv-container');
      const active = document.activeElement;
      const inCV = cv && cv.contains(active) && active.isContentEditable;
      const inBubble = bubble.contains(active) || bubble === active;
      if (!inCV && !inBubble) {
        bubble.style.display = 'none';
      }
    }, 200);
  });

  document.addEventListener('mouseup', e => {
    const cv = document.getElementById('cv-container');
    if (cv && cv.contains(e.target)) {
      const target = e.target.closest('[contenteditable="true"]') || e.target;
      if (target.isContentEditable) {
        APP.currentEditable = target;
        bubble.style.display = 'flex';
      }
    }
  });
}

function exec(cmd, arg) {
  document.execCommand(cmd, false, arg || null);
  if (APP.currentEditable) saveAuto();
}

function setFontSize(size) {
  if (!size) return;
  document.execCommand('fontSize', false, '1');
  document.querySelectorAll("font[size='1']").forEach(el => {
    const span = document.createElement('span');
    span.style.fontSize = size;
    span.innerHTML = el.innerHTML;
    el.parentNode.replaceChild(span, el);
  });
  saveAuto();
}

/* ====================================================
   PANEL TABS
==================================================== */
function switchTab(tab, btn) {
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  if (tab === 'export') updateProgress();
}

function togglePanel() {
  document.getElementById('left-panel').classList.toggle('collapsed');
}

/* ====================================================
   SECTIONS DRAG & DROP
==================================================== */
function initSectionsDnD() {
  const manager = document.getElementById('sections-manager');
  if (!manager || typeof Sortable === 'undefined') return;
  if (APP.sortableInstance) APP.sortableInstance.destroy();
  APP.sortableInstance = new Sortable(manager, {
    animation: 200,
    handle: '.section-drag-handle',
    draggable: '.section-toggle-item',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: () => {
      reorderSectionsInCV();
      saveAuto();
      toast('✅ تم إعادة ترتيب الأقسام', 'success');
    }
  });
}

function reorderSectionsInCV() {
  const manager = document.getElementById('sections-manager');
  const cv = document.getElementById('cv-container');
  const items = [...manager.querySelectorAll('.section-toggle-item')];
  const mainCol = cv.querySelector('.main-col') || cv;
  const sideCol = cv.querySelector('.side-col');

  items.forEach(item => {
    const cls = item.dataset.sectionClass;
    if (!cls) return;
    const sections = cv.querySelectorAll(`.sec-section.${cls}`);
    sections.forEach(sec => {
      const parent = sec.parentElement;
      if (parent === mainCol || (!sideCol && parent === cv)) {
        mainCol.appendChild(sec);
      }
    });
  });
}

function renderSectionsManager() {
  const wrap = document.getElementById('sections-manager');
  const cv = document.getElementById('cv-container');
  const sections = cv.querySelectorAll('.sec-section');
  if (!sections.length) { wrap.innerHTML = '<p style="font-size:13px;color:var(--text-dim);padding:6px">لا توجد أقسام</p>'; return; }

  wrap.innerHTML = [...sections].map((sec, i) => {
    const classList = [...sec.classList];
    const cls = classList.find(c => c !== 'sec-section') || `sec-${i}`;
    const label = SECTION_LABELS[cls] || cls;
    return `<div class="section-toggle-item" data-section-class="${cls}">
      <i class="fas fa-grip-vertical section-drag-handle" title="اسحب لإعادة الترتيب"></i>
      <input type="checkbox" checked onchange="toggleSection('${cls}',this.checked)">
      <label onclick="void(0)">${label}</label>
      <i class="fas fa-trash" style="color:var(--text-dim);font-size:12px;cursor:pointer;" onclick="removeSection('${cls}')" title="حذف القسم"></i>
    </div>`;
  }).join('');

  setTimeout(() => initSectionsDnD(), 50);
}

function toggleSection(cls, show) {
  document.getElementById('cv-container').querySelectorAll(`.${cls}`).forEach(s => {
    s.style.display = show ? '' : 'none';
  });
  saveAuto();
}

function removeSection(cls) {
  if (!confirm(`هل تريد حذف قسم "${SECTION_LABELS[cls]||cls}" نهائياً؟`)) return;
  document.getElementById('cv-container').querySelectorAll(`.sec-section.${cls}`).forEach(s => s.remove());
  renderSectionsManager();
  saveAuto();
  toast('🗑️ تم حذف القسم', 'info');
}

function openAddSectionModal() { openModal('add-section-modal'); }

function addCustomSection(type) {
  closeModal('add-section-modal');
  const cv = document.getElementById('cv-container');
  const label = SECTION_LABELS[type] || type;
  const sec = document.createElement('div');
  sec.className = `sec-section ${type}`;
  sec.innerHTML = `<h3 class="sec-title" contenteditable="true">${label}</h3><p contenteditable="true">أضف محتوى قسم ${label} هنا...</p>`;
  const main = cv.querySelector('.main-col') || cv;
  main.appendChild(sec);
  renderSectionsManager();
  saveAuto();
  toast(`✅ تم إضافة قسم ${label}`, 'success');
}

function applySecStyle(style, btn) {
  document.querySelectorAll('.sec-style-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  APP.secStyle = style;
  const cv = document.getElementById('cv-container');
  cv.classList.remove('sec-style-underline','sec-style-filled','sec-style-outlined','sec-style-dot');
  if (style !== 'default') cv.classList.add(`sec-style-${style}`);
  saveAuto();
  toast('✨ تم تغيير نمط العناوين', 'info');
}

/* ====================================================
   PHOTO CONTROLS
==================================================== */
function setPhotoShape(shape, btn) {
  document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  APP.photoShape = shape;
  const img = document.getElementById('cv-container')?.querySelector('#profile-img');
  if (!img) return;
  const shapes = { circle: '50%', rounded: '30%', square: '6px', hex: '0' };
  img.style.borderRadius = shapes[shape] || '50%';
  if (shape === 'hex') img.style.clipPath = 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)';
  else img.style.clipPath = '';
  saveAuto();
}

function setPhotoBorderColor(color) {
  const img = document.getElementById('cv-container')?.querySelector('#profile-img');
  if (img) img.style.borderColor = color;
  saveAuto();
}

function setPhotoFilter(filter) {
  const img = document.getElementById('cv-container')?.querySelector('#profile-img');
  if (img) img.style.filter = filter;
  saveAuto();
}

/* ====================================================
   COLOR SWATCHES
==================================================== */
function renderColorSwatches() {
  const wrap = document.getElementById('color-swatches');
  wrap.innerHTML = THEME_COLORS.map(c => `
    <div class="color-swatch${c===APP.themeColor?' active':''}" 
         style="background:${c};" 
         onclick="applyThemeColor('${c}');document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('active'));this.classList.add('active');"
         title="${c}">
    </div>`).join('');
}

function applyThemeColor(color) {
  APP.themeColor = color;
  document.getElementById('cv-container').style.setProperty('--tc', color);
  document.getElementById('custom-color').value = color;
  localStorage.setItem(`cv_pro_color_${APP.templateId}`, color);
  saveAuto();
  toast('🎨 تم تغيير اللون', 'info');
}

function applyGradientTheme(colors) {
  const cv = document.getElementById('cv-container');
  cv.style.setProperty('--tc', colors[0]);
  APP.themeColor = colors[0];
  localStorage.setItem(`cv_pro_color_${APP.templateId}`, colors[0]);
  saveAuto();
  toast('🎨 تم تطبيق مجموعة الألوان', 'success');
}

function setCVBackground(color, swatchEl) {
  document.getElementById('cv-container').style.background = color;
  document.querySelectorAll('[onclick^="setCVBackground"]').forEach(s => s.classList.remove('active'));
  swatchEl?.classList.add('active');
  saveAuto();
}

/* ====================================================
   FONT & SPACING
==================================================== */
function applyFont(font) {
  APP.font = font;
  document.getElementById('cv-container').style.fontFamily = `'${font}',sans-serif`;
  localStorage.setItem(`cv_pro_font_${APP.templateId}`, font);
  saveAuto();
  toast('🔤 تم تغيير الخط', 'info');
}

function setFontScale(val) {
  APP.fontScale = val;
  document.getElementById('cv-container').style.fontSize = (val/100) + 'em';
  document.getElementById('font-scale-val').textContent = val + '%';
  saveAuto();
}

function setLineHeight(val) {
  const lh = (val/10).toFixed(1);
  APP.lineHeight = lh;
  document.getElementById('cv-container').style.lineHeight = lh;
  document.getElementById('line-height-val').textContent = lh;
  saveAuto();
}

function setFontWeight(val) {
  const weights = {3:'خفيف',4:'عادي',5:'متوسط',6:'سميك',7:'عريض',8:'أكثر',9:'أقصى'};
  const weight = val * 100;
  document.getElementById('cv-container').style.fontWeight = weight;
  document.getElementById('font-weight-val').textContent = weights[val] || 'عادي';
  saveAuto();
}

function setSectionSpacing(val) {
  document.getElementById('sec-spacing-val').textContent = val + 'px';
  document.querySelectorAll('#cv-container .sec-section').forEach(s => { s.style.marginBottom = val + 'px'; });
  saveAuto();
}

function setColumnRatio(val) {
  document.getElementById('col-ratio-val').textContent = val + '%';
  const cv = document.getElementById('cv-container');
  const side = cv.querySelector('.side-col');
  const main = cv.querySelector('.main-col');
  if (side) side.style.width = val + '%';
  if (main) main.style.width = (100 - val) + '%';
  saveAuto();
}

function setPageMargin(val) {
  document.getElementById('margin-val').textContent = val + 'mm';
  document.getElementById('cv-container').style.padding = val + 'mm';
  saveAuto();
}

/* ====================================================
   ZOOM
==================================================== */
function changeZoom(delta) {
  APP.zoom = Math.min(150, Math.max(50, APP.zoom + delta));
  applyZoom(APP.zoom);
}

function resetZoom() { APP.zoom = 100; applyZoom(100); }

function fitToScreen() {
  const container = document.getElementById('canvas-area');
  const cv = document.getElementById('cv-container');
  const containerWidth = container.clientWidth - 80;
  const cvWidth = 210 * 3.78;
  const scale = Math.min(100, Math.floor((containerWidth / cvWidth) * 100));
  APP.zoom = scale;
  applyZoom(scale);
  toast(`🔍 تم ضبط الحجم: ${scale}%`, 'info');
}

function applyZoom(val) {
  APP.zoom = val;
  document.getElementById('cv-container').style.transform = `scale(${val/100})`;
  document.getElementById('zoom-label').textContent = val + '%';
    const zoomLabelTop = document.getElementById('zoom-label-top');
  if (zoomLabelTop) zoomLabelTop.textContent = val + '%';
}

/* ====================================================
   DEVICE PREVIEW
==================================================== */
function previewDevice(device) {
  APP.devicePreview = device;
  const cv = document.getElementById('cv-container');
  const devices = { desktop: '210mm', tablet: '160mm', mobile: '100mm' };
  
  document.querySelectorAll('.device-btn-sm').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.device-btn-sm[onclick*="${device}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  
  if (device === 'desktop') {
    cv.style.width = '210mm';
    cv.style.transform = `scale(${APP.zoom/100})`;
  } else if (device === 'tablet') {
    cv.style.width = '160mm';
    cv.style.transform = `scale(${Math.min(APP.zoom, 80)/100})`;
  } else if (device === 'mobile') {
    cv.style.width = '100mm';
    cv.style.transform = `scale(${Math.min(APP.zoom, 50)/100})`;
  }
  toast(`📱 معاينة ${device === 'desktop' ? 'الحاسوب' : device === 'tablet' ? 'التابلت' : 'الموبايل'}`, 'info');
}

/* ====================================================
   MINI TEMPLATE SWITCHER
==================================================== */
function renderMiniSwitcher() {
  const wrap = document.getElementById('tpl-mini-switcher');
  wrap.innerHTML = TEMPLATES.map(t => `
    <div class="tpl-mini${t.id===APP.templateId?' active':''}" onclick="switchTemplate('${t.id}')">
      <span>${t.id}</span>${t.nameAr}
    </div>`).join('');
}

function switchTemplate(id) {
  if (id === APP.templateId) return;
  if (!confirm('سيتم تغيير القالب. هل تريد الاستمرار؟')) return;
  APP.templateId = id;
  APP.themeColor = TEMPLATES.find(t=>t.id===id)?.color || '#4f8ef7';
  const cv = document.getElementById('cv-container');
  cv.setAttribute('data-tpl', id);
  cv.style.direction = TEMPLATES.find(t=>t.id===id)?.dir || 'rtl';
  cv.style.setProperty('--tc', APP.themeColor);
  cv.innerHTML = getTemplateHTML(id);
  bindImageUpload();
  renderMiniSwitcher();
  renderColorSwatches();
  renderSectionsManager();
  initSectionsDnD();
  document.getElementById('tpl-name-display').textContent = TEMPLATES.find(t=>t.id===id)?.nameAr||`القالب ${id}`;
  document.getElementById('dir-badge').textContent = TEMPLATES.find(t=>t.id===id)?.dir?.toUpperCase()||'RTL';
  document.getElementById('custom-color').value = APP.themeColor;
  // reload border settings for new template
  const savedBorderStyle = localStorage.getItem(`cv_border_style_${id}`);
  const savedBorderWidth = localStorage.getItem(`cv_border_width_${id}`);
  const savedBorderColor = localStorage.getItem(`cv_border_color_${id}`);
  if (savedBorderStyle) APP.borderStyle = savedBorderStyle;
  if (savedBorderWidth) APP.borderWidth = parseInt(savedBorderWidth);
  if (savedBorderColor) APP.borderColor = savedBorderColor;
  applyBorderToCV();
  if(document.getElementById('border-style-select')) document.getElementById('border-style-select').value = APP.borderStyle;
  if(document.getElementById('border-color-picker')) document.getElementById('border-color-picker').value = APP.borderColor;
  if(document.getElementById('border-width-val')) document.getElementById('border-width-val').innerText = APP.borderWidth + 'px';
  initHistory();
  saveAuto();
  toast('✅ تم تغيير القالب', 'success');
}

/* ====================================================
   IMAGE UPLOAD
==================================================== */
function bindImageUpload() {
  const upload = document.getElementById('img-upload');
  const img = document.getElementById('cv-container')?.querySelector('#profile-img');
  if (!upload || !img) return;
  img.style.cursor = 'pointer';
  img.title = 'انقر لتغيير الصورة';
  img.onclick = () => upload.click();
  upload.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      img.src = ev.target.result;
      localStorage.setItem(`cv_pro_img_${APP.templateId}`, ev.target.result);
      updateProgress();
      saveAuto();
      toast('✅ تم رفع الصورة', 'success');
    };
    reader.readAsDataURL(file);
  };
  const savedImg = localStorage.getItem(`cv_pro_img_${APP.templateId}`);
  if (savedImg) img.src = savedImg;
}

/* ====================================================
   HISTORY
==================================================== */
function initHistory() {
  APP.history = [];
  APP.historyIndex = -1;
  pushHistory();
}

function pushHistory() {
  const cv = document.getElementById('cv-container');
  if (!cv) return;
  const snap = cv.innerHTML;
  if (APP.history[APP.historyIndex] === snap) return;
  APP.history = APP.history.slice(0, APP.historyIndex + 1);
  APP.history.push(snap);
  APP.historyIndex = APP.history.length - 1;
  if (APP.history.length > 50) { APP.history.shift(); APP.historyIndex--; }
}

function undoAction() {
  if (APP.historyIndex <= 0) { toast('لا يوجد المزيد للتراجع', 'error'); return; }
  APP.historyIndex--;
  document.getElementById('cv-container').innerHTML = APP.history[APP.historyIndex];
  restoreEditorBindings();
  toast('↩ تم التراجع', 'info');
}

function redoAction() {
  if (APP.historyIndex >= APP.history.length - 1) { toast('لا يوجد المزيد للإعادة', 'error'); return; }
  APP.historyIndex++;
  document.getElementById('cv-container').innerHTML = APP.history[APP.historyIndex];
  restoreEditorBindings();
  toast('↪ تم الإعادة', 'info');
}

/* ====================================================
   AUTO SAVE
==================================================== */
function saveAuto() {
  clearTimeout(APP.saveTimer);
  const status = document.getElementById('save-status');
  if (status) status.innerHTML = '<div class="save-dot" style="background:var(--orange)"></div><span>يحفظ...</span>';
  APP.saveTimer = setTimeout(() => {
    const cv = document.getElementById('cv-container');
    if (!cv) return;
    localStorage.setItem(`cv_pro_${APP.templateId}`, cv.innerHTML);
    if (status) status.innerHTML = '<div class="save-dot"></div><span>محفوظ</span>';
    updateProgress();
    updateStats();
    pushHistory();
  }, 800);
}

document.addEventListener('input', e => {
  if (e.target.isContentEditable) saveAuto();
});

/* ====================================================
   PROGRESS TRACKER
==================================================== */
function updateProgress() {
  const cv = document.getElementById('cv-container');
  if (!cv) return;
  const checks = [
    {label:'الاسم الكامل', done: !!cv.querySelector('h1')?.textContent?.trim() && cv.querySelector('h1')?.textContent !== 'الاسم الكامل'},
    {label:'المسمى الوظيفي', done: !!cv.querySelector('h2')?.textContent?.trim() && cv.querySelector('h2')?.textContent !== 'المسمى الوظيفي'},
    {label:'الصورة الشخصية', done: !cv.querySelector('#profile-img')?.src?.includes('unsplash')},
    {label:'النبذة الشخصية', done: (cv.querySelector('.about p,.about-p')?.textContent?.length || 0) > 50},
    {label:'خبرة مهنية', done: cv.querySelectorAll('.tl-item').length >= 1},
    {label:'التعليم', done: !!cv.querySelector('.education')},
    {label:'المهارات', done: (cv.querySelector('.skills')?.textContent?.length || 0) > 15},
    {label:'معلومات التواصل', done: !!cv.querySelector('.contact')},
    {label:'اللغات', done: !!cv.querySelector('.languages')},
    {label:'سيرة مكتملة', done: false},
  ];
  const done = checks.filter(c => c.done).length;
  checks[9].done = done >= 8;
  const score = Math.round((done / checks.length) * 100);

  const num = document.getElementById('score-number');
  const fill = document.getElementById('progress-fill');
  const items = document.getElementById('progress-items');
  if (num) num.textContent = score + '%';
  if (fill) fill.style.width = score + '%';
  if (items) {
    items.innerHTML = checks.map(c => `
      <div class="progress-item ${c.done?'done':'todo'}">
        <i class="fas ${c.done?'fa-check-circle':'fa-circle'}"></i>
        <span>${c.label}</span>
      </div>`).join('');
  }
  if (num) {
    if (score >= 80) num.style.background = 'linear-gradient(135deg,var(--green),#4ade80)';
    else if (score >= 50) num.style.background = 'linear-gradient(135deg,var(--gold),var(--orange))';
    else num.style.background = 'linear-gradient(135deg,var(--red),#f87171)';
    num.style.webkitBackgroundClip = 'text';
    num.style.webkitTextFillColor = 'transparent';
  }
}

function updateStats() {
  const cv = document.getElementById('cv-container');
  if (!cv) return;
  const text = cv.innerText || '';
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const chars = text.length;
  const sections = cv.querySelectorAll('.sec-section').length;
  const readTime = Math.ceil(words / 200);
  APP.stats = { words, chars, sections, readTime };
  
  // ✅ تحقق من وجود العناصر قبل تعيين القيم
  const statWords = document.getElementById('stat-words');
  if (statWords) statWords.textContent = words;
  
  const statChars = document.getElementById('stat-chars');
  if (statChars) statChars.textContent = chars;
  
  const statSections = document.getElementById('stat-sections');
  if (statSections) statSections.textContent = sections;
  
  const statReadtime = document.getElementById('stat-readtime');
  if (statReadtime) statReadtime.textContent = readTime + 'د';
}

// دالة قوية لإخفاء شريط التمرير من أي عنصر (حتى العناصر التي تظهر لاحقًا)
function hideScrollbarCompletely(selector) {
  // إضافة قاعدة CSS دائمة
  let style = document.getElementById('global-scrollbar-hide');
  if (!style) {
    style = document.createElement('style');
    style.id = 'global-scrollbar-hide';
    document.head.appendChild(style);
  }
  
  // تحديث المحتوى ليشمل جميع المحددات المطلوبة
  let cssRules = '';
  const selectors = Array.isArray(selector) ? selector : [selector];
  selectors.forEach(sel => {
    cssRules += `
      ${sel} {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
        overflow: auto !important;
      }
      ${sel}::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
      }
    `;
  });
  style.textContent = cssRules;
}


// دالة مساعدة لإخفاء شريط التمرير بشكل آمن (مع الاحتفاظ بالقدرة على التمرير)
function safelyHideScrollbar(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  
  // نضبط overflow تلقائيًا حسب الحاجة دون فرض auto
  // نستخدم 'overlay' أو 'auto' لكننا نعتمد على CSS الأصلي
  // فقط نخفي شريط التمرير بصريًا
  el.style.scrollbarWidth = 'none';
  el.style.msOverflowStyle = 'none';
  
  // إضافة قاعدة CSS للـ webkit
  let style = document.getElementById(`hide-scrollbar-${selector.replace(/[#.]/g, '')}`);
  if (!style) {
    style = document.createElement('style');
    style.id = `hide-scrollbar-${selector.replace(/[#.]/g, '')}`;
    document.head.appendChild(style);
  }
  style.textContent = `
    ${selector} {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    ${selector}::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
      background: transparent !important;
    }
  `;
}

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  // فقط نخفي شريط التمرير من body و canvas-area دون التأثير على left-panel
  safelyHideScrollbar('body');
  safelyHideScrollbar('#canvas-area');
  
  // لا نخفي شريط التمرير من left-panel، بل نجعله يظهر بشكل طبيعي
  // ولكن يمكننا أيضًا إخفاؤه إذا أردنا (اختياري)
  // safelyHideScrollbar('#left-panel'); // غير مرغوب فيه لأنه يمنع رؤية شريط التمرير
  
  // مراقبة فتح نافذة المعاينة وإخفاء شريط التمرير داخلها فقط
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const modal = document.getElementById('preview-modal');
        if (modal && modal.classList.contains('open')) {
          setTimeout(() => {
            safelyHideScrollbar('#preview-modal');
            safelyHideScrollbar('#preview-wrap');
            safelyHideScrollbar('.modal-box');
            const previewContent = document.querySelector('#preview-wrap > div');
            if (previewContent) {
              previewContent.style.overflow = 'auto';
              previewContent.style.scrollbarWidth = 'none';
            }
          }, 50);
        }
      }
    });
  });
  
  const modal = document.getElementById('preview-modal');
  if (modal) observer.observe(modal, { attributes: true });
});

// تعديل showPreview إن وجد
const originalShowPreview = window.showPreview;
if (originalShowPreview) {
  window.showPreview = function() {
    originalShowPreview();
    setTimeout(() => {
      safelyHideScrollbar('#preview-modal');
      safelyHideScrollbar('#preview-wrap');
      safelyHideScrollbar('.modal-box');
    }, 100);
  };
}

// إزالة دالة forceHideScrollbar نهائيًا (أو تعطيلها)
// يمكنك حذفها أو استبدالها بدالة فارغة
window.forceHideScrollbar = function() {
  console.warn('forceHideScrollbar معطلة لتجنب المشاكل');
};


/* ====================================================
   CLOUD SAVE/LOAD
==================================================== */
function saveToCloud() {
  const cv = document.getElementById('cv-container');
  const data = {
    version: '2.0',
    templateId: APP.templateId,
    themeColor: APP.themeColor,
    font: APP.font,
    fontScale: APP.fontScale,
    lineHeight: APP.lineHeight,
    secStyle: APP.secStyle,
    borderStyle: APP.borderStyle,
    borderWidth: APP.borderWidth,
    borderColor: APP.borderColor,
    cvHTML: cv.innerHTML,
    exportDate: new Date().toISOString(),
    stats: APP.stats,
  };
  localStorage.setItem('cv_pro_cloud_backup', JSON.stringify(data));
  showSpinner(true);
  setTimeout(() => {
    showSpinner(false);
    toast('☁️ تم الحفظ في السحابة بنجاح', 'success');
  }, 1000);
}

function loadFromCloud() {
  const saved = localStorage.getItem('cv_pro_cloud_backup');
  if (!saved) {
    toast('❌ لا يوجد نسخة محفوظة في السحابة', 'error');
    return;
  }
  showSpinner(true);
  setTimeout(() => {
    showSpinner(false);
    try {
      const data = JSON.parse(saved);
      if (data.cvHTML && confirm('هل تريد استرجاع السيرة من السحابة؟')) {
        APP.templateId = data.templateId || APP.templateId;
        APP.themeColor = data.themeColor || APP.themeColor;
        APP.borderStyle = data.borderStyle || 'none';
        APP.borderWidth = data.borderWidth || 2;
        APP.borderColor = data.borderColor || '#5b8ef0';
        const cv = document.getElementById('cv-container');
        cv.setAttribute('data-tpl', APP.templateId);
        cv.style.setProperty('--tc', APP.themeColor);
        cv.innerHTML = data.cvHTML;
        applyBorderToCV();
        if(document.getElementById('border-style-select')) document.getElementById('border-style-select').value = APP.borderStyle;
        if(document.getElementById('border-color-picker')) document.getElementById('border-color-picker').value = APP.borderColor;
        if(document.getElementById('border-width-val')) document.getElementById('border-width-val').innerText = APP.borderWidth + 'px';
        bindImageUpload();
        renderSectionsManager();
        renderColorSwatches();
        toast('☁️ تم استرجاع السيرة من السحابة', 'success');
      }
    } catch (e) {
      toast('❌ خطأ في استرجاع البيانات', 'error');
    }
  }, 800);
}

/* ====================================================
   SHARE FEATURES
==================================================== */
function shareCV() {
  openModal('share-modal');
}

function shareByEmail() {
  const subject = 'سيرتي الذاتية - ProCV Studio';
  const body = 'مرحباً،\n\nأشارك معك سيرتي الذاتية التي أنشأتها باستخدام ProCV Studio.\n\nمع تحياتي';
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  closeModal('share-modal');
}

function shareByLink() {
  const dummyLink = 'https://procv.studio/cv/' + Math.random().toString(36).substr(2, 9);
  navigator.clipboard.writeText(dummyLink).then(() => {
    toast('📋 تم نسخ الرابط', 'success');
  });
  closeModal('share-modal');
}

function shareByWhatsApp() {
  const text = 'مرحباً! أشارك معك سيرتي الذاتية التي أنشأتها باستخدام ProCV Studio.';
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  closeModal('share-modal');
}

/* ====================================================
   TIMELINE ITEMS
==================================================== */
function addExpItem(btn) {
  const timeline = btn.previousElementSibling;
  const item = document.createElement('div');
  item.className = 'tl-item';
  item.innerHTML = `
    <div class="tl-date" contenteditable="true">YYYY - YYYY</div>
    <div class="tl-body">
      <h4 contenteditable="true">المسمى الوظيفي</h4>
      <h5 contenteditable="true">اسم الشركة · المدينة</h5>
      <ul contenteditable="true"><li>وصف المهام والإنجازات</li></ul>
    </div>
    <button class="delete-item-btn" onclick="this.parentElement.remove();saveAuto();"><i class="fas fa-times"></i> حذف</button>`;
  timeline.appendChild(item);
  updateProgress(); saveAuto();
  toast('✅ تم إضافة خبرة جديدة', 'success');
}

function addEduItem(btn) {
  const timeline = btn.previousElementSibling;
  const item = document.createElement('div');
  item.className = 'tl-item';
  item.innerHTML = `
    <div class="tl-date" contenteditable="true">YYYY - YYYY</div>
    <div class="tl-body">
      <h4 contenteditable="true">المؤهل العلمي</h4>
      <h5 contenteditable="true">الجامعة · المدينة</h5>
    </div>
    <button class="delete-item-btn" onclick="this.parentElement.remove();saveAuto();"><i class="fas fa-times"></i> حذف</button>`;
  timeline.appendChild(item);
  saveAuto();
  toast('✅ تم إضافة مؤهل جديد', 'success');
}

function addSkillItem(btn) {
  const wrap = btn.previousElementSibling;
  const tag = document.createElement('span');
  tag.className = 'skill-tag';
  tag.contentEditable = 'true';
  tag.textContent = 'مهارة جديدة';
  wrap.appendChild(tag);
  saveAuto();
}

function addContactItem(btn) {
  const ul = btn.previousElementSibling;
  const li = document.createElement('li');
  li.contentEditable = 'true';
  li.innerHTML = '<i class="fas fa-link"></i> معلومة تواصل جديدة';
  ul.appendChild(li);
  saveAuto();
}

function addLangItem(btn) {
  const wrap = btn.parentElement;
  const div = document.createElement('div');
  div.className = 'lang-item';
  div.innerHTML = '<span contenteditable="true">لغة جديدة</span><span class="lang-level" contenteditable="true">المستوى</span>';
  wrap.insertBefore(div, btn);
  saveAuto();
}

/* ====================================================
   SAMPLE DATA FILL
==================================================== */
function fillSampleData() {
  if (!confirm('هل تريد ملء السيرة ببيانات نموذجية؟ سيتم استبدال المحتوى الحالي.')) return;
  const cv = document.getElementById('cv-container');
  const h1 = cv.querySelector('h1');
  const h2 = cv.querySelector('h2');
  if (h1) h1.textContent = 'ابراهيم عبدالكريم جعفر';
  if (h2) h2.textContent = 'مهندس برمجيات أول';
  const aboutP = cv.querySelector('.about p, .about-p');
  if (aboutP) aboutP.textContent = 'مهندس برمجيات متمرس بخبرة تتجاوز 7 سنوات في تطوير تطبيقات الويب والموبايل. متخصص في بناء حلول تقنية متكاملة باستخدام أحدث التقنيات. أتمتع بمهارات قيادية عالية وقدرة على العمل ضمن فرق متعددة الثقافات.';
  const tlItems = cv.querySelectorAll('.experience .tl-item, .tl-item');
  if (tlItems[0]) {
    const h4 = tlItems[0].querySelector('h4');
    const h5 = tlItems[0].querySelector('h5');
    const dt = tlItems[0].querySelector('.tl-date');
    if (h4) h4.textContent = 'مهندس برمجيات أول';
    if (h5) h5.textContent = 'شركة تقنيات المستقبل · البصرة';
    if (dt) dt.textContent = '2021 - حتى الآن';
  }
  saveAuto();
  updateProgress();
  toast('✅ تم ملء البيانات النموذجية', 'success');
}

/* ====================================================
   RESET
==================================================== */
function resetCV() {
  localStorage.removeItem(`cv_pro_${APP.templateId}`);
  localStorage.removeItem(`cv_pro_img_${APP.templateId}`);
  initEditor(APP.templateId);
  toast('✅ تم إعادة التعيين', 'success');
}

function confirmReset() { openModal('reset-modal'); }

/* ====================================================
   PREVIEW
==================================================== */
function showPreview() {
  const cv = document.getElementById('cv-container');
  const clone = cv.cloneNode(true);
  clone.querySelectorAll('.add-item-btn,.delete-item-btn').forEach(el => el.remove());
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  const wrap = document.getElementById('preview-wrap');
  wrap.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'background:white;width:210mm;min-height:297mm;transform:scale(0.72);transform-origin:top center;margin-bottom:-85mm;display:inline-block;box-shadow:0 6px 25px rgba(0,0,0,0.5);';
  box.style.setProperty('--tc', APP.themeColor);
  box.appendChild(clone);
  wrap.appendChild(box);
  openModal('preview-modal');
}

/* ====================================================
   PDF DOWNLOAD
==================================================== */
function downloadPDF() {
  const cv = document.getElementById('cv-container');
  const origTransform = cv.style.transform;
  cv.style.transform = 'scale(1)';
  const hideBtns = cv.querySelectorAll('.add-item-btn,.delete-item-btn');
  hideBtns.forEach(b => b.style.display = 'none');
  toast('⏳ جارٍ إنشاء PDF...', 'info');
  html2pdf().from(cv).set({
    margin: 0,
    filename: `سيرة-ذاتية-${new Date().toISOString().slice(0,10)}.pdf`,
    image: {type:'jpeg',quality:0.98},
    html2canvas: {scale:3,useCORS:true,dpi:300,letterRendering:true},
    jsPDF: {unit:'mm',format:'a4',orientation:'portrait'}
  }).save().then(() => {
    cv.style.transform = origTransform;
    hideBtns.forEach(b => b.style.display = '');
    toast('✅ تم تحميل PDF!', 'success');
  }).catch(err => {
    cv.style.transform = origTransform;
    hideBtns.forEach(b => b.style.display = '');
    toast('❌ خطأ في PDF', 'error');
    console.error(err);
  });
}

/* ====================================================
   EXPORT / IMPORT JSON
==================================================== */
function exportJSON() {
  const cv = document.getElementById('cv-container');
  const data = {
    version: '2.0',
    templateId: APP.templateId,
    themeColor: APP.themeColor,
    font: APP.font,
    fontScale: APP.fontScale,
    lineHeight: APP.lineHeight,
    secStyle: APP.secStyle,
    borderStyle: APP.borderStyle,
    borderWidth: APP.borderWidth,
    borderColor: APP.borderColor,
    cvHTML: cv.innerHTML,
    exportDate: new Date().toISOString(),
    stats: APP.stats,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cv-data-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ تم تصدير الملف', 'success');
}

function importJSON() {
  const text = document.getElementById('import-json-text').value.trim();
  if (!text) { toast('أدخل محتوى JSON أولاً', 'error'); return; }
  try {
    const data = JSON.parse(text);
    if (data.cvHTML) {
      APP.templateId = data.templateId || APP.templateId;
      APP.themeColor = data.themeColor || APP.themeColor;
      APP.font = data.font || APP.font;
      APP.borderStyle = data.borderStyle || 'none';
      APP.borderWidth = data.borderWidth || 2;
      APP.borderColor = data.borderColor || '#5b8ef0';
      const cv = document.getElementById('cv-container');
      cv.setAttribute('data-tpl', APP.templateId);
      cv.style.setProperty('--tc', APP.themeColor);
      cv.innerHTML = data.cvHTML;
      applyBorderToCV();
      if(document.getElementById('border-style-select')) document.getElementById('border-style-select').value = APP.borderStyle;
      if(document.getElementById('border-color-picker')) document.getElementById('border-color-picker').value = APP.borderColor;
      if(document.getElementById('border-width-val')) document.getElementById('border-width-val').innerText = APP.borderWidth + 'px';
      bindImageUpload();
      renderSectionsManager();
      renderColorSwatches();
      closeModal('import-modal');
      saveAuto();
      toast('✅ تم استيراد السيرة الذاتية', 'success');
    } else { toast('ملف JSON غير صالح', 'error'); }
  } catch (e) { toast('خطأ في قراءة الملف', 'error'); }
}

/* ====================================================
   ICON LIBRARY
==================================================== */
function renderIcons(filter = '') {
  const grid = document.getElementById('icon-grid');
  const filtered = filter ? ICONS.filter(i => i.includes(filter)) : ICONS;
  grid.innerHTML = filtered.map(ic => `
    <div class="icon-item" onclick="insertIcon('${ic}')"><i class="fas ${ic}"></i></div>`).join('');
}

function filterIcons(val) { renderIcons(val.replace('fa-','').toLowerCase()); }

function openIconLib() {
  renderIcons();
  openModal('icon-modal');
}

function insertIcon(iconClass) {
  if (APP.currentEditable) {
    const icon = document.createElement('i');
    icon.className = `fas ${iconClass}`;
    icon.style.marginLeft = '6px';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) sel.getRangeAt(0).insertNode(icon);
    else APP.currentEditable.appendChild(icon);
    saveAuto();
  }
  closeModal('icon-modal');
}

/* ====================================================
   MODAL HELPERS
==================================================== */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

/* ====================================================
   SPINNER
==================================================== */
function showSpinner(show) {
  const spinner = document.getElementById('spinner-overlay');
  if (spinner) {
    if (show) spinner.classList.add('show');
    else spinner.classList.remove('show');
  }
}

/* ====================================================
   TOAST
==================================================== */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-20px) translateX(-50%)';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

/* ====================================================
   KEYBOARD SHORTCUTS
==================================================== */
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoAction(); }
    if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redoAction(); }
    if (e.key === 'p') { e.preventDefault(); showPreview(); }
    if (e.key === '=' || e.key === '+') { e.preventDefault(); changeZoom(10); }
    if (e.key === '-') { e.preventDefault(); changeZoom(-10); }
    if (e.key === '0') { e.preventDefault(); resetZoom(); }
    if (e.key === 's') { e.preventDefault(); saveToCloud(); }
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

/* ====================================================
   TEMPLATE HTML BUILDERS
==================================================== */
function getTemplateHTML(id) {
  const nm = `
    <input type="file" id="img-upload" accept="image/*" style="display:none">
    <div class="header-text">
      <h1 contenteditable="true">الاسم الكامل</h1>
      <h2 contenteditable="true">المسمى الوظيفي</h2>
    </div>`;
  const pic = `
    <div class="profile-pic">
      <img id="profile-img" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face" alt="صورة شخصية" style="cursor:pointer;">
    </div>`;

  const contact = `
    <div class="sec-section contact">
      <h3 class="sec-title" contenteditable="true">التواصل</h3>
      <ul>
        <li contenteditable="true"><i class="fas fa-phone"></i> +966 5X XXX XXXX</li>
        <li contenteditable="true"><i class="fas fa-envelope"></i> email@example.com</li>
        <li contenteditable="true"><i class="fas fa-map-marker-alt"></i> البصرة، جمهورية العراق</li>
        <li contenteditable="true"><i class="fas fa-linkedin"></i> linkedin.com/in/username</li>
      </ul>
      <button class="add-item-btn" onclick="addContactItem(this)"><i class="fas fa-plus"></i> إضافة</button>
    </div>`;

  const skills = `
    <div class="sec-section skills">
      <h3 class="sec-title" contenteditable="true">المهارات</h3>
      <div class="skills-wrap">
        <span class="skill-tag" contenteditable="true">قيادة الفرق</span>
        <span class="skill-tag" contenteditable="true">تطوير الويب</span>
        <span class="skill-tag" contenteditable="true">إدارة المشاريع</span>
        <span class="skill-tag" contenteditable="true">التحليل البياني</span>
        <span class="skill-tag" contenteditable="true">التفاوض</span>
        <span class="skill-tag" contenteditable="true">حل المشكلات</span>
      </div>
      <button class="add-item-btn" onclick="addSkillItem(this)"><i class="fas fa-plus"></i> مهارة</button>
    </div>`;

  const langs = `
    <div class="sec-section languages">
      <h3 class="sec-title" contenteditable="true">اللغات</h3>
      <div class="lang-item"><span contenteditable="true">العربية</span><span class="lang-level" contenteditable="true">لغة الأم</span></div>
      <div class="lang-item"><span contenteditable="true">الإنجليزية</span><span class="lang-level" contenteditable="true">متقدم</span></div>
      <button class="add-item-btn" onclick="addLangItem(this)"><i class="fas fa-plus"></i> لغة</button>
    </div>`;

  const about = `
    <div class="sec-section about">
      <h3 class="sec-title" contenteditable="true">نبذة عني</h3>
      <p class="about-p" contenteditable="true">اكتب هنا نبذة شخصية احترافية تعرّف بنفسك وبأبرز إنجازاتك وتخصصاتك المهنية. اجعلها موجزة ومقنعة.</p>
    </div>`;

  const exp = `
    <div class="sec-section experience">
      <h3 class="sec-title" contenteditable="true">الخبرة المهنية</h3>
      <div class="timeline">
        <div class="tl-item">
          <div class="tl-date" contenteditable="true">2021 - حتى الآن</div>
          <div class="tl-body">
            <h4 contenteditable="true">المسمى الوظيفي</h4>
            <h5 contenteditable="true">اسم الشركة · المدينة</h5>
            <ul contenteditable="true"><li>وصف المهام والإنجازات الرئيسية</li></ul>
          </div>
        </div>
      </div>
      <button class="add-item-btn" onclick="addExpItem(this)"><i class="fas fa-plus"></i> إضافة وظيفة</button>
    </div>`;

  const edu = `
    <div class="sec-section education">
      <h3 class="sec-title" contenteditable="true">التعليم</h3>
      <div class="timeline">
        <div class="tl-item">
          <div class="tl-date" contenteditable="true">2016 - 2020</div>
          <div class="tl-body">
            <h4 contenteditable="true">بكالوريوس في التخصص</h4>
            <h5 contenteditable="true">الجامعة · المدينة</h5>
          </div>
        </div>
      </div>
      <button class="add-item-btn" onclick="addEduItem(this)"><i class="fas fa-plus"></i> إضافة مؤهل</button>
    </div>`;

  const side = contact + skills + langs;
  const main = about + exp + edu;

  const layouts = {
    '1': `<div class="cv-header">${nm}${pic}</div><div class="cv-body"><div class="main-col">${main}</div><div class="side-col">${side}</div></div>`,
    '2': `<div class="side-col"><div class="cv-header">${pic}${nm}</div>${side}</div><div class="main-col">${main}</div>`,
    '3': `<div class="cv-header">${pic}${nm}</div><div class="cv-body"><div class="main-col">${main}</div><div class="side-col">${side}</div></div>`,
    '4': `<div class="side-col"><div class="cv-header">${pic}${nm}</div>${side}</div><div class="main-col">${main}</div>`,
    '5': `<div class="cv-header">${pic}${nm}</div><div class="side-col">${side}</div><div class="main-col">${main}</div>`,
    '6': `<div class="cv-header">${pic}${nm}</div><div class="cv-body"><div class="main-col">${main}</div><div class="side-col">${side}</div></div>`,
    '7': `<div class="side-col">${pic}${contact}${skills}${langs}</div><div class="main-col">${nm}${about}${exp}${edu}</div>`,
    '8': `<div class="side-col"><div class="cv-header">${pic}</div><div class="header-name-box">${nm}</div>${side}</div><div class="main-col">${main}</div>`,
    '9': `<div class="side-col"><div class="cv-header">${pic}${nm}</div>${side}</div><div class="main-col">${main}</div>`,
    '10': `<div class="cv-header">${pic}${nm}</div><div class="top-row"><div>${contact}</div><div>${skills}</div></div><div class="main-col">${about}${exp}${edu}</div>`,
    '11': `<div class="side-col"><div class="cv-header">${pic}${nm}</div>${side}</div><div class="main-col">${main}</div>`,
    '12': `<div class="side-col"><div class="cv-header">${pic}${nm}</div>${side}</div><div class="main-col">${main}</div>`,
  };
  return layouts[id] || layouts['1'];
}
// منع التمرير داخل التبويبات وجعل التمرير فقط للقائمة الجانبية
function fixTabScroll() {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.style.overflowY = 'visible';
    tab.style.overflowX = 'visible';
  });
  const leftPanel = document.getElementById('left-panel');
  if (leftPanel) {
    leftPanel.style.overflowY = 'auto';
    leftPanel.style.height = '100%';
  }
}

// استدعاء الدالة عند تحميل الصفحة وعند تبديل التبويبات (للتأكد)
document.addEventListener('DOMContentLoaded', fixTabScroll);
// استدعاء أيضًا بعد أي تحديث للـ DOM قد يغير التبويبات
const observer = new MutationObserver(fixTabScroll);
observer.observe(document.getElementById('left-panel'), { childList: true, subtree: true });
/* ====================================================
   INIT
==================================================== */
document.addEventListener('DOMContentLoaded', () => {
  renderGallery();
  initParticles();
  initNavScroll();
});

/* ====================================================
   ADVANCED TOOLS - NEW
==================================================== */

// Photo Effects
function setPhotoEffect(effect) {
  const img = document.getElementById('cv-container')?.querySelector('#profile-img');
  if (!img) return;

  // Reset all effects
  img.style.boxShadow = '';
  img.style.filter = '';
  img.style.border = '';
  img.style.transform = '';

  switch(effect) {
    case 'shadow':
      img.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
      break;
    case 'glow':
      img.style.boxShadow = `0 0 30px ${APP.themeColor}80`;
      break;
    case 'border':
      img.style.border = `4px double ${APP.themeColor}`;
      break;
    case '3d':
      img.style.transform = 'perspective(500px) rotateY(5deg)';
      img.style.boxShadow = '-10px 10px 20px rgba(0,0,0,0.2)';
      break;
    case 'vintage':
      img.style.filter = 'sepia(40%) contrast(1.1) brightness(0.95)';
      img.style.border = '4px solid #d4a574';
      break;
  }

  document.querySelectorAll('.effect-btn').forEach(btn => btn.classList.remove('active'));
  event.target.closest('.effect-btn')?.classList.add('active');
  saveAuto();
  toast('✨ تم تطبيق التأثير', 'success');
}

function setPhotoSize(val) {
  const img = document.getElementById('cv-container')?.querySelector('#profile-img');
  if (img) {
    img.style.width = val + '%';
    img.style.height = 'auto';
  }
  document.getElementById('photo-size-val').textContent = val + '%';
  saveAuto();
}

// Gradient Background
function setCVGradient(gradient) {
  const cv = document.getElementById('cv-container');
  if (cv) {
    cv.style.background = gradient;
    toast('🎨 تم تطبيق التدرج', 'success');
  }
  saveAuto();
}

// Advanced Text Formatting
function setLetterSpacing(val) {
  const cv = document.getElementById('cv-container');
  if (cv) {
    cv.style.letterSpacing = val + 'px';
  }
  document.getElementById('letter-spacing-val').textContent = val + 'px';
  saveAuto();
}

function setAdvancedLineHeight(val) {
  const cv = document.getElementById('cv-container');
  const lh = (val / 10).toFixed(1);
  if (cv) {
    cv.style.lineHeight = lh;
  }
  document.getElementById('line-height-adv-val').textContent = lh;
  saveAuto();
}

function setTextTransform(transform) {
  const cv = document.getElementById('cv-container');
  if (cv) {
    cv.style.textTransform = transform;
  }
  document.querySelectorAll('.transform-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  saveAuto();
  toast('📝 تم تغيير تحويل النص', 'info');
}

// Section Effects
function toggleSectionShadow(enabled) {
  const sections = document.querySelectorAll('#cv-container .sec-section');
  sections.forEach(sec => {
    sec.style.boxShadow = enabled ? '0 4px 15px rgba(0,0,0,0.1)' : '';
  });
  saveAuto();
}

function toggleSectionRounded(enabled) {
  const sections = document.querySelectorAll('#cv-container .sec-section');
  sections.forEach(sec => {
    sec.style.borderRadius = enabled ? '12px' : '';
  });
  saveAuto();
}

function toggleSectionBorder(enabled) {
  const sections = document.querySelectorAll('#cv-container .sec-section');
  sections.forEach(sec => {
    sec.style.border = enabled ? `1px solid ${APP.themeColor}30` : '';
  });
  saveAuto();
}

// Color Themes
function applyColorTheme(theme) {
  const themes = {
    professional: { primary: '#2c3e50', secondary: '#3498db' },
    creative: { primary: '#e74c3c', secondary: '#f39c12' },
    elegant: { primary: '#8e44ad', secondary: '#9b59b6' },
    nature: { primary: '#27ae60', secondary: '#2ecc71' }
  };

  const selected = themes[theme];
  if (selected) {
    APP.themeColor = selected.primary;
    document.getElementById('cv-container').style.setProperty('--tc', selected.primary);
    document.getElementById('custom-color').value = selected.primary;
    localStorage.setItem(`cv_pro_color_${APP.templateId}`, selected.primary);
    saveAuto();
    toast(`🎨 تم تطبيق النمط ${theme}`, 'success');
  }
}

// Quick Tools
function autoFormat() {
  const cv = document.getElementById('cv-container');
  if (!cv) return;

  // Auto-format headings
  cv.querySelectorAll('h1').forEach(h1 => {
    h1.style.fontWeight = '800';
    h1.style.letterSpacing = '1px';
  });

  cv.querySelectorAll('h2').forEach(h2 => {
    h2.style.fontWeight = '600';
    h2.style.color = APP.themeColor;
  });

  cv.querySelectorAll('.sec-title').forEach(title => {
    title.style.fontWeight = '700';
    title.style.textTransform = 'uppercase';
  });

  saveAuto();
  toast('✨ تم التنسيق التلقائي', 'success');
}

function optimizeLayout() {
  const cv = document.getElementById('cv-container');
  if (!cv) return;

  // Optimize spacing
  cv.querySelectorAll('.sec-section').forEach(sec => {
    sec.style.marginBottom = '20px';
  });

  cv.querySelectorAll('.tl-item').forEach(item => {
    item.style.marginBottom = '14px';
  });

  saveAuto();
  toast('📐 تم تحسين التخطيط', 'success');
}

function enhanceReadability() {
  const cv = document.getElementById('cv-container');
  if (!cv) return;

  cv.style.lineHeight = '1.8';
  cv.style.fontSize = '1.05em';

  cv.querySelectorAll('p').forEach(p => {
    p.style.textAlign = 'justify';
  });

  saveAuto();
  toast('👁️ تم تحسين القراءة', 'success');
}

function resetFormatting() {
  const cv = document.getElementById('cv-container');
  if (!cv) return;

  cv.style = '';
  cv.style.setProperty('--tc', APP.themeColor);

  cv.querySelectorAll('*').forEach(el => {
    el.style.letterSpacing = '';
    el.style.textTransform = '';
    el.style.boxShadow = '';
    el.style.borderRadius = '';
    el.style.border = '';
  });

  saveAuto();
  toast('🔄 تم إعادة التنسيق', 'info');
}

/* ====================================================
   ENHANCED DEVICE PREVIEW
==================================================== */
function previewDevice(device) {
  APP.devicePreview = device;
  const cv = document.getElementById('cv-container');
  const devices = { desktop: '210mm', tablet: '160mm', mobile: '100mm' };

  document.querySelectorAll('.control-btn').forEach(btn => {
    if (btn.onclick && btn.onclick.toString().includes('previewDevice')) {
      btn.classList.remove('active');
    }
  });

  const activeBtn = document.querySelector(`.control-btn[onclick*="'${device}'"]`);
  if (activeBtn) activeBtn.classList.add('active');

  if (device === 'desktop') {
    cv.style.width = '210mm';
    cv.style.transform = `scale(${APP.zoom/100})`;
  } else if (device === 'tablet') {
    cv.style.width = '160mm';
    cv.style.transform = `scale(${Math.min(APP.zoom, 80)/100})`;
  } else if (device === 'mobile') {
    cv.style.width = '100mm';
    cv.style.transform = `scale(${Math.min(APP.zoom, 50)/100})`;
  }

  const deviceNames = { desktop: 'الحاسوب', tablet: 'التابلت', mobile: 'الموبايل' };
  toast(`📱 معاينة ${deviceNames[device]}`, 'info');
}