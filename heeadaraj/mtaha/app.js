// ======================================================================
// متاهة الهروب — حرب المتاهة: سباق + قتال مباشر لـ 2 أو 4 لاعبين
// نسخة المنافسة الحادة: متاهة مشتركة + مفتاح + باب + نداءات + 3 مستويات
// ======================================================================

/* ===================== 0) عارض أخطاء مرئي (تشخيصي) ===================== */
(function setupVisibleErrorOverlay(){
  let shown = false;
  function showError(title, detail){
    if(shown) return; shown = true;
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(20,4,4,.94);'
      + 'color:#fff;font-family:monospace,sans-serif;padding:18px;overflow:auto;direction:ltr;text-align:left;';
    box.innerHTML = '<div style="font-size:16px;font-weight:800;color:#ff6b6b;margin-bottom:10px;">'
      + '⚠️ خطأ برمجي أوقف اللعبة — الرجاء تصوير هذه الشاشة كاملة:</div>'
      + '<div style="font-size:13px;margin-bottom:8px;white-space:pre-wrap;">' + title + '</div>'
      + '<pre style="font-size:11px;opacity:.8;white-space:pre-wrap;">' + detail + '</pre>'
      + '<button id="__errCloseBtn" style="margin-top:14px;padding:8px 16px;border:none;border-radius:8px;'
      + 'background:#444;color:#fff;">إغلاق</button>';
    document.body.appendChild(box);
    document.getElementById('__errCloseBtn').addEventListener('click', ()=> box.remove());
  }
  window.addEventListener('error', (e)=>{
    showError((e.message||'خطأ غير معروف') + (e.filename ? ' — ' + e.filename + ':' + e.lineno : ''), (e.error && e.error.stack) || '');
  });
  window.addEventListener('unhandledrejection', (e)=>{
    const reason = e.reason;
    showError('خطأ غير متزامن (Promise): ' + (reason && reason.message ? reason.message : String(reason)), (reason && reason.stack) || '');
  });
})();

/* ===================== 1) الاتصال بسوبابيس ===================== */
const SUPABASE_URL      = "https://yebntvnbuufthdsjqwyx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllYm50dm5idXVmdGhkc2pxd3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MjA4MDIsImV4cCI6MjEwMTQ5NjgwMn0.dtMOlp2jS8oRttfJjsMMZTUFprrAnbfNFiBpx__4lGE";
const isConfigured = !SUPABASE_URL.includes("ضع_") && !SUPABASE_ANON_KEY.includes("ضع_");
const sb = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ===================== 2) الهوية — نفس حساب الحية والسلم ===================== */
const AVATAR_COLORS = ['#E5484D','#2F7DE1','#3EA06B','#F2B705','#8E5CF2','#FF6F59','#17A2B8','#D6336C'];
const ROLE_COLORS = { p1:'#E5484D', p2:'#2F7DE1', p3:'#3EA06B', p4:'#F2B705' };
let profile = null;
let myAuthUid = null;

function getLocalUserId(){
  let id = localStorage.getItem('snl_user_id');
  if(!id){ id = (crypto.randomUUID ? crypto.randomUUID() : ('u-'+Date.now()+'-'+Math.random().toString(16).slice(2))); localStorage.setItem('snl_user_id', id); }
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
  }catch(e){ console.error(e); return null; }
}
async function loadExistingProfile(){
  const { data } = await sb.from('profiles').select('*').eq('id', myId).maybeSingle();
  if(data){ profile = data; return data; }
  return null;
}
async function createProfile(username, avatarDataUrl, color){
  const { data, error } = await sb.from('profiles').insert({ id: myId, auth_uid: myAuthUid, username, avatar_color: color, avatar_data: avatarDataUrl || null }).select().single();
  if(!error) profile = data;
  return { data, error };
}
function applyAvatarVisual(el, color, dataUrl, initial){
  if(dataUrl){ el.style.backgroundImage = `url(${dataUrl})`; el.style.backgroundColor='transparent'; el.textContent=''; }
  else { el.style.backgroundImage='none'; el.style.backgroundColor = color || '#E5484D'; if(initial!==undefined) el.textContent = initial; }
}

/* ===================== 3) خوارزميات المتاهة ===================== */
const DIRS = [
  {d:'N', dr:-1, dc:0, opp:'S'}, {d:'E', dr:0, dc:1, opp:'W'},
  {d:'S', dr:1, dc:0, opp:'N'}, {d:'W', dr:0, dc:-1, opp:'E'},
];
const DIR_MAP = { up:'N', right:'E', down:'S', left:'W' };

function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rotatePos(r,c,N){ return [c, N-1-r]; }
function rotateWallsOnce(cell){ return { N: cell.W, E: cell.N, S: cell.E, W: cell.S }; }

/* ====== المتاهة المتماثلة (القديمة — للتوافق) ====== */
function buildSymmetricMaze(seed, N, k){
  const rand = mulberry32(seed);
  const center = (N-1)/2;
  const idx = (r,c)=> r*N+c;
  const cells = new Array(N*N);
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) cells[idx(r,c)] = {N:true,E:true,S:true,W:true};
  const inDomain = k===2
    ? ((r,c)=> (r < center) || (r === center && c <= center))
    : ((r,c)=> (r <= center) && (c > center));
  const visited = new Array(N*N).fill(false);
  visited[idx(center,center)] = true;
  const stack = [[center, center]];
  while(stack.length){
    const [r,c] = stack[stack.length-1];
    const options = [];
    for(const dir of DIRS){
      const nr = r+dir.dr, nc = c+dir.dc;
      if(nr<0||nc<0||nr>=N||nc>=N) continue;
      if(!inDomain(nr,nc)) continue;
      if(visited[idx(nr,nc)]) continue;
      options.push(dir);
    }
    if(options.length===0){ stack.pop(); continue; }
    const dir = options[Math.floor(rand()*options.length)];
    const nr = r+dir.dr, nc = c+dir.dc;
    cells[idx(r,c)][dir.d] = false;
    cells[idx(nr,nc)][dir.opp] = false;
    visited[idx(nr,nc)] = true;
    stack.push([nr,nc]);
  }
  const quarterSteps = 4 / k;
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    if(!inDomain(r,c)) continue;
    const original = cells[idx(r,c)];
    for(let t=1;t<k;t++){
      let pr=r, pc=c, cell = original;
      const steps = t*quarterSteps;
      for(let s=0;s<steps;s++){ [pr,pc] = rotatePos(pr,pc,N); cell = rotateWallsOnce(cell); }
      if(pr===r && pc===c) continue;
      cells[idx(pr,pc)] = {...cell};
    }
  }
  const rc = cells[idx(center,center)];
  if(k===2){ rc.S = rc.N; rc.E = rc.W; }
  else { const anyOpen = !rc.N || !rc.E || !rc.S || !rc.W; rc.N = rc.E = rc.S = rc.W = !anyOpen; }
  const dist = new Array(N*N).fill(-1);
  const parentDir = new Array(N*N).fill(null);
  dist[idx(center,center)] = 0;
  let qHead = 0; const queue = [[center,center]];
  let maxDist = 0;
  while(qHead < queue.length){
    const [r,c] = queue[qHead++];
    const cell = cells[idx(r,c)];
    for(const dir of DIRS){
      if(cell[dir.d]) continue;
      const nr=r+dir.dr, nc=c+dir.dc;
      if(nr<0||nc<0||nr>=N||nc>=N) continue;
      if(dist[idx(nr,nc)]!==-1) continue;
      dist[idx(nr,nc)] = dist[idx(r,c)]+1;
      maxDist = Math.max(maxDist, dist[idx(nr,nc)]);
      parentDir[idx(nr,nc)] = dir.opp;
      queue.push([nr,nc]);
    }
  }
  const rotN = (r,c,steps)=>{ let pr=r,pc=c; for(let s=0;s<steps;s++) [pr,pc]=rotatePos(pr,pc,N); return [pr,pc]; };
  return { N, k, cells, dist, parentDir, idx, center, rotN, quarterSteps, rand, maxDist, inDomain };
}

/* ====== المتاهة المشتركة الجديدة (جميع اللاعبين في نفس المتاهة) ====== */
function buildSharedMaze(seed, N){
  const rand = mulberry32(seed);
  const idx = (r,c)=> r*N+c;
  const cells = new Array(N*N);
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) cells[idx(r,c)] = {N:true,E:true,S:true,W:true};

  const visited = new Array(N*N).fill(false);
  visited[idx(0,0)] = true;
  const stack = [[0,0]];

  while(stack.length){
    const [r,c] = stack[stack.length-1];
    const options = [];
    for(const dir of DIRS){
      const nr=r+dir.dr, nc=c+dir.dc;
      if(nr<0||nc<0||nr>=N||nc>=N) continue;
      if(visited[idx(nr,nc)]) continue;
      options.push(dir);
    }
    if(options.length===0){ stack.pop(); continue; }
    const dir = options[Math.floor(rand()*options.length)];
    const nr=r+dir.dr, nc=c+dir.dc;
    cells[idx(r,c)][dir.d] = false;
    cells[idx(nr,nc)][dir.opp] = false;
    visited[idx(nr,nc)] = true;
    stack.push([nr,nc]);
  }

  const centerR = Math.floor(N/2), centerC = Math.floor(N/2);
  const dist = new Array(N*N).fill(-1);
  const parentDir = new Array(N*N).fill(null);
  dist[idx(centerR,centerC)] = 0;
  let qHead=0; const queue=[[centerR,centerC]];
  let maxDist=0;
  while(qHead<queue.length){
    const [r,c]=queue[qHead++];
    const cell=cells[idx(r,c)];
    for(const dir of DIRS){
      if(cell[dir.d]) continue;
      const nr=r+dir.dr, nc=c+dir.dc;
      if(nr<0||nc<0||nr>=N||nc>=N) continue;
      if(dist[idx(nr,nc)]!==-1) continue;
      dist[idx(nr,nc)] = dist[idx(r,c)]+1;
      maxDist = Math.max(maxDist, dist[idx(nr,nc)]);
      parentDir[idx(nr,nc)] = dir.opp;
      queue.push([nr,nc]);
    }
  }

  return { N, cells, dist, parentDir, idx, maxDist, rand, center: [centerR, centerC] };
}

function getStartPositions(N, maxPlayers){
  if(maxPlayers === 2) return [[0,0], [N-1, N-1]];
  return [[0,0], [0,N-1], [N-1,0], [N-1,N-1]];
}

function buildSharedGuards(maze, count){
  const guards = [];
  const used = new Set();
  let attempts = 0;
  while(guards.length < count && attempts < 3000){
    attempts++;
    const r = Math.floor(maze.rand() * maze.N);
    const c = Math.floor(maze.rand() * maze.N);
    const d = maze.dist[maze.idx(r,c)];
    if(d < 4 || d > maze.maxDist - 2) continue;
    const key = `${r},${c}`;
    if(used.has(key)) continue;
    used.add(key);
    const path = [[r,c]];
    let cr=r, cc=c;
    for(let i=0; i<8; i++){
      const dirs = DIRS.filter(d => !maze.cells[maze.idx(cr,cc)][d.d]);
      if(dirs.length === 0) break;
      const dir = dirs[Math.floor(maze.rand() * dirs.length)];
      cr += dir.dr; cc += dir.dc;
      path.push([cr,cc]);
    }
    if(path.length < 4) continue;
    guards.push({ path, phase: Math.floor(maze.rand() * path.length * 2) });
  }
  return guards;
}

function placeSharedEntities(maze, bonusCount, trapCount, ammoCount){
  const { N, dist, idx, rand } = maze;
  const candidates = [];
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) {
    if(dist[idx(r,c)] < 2) continue;
    candidates.push([r,c]);
  }
  for(let i=candidates.length-1;i>0;i--){
    const j = Math.floor(rand()*(i+1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const EFFECTS = ['speed','shield','reveal','freeze'];
  const bonuses=[], traps=[], ammoBoxes=[];
  let ci=0;
  for(let i=0;i<bonusCount && ci<candidates.length; i++, ci++){
    bonuses.push({ pos: candidates[ci], effect: EFFECTS[i%EFFECTS.length], taken: false });
  }
  for(let i=0;i<trapCount && ci<candidates.length; i++, ci++){
    traps.push({ pos: candidates[ci], taken: false });
  }
  for(let i=0;i<ammoCount && ci<candidates.length; i++, ci++){
    ammoBoxes.push({ pos: candidates[ci], taken: false });
  }
  let keyPos = null;
  for(let i=ci; i<candidates.length; i++){
    const [r,c] = candidates[i];
    if(dist[idx(r,c)] > N/3) { keyPos = [r,c]; break; }
  }
  if(!keyPos) keyPos = candidates[ci] || [N-2, N-2];
  return { bonuses, traps, ammoBoxes, keyPos };
}

// حرّاس القديم (للتوافق)
function buildGuards(maze, countPerDomain){
  const { N, dist, parentDir, idx, rand, k, quarterSteps, rotN, inDomain } = maze;
  const patrolLen = Math.max(6, Math.floor(N/2.2));
  const guards = [];
  const used = new Set();
  let attempts = 0;
  while(guards.length < countPerDomain && attempts < 500){
    attempts++;
    const r = Math.floor(rand()*N), c = Math.floor(rand()*N);
    if(!inDomain(r,c)) continue;
    if(dist[idx(r,c)] < patrolLen+2) continue;
    const path = [[r,c]];
    let cr=r, cc=c;
    for(let i=0;i<patrolLen;i++){
      const pd = parentDir[idx(cr,cc)];
      if(!pd) break;
      const dir = DIRS.find(x=>x.d===pd);
      cr += dir.dr; cc += dir.dc;
      path.push([cr,cc]);
    }
    if(path.length < 4) continue;
    const key = path[0].join(',');
    if(used.has(key)) continue;
    used.add(key);
    const paths = [];
    for(let t=0;t<k;t++) paths.push(path.map(([pr,pc])=>rotN(pr,pc,t*quarterSteps)));
    guards.push({ paths, phase: Math.floor(rand()*path.length*2) });
  }
  return guards;
}
function guardPositionAt(guard, slot, elapsedMs, moveMs){
  const path = guard.paths[slot];
  const period = (path.length-1)*2;
  if(period<=0) return path[0];
  const steps = Math.floor(elapsedMs/moveMs) + guard.phase;
  let t = steps % period; if(t<0) t += period;
  const pos = t <= (path.length-1) ? t : period - t;
  return path[pos];
}

/* ===================== 4) توزيع المكافآت/الفخاخ/الذخيرة (القديم) ===================== */
function placeEntities(maze, bonusPerDomain, trapPerDomain, ammoPerDomain){
  const { N, dist, idx, rand, k, quarterSteps, rotN, inDomain, center } = maze;
  const forbidden = new Set([`${center},${center}`]);
  const candidates = [];
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    if(!inDomain(r,c)) continue;
    if(forbidden.has(`${r},${c}`)) continue;
    if(dist[idx(r,c)] < 2) continue;
    candidates.push([r,c]);
  }
  for(let i=candidates.length-1;i>0;i--){
    const j = Math.floor(rand()*(i+1));
    [candidates[i],candidates[j]] = [candidates[j],candidates[i]];
  }
  const EFFECTS = ['speed','shield','reveal','freeze'];
  const bonuses=[], traps=[], ammoBoxes=[];
  let ci=0;
  const makeSpots = (r,c)=>{ const spots=[]; for(let t=0;t<k;t++) spots.push(rotN(r,c,t*quarterSteps)); return spots; };
  for(let i=0;i<bonusPerDomain && ci<candidates.length; i++, ci++){
    const [r,c]=candidates[ci];
    bonuses.push({ spots: makeSpots(r,c), effect: EFFECTS[i%EFFECTS.length], taken: new Array(k).fill(false) });
  }
  for(let i=0;i<trapPerDomain && ci<candidates.length; i++, ci++){
    const [r,c]=candidates[ci];
    traps.push({ spots: makeSpots(r,c), taken: new Array(k).fill(false) });
  }
  for(let i=0;i<ammoPerDomain && ci<candidates.length; i++, ci++){
    const [r,c]=candidates[ci];
    ammoBoxes.push({ spots: makeSpots(r,c), taken: new Array(k).fill(false) });
  }
  return { bonuses, traps, ammoBoxes };
}

/* ===================== 5) الرماية ===================== */
function raycastPath(maze, r, c, dir, maxRange){
  const path = [[r,c]];
  let cr=r, cc=c;
  const dirObj = DIRS.find(x=>x.d===dir);
  for(let i=0;i<maxRange;i++){
    const cell = maze.cells[maze.idx(cr,cc)];
    if(cell[dir]) break;
    cr += dirObj.dr; cc += dirObj.dc;
    if(cr<0||cc<0||cr>=maze.N||cc>=maze.N) break;
    path.push([cr,cc]);
  }
  return path;
}

/* ===================== 6) إعدادات الصعوبة — 3 مستويات جديدة ===================== */
const DIFFS = {
  normal: { baseN:17, guardsCount:4, guardSpeed:480, timeLimit:280, bonusCount:5, trapCount:2, ammoCount:2, wallShiftInterval:20000, label:'عادي' },
  bronze: { baseN:23, guardsCount:8, guardSpeed:360, timeLimit:340, bonusCount:4, trapCount:4, ammoCount:2, wallShiftInterval:12000, label:'برونزي' },
  gold:   { baseN:29, guardsCount:14, guardSpeed:260, timeLimit:400, bonusCount:6, trapCount:6, ammoCount:3, wallShiftInterval:8000, label:'ذهبي' }
};
const FIRE_COOLDOWN = 900, MAX_AMMO = 6, START_AMMO = 3, SHOT_RANGE = 9;
const AMMO_REGEN_MS = 11000;
const ZONE_START_RATIO = 0.55, ZONE_MIN_RADIUS = 5, ZONE_DAMAGE_INTERVAL = 2200;

/* ===================== 7) حالة اللعبة العامة ===================== */
let localProfile = null;
let soundOn = true;
let currentDiff = 'normal';
let currentPlayers = 2;
let session = { code:null, role:null, slot:0 };
let currentRoom = null;
let dbChannel = null, liveChannel = null;
let roundStarted = false;

let maze = null, guards = [], ents = null;
let myPos = [0,0], myFacing = 'S';
let myLives = 3, myAmmo = START_AMMO;
let hintUsesLeft = 3;
let activeEffects = {};
let moveCooldown = 190;
let lastMoveAt = 0, lastFireAt = 0, lastAmmoRegenAt = 0;
let gameOver = false, roundStartTs = 0, timeLimitMs = 0;
let rafId = null;
let lastPosBroadcast = 0;
let zoneWarnShownAt = 0, lastZoneDamageAt = 0;

// نظام المفتاح والباب الجديد
let exitLocation = null;
let doorOpen = false;
let keyHolder = null;

// حالة بقية اللاعبين
let players = {};

function roleForSlot(slot){ return 'p'+(slot+1); }
function slotForRole(role){ return parseInt(role.slice(1),10)-1; }

/* ===================== 8) إنشاء/الانضمام للغرفة ===================== */
function randomRoomCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s=''; for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}
async function createMazeRoom(diff, maxPlayers){
  if(!localProfile) return { error: { message: 'الرجاء تسجيل الدخول أولاً' } };
  const code = randomRoomCode();
  const seed = Math.floor(Math.random()*2**31);
  const row = {
    code, seed, difficulty: diff, max_players: maxPlayers, status:'waiting',
    p1_user_id: myId, p1_auth: myAuthUid,
    p1_name: localProfile.username, p1_avatar_color: localProfile.avatar_color, p1_avatar_data: localProfile.avatar_data,
  };
  const { data, error } = await sb.from('maze_rooms').insert(row).select().single();
  if(error) return { error };
  session = { code, role:'p1', slot:0 };
  return { room: data };
}
async function joinMazeRoomByCode(code){
  if(!localProfile) return { error: { message: 'الرجاء تسجيل الدخول أولاً' } };
  code = code.trim().toUpperCase();
  const { data, error } = await sb.rpc('join_maze_room', {
    p_code: code, p_user_id: myId, p_auth: myAuthUid,
    p_name: localProfile.username, p_avatar_color: localProfile.avatar_color, p_avatar_data: localProfile.avatar_data
  });
  if(error){ return { error }; }
  const rows = Array.isArray(data) ? data : [data];
  const room = rows[0];
  if(!room){ return { error: {message:'الغرفة ممتلئة أو غير موجودة'} }; }
  let mySlot = -1;
  for(let s=0;s<(room.max_players||2);s++){
    if(room['p'+(s+1)+'_user_id'] === myId){ mySlot = s; break; }
  }
  if(mySlot===-1){ return { error: {message:'تعذّر تأكيد مقعدك في الغرفة — قد تكون ممتلئة'} }; }
  session = { code, role: roleForSlot(mySlot), slot: mySlot };
  return { room };
}
function subscribeRoomChanges(code, onUpdate){
  if(dbChannel){ sb.removeChannel(dbChannel); dbChannel = null; }
  dbChannel = sb.channel('maze-db-'+code)
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'maze_rooms', filter:`code=eq.${code}` },
      async payload => await onUpdate(payload.new))
    .subscribe();
  return dbChannel;
}
function cleanupChannels(){
  if(dbChannel){ sb.removeChannel(dbChannel); dbChannel = null; }
  if(liveChannel){ sb.removeChannel(liveChannel); liveChannel = null; }
  roundStarted = false; 
  gameOver = false;
  maze = null; 
  players = {};
  const gc = document.getElementById('game-container');
  if(gc) gc.style.display = 'none';
}

/* ===================== 9) القناة اللحظية ===================== */
function joinLiveChannel(code){
  if(liveChannel){ sb.removeChannel(liveChannel); liveChannel = null; }
  const ch = sb.channel('maze-live-'+code, { config: { broadcast:{ self:false }, presence:{ key: session.role } } });

  ch.on('broadcast', { event:'move' }, ({payload})=>{
    const p = players[payload.role]; if(!p || payload.role===session.role) return;
    p.pos = [payload.r, payload.c]; p.facing = payload.dir; p.lastSeen = Date.now();
  });
  ch.on('broadcast', { event:'shoot' }, ({payload})=>{
    if(payload.role===session.role) return;
    handleIncomingShot(payload);
  });
  ch.on('broadcast', { event:'hit' }, ({payload})=>{
    const p = players[payload.role]; if(!p) return;
    p.lives = payload.lives; p.eliminated = payload.lives<=0;
    const SRC_LABEL = { shot:`أصابه ${playerLabel(payload.shooterRole)} 🔫`, guard:'أمسكه حارس 👮', zone:'أنهكته المنطقة الآمنة 🌀' };
    pushKillFeed(`${playerLabel(payload.role)}: ${SRC_LABEL[payload.source] || 'خسر قلبًا'}${payload.lives<=0?' — أُقصي!':''}`);
    checkLastManStanding();
  });
  ch.on('broadcast', { event:'pickup' }, ({payload})=>{
    applyRemotePickup(payload);
  });
  ch.on('broadcast', { event:'shout' }, ({payload})=>{
    if(payload.role === session.role) return;
    showShoutBubble(payload.role, payload.message);
  });
  ch.on('presence', { event:'leave' }, ({key})=>{
    if(key===session.role) return;
    const p = players[key]; if(!p || p.eliminated) return;
    p.eliminated = true; p.lives = 0;
    pushKillFeed(`${playerLabel(key)} غادر المعركة 🚪`);
    checkLastManStanding();
  });
  ch.subscribe(async (status)=>{
    if(status==='SUBSCRIBED'){ try{ await ch.track({ role: session.role, joinedAt: Date.now() }); }catch(e){} }
  });
  liveChannel = ch;
  return ch;
}
function broadcastMove(){
  if(!liveChannel) return;
  liveChannel.send({ type:'broadcast', event:'move', payload:{ role:session.role, r:myPos[0], c:myPos[1], dir:myFacing } });
}
function broadcastShoot(r,c,dir){
  if(!liveChannel) return;
  liveChannel.send({ type:'broadcast', event:'shoot', payload:{ role:session.role, r, c, dir, t: Date.now() } });
}
function broadcastHit(targetRole, shooterRole, lives, source){
  if(!liveChannel) return;
  liveChannel.send({ type:'broadcast', event:'hit', payload:{ role: targetRole, shooterRole: shooterRole||null, lives, source: source||'shot' } });
}
function broadcastPickup(kind, entIndex, spotIndex){
  if(!liveChannel) return;
  liveChannel.send({ type:'broadcast', event:'pickup', payload:{ kind, entIndex, spotIndex, role: session.role } });
}
function broadcastShout(message){
  if(!liveChannel) return;
  liveChannel.send({ type:'broadcast', event:'shout', payload:{ role: session.role, message, t: Date.now() } });
}
function playerLabel(role){
  const p = players[role]; return p ? p.name : role;
}

/* ===================== 10) إنهاء الجولة ===================== */
async function reportResult(winnerRole, reason){
  try{ await sb.rpc('report_maze_result', { p_code: session.code, p_winner: winnerRole, p_reason: reason }); }catch(e){ console.error(e); }
}

/* ===================== 11) بدء الجولة (القديم — للتوافق) ===================== */
function collectPlayersFromRoom(room){
  const out = {};
  for(let s=0;s<room.max_players;s++){
    const role = roleForSlot(s);
    const uid = room['p'+(s+1)+'_user_id'];
    if(!uid) continue;
    out[role] = {
      name: room['p'+(s+1)+'_name'] || '؟',
      color: room['p'+(s+1)+'_avatar_color'] || ROLE_COLORS[role],
      avatarData: room['p'+(s+1)+'_avatar_data'] || null,
      slot: s, pos: null, facing: 'S', lives: 3, eliminated:false, lastSeen: 0,
    };
  }
  return out;
}
function showWarBanner(room){
  const names = Object.values(players).map(p=>p.name).join(' ⚔️ ');
  document.getElementById('warSub').textContent = names;
  const b = document.getElementById('warBanner');
  b.classList.add('show');
  setTimeout(()=> b.classList.remove('show'), 2000);
}

/* ===================== 12) شريط اللاعبين ===================== */
function buildRaceStrip(){
  const strip = document.getElementById('raceStrip');
  if(!strip) return;
  strip.innerHTML = '';
  const roles = Object.keys(players).sort();
  for(const role of roles){
    const p = players[role];
    const chip = document.createElement('div');
    chip.className = 'player-chip' + (role===session.role?' me':'');
    chip.id = 'chip-'+role;
    chip.innerHTML = `
      <div class="pc-avatar" style="${p.avatarData?`background-image:url(${p.avatarData})`:`background-color:${p.color}`}"></div>
      <div class="pc-info">
        <div class="pc-name">${p.name}</div>
        <div class="pc-lives" id="lives-${role}">❤️❤️❤️</div>
        <div class="pc-track"><div class="pc-fill" id="fill-${role}"></div></div>
      </div>`;
    strip.appendChild(chip);
  }
}
function updateRaceStripUI(){
  for(const role in players){
    const p = players[role];
    const livesEl = document.getElementById('lives-'+role);
    if(livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0,p.lives)) + '🖤'.repeat(3-Math.max(0,Math.min(3,p.lives)));
    const chip = document.getElementById('chip-'+role);
    if(chip) chip.classList.toggle('eliminated', !!p.eliminated);
    const fillEl = document.getElementById('fill-'+role);
    if(fillEl && maze){
      let d;
      if(role===session.role) d = maze.dist[maze.idx(...myPos)];
      else if(p.pos) d = maze.dist[maze.idx(...p.pos)];
      if(d!==undefined){
        const pct = Math.max(0, Math.min(1, 1 - d/Math.max(1,maze.maxDist))) * 100;
        fillEl.style.width = pct+'%';
      }
    }
  }
}

/* ===================== 13) الرسم على Canvas (القديم — للتوافق) ===================== */
const canvas = () => document.getElementById('mazeCanvas');
let cellPx = 24;
function sizeCanvas(){
  const wrap = document.querySelector('.maze-stage-wrap');
  if(!wrap) return;
  const avail = Math.min(wrap.clientWidth - 16, wrap.clientHeight - 16, 640);
  cellPx = Math.max(8, Math.floor(avail / (maze?maze.N:15)));
  const c = canvas();
  if(c && maze){ c.width = cellPx*maze.N; c.height = cellPx*maze.N; }
}
window.addEventListener('resize', ()=>{ if(maze && document.getElementById('screen-game').classList.contains('active')) sizeCanvas(); });

const FOG_RADIUS = 4.2;
function getCss(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

function currentSafeRadius(){
  const diff = DIFFS[currentRoom.difficulty] || DIFFS.normal;
  const elapsedRatio = (Date.now()-roundStartTs)/timeLimitMs;
  if(elapsedRatio < ZONE_START_RATIO) return (maze?maze.maxDist:10)+5;
  const shrinkRatio = Math.min(1, (elapsedRatio-ZONE_START_RATIO)/(1-ZONE_START_RATIO));
  return (maze?maze.maxDist:10) - shrinkRatio*((maze?maze.maxDist:10)-ZONE_MIN_RADIUS);
}

function draw(){
  if(!maze) return;
  const ctx = canvas().getContext('2d');
  const N = maze.N;
  ctx.clearRect(0,0,canvas().width, canvas().height);
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    const inZone = maze.dist[maze.idx(r,c)] <= currentSafeRadius();
    ctx.fillStyle = ((r+c)%2===0) ? getCss('--floor-a') : getCss('--floor-b');
    ctx.fillRect(c*cellPx, r*cellPx, cellPx, cellPx);
    if(!inZone){ ctx.fillStyle = 'rgba(120,20,20,.28)'; ctx.fillRect(c*cellPx, r*cellPx, cellPx, cellPx); }
  }
  const center = Math.floor(N/2);
  ctx.font = `${cellPx*0.8}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('🏁', center*cellPx+cellPx/2, center*cellPx+cellPx/2);

  const EFF_ICON = {speed:'⚡',shield:'🛡',reveal:'👁',freeze:'❄'};
  if(ents && ents.bonuses) ents.bonuses.forEach(b=>{
    if(b.spots) b.spots.forEach((sp,i)=>{ if(b.taken && b.taken[i]) return; ctx.fillText(EFF_ICON[b.effect], sp[1]*cellPx+cellPx/2, sp[0]*cellPx+cellPx/2); });
    else if(b.pos && !b.taken) ctx.fillText(EFF_ICON[b.effect], b.pos[1]*cellPx+cellPx/2, b.pos[0]*cellPx+cellPx/2);
  });
  if(ents && ents.traps) ents.traps.forEach(t=>{
    if(t.spots) t.spots.forEach((sp,i)=>{ if(t.taken && t.taken[i]) return; ctx.fillText('🕳️', sp[1]*cellPx+cellPx/2, sp[0]*cellPx+cellPx/2); });
    else if(t.pos && !t.taken) ctx.fillText('🕳️', t.pos[1]*cellPx+cellPx/2, t.pos[0]*cellPx+cellPx/2);
  });
  if(ents && ents.ammoBoxes) ents.ammoBoxes.forEach(a=>{
    if(a.spots) a.spots.forEach((sp,i)=>{ if(a.taken && a.taken[i]) return; ctx.fillText('🔫', sp[1]*cellPx+cellPx/2, sp[0]*cellPx+cellPx/2); });
    else if(a.pos && !a.taken) ctx.fillText('🔫', a.pos[1]*cellPx+cellPx/2, a.pos[0]*cellPx+cellPx/2);
  });
  // مفتاح
  if(ents && ents.keyPos && keyHolder === null){
    ctx.fillText('🔑', ents.keyPos[1]*cellPx+cellPx/2, ents.keyPos[0]*cellPx+cellPx/2);
  }

  const elapsed = Date.now() - roundStartTs;
  const diff = DIFFS[currentRoom.difficulty] || DIFFS.normal;
  const frozen = activeEffects.freeze && activeEffects.freeze > Date.now();
  ctx.font = `${cellPx*0.85}px sans-serif`;
  if(guards) guards.forEach(g=>{
    if(g.paths) {
      const t = frozen ? activeEffects.freezeAtElapsed : elapsed;
      const [gr,gc] = guardPositionAt(g, session.slot, t, diff.guardSpeed);
      ctx.fillText('👮', gc*cellPx+cellPx/2, gr*cellPx+cellPx/2);
    } else if(g.path) {
      const period = (g.path.length-1)*2;
      const t = frozen ? activeEffects.freezeAtElapsed : elapsed;
      let steps = Math.floor(t/diff.guardSpeed) + g.phase;
      let posIdx = steps % (period*2);
      if(posIdx < 0) posIdx += period*2;
      const idx2 = posIdx <= (g.path.length-1) ? posIdx : period - posIdx;
      const [gr,gc] = g.path[Math.max(0, Math.min(g.path.length-1, idx2))];
      ctx.fillText('👮', gc*cellPx+cellPx/2, gr*cellPx+cellPx/2);
    }
  });

  ctx.strokeStyle = getCss('--wall'); ctx.lineWidth = Math.max(2, cellPx*0.12); ctx.lineCap='round';
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    const cell = maze.cells[maze.idx(r,c)];
    const x=c*cellPx, y=r*cellPx;
    ctx.beginPath();
    if(cell.N){ ctx.moveTo(x,y); ctx.lineTo(x+cellPx,y); }
    if(cell.W){ ctx.moveTo(x,y); ctx.lineTo(x,y+cellPx); }
    if(cell.S){ ctx.moveTo(x,y+cellPx); ctx.lineTo(x+cellPx,y+cellPx); }
    if(cell.E){ ctx.moveTo(x+cellPx,y); ctx.lineTo(x+cellPx,y+cellPx); }
    ctx.stroke();
  }

  const revealing = activeEffects.reveal && activeEffects.reveal > Date.now();
  ctx.font = `${cellPx*0.85}px sans-serif`;
  for(const role in players){
    if(role===session.role) continue;
    const p = players[role];
    if(!p.pos || p.eliminated) continue;
    const dCells = Math.hypot(p.pos[0]-myPos[0], p.pos[1]-myPos[1]);
    if(!revealing && dCells > FOG_RADIUS+1) continue;
    ctx.save();
    ctx.font = `${cellPx*0.55}px sans-serif`;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.pos[1]*cellPx+cellPx/2, p.pos[0]*cellPx+cellPx*0.18, cellPx*0.14, 0, 7); ctx.fill();
    ctx.font = `${cellPx*0.85}px sans-serif`;
    ctx.fillText('🥷', p.pos[1]*cellPx+cellPx/2, p.pos[0]*cellPx+cellPx/2);
    ctx.restore();
  }

  ctx.font = `${cellPx*0.85}px sans-serif`;
  ctx.fillText(myLives<=0 ? '💀' : '🏃', myPos[1]*cellPx+cellPx/2, myPos[0]*cellPx+cellPx/2);

  if(!revealing){
    const cx = myPos[1]*cellPx+cellPx/2, cy = myPos[0]*cellPx+cellPx/2;
    const grad = ctx.createRadialGradient(cx,cy, cellPx*1.1, cx,cy, cellPx*FOG_RADIUS);
    grad.addColorStop(0, 'rgba(11,30,51,0)');
    grad.addColorStop(1, 'rgba(11,30,51,0.97)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,canvas().width,canvas().height);
  }
}

/* ===================== 14) حلقة اللعبة القديمة ===================== */
function gameLoop(){
  if(gameOver) return;
  checkGuardCollisions();
  checkZoneDamage();
  regenAmmo();
  updateTimerUI();
  updateRaceStripUI();
  draw();
  const now = performance.now();
  if(now - lastPosBroadcast > 140){ lastPosBroadcast = now; broadcastMove(); }
  rafId = requestAnimationFrame(gameLoop);
}

function checkGuardCollisions(){
  if(myLives<=0 || gameOver || !maze) return;
  const elapsed = Date.now() - roundStartTs;
  const diff = DIFFS[currentRoom.difficulty] || DIFFS.normal;
  const frozen = activeEffects.freeze && activeEffects.freeze > Date.now();
  if(frozen) return;
  for(const g of guards){
    let gr, gc;
    if(g.paths) [gr,gc] = guardPositionAt(g, session.slot, elapsed, diff.guardSpeed);
    else if(g.path) {
      const period = (g.path.length-1)*2;
      let steps = Math.floor(elapsed/diff.guardSpeed) + g.phase;
      let posIdx = steps % (period*2);
      if(posIdx < 0) posIdx += period*2;
      const idx2 = posIdx <= (g.path.length-1) ? posIdx : period - posIdx;
      [gr,gc] = g.path[Math.max(0, Math.min(g.path.length-1, idx2))];
    }
    if(gr===myPos[0] && gc===myPos[1]){ applyDamage('guard', null); return; }
  }
  if(elapsed > timeLimitMs && !gameOver) onTimeUp();
}
function checkZoneDamage(){
  if(myLives<=0 || gameOver || !maze) return;
  const elapsedRatio = (Date.now()-roundStartTs)/timeLimitMs;
  if(elapsedRatio < ZONE_START_RATIO) return;
  const myDist = maze.dist[maze.idx(...myPos)];
  const safe = currentSafeRadius();
  const outside = myDist > safe;
  const zw = document.getElementById('zoneWarning');
  if(zw) zw.classList.toggle('show', outside);
  if(!outside) return;
  const now = Date.now();
  if(now - lastZoneDamageAt > ZONE_DAMAGE_INTERVAL){
    lastZoneDamageAt = now;
    applyDamage('zone', null);
  }
}
function regenAmmo(){
  const now = Date.now();
  if(now - lastAmmoRegenAt > AMMO_REGEN_MS && myAmmo < MAX_AMMO){
    lastAmmoRegenAt = now; myAmmo++;
    const badge = document.getElementById('ammoBadge');
    if(badge) badge.textContent = myAmmo;
  }
}
function onTimeUp(){
  const winner = computeClosestAliveRole();
  if(winner === session.role) finishRound(true, 'timeout_closer');
}
function computeClosestAliveRole(){
  let best=null, bestDist=Infinity;
  const roles = Object.keys(players).sort();
  for(const role of roles){
    const isMe = role===session.role;
    const eliminated = isMe ? myLives<=0 : !!players[role].eliminated;
    if(eliminated) continue;
    const pos = isMe ? myPos : players[role].pos;
    if(!pos || !maze) continue;
    const d = maze.dist[maze.idx(...pos)];
    if(d<bestDist){ bestDist=d; best=role; }
  }
  return best;
}

/* ===================== 15) الأضرار ===================== */
function applyDamage(source, shooterRole){
  if(activeEffects.shield){ activeEffects.shield=false; flashCatch(true); return; }
  myLives--;
  flashCatch(false);
  if(maze) {
    const starts = getStartPositions(maze.N, currentRoom.max_players);
    myPos = starts[session.slot % starts.length];
  }
  broadcastMove();
  broadcastHit(session.role, shooterRole, myLives, source);
  if(players[session.role]) players[session.role].lives = myLives;
  if(myLives<=0){
    if(players[session.role]) players[session.role].eliminated = true;
    checkLastManStanding();
  }
}
function flashCatch(shielded){
  const el = document.getElementById('catchFlash');
  if(el){
    el.style.background = shielded ? 'rgba(47,125,225,.35)' : 'rgba(229,72,77,.35)';
    el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'), 220);
  }
  if(!shielded && typeof shakeCamera === 'function') shakeCamera(0.5, 0.15);
}
function shakeScreen(){
  const wrap = document.querySelector('.maze-stage-wrap');
  if(!wrap) return;
  wrap.style.transform = 'translateX(-6px)';
  setTimeout(()=> wrap.style.transform = 'translateX(6px)', 60);
  setTimeout(()=> wrap.style.transform = '', 120);
}
function pushKillFeed(text){
  if(hudScene && hudScene.addKillFeed) hudScene.addKillFeed(text);
  const feed = document.getElementById('killFeed');
  if(!feed) return;
  const el = document.createElement('div'); el.className='kill-toast'; el.textContent = text;
  feed.appendChild(el);
  setTimeout(()=> el.remove(), 2900);
}
function checkLastManStanding(){
  if(gameOver) return;
  const roles = Object.keys(players);
  const expectedCount = (currentRoom && currentRoom.max_players) || 2;
  if(roles.length < expectedCount) return;
  const alive = roles.filter(r => !(players[r].eliminated) && !(r===session.role && myLives<=0));
  if(alive.length===1){
    const winnerRole = alive[0];
    if(winnerRole===session.role){ finishRound(true, 'last_standing'); }
  }
}

/* ===================== 16) الالتقاطات ===================== */
function checkPickups(){
  if(!ents || !maze) return;
  const [r,c] = myPos;

  // مفتاح
  if(ents.keyPos && keyHolder === null && r===ents.keyPos[0] && c===ents.keyPos[1]){
    keyHolder = session.role;
    pushKillFeed(`🔑 ${localProfile.username} وجد المفتاح! اذهب للباب!`);
    broadcastPickup('key', 0, 0);
    const indicator = document.getElementById('keyIndicator');
    if(indicator) indicator.classList.add('show');
    const lock = document.querySelector('.door-lock');
    if(lock) { lock.style.background = '#00ff00'; lock.style.boxShadow = '0 0 10px #00ff00'; }
  }

  // باب الخروج
  if(exitLocation && r===exitLocation[0] && c===exitLocation[1] && keyHolder===session.role && !gameOver){
    finishRound(true, 'escaped');
    return;
  }

  if(ents.bonuses) ents.bonuses.forEach((b,bi)=>{
    if(b.spots){
      b.spots.forEach((sp,i)=>{
        if(b.taken[i] || sp[0]!==r || sp[1]!==c) return;
        b.taken[i]=true; applyEffect(b.effect); broadcastPickup('bonus', bi, i);
      });
    } else if(b.pos && !b.taken && b.pos[0]===r && b.pos[1]===c){
      b.taken=true; applyEffect(b.effect); broadcastPickup('bonus', bi, 0);
    }
  });
  if(ents.traps) ents.traps.forEach((t,ti)=>{
    if(t.spots){
      t.spots.forEach((sp,i)=>{
        if(t.taken[i] || sp[0]!==r || sp[1]!==c) return;
        t.taken[i]=true; 
        const starts = getStartPositions(maze.N, currentRoom.max_players);
        myPos = starts[session.slot % starts.length]; 
        flashCatch(false); broadcastPickup('trap', ti, i);
      });
    } else if(t.pos && !t.taken && t.pos[0]===r && t.pos[1]===c){
      t.taken=true;
      const starts = getStartPositions(maze.N, currentRoom.max_players);
      myPos = starts[session.slot % starts.length];
      flashCatch(false); broadcastPickup('trap', ti, 0);
    }
  });
  if(ents.ammoBoxes) ents.ammoBoxes.forEach((a,ai)=>{
    if(a.spots){
      a.spots.forEach((sp,i)=>{
        if(a.taken[i] || sp[0]!==r || sp[1]!==c) return;
        a.taken[i]=true; myAmmo = Math.min(MAX_AMMO, myAmmo+2); 
        const ammoBadge = document.getElementById('ammoBadge');
        if(ammoBadge) ammoBadge.textContent = myAmmo;
        broadcastPickup('ammo', ai, i);
      });
    } else if(a.pos && !a.taken && a.pos[0]===r && a.pos[1]===c){
      a.taken=true; myAmmo = Math.min(MAX_AMMO, myAmmo+2);
      const ammoBadge = document.getElementById('ammoBadge');
      if(ammoBadge) ammoBadge.textContent = myAmmo;
      broadcastPickup('ammo', ai, 0);
    }
  });
}
function applyRemotePickup(payload){
  if(payload.role===session.role) return;
  if(payload.kind === 'key') {
    keyHolder = payload.role;
    pushKillFeed(`🔑 ${playerLabel(payload.role)} وجد المفتاح!`);
    const indicator = document.getElementById('keyIndicator');
    if(indicator) indicator.classList.add('show');
    return;
  }
  if(!ents) return;
  const map = { bonus:ents.bonuses, trap:ents.traps, ammo:ents.ammoBoxes };
  const list = map[payload.kind]; if(!list) return;
  const ent = list[payload.entIndex]; if(!ent) return;
  if(ent.taken) {
    if(Array.isArray(ent.taken)) ent.taken[payload.spotIndex] = true;
  } else {
    ent.taken = true;
  }
}
function applyEffect(effect){
  const now = Date.now();
  const chip = document.getElementById('powerupStatus');
  const label = {speed:'⚡ سرعة',shield:'🛡 درع',reveal:'👁 كشف',freeze:'❄ تجميد الحرّاس'}[effect];
  if(chip){
    const el = document.createElement('div'); el.className='pu-chip'; el.textContent = label; chip.appendChild(el);
    setTimeout(()=>el.remove(), 4200);
  }
  if(effect==='speed'){ activeEffects.speed = now+5000; moveCooldown = 90; setTimeout(()=>{ if(!(activeEffects.speed>Date.now())) moveCooldown=190; }, 5000); }
  if(effect==='shield'){ activeEffects.shield = true; }
  if(effect==='reveal'){ activeEffects.reveal = now+4000; }
  if(effect==='freeze'){ activeEffects.freeze = now+3000; activeEffects.freezeAtElapsed = Date.now()-roundStartTs; }
}

/* ===================== 17) الحركة والاتجاه ===================== */
function tryMove(dirName){
  if(gameOver || myLives<=0 || !maze) return;
  const now = performance.now();
  if(now - lastMoveAt < moveCooldown) return;
  const d = DIR_MAP[dirName];
  myFacing = d;
  const dirObj = DIRS.find(x=>x.d===d);
  const cell = maze.cells[maze.idx(...myPos)];
  if(cell[d]) return;
  const nr = myPos[0]+dirObj.dr, nc = myPos[1]+dirObj.dc;
  if(nr<0||nc<0||nr>=maze.N||nc>=maze.N) return;
  lastMoveAt = now;
  myPos = [nr,nc];
  broadcastMove();
  checkPickups();
}
window.addEventListener('keydown', (e)=>{
  if(!document.getElementById('screen-game').classList.contains('active')) return;
});
const dpadEl = document.getElementById('dpad');
if(dpadEl){
  dpadEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('.dp'); if(!btn) return;
    tryMove(btn.dataset.dir);
  });
}
const dpadExtra = document.getElementById('dpadExtra');
if(dpadExtra){
  dpadExtra.addEventListener('click', (e)=>{
    const btn = e.target.closest('.dp'); if(!btn) return;
    tryMove(btn.dataset.dir);
  });
}
(function initSwipe(){
  let sx=0, sy=0, tracking=false;
  const wrap = document.querySelector('.maze-stage-wrap');
  if(!wrap) return;
  wrap.addEventListener('touchstart', (e)=>{ tracking=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; }, {passive:true});
  wrap.addEventListener('touchend', (e)=>{
    if(!tracking) return; tracking=false;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if(Math.abs(dx)<24 && Math.abs(dy)<24) return;
    if(Math.abs(dx) > Math.abs(dy)) tryMove(dx>0?'right':'left'); else tryMove(dy>0?'down':'up');
  }, {passive:true});
})();

/* ===================== 18) القتال — الإطلاق ===================== */
function fireWeapon(){
  if(gameOver || myLives<=0 || !maze) return;
  const now = performance.now();
  if(now - lastFireAt < FIRE_COOLDOWN) return;
  if(myAmmo<=0) return;
  lastFireAt = now; myAmmo--;
  const badge = document.getElementById('ammoBadge');
  if(badge) badge.textContent = myAmmo;
  const path = raycastPath(maze, myPos[0], myPos[1], myFacing, SHOT_RANGE);
  drawShotTrail(path);
  broadcastShoot(myPos[0], myPos[1], myFacing);
  const btn = document.getElementById('btnFire');
  if(btn) { btn.classList.remove('recoil'); void btn.offsetWidth; btn.classList.add('recoil'); }
}
function handleIncomingShot(payload){
  if(!maze) return;
  const path = raycastPath(maze, payload.r, payload.c, payload.dir, SHOT_RANGE);
  drawShotTrail(path);
  const onPath = path.some(([r,c])=> r===myPos[0] && c===myPos[1]) && !(payload.r===myPos[0] && payload.c===myPos[1]);
  if(onPath && myLives>0 && !gameOver){ applyDamage('shot', payload.role); }
}
function drawShotTrail(path){
  if(path.length<2) return;
  const ctx = canvas().getContext('2d');
  ctx.save();
  ctx.strokeStyle = '#FFE07A'; ctx.lineWidth = Math.max(2, cellPx*0.1); ctx.shadowColor='#FFB100'; ctx.shadowBlur=10;
  ctx.beginPath();
  ctx.moveTo(path[0][1]*cellPx+cellPx/2, path[0][0]*cellPx+cellPx/2);
  for(const [r,c] of path) ctx.lineTo(c*cellPx+cellPx/2, r*cellPx+cellPx/2);
  ctx.stroke();
  ctx.restore();
}
const btnFireEl = document.getElementById('btnFire');
if(btnFireEl) btnFireEl.addEventListener('click', fireWeapon);

/* ===================== 19) البوصلة ===================== */
const btnHintEl = document.getElementById('btnHintMaze');
if(btnHintEl){
  btnHintEl.addEventListener('click', ()=>{
    if(hintUsesLeft<=0 || gameOver || !maze) return;
    hintUsesLeft--; const hintCountEl = document.getElementById('hintCount'); if(hintCountEl) hintCountEl.textContent = hintUsesLeft;
    const pd = maze.parentDir ? maze.parentDir[maze.idx(...myPos)] : null;
    const ICON = { N:'⬆️', E:'➡️', S:'⬇️', W:'⬅️' };
    const arrow = document.getElementById('hintArrow');
    if(arrow){ arrow.textContent = ICON[pd] || '🏁'; arrow.classList.add('show'); setTimeout(()=>arrow.classList.remove('show'), 1800); }
  });
}

/* ===================== 20) واجهات مساعدة ===================== */
function updateTimerUI(){
  const remain = Math.max(0, timeLimitMs - (Date.now()-roundStartTs));
  const s = Math.ceil(remain/1000);
  const mm = String(Math.floor(s/60)).padStart(2,'0'), ss = String(s%60).padStart(2,'0');
  const el = document.getElementById('mzTimer');
  if(el) el.textContent = `${mm}:${ss}`;
}

/* ===================== 21) إنهاء الجولة والنتيجة ===================== */
async function finishRound(iWin, reason){
  if(gameOver) return; gameOver = true;
  await reportResult(session.role, reason);
}

function showWinModal(winnerRole, reason){
  const modal = document.getElementById('winModal');
  const winnerIsMe = winnerRole === session.role;
  const REASONS = {
    reached_goal: winnerIsMe ? 'وصلت إلى الهدف أولًا! 🏁' : `${playerLabel(winnerRole)} وصل إلى الهدف أولًا`,
    eliminated: winnerIsMe ? 'بقيت الصامد الأخير!' : 'أُقصيت من المعركة',
    last_standing: winnerIsMe ? 'كنت آخر الصامدين! 🏆' : `${playerLabel(winnerRole)} كان آخر الصامدين`,
    timeout_closer: winnerIsMe ? 'انتهى الوقت وكنتَ الأقرب للهدف' : 'انتهى الوقت ولم تكن الأقرب',
    opponents_left: winnerIsMe ? 'غادر بقية المنافسين' : 'غادرتَ المعركة',
    escaped: winnerIsMe ? '🔓 هربتَ من المتاهة!' : `${playerLabel(winnerRole)} هرب من المتاهة!`,
  };
  const winIcon = document.getElementById('winIcon');
  const winTitle = document.getElementById('winTitle');
  const winSubtitle = document.getElementById('winSubtitle');
  if(winIcon) winIcon.textContent = winnerIsMe ? '🏆' : '💀';
  if(winTitle) winTitle.textContent = winnerIsMe ? 'فزتَ بالمعركة!' : 'انتهت المعركة';
  if(winSubtitle) winSubtitle.textContent = REASONS[reason] || '';

  const standingsList = document.getElementById('standingsList');
  if(standingsList) {
    standingsList.innerHTML = '';
    const roles = Object.keys(players).sort((a,b)=>{
      if(a===winnerRole) return -1; if(b===winnerRole) return 1;
      return (players[a].eliminated?1:0) - (players[b].eliminated?1:0);
    });
    roles.forEach((role,i)=>{
      const p = players[role];
      const row = document.createElement('div'); row.className='standing-row';
      row.innerHTML = `<div class="standing-rank">${i+1}</div>
        <div class="standing-avatar" style="${p.avatarData?`background-image:url(${p.avatarData})`:`background-color:${p.color}`}"></div>
        <div class="standing-name">${p.name}${role===session.role?' (أنت)':''}</div>
        <div class="standing-status">${role===winnerRole?'🏆 الفائز':(p.eliminated?'💀 أُقصي':'—')}</div>`;
      standingsList.appendChild(row);
    });
  }

  if(modal) modal.classList.add('show');
  saveHistoryEntry({ date:new Date().toLocaleString('ar',{dateStyle:'medium',timeStyle:'short'}), result: winnerIsMe?'win':'lose', reason });
  if(rafId) cancelAnimationFrame(rafId);
}
function saveHistoryEntry(entry){
  try{
    const key = 'maze_history';
    const list = JSON.parse(localStorage.getItem(key)||'[]');
    list.unshift(entry); if(list.length>50) list.length=50;
    localStorage.setItem(key, JSON.stringify(list));
  }catch(e){}
}

/* ===================== 22) شاشات وأزرار عامة ===================== */
function showScreen(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const scr = document.getElementById('screen-'+name);
  if(scr) scr.classList.add('active');
  const gameScr = document.getElementById('screen-game');
  if(gameScr) gameScr.style.display = name==='game' ? 'flex' : 'none';
  if(name!=='game') document.body.classList.remove('in-game');
  const jz = document.getElementById('joystick-zone');
  const fb = document.getElementById('fire-btn-mobile');
  if(jz) jz.style.display = (name==='game') ? 'block' : 'none';
  if(fb) fb.style.display = (name==='game') ? 'flex' : 'none';
  const dpe = document.getElementById('dpadExtra');
  if(dpe) dpe.style.display = (name==='game') ? 'grid' : 'none';
  const bs = document.getElementById('btnShout');
  if(bs) bs.style.display = (name==='game') ? 'block' : 'none';
}
function paintMiniUserbar(){
  const bar = document.getElementById('miniUserbar');
  if(bar) bar.style.display='flex';
  const name = document.getElementById('miniName');
  if(name) name.textContent = localProfile.username;
  applyAvatarVisual(document.getElementById('miniAvatar'), localProfile.avatar_color, localProfile.avatar_data, localProfile.username[0]);
}
function setDbStatus(ok){ 
  const dot = document.getElementById('dbDot');
  if(dot) dot.classList.toggle('off', !ok); 
}

document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const paneCreate = document.getElementById('tabpane-create');
    const paneJoin = document.getElementById('tabpane-join');
    if(paneCreate) paneCreate.style.display = tab.dataset.tab==='create' ? 'block':'none';
    if(paneJoin) paneJoin.style.display = tab.dataset.tab==='join' ? 'block':'none';
  });
});
const diffGrid = document.getElementById('diffGrid');
if(diffGrid){
  diffGrid.addEventListener('click', (e)=>{
    const opt = e.target.closest('.diff-opt'); if(!opt) return;
    document.querySelectorAll('#diffGrid .diff-opt').forEach(o=>o.classList.remove('sel'));
    opt.classList.add('sel'); currentDiff = opt.dataset.diff;
  });
}
const playerCountGrid = document.getElementById('playerCountGrid');
if(playerCountGrid){
  playerCountGrid.addEventListener('click', (e)=>{
    const opt = e.target.closest('.diff-opt'); if(!opt) return;
    document.querySelectorAll('#playerCountGrid .diff-opt').forEach(o=>o.classList.remove('sel'));
    opt.classList.add('sel'); currentPlayers = parseInt(opt.dataset.players,10);
  });
}

function renderSlots(room){
  const row = document.getElementById('slotsRow');
  if(!row) return;
  row.innerHTML = '';
  for(let s=0;s<room.max_players;s++){
    const uid = room['p'+(s+1)+'_user_id'];
    const name = room['p'+(s+1)+'_name'];
    const color = room['p'+(s+1)+'_avatar_color'];
    const data = room['p'+(s+1)+'_avatar_data'];
    const chip = document.createElement('div'); chip.className='slot-chip'+(uid?' filled':'');
    const av = document.createElement('div'); av.className='slot-avatar';
    if(uid) applyAvatarVisual(av, color, data, (name||'؟')[0]); else av.textContent='؟';
    const label = document.createElement('span'); label.textContent = uid ? name : 'بانتظار…';
    chip.appendChild(av); chip.appendChild(label); row.appendChild(chip);
  }
}

const btnCreateRoom = document.getElementById('btnCreateRoom');
if(btnCreateRoom){
  btnCreateRoom.addEventListener('click', async ()=>{
    const errEl = document.getElementById('homeError'); if(errEl) errEl.style.display='none';
    roundStarted = false;
    const { room, error } = await createMazeRoom(currentDiff, currentPlayers);
    if(error){ if(errEl){ errEl.textContent = 'تعذّر إنشاء الغرفة، حاول مجددًا'; errEl.style.display='block'; } return; }
    currentRoom = room;
    const link = `${location.origin}${location.pathname}?r=${room.code}`;
    const waitBox = document.getElementById('waitLinkBox');
    if(waitBox) waitBox.textContent = `${link}\n\nالرمز: ${room.code}`;
    renderSlots(room);
    showScreen('waiting');
    subscribeRoomChanges(room.code, (newRoom)=> handleRoomUpdate(newRoom));
  });
}
const btnJoinRoom = document.getElementById('btnJoinRoom');
if(btnJoinRoom){
  btnJoinRoom.addEventListener('click', async ()=>{
    const errEl = document.getElementById('homeError'); if(errEl) errEl.style.display='none';
    const codeInput = document.getElementById('joinCodeInput');
    const code = codeInput ? codeInput.value : '';
    if(!code || code.trim().length<4){ if(errEl){ errEl.textContent='أدخل رمزًا صحيحًا'; errEl.style.display='block'; } return; }
    roundStarted = false;
    const { room, error } = await joinMazeRoomByCode(code);
    if(error){ if(errEl){ errEl.textContent = error.message || 'تعذّر الانضمام'; errEl.style.display='block'; } return; }
    subscribeRoomChanges(room.code, (newRoom)=> handleRoomUpdate(newRoom));
    if(room.status==='playing'){ startRound(room); }
    else { renderSlots(room); showScreen('waiting'); }
  });
}
const btnCopyLink = document.getElementById('btnCopyLink');
if(btnCopyLink){
  btnCopyLink.addEventListener('click', ()=>{
    if(currentRoom) navigator.clipboard?.writeText(`${location.origin}${location.pathname}?r=${currentRoom.code}`);
  });
}
const btnCopyCode = document.getElementById('btnCopyCode');
if(btnCopyCode){
  btnCopyCode.addEventListener('click', ()=>{
    if(currentRoom) navigator.clipboard?.writeText(currentRoom.code);
  });
}
const btnCancelWait = document.getElementById('btnCancelWait');
if(btnCancelWait){
  btnCancelWait.addEventListener('click', async ()=>{
    try{ if(currentRoom) await sb.from('maze_rooms').delete().eq('code', currentRoom.code); }catch(e){}
    cleanupChannels();
    showScreen('home');
  });
}

async function handleRoomUpdate(newRoom){
  currentRoom = newRoom;
  if(newRoom.status==='waiting'){ renderSlots(newRoom); return; }
  if(newRoom.status==='playing' && !roundStarted){ 
    await startRound(newRoom); 
    return; 
  }
  if(newRoom.status==='finished' && !document.getElementById('winModal').classList.contains('show')){
    gameOver = true;
    showWinModal(newRoom.winner, newRoom.win_reason);
  }
}

const btnLeaveMaze = document.getElementById('btnLeaveMaze');
if(btnLeaveMaze){
  btnLeaveMaze.addEventListener('click', async ()=>{
    if(!confirm('هل تريد مغادرة المعركة؟ ستُحتسب إقصاءً لك.')) return;
    gameOver = true; myLives = 0; if(rafId) cancelAnimationFrame(rafId);
    if(liveChannel){ try{ await liveChannel.untrack(); }catch(e){} }
    cleanupChannels();
    showScreen('home'); document.body.classList.remove('in-game');
  });
}
const btnHomeMaze = document.getElementById('btnHomeMaze');
if(btnHomeMaze){
  btnHomeMaze.addEventListener('click', ()=>{
    const modal = document.getElementById('winModal');
    if(modal) modal.classList.remove('show');
    cleanupChannels();
    showScreen('home'); document.body.classList.remove('in-game');
  });
}
const btnRematchMaze = document.getElementById('btnRematchMaze');
if(btnRematchMaze){
  btnRematchMaze.addEventListener('click', async ()=>{
    const modal = document.getElementById('winModal');
    if(modal) modal.classList.remove('show');
    roundStarted = false;
    if(!currentRoom) return;
    const { room, error } = await createMazeRoom(currentRoom.difficulty, currentRoom.max_players);
    if(!error && room){
      const link = `${location.origin}${location.pathname}?r=${room.code}`;
      const waitBox = document.getElementById('waitLinkBox');
      if(waitBox) waitBox.textContent = `${link}\n\nالرمز: ${room.code}`;
      renderSlots(room);
      showScreen('waiting'); document.body.classList.remove('in-game');
      subscribeRoomChanges(room.code, (newRoom)=> handleRoomUpdate(newRoom));
    }
  });
}
const btnSoundMaze = document.getElementById('btnSoundMaze');
if(btnSoundMaze){
  btnSoundMaze.addEventListener('click', (e)=>{ soundOn=!soundOn; e.target.textContent = soundOn?'🔊':'🔇'; });
}
const btnHelpMaze = document.getElementById('btnHelpMaze');
if(btnHelpMaze){
  btnHelpMaze.addEventListener('click', ()=>{
    const help = document.getElementById('helpSheetBackdrop');
    if(help) help.classList.add('show');
  });
}
const btnCloseHelp = document.getElementById('btnCloseHelp');
if(btnCloseHelp){
  btnCloseHelp.addEventListener('click', ()=>{
    const help = document.getElementById('helpSheetBackdrop');
    if(help) help.classList.remove('show');
  });
}
const helpBackdrop = document.getElementById('helpSheetBackdrop');
if(helpBackdrop){
  helpBackdrop.addEventListener('click', (e)=>{ if(e.target.id==='helpSheetBackdrop') e.currentTarget.classList.remove('show'); });
}

/* ===================== 23) شاشة إنشاء الملف الشخصي ===================== */
let obColor = AVATAR_COLORS[0], obAvatarData = null;
function buildPalette(){
  const pal = document.getElementById('obPalette');
  if(!pal) return;
  AVATAR_COLORS.forEach((c,i)=>{
    const sw = document.createElement('div'); sw.className='sw'+(i===0?' sel':''); sw.style.background=c;
    sw.addEventListener('click', ()=>{ 
      document.querySelectorAll('.sw').forEach(s=>s.classList.remove('sel')); 
      sw.classList.add('sel'); obColor=c; 
      const obPreview = document.getElementById('obAvatarPreview');
      const obName = document.getElementById('obUsername');
      applyAvatarVisual(obPreview, c, obAvatarData, (obName?obName.value:'؟')[0]); 
    });
    pal.appendChild(sw);
  });
}
buildPalette();
const btnUploadAvatar = document.getElementById('btnUploadAvatar');
if(btnUploadAvatar){
  btnUploadAvatar.addEventListener('click', ()=>{
    const fileInput = document.getElementById('obAvatarFile');
    if(fileInput) fileInput.click();
  });
}
const obAvatarFile = document.getElementById('obAvatarFile');
if(obAvatarFile){
  obAvatarFile.addEventListener('change', async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        const side = Math.min(img.width,img.height);
        const canvasEl = document.createElement('canvas'); canvasEl.width=160; canvasEl.height=160;
        const ctx = canvasEl.getContext('2d');
        ctx.drawImage(img, (img.width-side)/2, (img.height-side)/2, side, side, 0,0,160,160);
        obAvatarData = canvasEl.toDataURL('image/jpeg', .72);
        applyAvatarVisual(document.getElementById('obAvatarPreview'), obColor, obAvatarData);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
const btnCreateProfile = document.getElementById('btnCreateProfile');
if(btnCreateProfile){
  btnCreateProfile.addEventListener('click', async ()=>{
    const usernameInput = document.getElementById('obUsername');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const errEl = document.getElementById('obError');
    if(!username || username.length<2){ if(errEl){ errEl.textContent='الرجاء إدخال اسم صحيح'; errEl.style.display='block'; } return; }
    const { data, error } = await createProfile(username, obAvatarData, obColor);
    if(error){ if(errEl){ errEl.textContent='تعذّر إنشاء الملف الشخصي، حاول مجددًا'; errEl.style.display='block'; } return; }
    localProfile = data; paintMiniUserbar();
    await afterProfileReady();
  });
}

/* ===================== 24) نظام ثلاثي الأبعاد ===================== */
let scene, camera, renderer, clock;
let mazeGroup, floorMesh, wallInstancedMesh;
let playerMesh, playerLight, playerWeapon;
let projectiles = [], guards3D = [], items3D = [], exits3D = [];
let raycaster, mouse;
let dynamicWalls = [];
let isShiftPressed = false;
let phaserGame, hudScene;
let key3DMesh = null, door3DMesh = null;

function initThreeJS() {
    if(scene) return;
    if(typeof THREE === 'undefined') {
        setTimeout(initThreeJS, 200);
        return;
    }
    const container = document.getElementById('game-container');
    if(!container) {
        setTimeout(initThreeJS, 200);
        return;
    }
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.035);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 18, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    setupLighting();
    window.addEventListener('resize', onWindowResize);
    setupInput();
}

function setupLighting() {
    const ambient = new THREE.AmbientLight(0x1a1a3a, 0.4);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x2a1a4a, 0x0a1a0a, 0.3);
    scene.add(hemi);
    const moon = new THREE.DirectionalLight(0x4466aa, 0.6);
    moon.position.set(50, 80, 30);
    moon.castShadow = true;
    moon.shadow.mapSize.width = 2048;
    moon.shadow.mapSize.height = 2048;
    moon.shadow.camera.near = 0.5;
    moon.shadow.camera.far = 200;
    moon.shadow.camera.left = -60;
    moon.shadow.camera.right = 60;
    moon.shadow.camera.top = 60;
    moon.shadow.camera.bottom = -60;
    scene.add(moon);

    playerLight = new THREE.SpotLight(0xffaa44, 80, 35, Math.PI / 4, 0.6, 1.5);
    playerLight.castShadow = true;
    playerLight.shadow.mapSize.width = 1024;
    playerLight.shadow.mapSize.height = 1024;
    scene.add(playerLight);
    playerLight.target.position.set(0, 0, 5);
    scene.add(playerLight.target);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ===================== 1) متاهة ديناميكية 3D مشتركة ===================== */
const CELL_SIZE = 4;
const WALL_HEIGHT = 3.5;
const WALL_THICKNESS = 0.4;

function build3DSharedMaze(maze) {
    if(!scene && typeof THREE !== 'undefined') initThreeJS();
    if(!scene) return;
    const N = maze.N;
    maze.cellSize = CELL_SIZE;

    if(mazeGroup) scene.remove(mazeGroup);
    mazeGroup = new THREE.Group();
    scene.add(mazeGroup);

    const floorGeo = new THREE.PlaneGeometry(N * CELL_SIZE, N * CELL_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a2e, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide
    });
    floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set((N-1)*CELL_SIZE/2, 0, (N-1)*CELL_SIZE/2);
    floorMesh.receiveShadow = true;
    mazeGroup.add(floorMesh);

    const gridHelper = new THREE.GridHelper(N * CELL_SIZE, N, 0x2a2a4a, 0x1a1a3a);
    gridHelper.position.set((N-1)*CELL_SIZE/2, 0.02, (N-1)*CELL_SIZE/2);
    mazeGroup.add(gridHelper);

    let wallCount = 0;
    for(let r=0; r<N; r++) for(let c=0; c<N; c++) {
        const cell = maze.cells[maze.idx(r,c)];
        if(cell.N) wallCount++;
        if(cell.W) wallCount++;
        if(r===N-1 && cell.S) wallCount++;
        if(c===N-1 && cell.E) wallCount++;
    }

    const wallGeo = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a5a, roughness: 0.7, metalness: 0.3 });
    wallInstancedMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
    wallInstancedMesh.castShadow = true;
    wallInstancedMesh.receiveShadow = true;

    let widx = 0;
    const dummy = new THREE.Object3D();
    dynamicWalls = [];

    for(let r=0; r<N; r++) for(let c=0; c<N; c++) {
        const cell = maze.cells[maze.idx(r,c)];
        const cx = c * CELL_SIZE;
        const cz = r * CELL_SIZE;

        if(cell.N) {
            dummy.position.set(cx, WALL_HEIGHT/2, cz - CELL_SIZE/2);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            wallInstancedMesh.setMatrixAt(widx, dummy.matrix);
            dynamicWalls.push({ instanceId: widx, r, c, side: 'N', baseY: WALL_HEIGHT/2, isOpen: false, canMove: Math.random() < 0.15 });
            widx++;
        }
        if(cell.W) {
            dummy.position.set(cx - CELL_SIZE/2, WALL_HEIGHT/2, cz);
            dummy.rotation.set(0, Math.PI/2, 0);
            dummy.updateMatrix();
            wallInstancedMesh.setMatrixAt(widx, dummy.matrix);
            dynamicWalls.push({ instanceId: widx, r, c, side: 'W', baseY: WALL_HEIGHT/2, isOpen: false, canMove: Math.random() < 0.15 });
            widx++;
        }
        if(r === N-1 && cell.S) {
            dummy.position.set(cx, WALL_HEIGHT/2, cz + CELL_SIZE/2);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            wallInstancedMesh.setMatrixAt(widx, dummy.matrix);
            dynamicWalls.push({ instanceId: widx, r, c, side: 'S', baseY: WALL_HEIGHT/2, isOpen: false, canMove: false });
            widx++;
        }
        if(c === N-1 && cell.E) {
            dummy.position.set(cx + CELL_SIZE/2, WALL_HEIGHT/2, cz);
            dummy.rotation.set(0, Math.PI/2, 0);
            dummy.updateMatrix();
            wallInstancedMesh.setMatrixAt(widx, dummy.matrix);
            dynamicWalls.push({ instanceId: widx, r, c, side: 'E', baseY: WALL_HEIGHT/2, isOpen: false, canMove: false });
            widx++;
        }
    }

    wallInstancedMesh.instanceMatrix.needsUpdate = true;
    mazeGroup.add(wallInstancedMesh);
}

function createKey3D(pos) {
    if(!pos || !scene) return;
    const cx = pos[1] * CELL_SIZE;
    const cz = pos[0] * CELL_SIZE;

    const geo = new THREE.IcosahedronGeometry(0.4, 0);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.6,
        roughness: 0.2, metalness: 0.9
    });
    key3DMesh = new THREE.Mesh(geo, mat);
    key3DMesh.position.set(cx, 1.2, cz);
    key3DMesh.castShadow = true;
    scene.add(key3DMesh);

    const light = new THREE.PointLight(0xffd700, 8, 6);
    light.position.set(cx, 1.5, cz);
    scene.add(light);
    key3DMesh.userData = { light, baseY: 1.2 };
}

function createDoor3D(pos) {
    if(!pos || !scene) return;
    const cx = pos[1] * CELL_SIZE;
    const cz = pos[0] * CELL_SIZE;

    const geo = new THREE.BoxGeometry(CELL_SIZE * 0.8, WALL_HEIGHT * 1.2, CELL_SIZE * 0.3);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.2 });
    door3DMesh = new THREE.Mesh(geo, mat);
    door3DMesh.position.set(cx, WALL_HEIGHT * 0.6, cz);
    scene.add(door3DMesh);

    const lockGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const lockMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
    const lock = new THREE.Mesh(lockGeo, lockMat);
    lock.position.set(0, 0, CELL_SIZE * 0.2);
    door3DMesh.add(lock);
    door3DMesh.userData = { lock, isOpen: false };
}

function create3DSharedGuards(guardsList) {
    guards3D.forEach(g => scene.remove(g.mesh));
    guards3D = [];

    guardsList.forEach((g, gi) => {
        const group = new THREE.Group();
        const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0xff2244, emissive: 0xff0000, emissiveIntensity: 0.4,
            roughness: 0.3, metalness: 0.7
        });
        const body = new THREE.Mesh(bodyGeo, mat);
        body.castShadow = true;
        group.add(body);

        const capGeo = new THREE.SphereGeometry(0.4, 8, 8, 0, Math.PI * 2, 0, Math.PI/2);
        const topCap = new THREE.Mesh(capGeo, mat);
        topCap.position.y = 0.6;
        group.add(topCap);

        const botCap = new THREE.Mesh(capGeo, mat);
        botCap.rotation.x = Math.PI;
        botCap.position.y = -0.6;
        group.add(botCap);

        const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.15, 0.3, 0.35);
        rightEye.position.set(0.15, 0.3, 0.35);
        group.add(leftEye);
        group.add(rightEye);

        scene.add(group);
        guards3D.push({ mesh: group, guardData: g, index: gi, lastPos: [0, 0] });
    });
}

function create3DSharedItems(entities) {
    items3D.forEach(i => scene.remove(i.mesh));
    items3D = [];

    entities.bonuses.forEach((b, bi) => {
        if(b.taken) return;
        const color = {speed:0xffaa00, shield:0x4488ff, reveal:0xff44ff, freeze:0x44ffff}[b.effect] || 0xffffff;
        const mesh = createFloatingItem(b.pos[0], b.pos[1], color, b.effect);
        items3D.push({ mesh, type: 'bonus', effect: b.effect, index: bi, taken: false });
    });

    entities.traps.forEach((t, ti) => {
        if(t.taken) return;
        const mesh = createTrapItem(t.pos[0], t.pos[1]);
        items3D.push({ mesh, type: 'trap', index: ti, taken: false });
    });

    entities.ammoBoxes.forEach((a, ai) => {
        if(a.taken) return;
        const mesh = createAmmoItem(a.pos[0], a.pos[1]);
        items3D.push({ mesh, type: 'ammo', index: ai, taken: false });
    });
}

function createFloatingItem(r, c, color, type) {
    const cx = c * CELL_SIZE;
    const cz = r * CELL_SIZE;
    const geo = new THREE.OctahedronGeometry(0.5, 0);
    const mat = new THREE.MeshStandardMaterial({
        color: color, emissive: color, emissiveIntensity: 0.5,
        roughness: 0.2, metalness: 0.8
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, 1.5, cz);
    mesh.castShadow = true;
    scene.add(mesh);
    const light = new THREE.PointLight(color, 5, 4);
    light.position.set(cx, 1.5, cz);
    scene.add(light);
    mesh.userData = { light, type, baseY: 1.5, rotSpeed: 2 };
    return mesh;
}

function createTrapItem(r, c) {
    const cx = c * CELL_SIZE;
    const cz = r * CELL_SIZE;
    const geo = new THREE.ConeGeometry(0.4, 0.8, 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0x550000, emissiveIntensity: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, 0.4, cz);
    scene.add(mesh);
    return mesh;
}

function createAmmoItem(r, c) {
    const cx = c * CELL_SIZE;
    const cz = r * CELL_SIZE;
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9, roughness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, 0.8, cz);
    scene.add(mesh);
    return mesh;
}

/* ===================== 2) لاعب 3D ===================== */
function createPlayer3D() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: ROLE_COLORS[session.role] || 0xffffff,
        roughness: 0.5, metalness: 0.3
    });
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.9, 8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    const capGeo2 = new THREE.SphereGeometry(0.35, 8, 8, 0, Math.PI * 2, 0, Math.PI/2);
    const topCap2 = new THREE.Mesh(capGeo2, bodyMat);
    topCap2.position.y = 0.8 + 0.45;
    group.add(topCap2);

    const botCap2 = new THREE.Mesh(capGeo2, bodyMat);
    botCap2.rotation.x = Math.PI;
    botCap2.position.y = 0.8 - 0.45;
    group.add(botCap2);

    const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55;
    group.add(head);

    const weaponGeo = new THREE.BoxGeometry(0.1, 0.1, 0.6);
    const weaponMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.1 });
    playerWeapon = new THREE.Mesh(weaponGeo, weaponMat);
    playerWeapon.position.set(0.3, 1.1, 0.4);
    group.add(playerWeapon);

    scene.add(group);
    playerMesh = group;
    playerLight.position.set(0, 3, 0);
    group.add(playerLight);
}

/* ===================== 3) حركة اللاعب 3D ===================== */
const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();
let playerSpeed = 8;
const playerHeight = 0.8;
let cameraOrbitYaw = 0;
let cameraOrbitPitch = 0.3;
const keys = { w: false, a: false, s: false, d: false, space: false };

function setupInput() {
    document.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if(keys.hasOwnProperty(k)) keys[k] = true;
        if(k === 'shift') isShiftPressed = true;
        if(k === ' ') fireWeapon3D();
    });
    document.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if(keys.hasOwnProperty(k)) keys[k] = false;
        if(k === 'shift') isShiftPressed = false;
    });
    document.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    renderer.domElement.addEventListener('mousedown', (e) => {
        if(e.button === 0) fireWeapon3D();
    });

    let touchStartX = 0, touchStartY = 0;
    let isRightTouch = false;
    renderer.domElement.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        if(touch.clientX > window.innerWidth * 0.5) {
            isRightTouch = true;
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }
    }, { passive: true });
    renderer.domElement.addEventListener('touchmove', (e) => {
        if(!isRightTouch || e.touches.length === 0) return;
        const touch = e.touches[0];
        const dx = (touch.clientX - touchStartX) * 0.005;
        const dy = (touch.clientY - touchStartY) * 0.005;
        cameraOrbitYaw -= dx;
        cameraOrbitPitch = Math.max(-0.5, Math.min(0.5, cameraOrbitPitch - dy));
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: true });
    renderer.domElement.addEventListener('touchend', () => { isRightTouch = false; }, { passive: true });
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    setupMobileJoystick();
}

/* ===================== Joystick للجوال ===================== */
let joystickActive = false;
let joystickVector = { x: 0, y: 0 };
let joystickOrigin = { x: 0, y: 0 };
let joystickTouchId = null;

function setupMobileJoystick() {
    const container = document.getElementById('game-container');
    if(!container) return;

    let joystickZone = document.getElementById('joystick-zone');
    if(!joystickZone) {
        joystickZone = document.createElement('div');
        joystickZone.id = 'joystick-zone';
        joystickZone.style.cssText = 'position:fixed;bottom:20px;left:20px;width:140px;height:140px;z-index:30;display:none;touch-action:none;';
        const joystickBase = document.createElement('div');
        joystickBase.id = 'joystick-base';
        joystickBase.style.cssText = 'position:absolute;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);top:20px;left:20px;';
        const joystickKnob = document.createElement('div');
        joystickKnob.id = 'joystick-knob';
        joystickKnob.style.cssText = 'position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.6);top:48px;left:48px;transform:translate(-50%,-50%);pointer-events:none;';
        joystickZone.appendChild(joystickBase);
        joystickZone.appendChild(joystickKnob);
        document.body.appendChild(joystickZone);
    }

    let fireBtnMobile = document.getElementById('fire-btn-mobile');
    if(!fireBtnMobile) {
        fireBtnMobile = document.createElement('div');
        fireBtnMobile.id = 'fire-btn-mobile';
        fireBtnMobile.style.cssText = 'position:fixed;bottom:30px;right:30px;width:70px;height:70px;border-radius:50%;background:radial-gradient(circle,#ff6f59,#c0392b);border:3px solid rgba(255,255,255,0.4);z-index:30;display:none;align-items:center;justify-content:center;font-size:28px;touch-action:none;user-select:none;';
        fireBtnMobile.innerHTML = '🔫';
        fireBtnMobile.addEventListener('touchstart', (e) => { e.preventDefault(); fireWeapon3D(); }, { passive: false });
        fireBtnMobile.addEventListener('mousedown', (e) => { e.preventDefault(); fireWeapon3D(); });
        document.body.appendChild(fireBtnMobile);
    }

    joystickZone.style.display = 'block';
    fireBtnMobile.style.display = 'flex';

    joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = joystickZone.getBoundingClientRect();
        joystickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        joystickTouchId = touch.identifier;
        joystickActive = true;
        updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });
    joystickZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if(!joystickActive) return;
        for(let i = 0; i < e.touches.length; i++) {
            if(e.touches[i].identifier === joystickTouchId) {
                updateJoystick(e.touches[i].clientX, e.touches[i].clientY);
                break;
            }
        }
    }, { passive: false });
    const endJoystick = (e) => {
        joystickActive = false;
        joystickVector = { x: 0, y: 0 };
        const knob = document.getElementById('joystick-knob');
        if(knob) { knob.style.left = '48px'; knob.style.top = '48px'; }
        joystickTouchId = null;
    };
    joystickZone.addEventListener('touchend', endJoystick);
    joystickZone.addEventListener('touchcancel', endJoystick);

    joystickZone.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const rect = joystickZone.getBoundingClientRect();
        joystickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        joystickActive = true;
        updateJoystick(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
        if(!joystickActive || joystickTouchId !== null) return;
        updateJoystick(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => {
        if(joystickTouchId === null) endJoystick();
    });
}

function updateJoystick(clientX, clientY) {
    const knob = document.getElementById('joystick-knob');
    if(!knob) return;
    const dx = clientX - joystickOrigin.x;
    const dy = clientY - joystickOrigin.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = 40;
    let nx = dx, ny = dy;
    if(dist > maxDist) { nx = (dx / dist) * maxDist; ny = (dy / dist) * maxDist; }
    knob.style.left = (48 + nx) + 'px';
    knob.style.top = (48 + ny) + 'px';
    joystickVector = { x: nx / maxDist, y: ny / maxDist };
}

function updateJoystickMovement(delta) {
    if(!joystickActive || !playerMesh || gameOver || myLives <= 0) return;
    const speed = playerSpeed;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0; camDir.normalize();
    const camRight = new THREE.Vector3();
    camRight.crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
    const moveDir = new THREE.Vector3();
    moveDir.add(camDir.clone().multiplyScalar(-joystickVector.y));
    moveDir.add(camRight.clone().multiplyScalar(joystickVector.x));
    if(moveDir.length() > 0.1) {
        moveDir.normalize();
        const nextPos = playerMesh.position.clone().add(moveDir.multiplyScalar(speed * delta));
        if(!checkWallCollision(nextPos.x, nextPos.z)) {
            playerMesh.position.copy(nextPos);
        }
        const targetRot = Math.atan2(moveDir.x, moveDir.z);
        playerMesh.rotation.y = THREE.MathUtils.lerp(playerMesh.rotation.y, targetRot, delta * 10);
    }
}

function updatePlayerMovement(delta) {
    if(!playerMesh || gameOver || myLives <= 0) return;
    const speed = isShiftPressed && activeEffects.speed > Date.now() ? playerSpeed * 1.8 :
                  isShiftPressed ? playerSpeed * 1.3 :
                  activeEffects.speed > Date.now() ? playerSpeed * 1.5 : playerSpeed;
    playerDirection.set(0, 0, 0);
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0; camDir.normalize();
    const camRight = new THREE.Vector3();
    camRight.crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
    if(keys.w) playerDirection.add(camDir);
    if(keys.s) playerDirection.sub(camDir);
    if(keys.d) playerDirection.add(camRight);
    if(keys.a) playerDirection.sub(camRight);

    if(playerDirection.length() > 0) {
        playerDirection.normalize();
        const nextPos = playerMesh.position.clone().add(playerDirection.clone().multiplyScalar(speed * delta));
        if(!checkWallCollision(nextPos.x, nextPos.z)) {
            playerMesh.position.copy(nextPos);
        } else {
            const tryX = playerMesh.position.clone();
            tryX.x += playerDirection.x * speed * delta;
            if(!checkWallCollision(tryX.x, playerMesh.position.z)) playerMesh.position.x = tryX.x;
            const tryZ = playerMesh.position.clone();
            tryZ.z += playerDirection.z * speed * delta;
            if(!checkWallCollision(playerMesh.position.x, tryZ.z)) playerMesh.position.z = tryZ.z;
        }
        const targetRot = Math.atan2(playerDirection.x, playerDirection.z);
        playerMesh.rotation.y = THREE.MathUtils.lerp(playerMesh.rotation.y, targetRot, delta * 10);
        myFacing = dirFromAngle(targetRot);
    }

    const gridR = Math.round(playerMesh.position.z / CELL_SIZE);
    const gridC = Math.round(playerMesh.position.x / CELL_SIZE);
    if(maze) myPos = [Math.max(0, Math.min(maze.N-1, gridR)), Math.max(0, Math.min(maze.N-1, gridC))];

    const orbitDist = 8, orbitHeight = 6 + cameraOrbitPitch * 8;
    const camOffset = new THREE.Vector3(0, Math.max(4, orbitHeight), orbitDist);
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraOrbitYaw);
    const targetCamPos = playerMesh.position.clone().add(camOffset);
    camera.position.lerp(targetCamPos, delta * 3);
    camera.lookAt(playerMesh.position.x, playerMesh.position.y + 1, playerMesh.position.z);

    playerLight.target.position.set(
        playerMesh.position.x + Math.sin(playerMesh.rotation.y) * 5,
        0, playerMesh.position.z + Math.cos(playerMesh.rotation.y) * 5
    );
    playerLight.target.updateMatrixWorld();
}

function checkWallCollision(x, z) {
    if(!maze) return false;
    const c = Math.round(x / CELL_SIZE);
    const r = Math.round(z / CELL_SIZE);
    if(r < 0 || r >= maze.N || c < 0 || c >= maze.N) return true;
    const cell = maze.cells[maze.idx(r, c)];
    const localX = x - c * CELL_SIZE;
    const localZ = z - r * CELL_SIZE;
    const margin = 0.4;
    if(cell.N && localZ < -CELL_SIZE/2 + margin) return true;
    if(cell.S && localZ > CELL_SIZE/2 - margin) return true;
    if(cell.W && localX < -CELL_SIZE/2 + margin) return true;
    if(cell.E && localX > CELL_SIZE/2 - margin) return true;
    return false;
}

function dirFromAngle(angle) {
    const deg = (angle * 180 / Math.PI + 360) % 360;
    if(deg >= 45 && deg < 135) return 'E';
    if(deg >= 135 && deg < 225) return 'S';
    if(deg >= 225 && deg < 315) return 'W';
    return 'N';
}

/* ===================== 4) نظام الإطلاق 3D ===================== */
function fireWeapon3D() {
    if(gameOver || myLives <= 0) return;
    const now = performance.now();
    if(now - lastFireAt < FIRE_COOLDOWN) return;
    if(myAmmo <= 0) return;
    lastFireAt = now;
    myAmmo--;
    updateAmmoUI();

    const startPos = playerMesh.position.clone();
    startPos.y = 1.2;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; direction.normalize();

    const projectile = createProjectile(startPos, direction, session.role);
    projectiles.push(projectile);
    shakeCamera(0.3, 0.1);
    if(soundOn) playSound('shoot');
    broadcastShoot(myPos[0], myPos[1], myFacing);
}

function createProjectile(pos, dir, ownerRole) {
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ 
        color: ROLE_COLORS[ownerRole] || 0xffff00,
        blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);

    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(20 * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({ 
        color: ROLE_COLORS[ownerRole] || 0xffff00,
        transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
    });
    const trail = new THREE.Line(trailGeo, trailMat);
    scene.add(trail);

    const light = new THREE.PointLight(ROLE_COLORS[ownerRole] || 0xffff00, 5, 3);
    light.position.copy(pos);
    scene.add(light);

    return {
        mesh, trail, light,
        position: pos.clone(),
        direction: dir.clone(),
        speed: 25,
        distance: 0,
        maxDistance: SHOT_RANGE * CELL_SIZE,
        ownerRole,
        trailHistory: []
    };
}

function updateProjectiles(delta) {
    for(let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const move = p.direction.clone().multiplyScalar(p.speed * delta);
        p.position.add(move);
        p.distance += move.length();
        p.mesh.position.copy(p.position);
        p.light.position.copy(p.position);

        p.trailHistory.push(p.position.clone());
        if(p.trailHistory.length > 15) p.trailHistory.shift();
        const positions = p.trail.geometry.attributes.position.array;
        for(let j = 0; j < p.trailHistory.length; j++) {
            positions[j*3] = p.trailHistory[j].x;
            positions[j*3+1] = p.trailHistory[j].y;
            positions[j*3+2] = p.trailHistory[j].z;
        }
        p.trail.geometry.attributes.position.needsUpdate = true;

        if(checkWallCollision(p.position.x, p.position.z) || p.distance >= p.maxDistance) {
            createImpactEffect(p.position, p.ownerRole);
            scene.remove(p.mesh); scene.remove(p.trail); scene.remove(p.light);
            projectiles.splice(i, 1);
            continue;
        }

        if(p.ownerRole !== session.role) continue;
        for(const role in players) {
            if(role === session.role) continue;
            const other = players[role];
            if(!other.pos3D || other.eliminated) continue;
            const dist = p.position.distanceTo(other.pos3D);
            if(dist < 0.8) {
                applyDamage('shot', p.ownerRole);
                broadcastHit(session.role, p.ownerRole, myLives, 'shot');
                scene.remove(p.mesh); scene.remove(p.trail); scene.remove(p.light);
                projectiles.splice(i, 1);
                break;
            }
        }
    }
}

function createImpactEffect(pos, color) {
    const particleCount = 8;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    for(let i = 0; i < particleCount; i++) {
        positions[i*3] = pos.x; positions[i*3+1] = pos.y; positions[i*3+2] = pos.z;
        velocities.push(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: color, size: 0.15, transparent: true, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);
    let life = 1.0;
    function animateImpact() {
        life -= 0.05;
        if(life <= 0) { scene.remove(particles); return; }
        mat.opacity = life;
        const posArray = particles.geometry.attributes.position.array;
        for(let i = 0; i < particleCount; i++) {
            posArray[i*3] += velocities[i].x * 0.016;
            posArray[i*3+1] += velocities[i].y * 0.016;
            posArray[i*3+2] += velocities[i].z * 0.016;
            velocities[i].y -= 0.1;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        requestAnimationFrame(animateImpact);
    }
    animateImpact();
}

/* ===================== 5) الجدران الديناميكية ===================== */
let lastWallShift = 0;

function updateDynamicWalls(elapsed) {
    if(!maze || !wallInstancedMesh) return;
    const diff = DIFFS[currentRoom?.difficulty] || DIFFS.normal;
    const shiftPhase = Math.floor(elapsed / diff.wallShiftInterval);
    if(shiftPhase <= lastWallShift) return;
    lastWallShift = shiftPhase;

    const dummy = new THREE.Object3D();
    dynamicWalls.forEach(dw => {
        if(!dw.canMove) return;
        dw.isOpen = !dw.isOpen;
        const targetY = dw.isOpen ? -WALL_HEIGHT : dw.baseY;
        animateWall(dw.instanceId, dw.baseY, targetY);
    });
    pushKillFeed('🌀 المتاهة تتغير! احذر!');
    if(hudScene && hudScene.showWallShiftWarning) hudScene.showWallShiftWarning();
}

function animateWall(instanceId, fromY, toY) {
    const dummy = new THREE.Object3D();
    const duration = 1000;
    const startTime = Date.now();
    function step() {
        const t = Math.min(1, (Date.now() - startTime) / duration);
        const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
        wallInstancedMesh.getMatrixAt(instanceId, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        dummy.position.y = fromY + (toY - fromY) * ease;
        dummy.updateMatrix();
        wallInstancedMesh.setMatrixAt(instanceId, dummy.matrix);
        wallInstancedMesh.instanceMatrix.needsUpdate = true;
        if(t < 1) requestAnimationFrame(step);
    }
    step();
}

/* ===================== 6) تحديث الحراس 3D ===================== */
function updateGuards3D(elapsed) {
    if(!maze) return;
    const diff = DIFFS[currentRoom?.difficulty] || DIFFS.normal;
    const frozen = activeEffects.freeze && activeEffects.freeze > Date.now();

    guards3D.forEach(g => {
        const guard = g.guardData;
        const path = guard.path;
        const period = (path.length - 1) * 2;
        const t = frozen ? activeEffects.freezeAtElapsed : elapsed;
        let steps = Math.floor(t / diff.guardSpeed) + guard.phase;
        let posIdx = steps % (period * 2);
        if(posIdx < 0) posIdx += period * 2;
        const idx2 = posIdx <= (path.length - 1) ? posIdx : period - posIdx;
        const [gr, gc] = path[Math.max(0, Math.min(path.length - 1, idx2))];

        const tx = gc * CELL_SIZE;
        const tz = gr * CELL_SIZE;
        g.mesh.position.x = THREE.MathUtils.lerp(g.mesh.position.x, tx, 0.1);
        g.mesh.position.z = THREE.MathUtils.lerp(g.mesh.position.z, tz, 0.1);
        g.mesh.position.y = 0.8;

        const dx = tx - g.lastPos[0] * CELL_SIZE;
        const dz = tz - g.lastPos[1] * CELL_SIZE;
        if(Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
            g.mesh.rotation.y = Math.atan2(dx, dz);
        }
        g.lastPos = [gr, gc];

        if(myLives > 0 && !gameOver && !frozen) {
            const dist = Math.hypot(playerMesh.position.x - g.mesh.position.x, playerMesh.position.z - g.mesh.position.z);
            if(dist < 0.8) applyDamage('guard', null);
        }
    });
}

/* ===================== 7) تحديث العناصر 3D ===================== */
function updateItems3D(time) {
    items3D.forEach(item => {
        if(item.taken) return;
        item.mesh.rotation.y += 2 * 0.016;
        item.mesh.position.y = item.mesh.userData.baseY + Math.sin(time * 2 + item.mesh.id) * 0.2;

        const dist = Math.hypot(playerMesh.position.x - item.mesh.position.x, playerMesh.position.z - item.mesh.position.z);
        if(dist < 1.0) {
            item.taken = true;
            scene.remove(item.mesh);
            if(item.mesh.userData.light) scene.remove(item.mesh.userData.light);

            if(item.type === 'bonus') {
                applyEffect(item.effect);
                broadcastPickup('bonus', item.index, 0);
            } else if(item.type === 'trap') {
                if(maze) {
                    const starts = getStartPositions(maze.N, currentRoom.max_players);
                    myPos = starts[session.slot % starts.length];
                    playerMesh.position.set(myPos[1] * CELL_SIZE, 0.8, myPos[0] * CELL_SIZE);
                }
                flashCatch(false);
                broadcastPickup('trap', item.index, 0);
            } else if(item.type === 'ammo') {
                myAmmo = Math.min(MAX_AMMO, myAmmo + 2);
                updateAmmoUI();
                broadcastPickup('ammo', item.index, 0);
            }
        }
    });
}

/* ===================== 8) تحديث المفتاح والباب ===================== */
function updateKey3D(time) {
    if(!key3DMesh || keyHolder) {
        if(key3DMesh) {
            scene.remove(key3DMesh);
            if(key3DMesh.userData.light) scene.remove(key3DMesh.userData.light);
            key3DMesh = null;
        }
        return;
    }
    key3DMesh.rotation.y += 2 * 0.016;
    key3DMesh.position.y = key3DMesh.userData.baseY + Math.sin(time * 3) * 0.2;

    const dist = Math.hypot(playerMesh.position.x - key3DMesh.position.x, playerMesh.position.z - key3DMesh.position.z);
    if(dist < 1.0) {
        keyHolder = session.role;
        scene.remove(key3DMesh);
        if(key3DMesh.userData.light) scene.remove(key3DMesh.userData.light);
        key3DMesh = null;

        pushKillFeed(`🔑 ${localProfile.username} وجد المفتاح! اذهب للباب!`);
        broadcastPickup('key', 0, 0);

        const indicator = document.getElementById('keyIndicator');
        if(indicator) indicator.classList.add('show');

        if(door3DMesh && door3DMesh.userData.lock) {
            door3DMesh.userData.lock.material.color.setHex(0x00ff00);
            door3DMesh.userData.lock.material.emissive.setHex(0x00ff00);
        }
    }
}

function updateDoor3D() {
    if(!door3DMesh || door3DMesh.userData.isOpen) return;

    const dist = Math.hypot(playerMesh.position.x - door3DMesh.position.x, playerMesh.position.z - door3DMesh.position.z);
    if(dist < 1.5 && keyHolder === session.role && !gameOver) {
        door3DMesh.userData.isOpen = true;

        const openAnim = () => {
            door3DMesh.position.y += 0.15;
            if(door3DMesh.position.y < WALL_HEIGHT * 2.5) {
                requestAnimationFrame(openAnim);
            } else {
                scene.remove(door3DMesh);
            }
        };
        openAnim();

        finishRound(true, 'escaped');
    }
}

/* ===================== 9) المنطقة الآمنة 3D ===================== */
let zoneMesh = null;

function updateZone3D() {
    if(!maze) return;
    const elapsedRatio = (Date.now() - roundStartTs) / timeLimitMs;
    if(elapsedRatio < ZONE_START_RATIO) {
        if(zoneMesh) { scene.remove(zoneMesh); zoneMesh = null; }
        return;
    }
    const safeRadius = currentSafeRadius();
    const centerX = Math.floor(maze.N/2) * CELL_SIZE;
    const centerZ = Math.floor(maze.N/2) * CELL_SIZE;

    if(!zoneMesh) {
        const geo = new THREE.RingGeometry(0.1, 1, 64);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff0000, transparent: true, opacity: 0.15,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending
        });
        zoneMesh = new THREE.Mesh(geo, mat);
        zoneMesh.rotation.x = -Math.PI / 2;
        zoneMesh.position.set(centerX, 0.05, centerZ);
        scene.add(zoneMesh);
    }
    const radiusWorld = safeRadius * CELL_SIZE;
    zoneMesh.scale.set(radiusWorld, radiusWorld, 1);

    const playerDist = Math.hypot(playerMesh.position.x - centerX, playerMesh.position.z - centerZ) / CELL_SIZE;
    const outside = playerDist > safeRadius;
    const zw = document.getElementById('zoneWarning');
    if(zw) zw.classList.toggle('show', outside);

    if(outside) {
        const now = Date.now();
        if(now - lastZoneDamageAt > ZONE_DAMAGE_INTERVAL) {
            lastZoneDamageAt = now;
            applyDamage('zone', null);
        }
        if(renderer && renderer.domElement) renderer.domElement.style.boxShadow = 'inset 0 0 50px rgba(255,0,0,0.3)';
    } else {
        if(renderer && renderer.domElement) renderer.domElement.style.boxShadow = 'none';
    }
}

/* ===================== 10) تأثيرات الكاميرا ===================== */
let shakeIntensity = 0;
let shakeDuration = 0;

function shakeCamera(intensity, duration) {
    shakeIntensity = intensity;
    shakeDuration = duration;
}

function applyCameraShake(delta) {
    if(shakeDuration <= 0) return;
    shakeDuration -= delta;
    const shake = shakeIntensity * (shakeDuration / 0.3);
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    camera.position.z += (Math.random() - 0.5) * shake;
}

/* ===================== 11) نظام النداء ===================== */
function showShoutBubble(role, message) {
    const p = players[role];
    if(!p) return;

    const bubble = document.createElement('div');
    bubble.className = 'shout-bubble';
    bubble.textContent = message;
    bubble.dataset.role = role;
    bubble.style.cssText = `
        position: fixed;
        background: rgba(0,0,0,0.85);
        color: #fff;
        padding: 8px 14px;
        border-radius: 14px;
        font-size: 13px;
        font-weight: 700;
        pointer-events: none;
        z-index: 40;
        white-space: nowrap;
        border: 2px solid ${p.color || '#fff'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        animation: shoutPop 0.3s ease;
        transition: opacity 0.3s, transform 0.3s;
    `;
    document.body.appendChild(bubble);

    setTimeout(() => {
        bubble.style.opacity = '0';
        bubble.style.transform = 'translate(-50%, -120%) scale(0.8)';
        setTimeout(() => bubble.remove(), 300);
    }, 3500);
}

function updateShoutBubbles() {
    document.querySelectorAll('.shout-bubble').forEach(bubble => {
        const role = bubble.dataset.role;
        const p = players[role];
        if(!p) return;

        let x, z;
        if(p.pos3D) { x = p.pos3D.x; z = p.pos3D.z; }
        else if(p.pos) { x = p.pos[1] * CELL_SIZE; z = p.pos[0] * CELL_SIZE; }
        else return;

        const vec = new THREE.Vector3(x, 2.2, z);
        vec.project(camera);
        const sx = (vec.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-vec.y * 0.5 + 0.5) * window.innerHeight;

        bubble.style.left = sx + 'px';
        bubble.style.top = sy + 'px';
        bubble.style.transform = 'translate(-50%, -120%)';
    });
}

/* ===================== 12) Phaser 3 HUD Scene ===================== */
class HUDScene extends Phaser.Scene {
    constructor() { super({ key: 'HUDScene' }); }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

        this.timerText = this.add.text(this.scale.width / 2, 20, '04:00', {
            fontFamily: 'Baloo Bhaijaan 2', fontSize: '28px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        this.livesText = this.add.text(20, 20, '❤️❤️❤️', { fontSize: '24px' });
        this.ammoText = this.add.text(this.scale.width - 100, 20, '🔫 3/6', {
            fontFamily: 'Cairo', fontSize: '20px', color: '#ffaa00',
            stroke: '#000000', strokeThickness: 3
        });

        this.killFeedContainer = this.add.container(20, 80);
        this.createMinimap();

        this.warningText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
            fontFamily: 'Baloo Bhaijaan 2', fontSize: '48px', color: '#ff0000',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0);

        this.abilityIcon = this.add.rectangle(this.scale.width - 60, this.scale.height - 100, 50, 50, 0x4444ff)
            .setStrokeStyle(3, 0xffffff);
        this.abilityText = this.add.text(this.scale.width - 60, this.scale.height - 100, 'Q', {
            fontSize: '20px', color: '#ffffff'
        }).setOrigin(0.5);

        this.scale.on('resize', this.resize, this);
    }

    createMinimap() {
        const size = 120;
        const x = this.scale.width - size - 20;
        const y = this.scale.height - size - 20;
        this.minimapBg = this.add.rectangle(x + size/2, y + size/2, size, size, 0x000000, 0.6)
            .setStrokeStyle(2, 0xffffff);
        this.minimapContainer = this.add.container(x, y);
    }

    resize(gameSize) {
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
        this.timerText.setPosition(gameSize.width / 2, 20);
        this.ammoText.setPosition(gameSize.width - 100, 20);
    }

    update() {
        const remain = Math.max(0, timeLimitMs - (Date.now() - roundStartTs));
        const s = Math.ceil(remain / 1000);
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        this.timerText.setText(`${mm}:${ss}`);
        if(s < 30) this.timerText.setColor('#ff4444');
        else this.timerText.setColor('#ffffff');

        this.livesText.setText('❤️'.repeat(Math.max(0, myLives)) + '🖤'.repeat(3 - Math.max(0, Math.min(3, myLives))));
        this.ammoText.setText(`🔫 ${myAmmo}/${MAX_AMMO}`);
        this.updateMinimap();
    }

    updateMinimap() {
        if(!maze) return;
        this.minimapContainer.removeAll(true);
        const size = 120;
        const scale = size / maze.N;

        const px = myPos[1] * scale;
        const py = myPos[0] * scale;
        this.minimapContainer.add(this.add.circle(px, py, 3, parseInt(ROLE_COLORS[session.role].replace('#', '0x'))));

        for(const role in players) {
            if(role === session.role) continue;
            const p = players[role];
            if(!p.pos || p.eliminated) continue;
            const ox = p.pos[1] * scale;
            const oy = p.pos[0] * scale;
            this.minimapContainer.add(this.add.circle(ox, oy, 2, parseInt(p.color.replace('#', '0x'))));
        }

        if(ents && ents.keyPos && !keyHolder) {
            this.minimapContainer.add(this.add.circle(ents.keyPos[1]*scale, ents.keyPos[0]*scale, 3, 0xffd700).setStrokeStyle(1, 0xffffff));
        }
        if(exitLocation) {
            this.minimapContainer.add(this.add.circle(exitLocation[1]*scale, exitLocation[0]*scale, 4, keyHolder ? 0x00ff00 : 0xff0000).setStrokeStyle(2, 0xffffff));
        }
    }

    showWallShiftWarning() {
        this.warningText.setText('🌀 المتاهة تتغير!');
        this.warningText.setAlpha(1);
        this.tweens.add({ targets: this.warningText, alpha: 0, duration: 2000, ease: 'Power2' });
    }

    addKillFeed(text) {
        const txt = this.add.text(0, 0, text, {
            fontFamily: 'Cairo', fontSize: '14px', color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 8, y: 4 }
        });
        this.killFeedContainer.add(txt);
        txt.y = this.killFeedContainer.length * 22;
        this.tweens.add({
            targets: txt, alpha: 0, delay: 2500, duration: 500,
            onComplete: () => txt.destroy()
        });
        this.killFeedContainer.each((child, i) => { child.y = i * 22; });
    }
}

function initPhaserHUD() {
    const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: 'hud-container',
        transparent: true,
        scene: [HUDScene],
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
    };
    phaserGame = new Phaser.Game(config);
    setTimeout(() => { hudScene = phaserGame.scene.getScene('HUDScene'); }, 500);
}

/* ===================== 13) حلقة اللعبة الرئيسية ===================== */
function gameLoop3D() {
    const delta = clock.getDelta();

    if(!gameOver){
        const elapsed = Date.now() - roundStartTs;
        updatePlayerMovement(delta);
        updateJoystickMovement(delta);
        updateProjectiles(delta);
        updateGuards3D(elapsed);
        updateItems3D(clock.getElapsedTime());
        updateKey3D(clock.getElapsedTime());
        updateDoor3D();
        updateZone3D();
        updateDynamicWalls(elapsed);
        regenAmmo();
        checkLastManStanding();
        updateShoutBubbles();

        const now = performance.now();
        if(now - lastPosBroadcast > 140) {
            lastPosBroadcast = now;
            if(playerMesh) {
                broadcastMove();
                players[session.role].pos3D = playerMesh.position.clone();
            }
        }
    }

    applyCameraShake(delta);
    if(renderer && scene && camera) renderer.render(scene, camera);
    rafId = requestAnimationFrame(gameLoop3D);
}

/* ===================== 14) بدء الجولة 3D ===================== */
async function startRound3D(room) {
    if(roundStarted) return;
    roundStarted = true;
    currentRoom = room;
    const diff = DIFFS[room.difficulty] || DIFFS.normal;
    const k = room.max_players;
    const N = diff.baseN;

    let attempts = 0;
    while(!scene && attempts < 50) {
        if(typeof THREE !== 'undefined') initThreeJS();
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    if(!scene){ 
        console.error('Three.js failed to initialize'); 
        roundStarted = false;
        return; 
    }

    // متاهة مشتركة جديدة
    maze = buildSharedMaze(room.seed, N);
    guards = buildSharedGuards(maze, diff.guardsCount);
    ents = placeSharedEntities(maze, diff.bonusCount, diff.trapCount, diff.ammoCount);

    exitLocation = maze.center;
    doorOpen = false;
    keyHolder = null;

    players = collectPlayersFromRoom(room);
    players[session.role].isMe = true;

    const starts = getStartPositions(N, k);
    const mySlot = session.slot;
    myPos = starts[mySlot % starts.length];
    myFacing = mySlot === 0 ? 'S' : (mySlot === 1 ? 'N' : (mySlot === 2 ? 'E' : 'W'));

    myLives = 3;
    myAmmo = START_AMMO;
    hintUsesLeft = 3;
    activeEffects = {};
    gameOver = false;
    roundStartTs = new Date(room.started_at).getTime() || Date.now();
    timeLimitMs = diff.timeLimit * 1000;
    lastAmmoRegenAt = Date.now();
    zoneWarnShownAt = 0;
    lastZoneDamageAt = 0;
    lastWallShift = 0;

    // 3D
    build3DSharedMaze(maze);
    createPlayer3D();
    playerMesh.position.set(myPos[1] * CELL_SIZE, 0.8, myPos[0] * CELL_SIZE);

    createKey3D(ents.keyPos);
    createDoor3D(exitLocation);
    create3DSharedGuards(guards);
    create3DSharedItems(ents);

    showScreen('game');
    document.body.classList.add('in-game');
    const gameContainer = document.getElementById('game-container');
    if(gameContainer) gameContainer.style.display = 'block';

    document.getElementById('mazeCanvas').style.display = 'none';
    document.getElementById('dpad').style.display = 'none';

    if(!phaserGame) initPhaserHUD();

    showWarBanner(room);
    joinLiveChannel(session.code);

    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(gameLoop3D);
}

/* ===================== 15) دوال مساعدة ===================== */
function updateAmmoUI() {
    const badge = document.getElementById('ammoBadge');
    if(badge) badge.textContent = myAmmo;
}

function pushKillFeed(text) {
    if(hudScene && hudScene.addKillFeed) hudScene.addKillFeed(text);
    const feed = document.getElementById('killFeed');
    if(!feed) return;
    const el = document.createElement('div');
    el.className = 'kill-toast';
    el.textContent = text;
    feed.appendChild(el);
    setTimeout(() => el.remove(), 2900);
}

function playSound(name) {
    // Placeholder
}

/* ===================== 16) أحداث الأزرار الجديدة ===================== */
// زر النداء
const btnShout = document.getElementById('btnShout');
const shoutMenu = document.getElementById('shoutMenu');
if(btnShout && shoutMenu){
    btnShout.addEventListener('click', (e)=>{
        e.stopPropagation();
        shoutMenu.classList.toggle('show');
    });
    shoutMenu.addEventListener('click', (e)=>{
        const btn = e.target.closest('button');
        if(!btn) return;
        const msg = btn.dataset.msg;
        broadcastShout(msg);
        showShoutBubble(session.role, msg);
        shoutMenu.classList.remove('show');
    });
    document.addEventListener('click', (e)=>{
        if(!shoutMenu.contains(e.target) && e.target !== btnShout){
            shoutMenu.classList.remove('show');
        }
    });
}

/* ===================== 17) التوافق مع الكود القديم ===================== */
startRound = startRound3D;

console.log('🌀 متاهة الهروب 3D — النسخة المشتركة المنافسة — تم التحميل');

/* ===================== 25) الإقلاع ===================== */
function extractLinkCode(){ return new URLSearchParams(location.search).get('r'); }

async function afterProfileReady(){
  showScreen('home');
  const pending = extractLinkCode();
  if(pending){
    history.replaceState && history.replaceState({}, '', location.pathname);
    const { room, error } = await joinMazeRoomByCode(pending);
    if(!error){
      subscribeRoomChanges(room.code, (newRoom)=> handleRoomUpdate(newRoom));
      if(room.status==='playing'){ 
        const waitForThree = () => new Promise(resolve => {
          const check = () => {
            if(typeof THREE !== 'undefined' && scene) resolve();
            else setTimeout(check, 100);
          };
          check();
        });
        await waitForThree();
        startRound(room); 
      }
      else { renderSlots(room); showScreen('waiting'); }
    }
  }
}

async function boot(){
  if(!isConfigured){ 
    const sw = document.getElementById('setupWarning');
    if(sw) sw.style.display='block'; 
    setDbStatus(false); 
    return; 
  }
  setDbStatus(true);
  if(typeof THREE !== 'undefined'){ initThreeJS(); }
  await ensureAnonymousSession();
  const existing = await loadExistingProfile();
  if(!existing){ showScreen('onboarding'); return; }
  localProfile = existing; soundOn = existing.sound_on!==false;
  paintMiniUserbar();
  await afterProfileReady();
}
boot();