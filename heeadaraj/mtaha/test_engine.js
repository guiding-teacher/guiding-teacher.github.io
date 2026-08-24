// اختبار محرك اللعبة الكامل: المتاهة + الحرّاس + المقذوفات (raycast) لعدد لاعبين 2 أو 4
function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DIRS = [
  {d:'N', dr:-1, dc:0, opp:'S'},{d:'E', dr:0, dc:1, opp:'W'},
  {d:'S', dr:1, dc:0, opp:'N'},{d:'W', dr:0, dc:-1, opp:'E'},
];
function rotatePos(r,c,N){ return [c, N-1-r]; }
function rotateWallsOnce(cell){ return { N: cell.W, E: cell.N, S: cell.E, W: cell.S }; }
function rotateDirOnce(d){ return {N:'E',E:'S',S:'W',W:'N'}[d]; }

function buildSymmetricMaze(seed, N, k){
  const rand = mulberry32(seed);
  const center = (N-1)/2;
  const idx = (r,c)=> r*N+c;
  const cells = new Array(N*N);
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) cells[idx(r,c)] = {N:true,E:true,S:true,W:true};
  let inDomain = k===2 ? ((r,c)=> (r<center)||(r===center&&c<=center)) : ((r,c)=> (r<=center)&&(c>center));
  const visited = new Array(N*N).fill(false);
  visited[idx(center,center)] = true;
  const stack=[[center,center]];
  while(stack.length){
    const [r,c]=stack[stack.length-1];
    const opts=[];
    for(const dir of DIRS){
      const nr=r+dir.dr,nc=c+dir.dc;
      if(nr<0||nc<0||nr>=N||nc>=N) continue;
      if(!inDomain(nr,nc)) continue;
      if(visited[idx(nr,nc)]) continue;
      opts.push(dir);
    }
    if(!opts.length){ stack.pop(); continue; }
    const dir = opts[Math.floor(rand()*opts.length)];
    const nr=r+dir.dr,nc=c+dir.dc;
    cells[idx(r,c)][dir.d]=false; cells[idx(nr,nc)][dir.opp]=false;
    visited[idx(nr,nc)]=true; stack.push([nr,nc]);
  }
  const quarterSteps = 4/k;
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    if(!inDomain(r,c)) continue;
    const original = cells[idx(r,c)];
    for(let t=1;t<k;t++){
      let pr=r,pc=c,cell=original;
      const steps=t*quarterSteps;
      for(let s=0;s<steps;s++){ [pr,pc]=rotatePos(pr,pc,N); cell=rotateWallsOnce(cell); }
      if(pr===r&&pc===c) continue;
      cells[idx(pr,pc)]={...cell};
    }
  }
  const rc = cells[idx(center,center)];
  if(k===2){ rc.S=rc.N; rc.E=rc.W; }
  else { const anyOpen=!rc.N||!rc.E||!rc.S||!rc.W; rc.N=rc.E=rc.S=rc.W=!anyOpen; }
  const dist=new Array(N*N).fill(-1); const parentDir=new Array(N*N).fill(null);
  dist[idx(center,center)]=0; let qh=0; const q=[[center,center]];
  while(qh<q.length){
    const [r,c]=q[qh++]; const cell=cells[idx(r,c)];
    for(const dir of DIRS){
      if(cell[dir.d]) continue;
      const nr=r+dir.dr,nc=c+dir.dc;
      if(nr<0||nc<0||nr>=N||nc>=N) continue;
      if(dist[idx(nr,nc)]!==-1) continue;
      dist[idx(nr,nc)]=dist[idx(r,c)]+1; parentDir[idx(nr,nc)]=dir.opp; q.push([nr,nc]);
    }
  }
  const rotN=(r,c,steps)=>{ let pr=r,pc=c; for(let s=0;s<steps;s++)[pr,pc]=rotatePos(pr,pc,N); return [pr,pc]; };
  return {N,k,cells,dist,parentDir,idx,center,rotN,quarterSteps,rand};
}

function buildGuards(maze, countPerDomain){
  const {N,dist,parentDir,idx,rand,k,quarterSteps,rotN} = maze;
  const patrolLen = Math.max(6, Math.floor(N/2.2));
  const guards=[]; const used=new Set(); let attempts=0;
  let inDomain = k===2 ? ((r,c)=> (r<maze.center)||(r===maze.center&&c<=maze.center)) : ((r,c)=> (r<=maze.center)&&(c>maze.center));
  while(guards.length<countPerDomain && attempts<400){
    attempts++;
    const r=Math.floor(rand()*N), c=Math.floor(rand()*N);
    if(!inDomain(r,c)) continue;
    if(dist[idx(r,c)] < patrolLen+2) continue;
    const path=[[r,c]]; let cr=r,cc=c;
    for(let i=0;i<patrolLen;i++){
      const pd=parentDir[idx(cr,cc)]; if(!pd) break;
      const dir=DIRS.find(x=>x.d===pd); cr+=dir.dr; cc+=dir.dc; path.push([cr,cc]);
    }
    if(path.length<4) continue;
    const key=path[0].join(','); if(used.has(key)) continue; used.add(key);
    const paths=[]; for(let t=0;t<k;t++){ paths.push(path.map(([pr,pc])=>rotN(pr,pc,t*quarterSteps))); }
    guards.push({ paths, phase: Math.floor(rand()*path.length*2) });
  }
  return guards;
}
function guardPositionAt(guard, slot, elapsedMs, moveMs){
  const path = guard.paths[slot];
  const period=(path.length-1)*2; if(period<=0) return path[0];
  let steps = Math.floor(elapsedMs/moveMs)+guard.phase;
  let t=steps%period; if(t<0)t+=period;
  const pos = t<=(path.length-1)?t:period-t;
  return path[pos];
}

function raycastPath(maze, r, c, dir, maxRange){
  const path=[[r,c]]; let cr=r,cc=c;
  const dirObj = DIRS.find(x=>x.d===dir);
  for(let i=0;i<maxRange;i++){
    const cell = maze.cells[maze.idx(cr,cc)];
    if(cell[dir]) break;
    cr+=dirObj.dr; cc+=dirObj.dc;
    if(cr<0||cc<0||cr>=maze.N||cc>=maze.N) break;
    path.push([cr,cc]);
  }
  return path;
}

console.log('=== اختبار الحرّاس المكرّرة k مرة ===');
for(const k of [2,4]){
  const maze = buildSymmetricMaze(555, 19, k);
  const guards = buildGuards(maze, 2);
  console.log(`k=${k}: عدد الحرّاس لكل نطاق=2 → إجمالي نسخ لكل حارس=${k}`);
  for(const g of guards){
    console.log(`  حارس: أطوال المسارات لكل الفتحات =`, g.paths.map(p=>p.length), g.paths.every(p=>p.length===g.paths[0].length)?'OK ✅':'FAIL ❌');
    // تأكد كل موضع صالح داخل الشبكة
    let bad=0;
    for(let slot=0;slot<k;slot++) for(let t=0;t<20;t++){
      const [pr,pc]=guardPositionAt(g,slot,t*300,300);
      if(pr<0||pc<0||pr>=maze.N||pc>=maze.N) bad++;
    }
    console.log(`  مواقع خارج النطاق=${bad}`, bad===0?'OK ✅':'FAIL ❌');
  }
}

console.log('\n=== اختبار المقذوفات (raycast) ===');
const maze4 = buildSymmetricMaze(555, 19, 4);
let totalShots=0, blockedByWallImmediately=0, longestPath=0;
for(let r=0;r<maze4.N;r++) for(let c=0;c<maze4.N;c++){
  for(const dir of ['N','E','S','W']){
    const path = raycastPath(maze4, r, c, dir, 8);
    totalShots++;
    if(path.length===1) blockedByWallImmediately++;
    longestPath = Math.max(longestPath, path.length);
  }
}
console.log(`إجمالي الاتجاهات المختبرة=${totalShots}, أطلقت من جدار فورًا=${blockedByWallImmediately}, أطول مسار طلقة=${longestPath} خلية`);
console.log(longestPath>1 && longestPath<=8 ? 'المدى منطقي ضمن الحدود ✅' : 'تحقق يدوي مطلوب ⚠️');
