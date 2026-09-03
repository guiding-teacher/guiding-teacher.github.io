const LUDO_BOARD_SVG = "<svg viewBox=\"0 0 612 612\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"Baloo Bhaijaan 2, Tahoma, sans-serif\">\n<rect x=\"0\" y=\"0\" width=\"612\" height=\"612\" rx=\"18\" fill=\"#fbf5e6\"/>\n<rect x=\"6\" y=\"6\" width=\"240\" height=\"240\" rx=\"14\" fill=\"#E5393E\"/>\n<rect x=\"42.0\" y=\"42.0\" width=\"168.0\" height=\"168.0\" rx=\"12\" fill=\"#ffffff\"/>\n<circle cx=\"90.0\" cy=\"90.0\" r=\"12.8\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"162.0\" cy=\"90.0\" r=\"12.8\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"90.0\" cy=\"162.0\" r=\"12.8\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"162.0\" cy=\"162.0\" r=\"12.8\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<rect x=\"366\" y=\"6\" width=\"240\" height=\"240\" rx=\"14\" fill=\"#2F7DE1\"/>\n<rect x=\"402.0\" y=\"42.0\" width=\"168.0\" height=\"168.0\" rx=\"12\" fill=\"#ffffff\"/>\n<circle cx=\"450.0\" cy=\"90.0\" r=\"12.8\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"522.0\" cy=\"90.0\" r=\"12.8\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"450.0\" cy=\"162.0\" r=\"12.8\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"522.0\" cy=\"162.0\" r=\"12.8\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<rect x=\"6\" y=\"366\" width=\"240\" height=\"240\" rx=\"14\" fill=\"#3FA34D\"/>\n<rect x=\"42.0\" y=\"402.0\" width=\"168.0\" height=\"168.0\" rx=\"12\" fill=\"#ffffff\"/>\n<circle cx=\"90.0\" cy=\"450.0\" r=\"12.8\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"162.0\" cy=\"450.0\" r=\"12.8\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"90.0\" cy=\"522.0\" r=\"12.8\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"162.0\" cy=\"522.0\" r=\"12.8\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<rect x=\"366\" y=\"366\" width=\"240\" height=\"240\" rx=\"14\" fill=\"#F2A81D\"/>\n<rect x=\"402.0\" y=\"402.0\" width=\"168.0\" height=\"168.0\" rx=\"12\" fill=\"#ffffff\"/>\n<circle cx=\"450.0\" cy=\"450.0\" r=\"12.8\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"522.0\" cy=\"450.0\" r=\"12.8\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"450.0\" cy=\"522.0\" r=\"12.8\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<circle cx=\"522.0\" cy=\"522.0\" r=\"12.8\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"3\"/>\n<rect x=\"486\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"446\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"406\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"366\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"206\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"166\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"126\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"86\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"46\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"6\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"286\" y=\"6\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"6\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"46\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"86\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"126\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"166\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"206\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"206\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"166\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"126\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"86\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"46\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"6\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"6\" y=\"286\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"6\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"46\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"86\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"126\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"166\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"206\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"366\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"406\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"446\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"486\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"526\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"566\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"286\" y=\"566\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"566\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"526\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"486\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"446\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"406\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"366\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"366\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"406\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"446\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"486\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"526\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"566\" y=\"326\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"566\" y=\"286\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"566\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"526\" y=\"246\" width=\"40\" height=\"40\" fill=\"#ffffff\" stroke=\"#e4ded0\" stroke-width=\"1\"/>\n<rect x=\"46\" y=\"246\" width=\"40\" height=\"40\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"1\"/>\n<rect x=\"326\" y=\"46\" width=\"40\" height=\"40\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"526\" width=\"40\" height=\"40\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"1\"/>\n<rect x=\"526\" y=\"326\" width=\"40\" height=\"40\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"1\"/>\n<rect x=\"246\" y=\"86\" width=\"40\" height=\"40\" fill=\"#D3E3FA\" stroke=\"#2F7DE1\" stroke-width=\"2\"/>\n<text x=\"266.0\" y=\"112.0\" font-size=\"20\" text-anchor=\"middle\" fill=\"#8a7440\">★</text>\n<rect x=\"486\" y=\"246\" width=\"40\" height=\"40\" fill=\"#FCE7C2\" stroke=\"#F2A81D\" stroke-width=\"2\"/>\n<text x=\"506.0\" y=\"272.0\" font-size=\"20\" text-anchor=\"middle\" fill=\"#8a7440\">★</text>\n<rect x=\"86\" y=\"326\" width=\"40\" height=\"40\" fill=\"#FBD3D4\" stroke=\"#E5393E\" stroke-width=\"2\"/>\n<text x=\"106.0\" y=\"352.0\" font-size=\"20\" text-anchor=\"middle\" fill=\"#8a7440\">★</text>\n<rect x=\"326\" y=\"486\" width=\"40\" height=\"40\" fill=\"#D6EFDB\" stroke=\"#3FA34D\" stroke-width=\"2\"/>\n<text x=\"346.0\" y=\"512.0\" font-size=\"20\" text-anchor=\"middle\" fill=\"#8a7440\">★</text>\n<rect x=\"286\" y=\"46\" width=\"40\" height=\"40\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"86\" width=\"40\" height=\"40\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"126\" width=\"40\" height=\"40\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"166\" width=\"40\" height=\"40\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"206\" width=\"40\" height=\"40\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"246\" width=\"40\" height=\"40\" fill=\"#2F7DE1\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"46\" y=\"286\" width=\"40\" height=\"40\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"86\" y=\"286\" width=\"40\" height=\"40\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"126\" y=\"286\" width=\"40\" height=\"40\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"166\" y=\"286\" width=\"40\" height=\"40\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"206\" y=\"286\" width=\"40\" height=\"40\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"246\" y=\"286\" width=\"40\" height=\"40\" fill=\"#E5393E\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"526\" width=\"40\" height=\"40\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"486\" width=\"40\" height=\"40\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"446\" width=\"40\" height=\"40\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"406\" width=\"40\" height=\"40\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"366\" width=\"40\" height=\"40\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"286\" y=\"326\" width=\"40\" height=\"40\" fill=\"#3FA34D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"526\" y=\"286\" width=\"40\" height=\"40\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"486\" y=\"286\" width=\"40\" height=\"40\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"446\" y=\"286\" width=\"40\" height=\"40\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"406\" y=\"286\" width=\"40\" height=\"40\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"366\" y=\"286\" width=\"40\" height=\"40\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<rect x=\"326\" y=\"286\" width=\"40\" height=\"40\" fill=\"#F2A81D\" stroke=\"#ffffff\" stroke-width=\"1.5\"/>\n<polygon points=\"246,246 366,246 306.0,306.0\" fill=\"#2F7DE1\"/>\n<polygon points=\"246,246 246,366 306.0,306.0\" fill=\"#E5393E\"/>\n<polygon points=\"246,366 366,366 306.0,306.0\" fill=\"#3FA34D\"/>\n<polygon points=\"366,246 366,366 306.0,306.0\" fill=\"#F2A81D\"/>\n<rect x=\"2\" y=\"2\" width=\"608\" height=\"608\" rx=\"16\" fill=\"none\" stroke=\"#d8cba3\" stroke-width=\"4\"/>\n</svg>";

const LUDO_RING = [[6, 12], [6, 11], [6, 10], [6, 9], [6, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13]];
const LUDO_HOMES = {"TOP": [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], "LEFT": [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], "BOTTOM": [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], "RIGHT": [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]]};
const LUDO_ENTRIES = {"RED": {"entry_index": 20, "home_column": "LEFT"}, "BLUE": {"entry_index": 8, "home_column": "TOP"}, "GREEN": {"entry_index": 32, "home_column": "BOTTOM"}, "ORANGE": {"entry_index": 44, "home_column": "RIGHT"}};
// الحلقة الفعلية للرسم (LUDO_RING) تبقى 56 خلية دون أي تغيير، لكن 8 خلايا منها مُستبعدة من
// "المسير" القابل للعدّ حتى تتخطاها العروسة بصريًا (تقفز فوقها) بدل التوقف عليها أو احتسابها
// كخطوة: 4 زوايا حيث ينعطف المسار حول المربع الأوسط، بالإضافة إلى خلية واحدة لكل لون ملاصقة
// تمامًا لباب الدخول إلى شريطه اللوني الخاص — فتدخل العروسة شريطها مباشرة من الخلية التي
// تسبقها، بدل المرور بهذه الخلية البيضاء الوسيطة أولًا. entry_index أعلاه مُعدَّلة لتعكس
// الموضع المنطقي الجديد بعد الاستبعاد (كانت 23،9،37،51 قبل أي استبعاد).
const LUDO_SKIPPED_CORNERS = new Set([4, 18, 32, 46, 11, 25, 39, 53]);
const LUDO_LOGICAL_RING = LUDO_RING.map((_, i) => i).filter(i => !LUDO_SKIPPED_CORNERS.has(i));
const LUDO_STAR_CELLS = {"RED": [2, 6], "BLUE": [6, 12], "GREEN": [8, 2], "ORANGE": [12, 8]};
const LUDO_STAR_ARM_COLOR = {"RED": "BLUE", "BLUE": "ORANGE", "GREEN": "RED", "ORANGE": "GREEN"};


/* ===================== 1) الاتصال والهوية (نفس هوية الحية والسلم بالضبط) ===================== */

// ====================================================================== 
// الحية والسلم — نسخة محسّنة ومحترفة v5 + نظام المستويات
// ====================================================================== 

/* ===================== 1) الاتصال بسوبابيس ===================== */
const SUPABASE_URL      = "https://yebntvnbuufthdsjqwyx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllYm50dm5idXVmdGhkc2pxd3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MjA4MDIsImV4cCI6MjEwMTQ5NjgwMn0.dtMOlp2jS8oRttfJjsMMZTUFprrAnbfNFiBpx__4lGE";
const isConfigured = !SUPABASE_URL.includes("ضع_") && !SUPABASE_ANON_KEY.includes("ضع_");
const sb = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ===================== 2) الهوية المحلية + المصادقة المجهولة الحقيقية ===================== */
const AVATAR_COLORS = ['#E5484D','#2F7DE1','#3EA06B','#F2B705','#8E5CF2','#FF6F59','#17A2B8','#D6336C'];
let profile = null;
let myAuthUid = null; // معرّف الجلسة الحقيقي الموقّع من Supabase Auth (لا يمكن تزويره من العميل)

function getLocalUserId(){
  let id = localStorage.getItem('snl_user_id');
  if(!id){ id = (crypto.randomUUID ? crypto.randomUUID() : ('u-'+Date.now()+'-'+Math.random().toString(16).slice(2))); localStorage.setItem('snl_user_id', id); }
  return id;
}
const myId = getLocalUserId();

// يضمن وجود جلسة anon حقيقية (يعيد استخدام الجلسة المحفوظة تلقائيًا في
// المتصفح إن وُجدت، أو ينشئ واحدة جديدة). يُستدعى مرة واحدة عند الإقلاع
// وقبل أي عملية كتابة (إنشاء غرفة/انضمام/دردشة...الخ).
async function ensureAnonymousSession(){
  try{
    const { data: { session } } = await sb.auth.getSession();
    if(session?.user?.id){ myAuthUid = session.user.id; return myAuthUid; }
    const { data, error } = await sb.auth.signInAnonymously();
    if(error){ console.error('فشل تسجيل الدخول المجهول:', error); return null; }
    myAuthUid = data?.session?.user?.id || data?.user?.id || null;
    return myAuthUid;
  }catch(e){ console.error('ensureAnonymousSession:', e); return null; }
}

// يربط ملفًا شخصيًا قديمًا (أُنشئ قبل تفعيل المصادقة) بجلسة auth الحقيقية
// الحالية، لمرة واحدة فقط. لا يحذف أو يغيّر أي بيانات أخرى في الملف.
async function claimLegacyProfileIfNeeded(existingProfile){
  if(!existingProfile || existingProfile.auth_uid || !myAuthUid) return existingProfile;
  const { data, error } = await sb.from('profiles')
    .update({ auth_uid: myAuthUid })
    .eq('id', myId)
    .is('auth_uid', null)
    .select().single();
  if(!error && data) return data;
  return existingProfile; // فشل الربط (نادر) — يتابع التطبيق بالبيانات القديمة دون كسر شيء
}

async function loadExistingProfile(){
  const { data } = await sb.from('profiles').select('*').eq('id', myId).maybeSingle();
  if(data){ profile = await claimLegacyProfileIfNeeded(data); return profile; }
  return null;
}
async function createProfile(username, avatarDataUrl){
  const color = AVATAR_COLORS[Math.floor(Math.random()*AVATAR_COLORS.length)];
  const { data, error } = await sb.from('profiles').insert({ id: myId, auth_uid: myAuthUid, username, avatar_color: color, avatar_data: avatarDataUrl || null }).select().single();
  if(!error) profile = data;
  return { data, error };
}
async function updateProfile(fields){
  const { data, error } = await sb.from('profiles').update(fields).eq('id', myId).select().single();
  if(!error) profile = data;
  return { data, error };
}
function compressImageToDataUrl(file, maxSize = 160, quality = 0.72){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('تعذّر تحميل الصورة'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = maxSize; canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function applyAvatarVisual(el, color, dataUrl, initial){
  if(dataUrl){
    el.style.backgroundImage = `url(${dataUrl})`;
    el.style.backgroundColor = 'transparent';
    el.textContent = '';
  } else {
    el.style.backgroundImage = 'none';
    el.style.backgroundColor = color || '#E5484D';
    if(initial !== undefined) el.textContent = initial;
  }
}



/* ===================== 2) ثوابت مكعب النرد المرئي ===================== */

const CUBE_ROTATIONS = {
  1:'rotateX(-18deg) rotateY(24deg)', 2:'rotateX(-18deg) rotateY(-66deg)',
  3:'rotateX(-108deg) rotateY(24deg)', 4:'rotateX(72deg) rotateY(24deg)',
  5:'rotateX(-18deg) rotateY(114deg)', 6:'rotateX(-18deg) rotateY(204deg)',
};
const PIP_LAYOUT = {
  1:[0,0,0,0,1,0,0,0,0], 2:[1,0,0,0,0,0,0,0,1], 3:[1,0,0,0,1,0,0,0,1],
  4:[1,0,1,0,0,0,1,0,1], 5:[1,0,1,0,1,0,1,0,1], 6:[1,0,1,1,0,1,1,0,1],
};


/* ===================== 3) النرد المرئي والبث اللحظي له ===================== */

function buildFacePips(){
  document.querySelectorAll('.face').forEach(face=>{
    const layout = PIP_LAYOUT[+face.dataset.n];
    face.innerHTML = layout.map(v=>`<div class="pip ${v?'on':''}"></div>`).join('');
  });
}
function showDiceValue(role, v, spin){
  const cube = document.getElementById(role==='p1' ? 'cubeP1' : 'cubeP2');
  cube.classList.toggle('rolling', !!spin);
  cube.style.transform = CUBE_ROTATIONS[v] || CUBE_ROTATIONS[1];
}

/* ====== فقاعة الدور العائمة فوق اللوحة (تظهر ثانية واحدة ثم تختفي) ====== */
let turnBubbleTimer = null;
function showTurnBubble(text){
  const bubble = document.getElementById('turnBubble');
  if(!bubble || !text) return;
  bubble.textContent = text;
  bubble.classList.remove('show');
  void bubble.offsetWidth;
  bubble.classList.add('show');
  clearTimeout(turnBubbleTimer);
  turnBubbleTimer = setTimeout(()=> bubble.classList.remove('show'), 1000);
}

/* ====== واجهة النرد المكبّرة أمام المستخدم أثناء الرمي ====== */
function showDiceOverlay(){ document.getElementById('diceRollOverlay')?.classList.add('show'); }
function hideDiceOverlay(){ document.getElementById('diceRollOverlay')?.classList.remove('show'); }
function setDiceOverlayValue(v){ const el = document.getElementById('droValue'); if(el) el.textContent = v; }
function rollFairDice(){
  if(window.crypto && crypto.getRandomValues){
    const buf = new Uint32Array(1);
    const limit = Math.floor(0xFFFFFFFF / 6) * 6;
    let x;
    do{ crypto.getRandomValues(buf); x = buf[0]; } while(x >= limit);
    return 1 + (x % 6);
  }
  return 1 + Math.floor(Math.random()*6);
}

/* ====== محاكاة دوران نرد الطرف الآخر — تُبث لحظيًا وتُشغَّل محليًا لدى المشاهدين ====== */
let remoteShuffleTimers = { p1:null, p2:null };
let remoteShuffleSafety = { p1:null, p2:null };
/* ====== دوران نرد الخصم/المشاهد — يستمر بلا توقف ذاتي حتى تصله النتيجة الحقيقية عبر playRemoteDiceResult
   (بدل التوقف على مؤقّت ثابت 650ms الذي كان يجمّده على رقم عشوائي خاطئ قبل وصول الرقم الصحيح).
   مؤقّت أمان طويل (4 ثوانٍ) فقط كشبكة أمان في حال ضاع حدث dice_result لأي سبب (فقدان اتصال مثلًا). ====== */
function playRemoteDiceShuffle(role){
  if(role === session.role) return; // تجاهل حدثي أنا نفسي (عندي أصلًا الرسوم المتحركة المحلية)
  const cube = document.getElementById(role==='p1' ? 'cubeP1' : 'cubeP2');
  if(!cube) return;
  clearInterval(remoteShuffleTimers[role]);
  clearTimeout(remoteShuffleSafety[role]);
  remoteShuffleTimers[role] = setInterval(()=>{
    const rv = 1+Math.floor(Math.random()*6);
    showDiceValue(role, rv, true);
  }, 90);
  // شبكة أمان فقط — لا تتوقف الدورة الطبيعية عندها، بل تحمي من دوران أبدي إذا ضاع البث
  remoteShuffleSafety[role] = setTimeout(()=>{
    clearInterval(remoteShuffleTimers[role]);
    remoteShuffleTimers[role] = null;
  }, 4000);
}
/* ====== النتيجة الحقيقية للنرد — تُبث فور احتسابها لدى الرامي، فيتوقف المشاهد فورًا على الرقم الصحيح
   بالتزامن مع وصولها، بدل توقف عشوائي مبكر بزمن ثابت أو انتظار تحديث قاعدة البيانات المتأخر ====== */
function playRemoteDiceResult(role, value){
  if(role === session.role) return; // تجاهل صدى حدثي أنا نفسي
  clearInterval(remoteShuffleTimers[role]);
  clearTimeout(remoteShuffleSafety[role]);
  remoteShuffleTimers[role] = null;
  showDiceValue(role, value, false);
}
function broadcastDiceRoll(role){
  presenceChannel?.send({ type:'broadcast', event:'dice_roll', payload:{role} });
}
function broadcastDiceResult(role, value){
  presenceChannel?.send({ type:'broadcast', event:'dice_result', payload:{role, value} });
}

/* ===================== 5) المؤثرات ===================== */
let soundOn = true;


/* ===================== 4) المؤثرات + الدردشة ===================== */

function beep(freq=440, dur=0.12, type='sine', vol=0.18){
  if(!soundOn) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const o = actx.createOscillator(); const g = actx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(actx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.stop(actx.currentTime + dur);
  }catch(e){}
}
function burstReaction(anchorEl, emoji){
  const stage = document.querySelector('.stage');
  const rect = anchorEl.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const originX = rect.left - stageRect.left + rect.width/2;
  const originY = rect.top - stageRect.top + rect.height/2;
  for(let i=0;i<10;i++){
    const el = document.createElement('div');
    el.className='reaction-particle'; el.textContent = emoji;
    const angle = (Math.PI*2/10)*i + Math.random()*0.4;
    const dist = 50+Math.random()*50;
    el.style.setProperty('--dx', (Math.cos(angle)*dist)+'px');
    el.style.setProperty('--dy', (Math.sin(angle)*dist-30)+'px');
    el.style.setProperty('--rot', (Math.random()*160-80)+'deg');
    el.style.left = originX+'px'; el.style.top = originY+'px';
    stage.appendChild(el);
    setTimeout(()=>el.remove(), 950);
  }
  const boardWrap = document.querySelector('.board-wrap');
  if(boardWrap && ['🔥','😮','🐍'].includes(emoji)){ boardWrap.classList.add('shake'); setTimeout(()=>boardWrap.classList.remove('shake'),400); }
  const freqMap = {'👍':600,'🔥':300,'😂':750,'😮':450,'💪':500,'🎯':700,'🎉':880,'🐍':250,'⚡':950};
  beep(freqMap[emoji]||500,.18,'triangle',.2);
}
function launchConfetti(){
  const canvas = document.getElementById('confetti');
  canvas.width = innerWidth; canvas.height = innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#FF6F59','#F2B705','#2F7DE1','#3EA06B','#E5484D'];
  const parts = Array.from({length:130}, () => ({
    x: Math.random()*canvas.width, y: -20 - Math.random()*canvas.height*0.3,
    r: 4+Math.random()*5, c: colors[Math.floor(Math.random()*colors.length)],
    vy: 2+Math.random()*3, vx: -1.5+Math.random()*3, rot: Math.random()*360, vr: -6+Math.random()*12
  }));
  let frame = 0;
  function tick(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    parts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.c; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6);
      ctx.restore();
    });
    frame++;
    if(frame<170) requestAnimationFrame(tick); else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  tick();
}
window.addEventListener('resize', ()=>{ const c=document.getElementById('confetti'); if(c){c.width=innerWidth;c.height=innerHeight;} });

/* ===================== 6) الدردشة العابرة + سجل الدردشة ===================== */
const activeStrips = { p1:null, p2:null };
let lastMessageId = 0;
const seenMessageIds = new Set();
let chatHistory = []; // {role,name,content} — لعرضها في نافذة سجل الدردشة

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
async function sendMessage(roomCode, role, name, content){
  const trimmed = content.trim(); if(!trimmed) return null;
  const { data, error } = await sb.from('ludo_messages').insert({ room_code:roomCode, sender_role:role, sender_name:name, content:trimmed, sender_profile_id: myId }).select().single();
  return error ? null : data;
}
function showChatStrip(role, text, isIncoming){
  const panel = document.getElementById(role==='p1' ? 'panelP1' : 'panelP2');
  if(!panel) return;
  if(activeStrips[role]){ clearTimeout(activeStrips[role].timer); activeStrips[role].el.remove(); }
  const el = document.createElement('div');
  el.className = 'chat-strip';
  el.textContent = text.length>42 ? text.slice(0,42)+'…' : text;
  panel.appendChild(el);
  const timer = setTimeout(()=>{ el.classList.add('fading'); setTimeout(()=>el.remove(),400); activeStrips[role]=null; }, 4500);
  activeStrips[role] = { el, timer };
  if(isIncoming){ beep(900,.08,'sine',.15); setTimeout(()=>beep(1200,.08,'sine',.12),90); }
}
function clearAllChatStrips(){
  Object.keys(activeStrips).forEach(role=>{
    if(activeStrips[role]){ clearTimeout(activeStrips[role].timer); activeStrips[role].el.remove(); activeStrips[role]=null; }
  });
}
async function deleteRoomMessages(roomCode){ try{ await sb.from('ludo_messages').delete().eq('room_code', roomCode); }catch(e){} }

/* ====== تنظيف الجولة المنتهية: تُحذف بعد مهلة قصيرة تكفي لوصول الطرف الآخر/المشاهدين
   لحالة "انتهت" وتسجيل كل طرف لسجله الشخصي، بشرط ألا تكون قد أُعيد لعبها (إعادة الجولة) ====== */
function scheduleRoomCleanup(code, delayMs = 8000){
  setTimeout(()=> cleanupFinishedRoom(code), delayMs);
}
async function cleanupFinishedRoom(code){
  try{
    const { data: room } = await sb.from('ludo_rooms').select('status').eq('code', code).single();
    if(!room || room.status !== 'finished') return; // أُعيد لعبها أو محذوفة مسبقًا — لا تحذف
    await sb.from('ludo_messages').delete().eq('room_code', code);
    await sb.from('ludo_rooms').delete().eq('code', code);
  }catch(e){}
}

function renderChatSheetBody(){
  const body = document.getElementById('chatSheetBody');
  if(!body) return;
  body.innerHTML = chatHistory.length
    ? chatHistory.slice().reverse().map(m=>`<div><b>${escapeHtml(m.name||'')}:</b> ${escapeHtml(m.content)}</div>`).join('')
    : '<div class="empty">لا توجد رسائل بعد</div>';
}
function openChatSheet(){
  renderChatSheetBody();
  document.getElementById('chatSheetBg').classList.add('show');
}
function closeChatSheet(){
  document.getElementById('chatSheetBg').classList.remove('show');
}
async function loadChatHistory(code){
  chatHistory = [];
  seenMessageIds.clear(); lastMessageId = 0;
  try{
    const { data } = await sb.from('ludo_messages').select('*').eq('room_code', code).order('id', {ascending:true});
    (data||[]).forEach(m=>{
      chatHistory.push({role:m.sender_role, name:m.sender_name, content:m.content});
      seenMessageIds.add(m.id);
      if(m.id > lastMessageId) lastMessageId = m.id;
    });
  }catch(e){}
  renderChatSheetBody();
}



/* ===================== 5) المطابقة التلقائية (مشتركة الجدول مع الحية والسلم) ===================== */

/* ===================== 7) المطابقة التلقائية ===================== */
let mmRow = null, mmOpponentRowId = null, mmChannel = null, mmSearchTimer = null, mmAcceptTimer = null, mmHandlers = {};
function randCode(){ const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<6;i++) s+=c[Math.floor(Math.random()*c.length)]; return s; }

async function mmStartSearch(prof, cb){
  mmHandlers = cb || {};
  await mmStopInternal();
  const { data, error } = await sb.from('matchmaking_queue').insert({
    user_id: prof.id, username: prof.username, avatar_color: prof.avatar_color, avatar_data: prof.avatar_data, status:'waiting'
  }).select().single();
  if(error || !data){ mmHandlers.onCancelled?.('تعذّر الدخول لقائمة البحث'); return; }
  mmRow = data;
  mmChannel = sb.channel('mm-'+mmRow.id)
    .on('postgres_changes', { event:'*', schema:'public', table:'matchmaking_queue' }, (payload)=> mmHandleEvent(payload))
    .subscribe();
  mmSearchTimer = setTimeout(async ()=>{ if(mmRow && mmRow.status==='waiting'){ await mmStopInternal(); mmHandlers.onTimeout?.(); } }, 25000);
  await mmTryClaimOlder();
}
async function mmTryClaimOlder(){
  if(!mmRow) return;
  const { data: candidates } = await sb.from('matchmaking_queue').select('*').eq('status','waiting').lt('id', mmRow.id).order('id',{ascending:true}).limit(5);
  if(!candidates || candidates.length===0) return;
  for(const cand of candidates){
    const roomCode = randCode();
    // مطابقة صفّين ملكهما مختلفان تتطلب دالة آمنة على الخادم (mm_claim_match)
    // بعد أن أصبحت RLS تمنع تعديل أي عميل لصف لا يملكه.
    const { data: claimed, error } = await sb.rpc('mm_claim_match', { p_candidate_row_id: cand.id, p_room_code: roomCode });
    const row = Array.isArray(claimed) ? claimed[0] : claimed;
    if(!error && row){
      mmRow = { ...mmRow, status:'matched', matched_with:cand.user_id, room_code:roomCode };
      mmOpponentRowId = cand.id;
      mmHandlers.onFound?.({ opponent:{username:cand.username, avatar_color:cand.avatar_color, avatar_data:cand.avatar_data}, isInitiator:true, roomCode });
      mmArmAcceptWindow();
      return;
    }
    // فشلت (انتُزع المرشح للتو من طرف آخر) — جرّب المرشح التالي
  }
}
function mmHandleEvent(payload){
  if(!mmRow) return;
  const row = payload.new; if(!row) return;
  if(row.id===mmRow.id && row.status==='matched' && mmRow.status==='waiting'){
    mmRow = row; mmOpponentRowId = null;
    mmFetchOpponent(row.matched_with).then(opp=>{ mmHandlers.onFound?.({opponent:opp, isInitiator:false, roomCode:row.room_code}); mmArmAcceptWindow(); });
    return;
  }
  if(mmOpponentRowId && row.id===mmOpponentRowId) mmCheckBothAccepted(row);
  if(row.user_id===mmRow.matched_with && row.id!==mmRow.id){ mmOpponentRowId=row.id; mmCheckBothAccepted(row); }
  if((row.id===mmRow.id || row.id===mmOpponentRowId) && row.status==='cancelled'){ mmHandlers.onCancelled?.('ألغى الطرف الآخر المطابقة'); mmStopInternal(); }
}
async function mmFetchOpponent(userId){
  const { data } = await sb.from('profiles').select('username, avatar_color, avatar_data').eq('id', userId).maybeSingle();
  return data || { username:'خصم', avatar_color:'#2F7DE1', avatar_data:null };
}
function mmArmAcceptWindow(){
  clearTimeout(mmAcceptTimer);
  mmAcceptTimer = setTimeout(async ()=>{ if(mmRow && mmRow.status==='matched' && !mmRow.accepted) await mmRespond(false); }, 20000);
}
async function mmRespond(accept){
  if(!mmRow) return;
  if(!accept){
    await sb.rpc('mm_cancel_pair', { p_my_row_id: mmRow.id, p_opponent_row_id: mmOpponentRowId || null });
    mmHandlers.onCancelled?.('تم إلغاء المطابقة'); await mmStopInternal(); return;
  }
  const { data } = await sb.from('matchmaking_queue').update({accepted:true}).eq('id', mmRow.id).select().single();
  if(data) mmRow = data;
  if(mmOpponentRowId){ const { data: oppRow } = await sb.from('matchmaking_queue').select('*').eq('id', mmOpponentRowId).maybeSingle(); mmCheckBothAccepted(oppRow); }
}
async function mmCheckBothAccepted(opponentRow){
  if(!mmRow || !opponentRow) return;
  if(mmRow.accepted && opponentRow.accepted){
    clearTimeout(mmAcceptTimer);
    const opp = await mmFetchOpponent(opponentRow.user_id);
    const isInitiator = mmRow.matched_with===opponentRow.user_id && mmRow.id<opponentRow.id;
    mmHandlers.onBothAccepted?.({opponent:opp, isInitiator, roomCode:mmRow.room_code});
    try{ await sb.rpc('mm_delete_pair', { p_my_row_id: mmRow.id, p_opponent_row_id: mmOpponentRowId || null }); }catch(e){}
  }
}
async function mmCancelSearch(){ if(mmRow && mmRow.status==='waiting') await sb.from('matchmaking_queue').delete().eq('id', mmRow.id); await mmStopInternal(); }
async function mmStopInternal(){ clearTimeout(mmSearchTimer); clearTimeout(mmAcceptTimer); if(mmChannel){ sb.removeChannel(mmChannel); mmChannel=null; } mmRow=null; mmOpponentRowId=null; }


/* ===================== 6) المستوى/الخبرة/الإنجازات (add_xp نفسها بالضبط) ===================== */

/* ===================== 8أ) نظام المستويات — تتبع الجولة واحتساب الخبرة ===================== */
let myLadderClimbs = 0;         // غير مستخدم في لودو (لا سلالم) — يبقى 0 دومًا، الإنجاز المرتبط به (سيد السلالم) لن يتحقق هنا
let myDiceRolls = 0;            // عدد رميات النرد لي خلال هذه الجولة (لإنجاز "البطل الخاطف")
let myHadSnakeHit = false;      // غير مستخدم في لودو (لا حيّات) — يبقى false دومًا
let myBonusHits = 0;            // غير مستخدم في لودو — يبقى 0 دومًا
let xpAwardedRoundKey = readRoundFlag('ludo_xpAwardedRoundKey');   // يمنع احتساب XP أكثر من مرة لنفس الجولة (طبقة عرض إضافية فوق حارس الخادم)
/* ====== مفتاحا منع التكرار (XP محلي والسجل المحلي) — يُقرآن من sessionStorage عند بدء الصفحة
   ويُكتبان إليه عند كل استخدام، حتى لا يعيد تحديث الصفحة (F5) احتساب/تسجيل نفس نتيجة الجولة
   أكثر من مرة (كانا سابقًا متغيّرين بالذاكرة فقط فيُصفَّران عند كل تحميل صفحة). الحارس الحقيقي
   ضد التكرار أصبح أيضًا على الخادم (جدول round_xp_log داخل add_xp)، وهذا طبقة حماية إضافية
   تمنع تكرار عرض سطر السجل المحلي بصريًا. ====== */
function readRoundFlag(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
function writeRoundFlag(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} }
function resetRoundKeys(){
  xpAwardedRoundKey = null; historySavedRoundKey = null;
  try{ sessionStorage.removeItem('ludo_xpAwardedRoundKey'); sessionStorage.removeItem('ludo_historySavedRoundKey'); }catch(e){}
}
let historySavedRoundKey = readRoundFlag('ludo_historySavedRoundKey'); // يمنع تسجيل جولة السجل المحلي أكثر من مرة لنفس الجولة

function resetRoundXPTracking(){
  myLadderClimbs = 0;
  myDiceRolls = 0;
  myHadSnakeHit = false;
  myBonusHits = 0;
}

function levelTierClass(level){
  if(level>=20) return 'tier-platinum';
  if(level>=10) return 'tier-gold';
  if(level>=5)  return 'tier-silver';
  return 'tier-bronze';
}
function renderLevelBadge(el, level, compact){
  if(!el) return;
  const lvl = level || 1;
  el.textContent = compact ? String(lvl) : ('Lv.' + lvl);
  el.classList.remove('tier-bronze','tier-silver','tier-gold','tier-platinum');
  el.classList.add(levelTierClass(lvl));
}
/* ====== اللقب: آخر شارة فتحها اللاعب فعليًا (وليس الأعلى قيمة) — تُعرض كوسم صغير
   بجانب شارة المستوى. القيمة تصل جاهزة من add_xp (title_ar/title_icon)، فلا شيء
   يُحسب هنا على العميل. لا تؤثر على المستوى إطلاقًا، فقط "داعمة" له بصريًا. ====== */
function renderTitleBadge(el, titleAr, titleIcon){
  if(!el) return;
  if(!titleAr){ el.style.display='none'; el.textContent=''; return; }
  el.textContent = (titleIcon ? titleIcon + ' ' : '') + titleAr;
  el.style.display='inline-flex';
}
/* ====== عتبات المستوى مبنية على عدد الانتصارات الفعلي (تطابق صيغة add_xp في قاعدة البيانات):
   كل مستوى L يتطلب (3×L) فوزًا إضافيًا للانتقال للمستوى التالي — تصاعديًا. ====== */
function winThresholds(level){
  const lvl = level || 1;
  const floor = 3*(lvl-1)*lvl/2;
  const next  = 3*lvl*(lvl+1)/2;
  return { floor, next };
}
function renderXpBar(el, totalWins, level){
  if(!el) return;
  const { floor, next } = winThresholds(level);
  const pct = Math.max(0, Math.min(100, ((totalWins-floor)/(next-floor))*100));
  el.style.width = pct + '%';
}
function celebrateLevelUp(newLevel){
  const inGame = document.body.classList.contains('in-game');
  const anchor = inGame
    ? document.getElementById(session.role==='p1' ? 'panelP1' : 'panelP2')
    : document.getElementById('miniAvatar');
  if(anchor) burstReaction(anchor, '⚡');
  if(inGame) showTurnBubble(`🎉 وصلت للمستوى ${newLevel}!`);
  beep(900,.15,'triangle'); setTimeout(()=>beep(1200,.18,'triangle'),140);
}
/* ====== استدعاء دالة add_xp على الخادم — التحديث يحدث في قاعدة البيانات وليس في المتصفح،
   فيتجنب تضارب البيانات عند تحديث لاعبين لملفهما الشخصي في نفس اللحظة.
   تحتسب الدالة أيضًا الإنجازات (الشارات) وتُعيد أي شارة جديدة فُتحت هذه المرة. ====== */
async function awardGameXP(room, isWin, opponentId){
  if(!isConfigured || !localProfile) return;
  try{
    const { data, error } = await sb.rpc('add_xp', {
      p_user_id: myId,
      p_room_code: room.code,
      p_room_rev: room.rev,
      p_opponent_id: opponentId || null,
      p_ladder_climbs: myLadderClimbs,
      p_is_win: isWin,
      p_had_snake_hit: myHadSnakeHit,
      p_dice_rolls: myDiceRolls,
      p_bonus_hits: myBonusHits
    });
    if(error || !data || !data[0]) return;
    const r = data[0];
    localProfile.xp = r.new_xp;
    localProfile.level = r.new_level;
    localProfile.win_streak = r.new_win_streak;
    localProfile.total_wins = r.total_wins;
    localProfile.title_ar = r.title_ar;
    localProfile.title_icon = r.title_icon;
    if(profile){ profile.xp = r.new_xp; profile.level = r.new_level; profile.win_streak = r.new_win_streak; profile.total_wins = r.total_wins; profile.title_ar = r.title_ar; profile.title_icon = r.title_icon; }
    paintMiniUserbar();
    if(r.leveled_up) celebrateLevelUp(r.new_level);
    const unlocked = Array.isArray(r.unlocked) ? r.unlocked : [];
    if(unlocked.length) queueAchievementCelebrations(unlocked);
  }catch(e){}
}
/* ====== يُستدعى مرة واحدة فقط عند وصول حالة الجولة إلى "finished" (وليس عند كل renderRoom) ====== */
function maybeAwardGameXP(room){
  if(session.role!=='p1' && session.role!=='p2') return; // لا XP ولا إنجازات للمشاهد
  const key = room.code + '|' + room.rev;
  if(xpAwardedRoundKey === key) return; // احتُسبت مسبقًا لهذه الجولة (حماية العرض المحلي)
  xpAwardedRoundKey = key;
  writeRoundFlag('ludo_xpAwardedRoundKey', key);
  const opponentId = session.role==='p1' ? room.p2_user_id : room.p1_user_id;
  awardGameXP(room, room.winner === session.role, opponentId);
}

/* ===================== 8ج) نظام الإنجازات (الشارات) — احتفال متتالٍ عند فتح شارة/شارات ===================== */
/* ====== كتالوج الشارات محفوظ محليًا أيضًا كنسخة رجعة (Fallback) — يطابق تمامًا سطور
   INSERT في achievements_schema.sql. يُستخدم لعرض جدول "إنجازاتي" فورًا حتى قبل وصول
   استجابة قاعدة البيانات، أو في حال تعذّر الاتصال بها (مثلاً قبل تنفيذ ملف الـSQL). ====== */
const ACHIEVEMENTS_CATALOG = [
  { code:'social_5',     title_ar:'اجتماعي',       description_ar:'العب مع 5 لاعبين مختلفين',                    xp_reward:100, icon:'🤝', sort_order:10 },
  { code:'social_10',    title_ar:'صانع صداقات',   description_ar:'العب مع 10 لاعبين مختلفين',                   xp_reward:250, icon:'🌍', sort_order:11 },
  { code:'streak_3',     title_ar:'سلسلة النار',   description_ar:'حقّق 3 انتصارات متتالية',                     xp_reward:150, icon:'🔥', sort_order:20 },
  { code:'streak_5',     title_ar:'لا يُقهر',      description_ar:'حقّق 5 انتصارات متتالية',                     xp_reward:400, icon:'⚔️', sort_order:21 },
  { code:'games_25',     title_ar:'محارب مخضرم',   description_ar:'أكمل 25 جولة',                                 xp_reward:150, icon:'🎖️', sort_order:30 },
  { code:'games_100',    title_ar:'أسطورة اللعبة', description_ar:'أكمل 100 جولة',                                xp_reward:500, icon:'👑', sort_order:31 },
  { code:'ladders_20',   title_ar:'سيد السلالم',   description_ar:'اصعد 20 سلّمًا إجماليًا عبر كل جولاتك',        xp_reward:150, icon:'🪜', sort_order:40 },
  { code:'speed_win',    title_ar:'البطل الخاطف',  description_ar:'فُز بجولة خلال 8 رميات نرد أو أقل',            xp_reward:200, icon:'⚡', sort_order:50 },
  { code:'comeback_win', title_ar:'عودة أسطورية',  description_ar:'فُز بجولة بعد أن لدغتك حية فيها',              xp_reward:250, icon:'🐉', sort_order:51 },
  { code:'lucky_10',     title_ar:'نجم الحظ',      description_ar:'استخدم مربعات الحظ ⭐ 10 مرات إجماليًا',       xp_reward:100, icon:'⭐', sort_order:60 },
];

let achievementQueue = [];
let achievementShowing = false;
function queueAchievementCelebrations(list){
  achievementQueue.push(...list);
  if(!achievementShowing) showNextAchievementToast();
}
function showNextAchievementToast(){
  if(!achievementQueue.length){ achievementShowing = false; return; }
  achievementShowing = true;
  const ach = achievementQueue.shift();
  const el = document.getElementById('achievementToast');
  if(el){
    const iconEl = document.getElementById('achToastIcon');
    const titleEl = document.getElementById('achToastTitle');
    const xpEl = document.getElementById('achToastXp');
    if(iconEl) iconEl.textContent = ach.icon || '🏅';
    if(titleEl) titleEl.textContent = ach.title || 'إنجاز جديد';
    if(xpEl) xpEl.textContent = '+' + (ach.xp||0) + ' XP';
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }
  burstReaction(document.getElementById(session.role==='p1' ? 'panelP1' : (session.role==='p2' ? 'panelP2' : 'miniAvatar')) || document.body, '🏅');
  beep(950,.15,'triangle',.22); setTimeout(()=>beep(1250,.18,'triangle',.2),160);
  setTimeout(()=>{
    if(el) el.classList.remove('show');
    setTimeout(showNextAchievementToast, 400);
  }, 2700);
}

/* ====== خرائط "الشرط الحالي / الهدف" لكل شارة قابلة للقياس، مبنية على أعمدة profiles
   (unique_opponents_count, best_streak, total_games, ladder_climbs_total, bonus_hits_total).
   الشارات المرتبطة بحدث لحظي واحد (فوز خاطف/عودة أسطورية) لا تملك تقدمًا رقميًا ذا معنى،
   فتُعرض كـ"مقفلة/مفتوحة" فقط دون شريط تقدّم. ====== */
function computeAchievementProgress(code, stats){
  const s = stats || {};
  const table = {
    social_5:    { cur:s.unique_opponents_count||0, target:5 },
    social_10:   { cur:s.unique_opponents_count||0, target:10 },
    streak_3:    { cur:s.best_streak||0, target:3 },
    streak_5:    { cur:s.best_streak||0, target:5 },
    games_25:    { cur:s.total_games||0, target:25 },
    games_100:   { cur:s.total_games||0, target:100 },
    ladders_20:  { cur:s.ladder_climbs_total||0, target:20 },
    lucky_10:    { cur:s.bonus_hits_total||0, target:10 },
  };
  return table[code] || null;
}

/* ====== بطاقات "إنجازاتي" — كل شارة بطاقة مستقلة بشريط تقدّم، وتتحول لإطار أخضر
   وعلامة ✔ فور اكتمالها، بترتيب sort_order ====== */
function renderAchievementsCards(catalog, unlockedSet, stats){
  const body = document.getElementById('achievementsSheetBody');
  if(!body) return;
  const cards = [...catalog].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  body.innerHTML = `
    <div class="ach-grid">
      ${cards.map(a=>{
        const unlocked = unlockedSet.has(a.code);
        const prog = computeAchievementProgress(a.code, stats);
        let progressHtml;
        if(prog){
          const cur = Math.min(prog.cur, prog.target);
          const pct = Math.max(0, Math.min(100, (cur/prog.target)*100));
          progressHtml = `
            <div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
            <div class="ach-progress-text">${cur} / ${prog.target}</div>`;
        } else {
          progressHtml = `<div class="ach-progress-text">${unlocked ? '✔ تم تحقيقه' : '🔒 يتحقق بجولة واحدة'}</div>`;
        }
        return `<div class="ach-card ${unlocked?'unlocked':'locked'}">
          ${unlocked ? '<span class="ach-check">✔</span>' : ''}
          <div class="ach-card-icon">${unlocked ? a.icon : '🔒'}</div>
          <div class="ach-card-title">${escapeHtml(a.title_ar)}</div>
          <div class="ach-card-desc">${escapeHtml(a.description_ar)}</div>
          ${progressHtml}
          <div class="ach-card-xp">+${a.xp_reward} XP</div>
        </div>`;
      }).join('')}
    </div>`;
}

/* ====== نافذة "إنجازاتي" — تعرض البطاقات فورًا من الكتالوج المحلي (بلا انتظار، كلها مقفلة
   بلا تقدّم)، ثم تجلب حالة الفتح الحقيقية + إحصاءات اللاعب الحالية من قاعدة البيانات
   وتحدّث العرض بشريط تقدّم دقيق فور نجاح الاتصال ====== */
async function openAchievementsSheet(){
  document.getElementById('achievementsSheetBg').classList.add('show');
  // عرض فوري من الكتالوج المحلي — كل الشارات تظهر مقفلة إلى أن تصل بيانات الفتح والتقدّم الحقيقية
  renderAchievementsCards(ACHIEVEMENTS_CATALOG, new Set(), {});
  if(!isConfigured) return;
  try{
    const [allRes, mineRes, statsRes] = await Promise.all([
      sb.from('achievements').select('*').order('sort_order', {ascending:true}),
      sb.from('player_achievements').select('achievement_code').eq('user_id', myId),
      sb.from('profiles').select('unique_opponents_count, best_streak, total_games, ladder_climbs_total, bonus_hits_total').eq('id', myId).maybeSingle()
    ]);
    const catalog = (allRes.data && allRes.data.length) ? allRes.data : ACHIEVEMENTS_CATALOG;
    const unlockedSet = new Set((mineRes.data||[]).map(m=>m.achievement_code));
    renderAchievementsCards(catalog, unlockedSet, statsRes.data || {});
  }catch(e){
    // تعذّر الاتصال بقاعدة البيانات — العرض المحلي يبقى ظاهرًا بدل رسالة فارغة
  }
}
function closeAchievementsSheet(){ document.getElementById('achievementsSheetBg').classList.remove('show'); }
document.getElementById('btnAchievements').addEventListener('click', openAchievementsSheet);
document.getElementById('btnCloseAchievementsSheet').addEventListener('click', closeAchievementsSheet);
document.getElementById('achievementsSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='achievementsSheetBg') closeAchievementsSheet(); });

/* ===================== 8ب) قائمة المشاهدين الحاليين ===================== */
let spectatorNames = [];              // أسماء المشاهدين الحاليين للجولة
let knownSpectatorKeys = new Set();   // مفاتيح المشاهدين المعروفين مسبقًا (لتفادي إشعار مكرر)
let spectatorPresenceReady = false;   // يمنع إظهار إشعارات عند أول تحميل للحضور

let lastTurnKey = null;
let turnTimer = null, turnCountdownInterval = null;
const TURN_TIME_LIMIT = 15;
/* ====== الحارس الاحتياطي: أي متصفح متصل (خصم أو مشاهد) يراقب دور الطرف الآخر، ويرمي نيابةً عنه
   إذا لم يفعل خلال هذه المهلة الإضافية — يحل مشكلة تعليق الجولة حين يُغلق صاحب الدور صفحته فعليًا
   فلا يعود مؤقّته الشخصي (armTurnTimer) قادرًا على العمل من جهته إطلاقًا ====== */
const WATCHDOG_GRACE = 6; // ثوانٍ إضافية فوق مهلة الدور العادية قبل أن يتدخل متصفح آخر
let watchdogTimer = null, watchdogRevKey = null;
/* ====== إذا رمى لاعب النرد تلقائيًا (بلا ضغط يدوي) 6 مرات متتالية بينما خصمه يضغط بصورة طبيعية،
   تُعتبر الجولة متروكة وتُمنح تلقائيًا للخصم الحاضر ====== */
const AUTO_FORFEIT_STREAK = 6;
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function buildRoomLink(code){ const url=new URL(location.href); url.search=''; url.hash=''; url.searchParams.set('r',code); return url.toString(); }

/* ====== حفظ واستعادة الجلسة ====== */
function saveSession(){ if(session.code && session.role){ localStorage.setItem('ludo_session', JSON.stringify({code:session.code, role:session.role, ts:Date.now()})); } }
function loadSession(){ try{ const s = JSON.parse(localStorage.getItem('ludo_session')); if(s && Date.now()-s.ts < 1000*60*60*4){ return s; } }catch(e){} return null; }
function clearSession(){ localStorage.removeItem('ludo_session'); }



/* ===================== 7) لودو: اللوحة، الرموز، الحركة، إنشاء/الانضمام، الرمي ===================== */

/* ===================== 0ب) حالة الجولة العامة (كانت ساقطة سهوًا بين جزأين مُستخلصين من app.js الأصلي) ===================== */
const session = { code:null, role:null };
let currentRoom = null, realtimeChannel = null, presenceChannel = null, animating = false;
let actx; // سياق الصوت (AudioContext) المستخدم داخل دالة beep

/* ===================== لوحة لودو — الهندسة والرسم ===================== */
const LCELL = 40, LMARGIN = 6;
const YARD_ORIGIN = {RED:[0,0], BLUE:[0,9], GREEN:[9,0], ORANGE:[9,9]};
const COLOR_HEX = {RED:'#E5393E', BLUE:'#2F7DE1', GREEN:'#3FA34D', ORANGE:'#F2A81D'};
const PLAYABLE_COLORS = ['RED','ORANGE']; // لاعبان متقابلان الآن — قابلة للتوسعة لاحقًا لأربعة

function lCellXY([r,c]){ return [LMARGIN + c*LCELL + LCELL/2, LMARGIN + r*LCELL + LCELL/2]; }
function yardSlot(color, idx){
  const [r0,c0] = YARD_ORIGIN[color];
  const cx = r0+2.5, cy = c0+2.5;
  const offs = [[-0.9,-0.9],[-0.9,0.9],[0.9,-0.9],[0.9,0.9]];
  return [cx+offs[idx][0], cy+offs[idx][1]];
}
function tokenCellRC(color, step){
  if(step <= 0) return null;
  if(step <= 48){
    const entryIdx = LUDO_ENTRIES[color].entry_index; // موضع منطقي (0..47) بعد الاستبعاد
    const logical = (entryIdx - step + 1 + 480) % 48;
    return LUDO_RING[LUDO_LOGICAL_RING[logical]];
  }
  const homeArm = LUDO_ENTRIES[color].home_column;
  const cells = LUDO_HOMES[homeArm];
  const idx = Math.min(step - 49, cells.length - 1);
  return cells[idx];
}
function tokenXY(color, step, tokenIndex, finishSlot){
  if(step <= 0) return lCellXY(yardSlot(color, tokenIndex));
  if(step >= 54 && finishSlot != null){
    const [r,c] = tokenCellRC(color, step);
    const offs = [[-0.18,-0.18],[-0.18,0.18],[0.18,-0.18],[0.18,0.18]];
    const o = offs[finishSlot % 4];
    return lCellXY([r+o[0], c+o[1]]);
  }
  return lCellXY(tokenCellRC(color, step));
}
function initBoardUI(){
  document.getElementById('ludoBoardHost').innerHTML = LUDO_BOARD_SVG;
  buildFacePips(); // كانت هذه الاستدعاء ساقطة سهوًا — بدونها تدور مكعبات النرد بلا أي نقاط ظاهرة عليها إطلاقًا
}

/* ===================== الرموز — عناصر DOM دائمة (لا تُعاد بناؤها كل رسم) لضمان حركة سلسة ===================== */
const ludoRemoteAnimating = { p1:null, p2:null }; // null أو رقم فهرس العروسة قيد التحريك الآن
let pendingMovable = [];   // فهارس العرائس القابلة للتحريك بالفرة المختارة حاليًا فقط

/* ===================== قاعدة "3 فرات للستّة" مع اختيار حرّ للفرات =====================
   room.pending_dice: قائمة كل الفرات المتاحة الآن (مثال: [6,6,4])
   room.movable_map:  {"قيمة": [فهارس العرائس القابلة بها]} محسوبة من الخادم
   room.awaiting_move: true = يجب اختيار فرة وعروسة قبل أي رمي جديد
   selectedDiceValue: الفرة التي اختارها اللاعب حاليًا من الشريط ====== */
let selectedDiceValue = null;

function syncDiceQueueUI(room){
  const isMine = room && room.status==='playing' && room.turn===session.role;
  const queue = (isMine && Array.isArray(room.pending_dice)) ? room.pending_dice : [];
  const map = (isMine && room.movable_map) ? room.movable_map : {};

  if(!isMine || !room.awaiting_move || queue.length===0){
    selectedDiceValue = null; pendingMovable = [];
    removeDiceQueueBar();
    return;
  }

  // إن كانت كل الفرات المتبقية بنفس القيمة الوحيدة، لا داعي لشريط اختيار — كالسابق تمامًا
  const usableValues = Object.keys(map).map(Number);
  if(!usableValues.includes(selectedDiceValue)){
    selectedDiceValue = usableValues[0] ?? null;
  }
  pendingMovable = selectedDiceValue!=null ? (map[selectedDiceValue] || []) : [];

  if(queue.length===1 || new Set(queue).size===1){
    removeDiceQueueBar();
  } else {
    renderDiceQueueBar(queue, map);
  }
}

function removeDiceQueueBar(){
  document.getElementById('ludoDiceQueueBar')?.remove();
}

function renderDiceQueueBar(queue, map){
  let bar = document.getElementById('ludoDiceQueueBar');
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'ludoDiceQueueBar';
    bar.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:9999;display:flex;gap:8px;background:rgba(20,20,30,.85);padding:8px 10px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.35);';
    document.body.appendChild(bar);
  }
  bar.innerHTML = '';
  const label = document.createElement('div');
  label.textContent = 'اختر الفرة:';
  label.style.cssText = 'color:#fff;font-size:13px;align-self:center;margin-inline-end:4px;';
  bar.appendChild(label);
  queue.forEach(v=>{
    const usable = !!(map[v] && map[v].length);
    const chip = document.createElement('button');
    chip.textContent = v;
    chip.disabled = !usable;
    const selected = usable && v===selectedDiceValue;
    chip.style.cssText = `width:34px;height:34px;border-radius:50%;border:2px solid ${selected?'#ffd23f':'rgba(255,255,255,.35)'};background:${selected?'#ffd23f':'rgba(255,255,255,.12)'};color:${selected?'#222':'#fff'};font-weight:700;font-size:15px;opacity:${usable?1:.35};cursor:${usable?'pointer':'default'};`;
    if(usable){
      chip.onclick = ()=>{
        selectedDiceValue = v;
        pendingMovable = map[v] || [];
        renderDiceQueueBar(queue, map);
        if(currentRoom) renderTokens(currentRoom);
      };
    }
    bar.appendChild(chip);
  });
}

function tokenElId(role, idx){ return 'ltok_'+role+'_'+idx; }
/* ====== شكل العروسة الفعلية: حدّ أسود بارز + قاعدة بيضاوية كظلّ + رأس أكبر قليلًا من نقاط الزينة
   الثابتة داخل المنازل (تلك مجرّد دوائر مسطحة بلا حدّ غامق) — حتى تُميَّز العروسة القابلة للتحريك
   عن الزينة بوضوح. إن كان للاعب صورة شخصية (avatar_data) تُعرض كصورة دائرية داخل العروسة نفسها. ====== */
function tokenInnerSVG(color, avatarData, uid){
  if(avatarData){
    const clipId = 'lclip_'+uid;
    return `<g class="token-visual">
      <ellipse cx="0" cy="8" rx="7" ry="2.4" fill="rgba(0,0,0,.28)"/>
      <clipPath id="${clipId}"><circle r="10.5"/></clipPath>
      <circle r="12" fill="${COLOR_HEX[color]}" stroke="#1a1a1a" stroke-width="1.6"/>
      <image href="${avatarData}" x="-10.5" y="-10.5" width="21" height="21" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
      <circle r="10.5" fill="none" stroke="#fff" stroke-width="1.4"/>
    </g>`;
  }
  return `<g class="token-visual">
    <ellipse cx="0" cy="8" rx="7" ry="2.4" fill="rgba(0,0,0,.28)"/>
    <circle r="12" fill="${COLOR_HEX[color]}" stroke="#1a1a1a" stroke-width="1.6"/>
    <circle r="6" fill="#fff" opacity=".9"/>
    <circle r="3" fill="${COLOR_HEX[color]}"/>
  </g>`;
}
function ensureTokenEl(role, idx, color, avatarData){
  const layer = document.getElementById('ludoTokenLayer');
  let el = document.getElementById(tokenElId(role, idx));
  const sig = color + '|' + (avatarData ? 'img' : 'flat');
  if(!el){
    el = document.createElementNS('http://www.w3.org/2000/svg','g');
    el.setAttribute('id', tokenElId(role, idx));
    el.setAttribute('class','ludo-token');
    el.dataset.sig = sig;
    el.innerHTML = tokenInnerSVG(color, avatarData, role+'_'+idx);
    layer.appendChild(el);
  } else if(el.dataset.sig !== sig){
    // تغيّرت الصورة/اللون (مثلًا رفع صورة شخصية أثناء اللعب) — أعد بناء محتوى العروسة فقط
    el.dataset.sig = sig;
    el.innerHTML = tokenInnerSVG(color, avatarData, role+'_'+idx);
  }
  return el;
}
function placeTokenEl(role, idx, color, step, avatarData, finishSlot){
  const el = ensureTokenEl(role, idx, color, avatarData);
  const [x,y] = tokenXY(color, step, idx, finishSlot);
  el.setAttribute('transform', `translate(${x},${y})`);
  return el;
}

/* ====== يرسم كل الرموز حسب حالة الغرفة، عدا أي رمز قيد التحريك حاليًا محليًا (يتولاه animateTokenMovement) ====== */
function renderTokens(room, skip){
  const p1Color = room.p1_color || 'RED', p2Color = room.p2_color || 'ORANGE';
  const p1Tokens = room.p1_tokens || [0,0,0,0], p2Tokens = room.p2_tokens || [0,0,0,0];
  const isMyTurnMovable = (room.status==='playing' && room.turn===session.role && pendingMovable.length>0);

  [['p1',p1Color,p1Tokens,room.p1_avatar_data],['p2',p2Color,p2Tokens,room.p2_avatar_data]].forEach(([role,color,tokens,avatarData])=>{
    // ترتيب العرائس التي وصلت فعليًا (ليُصفَّف كل رمز بجانب الآخر بدل التراكب فوق بعضه في خلية الهدف نفسها)
    let finishedSoFar = 0;
    tokens.forEach((step, i)=>{
      if(skip && skip.role===role && skip.idx===i) return; // قيد التحريك حاليًا محليًا — لا تلمسه، الدالة المتحركة تتولاه
      const el = placeTokenEl(role, i, color, step, avatarData, step>=54 ? finishedSoFar : 0);
      if(step>=54){
        finishedSoFar++;
        el.classList.add('finished');
        el.onclick = null;
        return;
      }
      el.classList.remove('finished');
      const selectable = role===session.role && isMyTurnMovable && pendingMovable.includes(i);
      el.classList.toggle('selectable', selectable);
      el.onclick = selectable ? (()=> chooseToken(i)) : null;
    });
  });
}

/* ===================== الحركة المتزامنة — تُبث لحظيًا فيراها الخصم والمشاهدون يمشون لا يقفزون ===================== */
async function animateTokenMovement(role, color, tokenIndex, fromStep, toStep, avatarData){
  if(fromStep === toStep) return;
  const dir = toStep > fromStep ? 1 : -1;
  let cur = fromStep;
  while(cur !== toStep){
    cur += dir;
    placeTokenEl(role, tokenIndex, color, cur, avatarData);
    beep(360,.04,'sine',0.05);
    await sleep(110);
  }
}
function broadcastLudoMove(role, color, tokenIndex, fromStep, toStep){
  presenceChannel?.send({ type:'broadcast', event:'ludo_move', payload:{role, color, tokenIndex, fromStep, toStep} });
}
async function playRemoteLudoMove(payload){
  const { role, color, tokenIndex, fromStep, toStep } = payload;
  if(role === session.role) return; // صدى حركتي أنا نفسي
  const avatarData = currentRoom ? (role==='p1' ? currentRoom.p1_avatar_data : currentRoom.p2_avatar_data) : null;
  ludoRemoteAnimating[role] = tokenIndex;
  cancelPendingRender();
  try{
    await animateTokenMovement(role, color, tokenIndex, fromStep, toStep, avatarData);
  } finally {
    ludoRemoteAnimating[role] = null;
    if(currentRoom) renderRoom(currentRoom, {skipTokens:true});
  }
}
function tokensSummaryText(tokens){
  const t = tokens || [0,0,0,0];
  const home = t.filter(s=>s>0 && s<54).length;
  const done = t.filter(s=>s>=54).length;
  return `🏠${4-home-done} 🎯${home} 🏁${done}`;
}

/* ===================== إنشاء/الانضمام لغرفة لودو ===================== */
async function createRoom(explicitCode){
  let code=explicitCode, ok=false, attempts=0;
  while(!ok && attempts<5){
    if(!code || attempts>0) code = randCode();
    const { error } = await sb.from('ludo_rooms').insert({
      code, status:'waiting', turn:'p1',
      p1_user_id:myId, p1_name:profile.username, p1_avatar_color:profile.avatar_color, p1_avatar_data:profile.avatar_data,
      p1_level: profile.level || 1, p1_title_ar: profile.title_ar || null, p1_title_icon: profile.title_icon || null,
      p1_color: PLAYABLE_COLORS[0], p2_color: PLAYABLE_COLORS[1],
      p1_tokens:[0,0,0,0], p2_tokens:[0,0,0,0], log:[], rev:0
    });
    if(!error) ok=true; attempts++;
  }
  if(!ok) return { error:'تعذّر إنشاء الجولة' };
  session.code=code; session.role='p1';
  saveSession();
  resetRoundXPTracking(); resetRoundKeys();
  subscribeToRoom(code); subscribeToPresence(code);
  const { data: room } = await sb.from('ludo_rooms').select('*').eq('code', code).single();
  return { code, room };
}

async function joinRoomByCode(code){
  const { data: room, error } = await sb.from('ludo_rooms').select('*').eq('code', code).single();
  if(error || !room) return { error:'لم يتم العثور على جولة بهذا الرمز' };

  if(room.p1_user_id === myId){
    session.code=code; session.role='p1'; saveSession();
    resetRoundXPTracking(); resetRoundKeys();
    subscribeToRoom(code); subscribeToPresence(code);
    return { room };
  }
  if(room.p2_user_id === myId){
    session.code=code; session.role='p2'; saveSession();
    resetRoundXPTracking(); resetRoundKeys();
    subscribeToRoom(code); subscribeToPresence(code);
    return { room };
  }
  if(room.p2_name){
    session.code=code; session.role='spectator'; saveSession();
    subscribeToRoom(code); subscribeToPresence(code);
    return { room };
  }

  const { data: saved, error: err2 } = await sb.from('ludo_rooms').update({
    p2_user_id:myId, p2_name:profile.username, p2_avatar_color:profile.avatar_color, p2_avatar_data:profile.avatar_data,
    p2_level: profile.level || 1, p2_title_ar: profile.title_ar || null, p2_title_icon: profile.title_icon || null,
    status:'playing'
  }).eq('code', code).is('p2_user_id', null).select().single();
  if(err2 || !saved){
    const { data: latest } = await sb.from('ludo_rooms').select('*').eq('code', code).single();
    if(latest && latest.p2_name){
      session.code=code; session.role='spectator'; saveSession();
      subscribeToRoom(code); subscribeToPresence(code);
      return { room: latest };
    }
    return { error:'تعذّر الانضمام، جرّب مرة أخرى' };
  }
  session.code=code; session.role='p2';
  saveSession();
  resetRoundXPTracking(); resetRoundKeys();
  subscribeToRoom(code); subscribeToPresence(code);
  return { room: saved };
}

async function rematch(){
  if(!currentRoom) return;
  if(session.role!=='p1' && session.role!=='p2') return;
  const fresh = {
    status:'playing', turn:'p1', winner:null, pending_dice:[], movable_map:{}, awaiting_move:false, consecutive_sixes:0, p1_dice:1, p2_dice:1,
    p1_tokens:[0,0,0,0], p2_tokens:[0,0,0,0],
    log:[`🔁 جولة جديدة بنفس الفريقين: ${currentRoom.p1_name} ضد ${currentRoom.p2_name}`],
    rev:(currentRoom.rev||0)+1, p1_auto_streak:0, p2_auto_streak:0
  };
  const { data } = await sb.from('ludo_rooms').update(fresh).eq('code', session.code).select().single();
  if(data){ resetRoundXPTracking(); resetRoundKeys(); renderRoom(data); }
}

/* ===================== الرمي واختيار العروسة ===================== */
async function rollDice(forRole, isAuto=false){
  if(animating) return;
  const actingRole = forRole || session.role;
  if(actingRole!=='p1' && actingRole!=='p2') return;
  if(!isAuto && session.role!==actingRole) return;
  if(!currentRoom || currentRoom.status!=='playing' || currentRoom.turn!==actingRole) return;
  if(currentRoom.awaiting_move) return; // هناك فرات جاهزة بانتظار اختيار عروسة — لا يجوز الرمي الآن
  const isSelf = actingRole===session.role;
  const expectedRev = currentRoom.rev;

  clearTurnTimer(); clearWatchdogTimer();
  animating = true;
  if(isSelf){
    document.getElementById(actingRole==='p1'?'btnRollP1':'btnRollP2').disabled = true;
  }
  broadcastDiceRoll(actingRole);

  const { data, error } = await sb.rpc('ludo_roll_dice', {
    p_code: session.code, p_role: actingRole, p_expected_rev: expectedRev, p_is_auto: !!isAuto
  });
  const result = Array.isArray(data) ? data[0] : data;

  if(error || !result){
    const { data: refreshed } = await sb.from('ludo_rooms').select('*').eq('code', session.code).single();
    if(refreshed) renderRoom(refreshed);
    animating = false;
    if(refreshed) syncTurnControls(refreshed);
    return;
  }
  if(result.no_op){
    renderRoom(result.out_room); animating = false; syncTurnControls(result.out_room); return;
  }

  const room = result.out_room;
  const value = result.dice_value;

  if(isSelf) myDiceRolls++;
  if(isSelf){
    showDiceOverlay();
    const shuffle = setInterval(()=>{ const rv=1+Math.floor(Math.random()*6); showDiceValue(actingRole, rv, true); setDiceOverlayValue(rv); }, 90);
    await sleep(600); clearInterval(shuffle);
    showDiceValue(actingRole, value, false); setDiceOverlayValue(value); beep(520,.1,'square');
    setTimeout(hideDiceOverlay, 500);
  } else {
    playRemoteDiceShuffle(actingRole);
    await sleep(600);
    playRemoteDiceResult(actingRole, value);
  }
  broadcastDiceResult(actingRole, value);

  if(result.forfeited){
    renderRoom(room); bumpGlobalCounter(); scheduleRoomCleanup(session.code);
    animating = false; syncTurnControls(room); return;
  }

  if(result.roll_again){
    // ظهر 6: وُضع جانبًا، وعلى نفس اللاعب أن يضغط "ارمِ النرد" مرة أخرى (حتى 3 مرات إجمالًا)
    animating = false;
    renderRoom(room);
    if(isSelf){
      const btn = document.getElementById(actingRole==='p1'?'btnRollP1':'btnRollP2');
      if(btn) btn.disabled = false;
    }
    syncTurnControls(room);
    return;
  }

  animating = false;
  renderRoom(room); // syncDiceQueueUI (داخل renderRoom) تُجهّز pendingMovable وشريط اختيار الفرات إن تعدّدت

  if(result.auto_passed || pendingMovable.length===0) return;

  const distinctValues = Object.keys(room.movable_map||{}).length;
  if(!isSelf){
    // رمية تلقائية نيابة عن لاعب غائب — لا يوجد إنسان ليختار، فنختار أول فرة وأول عروسة متاحة فورًا
    await chooseToken(pendingMovable[0]);
  } else if(distinctValues===1 && pendingMovable.length===1){
    // فرة واحدة وعروسة واحدة ممكنة بها فقط — لا داعي لأي اختيار، تمامًا كما كان الوضع سابقًا
    await chooseToken(pendingMovable[0]);
  } else {
    // أكثر من خيار (أكثر من فرة، أو أكثر من عروسة): العرائس النابضة + شريط الفرات هما واجهة
    // الاختيار، لكن نمنح 10 ثوانٍ فقط قبل اختيار افتراضي حتى لا تتجمّد الجولة إن تردّد اللاعب
    armTokenChoiceTimer();
  }
}
let tokenChoiceTimer = null;
function clearTokenChoiceTimer(){ clearTimeout(tokenChoiceTimer); tokenChoiceTimer = null; }
function armTokenChoiceTimer(){
  clearTokenChoiceTimer();
  tokenChoiceTimer = setTimeout(()=>{
    tokenChoiceTimer = null;
    if(!animating && pendingMovable.length>0) chooseToken(pendingMovable[0]);
  }, 10000);
}

/* ====== تنفيذ حركة عروسة واحدة بالفرة المختارة حاليًا (selectedDiceValue). إن تبقّت فرات
   أخرى بعد هذه الحركة يُعاد استدعاء نفس الآلية تلقائيًا (كالسابق) لاختيار الفرة/العروسة التالية،
   فيمكن للاعب توزيع فرات عدّة (مثلًا 6 و6 و4) على أكثر من عروسة بحرّية كاملة. ====== */
async function chooseToken(tokenIndex){
  clearTokenChoiceTimer();
  const diceValue = selectedDiceValue;
  pendingMovable = [];
  removeDiceQueueBar();
  if(!currentRoom || diceValue==null) return;
  const actingRole = currentRoom.turn;
  const isSelf = actingRole === session.role;
  const myColor = actingRole==='p1' ? currentRoom.p1_color : currentRoom.p2_color;
  animating = true;

  const { data, error } = await sb.rpc('ludo_move_token', {
    p_code: session.code, p_role: actingRole, p_expected_rev: currentRoom.rev,
    p_token_index: tokenIndex, p_dice_value: diceValue
  });
  const result = Array.isArray(data) ? data[0] : data;
  if(error || !result || result.no_op){ animating = false; renderRoom(currentRoom); return; }

  const room = result.out_room;
  if(isSelf){
    if(result.captured) myBonusHits++; // نُعيد استخدام هذا العدّاد لعدّ الأكلات (لا معنى مخصّصًا له في لودو غير هذا)
  }
  const myAvatarData = actingRole==='p1' ? currentRoom.p1_avatar_data : currentRoom.p2_avatar_data;
  broadcastLudoMove(actingRole, myColor, tokenIndex, result.old_step, result.new_step);
  await animateTokenMovement(actingRole, myColor, tokenIndex, result.old_step, result.new_step, myAvatarData);
  if(result.captured) beep(220,.2,'sawtooth');
  if(result.reached_goal) beep(700,.15,'triangle');

  animating = false;
  if(room.status==='finished') bumpGlobalCounter();
  renderRoom(room, {skipTokens:true});
  renderTokens(room); // العروسة وصلت مسبقًا لموضعها النهائي عبر الحركة أعلاه — إعادة الرسم هنا آمنة
                       // والهدف تحديث حالة "قابل للتحريك" على بقية العرائس بحسب الفرة/الخيارات التالية
  if(room.status==='finished') scheduleRoomCleanup(session.code);
  syncTurnControls(room);

  // إن تبقّت فرات أخرى صالحة لنفس اللاعب، تابع فورًا لاختيار فرة/عروسة أخرى
  if(room.status==='playing' && room.turn===actingRole && room.awaiting_move && pendingMovable.length){
    const distinctValues = Object.keys(room.movable_map||{}).length;
    if(!isSelf){
      await chooseToken(pendingMovable[0]);
    } else if(distinctValues===1 && pendingMovable.length===1){
      await chooseToken(pendingMovable[0]);
    } else {
      armTokenChoiceTimer();
    }
  }
}

// ملاحظة: معالجات نقر btnRollP1/btnRollP2 مُعرَّفة أصلًا لاحقًا (مُستخلصة من نهاية app.js الأصلي) — لا تُكرَّر هنا


/* ===================== 8) أزرار الدور والمؤقّتات ===================== */

function syncTurnControls(room, isSpectatorArg){
  const isSpectator = isSpectatorArg !== undefined ? isSpectatorArg : (session.role === 'spectator');
  const rollP1 = document.getElementById('btnRollP1');
  const rollP2 = document.getElementById('btnRollP2');
  const labelP1El = document.getElementById('oppLabelP1');
  const labelP2El = document.getElementById('oppLabelP2');

  if(isSpectator){
    rollP1.style.display='none'; rollP2.style.display='none';
    labelP1El.style.display='block'; labelP2El.style.display='block';
  } else {
    const myRollBtn = session.role==='p1' ? rollP1 : rollP2;
    const oppRollBtn = session.role==='p1' ? rollP2 : rollP1;
    const myLabel = session.role==='p1' ? labelP1El : labelP2El;
    const oppLabel = session.role==='p1' ? labelP2El : labelP1El;
    myRollBtn.style.display='inline-flex'; oppRollBtn.style.display='none';
    myLabel.style.display='none'; oppLabel.style.display='block';
    myRollBtn.disabled = !(room.status==='playing' && room.turn===session.role) || animating || !!room.awaiting_move;
  }

  if(!isSpectator && room.status==='playing' && room.turn===session.role && !animating){
    if(!turnTimer) armTurnTimer();
  } else {
    clearTurnTimer();
  }

  if(room.status==='playing' && room.turn!==session.role && !animating){
    armWatchdogTimer(room);
  } else {
    clearWatchdogTimer();
  }
}


/* ===================== 9) رسم حالة الغرفة كاملة ===================== */

function renderRoom(room, opts={}){
  currentRoom = room;
  hideOfflineSpinner(); // وصول تحديث فعلي يعني أن الاتصال عاد، مهما كانت حالة حدث 'online' نفسه
  const isSpectator = session.role === 'spectator';
  document.body.classList.toggle('is-spectator', isSpectator);

  const linkInput = document.getElementById('tbLinkInput');
  if(linkInput && room.code){
    linkInput.value = buildRoomLink(room.code);
  }

  document.getElementById('nameP1').textContent = room.p1_name || '—';
  document.getElementById('posP1').textContent = tokensSummaryText(room.p1_tokens);
  document.getElementById('nameP2').textContent = room.p2_name || 'بانتظار لاعب…';
  document.getElementById('posP2').textContent = tokensSummaryText(room.p2_tokens);

  applyAvatarVisual(document.getElementById('avatarP1'), room.p1_avatar_color, room.p1_avatar_data, room.p1_name?room.p1_name[0]:'?');
  applyAvatarVisual(document.getElementById('avatarP2'), room.p2_avatar_color, room.p2_avatar_data, room.p2_name?room.p2_name[0]:'?');
  renderLevelBadge(document.getElementById('levelBadgeP1'), room.p1_level, true);
  renderLevelBadge(document.getElementById('levelBadgeP2'), room.p2_level, true);
  renderLevelBadge(document.getElementById('nameLevelP1'), room.p1_level, false);
  renderLevelBadge(document.getElementById('nameLevelP2'), room.p2_level, false);
  renderTitleBadge(document.getElementById('nameTitleP1'), room.p1_title_ar, room.p1_title_icon);
  renderTitleBadge(document.getElementById('nameTitleP2'), room.p2_title_ar, room.p2_title_icon);

  document.getElementById('panelP1').classList.toggle('active-turn', room.turn==='p1' && room.status==='playing');
  document.getElementById('panelP2').classList.toggle('active-turn', room.turn==='p2' && room.status==='playing');
  document.getElementById('roleTagP1').textContent = session.role==='p1' ? 'أنت' : (isSpectator ? 'لاعب 1' : 'الخصم');
  document.getElementById('roleTagP2').textContent = session.role==='p2' ? 'أنت' : (isSpectator ? 'لاعب 2' : 'الخصم');
  document.getElementById('editBadgeP1').style.display = session.role==='p1' ? 'flex':'none';
  document.getElementById('editBadgeP2').style.display = session.role==='p2' ? 'flex':'none';
  document.getElementById('panelP1').classList.toggle('me', session.role==='p1');
  document.getElementById('panelP1').classList.toggle('opponent', session.role!=='p1');
  document.getElementById('panelP2').classList.toggle('me', session.role==='p2');
  document.getElementById('panelP2').classList.toggle('opponent', session.role!=='p2');

  syncDiceQueueUI(room); // يُجهّز pendingMovable/selectedDiceValue وشريط اختيار الفرات (إن تعدّدت) قبل رسم العرائس

  /* لا نلمس أي رمز قيد التحريك محليًا الآن (رميتي أنا، أو حركة بثّها الطرف الآخر) */
  if(!opts.skipTokens){
    renderTokens(room, ludoRemoteAnimating.p1!=null ? {role:'p1', idx:ludoRemoteAnimating.p1} : (ludoRemoteAnimating.p2!=null ? {role:'p2', idx:ludoRemoteAnimating.p2} : null));
  }

  const banner = document.getElementById('turnBanner');
  let bannerText = '';
  if(room.status==='waiting'){
    bannerText = '⏳ بانتظار انضمام اللاعب الثاني…';
  } else if(room.status==='finished'){
    const winnerName = room.winner==='p1' ? room.p1_name : room.p2_name;
    bannerText = '🏁 انتهت الجولة — الفائز: ' + winnerName;
  } else {
    const turnName = room.turn==='p1' ? room.p1_name : room.p2_name;
    if(isSpectator){
      bannerText = '👀 دور ' + turnName + '…';
    } else {
      const isMyTurn = room.turn===session.role;
      bannerText = isMyTurn ? '🎲 دورك أنت الآن!' : ('⏱ دور ' + turnName + '…');
    }
  }
  banner.textContent = bannerText;
  const turnKey = room.status+'|'+room.turn+'|'+(room.winner||'');
  if(turnKey !== lastTurnKey){
    lastTurnKey = turnKey;
    showTurnBubble(bannerText);
  }

  syncTurnControls(room, isSpectator);


  showDiceValue('p1', room.p1_dice||1, false);
  showDiceValue('p2', room.p2_dice||1, false);

  renderPerPlayerLogs(room);

  // إخفاء إمكانية إرسال الدردشة للمشاهدين (يبقى بإمكانهم متابعة السجل)
  const chatInputEl = document.getElementById('chatInput');
  const sendBtnEl = document.getElementById('btnSendChat');
  if(chatInputEl) chatInputEl.style.display = isSpectator ? 'none' : '';
  if(sendBtnEl) sendBtnEl.style.display = isSpectator ? 'none' : '';

  if(room.status==='finished'){
    openWinModal(room);
    maybeAwardGameXP(room);
  }
}

/* ====== توزيع أحداث السجل (صعود/نزول/رمي) على بطاقة كل لاعب حسب اسمه ====== */


/* ===================== 10) سجلّات كل لاعب + المساعدة ===================== */

function renderPerPlayerLogs(room){
  const boxP1 = document.getElementById('logBoxP1');
  const boxP2 = document.getElementById('logBoxP2');
  if(!boxP1 || !boxP2) return;
  const log = room.log || [];
  const p1Name = room.p1_name || '';
  const p2Name = room.p2_name || '';
  const p1Lines = [], p2Lines = [];
  log.forEach(line=>{
    if(p1Name && line.includes(p1Name)) p1Lines.push(line);
    else if(p2Name && line.includes(p2Name)) p2Lines.push(line);
  });
  boxP1.innerHTML = p1Lines.length
    ? p1Lines.slice(-6).reverse().map(l=>`<div>${l}</div>`).join('')
    : '<div class="empty">لا أحداث بعد</div>';
  boxP2.innerHTML = p2Lines.length
    ? p2Lines.slice(-6).reverse().map(l=>`<div>${l}</div>`).join('')
    : '<div class="empty">لا أحداث بعد</div>';

  fullPlayerLogs.p1 = p1Lines; fullPlayerLogs.p2 = p2Lines;
  fullPlayerNames.p1 = p1Name || 'اللاعب الأول'; fullPlayerNames.p2 = p2Name || 'اللاعب الثاني';
  if(openEventsRole) renderEventsSheetBody(openEventsRole);
}

/* ====== سلايد أحداث اللاعب — تصميم الهاتف فقط (يفتح بدل زر القلم) ====== */
const fullPlayerLogs = { p1:[], p2:[] };
const fullPlayerNames = { p1:'', p2:'' };
let openEventsRole = null;
function renderEventsSheetBody(role){
  const lines = fullPlayerLogs[role] || [];
  document.getElementById('eventsSheetBody').innerHTML = lines.length
    ? lines.slice().reverse().map(l=>`<div>${l}</div>`).join('')
    : '<div class="empty">لا أحداث بعد</div>';
}
function openEventsSheet(role){
  openEventsRole = role;
  document.getElementById('eventsSheetTitle').textContent = '📜 أحداث ' + (fullPlayerNames[role] || '');
  renderEventsSheetBody(role);
  document.getElementById('eventsSheetBg').classList.add('show');
}
function closeEventsSheet(){
  openEventsRole = null;
  document.getElementById('eventsSheetBg').classList.remove('show');
}
document.getElementById('logBadgeP1').addEventListener('click', ()=> openEventsSheet('p1'));
document.getElementById('logBadgeP2').addEventListener('click', ()=> openEventsSheet('p2'));
document.getElementById('btnCloseEventsSheet').addEventListener('click', closeEventsSheet);
document.getElementById('eventsSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='eventsSheetBg') closeEventsSheet(); });

/* ====== نافذة سجل الدردشة (بنفس تصميم نافذة أحداث اللاعب) ====== */
document.getElementById('btnChatHistory').addEventListener('click', openChatSheet);
document.getElementById('btnCloseChatSheet').addEventListener('click', closeChatSheet);
document.getElementById('chatSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='chatSheetBg') closeChatSheet(); });

/* ====== شارة عدد المشاهدين + نافذة قائمتهم ====== */
function renderSpectatorBadge(){
  const countEl = document.getElementById('spectatorCount');
  if(!countEl) return;
  const n = spectatorNames.length;
  countEl.textContent = n;
  countEl.style.display = n>0 ? 'flex' : 'none';
  if(document.getElementById('spectatorsSheetBg')?.classList.contains('show')) renderSpectatorsSheetBody();
}
function renderSpectatorsSheetBody(){
  const body = document.getElementById('spectatorsSheetBody');
  if(!body) return;
  body.innerHTML = spectatorNames.length
    ? spectatorNames.map(n=>`<div>👀 ${escapeHtml(n)}</div>`).join('')
    : '<div class="empty">لا يوجد مشاهدون حاليًا</div>';
}
function openSpectatorsSheet(){ renderSpectatorsSheetBody(); document.getElementById('spectatorsSheetBg').classList.add('show'); }
function closeSpectatorsSheet(){ document.getElementById('spectatorsSheetBg').classList.remove('show'); }
document.getElementById('btnSpectators').addEventListener('click', openSpectatorsSheet);
document.getElementById('btnCloseSpectatorsSheet').addEventListener('click', closeSpectatorsSheet);
document.getElementById('spectatorsSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='spectatorsSheetBg') closeSpectatorsSheet(); });

/* ====== إشعار عابر أعلى الشاشة عند دخول مشاهد جديد ====== */
let spectatorToastTimer = null;
function showSpectatorToast(text){
  const el = document.getElementById('spectatorToast');
  if(!el) return;
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(spectatorToastTimer);
  spectatorToastTimer = setTimeout(()=> el.classList.remove('show'), 2600);
  beep(900,.08,'sine',.12);
}

/* ====== نافذة المساعدة (بنفس تصميم نافذة الأحداث/الدردشة بدل alert) ====== */
const HELP_LINES = [
  '🎲 كل لاعب يرمي نرده الخاص بجانبه بدوره (نرد عشوائي 100% مثل لودو).',
  '🎲 احصل على 6 لإخراج عروسة من البيت.',
  '⭐ مربع الحظ: يمنحك رمية إضافية فورًا.',
  '🕳️ مربع الحفرة: يلغي رميتك الأخيرة ويعيدك لمكانك السابق.',
  '🍀 إن وقفت على عروسة خصم بمربع غير آمن، تعود لبيتها.',
  '⭐ المربعات المميّزة (والمربع الأول عند كل بيت) آمنة لجميع اللاعبين.',
  'يجب الوصول للمربع 100 بالضبط للفوز.',
  '⭐ شارة مستواك تظهر بجانب اسمك، وتكسب خبرة (XP) عند إكمال كل جولة أو الفوز — مشتركة مع لعبة الحية والسلم.',
  '🏅 افتح "إنجازاتي" من الشاشة الرئيسية لرؤية شارات مميزة (اللعب مع لاعبين مختلفين، سلاسل انتصارات، فوز خاطف، وغيرها) — كل شارة تمنحك خبرة إضافية دائمة.',
  'استخدم الإيموجي في بطاقتك للتفاعل مع خصمك لحظيًا.',
  'أنشئ رابط دعوة أو استخدم البحث التلقائي لإيجاد خصم من أي مكان في العالم!',
  'إن كانت الجولة مكتملة عند فتح رابط الدعوة، ستدخل تلقائيًا كمشاهد.',
  '👀 يظهر عدد المشاهدين بجانب هذا الزر — اضغط عليه لرؤية أسمائهم.',
  'إن كانت لديك جولة مفتوحة وفتحت رابط جولة أخرى، سنسألك إن كنت تريد العودة لجولتك أو إنهاءها والانتقال.'
];
function openHelpSheet(){
  document.getElementById('helpSheetBody').innerHTML = HELP_LINES.map(l=>`<div>${l}</div>`).join('');
  document.getElementById('helpSheetBg').classList.add('show');
}
function closeHelpSheet(){ document.getElementById('helpSheetBg').classList.remove('show'); }
document.getElementById('btnCloseHelpSheet').addEventListener('click', closeHelpSheet);
document.getElementById('helpSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='helpSheetBg') closeHelpSheet(); });

/* ====== مؤقّت الدور: رمي تلقائي إذا لم يرمِ اللاعب خلال 15 ثانية ====== */
function clearTurnTimer(){
  clearTimeout(turnTimer); turnTimer = null;
  clearInterval(turnCountdownInterval); turnCountdownInterval = null;
  if(session.role==='p1' || session.role==='p2'){
    const btn = document.getElementById(session.role==='p1' ? 'btnRollP1':'btnRollP2');
    if(btn && !btn.disabled) btn.textContent = 'ارمِ النرد';
  }
}
function armTurnTimer(){
  clearTurnTimer();
  let remaining = TURN_TIME_LIMIT;
  const btn = document.getElementById(session.role==='p1' ? 'btnRollP1':'btnRollP2');
  if(btn) btn.textContent = `ارمِ النرد (${remaining})`;
  turnCountdownInterval = setInterval(()=>{
    remaining--;
    if(btn) btn.textContent = remaining>0 ? `ارمِ النرد (${remaining})` : 'ارمِ النرد';
    if(remaining<=0) clearInterval(turnCountdownInterval);
  }, 1000);
  turnTimer = setTimeout(()=>{
    turnTimer = null;
    if(!animating && currentRoom && currentRoom.status==='playing' && currentRoom.turn===session.role){
      rollDice(session.role, true); // رمية تلقائية بسبب انتهاء وقت الدور — تُحتسب ضمن سلسلة الرمي التلقائي
    }
  }, TURN_TIME_LIMIT*1000);
}

/* ====== الحارس الاحتياطي (watchdog): يعمل في كل متصفح متصل ليس دوره الآن (خصم أو مشاهد)،
   ويرمي النرد نيابةً عن صاحب الدور تلقائيًا إن لم يفعل حتى بعد مهلة إضافية — فيبقي الجولة تعمل
   حتى إن حذف صاحب الدور صفحته فعليًا ولم يعد مؤقّته الشخصي (armTurnTimer) موجودًا إطلاقًا ====== */
function clearWatchdogTimer(){
  clearTimeout(watchdogTimer); watchdogTimer = null; watchdogRevKey = null;
}
function armWatchdogTimer(room){
  const key = room.code + '|' + room.rev + '|' + room.turn;
  if(watchdogRevKey === key) return; // مضبوط بالفعل لهذا الدور بعينه، لا داعٍ لإعادة الضبط عند كل تحديث عرض
  clearWatchdogTimer();
  watchdogRevKey = key;
  const turnRole = room.turn, expectedRev = room.rev;
  watchdogTimer = setTimeout(async ()=>{
    watchdogTimer = null;
    const { data: fresh } = await sb.from('ludo_rooms').select('*').eq('code', session.code).single();
    if(fresh && fresh.status==='playing' && fresh.turn===turnRole && fresh.rev===expectedRev){
      await rollDice(turnRole, true);
    }
  }, (TURN_TIME_LIMIT + WATCHDOG_GRACE) * 1000);
}



/* ===================== 11) نافذة الفوز + السجل المحلي ===================== */

function openWinModal(room){
  const modal = document.getElementById('winModal');
  if(modal.style.display==='flex') return;
  const isSpectator = session.role === 'spectator';
  const isMe = room.winner===session.role;
  const winnerName = room.winner==='p1' ? room.p1_name : room.p2_name;
  document.getElementById('winTitle').textContent = isMe ? '🎉 أنت الفائز!' : ('فاز ' + winnerName);
  document.getElementById('winText').textContent = 'أوصل عرائسه الأربع إلى البيت أولًا في هذه الجولة.';
  document.getElementById('btnRematch').style.display = isSpectator ? 'none' : 'inline-flex';
  modal.style.display='flex';
  launchConfetti();
  beep(880,.2,'triangle'); setTimeout(()=>beep(1100,.25,'triangle'),150);

  if(!isSpectator){
    const oppName = session.role==='p1' ? room.p2_name : room.p1_name;
    const roundKey = room.code + '|' + room.rev;
    if(historySavedRoundKey !== roundKey){
      historySavedRoundKey = roundKey;
      writeRoundFlag('ludo_historySavedRoundKey', roundKey);
      saveHistoryEntry({
        date: new Date().toLocaleString('ar', {dateStyle:'medium', timeStyle:'short'}),
        opponent: oppName || 'خصم',
        result: isMe ? 'win' : 'lose'
      });
    }
  }
}

/* ===================== جدول الجولات المحفوظ محليًا لكل لاعب ===================== */
function loadHistory(){
  try{ return JSON.parse(localStorage.getItem('ludo_history')||'[]'); }catch(e){ return []; }
}
function saveHistoryEntry(entry){
  const hist = loadHistory();
  hist.unshift(entry);
  localStorage.setItem('ludo_history', JSON.stringify(hist.slice(0,50)));
  renderHistoryTable();
}
function renderHistoryTable(){
  const box = document.getElementById('historyTable');
  if(!box) return;
  const hist = loadHistory();
  if(!hist.length){ box.innerHTML = '<p class="hint" style="margin:0;">لا توجد جولات سابقة بعد</p>'; return; }
  box.innerHTML = hist.slice(0,15).map(h=>`
    <div class="history-row ${h.result==='win'?'win':'lose'}">
      <span class="h-date">${h.date}</span>
      <span class="h-opp">${h.opponent}</span>
      <span class="h-status">${h.result==='win' ? '🏆 فوز' : '❌ خسارة'}</span>
    </div>`).join('');
}


/* ===================== 12) سهم انقطاع الإنترنت ===================== */

function showOfflineSpinner(){
  ['rollSpinnerP1','rollSpinnerP2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.add('show'); });
}
function hideOfflineSpinner(){
  ['rollSpinnerP1','rollSpinnerP2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.remove('show'); });
}
if(!navigator.onLine) showOfflineSpinner();
window.addEventListener('offline', showOfflineSpinner);



/* ===================== 13) العدّاد العالمي + التفاعلات + الدردشة اللحظية ===================== */

async function bumpGlobalCounter(){
  try{ await sb.rpc('bump_global_games_played'); }catch(e){}
}
async function loadGlobalCounter(){
  try{ const { data } = await sb.from('global_stats').select('games_played').eq('id',1).single();
    if(data) document.getElementById('globalCounter').textContent = '🌍 جولات لُعبت حول العالم: ' + data.games_played;
  }catch(e){}
  renderHistoryTable();
}
function fireReaction(role, emoji){
  const anchor = document.getElementById(role==='p1' ? 'panelP1' : 'panelP2');
  burstReaction(anchor, emoji);
}
function broadcastReaction(emoji){ presenceChannel?.send({ type:'broadcast', event:'react', payload:{emoji, from:session.role} }); }
async function sendChatMessage(text){
  if(session.role!=='p1' && session.role!=='p2') return; // المشاهد لا يرسل رسائل
  const name = session.role==='p1' ? currentRoom.p1_name : currentRoom.p2_name;
  const saved = await sendMessage(session.code, session.role, name, text);
  if(saved){
    seenMessageIds.add(saved.id);
    if(saved.id > lastMessageId) lastMessageId = saved.id;
    chatHistory.push({role:session.role, name, content:text});
    if(document.getElementById('chatSheetBg').classList.contains('show')) renderChatSheetBody();
    showChatStrip(session.role, text, false);
  } else {
    chatHistory.push({role:session.role, name, content:text});
    if(document.getElementById('chatSheetBg').classList.contains('show')) renderChatSheetBody();
    showChatStrip(session.role, text, false);
  }
}
function handleIncomingMessage(msg){
  if(!msg || (msg.id!=null && seenMessageIds.has(msg.id))) return;
  if(msg.id!=null){ seenMessageIds.add(msg.id); if(msg.id > lastMessageId) lastMessageId = msg.id; }
  chatHistory.push({role:msg.sender_role, name:msg.sender_name, content:msg.content});
  if(document.getElementById('chatSheetBg').classList.contains('show')) renderChatSheetBody();
  showChatStrip(msg.sender_role, msg.content, msg.sender_role!==session.role);
}
/* شبكة أمان: استطلاع دوري للرسائل الفائتة في حال ضاع حدث البث اللحظي */
async function pollMissedMessages(){
  if(!session.code) return;
  try{
    const { data } = await sb.from('ludo_messages').select('*').eq('room_code', session.code).gt('id', lastMessageId).order('id', {ascending:true}).limit(20);
    (data||[]).forEach(handleIncomingMessage);
  }catch(e){}
}

/* ====== دمج آمن لحمولة التحديث اللحظي ====== */
/* ====== حاجز تأجيل قصير لتحديثات قاعدة البيانات اللحظية: عندما يصل تحديث "إصدار" (rev) جديد
   عبر postgres_changes قبل وصول بثّ حركة الرمز (move_plan) الموافق له للطرف الآخر (سباق توقيت
   طبيعي بين قناتين منفصلتين)، كنا نرسم الرمز فورًا في مكانه النهائي مباشرة، ثم عندما يصل البثّ
   لاحقًا يُعيد playRemoteMovePlan تشغيل نفس الحركة من البداية (من الموضع القديم) فوق الرمز الذي
   استقرّ بالفعل — فيظهر وكأنه "يطفر لمكانه ثم يعود إليه درجة درجة". الحل: نمنح البثّ مهلة قصيرة
   (350ms) ليبدأ الحركة أولًا (فتتولى renderRoom تجاهل قفز الرمز بفضل remoteAnimating كالمعتاد)،
   وإن لم يصل خلالها (رسالة بث مفقودة/شبكة بطيئة) نعرض الحالة النهائية مباشرة بدل تجميد اللعبة. ====== */
let pendingRoomToRender = null;
let pendingRenderTimer = null;


/* ===================== 14) حاجز التأجيل ضد سباقات العرض ===================== */

function cancelPendingRender(){
  if(pendingRenderTimer){ clearTimeout(pendingRenderTimer); pendingRenderTimer = null; }
  pendingRoomToRender = null;
}
function scheduleDeferredRender(room){
  pendingRoomToRender = room;
  clearTimeout(pendingRenderTimer);
  pendingRenderTimer = setTimeout(()=>{
    pendingRenderTimer = null;
    if(pendingRoomToRender){ const r=pendingRoomToRender; pendingRoomToRender=null; renderRoom(r); }
  }, 350);
}

function mergeRoomPayload(incoming, prev){
  if(!prev) return incoming;
  const merged = { ...incoming };
  ['p1_name','p2_name','p1_avatar_color','p2_avatar_color','p1_avatar_data','p2_avatar_data'].forEach(key=>{
    if((merged[key]===undefined || merged[key]===null) && prev[key]){ merged[key] = prev[key]; }
  });
  return merged;
}

/* ====== اشتراك محسّن مع polling fallback ====== */

function subscribeToRoom(code){
  if(realtimeChannel) sb.removeChannel(realtimeChannel);
  realtimeChannel = sb.channel('ludo-room-changes-'+code)
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'ludo_rooms', filter:`code=eq.${code}` }, (payload)=>{
      const room = mergeRoomPayload(payload.new, currentRoom);
      const isNewMove = currentRoom && room.rev !== currentRoom.rev;
      const anyRemoteAnimating = ludoRemoteAnimating.p1 || ludoRemoteAnimating.p2;
      if(animating || anyRemoteAnimating){
        // حركة جارية بالفعل (رمّينا نحن، أو حركة الطرف الآخر قيد التشغيل بالفعل) — لا نتدخّل الآن
        currentRoom = room;
      } else if(isNewMove && room.status==='playing'){
        // إصدار جديد ولم تبدأ أي حركة له بعد — قد يكون بثّ move_plan في طريقه، نمهله فرصة قصيرة أولًا
        currentRoom = room;
        scheduleDeferredRender(room);
      } else {
        cancelPendingRender();
        renderRoom(room);
      }
    })
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'ludo_messages', filter:`room_code=eq.${code}` }, (payload)=> handleIncomingMessage(payload.new))
    .subscribe((status)=>{ setRtStatus(status==='SUBSCRIBED'); });

  if(window._roomPoll) clearInterval(window._roomPoll);
  window._roomPoll = setInterval(async ()=>{
    if(!session.code) return;
    try{
      const { data:room } = await sb.from('ludo_rooms').select('*').eq('code', session.code).single();
      if(room && !animating && !ludoRemoteAnimating.p1 && !ludoRemoteAnimating.p2 && (!currentRoom || currentRoom.rev !== room.rev || currentRoom.status !== room.status)){
        renderRoom(room);
      }
    }catch(e){}
    pollMissedMessages();
  }, 3000);
}

/* ====== إعادة الاتصال تلقائيًا عند عودة التبويب/الجهاز للنشاط ====== */
async function refreshRoomNow(){
  if(!session.code) return;
  try{
    const { data:room } = await sb.from('ludo_rooms').select('*').eq('code', session.code).single();
    if(room && !animating && !ludoRemoteAnimating.p1 && !ludoRemoteAnimating.p2) renderRoom(room);
  }catch(e){}
  pollMissedMessages();
}
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='visible' && session.code){
    subscribeToRoom(session.code);
    subscribeToPresence(session.code);
    refreshRoomNow();
  }
});
window.addEventListener('online', ()=>{
  hideOfflineSpinner();
  if(session.code){
    subscribeToRoom(session.code);
    subscribeToPresence(session.code);
    refreshRoomNow();
  }
});

/* ====== اشتراك الحضور اللحظي: يتتبّع اللاعبين المتصلين ويكتشف دخول/خروج المشاهدين لعرض
   عددهم وأسمائهم، ويُصدر إشعارًا عابرًا فور دخول مشاهد جديد بعد أول تحميل للحالة ====== */


/* ===================== 15) الحضور اللحظي + المغادرة ===================== */

function subscribeToPresence(code){
  if(presenceChannel) sb.removeChannel(presenceChannel);
  const presenceKey = session.role==='spectator' ? ('spectator-'+myId) : session.role;
  knownSpectatorKeys = new Set(); spectatorPresenceReady = false; spectatorNames = [];
  presenceChannel = sb.channel('ludo-presence-'+code, { config:{ presence:{ key: presenceKey } } });
  presenceChannel
    .on('presence', {event:'sync'}, ()=>{
      const state = presenceChannel.presenceState();
      // إصلاح: liveP1/liveP2 قد يكونا قد أُزيلا من الـ DOM عبر applyAvatarVisual (el.textContent='')
      // لأنهما ابنان لعنصر الأفاتار — لذلك يجب التحقق من وجودهما قبل الوصول لـ .style،
      // وإلا يتوقف تنفيذ هذا المعالج بالكامل بخطأ TypeError قبل الوصول لحساب المشاهدين أدناه.
      const liveP1El = document.getElementById('liveP1');
      const liveP2El = document.getElementById('liveP2');
      if(liveP1El) liveP1El.style.display = state['p1'] ? 'block':'none';
      if(liveP2El) liveP2El.style.display = state['p2'] ? 'block':'none';

      const spectatorEntries = Object.entries(state).filter(([key])=> key.startsWith('spectator-'));
      const currentKeys = new Set(spectatorEntries.map(([k])=>k));

      // إشعار فوري بأي مشاهد جديد ينضم بعد أول تحميل للحضور (لتفادي إشعارات وهمية عند أول اتصال)
      if(spectatorPresenceReady){
        spectatorEntries.forEach(([key, presences])=>{
          if(!knownSpectatorKeys.has(key) && key !== presenceKey){
            const name = presences?.[0]?.name || 'زائر';
            showSpectatorToast(`👀 ${name} يشاهد الآن`);
          }
        });
      }
      knownSpectatorKeys = currentKeys;
      spectatorPresenceReady = true;

      spectatorNames = spectatorEntries.map(([,presences])=> presences?.[0]?.name || 'زائر');
      renderSpectatorBadge();
    })
    .on('broadcast', {event:'react'}, ({payload})=> fireReaction(payload.from, payload.emoji))
    .on('broadcast', {event:'dice_roll'}, ({payload})=> playRemoteDiceShuffle(payload.role))
    .on('broadcast', {event:'dice_result'}, ({payload})=> playRemoteDiceResult(payload.role, payload.value))
    .on('broadcast', {event:'ludo_move'}, ({payload})=> playRemoteLudoMove(payload))
    .subscribe(async (status)=>{ if(status==='SUBSCRIBED') await presenceChannel.track({role:session.role, name:localProfile?.username||'', at:Date.now()}); });
}

function leaveRoom(){
  if(window._roomPoll) clearInterval(window._roomPoll);
  if(realtimeChannel){ sb.removeChannel(realtimeChannel); realtimeChannel=null; }
  if(presenceChannel){ sb.removeChannel(presenceChannel); presenceChannel=null; }
  clearAllChatStrips();
  clearTurnTimer();
  clearWatchdogTimer();
  clearInterval(remoteShuffleTimers.p1); clearInterval(remoteShuffleTimers.p2);
  clearTimeout(remoteShuffleSafety.p1); clearTimeout(remoteShuffleSafety.p2);
  remoteShuffleTimers.p1 = null; remoteShuffleTimers.p2 = null;
  remoteShuffleSafety.p1 = null; remoteShuffleSafety.p2 = null;
  ludoRemoteAnimating.p1 = false; ludoRemoteAnimating.p2 = false;
  cancelPendingRender();
  session.code=null; session.role=null; currentRoom=null;
  lastMessageId = 0; seenMessageIds.clear(); lastTurnKey = null;
  chatHistory = [];
  spectatorNames = []; knownSpectatorKeys = new Set(); spectatorPresenceReady = false;
  resetRoundXPTracking(); resetRoundKeys();
  renderSpectatorBadge();
  document.body.classList.remove('is-spectator');
  clearSession();
}

/* ===================== 9) ربط الواجهة والإقلاع ===================== */


/* ===================== 16) الشاشات، الإقلاع، تعديل الملف الشخصي، المطابقة السريعة ===================== */

/* ===================== 9) ربط الواجهة والإقلاع ===================== */
function setDbStatus(ok){ document.getElementById('dbDot').classList.toggle('off', !ok); }
function setRtStatus(ok){ document.getElementById('rtSeg').style.display='flex'; document.getElementById('rtDot').classList.toggle('off', !ok); }

function showScreen(name){
  ['onboarding','home','matching','game'].forEach(s=>{
    const el = document.getElementById('screen-'+s);
    if(el) el.style.display = (s===name) ? (s==='game' ? 'flex':'block') : 'none';
  });
  document.querySelector('.mini-userbar').style.display = (name!=='onboarding' && name!=='game') ? 'flex':'none';
  document.getElementById('composerBottom').style.display = (name==='game') ? 'flex':'none';
  document.body.classList.toggle('in-game', name==='game');
}

function resetToHome(){
  leaveRoom();
  document.getElementById('winModal').style.display='none';
  showScreen('home');
  loadGlobalCounter();
  if(history.replaceState) history.replaceState({}, '', location.pathname);
}

function enterGameScreen(room){ showScreen('game'); renderRoom(room); }

/* ====== نافذة "جولة منتهية/محذوفة" — تظهر عند فتح رابط لجولة لم تعد موجودة ====== */
function showRoomEndedModal(){
  showScreen('home'); loadGlobalCounter();
  document.getElementById('roomEndedModal').style.display='flex';
}
document.getElementById('btnRoomEndedHome').addEventListener('click', ()=>{
  document.getElementById('roomEndedModal').style.display='none';
  resetToHome();
});

/* ====== استعادة جلسة محفوظة (لاعب أو مشاهد) لغرفة معيّنة؛ عند الفشل يمكن تمرير رابط بديل للمتابعة إليه ====== */
async function resumeSavedSession(code, fallbackLinkCode){
  try{
    const { data:room } = await sb.from('ludo_rooms').select('*').eq('code', code).single();
    const isP1 = room && room.p1_user_id === myId;
    const isP2 = room && room.p2_user_id === myId;
    const savedInfo = loadSession();
    if(room && room.status !== 'finished' && (isP1 || isP2 || (savedInfo && savedInfo.role==='spectator'))){
      session.code = code;
      session.role = isP1 ? 'p1' : (isP2 ? 'p2' : 'spectator');
      saveSession();
      if(session.role==='p1' || session.role==='p2'){ resetRoundXPTracking(); resetRoundKeys(); }
      subscribeToRoom(code);
      subscribeToPresence(code);
      await loadChatHistory(code);
      enterGameScreen(room);
      return true;
    }
  }catch(e){}
  clearSession();
  if(fallbackLinkCode){
    const { room, error } = await joinRoomByCode(fallbackLinkCode);
    if(error){ showRoomEndedModal(); return false; }
    await loadChatHistory(fallbackLinkCode);
    enterGameScreen(room);
    return false;
  }
  resetToHome();
  return false;
}

/* ====== نافذة تعارض الجولات: لدى المستخدم جولة محفوظة ويحاول فتح رابط جولة أخرى ====== */
function presentRoomConflict(myCode, newCode){
  showScreen('home'); loadGlobalCounter();
  const modal = document.getElementById('switchRoomModal');
  modal.style.display = 'flex';
  document.getElementById('btnGoToMyRoom').onclick = async ()=>{
    modal.style.display='none';
    if(history.replaceState) history.replaceState({}, '', location.pathname);
    pendingLinkCode = null;
    await resumeSavedSession(myCode);
  };
  document.getElementById('btnEndAndSwitch').onclick = async ()=>{
    modal.style.display='none';
    await endCurrentSessionAsLeave(myCode);
    clearSession();
    const { room, error } = await joinRoomByCode(newCode);
    if(history.replaceState) history.replaceState({}, '', location.pathname);
    if(error){ showRoomEndedModal(); return; }
    await loadChatHistory(newCode);
    enterGameScreen(room);
  };
}

let localProfile = null, pendingLinkCode = null, onboardingPhotoDataUrl = null, editPhotoDataUrl = null, selectedColor = null, matchCountdownTimer = null;

function paintMiniUserbar(){
  document.getElementById('miniUsername').textContent = localProfile.username;
  applyAvatarVisual(document.getElementById('miniAvatar'), localProfile.avatar_color, localProfile.avatar_data, localProfile.username[0]);
  renderLevelBadge(document.getElementById('miniLevelBadge'), localProfile.level, false);
  renderTitleBadge(document.getElementById('miniTitleBadge'), localProfile.title_ar, localProfile.title_icon);
  renderXpBar(document.getElementById('miniXpFill'), localProfile.total_wins||0, localProfile.level||1);
}

/* ====== مستمعي أحداث التفاعلات في البطاقات ====== */
let reactionButtonsInitialized = false;
function initReactionButtons(){
  if(reactionButtonsInitialized) return;
  reactionButtonsInitialized = true;
  document.querySelectorAll('.side-reactions button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const emoji = btn.dataset.e;
      const panelId = btn.closest('.side-panel').id;
      const role = panelId === 'panelP1' ? 'p1' : 'p2';
      fireReaction(role, emoji);
      if(role === session.role) broadcastReaction(emoji);
    });
  });
}

/* ====== Onboarding ====== */
document.getElementById('obPhotoInput').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  onboardingPhotoDataUrl = await compressImageToDataUrl(file);
  const prev = document.getElementById('obAvatarPreview');
  prev.style.backgroundImage = `url(${onboardingPhotoDataUrl})`; prev.textContent='';
});
document.getElementById('btnObSave').addEventListener('click', async ()=>{
  const name = document.getElementById('obName').value.trim();
  const err = document.getElementById('obError'); err.style.display='none';
  if(!name){ err.textContent='الرجاء إدخال اسمك'; err.style.display='block'; return; }
  const { data, error } = await createProfile(name, onboardingPhotoDataUrl);
  if(error){ err.textContent='تعذّر حفظ الملف الشخصي، حاول مرة أخرى'; err.style.display='block'; return; }
  localProfile = data; paintMiniUserbar(); afterProfileReady();
});

/* ====== تعديل الملف الشخصي ====== */
function openEditProfile(){
  editPhotoDataUrl = localProfile.avatar_data || null;
  document.getElementById('editName').value = localProfile.username;
  const prev = document.getElementById('editAvatarPreview');
  applyAvatarVisual(prev, localProfile.avatar_color, localProfile.avatar_data, localProfile.username[0]);
  renderPalette(localProfile.avatar_color);
  document.getElementById('editSound').checked = localProfile.sound_on !== false;
  document.getElementById('editError').style.display='none';
  document.getElementById('editModal').style.display='flex';
}
document.getElementById('miniAvatar').parentElement.addEventListener('click', openEditProfile);
document.getElementById('editBadgeP1').addEventListener('click', ()=>{ if(session.role==='p1') openEditProfile(); });
document.getElementById('editBadgeP2').addEventListener('click', ()=>{ if(session.role==='p2') openEditProfile(); });

document.getElementById('editPhotoInput').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  editPhotoDataUrl = await compressImageToDataUrl(file);
  const prev = document.getElementById('editAvatarPreview');
  prev.style.backgroundImage = `url(${editPhotoDataUrl})`; prev.textContent='';
});
function renderPalette(current){
  selectedColor = current;
  const box = document.getElementById('editPalette');
  box.innerHTML = AVATAR_COLORS.map(c=>`<div class="sw ${c===current?'sel':''}" data-c="${c}" style="background:${c};"></div>`).join('');
  box.querySelectorAll('.sw').forEach(sw=>{
    sw.addEventListener('click', ()=>{
      box.querySelectorAll('.sw').forEach(x=>x.classList.remove('sel'));
      sw.classList.add('sel'); selectedColor = sw.dataset.c;
      if(!editPhotoDataUrl){ applyAvatarVisual(document.getElementById('editAvatarPreview'), selectedColor, null, localProfile.username[0]); }
    });
  });
}
document.getElementById('btnRemovePhoto').addEventListener('click', ()=>{
  editPhotoDataUrl = null;
  applyAvatarVisual(document.getElementById('editAvatarPreview'), selectedColor, null, localProfile.username[0]);
});
document.getElementById('btnCloseEdit').addEventListener('click', ()=>{ document.getElementById('editModal').style.display='none'; });
document.getElementById('btnSaveEdit').addEventListener('click', async ()=>{
  const name = document.getElementById('editName').value.trim();
  const soundChecked = document.getElementById('editSound').checked;
  const err = document.getElementById('editError'); err.style.display='none';
  if(!name){ err.textContent='اسم المستخدم مطلوب'; err.style.display='block'; return; }
  const { data, error } = await updateProfile({ username:name, avatar_color:selectedColor, avatar_data:editPhotoDataUrl, sound_on:soundChecked });
  if(error){ err.textContent='تعذّر الحفظ'; err.style.display='block'; return; }
  localProfile = data; soundOn = data.sound_on!==false;
  paintMiniUserbar();
  if(currentRoom) renderRoom(currentRoom, {skipTokens:true});
  document.getElementById('editModal').style.display='none';
});

/* ====== التنقل بين التبويبات ====== */
document.querySelectorAll('[data-tab]').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    ['create','join','quick'].forEach(k=> document.getElementById('pane-'+k).style.display = (t.dataset.tab===k)?'block':'none');
  });
});

/* ====== إنشاء جولة ====== */
document.getElementById('btnCreate').addEventListener('click', async ()=>{
  const { code, room, error } = await createRoom();
  if(error){ alert(error); return; }
  await loadChatHistory(code);
  enterGameScreen(room);
});

/* ====== الانضمام لجولة ====== */
document.getElementById('btnJoin').addEventListener('click', async ()=>{
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  const errBox = document.getElementById('joinError'); errBox.style.display='none';
  if(!code){ errBox.textContent='الرجاء إدخال رمز الجولة أو فتح رابط الدعوة'; errBox.style.display='block'; return; }
  const { room, error } = await joinRoomByCode(code);
  if(error){ errBox.textContent=error; errBox.style.display='block'; return; }
  await loadChatHistory(code);
  enterGameScreen(room);
});

/* ====== نسخ الرابط من الشريط العلوي ====== */
document.getElementById('btnTbCopy').addEventListener('click', ()=>{
  const input = document.getElementById('tbLinkInput');
  const link = input.value;
  if(!link || link==='رابط الدعوة…') return;
  navigator.clipboard?.writeText(link).then(()=>{
    const btn = document.getElementById('btnTbCopy');
    const old = btn.textContent;
    btn.textContent = '✅ تم';
    btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent = old; btn.classList.remove('copied'); }, 1600);
  });
});

/* ====== البحث التلقائي ====== */
document.getElementById('btnQuickMatch').addEventListener('click', ()=>{
  showScreen('matching');
  document.getElementById('matchSearching').style.display='block';
  document.getElementById('matchFound').style.display='none';
  mmStartSearch(localProfile, {
    onFound: showMatchFound,
    onBothAccepted: onQuickMatchAccepted,
    onCancelled: (reason)=>{ alert(reason); resetToHome(); },
    onTimeout: ()=>{ alert('لم يتم العثور على لاعب متاح حاليًا، حاول مرة أخرى بعد قليل'); resetToHome(); }
  });
});
document.getElementById('btnCancelMatch').addEventListener('click', async ()=>{ await mmCancelSearch(); resetToHome(); });
function showMatchFound(info){
  document.getElementById('matchSearching').style.display='none';
  document.getElementById('matchFound').style.display='block';
  document.getElementById('matchOppName').textContent = info.opponent.username;
  applyAvatarVisual(document.getElementById('matchOppAvatar'), info.opponent.avatar_color, info.opponent.avatar_data, info.opponent.username[0]);
  applyAvatarVisual(document.getElementById('matchMeAvatar'), localProfile.avatar_color, localProfile.avatar_data, localProfile.username[0]);
  let secondsLeft = 20;
  const timerEl = document.getElementById('matchTimer');
  timerEl.textContent = `⏱ ${secondsLeft} ثانية للموافقة`;
  clearInterval(matchCountdownTimer);
  matchCountdownTimer = setInterval(()=>{ secondsLeft--; timerEl.textContent=`⏱ ${secondsLeft} ثانية للموافقة`; if(secondsLeft<=0) clearInterval(matchCountdownTimer); }, 1000);
  document.getElementById('btnAcceptMatch').disabled = false;
  document.getElementById('btnAcceptMatch').textContent = '✅ موافق، ابدأ اللعب';
}
document.getElementById('btnAcceptMatch').addEventListener('click', ()=>{
  document.getElementById('btnAcceptMatch').disabled = true;
  document.getElementById('btnAcceptMatch').textContent = '⏳ بانتظار موافقة الطرف الآخر…';
  mmRespond(true);
});
document.getElementById('btnDeclineMatch').addEventListener('click', async ()=>{ clearInterval(matchCountdownTimer); await mmRespond(false); });
async function onQuickMatchAccepted(info){
  clearInterval(matchCountdownTimer);
  if(info.isInitiator){
    const { code, room } = await createRoom(info.roomCode);
    await loadChatHistory(code);
    enterGameScreen(room);
  } else {
    const { room, error } = await joinRoomByCode(info.roomCode);
    if(!error){ await loadChatHistory(info.roomCode); enterGameScreen(room); }
  }
}

/* ====== أزرار اللعب ====== */
document.getElementById('btnRollP1').addEventListener('click', ()=>{ if(session.role==='p1') rollDice('p1', false); });
document.getElementById('btnRollP2').addEventListener('click', ()=>{ if(session.role==='p2') rollDice('p2', false); });
document.getElementById('btnPlayAgain').addEventListener('click', ()=>{ document.getElementById('winModal').style.display='none'; resetToHome(); });
document.getElementById('btnRematch').addEventListener('click', ()=>{ document.getElementById('winModal').style.display='none'; rematch(); });
document.getElementById('btnLeave').addEventListener('click', async ()=>{
  const isSpectator = session.role === 'spectator';
  const msg = isSpectator ? 'هل تريد الخروج من وضع المشاهدة؟' : 'هل تريد مغادرة الجولة؟ ستُحتسب خسارة لك في سجلك.';
  if(!confirm(msg)) return;
  if(!isSpectator) await handleLeaveAsLoss();
  resetToHome();
});
/* ====== مغادرة بزر الخروج أثناء جولة نشطة = خسارة تُسجَّل محليًا، وفوز فوري للخصم
   (لا XP يُمنح للمغادر: leaveRoom تُستدعى عبر resetToHome فورًا بعد هذا، فلا يصل المتصفح
   المحلي إلى حالة "finished" عبر renderRoom إطلاقًا، وبالتالي لا يُستدعى maybeAwardGameXP) ====== */
async function handleLeaveAsLoss(){
  if(session.role!=='p1' && session.role!=='p2') return;
  if(session.code && currentRoom && currentRoom.status==='playing' && session.role){
    const oppName = session.role==='p1' ? currentRoom.p2_name : currentRoom.p1_name;
    // لا نشترط أي رقم rev هنا (خلافًا للرمي العادي) — المغادرة يجب أن تنجح دومًا حتى لو تغيّرت
    // حالة الغرفة للتو (كأن يرمي الخصم النرد في نفس اللحظة)، وإلا تُسجَّل خسارة محليًا للمغادر
    // دون أن تصل حالة "انتهت الجولة" لجهاز الخصم إطلاقًا، فلا يظهر له أي إشعار فوز.
    try{
      await sb.rpc('ludo_leave_as_loss', { p_code: session.code, p_role: session.role });
    }catch(e){}
    saveHistoryEntry({
      date: new Date().toLocaleString('ar', {dateStyle:'medium', timeStyle:'short'}),
      opponent: oppName || 'خصم',
      result: 'lose'
    });
    scheduleRoomCleanup(session.code);
  }
}

/* ====== إنهاء جولة أخرى محفوظة (غير المعروضة حاليًا) عند اختيار "إنهاء والمتابعة"
   في نافذة تعارض الجولات — يُحتسب خسارة إن كانت قيد اللعب، أو تُحذف مباشرة إن كانت بانتظار لاعب ====== */
async function endCurrentSessionAsLeave(code){
  try{
    const { data: room } = await sb.from('ludo_rooms').select('*').eq('code', code).single();
    if(!room) return;
    const myRole = room.p1_user_id===myId ? 'p1' : (room.p2_user_id===myId ? 'p2' : null);
    if(!myRole) return; // لم يكن لاعبًا فيها (كان مشاهدًا مثلًا) — لا حاجة لأي إجراء
    if(room.status==='playing'){
      const oppName = myRole==='p1' ? room.p2_name : room.p1_name;
      try{
        await sb.rpc('ludo_leave_as_loss', { p_code: code, p_role: myRole });
      }catch(e){}
      saveHistoryEntry({
        date: new Date().toLocaleString('ar', {dateStyle:'medium', timeStyle:'short'}),
        opponent: oppName || 'خصم',
        result: 'lose'
      });
      scheduleRoomCleanup(code);
    } else if(room.status==='waiting'){
      try{ await sb.from('ludo_rooms').delete().eq('code', code); await deleteRoomMessages(code); }catch(e){}
    }
  }catch(e){}
}
document.getElementById('btnSound').addEventListener('click', (e)=>{ soundOn = !soundOn; e.target.textContent = soundOn ? '🔊' : '🔇'; e.target.title = soundOn ? 'كتم الصوت' : 'تشغيل الصوت'; });
document.getElementById('btnHelp').addEventListener('click', openHelpSheet);

/* ====== الدردشة ====== */
document.getElementById('btnSendChat').addEventListener('click', sendChat);
document.getElementById('chatInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendChat(); });
async function sendChat(){
  const input = document.getElementById('chatInput');
  const content = input.value.trim(); if(!content) return;
  input.value=''; await sendChatMessage(content);
}

function extractLinkCode(){ return new URLSearchParams(location.search).get('r'); }

/* ====== الإقلاع — يدعم الدخول المباشر عبر رابط دعوة بدون تسجيل مسبق،
   ويكتشف وجود جولة مفتوحة أخرى قبل الانضمام لجولة جديدة عبر رابط ====== */

async function boot(){
  if(!isConfigured){ document.getElementById('setupWarning').style.display='block'; setDbStatus(false); return; }
  setDbStatus(true);
  pendingLinkCode = extractLinkCode();

  await ensureAnonymousSession();
  let existing = await loadExistingProfile();

  // دخول مباشر عبر رابط دعوة دون تسجيل مسبق: أنشئ ملفًا شخصيًا تلقائيًا باسم افتراضي قابل للتعديل لاحقًا
  if(!existing && pendingLinkCode){
    const autoName = 'لاعب_' + Math.floor(100 + Math.random()*900);
    const { data } = await createProfile(autoName, null);
    if(data) existing = data;
  }

  if(!existing){ showScreen('onboarding'); return; }

  localProfile = existing; soundOn = existing.sound_on!==false;
  paintMiniUserbar();
  initReactionButtons();
  initBoardUI();

  const saved = loadSession();

  // إذا كانت لديه جولة محفوظة مختلفة عن الرابط الذي فتحه، اسأله: عودة أم إنهاء ومتابعة
  if(saved && pendingLinkCode && saved.code !== pendingLinkCode){
    presentRoomConflict(saved.code, pendingLinkCode);
    return;
  }

  if(saved){
    const resumed = await resumeSavedSession(saved.code);
    if(resumed) return;
    // فشلت الاستعادة (انتهت الجولة أو حُذفت) — تابع أدناه لمسار الرابط أو الشاشة الرئيسية
  }

  if(pendingLinkCode){
    showScreen('home'); loadGlobalCounter();
    const { room, error } = await joinRoomByCode(pendingLinkCode);
    if(history.replaceState) history.replaceState({}, '', location.pathname);
    if(error){ showRoomEndedModal(); return; }
    await loadChatHistory(pendingLinkCode);
    enterGameScreen(room);
  } else {
    afterProfileReady();
  }
}

function afterProfileReady(){
  initBoardUI();
  initReactionButtons();
  showScreen('home'); 
  loadGlobalCounter();
}

boot();