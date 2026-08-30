// ======================================================================
// توأمة الألوان — لعبة سحب عرائس ذاكرة + نرد ملوّن، جولة عالمية مباشرة
// نفس بنية "الحية والسلم" (هوية/مستويات/إنجازات/دردشة/مشاهدين/مطابقة تلقائية)
// لكن بجدول بيانات مستقل بالكامل (cm_*) ومنطق لعب مختلف كليًا.
// ======================================================================

/* ===================== 1) الاتصال بسوبابيس ===================== */
const SUPABASE_URL      = "https://yebntvnbuufthdsjqwyx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllYm50dm5idXVmdGhkc2pxd3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MjA4MDIsImV4cCI6MjEwMTQ5NjgwMn0.dtMOlp2jS8oRttfJjsMMZTUFprrAnbfNFiBpx__4lGE";
const isConfigured = !SUPABASE_URL.includes("ضع_") && !SUPABASE_ANON_KEY.includes("ضع_");
const sb = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ===================== 2) الهوية المحلية + المصادقة المجهولة ===================== */
const AVATAR_COLORS = ['#E5484D','#2F7DE1','#3EA06B','#F2B705','#8E5CF2','#FF6F59','#17A2B8','#D6336C'];
let profile = null;
let myAuthUid = null;

function getLocalUserId(){
  // نفس المفتاح المستخدم في كل ألعاب المجموعة (الحية والدرج، إكس أو...) كي يبقى
  // المستخدم هو نفسه بملفه الشخصي ومستواه وإنجازاته أينما لعب من هذا المشغّل.
  let id = localStorage.getItem('snl_user_id');
  if(!id){
    id = (crypto.randomUUID ? crypto.randomUUID() : ('u-'+Date.now()+'-'+Math.random().toString(16).slice(2)));
    localStorage.setItem('snl_user_id', id);
  }
  return id;
}
const myId = getLocalUserId();

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
async function claimLegacyProfileIfNeeded(existingProfile){
  if(!existingProfile || existingProfile.auth_uid || !myAuthUid) return existingProfile;
  const { data, error } = await sb.from('profiles')
    .update({ auth_uid: myAuthUid })
    .eq('id', myId)
    .is('auth_uid', null)
    .select().single();
  if(!error && data) return data;
  return existingProfile;
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

/* ===================== 3) الألوان الستة + النرد ثلاثي الأبعاد ===================== */
const COLOR_ORDER = ['red','blue','green','yellow','black','white']; // n=1..6 بنفس ترتيب data-n في المكعب
const COLOR_HEX   = { red:'#E53935', blue:'#1E88E5', green:'#43A047', yellow:'#FDD835', black:'#2b2b2b', white:'#F5F5F5' };
const COLOR_LABEL = { red:'أحمر', blue:'أزرق', green:'أخضر', yellow:'أصفر', black:'أسود', white:'أبيض' };
function colorToN(c){ const i = COLOR_ORDER.indexOf(c); return i<0 ? 1 : i+1; }

const CUBE_ROTATIONS = {
  1:'rotateX(-18deg) rotateY(24deg)', 2:'rotateX(-18deg) rotateY(-66deg)',
  3:'rotateX(-108deg) rotateY(24deg)', 4:'rotateX(72deg) rotateY(24deg)',
  5:'rotateX(-18deg) rotateY(114deg)', 6:'rotateX(-18deg) rotateY(204deg)',
};
function buildDiceFaces(){
  document.querySelectorAll('.cm-face').forEach(face=>{
    const n = +face.dataset.n;
    const color = COLOR_ORDER[n-1];
    face.classList.add('cm-face-'+color);
  });
}
function showDiceValue(role, color, spin){
  const cube = document.getElementById(role==='p1' ? 'cubeP1' : 'cubeP2');
  if(!cube) return;
  cube.classList.toggle('rolling', !!spin);
  const v = colorToN(color);
  cube.style.transform = CUBE_ROTATIONS[v] || CUBE_ROTATIONS[1];
}

/* ====== فقاعة الدور العائمة فوق اللوحة ====== */
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

function rollFairColor(){
  if(window.crypto && crypto.getRandomValues){
    const buf = new Uint32Array(1);
    const limit = Math.floor(0xFFFFFFFF / 6) * 6;
    let x;
    do{ crypto.getRandomValues(buf); x = buf[0]; } while(x >= limit);
    return COLOR_ORDER[x % 6];
  }
  return COLOR_ORDER[Math.floor(Math.random()*6)];
}

/* ====== محاكاة دوران نرد الطرف الآخر (تُبث لحظيًا للمشاهدين) ====== */
let remoteShuffleTimers = { p1:null, p2:null };
let remoteShuffleSafety = { p1:null, p2:null };
function playRemoteDiceShuffle(role){
  if(role === session.role) return;
  const cube = document.getElementById(role==='p1' ? 'cubeP1' : 'cubeP2');
  if(!cube) return;
  clearInterval(remoteShuffleTimers[role]);
  clearTimeout(remoteShuffleSafety[role]);
  remoteShuffleTimers[role] = setInterval(()=>{
    showDiceValue(role, rollFairColor(), true);
  }, 90);
  remoteShuffleSafety[role] = setTimeout(()=>{
    clearInterval(remoteShuffleTimers[role]);
    remoteShuffleTimers[role] = null;
  }, 4000);
}
function playRemoteDiceResult(role, color){
  if(role === session.role) return;
  clearInterval(remoteShuffleTimers[role]);
  clearTimeout(remoteShuffleSafety[role]);
  remoteShuffleTimers[role] = null;
  showDiceValue(role, color, false);
}
function broadcastDiceRoll(role){ presenceChannel?.send({ type:'broadcast', event:'dice_roll', payload:{role} }); }
function broadcastDiceResult(role, color){ presenceChannel?.send({ type:'broadcast', event:'dice_result', payload:{role, color} }); }

/* ===================== 4) المؤثرات ===================== */
let soundOn = true;
let actx;
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
  const freqMap = {'👍':600,'🔥':300,'😂':750,'😮':450,'💪':500,'🎯':700,'🎉':880,'⚡':950};
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

/* ===================== 5) الدردشة العابرة + سجل الدردشة ===================== */
const activeStrips = { p1:null, p2:null };
let lastMessageId = 0;
const seenMessageIds = new Set();
let chatHistory = [];

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
async function sendMessage(roomCode, role, name, content){
  const trimmed = content.trim(); if(!trimmed) return null;
  const { data, error } = await sb.from('cm_messages').insert({ room_code:roomCode, sender_role:role, sender_name:name, content:trimmed }).select().single();
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
function scheduleRoomCleanup(code, delayMs = 8000){ setTimeout(()=> cleanupFinishedRoom(code), delayMs); }
async function cleanupFinishedRoom(code){
  try{
    const { data: room } = await sb.from('cm_rooms').select('status').eq('code', code).single();
    if(!room || room.status !== 'finished') return; // أُعيدت الجولة أو محذوفة مسبقًا — لا تحذف
    await sb.from('cm_messages').delete().eq('room_code', code);
    await sb.from('cm_rooms').delete().eq('code', code);
  }catch(e){}
}

function renderChatSheetBody(){
  const body = document.getElementById('chatSheetBody');
  if(!body) return;
  body.innerHTML = chatHistory.length
    ? chatHistory.slice().reverse().map(m=>`<div><b>${escapeHtml(m.name||'')}:</b> ${escapeHtml(m.content)}</div>`).join('')
    : '<div class="empty">لا توجد رسائل بعد</div>';
}
function openChatSheet(){ renderChatSheetBody(); document.getElementById('chatSheetBg').classList.add('show'); }
function closeChatSheet(){ document.getElementById('chatSheetBg').classList.remove('show'); }
async function loadChatHistory(code){
  chatHistory = []; seenMessageIds.clear(); lastMessageId = 0;
  try{
    const { data } = await sb.from('cm_messages').select('*').eq('room_code', code).order('id', {ascending:true});
    (data||[]).forEach(m=>{
      chatHistory.push({role:m.sender_role, name:m.sender_name, content:m.content});
      seenMessageIds.add(m.id);
      if(m.id > lastMessageId) lastMessageId = m.id;
    });
  }catch(e){}
  renderChatSheetBody();
}

/* ===================== 6) المطابقة التلقائية ===================== */
let mmRow = null, mmOpponentRowId = null, mmChannel = null, mmSearchTimer = null, mmAcceptTimer = null, mmHandlers = {};
const QUICK_MATCH_BOARD_SIZE = 36;
function randCode(){ const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<6;i++) s+=c[Math.floor(Math.random()*c.length)]; return s; }

async function mmStartSearch(prof, cb){
  mmHandlers = cb || {};
  await mmStopInternal();
  const { data, error } = await sb.from('cm_matchmaking_queue').insert({
    user_id: prof.id, username: prof.username, avatar_color: prof.avatar_color, avatar_data: prof.avatar_data,
    board_size: QUICK_MATCH_BOARD_SIZE, status:'waiting'
  }).select().single();
  if(error || !data){ mmHandlers.onCancelled?.('تعذّر الدخول لقائمة البحث'); return; }
  mmRow = data;
  mmChannel = sb.channel('cm-mm-'+mmRow.id)
    .on('postgres_changes', { event:'*', schema:'public', table:'cm_matchmaking_queue' }, (payload)=> mmHandleEvent(payload))
    .subscribe();
  mmSearchTimer = setTimeout(async ()=>{ if(mmRow && mmRow.status==='waiting'){ await mmStopInternal(); mmHandlers.onTimeout?.(); } }, 25000);
  await mmTryClaimOlder();
}
async function mmTryClaimOlder(){
  if(!mmRow) return;
  const { data: candidates } = await sb.from('cm_matchmaking_queue').select('*').eq('status','waiting').lt('id', mmRow.id).order('id',{ascending:true}).limit(5);
  if(!candidates || candidates.length===0) return;
  for(const cand of candidates){
    const roomCode = randCode();
    const { data: claimed, error } = await sb.rpc('cm_mm_claim_match', { p_candidate_row_id: cand.id, p_room_code: roomCode });
    const row = Array.isArray(claimed) ? claimed[0] : claimed;
    if(!error && row){
      mmRow = { ...mmRow, status:'matched', matched_with:cand.user_id, room_code:roomCode };
      mmOpponentRowId = cand.id;
      mmHandlers.onFound?.({ opponent:{username:cand.username, avatar_color:cand.avatar_color, avatar_data:cand.avatar_data}, isInitiator:true, roomCode });
      mmArmAcceptWindow();
      return;
    }
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
    await sb.rpc('cm_mm_cancel_pair', { p_my_row_id: mmRow.id, p_opponent_row_id: mmOpponentRowId || null });
    mmHandlers.onCancelled?.('تم إلغاء المطابقة'); await mmStopInternal(); return;
  }
  const { data } = await sb.from('cm_matchmaking_queue').update({accepted:true}).eq('id', mmRow.id).select().single();
  if(data) mmRow = data;
  if(mmOpponentRowId){ const { data: oppRow } = await sb.from('cm_matchmaking_queue').select('*').eq('id', mmOpponentRowId).maybeSingle(); mmCheckBothAccepted(oppRow); }
}
async function mmCheckBothAccepted(opponentRow){
  if(!mmRow || !opponentRow) return;
  if(mmRow.accepted && opponentRow.accepted){
    clearTimeout(mmAcceptTimer);
    const opp = await mmFetchOpponent(opponentRow.user_id);
    const isInitiator = mmRow.matched_with===opponentRow.user_id && mmRow.id<opponentRow.id;
    mmHandlers.onBothAccepted?.({opponent:opp, isInitiator, roomCode:mmRow.room_code});
    try{ await sb.rpc('cm_mm_delete_pair', { p_my_row_id: mmRow.id, p_opponent_row_id: mmOpponentRowId || null }); }catch(e){}
  }
}
async function mmCancelSearch(){ if(mmRow && mmRow.status==='waiting') await sb.from('cm_matchmaking_queue').delete().eq('id', mmRow.id); await mmStopInternal(); }
async function mmStopInternal(){ clearTimeout(mmSearchTimer); clearTimeout(mmAcceptTimer); if(mmChannel){ sb.removeChannel(mmChannel); mmChannel=null; } mmRow=null; mmOpponentRowId=null; }

/* ===================== 7) منطق الجولات ===================== */
const session = { code:null, role:null };
let currentRoom = null, realtimeChannel = null, presenceChannel = null, animating = false, animatingSince = null;
let selectedBoardSize = 18;

/* ===================== 7أ) نظام المستويات ===================== */
let myDiceRolls = 0;
let xpAwardedRoundKey = readRoundFlag('cm_xpAwardedRoundKey');
function readRoundFlag(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
function writeRoundFlag(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} }
function resetRoundKeys(){
  xpAwardedRoundKey = null; historySavedRoundKey = null;
  try{ sessionStorage.removeItem('cm_xpAwardedRoundKey'); sessionStorage.removeItem('cm_historySavedRoundKey'); }catch(e){}
}
let historySavedRoundKey = readRoundFlag('cm_historySavedRoundKey');
function resetRoundXPTracking(){ myDiceRolls = 0; }

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
function renderTitleBadge(el, titleAr, titleIcon){
  if(!el) return;
  if(!titleAr){ el.style.display='none'; el.textContent=''; return; }
  el.textContent = (titleIcon ? titleIcon + ' ' : '') + titleAr;
  el.style.display='inline-flex';
}
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
async function awardGameXP(room, isWin, opponentId){
  if(!isConfigured || !localProfile) return;
  try{
    const { data, error } = await sb.rpc('add_xp', {
      p_user_id: myId,
      p_room_code: room.code,
      p_room_rev: room.rev,
      p_opponent_id: opponentId || null,
      p_ladder_climbs: 0,
      p_is_win: isWin,
      p_had_snake_hit: false,
      p_dice_rolls: myDiceRolls,
      p_bonus_hits: 0
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
function maybeAwardGameXP(room){
  if(session.role!=='p1' && session.role!=='p2') return;
  const key = room.code + '|' + room.rev;
  if(xpAwardedRoundKey === key) return;
  xpAwardedRoundKey = key;
  writeRoundFlag('cm_xpAwardedRoundKey', key);
  if(room.winner === 'draw'){ awardGameXP(room, false, session.role==='p1' ? room.p2_user_id : room.p1_user_id); return; }
  const opponentId = session.role==='p1' ? room.p2_user_id : room.p1_user_id;
  awardGameXP(room, room.winner === session.role, opponentId);
}

/* ===================== 7ب) نظام الإنجازات (مشترك بين كل الألعاب) ===================== */
const ACHIEVEMENTS_CATALOG = [
  { code:'social_5',     title_ar:'اجتماعي',       description_ar:'العب مع 5 لاعبين مختلفين',                    xp_reward:100, icon:'🤝', sort_order:10 },
  { code:'social_10',    title_ar:'صانع صداقات',   description_ar:'العب مع 10 لاعبين مختلفين',                   xp_reward:250, icon:'🌍', sort_order:11 },
  { code:'streak_3',     title_ar:'سلسلة النار',   description_ar:'حقّق 3 انتصارات متتالية',                     xp_reward:150, icon:'🔥', sort_order:20 },
  { code:'streak_5',     title_ar:'لا يُقهر',      description_ar:'حقّق 5 انتصارات متتالية',                     xp_reward:400, icon:'⚔️', sort_order:21 },
  { code:'games_25',     title_ar:'محارب مخضرم',   description_ar:'أكمل 25 جولة',                                 xp_reward:150, icon:'🎖️', sort_order:30 },
  { code:'games_100',    title_ar:'أسطورة اللعبة', description_ar:'أكمل 100 جولة',                                xp_reward:500, icon:'👑', sort_order:31 },
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
function computeAchievementProgress(code, stats){
  const s = stats || {};
  const table = {
    social_5:    { cur:s.unique_opponents_count||0, target:5 },
    social_10:   { cur:s.unique_opponents_count||0, target:10 },
    streak_3:    { cur:s.best_streak||0, target:3 },
    streak_5:    { cur:s.best_streak||0, target:5 },
    games_25:    { cur:s.total_games||0, target:25 },
    games_100:   { cur:s.total_games||0, target:100 },
  };
  return table[code] || null;
}
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
async function openAchievementsSheet(){
  document.getElementById('achievementsSheetBg').classList.add('show');
  renderAchievementsCards(ACHIEVEMENTS_CATALOG, new Set(), {});
  if(!isConfigured) return;
  try{
    const [allRes, mineRes, statsRes] = await Promise.all([
      sb.from('achievements').select('*').order('sort_order', {ascending:true}),
      sb.from('player_achievements').select('achievement_code').eq('user_id', myId),
      sb.from('profiles').select('unique_opponents_count, best_streak, total_games').eq('id', myId).maybeSingle()
    ]);
    const catalog = (allRes.data && allRes.data.length) ? allRes.data : ACHIEVEMENTS_CATALOG;
    const unlockedSet = new Set((mineRes.data||[]).map(m=>m.achievement_code));
    renderAchievementsCards(catalog, unlockedSet, statsRes.data || {});
  }catch(e){}
}
function closeAchievementsSheet(){ document.getElementById('achievementsSheetBg').classList.remove('show'); }
document.getElementById('btnAchievements').addEventListener('click', openAchievementsSheet);
document.getElementById('btnCloseAchievementsSheet').addEventListener('click', closeAchievementsSheet);
document.getElementById('achievementsSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='achievementsSheetBg') closeAchievementsSheet(); });

/* ===================== 7ج) المشاهدون + المؤقتات ===================== */
let spectatorNames = [];
let knownSpectatorKeys = new Set();
let spectatorPresenceReady = false;
let lastTurnKey = null;
let turnTimer = null, turnCountdownInterval = null;
const TURN_TIME_LIMIT = 15;
const WATCHDOG_GRACE = 6;
let watchdogTimer = null, watchdogRevKey = null;
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function buildRoomLink(code){ const url=new URL(location.href); url.search=''; url.hash=''; url.searchParams.set('r',code); return url.toString(); }

function saveSession(){ if(session.code && session.role){ localStorage.setItem('cm_session', JSON.stringify({code:session.code, role:session.role, ts:Date.now()})); } }
function loadSession(){ try{ const s = JSON.parse(localStorage.getItem('cm_session')); if(s && Date.now()-s.ts < 1000*60*60*4){ return s; } }catch(e){} return null; }
function clearSession(){ localStorage.removeItem('cm_session'); }

/* ===================== 8) إنشاء/الانضمام للغرفة ===================== */
async function createRoom(boardSize, explicitCode){
  let code=explicitCode, room=null, attempts=0;
  while(!room && attempts<5){
    if(!code || attempts>0) code = randCode();
    const { data, error } = await sb.rpc('cm_create_room', {
      p_code: code, p_board_size: boardSize,
      p_user_id: myId, p_name: profile.username, p_avatar_color: profile.avatar_color, p_avatar_data: profile.avatar_data,
      p_level: profile.level || 1, p_title_ar: profile.title_ar || null, p_title_icon: profile.title_icon || null
    });
    if(!error && data && data[0]) room = data[0];
    attempts++;
  }
  if(!room) return { error:'تعذّر إنشاء الجولة' };
  session.code=code; session.role='p1';
  saveSession();
  resetRoundXPTracking(); resetRoundKeys();
  subscribeToRoom(code); subscribeToPresence(code);
  return { code, room };
}
async function joinRoomByCode(code){
  const { data: room, error } = await sb.from('cm_rooms').select('*').eq('code', code).single();
  if(error || !room) return { error:'NOTFOUND' };

  // انتهت الجولة صراحة من طرف منشئها — تُعرض رسالة الانتهاء لأي أحد يفتح هذا الرابط
  if(room.status === 'ended') return { error:'ENDED' };

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

  // اكتمل اللعب فعليًا بنتيجة — أي زائر جديد غير أحد اللاعبين الأصليين يرى "انتهت الجولة"
  if(room.status === 'finished') return { error:'ENDED' };

  if(room.p2_name){
    session.code=code; session.role='spectator'; saveSession();
    subscribeToRoom(code); subscribeToPresence(code);
    return { room };
  }

  const { data: joinRows, error: err2 } = await sb.rpc('cm_join_room_as_p2', {
    p_code: code, p_expected_rev: room.rev,
    p_user_id: myId, p_name: profile.username, p_avatar_color: profile.avatar_color, p_avatar_data: profile.avatar_data,
    p_level: profile.level || 1, p_title_ar: profile.title_ar || null, p_title_icon: profile.title_icon || null
  });
  const saved = Array.isArray(joinRows) ? joinRows[0] : joinRows;
  if(err2 || !saved){
    const { data: latest } = await sb.from('cm_rooms').select('*').eq('code', code).single();
    if(latest && latest.p2_name){
      session.code=code; session.role='spectator'; saveSession();
      subscribeToRoom(code); subscribeToPresence(code);
      return { room: latest };
    }
    if(latest && (latest.status==='ended' || latest.status==='finished')) return { error:'ENDED' };
    return { error:'JOINFAILED' };
  }
  session.code=code; session.role='p2';
  saveSession();
  resetRoundXPTracking(); resetRoundKeys();
  subscribeToRoom(code); subscribeToPresence(code);
  return { room: saved };
}
function joinErrorText(code){
  if(code === 'ENDED') return 'انتهت هذه الجولة، لم تعد متاحة';
  if(code === 'NOTFOUND') return 'لم يتم العثور على جولة بهذا الرمز';
  return 'تعذّر الانضمام، جرّب مرة أخرى';
}

/* ===================== 9) بناء لوحة العرائس وعرضها ===================== */
let lastPeekRevKey = null;
function buildColorBoard(boardSize){
  const board = document.getElementById('cmBoard');
  board.className = 'cm-board size-' + boardSize;
  board.innerHTML = '';
  for(let i=0;i<boardSize;i++){
    const wrap = document.createElement('div'); wrap.className = 'cm-hole-wrap';
    const hole = document.createElement('div'); hole.className = 'cm-hole'; hole.dataset.idx = i;
    const peg = document.createElement('div'); peg.className = 'cm-peg';
    hole.appendChild(peg);
    hole.addEventListener('click', ()=> onHoleClick(i));
    wrap.appendChild(hole);
    board.appendChild(wrap);
  }
}
let currentBoardSize = null;
function ensureBoardBuilt(size){
  if(currentBoardSize !== size){
    buildColorBoard(size);
    currentBoardSize = size;
  }
}
function renderColorScoreRow(el, score){
  if(!el) return;
  el.innerHTML = COLOR_ORDER.map(c=>{
    const n = (score && score[c]) || 0;
    return `<span class="color-chip"><span class="dot" style="background:${COLOR_HEX[c]};"></span>${n}</span>`;
  }).join('');
}
function canIPick(room){
  const isSpectator = session.role === 'spectator';
  return !isSpectator && room.status==='playing' && room.turn===session.role && room.phase==='pick' && !animating;
}
function renderColorBoard(room){
  ensureBoardBuilt(room.board_size);
  const holes = document.querySelectorAll('#cmBoard .cm-hole');
  const iCanPick = canIPick(room);
  const state = room.board_state || [];
  holes.forEach((hole, i)=>{
    const claimed = state[i]; // {c,by} بعد الاكتشاف، أو null قبل ذلك
    const peg = hole.querySelector('.cm-peg');
    if(claimed && claimed.c){
      hole.classList.add('taken');
      hole.classList.remove('disabled','peek');
      peg.style.background = COLOR_HEX[claimed.c] || '#ccc';
      let badge = hole.querySelector('.cm-claim-badge');
      if(!badge){ badge = document.createElement('div'); badge.className='cm-claim-badge'; hole.appendChild(badge); }
      const byP1 = claimed.by === 'p1';
      applyAvatarVisual(badge, byP1 ? room.p1_avatar_color : room.p2_avatar_color, byP1 ? room.p1_avatar_data : room.p2_avatar_data, byP1 ? (room.p1_name?room.p1_name[0]:'?') : (room.p2_name?room.p2_name[0]:'?'));
    } else {
      hole.classList.remove('taken');
      peg.style.background = '';
      hole.classList.toggle('disabled', !iCanPick);
      const badge = hole.querySelector('.cm-claim-badge');
      if(badge) badge.remove();
    }
  });

  const peek = room.last_peek;
  const peekKey = peek ? (peek.rev + '|' + peek.idx + '|' + peek.matched) : null;
  if(peek && peekKey !== lastPeekRevKey && !peek.matched){
    lastPeekRevKey = peekKey;
    const hole = holes[peek.idx];
    if(hole){
      const peg = hole.querySelector('.cm-peg');
      peg.style.background = COLOR_HEX[peek.color] || '#ccc';
      hole.classList.add('peek','wrong-flash');
      beep(260,.18,'sawtooth',.16);
      setTimeout(()=>{
        hole.classList.remove('peek','wrong-flash');
        if(!hole.classList.contains('taken')) peg.style.background = '';
      }, 900);
    }
  } else if(peek && peekKey !== lastPeekRevKey && peek.matched){
    lastPeekRevKey = peekKey;
    const hole = holes[peek.idx];
    if(hole){
      hole.classList.add('match-flash');
      beep(760,.18,'triangle',.2);
      setTimeout(()=> hole.classList.remove('match-flash'), 650);
    }
  }
}
async function onHoleClick(idx){
  if(!currentRoom || !canIPick(currentRoom)) return;
  if((currentRoom.board_state||[])[idx]) return;
  await pickPeg(session.role, idx, false);
}

function updateHintButton(room){
  const btn = document.getElementById('btnHint');
  if(!btn) return;
  if(session.role !== 'p1' && session.role !== 'p2'){ btn.style.display = 'none'; return; }
  btn.style.display = 'inline-flex';
  const used = session.role==='p1' ? (room.p1_hints_used||0) : (room.p2_hints_used||0);
  const remaining = Math.max(0, 2 - used);
  document.getElementById('hintCount').textContent = remaining;
  const usable = room.status==='playing' && room.turn===session.role && room.phase==='pick' && !!room.dice_color && remaining>0 && !animating;
  btn.disabled = !usable;
  btn.classList.toggle('disabled', !usable);
}
function highlightBoardHalf(half){
  const wraps = document.querySelectorAll('#cmBoard .cm-hole-wrap');
  const mid = Math.floor((currentRoom?.board_size||0) / 2);
  wraps.forEach((wrap, i)=>{
    wrap.classList.remove('hint-zone');
    if(half===0 || (half===1 && i<mid) || (half===2 && i>=mid)) wrap.classList.add('hint-zone');
  });
  setTimeout(()=> wraps.forEach(w=>w.classList.remove('hint-zone')), 3200);
}
document.getElementById('btnHint').addEventListener('click', async ()=>{
  if(!currentRoom || (session.role!=='p1' && session.role!=='p2')) return;
  const used = session.role==='p1' ? (currentRoom.p1_hints_used||0) : (currentRoom.p2_hints_used||0);
  if(currentRoom.status!=='playing' || currentRoom.turn!==session.role || currentRoom.phase!=='pick' || !currentRoom.dice_color || used>=2 || animating) return;

  const expectedRev = currentRoom.rev;
  const { data, error } = await sb.rpc('cm_use_hint', { p_code: session.code, p_role: session.role, p_expected_rev: expectedRev });
  const result = Array.isArray(data) ? data[0] : data;
  if(error || !result) return;
  renderRoom(result.out_room);
  if(result.no_op) return;
  beep(700,.12,'sine',.18);
  if(result.hint_none){
    showTurnBubble('💡 لا توجد عرائس متبقية بهذا اللون في اللوحة!');
  } else if(result.hint_half === 0){
    showTurnBubble('💡 اللون موجود في كلا نصفَي اللوحة');
    highlightBoardHalf(0);
  } else {
    showTurnBubble('💡 اللون موجود في ' + (result.hint_half===1 ? 'النصف الأول' : 'النصف الثاني') + ' من اللوحة');
    highlightBoardHalf(result.hint_half);
  }
});

/* ===================== 10) أزرار النرد والمؤقتات ===================== */
let turnTimerKey = null;
function clearTurnTimer(){
  clearTimeout(turnTimer); turnTimer = null;
  clearInterval(turnCountdownInterval); turnCountdownInterval = null;
  turnTimerKey = null;
  if(session.role==='p1' || session.role==='p2'){
    const btn = document.getElementById(session.role==='p1' ? 'btnRollP1':'btnRollP2');
    if(btn && !btn.disabled) btn.textContent = 'ارمِ النرد';
    const hint = document.getElementById(session.role==='p1' ? 'hintP1':'hintP2');
    if(hint) hint.textContent = '';
  }
}
function armTurnTimer(room){
  clearTurnTimer();
  turnTimerKey = room.code + '|' + room.rev + '|' + room.turn + '|' + room.phase;
  let remaining = TURN_TIME_LIMIT;
  const isRoll = room.phase === 'roll';
  const btn = document.getElementById(session.role==='p1' ? 'btnRollP1':'btnRollP2');
  const hint = document.getElementById(session.role==='p1' ? 'hintP1':'hintP2');
  if(isRoll && btn) btn.textContent = `ارمِ النرد (${remaining})`;
  if(!isRoll && hint) hint.textContent = `اختر عروسة الآن! (${remaining})`;
  turnCountdownInterval = setInterval(()=>{
    remaining--;
    if(isRoll && btn) btn.textContent = remaining>0 ? `ارمِ النرد (${remaining})` : 'ارمِ النرد';
    if(!isRoll && hint) hint.textContent = remaining>0 ? `اختر عروسة الآن! (${remaining})` : '';
    if(remaining<=0) clearInterval(turnCountdownInterval);
  }, 1000);
  turnTimer = setTimeout(()=>{
    turnTimer = null;
    if(animating || !currentRoom || currentRoom.status!=='playing' || currentRoom.turn!==session.role) return;
    if(currentRoom.phase==='roll') rollDice(session.role, true);
    else autoPick(session.role);
  }, TURN_TIME_LIMIT*1000);
}
function clearWatchdogTimer(){ clearTimeout(watchdogTimer); watchdogTimer = null; watchdogRevKey = null; }
function armWatchdogTimer(room){
  const key = room.code + '|' + room.rev + '|' + room.turn + '|' + room.phase;
  if(watchdogRevKey === key) return;
  clearWatchdogTimer();
  watchdogRevKey = key;
  const turnRole = room.turn, expectedRev = room.rev, phase = room.phase;
  watchdogTimer = setTimeout(async ()=>{
    watchdogTimer = null;
    const { data: fresh } = await sb.from('cm_rooms').select('*').eq('code', session.code).single();
    if(fresh && fresh.status==='playing' && fresh.turn===turnRole && fresh.rev===expectedRev){
      if(phase==='roll') await rollDice(turnRole, true);
      else await autoPick(turnRole);
    }
  }, (TURN_TIME_LIMIT + WATCHDOG_GRACE) * 1000);
}
function syncTurnControls(room, isSpectatorArg){
  const isSpectator = isSpectatorArg !== undefined ? isSpectatorArg : (session.role === 'spectator');
  const rollP1 = document.getElementById('btnRollP1');
  const rollP2 = document.getElementById('btnRollP2');
  const oppLabelP1 = document.getElementById('oppLabelP1');
  const oppLabelP2 = document.getElementById('oppLabelP2');

  if(isSpectator){
    rollP1.style.display='none'; rollP2.style.display='none';
    oppLabelP1.style.display='block'; oppLabelP2.style.display='block';
  } else {
    const myRollBtn = session.role==='p1' ? rollP1 : rollP2;
    const oppRollBtn = session.role==='p1' ? rollP2 : rollP1;
    const myOppLabel = session.role==='p1' ? oppLabelP1 : oppLabelP2;
    const oppOppLabel = session.role==='p1' ? oppLabelP2 : oppLabelP1;
    oppRollBtn.style.display='none';
    oppOppLabel.style.display='block';
    myOppLabel.style.display='none';
    const isMyTurn = room.status==='playing' && room.turn===session.role;
    myRollBtn.style.display = (isMyTurn && room.phase==='roll') ? 'inline-flex' : 'none';
    if(!isMyTurn || room.phase!=='roll') myOppLabel.style.display='block';
    myRollBtn.disabled = !(isMyTurn && room.phase==='roll') || animating;
  }

  if(!isSpectator && room.status==='playing' && room.turn===session.role && !animating){
    const myTurnKey = room.code + '|' + room.rev + '|' + room.turn + '|' + room.phase;
    if(turnTimerKey !== myTurnKey) armTurnTimer(room);
  } else {
    clearTurnTimer();
  }
  if(room.status==='playing' && room.turn!==session.role && !animating){
    armWatchdogTimer(room);
  } else {
    clearWatchdogTimer();
  }
}

/* ===================== 11) رمي النرد + سحب العروسة ===================== */
function showOfflineSpinner(){ ['rollSpinnerP1','rollSpinnerP2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.add('show'); }); }
function hideOfflineSpinner(){ ['rollSpinnerP1','rollSpinnerP2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.remove('show'); }); }
if(!navigator.onLine) showOfflineSpinner();
window.addEventListener('offline', showOfflineSpinner);

async function rollDice(forRole, isAuto=false){
  if(animating) return;
  const actingRole = forRole || session.role;
  if(actingRole!=='p1' && actingRole!=='p2') return;
  if(!isAuto && session.role!==actingRole) return;
  if(!currentRoom || currentRoom.status!=='playing' || currentRoom.turn!==actingRole || currentRoom.phase!=='roll') return;

  const isSelf = actingRole===session.role;
  const expectedRev = currentRoom.rev;
  clearTurnTimer(); clearWatchdogTimer();
  animating = true; animatingSince = Date.now();
  if(isSelf){ const b=document.getElementById(actingRole==='p1'?'btnRollP1':'btnRollP2'); if(b) b.disabled = true; }

  try{
    broadcastDiceRoll(actingRole);
    const { data, error } = await sb.rpc('cm_roll_dice', { p_code: session.code, p_role: actingRole, p_expected_rev: expectedRev, p_is_auto: !!isAuto });
    const result = Array.isArray(data) ? data[0] : data;

    if(error || !result){
      const { data: refreshed } = await sb.from('cm_rooms').select('*').eq('code', session.code).single();
      if(refreshed){ renderRoom(refreshed); syncTurnControls(refreshed); }
      return;
    }
    if(result.no_op){ renderRoom(result.out_room); syncTurnControls(result.out_room); return; }
    const room = result.out_room;
    if(isSelf) myDiceRolls++;

    if(result.forfeited){
      renderRoom(room); bumpGlobalCounter(); scheduleRoomCleanup(session.code);
      syncTurnControls(room); return;
    }

    const color = room.dice_color;
    if(isSelf){
      const shuffle = setInterval(()=> showDiceValue(actingRole, rollFairColor(), true), 90);
      await sleep(650);
      clearInterval(shuffle);
      showDiceValue(actingRole, color, false);
      beep(520,.1,'square');
    } else {
      playRemoteDiceShuffle(actingRole);
      await sleep(650);
      playRemoteDiceResult(actingRole, color);
    }
    broadcastDiceResult(actingRole, color);

    renderRoom(room);
    syncTurnControls(room);
  } catch(e){
    console.error('rollDice error:', e);
  } finally {
    animating = false; animatingSince = null;
  }
}

async function pickPeg(forRole, idx, isAuto=false){
  if(animating) return;
  const actingRole = forRole || session.role;
  if(!currentRoom || currentRoom.status!=='playing' || currentRoom.turn!==actingRole || currentRoom.phase!=='pick') return;
  if(!isAuto && session.role!==actingRole) return;

  const expectedRev = currentRoom.rev;
  clearTurnTimer(); clearWatchdogTimer();
  animating = true; animatingSince = Date.now();

  try{
    const { data, error } = await sb.rpc('cm_pick_peg', { p_code: session.code, p_role: actingRole, p_expected_rev: expectedRev, p_idx: idx, p_is_auto: !!isAuto });
    const result = Array.isArray(data) ? data[0] : data;

    if(error || !result){
      const { data: refreshed } = await sb.from('cm_rooms').select('*').eq('code', session.code).single();
      if(refreshed){ renderRoom(refreshed); syncTurnControls(refreshed); }
      return;
    }
    if(result.no_op){ renderRoom(result.out_room); syncTurnControls(result.out_room); return; }

    const room = result.out_room;
    if(result.forfeited){
      renderRoom(room); bumpGlobalCounter(); scheduleRoomCleanup(session.code);
      syncTurnControls(room); return;
    }
    if(room.status==='finished') bumpGlobalCounter();
    if(room.status==='finished' || room.status==='playing') scheduleRoomCleanupIfFinished(room);

    renderRoom(room);
    syncTurnControls(room);
  } catch(e){
    console.error('pickPeg error:', e);
  } finally {
    animating = false; animatingSince = null;
  }
}
function scheduleRoomCleanupIfFinished(room){ if(room.status==='finished') scheduleRoomCleanup(session.code); }
async function autoPick(role){
  if(!currentRoom) return;
  const hidden = [];
  (currentRoom.board_state||[]).forEach((v,i)=>{ if(!v) hidden.push(i); });
  if(!hidden.length) return;
  const idx = hidden[Math.floor(Math.random()*hidden.length)];
  await pickPeg(role, idx, true);
}

async function bumpGlobalCounter(){ try{ await sb.rpc('bump_global_games_played'); }catch(e){} }
async function loadGlobalCounter(){
  try{ const { data } = await sb.from('global_stats').select('games_played').eq('id',1).single();
    if(data) document.getElementById('globalCounter').textContent = '🌍 جولات لُعبت حول العالم: ' + data.games_played;
  }catch(e){}
  renderHistoryTable();
}
function fireReaction(role, emoji){ burstReaction(document.getElementById(role==='p1'?'panelP1':'panelP2'), emoji); }
function broadcastReaction(emoji){ presenceChannel?.send({ type:'broadcast', event:'react', payload:{emoji, from:session.role} }); }

/* ===================== 12) عرض حالة الغرفة ===================== */
function renderRoom(room, opts={}){
  if(room.status === 'ended' && session.role !== 'p1'){
    handleRoomEndedRemotely();
    return;
  }
  currentRoom = room;
  hideOfflineSpinner();
  const isSpectator = session.role === 'spectator';
  document.body.classList.toggle('is-spectator', isSpectator);

  const linkInput = document.getElementById('tbLinkInput');
  if(linkInput && room.code) linkInput.value = buildRoomLink(room.code);

  document.getElementById('nameP1').textContent = room.p1_name || '—';
  document.getElementById('nameP2').textContent = room.p2_name || 'بانتظار لاعب…';
  applyAvatarVisual(document.getElementById('avatarP1'), room.p1_avatar_color, room.p1_avatar_data, room.p1_name?room.p1_name[0]:'?');
  applyAvatarVisual(document.getElementById('avatarP2'), room.p2_avatar_color, room.p2_avatar_data, room.p2_name?room.p2_name[0]:'?');
  renderLevelBadge(document.getElementById('levelBadgeP1'), room.p1_level, true);
  renderLevelBadge(document.getElementById('levelBadgeP2'), room.p2_level, true);
  renderLevelBadge(document.getElementById('nameLevelP1'), room.p1_level, false);
  renderLevelBadge(document.getElementById('nameLevelP2'), room.p2_level, false);
  renderTitleBadge(document.getElementById('nameTitleP1'), room.p1_title_ar, room.p1_title_icon);
  renderTitleBadge(document.getElementById('nameTitleP2'), room.p2_title_ar, room.p2_title_icon);
  renderColorScoreRow(document.getElementById('scoreRowP1'), room.p1_score);
  renderColorScoreRow(document.getElementById('scoreRowP2'), room.p2_score);

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

  renderColorBoard(room);

  const diceStatus = document.getElementById('cmDiceStatus');
  const banner = document.getElementById('turnBanner');
  let bannerText = '';
  if(room.status==='waiting'){
    bannerText = '⏳ بانتظار انضمام اللاعب الثاني…';
    diceStatus.textContent = 'اللوحة: ' + room.board_size + ' خانة';
  } else if(room.status==='ended'){
    bannerText = '🚪 أنهيت هذه الجولة';
    diceStatus.textContent = 'انتهت الجولة';
  } else if(room.status==='finished'){
    const winnerName = room.winner==='draw' ? null : (room.winner==='p1' ? room.p1_name : room.p2_name);
    const boardFull = room.board_size>0 && (room.board_state||[]).length===room.board_size && (room.board_state||[]).every(c=>c);
    if(room.winner!=='draw' && !boardFull){
      const loserName = room.winner==='p1' ? room.p2_name : room.p1_name;
      bannerText = '🚪 غادر ' + (loserName||'الطرف الآخر') + ' الجولة — الفائز: ' + winnerName;
    } else {
      bannerText = room.winner==='draw' ? '🏁 انتهت الجولة — تعادل!' : ('🏁 انتهت الجولة — الفائز: ' + winnerName);
    }
    diceStatus.textContent = 'انتهت الجولة';
  } else {
    const turnName = room.turn==='p1' ? room.p1_name : room.p2_name;
    if(isSpectator){
      bannerText = room.phase==='roll' ? ('👀 دور ' + turnName + ' — بانتظار الرمي…') : ('👀 دور ' + turnName + ' — يختار عروسة…');
    } else {
      const isMyTurn = room.turn===session.role;
      if(isMyTurn){ bannerText = room.phase==='roll' ? '🎲 دورك! ارمِ النرد' : '👆 اختر عروسة من اللوحة'; }
      else { bannerText = '⏱ دور ' + turnName + '…'; }
    }
    if(room.dice_color){
      diceStatus.innerHTML = 'اللون المطلوب: <b style="color:'+COLOR_HEX[room.dice_color]+';text-shadow:0 0 3px #000;">'+COLOR_LABEL[room.dice_color]+'</b>';
    } else {
      diceStatus.textContent = 'بانتظار رمي النرد…';
    }
  }
  banner.textContent = bannerText;
  const turnKey = room.status+'|'+room.turn+'|'+room.phase+'|'+(room.winner||'');
  if(turnKey !== lastTurnKey){ lastTurnKey = turnKey; showTurnBubble(bannerText); }

  syncTurnControls(room, isSpectator);
  updateHintButton(room);
  showDiceValue('p1', room.dice_owner==='p1' ? (room.dice_color||'red') : 'red', false);
  showDiceValue('p2', room.dice_owner==='p2' ? (room.dice_color||'blue') : 'blue', false);

  renderPerPlayerLogs(room);

  const chatInputEl = document.getElementById('chatInput');
  const sendBtnEl = document.getElementById('btnSendChat');
  if(chatInputEl) chatInputEl.style.display = isSpectator ? 'none' : '';
  if(sendBtnEl) sendBtnEl.style.display = isSpectator ? 'none' : '';

  if(room.status==='finished'){
    openWinModal(room);
    maybeAwardGameXP(room);
  }
}
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
  boxP1.innerHTML = p1Lines.length ? p1Lines.slice(-6).reverse().map(l=>`<div>${escapeHtml(l)}</div>`).join('') : '<div class="empty">لا أحداث بعد</div>';
  boxP2.innerHTML = p2Lines.length ? p2Lines.slice(-6).reverse().map(l=>`<div>${escapeHtml(l)}</div>`).join('') : '<div class="empty">لا أحداث بعد</div>';
  fullPlayerLogs.p1 = p1Lines; fullPlayerLogs.p2 = p2Lines;
  fullPlayerNames.p1 = p1Name || 'اللاعب الأول'; fullPlayerNames.p2 = p2Name || 'اللاعب الثاني';
  if(openEventsRole) renderEventsSheetBody(openEventsRole);
}
const fullPlayerLogs = { p1:[], p2:[] };
const fullPlayerNames = { p1:'', p2:'' };
let openEventsRole = null;
function renderEventsSheetBody(role){
  const lines = fullPlayerLogs[role] || [];
  document.getElementById('eventsSheetBody').innerHTML = lines.length ? lines.slice().reverse().map(l=>`<div>${escapeHtml(l)}</div>`).join('') : '<div class="empty">لا أحداث بعد</div>';
}
function openEventsSheet(role){
  openEventsRole = role;
  document.getElementById('eventsSheetTitle').textContent = '📜 أحداث ' + (fullPlayerNames[role] || '');
  renderEventsSheetBody(role);
  document.getElementById('eventsSheetBg').classList.add('show');
}
function closeEventsSheet(){ openEventsRole = null; document.getElementById('eventsSheetBg').classList.remove('show'); }
document.getElementById('logBadgeP1').addEventListener('click', ()=> openEventsSheet('p1'));
document.getElementById('logBadgeP2').addEventListener('click', ()=> openEventsSheet('p2'));
document.getElementById('btnCloseEventsSheet').addEventListener('click', closeEventsSheet);
document.getElementById('eventsSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='eventsSheetBg') closeEventsSheet(); });

document.getElementById('btnChatHistory').addEventListener('click', openChatSheet);
document.getElementById('btnCloseChatSheet').addEventListener('click', closeChatSheet);
document.getElementById('chatSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='chatSheetBg') closeChatSheet(); });

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
  body.innerHTML = spectatorNames.length ? spectatorNames.map(n=>`<div>👀 ${escapeHtml(n)}</div>`).join('') : '<div class="empty">لا يوجد مشاهدون حاليًا</div>';
}
function openSpectatorsSheet(){ renderSpectatorsSheetBody(); document.getElementById('spectatorsSheetBg').classList.add('show'); }
function closeSpectatorsSheet(){ document.getElementById('spectatorsSheetBg').classList.remove('show'); }
document.getElementById('btnSpectators').addEventListener('click', openSpectatorsSheet);
document.getElementById('btnCloseSpectatorsSheet').addEventListener('click', closeSpectatorsSheet);
document.getElementById('spectatorsSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='spectatorsSheetBg') closeSpectatorsSheet(); });

let spectatorToastTimer = null;
function showSpectatorToast(text){
  const el = document.getElementById('spectatorToast');
  if(!el) return;
  el.textContent = text;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(spectatorToastTimer);
  spectatorToastTimer = setTimeout(()=> el.classList.remove('show'), 2600);
  beep(900,.08,'sine',.12);
}

const HELP_LINES = [
  '🎲 كل لاعب يرمي نرده الملوّن بجانبه بدوره (نرد عشوائي 100٪ بستة ألوان).',
  '👆 بعد الرمي، اضغط على أي عروسة في اللوحة لتكشفها.',
  '✅ إن طابق لونها لون النرد: تفوز بها وتحصل على رمية إضافية فورًا.',
  '❌ إن لم يطابق: تنتقل اللوحة كما هي (تذكّرها!) وينتقل الدور لخصمك.',
  '🧠 استخدم ذاكرتك لتتذكر ألوان العرائس التي كُشفت سابقًا ولم تُؤخذ.',
  'عند اكتمال اللوحة بالكامل، يفوز من جمع أكبر عدد من العرائس إجماليًا.',
  'يمكنك اختيار حجم اللوحة عند الإنشاء: 18 أو 36 أو 60 خانة.',
  '⭐ شارة مستواك تظهر بجانب اسمك، وتكسب خبرة (XP) عند إكمال كل جولة أو الفوز بها.',
  '🏅 افتح "إنجازاتي" من الشاشة الرئيسية لرؤية شارات مميزة تمنحك خبرة إضافية دائمة.',
  'استخدم الإيموجي في بطاقتك للتفاعل مع خصمك لحظيًا.',
  'أنشئ رابط دعوة أو استخدم البحث التلقائي لإيجاد خصم من أي مكان في العالم!',
  '💡 لديك مساعدتان فقط في كل جولة: تكشف أي نصف من اللوحة يحتمل وجود اللون المطلوب.',
  '🚪 مغادرة الجولة أثناء اللعب الفعلي تُحسب خسارة تلقائية وفوزًا للطرف الآخر.',
  '👀 يظهر عدد المشاهدين بجانب هذا الزر — اضغط عليه لرؤية أسمائهم.'
];
function openHelpSheet(){
  document.getElementById('helpSheetBody').innerHTML = HELP_LINES.map(l=>`<div>${l}</div>`).join('');
  document.getElementById('helpSheetBg').classList.add('show');
}
function closeHelpSheet(){ document.getElementById('helpSheetBg').classList.remove('show'); }
document.getElementById('btnHelp').addEventListener('click', openHelpSheet);
document.getElementById('btnCloseHelpSheet').addEventListener('click', closeHelpSheet);
document.getElementById('helpSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='helpSheetBg') closeHelpSheet(); });

function openWinModal(room){
  const modal = document.getElementById('winModal');
  if(modal.style.display==='flex') return;
  const isSpectator = session.role === 'spectator';
  const isDraw = room.winner === 'draw';
  const isMe = room.winner===session.role;
  const winnerName = isDraw ? null : (room.winner==='p1' ? room.p1_name : room.p2_name);
  const boardFull = room.board_size>0 && (room.board_state||[]).length===room.board_size && (room.board_state||[]).every(c=>c);
  const isForfeit = !isDraw && !boardFull;
  document.getElementById('winTitle').textContent = isDraw ? '🤝 تعادل!' : (isMe ? '🎉 أنت الفائز!' : ('فاز ' + winnerName));
  document.getElementById('winText').textContent = isForfeit
    ? ('غادر ' + (room.winner==='p1' ? room.p2_name : room.p1_name) + ' الجولة — فوز تلقائي لـ ' + winnerName + ' 🏆')
    : 'جمع أكبر عدد من العرائس المتطابقة في هذه الجولة.';
  document.getElementById('btnRematch').style.display = isSpectator ? 'none' : 'inline-flex';
  modal.style.display='flex';
  launchConfetti();
  beep(880,.2,'triangle'); setTimeout(()=>beep(1100,.25,'triangle'),150);

  if(!isSpectator){
    const oppName = session.role==='p1' ? room.p2_name : room.p1_name;
    const roundKey = room.code + '|' + room.rev;
    if(historySavedRoundKey !== roundKey){
      historySavedRoundKey = roundKey;
      writeRoundFlag('cm_historySavedRoundKey', roundKey);
      saveHistoryEntry({
        date: new Date().toLocaleString('ar', {dateStyle:'medium', timeStyle:'short'}),
        opponent: oppName || 'خصم',
        result: isDraw ? 'draw' : (isMe ? 'win' : 'lose')
      });
    }
  }
}
function loadHistory(){ try{ return JSON.parse(localStorage.getItem('cm_history')||'[]'); }catch(e){ return []; } }
function saveHistoryEntry(entry){
  const hist = loadHistory();
  hist.unshift(entry);
  localStorage.setItem('cm_history', JSON.stringify(hist.slice(0,50)));
  renderHistoryTable();
}
function renderHistoryTable(){
  const box = document.getElementById('historyTable');
  if(!box) return;
  const hist = loadHistory();
  if(!hist.length){ box.innerHTML = '<p class="hint" style="margin:0;">لا توجد جولات سابقة بعد</p>'; return; }
  box.innerHTML = hist.slice(0,15).map(h=>`
    <div class="history-row ${h.result==='win'?'win':(h.result==='draw'?'':'lose')}">
      <span class="h-date">${h.date}</span>
      <span class="h-opp">${h.opponent}</span>
      <span class="h-status">${h.result==='win' ? '🏆 فوز' : (h.result==='draw' ? '🤝 تعادل' : '❌ خسارة')}</span>
    </div>`).join('');
}
async function rematch(){
  if(!currentRoom) return;
  if(session.role!=='p1' && session.role!=='p2') return;
  const { data, error } = await sb.rpc('cm_rematch', { p_code: session.code, p_expected_rev: currentRoom.rev });
  const result = Array.isArray(data) ? data[0] : data;
  if(!error && result && result.out_room){
    resetRoundXPTracking(); resetRoundKeys();
    lastPeekRevKey = null;
    renderRoom(result.out_room);
  }
}

/* ===================== 13) الاتصال اللحظي ===================== */
function mergeRoomPayload(incoming, prev){
  if(!prev) return incoming;
  const merged = { ...incoming };
  ['p1_name','p2_name','p1_avatar_color','p2_avatar_color','p1_avatar_data','p2_avatar_data'].forEach(key=>{
    if((merged[key]===undefined || merged[key]===null) && prev[key]){ merged[key] = prev[key]; }
  });
  return merged;
}
function subscribeToRoom(code){
  if(realtimeChannel) sb.removeChannel(realtimeChannel);
  realtimeChannel = sb.channel('cm-room-changes-'+code)
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'cm_rooms', filter:`code=eq.${code}` }, (payload)=>{
      const room = mergeRoomPayload(payload.new, currentRoom);
      if(animating){ currentRoom = room; return; }
      const shuffling = remoteShuffleTimers.p1 || remoteShuffleTimers.p2;
      if(shuffling){ currentRoom = room; setTimeout(()=>{ if(!animating) renderRoom(room); }, 700); }
      else renderRoom(room);
    })
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'cm_messages', filter:`room_code=eq.${code}` }, (payload)=> handleIncomingMessage(payload.new))
    .subscribe((status)=>{ setRtStatus(status==='SUBSCRIBED'); });

  if(window._cmRoomPoll) clearInterval(window._cmRoomPoll);
  window._cmRoomPoll = setInterval(async ()=>{
    if(!session.code) return;
    if(animating && animatingSince && (Date.now() - animatingSince > 5000)){
      console.warn('cm: animating تجمّد لأكثر من 5 ثوانٍ — إعادة ضبط قسرية');
      animating = false; animatingSince = null;
    }
    try{
      const { data:room } = await sb.from('cm_rooms').select('*').eq('code', session.code).single();
      if(room && !animating && (!currentRoom || currentRoom.rev !== room.rev || currentRoom.status !== room.status)){
        renderRoom(room);
      }
    }catch(e){}
    pollMissedMessages();
  }, 3000);
}
async function refreshRoomNow(){
  if(!session.code) return;
  try{ const { data:room } = await sb.from('cm_rooms').select('*').eq('code', session.code).single(); if(room && !animating) renderRoom(room); }catch(e){}
  pollMissedMessages();
}
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='visible' && session.code){ subscribeToRoom(session.code); subscribeToPresence(session.code); refreshRoomNow(); }
});
window.addEventListener('online', ()=>{
  hideOfflineSpinner();
  if(session.code){ subscribeToRoom(session.code); subscribeToPresence(session.code); refreshRoomNow(); }
});
async function pollMissedMessages(){
  if(!session.code) return;
  try{
    const { data } = await sb.from('cm_messages').select('*').eq('room_code', session.code).gt('id', lastMessageId).order('id', {ascending:true}).limit(20);
    (data||[]).forEach(handleIncomingMessage);
  }catch(e){}
}
function handleIncomingMessage(msg){
  if(!msg || (msg.id!=null && seenMessageIds.has(msg.id))) return;
  if(msg.id!=null){ seenMessageIds.add(msg.id); if(msg.id > lastMessageId) lastMessageId = msg.id; }
  chatHistory.push({role:msg.sender_role, name:msg.sender_name, content:msg.content});
  if(document.getElementById('chatSheetBg').classList.contains('show')) renderChatSheetBody();
  showChatStrip(msg.sender_role, msg.content, msg.sender_role!==session.role);
}
async function sendChatMessage(text){
  if(session.role!=='p1' && session.role!=='p2') return;
  const name = session.role==='p1' ? currentRoom.p1_name : currentRoom.p2_name;
  const saved = await sendMessage(session.code, session.role, name, text);
  if(saved){ seenMessageIds.add(saved.id); if(saved.id > lastMessageId) lastMessageId = saved.id; }
  chatHistory.push({role:session.role, name, content:text});
  if(document.getElementById('chatSheetBg').classList.contains('show')) renderChatSheetBody();
  showChatStrip(session.role, text, false);
}

function subscribeToPresence(code){
  if(presenceChannel) sb.removeChannel(presenceChannel);
  const presenceKey = session.role==='spectator' ? ('spectator-'+myId) : session.role;
  knownSpectatorKeys = new Set(); spectatorPresenceReady = false; spectatorNames = [];
  presenceChannel = sb.channel('cm-presence-'+code, { config:{ presence:{ key: presenceKey } } });
  presenceChannel
    .on('presence', {event:'sync'}, ()=>{
      const state = presenceChannel.presenceState();
      const liveP1El = document.getElementById('liveP1');
      const liveP2El = document.getElementById('liveP2');
      if(liveP1El) liveP1El.style.display = state['p1'] ? 'block':'none';
      if(liveP2El) liveP2El.style.display = state['p2'] ? 'block':'none';

      const spectatorEntries = Object.entries(state).filter(([key])=> key.startsWith('spectator-'));
      const currentKeys = new Set(spectatorEntries.map(([k])=>k));
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
    .on('broadcast', {event:'dice_result'}, ({payload})=> playRemoteDiceResult(payload.role, payload.color))
    .subscribe(async (status)=>{ if(status==='SUBSCRIBED') await presenceChannel.track({role:session.role, name:localProfile?.username||'', at:Date.now()}); });
}

function leaveRoom(){
  if(window._cmRoomPoll) clearInterval(window._cmRoomPoll);
  if(realtimeChannel){ sb.removeChannel(realtimeChannel); realtimeChannel=null; }
  if(presenceChannel){ sb.removeChannel(presenceChannel); presenceChannel=null; }
  clearAllChatStrips();
  clearTurnTimer();
  clearWatchdogTimer();
  clearInterval(remoteShuffleTimers.p1); clearInterval(remoteShuffleTimers.p2);
  clearTimeout(remoteShuffleSafety.p1); clearTimeout(remoteShuffleSafety.p2);
  remoteShuffleTimers.p1 = null; remoteShuffleTimers.p2 = null;
  remoteShuffleSafety.p1 = null; remoteShuffleSafety.p2 = null;
  session.code=null; session.role=null; currentRoom=null;
  animating = false; animatingSince = null;
  lastMessageId = 0; seenMessageIds.clear(); lastTurnKey = null; lastPeekRevKey = null; currentBoardSize = null;
  chatHistory = [];
  spectatorNames = []; knownSpectatorKeys = new Set(); spectatorPresenceReady = false;
  resetRoundXPTracking(); resetRoundKeys();
  renderSpectatorBadge();
  document.body.classList.remove('is-spectator');
  clearSession();
}

/* ===================== 14) ربط الواجهة والإقلاع ===================== */
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
function showRoomEndedModal(){ showScreen('home'); loadGlobalCounter(); document.getElementById('roomEndedModal').style.display='flex'; }
function handleRoomEndedRemotely(){
  leaveRoom();
  showRoomEndedModal();
}
function handleJoinError(error){
  if(error === 'ENDED'){ showRoomEndedModal(); return; }
  alert(joinErrorText(error));
  resetToHome();
}
document.getElementById('btnRoomEndedHome').addEventListener('click', ()=>{ document.getElementById('roomEndedModal').style.display='none'; resetToHome(); });

async function resumeSavedSession(code, fallbackLinkCode){
  try{
    const { data:room } = await sb.from('cm_rooms').select('*').eq('code', code).single();
    const isP1 = room && room.p1_user_id === myId;
    const isP2 = room && room.p2_user_id === myId;
    const savedInfo = loadSession();
    if(room && room.status !== 'finished' && room.status !== 'ended' && (isP1 || isP2 || (savedInfo && savedInfo.role==='spectator'))){
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
    if(error){ handleJoinError(error); return false; }
    await loadChatHistory(fallbackLinkCode);
    enterGameScreen(room);
    return false;
  }
  resetToHome();
  return false;
}
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
    clearSession();
    const { room, error } = await joinRoomByCode(newCode);
    if(history.replaceState) history.replaceState({}, '', location.pathname);
    if(error){ handleJoinError(error); return; }
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
  if(currentRoom) renderRoom(currentRoom);
  document.getElementById('editModal').style.display='none';
});

document.querySelectorAll('[data-tab]').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    ['create','join','quick'].forEach(k=> document.getElementById('pane-'+k).style.display = (t.dataset.tab===k)?'block':'none');
  });
});
document.querySelectorAll('.size-tab').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('.size-tab').forEach(x=>x.classList.remove('sel'));
    t.classList.add('sel'); selectedBoardSize = +t.dataset.size;
  });
});

document.getElementById('btnCreate').addEventListener('click', async ()=>{
  const { code, room, error } = await createRoom(selectedBoardSize);
  if(error){ alert(error); return; }
  await loadChatHistory(code);
  enterGameScreen(room);
});
document.getElementById('btnJoin').addEventListener('click', async ()=>{
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  const errBox = document.getElementById('joinError'); errBox.style.display='none';
  if(!code){ errBox.textContent='الرجاء إدخال رمز الجولة أو فتح رابط الدعوة'; errBox.style.display='block'; return; }
  const { room, error } = await joinRoomByCode(code);
  if(error){ errBox.textContent=joinErrorText(error); errBox.style.display='block'; return; }
  await loadChatHistory(code);
  enterGameScreen(room);
});

document.getElementById('btnTbCopy').addEventListener('click', ()=>{
  const input = document.getElementById('tbLinkInput');
  const link = input.value;
  if(!link || link==='رابط الدعوة…') return;
  navigator.clipboard?.writeText(link).then(()=>{
    const btn = document.getElementById('btnTbCopy');
    const old = btn.textContent;
    btn.textContent = '✅ تم';
    btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent = old; btn.classList.remove('copied'); }, 1500);
  });
});

document.getElementById('btnQuickMatch').addEventListener('click', async ()=>{
  showScreen('matching');
  document.getElementById('matchSearching').style.display='block';
  document.getElementById('matchFound').style.display='none';
  await mmStartSearch(localProfile, {
    onFound: ({opponent, isInitiator, roomCode})=>{
      document.getElementById('matchSearching').style.display='none';
      document.getElementById('matchFound').style.display='block';
      applyAvatarVisual(document.getElementById('matchMeAvatar'), localProfile.avatar_color, localProfile.avatar_data, localProfile.username[0]);
      applyAvatarVisual(document.getElementById('matchOppAvatar'), opponent.avatar_color, opponent.avatar_data, opponent.username[0]);
      document.getElementById('matchOppName').textContent = opponent.username;
      let remaining = 20;
      const timerEl = document.getElementById('matchTimer');
      timerEl.textContent = `⏱ ${remaining} ثانية للموافقة`;
      clearInterval(matchCountdownTimer);
      matchCountdownTimer = setInterval(()=>{
        remaining--; timerEl.textContent = `⏱ ${remaining} ثانية للموافقة`;
        if(remaining<=0) clearInterval(matchCountdownTimer);
      }, 1000);
      window._mmIsInitiator = isInitiator; window._mmRoomCode = roomCode;
    },
    onBothAccepted: async ({isInitiator, roomCode})=>{
      clearInterval(matchCountdownTimer);
      if(isInitiator){
        const { code, room, error } = await createRoom(QUICK_MATCH_BOARD_SIZE, roomCode);
        if(error){ resetToHome(); return; }
        await loadChatHistory(code);
        enterGameScreen(room);
      } else {
        await sleep(400);
        const { room, error } = await joinRoomByCode(roomCode);
        if(error){ resetToHome(); return; }
        await loadChatHistory(roomCode);
        enterGameScreen(room);
      }
    },
    onCancelled: (msg)=>{ clearInterval(matchCountdownTimer); showScreen('home'); loadGlobalCounter(); },
    onTimeout: ()=>{ showScreen('home'); loadGlobalCounter(); }
  });
});
document.getElementById('btnCancelMatch').addEventListener('click', async ()=>{ await mmCancelSearch(); showScreen('home'); loadGlobalCounter(); });
document.getElementById('btnAcceptMatch').addEventListener('click', ()=> mmRespond(true));
document.getElementById('btnDeclineMatch').addEventListener('click', ()=> mmRespond(false));

document.getElementById('btnLeave').addEventListener('click', async ()=>{
  const isSpectator = session.role === 'spectator';
  const msg = isSpectator ? 'هل تريد الخروج من وضع المشاهدة؟' : 'هل تريد مغادرة الجولة؟ سيُعلن الطرف الآخر فائزًا فورًا.';
  if(!confirm(msg)) return;
  if(!isSpectator) await handleLeaveAsLoss();
  resetToHome();
});
/* ====== مغادرة بزر الخروج أثناء جولة نشطة = فوز فوري للخصم — لا تُشترط أي
   مطابقة رقم تزامن (rev) هنا خلافًا للرمي/السحب العاديين: يجب أن تنجح
   المغادرة دومًا حتى لو تغيّرت حالة الغرفة للتو (كأن يرمي الخصم النرد في
   نفس اللحظة)، وإلا بقي الخصم بلا أي إشعار فوز. ======*/
async function handleLeaveAsLoss(){
  if(session.role!=='p1' && session.role!=='p2') return;
  if(!session.code || !currentRoom) return;
  if(currentRoom.status === 'waiting' && session.role==='p1'){
    try{ await sb.rpc('cm_delete_empty_room', { p_code: session.code, p_role:'p1' }); }catch(e){}
  } else if(currentRoom.status === 'playing'){
    try{ await sb.rpc('cm_forfeit_room', { p_code: session.code, p_role: session.role }); }catch(e){}
  }
}
document.getElementById('btnPlayAgain').addEventListener('click', ()=>{ document.getElementById('winModal').style.display='none'; resetToHome(); });
document.getElementById('btnRematch').addEventListener('click', ()=>{ document.getElementById('winModal').style.display='none'; rematch(); });

document.getElementById('btnSendChat').addEventListener('click', ()=>{
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if(!text) return;
  sendChatMessage(text);
  input.value='';
});
document.getElementById('chatInput').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ document.getElementById('btnSendChat').click(); }
});

document.getElementById('btnSound').addEventListener('click', ()=>{
  soundOn = !soundOn;
  document.getElementById('btnSound').textContent = soundOn ? '🔊' : '🔇';
  if(localProfile) updateProfile({ sound_on: soundOn });
});

document.getElementById('btnRollP1').addEventListener('click', ()=> rollDice('p1', false));
document.getElementById('btnRollP2').addEventListener('click', ()=> rollDice('p2', false));

/* ===================== 15) الإقلاع ===================== */
async function afterProfileReady(){
  showScreen('home');
  loadGlobalCounter();
  initReactionButtons();

  const params = new URLSearchParams(location.search);
  const linkCode = params.get('r');
  const savedInfo = loadSession();

  if(linkCode && savedInfo && savedInfo.code && savedInfo.code !== linkCode){
    presentRoomConflict(savedInfo.code, linkCode);
    return;
  }
  if(linkCode){
    const { room, error } = await joinRoomByCode(linkCode);
    if(history.replaceState) history.replaceState({}, '', location.pathname);
    if(error){ handleJoinError(error); return; }
    await loadChatHistory(linkCode);
    enterGameScreen(room);
    return;
  }
  if(savedInfo && savedInfo.code){
    await resumeSavedSession(savedInfo.code);
  }
}

async function boot(){
  if(!isConfigured){ document.getElementById('setupWarning').style.display='block'; setDbStatus(false); return; }
  setDbStatus(true);
  await ensureAnonymousSession();
  buildDiceFaces();
  const existing = await loadExistingProfile();
  if(existing){
    localProfile = existing;
    soundOn = existing.sound_on !== false;
    paintMiniUserbar();
    await afterProfileReady();
  } else {
    showScreen('onboarding');
  }
}
boot();