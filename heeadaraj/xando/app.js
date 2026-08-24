// ====================================================================== 
// إكس أو برو — لعبة احترافية متعددة الأحجام مع ذكاء اصطناعي
// ====================================================================== 

const SUPABASE_URL      = "https://yebntvnbuufthdsjqwyx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllYm50dm5idXVmdGhkc2pxd3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MjA4MDIsImV4cCI6MjEwMTQ5NjgwMn0.dtMOlp2jS8oRttfJjsMMZTUFprrAnbfNFiBpx__4lGE";
const isConfigured = !SUPABASE_URL.includes("ضع_") && !SUPABASE_ANON_KEY.includes("ضع_");
const sb = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const AVATAR_COLORS = ['#E5484D','#2F7DE1','#3EA06B','#F2B705','#8E5CF2','#FF6F59','#17A2B8','#D6336C'];
let profile = null, myAuthUid = null;

function getLocalUserId(){
  // نفس مفتاح التخزين المستخدم في الحية والدرج ولودو (snl_user_id) — بهذا يُصبح
  // الجهاز/المتصفح نفسه هو نفس الحساب (نفس profiles.id) في الألعاب الثلاث دون أي
  // تسجيل جديد. لو كان هناك معرّف قديم خاص بإكس أو فقط (xo_user_id) من نسخة سابقة
  // نرحّله لمرة واحدة حفاظًا على تقدّم اللاعب القديم.
  let id = localStorage.getItem('snl_user_id');
  if(!id){
    const legacy = localStorage.getItem('xo_user_id');
    id = legacy || (crypto.randomUUID ? crypto.randomUUID() : ('u-'+Date.now()+'-'+Math.random().toString(16).slice(2)));
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
  const { data, error } = await sb.from('profiles').update({ auth_uid: myAuthUid }).eq('id', myId).is('auth_uid', null).select().single();
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
  if(dataUrl){ el.style.backgroundImage = `url(${dataUrl})`; el.style.backgroundColor = 'transparent'; el.textContent = ''; }
  else { el.style.backgroundImage = 'none'; el.style.backgroundColor = color || '#E5484D'; if(initial !== undefined) el.textContent = initial; }
}

/* ===================== SOUND & EFFECTS ===================== */
let soundOn = true, actx;
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
  if(boardWrap && ['🔥','😮','💪'].includes(emoji)){ boardWrap.classList.add('shake'); setTimeout(()=>boardWrap.classList.remove('shake'),400); }
  const freqMap = {'👍':600,'🔥':300,'😂':750,'😮':450,'💪':500,'🎯':700,'🧠':880,'😈':250};
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
    parts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.c; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6); ctx.restore();
    });
    frame++;
    if(frame<170) requestAnimationFrame(tick); else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  tick();
}
window.addEventListener('resize', ()=>{ const c=document.getElementById('confetti'); if(c){c.width=innerWidth;c.height=innerHeight;} });

/* ===================== CHAT ===================== */
const activeStrips = { p1:null, p2:null };
let lastMessageId = 0, seenMessageIds = new Set(), chatHistory = [];
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

async function sendMessage(roomCode, role, name, content){
  const trimmed = content.trim(); if(!trimmed) return null;
  const { data, error } = await sb.from('xo_messages').insert({ room_code:roomCode, sender_role:role, sender_name:name, content:trimmed, sender_profile_id: myId }).select().single();
  return error ? null : data;
}

function showChatStrip(role, text, isIncoming){
  const panel = document.getElementById(role==='p1' ? 'panelP1' : 'panelP2');
  if(!panel) return;
  if(activeStrips[role]){ clearTimeout(activeStrips[role].timer); activeStrips[role].el.remove(); }
  const el = document.createElement('div');
  el.className = 'chat-strip'; el.textContent = text.length>42 ? text.slice(0,42)+'…' : text;
  panel.appendChild(el);
  const timer = setTimeout(()=>{ el.classList.add('fading'); setTimeout(()=>el.remove(),400); activeStrips[role]=null; }, 4500);
  activeStrips[role] = { el, timer };
  if(isIncoming){ beep(900,.08,'sine',.15); setTimeout(()=>beep(1200,.08,'sine',.12),90); }
}

function clearAllChatStrips(){
  Object.keys(activeStrips).forEach(role=>{ if(activeStrips[role]){ clearTimeout(activeStrips[role].timer); activeStrips[role].el.remove(); activeStrips[role]=null; } });
}

async function deleteRoomMessages(roomCode){ try{ await sb.from('xo_messages').delete().eq('room_code', roomCode); }catch(e){} }

function renderChatSheetBody(){
  const body = document.getElementById('chatSheetBody');
  if(!body) return;
  body.innerHTML = chatHistory.length ? chatHistory.slice().reverse().map(m=>`<div><b>${escapeHtml(m.name||'')}:</b> ${escapeHtml(m.content)}</div>`).join('') : '<div class="empty">لا توجد رسائل بعد</div>';
}
function openChatSheet(){ renderChatSheetBody(); document.getElementById('chatSheetBg').classList.add('show'); }
function closeChatSheet(){ document.getElementById('chatSheetBg').classList.remove('show'); }
async function loadChatHistory(code){
  chatHistory = []; seenMessageIds.clear(); lastMessageId = 0;
  try{
    const { data } = await sb.from('xo_messages').select('*').eq('room_code', code).order('id', {ascending:true});
    (data||[]).forEach(m=>{ chatHistory.push({role:m.sender_role, name:m.sender_name, content:m.content}); seenMessageIds.add(m.id); if(m.id > lastMessageId) lastMessageId = m.id; });
  }catch(e){}
  renderChatSheetBody();
}

/* ===================== MATCHMAKING ===================== */
let mmRow = null, mmOpponentRowId = null, mmChannel = null, mmSearchTimer = null, mmAcceptTimer = null, mmHandlers = {};
function randCode(){ const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<6;i++) s+=c[Math.floor(Math.random()*c.length)]; return s; }

async function mmStartSearch(prof, preferredSize, cb){
  mmHandlers = cb || {};
  await mmStopInternal();
  const { data, error } = await sb.from('xo_matchmaking_queue').insert({
    user_id: prof.id, username: prof.username, avatar_color: prof.avatar_color, avatar_data: prof.avatar_data, status:'waiting', board_size: preferredSize
  }).select().single();
  if(error || !data){ mmHandlers.onCancelled?.('تعذّر الدخول لقائمة البحث'); return; }
  mmRow = data;
  mmChannel = sb.channel('mm-'+mmRow.id)
    .on('postgres_changes', { event:'*', schema:'public', table:'xo_matchmaking_queue' }, (payload)=> mmHandleEvent(payload))
    .subscribe();
  mmSearchTimer = setTimeout(async ()=>{ if(mmRow && mmRow.status==='waiting'){ await mmStopInternal(); mmHandlers.onTimeout?.(); } }, 25000);
  await mmTryClaimOlder(preferredSize);
}

async function mmTryClaimOlder(preferredSize){
  if(!mmRow) return;
  const query = sb.from('xo_matchmaking_queue').select('*').eq('status','waiting').lt('id', mmRow.id);
  if(preferredSize) query.eq('board_size', preferredSize);
  const { data: candidates } = await query.order('id',{ascending:true}).limit(5);
  if(!candidates || candidates.length===0) return;
  for(const cand of candidates){
    const roomCode = randCode();
    const { data: claimed, error } = await sb.from('xo_matchmaking_queue')
      .update({ status:'matched', matched_with: myId, room_code: roomCode })
      .eq('id', cand.id).eq('status','waiting')
      .select().maybeSingle();
    const row = Array.isArray(claimed) ? claimed[0] : claimed;
    if(!error && row){
      mmRow = { ...mmRow, status:'matched', matched_with:cand.user_id, room_code:roomCode };
      mmOpponentRowId = cand.id;
      mmHandlers.onFound?.({ opponent:{username:cand.username, avatar_color:cand.avatar_color, avatar_data:cand.avatar_data}, isInitiator:true, roomCode, boardSize: cand.board_size || 3 });
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
    mmFetchOpponent(row.matched_with).then(opp=>{ mmHandlers.onFound?.({opponent:opp, isInitiator:false, roomCode:row.room_code, boardSize: row.board_size || 3}); mmArmAcceptWindow(); });
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
function mmArmAcceptWindow(){ clearTimeout(mmAcceptTimer); mmAcceptTimer = setTimeout(async ()=>{ if(mmRow && mmRow.status==='matched' && !mmRow.accepted) await mmRespond(false); }, 20000); }

async function mmRespond(accept){
  if(!mmRow) return;
  if(!accept){
    await sb.from('xo_matchmaking_queue').update({status:'cancelled'}).in('id', [mmRow.id, mmOpponentRowId].filter(Boolean));
    mmHandlers.onCancelled?.('تم إلغاء المطابقة'); await mmStopInternal(); return;
  }
  const { data } = await sb.from('xo_matchmaking_queue').update({accepted:true}).eq('id', mmRow.id).select().single();
  if(data) mmRow = data;
  if(mmOpponentRowId){ const { data: oppRow } = await sb.from('xo_matchmaking_queue').select('*').eq('id', mmOpponentRowId).maybeSingle(); mmCheckBothAccepted(oppRow); }
}

async function mmCheckBothAccepted(opponentRow){
  if(!mmRow || !opponentRow) return;
  if(mmRow.accepted && opponentRow.accepted){
    clearTimeout(mmAcceptTimer);
    const opp = await mmFetchOpponent(opponentRow.user_id);
    const isInitiator = mmRow.matched_with===opponentRow.user_id && mmRow.id<opponentRow.id;
    mmHandlers.onBothAccepted?.({opponent:opp, isInitiator, roomCode:mmRow.room_code, boardSize: mmRow.board_size || opponentRow.board_size || 3});
    try{ await sb.from('xo_matchmaking_queue').delete().in('id', [mmRow.id, mmOpponentRowId].filter(Boolean)); }catch(e){}
  }
}

async function mmCancelSearch(){ if(mmRow && mmRow.status==='waiting') await sb.from('xo_matchmaking_queue').delete().eq('id', mmRow.id); await mmStopInternal(); }
async function mmStopInternal(){ clearTimeout(mmSearchTimer); clearTimeout(mmAcceptTimer); if(mmChannel){ sb.removeChannel(mmChannel); mmChannel=null; } mmRow=null; mmOpponentRowId=null; }

/* ===================== GAME LOGIC ===================== */
const GAME_MODES = { ONLINE:'online', AI:'ai', LOCAL:'local' };
const DIFFICULTIES = { EASY:'easy', MEDIUM:'medium', HARD:'hard', EXPERT:'expert' };
const AI_DIFFICULTY_LABELS = { easy:'سهل', medium:'متوسط', hard:'صعب', expert:'خبير' };

let gameState = {
  mode: null, boardSize: 3, winLength: 3, board: [], turn: 'X', winner: null, winningLine: null,
  p1Symbol: 'X', p2Symbol: 'O', status: 'playing', moves: [], undoStack: [],
  p1Wins: 0, p2Wins: 0, draws: 0, aiDifficulty: DIFFICULTIES.MEDIUM,
  timerP1: 0, timerP2: 0, timerInterval: null,
  matchTarget: null, frozenIdx: null, frozenBlocksRole: null, powerMode: null,
  p1Powers: { freeze:true, extra:true, swap:true }, p2Powers: { freeze:true, extra:true, swap:true }
};

const session = { code:null, role:null };
let currentRoom = null, realtimeChannel = null, presenceChannel = null, animating = false;
let spectatorNames = [], knownSpectatorKeys = new Set(), spectatorPresenceReady = false;
let lastTurnKey = null, turnTimer = null, turnCountdownInterval = null;
const TURN_TIME_LIMIT = 15;

function defaultWinLength(size){ return size <= 3 ? 3 : (size === 4 ? 4 : 5); }

function createBoard(size){ return Array(size*size).fill(null); }

function getCell(row, col, size, board){ return (row>=0 && row<size && col>=0 && col<size) ? board[row*size+col] : null; }

function checkWin(board, size, winLen){
  const directions = [[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      const cell = board[r*size+c];
      if(!cell) continue;
      for(const [dr,dc] of directions){
        let count = 1, line = [r*size+c];
        for(let i=1;i<winLen;i++){
          const nr=r+dr*i, nc=c+dc*i;
          if(nr<0||nr>=size||nc<0||nc>=size) break;
          if(board[nr*size+nc] !== cell) break;
          count++; line.push(nr*size+nc);
        }
        if(count >= winLen) return { winner: cell, line };
      }
    }
  }
  if(board.every(c=>c!==null)) return { winner: 'draw', line: null };
  return null;
}

function getAvailableMoves(board){ return board.map((v,i)=>v===null?i:null).filter(v=>v!==null); }

/* ===================== AI — Minimax with Alpha-Beta ===================== */
function evaluateBoard(board, size, winLen, player){
  const opponent = player === 'X' ? 'O' : 'X';
  let score = 0;
  const directions = [[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      for(const [dr,dc] of directions){
        let pCount = 0, oCount = 0, empty = 0;
        for(let i=0;i<winLen;i++){
          const nr=r+dr*i, nc=c+dc*i;
          if(nr<0||nr>=size||nc<0||nc>=size){ empty=-1; break; }
          const v = board[nr*size+nc];
          if(v===player) pCount++;
          else if(v===opponent) oCount++;
          else empty++;
        }
        if(empty===-1) continue;
        if(oCount===0) score += Math.pow(10, pCount);
        if(pCount===0) score -= Math.pow(10, oCount);
      }
    }
  }
  return score;
}

function minimax(board, size, winLen, depth, isMaximizing, alpha, beta, player, maxDepth){
  const result = checkWin(board, size, winLen);
  if(result){
    if(result.winner === player) return { score: 100000 + depth };
    if(result.winner === 'draw') return { score: 0 };
    return { score: -100000 - depth };
  }
  if(depth <= 0 || (maxDepth && depth <= -maxDepth)) return { score: evaluateBoard(board, size, winLen, player) };

  const moves = getAvailableMoves(board);
  const opponent = player === 'X' ? 'O' : 'X';
  const currentPlayer = isMaximizing ? player : opponent;

  let best = isMaximizing ? { score: -Infinity } : { score: Infinity };
  for(const move of moves){
    board[move] = currentPlayer;
    const evalResult = minimax(board, size, winLen, depth-1, !isMaximizing, alpha, beta, player, maxDepth);
    board[move] = null;
    evalResult.move = move;
    if(isMaximizing){ if(evalResult.score > best.score) best = evalResult; alpha = Math.max(alpha, evalResult.score); }
    else { if(evalResult.score < best.score) best = evalResult; beta = Math.min(beta, evalResult.score); }
    if(beta <= alpha) break;
  }
  return best;
}

function getAIMove(board, size, winLen, difficulty, aiPlayer){
  const moves = getAvailableMoves(board);
  if(moves.length === 0) return null;

  // Opening: center is best
  const center = Math.floor(size/2);
  const centerIdx = center*size+center;
  if(moves.length >= size*size-1 && moves.includes(centerIdx)) return centerIdx;

  if(difficulty === DIFFICULTIES.EASY){
    // 40% random, 60% decent move
    if(Math.random() < 0.4) return moves[Math.floor(Math.random()*moves.length)];
    const result = minimax([...board], size, winLen, 2, true, -Infinity, Infinity, aiPlayer, 2);
    return result.move ?? moves[Math.floor(Math.random()*moves.length)];
  }

  if(difficulty === DIFFICULTIES.MEDIUM){
    const result = minimax([...board], size, winLen, 3, true, -Infinity, Infinity, aiPlayer, 3);
    return result.move ?? moves[Math.floor(Math.random()*moves.length)];
  }

  if(difficulty === DIFFICULTIES.HARD){
    const result = minimax([...board], size, winLen, 4, true, -Infinity, Infinity, aiPlayer, 4);
    return result.move ?? moves[0];
  }

  // EXPERT: full depth but limited for performance on large boards
  const maxDepth = size <= 4 ? 8 : (size <= 5 ? 5 : 4);
  const result = minimax([...board], size, winLen, maxDepth, true, -Infinity, Infinity, aiPlayer, maxDepth);
  return result.move ?? moves[0];
}

function getHintMove(){
  if(gameState.winner || gameState.mode === GAME_MODES.ONLINE && gameState.turn !== session.roleSymbol) return null;
  const player = gameState.turn;
  const depth = gameState.boardSize <= 4 ? 6 : (gameState.boardSize <= 5 ? 4 : 3);
  const result = minimax([...gameState.board], gameState.boardSize, gameState.winLength, depth, true, -Infinity, Infinity, player, depth);
  return result.move ?? null;
}

/* ===================== UI HELPERS ===================== */
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function buildRoomLink(code){ const url=new URL(location.href); url.search=''; url.hash=''; url.searchParams.set('r',code); return url.toString(); }
function saveSession(){ if(session.code && session.role){ localStorage.setItem('xo_session', JSON.stringify({code:session.code, role:session.role, ts:Date.now()})); } }
function loadSession(){ try{ const s = JSON.parse(localStorage.getItem('xo_session')); if(s && Date.now()-s.ts < 1000*60*60*4){ return s; } }catch(e){} return null; }
function clearSession(){ localStorage.removeItem('xo_session'); }

function setDbStatus(ok){ document.getElementById('dbDot').classList.toggle('off', !ok); }
function setRtStatus(ok){ document.getElementById('rtSeg').style.display='flex'; document.getElementById('rtDot').classList.toggle('off', !ok); }

let chatUiEnabled = false;
function showScreen(name){
  ['onboarding','home','matching','game'].forEach(s=>{
    const el = document.getElementById('screen-'+s);
    if(el) el.style.display = (s===name) ? (s==='game' ? 'flex':'block') : 'none';
  });
  document.querySelector('.mini-userbar').style.display = (name!=='onboarding' && name!=='game') ? 'flex':'none';
  chatUiEnabled = (name==='game' && gameState.mode !== GAME_MODES.LOCAL && gameState.mode !== GAME_MODES.AI);
  document.getElementById('composerBottom').classList.remove('open');
  document.getElementById('btnChatFab').classList.toggle('visible', chatUiEnabled);
  document.body.classList.toggle('in-game', name==='game');
}

function openChatComposer(){
  if(!chatUiEnabled) return;
  document.getElementById('composerBottom').classList.add('open');
  document.getElementById('btnChatFab').classList.remove('visible');
  setTimeout(()=> document.getElementById('chatInput').focus(), 50);
}
function closeChatComposer(){
  document.getElementById('composerBottom').classList.remove('open');
  document.getElementById('btnChatFab').classList.toggle('visible', chatUiEnabled);
}
document.getElementById('btnChatFab').addEventListener('click', (e)=>{ e.stopPropagation(); openChatComposer(); });
document.addEventListener('click', (e)=>{
  const composer = document.getElementById('composerBottom');
  if(!composer.classList.contains('open')) return;
  if(composer.contains(e.target) || e.target.id === 'btnChatFab') return;
  closeChatComposer();
});

function resetToHome(){
  leaveRoom();
  document.getElementById('winModal').style.display='none';
  document.getElementById('winModal').classList.remove('match-champion');
  stopGameTimer();
  gameState.powerMode = null; gameState.matchTarget = null; gameState.frozenIdx = null; gameState.frozenBlocksRole = null;
  showScreen('home');
  loadGlobalCounter();
  if(history.replaceState) history.replaceState({}, '', location.pathname);
}

function enterGameScreen(){ showScreen('game'); renderGame(); }

/* ===================== BOARD RENDERING ===================== */
function renderBoard(){
  const boardEl = document.getElementById('board');
  const size = gameState.boardSize;
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;

  const fontSize = size <= 3 ? 'clamp(28px, 8vw, 56px)' : (size <= 5 ? 'clamp(18px, 5vw, 36px)' : (size <= 7 ? 'clamp(14px, 3.5vw, 26px)' : 'clamp(10px, 2.5vw, 18px)'));

  gameState.board.forEach((cell, idx)=>{
    const div = document.createElement('div');
    const isFrozen = gameState.frozenIdx === idx;
    div.className = 'board-cell' + (cell ? ' taken' : '') + (cell==='X'?' cell-x':'') + (cell==='O'?' cell-o':'') + (gameState.winningLine?.includes(idx)?' winning':'') + (idx===hintIndex?' hint-cell':'') + (isFrozen?' frozen-cell':'') + (gameState.powerMode?' power-targeting':'');
    div.style.fontSize = fontSize;
    div.dataset.idx = idx;
    if(cell === 'X') div.textContent = '❌';
    else if(cell === 'O') div.textContent = '⭕';
    if(isFrozen){ const ov = document.createElement('span'); ov.className='frozen-overlay'; ov.textContent='❄️'; div.appendChild(ov); }
    if(gameState.powerMode){
      const validTarget = gameState.powerMode === 'freeze' ? !cell : (gameState.powerMode === 'swap' ? (cell && cell !== session.roleSymbol) : false);
      if(validTarget) div.addEventListener('click', ()=> useOnlinePower(gameState.powerMode, idx));
      else div.classList.add('invalid-target');
    } else if(!cell && gameState.status === 'playing' && canPlay() && !(isFrozen && gameState.frozenBlocksRole === session.role)){
      div.addEventListener('click', ()=> onCellClick(idx));
    }
    boardEl.appendChild(div);
  });

  renderWinLine();
}

let hintIndex = -1;
function showHint(){
  if(hintIndex !== -1){ hintIndex = -1; renderBoard(); return; }
  const move = getHintMove();
  if(move !== null){ hintIndex = move; renderBoard(); setTimeout(()=>{ hintIndex = -1; renderBoard(); }, 2000); }
}

function renderWinLine(){
  const svg = document.getElementById('winLineSvg');
  svg.innerHTML = '';
  if(!gameState.winningLine || gameState.winningLine.length < 2) return;
  const size = gameState.boardSize;
  const line = gameState.winningLine;
  const r1 = Math.floor(line[0]/size), c1 = line[0]%size;
  const r2 = Math.floor(line[line.length-1]/size), c2 = line[line.length-1]%size;
  const x1 = ((c1+0.5)/size)*100, y1 = ((r1+0.5)/size)*100;
  const x2 = ((c2+0.5)/size)*100, y2 = ((r2+0.5)/size)*100;
  const path = document.createElementNS('http://www.w3.org/2000/svg','line');
  path.setAttribute('x1', x1); path.setAttribute('y1', y1);
  path.setAttribute('x2', x2); path.setAttribute('y2', y2);
  path.setAttribute('class', 'win-line');
  svg.appendChild(path);
}

function canPlay(){
  if(gameState.winner) return false;
  if(gameState.mode === GAME_MODES.AI) return gameState.turn === gameState.p1Symbol;
  if(gameState.mode === GAME_MODES.ONLINE) return gameState.turn === session.roleSymbol && currentRoom?.status === 'playing';
  if(gameState.mode === GAME_MODES.LOCAL) return true;
  return false;
}

/* ===================== قوى اللاعب (Power-ups) — أونلاين فقط ===================== */
const POWER_META = {
  freeze: { icon:'❄️', label:'تجميد خانة', hint:'اختر خانة فارغة لتجميدها على الخصم دورًا واحدًا' },
  extra:  { icon:'🔁', label:'حركة إضافية', hint:'العب حركتك القادمة ثم احتفظ بالدور لنفسك' },
  swap:   { icon:'🔄', label:'سرقة خانة', hint:'اختر خانة للخصم لتحويلها إلى رمزك' }
};

function renderPowerBar(){
  const bar = document.getElementById('powersBar');
  if(!bar) return;
  const isOnline = gameState.mode === GAME_MODES.ONLINE;
  const isSpectator = session.role === 'spectator';
  if(!isOnline || isSpectator || gameState.status !== 'playing'){ bar.style.display='none'; gameState.powerMode=null; return; }
  bar.style.display = 'flex';
  const myPowers = session.role === 'p1' ? gameState.p1Powers : gameState.p2Powers;
  const myTurn = canPlay();
  bar.innerHTML = Object.keys(POWER_META).map(key=>{
    const meta = POWER_META[key];
    const available = myPowers && myPowers[key];
    const usable = available && (key==='extra' ? myTurn : true) && !gameState.powerMode;
    const active = gameState.powerMode === key;
    return `<button class="power-btn ${active?'active':''}" data-power="${key}" title="${meta.hint}" ${(!available||(!usable&&!active))?'disabled':''}>${meta.icon}<span>${meta.label}</span></button>`;
  }).join('');
  bar.querySelectorAll('.power-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> onPowerButtonClick(btn.dataset.power));
  });
}

function onPowerButtonClick(power){
  if(gameState.powerMode === power){ gameState.powerMode = null; renderBoard(); renderPowerBar(); return; }
  if(power === 'extra'){ useOnlinePower('extra', null); return; }
  gameState.powerMode = power;
  showTurnBubble(POWER_META[power].hint);
  renderBoard(); renderPowerBar();
}

async function useOnlinePower(power, targetIdx){
  if(!currentRoom || session.role==='spectator') return;
  const expectedRev = currentRoom.rev;
  gameState.powerMode = null;
  const { data, error } = await sb.rpc('xo_use_power', {
    p_code: session.code, p_role: session.role, p_power: power, p_target_idx: targetIdx, p_expected_rev: expectedRev
  });
  const result = Array.isArray(data) ? data[0] : data;
  if(!error && result?.ok && result.out_room){
    syncRoomState(result.out_room);
    beep(power==='freeze'?520:(power==='swap'?700:640), .18, 'square');
    if(power==='swap') launchConfetti();
  } else {
    renderBoard(); renderPowerBar();
  }
}


async function onCellClick(idx){
  if(gameState.board[idx] || gameState.winner) return;
  if(!canPlay()) return;

  if(gameState.mode === GAME_MODES.ONLINE){
    await playOnlineMove(idx);
    return;
  }

  makeMove(idx);

  if(gameState.mode === GAME_MODES.AI && !gameState.winner){
    setTimeout(()=>{
      const aiMove = getAIMove(gameState.board, gameState.boardSize, gameState.winLength, gameState.aiDifficulty, gameState.p2Symbol);
      if(aiMove !== null) makeMove(aiMove);
    }, 400);
  }
}

function makeMove(idx){
  if(gameState.board[idx] || gameState.winner) return;
  gameState.undoStack.push({ board: [...gameState.board], turn: gameState.turn, moves: [...gameState.moves] });
  if(gameState.undoStack.length > 5) gameState.undoStack.shift();

  gameState.board[idx] = gameState.turn;
  gameState.moves.push({ player: gameState.turn, idx });

  const result = checkWin(gameState.board, gameState.boardSize, gameState.winLength);
  if(result){
    gameState.winner = result.winner;
    gameState.winningLine = result.line;
    gameState.status = 'finished';
    stopGameTimer();
    if(result.winner === 'draw'){ beep(400,.3,'sine'); }
    else {
      beep(880,.15,'triangle'); setTimeout(()=>beep(1100,.2,'triangle'),120);
      if(gameState.mode !== GAME_MODES.ONLINE) updateLocalScores(result.winner);
    }
    setTimeout(()=> openWinModal(gameState.mode !== GAME_MODES.ONLINE && isMatchDecided()), 600);
  } else {
    gameState.turn = gameState.turn === 'X' ? 'O' : 'X';
    beep(520,.08,'square');
    startTurnTimer();
  }
  renderGame();
}

function undoMove(){
  if(gameState.mode === GAME_MODES.ONLINE) return;
  if(gameState.undoStack.length === 0) return;
  if(gameState.winner) return;
  const prev = gameState.undoStack.pop();
  gameState.board = prev.board;
  gameState.turn = prev.turn;
  gameState.moves = prev.moves;
  renderGame();
}

function resetBoard(){
  gameState.board = createBoard(gameState.boardSize);
  gameState.turn = 'X';
  gameState.winner = null;
  gameState.winningLine = null;
  gameState.status = 'playing';
  gameState.moves = [];
  gameState.undoStack = [];
  stopGameTimer();
  startTurnTimer();
  renderGame();
}

function updateLocalScores(winner){
  if(winner === 'draw') gameState.draws++;
  else if(winner === gameState.p1Symbol) gameState.p1Wins++;
  else gameState.p2Wins++;
}

/* ===================== TIMER ===================== */
function startTurnTimer(){
  stopGameTimer();
  if(gameState.mode === GAME_MODES.LOCAL) return;
  gameState.timerInterval = setInterval(()=>{
    if(gameState.turn === 'X') gameState.timerP1++;
    else gameState.timerP2++;
    updateTimerDisplay();
  }, 1000);
}
function stopGameTimer(){ if(gameState.timerInterval){ clearInterval(gameState.timerInterval); gameState.timerInterval = null; } }
function startTimerIfPlaying(){ if(gameState.status === 'playing') startTurnTimer(); }
function updateTimerDisplay(){
  const f = (s)=> `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const t1 = document.getElementById('timerP1');
  const t2 = document.getElementById('timerP2');
  if(t1) t1.textContent = f(gameState.timerP1);
  if(t2) t2.textContent = f(gameState.timerP2);
}

/* ===================== GAME UI RENDER ===================== */
function renderGame(){
  const isOnline = gameState.mode === GAME_MODES.ONLINE;
  const isSpectator = session.role === 'spectator';
  const mySymbol = isOnline ? session.roleSymbol : gameState.p1Symbol;
  const oppSymbol = mySymbol === 'X' ? 'O' : 'X';

  document.getElementById('boardSizeLabel').textContent = `${gameState.boardSize} × ${gameState.boardSize}`;
  document.getElementById('winLengthLabel').textContent = `فوز بـ ${gameState.winLength}`;
  document.getElementById('gameModeLabel').textContent = isOnline ? 'أونلاين' : (gameState.mode === GAME_MODES.AI ? 'ضد الذكاء' : 'محلي');
  const scoreLabel = document.getElementById('matchScoreLabel');
  if(gameState.matchTarget){
    scoreLabel.style.display = 'inline';
    scoreLabel.textContent = `🏆 أفضل من ${gameState.matchTarget} — ${gameState.p1Wins}:${gameState.p2Wins}`;
  } else {
    scoreLabel.style.display = 'none';
  }

  if(isOnline && currentRoom){
    document.getElementById('nameP1').textContent = currentRoom.p1_name || '—';
    document.getElementById('nameP2').textContent = currentRoom.p2_name || 'بانتظار لاعب…';
    document.getElementById('symP1').textContent = currentRoom.p1_symbol || '❌';
    document.getElementById('symP2').textContent = currentRoom.p2_symbol || '⭕';
    applyAvatarVisual(document.getElementById('avatarP1'), currentRoom.p1_avatar_color, currentRoom.p1_avatar_data, currentRoom.p1_name?currentRoom.p1_name[0]:'?');
    applyAvatarVisual(document.getElementById('avatarP2'), currentRoom.p2_avatar_color, currentRoom.p2_avatar_data, currentRoom.p2_name?currentRoom.p2_name[0]:'?');
    document.getElementById('winsP1').textContent = (currentRoom.p1_wins||0) + ' فوز';
    document.getElementById('winsP2').textContent = (currentRoom.p2_wins||0) + ' فوز';
    renderLevelBadge(document.getElementById('levelBadgeP1'), currentRoom.p1_level, true);
    renderLevelBadge(document.getElementById('levelBadgeP2'), currentRoom.p2_level, true);
    renderLevelBadge(document.getElementById('nameLevelP1'), currentRoom.p1_level, false);
    renderLevelBadge(document.getElementById('nameLevelP2'), currentRoom.p2_level, false);
    renderTitleBadge(document.getElementById('nameTitleP1'), currentRoom.p1_title_ar, currentRoom.p1_title_icon);
    renderTitleBadge(document.getElementById('nameTitleP2'), currentRoom.p2_title_ar, currentRoom.p2_title_icon);
    const linkWrap = document.querySelector('.tb-link-wrap');
    const linkInput = document.getElementById('tbLinkInput');
    if(linkInput){ linkInput.value = buildRoomLink(currentRoom.code); }
    if(linkWrap) linkWrap.style.display = '';
  } else {
    document.getElementById('nameP1').textContent = localProfile?.username || 'أنت';
    document.getElementById('nameP2').textContent = gameState.mode === GAME_MODES.AI ? 'الذكاء الاصطناعي' : 'صديق';
    document.getElementById('symP1').textContent = gameState.p1Symbol === 'X' ? '❌' : '⭕';
    document.getElementById('symP2').textContent = gameState.p2Symbol === 'X' ? '❌' : '⭕';
    applyAvatarVisual(document.getElementById('avatarP1'), localProfile?.avatar_color, localProfile?.avatar_data, localProfile?.username?localProfile.username[0]:'?');
    applyAvatarVisual(document.getElementById('avatarP2'), '#8E5CF2', null, '🤖');
    document.getElementById('winsP1').textContent = gameState.p1Wins + ' فوز';
    document.getElementById('winsP2').textContent = gameState.p2Wins + ' فوز';
    renderLevelBadge(document.getElementById('levelBadgeP1'), localProfile?.level, true);
    renderLevelBadge(document.getElementById('levelBadgeP2'), 1, true);
    renderLevelBadge(document.getElementById('nameLevelP1'), localProfile?.level, false);
    renderLevelBadge(document.getElementById('nameLevelP2'), 1, false);
    const linkWrap = document.querySelector('.tb-link-wrap');
    if(linkWrap) linkWrap.style.display = 'none';
  }

  document.getElementById('panelP1').classList.toggle('active-turn', gameState.turn==='X' && !gameState.winner);
  document.getElementById('panelP2').classList.toggle('active-turn', gameState.turn==='O' && !gameState.winner);
  document.getElementById('roleTagP1').textContent = isOnline ? (session.role==='p1'?'أنت':'الخصم') : 'اللاعب 1';
  document.getElementById('roleTagP2').textContent = isOnline ? (session.role==='p2'?'أنت':'الخصم') : (gameState.mode===GAME_MODES.AI?'الذكاء':'اللاعب 2');
  document.getElementById('editBadgeP1').style.display = (isOnline && session.role==='p1') || !isOnline ? 'flex':'none';
  document.getElementById('editBadgeP2').style.display = 'none';

  renderBoard();
  renderPowerBar();

  const banner = document.getElementById('turnBanner');
  let bannerText = '';
  if(gameState.winner === 'draw') bannerText = '🤝 تعادل!';
  else if(gameState.winner) bannerText = '🏆 فاز ' + (gameState.winner==='X'?'❌':'⭕');
  else bannerText = (gameState.turn==='X'?'❌':'⭕') + ' دور ' + (gameState.turn===mySymbol?'أنت':'الخصم');
  banner.textContent = bannerText;

  const turnKey = gameState.status+'|'+gameState.turn+'|'+(gameState.winner||'');
  if(turnKey !== lastTurnKey){ lastTurnKey = turnKey; showTurnBubble(bannerText); }

  // Controls
  const btnHint = document.getElementById('btnHint');
  const btnUndo = document.getElementById('btnUndo');
  const btnReset = document.getElementById('btnReset');
  if(btnHint) btnHint.disabled = isSpectator || (isOnline && gameState.turn !== session.roleSymbol) || !!gameState.winner;
  if(btnUndo) btnUndo.disabled = isOnline || gameState.undoStack.length===0 || !!gameState.winner;
  if(btnReset) btnReset.disabled = false;

  document.getElementById('chatInput').style.display = isSpectator ? 'none' : '';
  document.getElementById('btnSendChat').style.display = isSpectator ? 'none' : '';
}

let turnBubbleTimer = null;
function showTurnBubble(text){
  const bubble = document.getElementById('turnBubble');
  if(!bubble || !text) return;
  bubble.textContent = text; bubble.classList.remove('show'); void bubble.offsetWidth;
  bubble.classList.add('show'); clearTimeout(turnBubbleTimer);
  turnBubbleTimer = setTimeout(()=> bubble.classList.remove('show'), 1500);
}

function openWinModal(matchDone){
  const modal = document.getElementById('winModal');
  if(modal.style.display==='flex') return;
  const wasForfeit = lastMoveWasForfeit; lastMoveWasForfeit = false;
  const isSpectator = session.role === 'spectator';
  const mySymbol = gameState.mode === GAME_MODES.ONLINE ? session.roleSymbol : gameState.p1Symbol;
  let title, text, trophy = '🏆';
  const iWon = gameState.winner === mySymbol && !isSpectator;

  if(matchDone){
    trophy = '👑';
    const scoreTxt = `النتيجة النهائية ${gameState.p1Wins} - ${gameState.p2Wins}`;
    if(isSpectator) title = '🏁 انتهت المباراة';
    else if(iWon) title = '👑 أنت بطل المباراة!';
    else title = '🥈 خسرت المباراة';
    text = scoreTxt;
    document.getElementById('btnRematch').textContent = '🎲 مباراة جديدة';
  } else {
    document.getElementById('btnRematch').textContent = '🔁 إعادة اللعب';
    if(gameState.winner === 'draw'){ title = '🤝 تعادل!'; text = 'لم يفز أحد في هذه الجولة.'; }
    else if(wasForfeit){
      title = iWon ? '⏱️ فزت بسبب انسحاب الخصم' : '⏱️ خسرت بسبب تأخّرك';
      text = iWon ? 'لم يلعب الخصم خلال الوقت المحدد 6 مرات متتالية.' : 'فاتتك مهلة الـ15 ثانية 6 مرات متتالية دون أن تلعب يدويًا.';
    }
    else if(iWon){ title = '🎉 أنت الفائز!'; text = 'لعبت ببراعة!'; }
    else if(isSpectator){ title = '🏁 انتهت الجولة'; text = 'فاز ' + (gameState.winner==='X'?'❌':'⭕'); }
    else { title = '😅 خسرت هذه المرة'; text = 'فاز ' + (gameState.winner==='X'?'❌':'⭕'); }
    if(gameState.mode === GAME_MODES.ONLINE && gameState.matchTarget){
      text += ` — النتيجة ${gameState.p1Wins}:${gameState.p2Wins} (أفضل من ${gameState.matchTarget})`;
    }
  }
  document.getElementById('winTrophy').textContent = trophy;
  document.getElementById('winTitle').textContent = title;
  document.getElementById('winText').textContent = text;
  document.getElementById('btnRematch').style.display = (isSpectator || (matchDone && gameState.mode===GAME_MODES.ONLINE)) ? 'none' : 'inline-flex';
  modal.style.display='flex';
  modal.classList.toggle('match-champion', !!matchDone);
  launchConfetti();
  if(matchDone && iWon){ setTimeout(launchConfetti, 350); setTimeout(launchConfetti, 700); if(navigator.vibrate) navigator.vibrate([80,60,80,60,160]); }
  if(gameState.winner !== 'draw'){ beep(880,.2,'triangle'); setTimeout(()=>beep(1100,.25,'triangle'),150); if(matchDone && iWon) setTimeout(()=>beep(1400,.3,'triangle'),320); }

  if(!isSpectator){
    const opponent = gameState.mode === GAME_MODES.ONLINE
      ? ((session.role==='p1' ? currentRoom?.p2_name : currentRoom?.p1_name) || 'خصم')
      : (gameState.mode === GAME_MODES.AI ? `🤖 الذكاء الاصطناعي (${AI_DIFFICULTY_LABELS[gameState.aiDifficulty] || ''})` : '👥 لعب محلي');
    const result = gameState.winner === 'draw' ? 'draw' : (iWon ? 'win' : 'lose');
    saveHistoryEntry({
      date: new Date().toLocaleString('ar', {dateStyle:'medium', timeStyle:'short'}),
      opp: opponent, size: gameState.boardSize, result, matchDone: !!matchDone
    });
  }
}

/* ===================== ONLINE GAME ===================== */
async function createRoom(boardSize, winLength, matchTarget){
  let code, ok=false, attempts=0;
  const p1Sym = 'X', p2Sym = 'O';
  while(!ok && attempts<5){
    code = randCode();
    const { error } = await sb.from('xo_rooms').insert({
      code, status:'waiting', turn:'X', board_size: boardSize, win_length: winLength, match_target: matchTarget || null,
      p1_user_id: myId, p1_name: profile.username, p1_avatar_color: profile.avatar_color, p1_avatar_data: profile.avatar_data,
      p1_symbol: p1Sym, p2_symbol: p2Sym, p1_level: profile.level || 1, p1_title_ar: profile.title_ar, p1_title_icon: profile.title_icon,
      board: createBoard(boardSize), moves: [], winner: null, p1_wins:0, p2_wins:0, rev:0,
      p1_powers:{freeze:true,extra:true,swap:true}, p2_powers:{freeze:true,extra:true,swap:true}
    });
    if(!error) ok=true; attempts++;
  }
  if(!ok) return { error:'تعذّر إنشاء الجولة' };
  session.code=code; session.role='p1'; session.roleSymbol='X';
  saveSession();
  subscribeToRoom(code); subscribeToPresence(code);
  const { data: room } = await sb.from('xo_rooms').select('*').eq('code', code).single();
  return { code, room };
}

async function joinRoomByCode(code){
  const { data: room, error } = await sb.from('xo_rooms').select('*').eq('code', code).single();
  if(error || !room) return { error:'لم يتم العثور على جولة بهذا الرمز' };

  if(room.p1_user_id === myId){ session.code=code; session.role='p1'; session.roleSymbol=room.p1_symbol||'X'; saveSession(); subscribeToRoom(code); subscribeToPresence(code); return { room }; }
  if(room.p2_user_id === myId){ session.code=code; session.role='p2'; session.roleSymbol=room.p2_symbol||'O'; saveSession(); subscribeToRoom(code); subscribeToPresence(code); return { room }; }
  if(room.p2_name){ session.code=code; session.role='spectator'; saveSession(); subscribeToRoom(code); subscribeToPresence(code); return { room }; }

  const { data: saved, error: err2 } = await sb.from('xo_rooms').update({
    p2_user_id: myId, p2_name: profile.username, p2_avatar_color: profile.avatar_color, p2_avatar_data: profile.avatar_data,
    p2_level: profile.level || 1, p2_title_ar: profile.title_ar || null, p2_title_icon: profile.title_icon || null,
    status:'playing', rev: room.rev + 1
  }).eq('code', code).eq('rev', room.rev).is('p2_user_id', null).select().maybeSingle();
  if(err2 || !saved){
    const { data: latest } = await sb.from('xo_rooms').select('*').eq('code', code).single();
    if(latest && latest.p2_name){ session.code=code; session.role='spectator'; saveSession(); subscribeToRoom(code); subscribeToPresence(code); return { room: latest }; }
    return { error:'تعذّر الانضمام' };
  }
  session.code=code; session.role='p2'; session.roleSymbol=room.p2_symbol||'O';
  saveSession(); subscribeToRoom(code); subscribeToPresence(code);
  return { room: saved };
}

async function submitMove(idx, forRole, isAuto){
  if(!currentRoom || currentRoom.status !== 'playing') return;
  clearAutoMoveTimer(); clearWatchdogTimer();
  const expectedRev = currentRoom.rev;
  const symbol = forRole==='p1' ? (currentRoom.p1_symbol||'X') : (currentRoom.p2_symbol||'O');
  const { data, error } = await sb.rpc('xo_play_move', {
    p_code: session.code, p_idx: idx, p_symbol: symbol, p_role: forRole, p_expected_rev: expectedRev, p_is_auto: !!isAuto
  });
  const result = Array.isArray(data) ? data[0] : data;
  if(error || !result){
    const { data: refreshed } = await sb.from('xo_rooms').select('*').eq('code', session.code).single();
    if(refreshed) syncRoomState(refreshed);
    return;
  }
  if(result.no_op){
    syncRoomState(result.out_room);
    return;
  }
  lastMoveWasForfeit = !!result.forfeited;
  syncRoomState(result.out_room);
  if(result.out_room.status === 'finished'){
    maybeAwardGameXP(result.out_room);
    scheduleRoomCleanup(session.code);
  }
}

async function playOnlineMove(idx){
  if(!currentRoom || currentRoom.status !== 'playing') return;
  if(gameState.turn !== session.roleSymbol) return;
  if(idx === gameState.frozenIdx && gameState.frozenBlocksRole === session.role) return;
  await submitMove(idx, session.role, false);
}

/* ====== حركة تلقائية عشوائية عند انتهاء مهلة الـ15 ثانية (لنفسي أو نيابةً عن الخصم الغائب) ====== */
function roleForSymbol(sym){ return (currentRoom && sym === currentRoom.p1_symbol) ? 'p1' : 'p2'; }

function pickRandomEmptyCell(forRole){
  const empties = gameState.board.map((c,i)=> c ? null : i).filter(i=> i!==null);
  const usable = empties.filter(i => !(i === gameState.frozenIdx && gameState.frozenBlocksRole === forRole));
  const pool = usable.length ? usable : empties;
  if(!pool.length) return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

async function autoPlayForRole(forRole){
  if(!currentRoom || currentRoom.status !== 'playing') return;
  const symbol = forRole==='p1' ? currentRoom.p1_symbol : currentRoom.p2_symbol;
  if(gameState.turn !== symbol) return; // لم يعد دوره فعليًا
  const idx = pickRandomEmptyCell(forRole);
  if(idx===null) return;
  await submitMove(idx, forRole, true);
}

/* ====== مؤقّت دوري شخصي: حركة تلقائية إذا لم ألعب خلال 15 ثانية ====== */
let autoMoveTimer = null, autoMoveCountdownInterval = null;
function clearAutoMoveTimer(){
  clearTimeout(autoMoveTimer); autoMoveTimer = null;
  clearInterval(autoMoveCountdownInterval); autoMoveCountdownInterval = null;
  const badge = document.getElementById('turnCountdown');
  if(badge) badge.textContent = '';
}
function armAutoMoveTimer(){
  clearAutoMoveTimer();
  if(gameState.mode !== GAME_MODES.ONLINE || gameState.status !== 'playing') return;
  if(session.role !== 'p1' && session.role !== 'p2') return;
  if(gameState.turn !== session.roleSymbol) return;
  let remaining = TURN_TIME_LIMIT;
  const badge = document.getElementById('turnCountdown');
  if(badge) badge.textContent = `⏳ ${remaining}`;
  autoMoveCountdownInterval = setInterval(()=>{
    remaining--;
    if(badge) badge.textContent = remaining>0 ? `⏳ ${remaining}` : '';
    if(remaining<=0) clearInterval(autoMoveCountdownInterval);
  }, 1000);
  autoMoveTimer = setTimeout(()=>{
    autoMoveTimer = null;
    if(currentRoom && currentRoom.status==='playing' && gameState.turn===session.roleSymbol){
      autoPlayForRole(session.role);
    }
  }, TURN_TIME_LIMIT*1000);
}

/* ====== الحارس الاحتياطي: يعمل في كل متصفح متصل ليس دوره الآن (خصم أو مشاهد)، ويلعب نيابةً
   عن صاحب الدور تلقائيًا إن لم يفعل حتى بعد مهلة إضافية — يبقي الجولة تعمل حتى لو أغلق صاحب
   الدور صفحته فعليًا ولم يعد مؤقّته الشخصي (armAutoMoveTimer) موجودًا إطلاقًا ====== */
const WATCHDOG_GRACE = 6;
let watchdogTimer = null, watchdogRevKey = null;
function clearWatchdogTimer(){ clearTimeout(watchdogTimer); watchdogTimer = null; watchdogRevKey = null; }
function armWatchdogTimer(room){
  if(gameState.mode !== GAME_MODES.ONLINE || room.status !== 'playing'){ clearWatchdogTimer(); return; }
  const key = room.code + '|' + room.rev + '|' + room.turn;
  if(watchdogRevKey === key) return;
  clearWatchdogTimer();
  watchdogRevKey = key;
  const turnSymbol = room.turn, expectedRev = room.rev, turnRole = roleForSymbol(turnSymbol);
  watchdogTimer = setTimeout(async ()=>{
    watchdogTimer = null;
    const { data: fresh } = await sb.from('xo_rooms').select('*').eq('code', session.code).single();
    if(fresh && fresh.status==='playing' && fresh.turn===turnSymbol && fresh.rev===expectedRev){
      await autoPlayForRole(turnRole);
    }
  }, (TURN_TIME_LIMIT + WATCHDOG_GRACE) * 1000);
}

let lastMoveWasForfeit = false;

function syncRoomState(room){
  const isFirstSync = !currentRoom;
  const prevFrozen = gameState.frozenIdx;
  const prevStatus = gameState.status;
  const prevMovesLen = (gameState.moves || []).length;
  currentRoom = room;
  gameState.boardSize = room.board_size || 3;
  gameState.winLength = room.win_length || defaultWinLength(gameState.boardSize);
  gameState.board = room.board || createBoard(gameState.boardSize);
  gameState.turn = room.turn || 'X';
  gameState.winner = room.winner || null;
  gameState.winningLine = room.winning_line || null;
  gameState.status = room.status || 'playing';
  gameState.moves = room.moves || [];
  gameState.p1Wins = room.p1_wins || 0;
  gameState.p2Wins = room.p2_wins || 0;
  gameState.matchTarget = room.match_target || null;
  gameState.frozenIdx = (room.frozen_idx === undefined || room.frozen_idx === null) ? null : room.frozen_idx;
  gameState.frozenBlocksRole = room.frozen_blocks_role || null;
  gameState.p1Powers = room.p1_powers || { freeze:true, extra:true, swap:true };
  gameState.p2Powers = room.p2_powers || { freeze:true, extra:true, swap:true };
  if(gameState.frozenIdx !== prevFrozen && gameState.frozenIdx !== null && gameState.frozenBlocksRole === session.role){
    showTurnBubble('❄️ الخصم جمّد خانة عليك — تجنّبها هذا الدور!');
  }
  // صوت وضع الرمز — لكل حركة جديدة تصل من أي طرف (نحن أو الخصم)
  if(!isFirstSync && gameState.moves.length > prevMovesLen) beep(520,.08,'square');
  // الوقت يبدأ فقط لحظة انضمام الخصم فعليًا (تحوّل حالة الغرفة من "بانتظار" إلى "قيد اللعب")
  if(prevStatus !== 'playing' && gameState.status === 'playing') startTurnTimer();
  if(gameState.status !== 'playing') stopGameTimer();
  // مؤقّت الحركة التلقائية (15 ثانية) + الحارس الاحتياطي — أونلاين فقط وأثناء اللعب
  if(gameState.mode === GAME_MODES.ONLINE && gameState.status === 'playing'){
    startTurnTimer();      // ← أضف هذا السطر
    armAutoMoveTimer();
    armWatchdogTimer(room);
  } else {
    clearAutoMoveTimer(); clearWatchdogTimer();
  }
  const matchDone = isMatchDecided();
  if(room.status === 'finished' && document.getElementById('winModal').style.display !== 'flex'){
    setTimeout(()=> openWinModal(matchDone), 400);
  }
  renderGame();
}

function applyExtraRoomFields(room){
  gameState.matchTarget = room.match_target || null;
  gameState.frozenIdx = (room.frozen_idx === undefined || room.frozen_idx === null) ? null : room.frozen_idx;
  gameState.frozenBlocksRole = room.frozen_blocks_role || null;
  gameState.p1Powers = room.p1_powers || { freeze:true, extra:true, swap:true };
  gameState.p2Powers = room.p2_powers || { freeze:true, extra:true, swap:true };
}

function isMatchDecided(){
  if(!gameState.matchTarget) return false;
  const need = Math.ceil(gameState.matchTarget/2);
  return gameState.p1Wins >= need || gameState.p2Wins >= need;
}

function subscribeToRoom(code){
  if(realtimeChannel) sb.removeChannel(realtimeChannel);
  realtimeChannel = sb.channel('room-xo-'+code)
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'xo_rooms', filter:`code=eq.${code}` }, (payload)=>{
      syncRoomState(payload.new);
    })
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'xo_messages', filter:`room_code=eq.${code}` }, (payload)=> handleIncomingMessage(payload.new))
    .subscribe((status)=>{ setRtStatus(status==='SUBSCRIBED'); });

  if(window._roomPoll) clearInterval(window._roomPoll);
  window._roomPoll = setInterval(async ()=>{
    if(!session.code) return;
    try{
      const { data:room } = await sb.from('xo_rooms').select('*').eq('code', session.code).single();
      if(room && (!currentRoom || currentRoom.rev !== room.rev)) syncRoomState(room);
    }catch(e){}
    pollMissedMessages();
  }, 3000);
}

function subscribeToPresence(code){
  if(presenceChannel) sb.removeChannel(presenceChannel);
  const presenceKey = session.role==='spectator' ? ('spectator-'+myId) : session.role;
  knownSpectatorKeys = new Set(); spectatorPresenceReady = false; spectatorNames = [];
  presenceChannel = sb.channel('presence-xo-'+code, { config:{ presence:{ key: presenceKey } } });
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
      knownSpectatorKeys = currentKeys; spectatorPresenceReady = true;
      spectatorNames = spectatorEntries.map(([,presences])=> presences?.[0]?.name || 'زائر');
      renderSpectatorBadge();
    })
    .on('broadcast', {event:'react'}, ({payload})=> fireReaction(payload.from, payload.emoji))
    .subscribe(async (status)=>{ if(status==='SUBSCRIBED') await presenceChannel.track({role:session.role, name:localProfile?.username||'', at:Date.now()}); });
}

function leaveRoom(){
  if(window._roomPoll) clearInterval(window._roomPoll);
  if(realtimeChannel){ sb.removeChannel(realtimeChannel); realtimeChannel=null; }
  if(presenceChannel){ sb.removeChannel(presenceChannel); presenceChannel=null; }
  clearAllChatStrips(); stopGameTimer(); clearAutoMoveTimer(); clearWatchdogTimer();
  session.code=null; session.role=null; session.roleSymbol=null; currentRoom=null;
  lastMessageId = 0; seenMessageIds.clear(); lastTurnKey = null;
  chatHistory = []; spectatorNames = []; knownSpectatorKeys = new Set(); spectatorPresenceReady = false;
  renderSpectatorBadge(); document.body.classList.remove('is-spectator');
  clearSession();
}

async function rematch(){
  if(!currentRoom) return;
  if(session.role!=='p1' && session.role!=='p2') return;
  const matchDone = isMatchDecided();
  const fresh = {
    status:'playing', turn:'X', winner:null, winning_line:null,
    board: createBoard(currentRoom.board_size || 3), moves: [], rev:(currentRoom.rev||0)+1,
    frozen_idx:null, frozen_blocks_role:null, p1_extra_pending:false, p2_extra_pending:false,
    // نتيجة المباراة تُصفَّر فقط عند بدء مباراة جديدة كاملة (بعد حسم المباراة السابقة)،
    // وتبقى قوى اللاعبين (p1_powers/p2_powers) كما هي طوال المباراة الواحدة عبر جولاتها
    p1_wins: matchDone ? 0 : (currentRoom.p1_wins || 0), p2_wins: matchDone ? 0 : (currentRoom.p2_wins || 0),
    ...(matchDone ? { p1_powers:{freeze:true,extra:true,swap:true}, p2_powers:{freeze:true,extra:true,swap:true} } : {})
  };
  const { data } = await sb.from('xo_rooms').update(fresh).eq('code', session.code).select().single();
  if(data) syncRoomState(data);
}

function scheduleRoomCleanup(code, delayMs=8000){
  setTimeout(async ()=>{
    try{
      const { data: room } = await sb.from('xo_rooms').select('status').eq('code', code).single();
      if(!room || room.status !== 'finished') return;
      await sb.from('xo_messages').delete().eq('room_code', code);
      await sb.from('xo_rooms').delete().eq('code', code);
    }catch(e){}
  }, delayMs);
}

function handleIncomingMessage(msg){
  if(!msg || (msg.id!=null && seenMessageIds.has(msg.id))) return;
  if(msg.id!=null){ seenMessageIds.add(msg.id); if(msg.id > lastMessageId) lastMessageId = msg.id; }
  chatHistory.push({role:msg.sender_role, name:msg.sender_name, content:msg.content});
  if(document.getElementById('chatSheetBg').classList.contains('show')) renderChatSheetBody();
  showChatStrip(msg.sender_role, msg.content, msg.sender_role!==session.role);
}

async function pollMissedMessages(){
  if(!session.code) return;
  try{
    const { data } = await sb.from('xo_messages').select('*').eq('room_code', session.code).gt('id', lastMessageId).order('id', {ascending:true}).limit(20);
    (data||[]).forEach(handleIncomingMessage);
  }catch(e){}
}

/* ===================== SPECTATORS UI ===================== */
function renderSpectatorBadge(){
  const countEl = document.getElementById('spectatorCount');
  if(!countEl) return;
  const n = spectatorNames.length;
  countEl.textContent = n; countEl.style.display = n>0 ? 'flex' : 'none';
  if(document.getElementById('spectatorsSheetBg')?.classList.contains('show')) renderSpectatorsSheetBody();
}
function renderSpectatorsSheetBody(){
  const body = document.getElementById('spectatorsSheetBody');
  if(!body) return;
  body.innerHTML = spectatorNames.length ? spectatorNames.map(n=>`<div>👀 ${escapeHtml(n)}</div>`).join('') : '<div class="empty">لا يوجد مشاهدون</div>';
}
function openSpectatorsSheet(){ renderSpectatorsSheetBody(); document.getElementById('spectatorsSheetBg').classList.add('show'); }
function closeSpectatorsSheet(){ document.getElementById('spectatorsSheetBg').classList.remove('show'); }
let spectatorToastTimer = null;
function showSpectatorToast(text){
  const el = document.getElementById('spectatorToast'); if(!el) return;
  el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(spectatorToastTimer); spectatorToastTimer = setTimeout(()=> el.classList.remove('show'), 2600);
  beep(900,.08,'sine',.12);
}

/* ===================== LEVELS & XP ===================== */
let localProfile = null;
let xpAwardedRoundKey = readRoundFlag('xo_xpAwardedRoundKey');
let historySavedRoundKey = readRoundFlag('xo_historySavedRoundKey');
function readRoundFlag(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
function writeRoundFlag(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} }
function resetRoundKeys(){ xpAwardedRoundKey=null; historySavedRoundKey=null; try{ sessionStorage.removeItem('xo_xpAwardedRoundKey'); sessionStorage.removeItem('xo_historySavedRoundKey'); }catch(e){} }

function levelTierClass(level){ if(level>=20) return 'tier-platinum'; if(level>=10) return 'tier-gold'; if(level>=5) return 'tier-silver'; return 'tier-bronze'; }
function renderLevelBadge(el, level, compact){ if(!el) return; const lvl = level || 1; el.textContent = compact ? String(lvl) : ('Lv.' + lvl); el.classList.remove('tier-bronze','tier-silver','tier-gold','tier-platinum'); el.classList.add(levelTierClass(lvl)); }
function renderTitleBadge(el, titleAr, titleIcon){ if(!el) return; if(!titleAr){ el.style.display='none'; el.textContent=''; return; } el.textContent = (titleIcon ? titleIcon + ' ' : '') + titleAr; el.style.display='inline-flex'; }
function winThresholds(level){ const lvl = level || 1; const floor = 3*(lvl-1)*lvl/2; const next = 3*lvl*(lvl+1)/2; return { floor, next }; }
function renderXpBar(el, totalWins, level){ if(!el) return; const { floor, next } = winThresholds(level); const pct = Math.max(0, Math.min(100, ((totalWins-floor)/(next-floor))*100)); el.style.width = pct + '%'; }

function paintMiniUserbar(){
  document.getElementById('miniUsername').textContent = localProfile.username;
  applyAvatarVisual(document.getElementById('miniAvatar'), localProfile.avatar_color, localProfile.avatar_data, localProfile.username[0]);
  renderLevelBadge(document.getElementById('miniLevelBadge'), localProfile.level, false);
  renderTitleBadge(document.getElementById('miniTitleBadge'), localProfile.title_ar, localProfile.title_icon);
  renderXpBar(document.getElementById('miniXpFill'), localProfile.total_wins||0, localProfile.level||1);
}

async function awardGameXP(room, isWin, opponentId){
  if(!isConfigured || !localProfile) return;
  try{
    const { data, error } = await sb.rpc('add_xp', {
      p_user_id: myId, p_room_code: room.code, p_room_rev: room.rev, p_opponent_id: opponentId || null,
      p_ladder_climbs: 0, p_is_win: isWin, p_had_snake_hit: false, p_dice_rolls: 0, p_bonus_hits: 0
    });
    if(error || !data || !data[0]) return;
    const r = data[0];
    localProfile.xp = r.new_xp; localProfile.level = r.new_level; localProfile.win_streak = r.new_win_streak;
    localProfile.total_wins = r.total_wins; localProfile.title_ar = r.title_ar; localProfile.title_icon = r.title_icon;
    if(profile){ Object.assign(profile, localProfile); }
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
  xpAwardedRoundKey = key; writeRoundFlag('xo_xpAwardedRoundKey', key);
  const opponentId = session.role==='p1' ? room.p2_user_id : room.p1_user_id;
  const isWin = room.winner === session.roleSymbol;
  awardGameXP(room, isWin, opponentId);
}

function celebrateLevelUp(newLevel){
  const anchor = document.getElementById(session.role==='p1' ? 'panelP1' : (session.role==='p2' ? 'panelP2' : 'miniAvatar'));
  if(anchor) burstReaction(anchor, '⚡');
  showTurnBubble(`🎉 وصلت للمستوى ${newLevel}!`);
  beep(900,.15,'triangle'); setTimeout(()=>beep(1200,.18,'triangle'),140);
}

const ACHIEVEMENTS_CATALOG = [
  { code:'social_5', title_ar:'اجتماعي', description_ar:'العب مع 5 لاعبين مختلفين', xp_reward:100, icon:'🤝', sort_order:10 },
  { code:'social_10', title_ar:'صانع صداقات', description_ar:'العب مع 10 لاعبين مختلفين', xp_reward:250, icon:'🌍', sort_order:11 },
  { code:'streak_3', title_ar:'سلسلة النار', description_ar:'حقّق 3 انتصارات متتالية', xp_reward:150, icon:'🔥', sort_order:20 },
  { code:'streak_5', title_ar:'لا يُقهر', description_ar:'حقّق 5 انتصارات متتالية', xp_reward:400, icon:'⚔️', sort_order:21 },
  { code:'games_25', title_ar:'محارب مخضرم', description_ar:'أكمل 25 جولة', xp_reward:150, icon:'🎖️', sort_order:30 },
  { code:'games_100', title_ar:'أسطورة اللعبة', description_ar:'أكمل 100 جولة', xp_reward:500, icon:'👑', sort_order:31 },
  { code:'xo_big_5', title_ar:'فكر كبير', description_ar:'فُز في لوحة 5×5 أو أكبر', xp_reward:200, icon:'🧠', sort_order:40 },
  { code:'xo_ai_expert', title_ar:'تغلب على الخبير', description_ar:'فُز على الذكاء الاصطناعي في مستوى الخبير', xp_reward:300, icon:'🤖', sort_order:50 },
  { code:'xo_speed', title_ar:'البرق', description_ar:'فُز بجولة أونلاين في أقل من دقيقة', xp_reward:200, icon:'⚡', sort_order:51 },
  { code:'xo_perfect', title_ar:'لعبة نظيفة', description_ar:'فُز دون أن يلعب خصمك أي حركة', xp_reward:150, icon:'✨', sort_order:60 },
];

let achievementQueue = [], achievementShowing = false;
function queueAchievementCelebrations(list){ achievementQueue.push(...list); if(!achievementShowing) showNextAchievementToast(); }
function showNextAchievementToast(){
  if(!achievementQueue.length){ achievementShowing = false; return; }
  achievementShowing = true; const ach = achievementQueue.shift();
  const el = document.getElementById('achievementToast');
  if(el){
    const iconEl = document.getElementById('achToastIcon');
    const titleEl = document.getElementById('achToastTitle');
    const xpEl = document.getElementById('achToastXp');
    if(iconEl) iconEl.textContent = ach.icon || '🏅';
    if(titleEl) titleEl.textContent = ach.title || 'إنجاز جديد';
    if(xpEl) xpEl.textContent = '+' + (ach.xp||0) + ' XP';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }
  const anchor = document.getElementById(session.role==='p1' ? 'panelP1' : (session.role==='p2' ? 'panelP2' : 'miniAvatar')) || document.body;
  burstReaction(anchor, '🏅');
  beep(950,.15,'triangle',.22); setTimeout(()=>beep(1250,.18,'triangle',.2),160);
  setTimeout(()=>{ if(el) el.classList.remove('show'); setTimeout(showNextAchievementToast, 400); }, 2700);
}

function computeAchievementProgress(code, stats){
  const s = stats || {};
  const table = {
    social_5: { cur:s.unique_opponents_count||0, target:5 },
    social_10: { cur:s.unique_opponents_count||0, target:10 },
    streak_3: { cur:s.best_streak||0, target:3 },
    streak_5: { cur:s.best_streak||0, target:5 },
    games_25: { cur:s.total_games||0, target:25 },
    games_100: { cur:s.total_games||0, target:100 },
  };
  return table[code] || null;
}

function renderAchievementsCards(catalog, unlockedSet, stats){
  const body = document.getElementById('achievementsSheetBody'); if(!body) return;
  const cards = [...catalog].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  body.innerHTML = `<div class="ach-grid">${cards.map(a=>{
    const unlocked = unlockedSet.has(a.code);
    const prog = computeAchievementProgress(a.code, stats);
    let progressHtml;
    if(prog){ const cur = Math.min(prog.cur, prog.target); const pct = Math.max(0, Math.min(100, (cur/prog.target)*100));
      progressHtml = `<div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${pct}%"></div></div><div class="ach-progress-text">${cur} / ${prog.target}</div>`;
    } else { progressHtml = `<div class="ach-progress-text">${unlocked ? '✔ تم تحقيقه' : '🔒 يتحقق بجولة واحدة'}</div>`; }
    return `<div class="ach-card ${unlocked?'unlocked':'locked'}">${unlocked?'<span class="ach-check">✔</span>':''}<div class="ach-card-icon">${unlocked?a.icon:'🔒'}</div><div class="ach-card-title">${escapeHtml(a.title_ar)}</div><div class="ach-card-desc">${escapeHtml(a.description_ar)}</div>${progressHtml}<div class="ach-card-xp">+${a.xp_reward} XP</div></div>`;
  }).join('')}</div>`;
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

/* ===================== HISTORY ===================== */
function loadHistory(){ try{ return JSON.parse(localStorage.getItem('xo_history')||'[]'); }catch(e){ return []; } }
function saveHistoryEntry(entry){
  const hist = loadHistory(); hist.unshift(entry); localStorage.setItem('xo_history', JSON.stringify(hist.slice(0,50))); renderHistoryTable();
}
function renderHistoryTable(){
  const box = document.getElementById('historyTable'); if(!box) return;
  const hist = loadHistory();
  if(!hist.length){ box.innerHTML = '<p class="hint" style="margin:0;">لا توجد جولات سابقة</p>'; return; }
  box.innerHTML = hist.slice(0,15).map(h=>`
    <div class="history-row ${h.result}">
      <span class="h-date">${h.date}</span>
      <span class="h-opp">${h.opp} (${h.size}×${h.size})</span>
      <span class="h-status">${h.result==='win'?(h.matchDone?'👑 بطل المباراة':'🏆 فوز'):(h.result==='draw'?'🤝 تعادل':'❌ خسارة')}</span>
    </div>`).join('');
}
async function bumpGlobalCounter(){ try{ await sb.rpc('bump_global_games_played'); }catch(e){} }
async function loadGlobalCounter(){
  try{ const { data } = await sb.from('global_stats').select('games_played').eq('id',1).single();
    if(data) document.getElementById('globalCounter').textContent = '🌍 جولات لُعبت: ' + data.games_played;
  }catch(e){}
  renderHistoryTable();
}

/* ===================== HELP ===================== */
const HELP_LINES = [
  '🎮 اختر حجم اللوحة من 3×3 حتى 10×10. كلما كبرت اللوحة، زادت الحركات المطلوبة للفوز.',
  '🤖 العب ضد الذكاء الاصطناعي بأربعة مستويات: سهل، متوسط، صعب، خبير.',
  '💡 استخدم زر المساعدة لرؤية أفضل حركة محسوبة بالذكاء الاصطناعي.',
  '↩️ زر التراجع يتيح لك التراجع حتى 5 خطوات (غير متاح أونلاين).',
  '⏱ يوجد مؤقت لكل لاعب يُظهر إجمالي الوقت المستغرق.',
  '🏆 افتح إنجازاتك من الشاشة الرئيسية واكسب خبرة إضافية.',
  '🔍 استخدم البحث التلقائي لإيجاد خصم بنفس حجم اللوحة الذي تفضله.',
];
function openHelpSheet(){
  document.getElementById('helpSheetBody').innerHTML = HELP_LINES.map(l=>`<div>${l}</div>`).join('');
  document.getElementById('helpSheetBg').classList.add('show');
}
function closeHelpSheet(){ document.getElementById('helpSheetBg').classList.remove('show'); }

/* ===================== EVENT LISTENERS & UI WIRING ===================== */
let pendingLinkCode = null, onboardingPhotoDataUrl = null, editPhotoDataUrl = null, selectedColor = null, matchCountdownTimer = null;
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

function broadcastReaction(emoji){ presenceChannel?.send({ type:'broadcast', event:'react', payload:{emoji, from:session.role} }); }
function fireReaction(role, emoji){ const anchor = document.getElementById(role==='p1' ? 'panelP1' : 'panelP2'); burstReaction(anchor, emoji); }

/* Board size selectors */
function renderSizeGrid(containerId, onSelect, defaultSize=3){
  const container = document.getElementById(containerId);
  if(!container) return;
  const sizes = [3,4,5,6,7,8,9,10];
  container.innerHTML = sizes.map(s=>`<button class="size-btn ${s===defaultSize?'active':''}" data-size="${s}">${s}×${s}</button>`).join('');
  container.querySelectorAll('.size-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      container.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(parseInt(btn.dataset.size));
    });
  });
}

let selectedBoardSize = 3, selectedWinLength = 3, selectedDifficulty = DIFFICULTIES.MEDIUM, selectedSymbol = 'X';
let selectedMatchFormat = null, selectedAiMatchFormat = null;

function renderMatchFormatGrid(containerId, onSelect, defaultVal){
  const container = document.getElementById(containerId);
  if(!container) return;
  const opts = [ {v:null, l:'جولة واحدة'}, {v:3, l:'🔥 أفضل من 3'}, {v:5, l:'👑 أفضل من 5'} ];
  container.innerHTML = opts.map(o=>`<button class="size-btn ${o.v===defaultVal?'active':''}" data-v="${o.v??''}">${o.l}</button>`).join('');
  container.querySelectorAll('.size-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      container.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(btn.dataset.v ? parseInt(btn.dataset.v) : null);
    });
  });
}

function renderWinLengthGrid(size){
  const container = document.getElementById('winLengthGrid');
  if(!container) return;
  const max = size;
  const defaults = defaultWinLength(size);
  const options = [];
  for(let i=3;i<=max;i++) options.push(i);
  container.innerHTML = options.map(w=>`<button class="size-btn ${w===defaults?'active':''}" data-w="${w}">${w}</button>`).join('');
  container.querySelectorAll('.size-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      container.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selectedWinLength = parseInt(btn.dataset.w);
    });
  });
  selectedWinLength = defaults;
}

function renderDifficultyGrid(){
  const container = document.getElementById('difficultyGrid');
  if(!container) return;
  const diffs = [
    {k:DIFFICULTIES.EASY, l:'سهل'},
    {k:DIFFICULTIES.MEDIUM, l:'متوسط'},
    {k:DIFFICULTIES.HARD, l:'صعب'},
    {k:DIFFICULTIES.EXPERT, l:'خبير'},
  ];
  container.innerHTML = diffs.map(d=>`<button class="size-btn ${d.k===selectedDifficulty?'active':''}" data-d="${d.k}">${d.l}</button>`).join('');
  container.querySelectorAll('.size-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      container.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selectedDifficulty = btn.dataset.d;
    });
  });
}

/* Onboarding */
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
  if(error){ err.textContent='تعذّر حفظ الملف الشخصي'; err.style.display='block'; return; }
  localProfile = data; paintMiniUserbar(); afterProfileReady();
});

/* Edit Profile */
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
document.getElementById('editBadgeP1').addEventListener('click', ()=>{ if(session.role==='p1' || !session.role) openEditProfile(); });

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
  if(currentRoom) renderGame();
  document.getElementById('editModal').style.display='none';
});

/* Tabs */
document.querySelectorAll('[data-tab]').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    ['create','join','quick','ai'].forEach(k=> document.getElementById('pane-'+k).style.display = (t.dataset.tab===k)?'block':'none');
  });
});

/* Create Room */
document.getElementById('btnCreate').addEventListener('click', async ()=>{
  const { code, room, error } = await createRoom(selectedBoardSize, selectedWinLength, selectedMatchFormat);
  if(error){ alert(error); return; }
  gameState.mode = GAME_MODES.ONLINE;
  gameState.p1Wins = 0; gameState.p2Wins = 0; gameState.timerP1 = 0; gameState.timerP2 = 0;
  gameState.undoStack = [];
  syncRoomState(room);
  // لا نبدأ عدّاد الوقت هنا — سيبدأ تلقائيًا فقط عند انضمام الخصم فعليًا (انظر syncRoomState)
  await loadChatHistory(code); enterGameScreen();
});

/* Join Room */
document.getElementById('btnJoin').addEventListener('click', async ()=>{
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  const errBox = document.getElementById('joinError'); errBox.style.display='none';
  if(!code){ errBox.textContent='أدخل رمز الجولة'; errBox.style.display='block'; return; }
  const { room, error } = await joinRoomByCode(code);
  if(error){ errBox.textContent=error; errBox.style.display='block'; return; }
  gameState.mode = GAME_MODES.ONLINE; gameState.timerP1 = 0; gameState.timerP2 = 0;
  syncRoomState(room);
  await loadChatHistory(code); enterGameScreen();
});

/* Quick Match */
document.getElementById('btnQuickMatch').addEventListener('click', ()=>{
  showScreen('matching');
  document.getElementById('matchSearching').style.display='block';
  document.getElementById('matchFound').style.display='none';
  mmStartSearch(localProfile, selectedBoardSize, {
    onFound: showMatchFound,
    onBothAccepted: onQuickMatchAccepted,
    onCancelled: (reason)=>{ alert(reason); resetToHome(); },
    onTimeout: ()=>{ alert('لم يتم العثور على لاعب'); resetToHome(); }
  });
});
document.getElementById('btnCancelMatch').addEventListener('click', async ()=>{ await mmCancelSearch(); resetToHome(); });

function showMatchFound(info){
  document.getElementById('matchSearching').style.display='none';
  document.getElementById('matchFound').style.display='block';
  document.getElementById('matchOppName').textContent = info.opponent.username;
  document.getElementById('matchBoardInfo').textContent = `لوحة ${info.boardSize}×${info.boardSize}`;
  applyAvatarVisual(document.getElementById('matchOppAvatar'), info.opponent.avatar_color, info.opponent.avatar_data, info.opponent.username[0]);
  applyAvatarVisual(document.getElementById('matchMeAvatar'), localProfile.avatar_color, localProfile.avatar_data, localProfile.username[0]);
  let secondsLeft = 20;
  const timerEl = document.getElementById('matchTimer');
  timerEl.textContent = `⏱ ${secondsLeft} ثانية للموافقة`;
  clearInterval(matchCountdownTimer);
  matchCountdownTimer = setInterval(()=>{ secondsLeft--; timerEl.textContent=`⏱ ${secondsLeft} ثانية`; if(secondsLeft<=0) clearInterval(matchCountdownTimer); }, 1000);
  document.getElementById('btnAcceptMatch').disabled = false;
  document.getElementById('btnAcceptMatch').textContent = '✅ موافق';
}
document.getElementById('btnAcceptMatch').addEventListener('click', ()=>{
  document.getElementById('btnAcceptMatch').disabled = true;
  document.getElementById('btnAcceptMatch').textContent = '⏳ بانتظار الطرف الآخر…';
  mmRespond(true);
});
document.getElementById('btnDeclineMatch').addEventListener('click', async ()=>{ clearInterval(matchCountdownTimer); await mmRespond(false); });

async function onQuickMatchAccepted(info){
  clearInterval(matchCountdownTimer);
  const size = info.boardSize || 3;
  if(info.isInitiator){
    const { code, room } = await createRoom(size, defaultWinLength(size));
    if(room){
      gameState.mode = GAME_MODES.ONLINE; gameState.p1Wins = 0; gameState.p2Wins = 0; gameState.undoStack = [];
      syncRoomState(room);
      await loadChatHistory(code); enterGameScreen();
    }
  } else {
    const { room, error } = await joinRoomByCode(info.roomCode);
    if(!error && room){
      gameState.mode = GAME_MODES.ONLINE;
      syncRoomState(room);
      await loadChatHistory(info.roomCode); enterGameScreen();
    }
  }
}

/* AI Mode */
document.getElementById('btnStartAI').addEventListener('click', ()=>{
  gameState.mode = GAME_MODES.AI; gameState.boardSize = selectedBoardSize; gameState.winLength = selectedWinLength;
  gameState.board = createBoard(selectedBoardSize); gameState.turn = 'X'; gameState.winner = null; gameState.winningLine = null;
  gameState.status = 'playing'; gameState.moves = []; gameState.undoStack = [];
  gameState.p1Symbol = selectedSymbol; gameState.p2Symbol = selectedSymbol==='X'?'O':'X';
  gameState.aiDifficulty = selectedDifficulty; gameState.p1Wins = 0; gameState.p2Wins = 0; gameState.draws = 0;
  gameState.timerP1 = 0; gameState.timerP2 = 0; gameState.matchTarget = selectedAiMatchFormat;
  enterGameScreen(); startTurnTimer();
  if(gameState.p2Symbol === 'X'){
    setTimeout(()=>{
      const aiMove = getAIMove(gameState.board, gameState.boardSize, gameState.winLength, gameState.aiDifficulty, gameState.p2Symbol);
      if(aiMove !== null) makeMove(aiMove);
    }, 400);
  }
});

/* Symbol choice */
document.querySelectorAll('.symbol-choice .sym-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.symbol-choice .sym-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); selectedSymbol = btn.dataset.sym;
  });
});

/* Game controls */
document.getElementById('btnHint').addEventListener('click', showHint);
document.getElementById('btnUndo').addEventListener('click', undoMove);
document.getElementById('btnReset').addEventListener('click', resetBoard);

/* Leave / Rematch / Play Again */
async function leaveRoomAsLoss(code, role){
  if(!role || (role!=='p1' && role!=='p2')) return;
  try{
    const { data: room } = await sb.from('xo_rooms').select('status,p1_symbol,p2_symbol,rev').eq('code', code).single();
    if(!room || room.status !== 'playing') return;
    const winnerSymbol = role==='p1' ? room.p2_symbol : room.p1_symbol;
    await sb.from('xo_rooms').update({ status:'finished', winner: winnerSymbol, rev: room.rev + 1 }).eq('code', code).eq('rev', room.rev);
  }catch(e){}
}
document.getElementById('btnLeave').addEventListener('click', async ()=>{
  const isSpectator = session.role === 'spectator';
  const msg = isSpectator ? 'هل تريد الخروج من وضع المشاهدة؟' : 'هل تريد مغادرة الجولة؟';
  if(!confirm(msg)) return;
  if(!isSpectator && gameState.mode === GAME_MODES.ONLINE && currentRoom?.status==='playing'){
    await leaveRoomAsLoss(session.code, session.role);
  }
  resetToHome();
});
document.getElementById('btnPlayAgain').addEventListener('click', ()=>{ document.getElementById('winModal').style.display='none'; resetToHome(); });
document.getElementById('btnRematch').addEventListener('click', ()=>{
  document.getElementById('winModal').style.display='none';
  if(gameState.mode === GAME_MODES.ONLINE){ rematch(); return; }
  if(isMatchDecided()){ gameState.p1Wins = 0; gameState.p2Wins = 0; gameState.draws = 0; }
  resetBoard();
});

/* Copy link */
document.getElementById('btnTbCopy').addEventListener('click', ()=>{
  const input = document.getElementById('tbLinkInput');
  const link = input.value;
  if(!link) return;
  navigator.clipboard?.writeText(link).then(()=>{
    const btn = document.getElementById('btnTbCopy');
    const old = btn.textContent;
    btn.textContent = '✅ تم'; btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent = old; btn.classList.remove('copied'); }, 1600);
  });
});

/* Chat */
document.getElementById('btnSendChat').addEventListener('click', sendChat);
document.getElementById('chatInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendChat(); });
async function sendChat(){
  const input = document.getElementById('chatInput');
  const content = input.value.trim(); if(!content) return;
  input.value='';
  if(gameState.mode === GAME_MODES.ONLINE){
    const name = session.role==='p1' ? currentRoom.p1_name : currentRoom.p2_name;
    const saved = await sendMessage(session.code, session.role, name, content);
    if(saved){ seenMessageIds.add(saved.id); if(saved.id > lastMessageId) lastMessageId = saved.id; }
    chatHistory.push({role:session.role, name, content});
    if(document.getElementById('chatSheetBg').classList.contains('show')) renderChatSheetBody();
    showChatStrip(session.role, content, false);
    closeChatComposer();
  }
}

/* Spectators / Help / Achievements / Chat sheets */
document.getElementById('btnSpectators').addEventListener('click', openSpectatorsSheet);
document.getElementById('btnCloseSpectatorsSheet').addEventListener('click', closeSpectatorsSheet);
document.getElementById('spectatorsSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='spectatorsSheetBg') closeSpectatorsSheet(); });

document.getElementById('btnHelp').addEventListener('click', openHelpSheet);
document.getElementById('btnCloseHelpSheet').addEventListener('click', closeHelpSheet);
document.getElementById('helpSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='helpSheetBg') closeHelpSheet(); });

document.getElementById('btnAchievements').addEventListener('click', openAchievementsSheet);
document.getElementById('btnCloseAchievementsSheet').addEventListener('click', closeAchievementsSheet);
document.getElementById('achievementsSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='achievementsSheetBg') closeAchievementsSheet(); });

document.getElementById('btnChatHistory').addEventListener('click', openChatSheet);
document.getElementById('btnCloseChatSheet').addEventListener('click', closeChatSheet);
document.getElementById('chatSheetBg').addEventListener('click', (e)=>{ if(e.target.id==='chatSheetBg') closeChatSheet(); });

document.getElementById('btnSound').addEventListener('click', (e)=>{ soundOn = !soundOn; e.target.textContent = soundOn ? '🔊' : '🔇'; e.target.title = soundOn ? 'كتم الصوت' : 'تشغيل الصوت'; });

/* Room conflict / ended modals */
document.getElementById('btnRoomEndedHome').addEventListener('click', ()=>{ document.getElementById('roomEndedModal').style.display='none'; resetToHome(); });

function presentRoomConflict(myCode, newCode){
  showScreen('home'); loadGlobalCounter();
  const modal = document.getElementById('switchRoomModal');
  modal.style.display = 'flex';
  document.getElementById('btnGoToMyRoom').onclick = async ()=>{
    modal.style.display='none'; if(history.replaceState) history.replaceState({}, '', location.pathname); pendingLinkCode = null;
    await resumeSavedSession(myCode);
  };
  document.getElementById('btnEndAndSwitch').onclick = async ()=>{
    modal.style.display='none';
    await leaveRoomAsLoss(myCode, loadSession()?.role);
    clearSession();
    const { room, error } = await joinRoomByCode(newCode);
    if(history.replaceState) history.replaceState({}, '', location.pathname);
    if(error){ document.getElementById('roomEndedModal').style.display='flex'; return; }
    await loadChatHistory(newCode); enterGameScreen();
  };
}

async function resumeSavedSession(code, fallbackLinkCode){
  try{
    const { data:room } = await sb.from('xo_rooms').select('*').eq('code', code).single();
    const isP1 = room && room.p1_user_id === myId;
    const isP2 = room && room.p2_user_id === myId;
    const savedInfo = loadSession();
    if(room && room.status !== 'finished' && (isP1 || isP2 || (savedInfo && savedInfo.role==='spectator'))){
      session.code = code; session.role = isP1 ? 'p1' : (isP2 ? 'p2' : 'spectator'); session.roleSymbol = session.role==='p1'?(room.p1_symbol||'X'):(room.p2_symbol||'O');
      saveSession(); subscribeToRoom(code); subscribeToPresence(code);
      gameState.mode = GAME_MODES.ONLINE;
      syncRoomState(room);
      await loadChatHistory(code); enterGameScreen(); return true;
    }
  }catch(e){}
  clearSession();
  if(fallbackLinkCode){
    const { room, error } = await joinRoomByCode(fallbackLinkCode);
    if(error){ document.getElementById('roomEndedModal').style.display='flex'; return false; }
    gameState.mode = GAME_MODES.ONLINE;
    syncRoomState(room);
    await loadChatHistory(fallbackLinkCode); enterGameScreen(); return false;
  }
  resetToHome(); return false;
}

function extractLinkCode(){ return new URLSearchParams(location.search).get('r'); }

/* ===================== BOOT ===================== */
async function boot(){
  if(!isConfigured){ document.getElementById('setupWarning').style.display='block'; setDbStatus(false); return; }
  setDbStatus(true); pendingLinkCode = extractLinkCode();
  await ensureAnonymousSession();
  let existing = await loadExistingProfile();

  if(!existing && pendingLinkCode){
    const autoName = 'لاعب_' + Math.floor(100 + Math.random()*900);
    const { data } = await createProfile(autoName, null);
    if(data) existing = data;
  }

  if(!existing){ showScreen('onboarding'); return; }

  localProfile = existing; soundOn = existing.sound_on!==false;
  paintMiniUserbar(); initReactionButtons();

  // Init selectors
  renderSizeGrid('boardSizeGrid', (s)=>{ selectedBoardSize = s; selectedWinLength = defaultWinLength(s); renderWinLengthGrid(s); document.getElementById('winLengthField').style.display = s>3 ? 'block' : 'none'; }, 3);
  renderSizeGrid('quickSizeGrid', (s)=>{ selectedBoardSize = s; }, 3);
  renderSizeGrid('aiSizeGrid', (s)=>{ selectedBoardSize = s; selectedWinLength = defaultWinLength(s); }, 3);
  renderWinLengthGrid(3);
  renderDifficultyGrid();
  renderMatchFormatGrid('matchFormatGrid', (v)=>{ selectedMatchFormat = v; }, null);
  renderMatchFormatGrid('aiMatchFormatGrid', (v)=>{ selectedAiMatchFormat = v; }, null);

  const saved = loadSession();
  if(saved && pendingLinkCode && saved.code !== pendingLinkCode){
    presentRoomConflict(saved.code, pendingLinkCode); return;
  }
  if(saved){
    const resumed = await resumeSavedSession(saved.code);
    if(resumed) return;
  }
  if(pendingLinkCode){
    showScreen('home'); loadGlobalCounter();
    const { room, error } = await joinRoomByCode(pendingLinkCode);
    if(history.replaceState) history.replaceState({}, '', location.pathname);
    if(error){ document.getElementById('roomEndedModal').style.display='flex'; return; }
    gameState.mode = GAME_MODES.ONLINE;
    syncRoomState(room);
    await loadChatHistory(pendingLinkCode); enterGameScreen();
  } else {
    showScreen('home'); loadGlobalCounter();
  }
}

boot();
