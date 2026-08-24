// اختبار خوارزمية التماثل المعمّمة (k=2 لاعبَين أو k=4 لاعبين) قبل دمجها في التطبيق
function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DIRS = [
  {d:'N', dr:-1, dc:0},{d:'E', dr:0, dc:1},{d:'S', dr:1, dc:0},{d:'W', dr:0, dc:-1},
];
const DKEYS = ['N','E','S','W'];

// دوران 90° مع الاتجاه — لكل خطوة دوران واحدة: الاتجاهات تتقدم دوريًا N→E→S→W→N
function rotatePos(r,c,N){ return [c, N-1-r]; }
function rotateWallsOnce(cell){ return { N: cell.W, E: cell.N, S: cell.E, W: cell.S }; }

function buildSymmetricMaze(seed, N, k){
  const rand = mulberry32(seed);
  const center = (N-1)/2;
  const idx = (r,c)=> r*N+c;
  const cells = new Array(N*N);
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) cells[idx(r,c)] = {N:true,E:true,S:true,W:true};

  const rotN = (r,c,times)=>{ let pr=r,pc=c; for(let i=0;i<times;i++){ [pr,pc]=rotatePos(pr,pc,N); } return [pr,pc]; };

  let inDomain;
  if(k===2) inDomain = (r,c)=> (r < center) || (r===center && c<=center);
  else if(k===4) inDomain = (r,c)=> (r <= center) && (c > center);
  else throw new Error('k غير مدعوم');

  const visited = new Array(N*N).fill(false);
  visited[idx(center,center)] = true;
  const stack = [[center,center]];
  while(stack.length){
    const [r,c] = stack[stack.length-1];
    const options = [];
    for(const dir of DIRS){
      const nr=r+dir.dr, nc=c+dir.dc;
      if(nr<0||nc<0||nr>=N||nc>=N) continue;
      if(!inDomain(nr,nc)) continue;
      if(visited[idx(nr,nc)]) continue;
      options.push(dir);
    }
    if(options.length===0){ stack.pop(); continue; }
    const dir = options[Math.floor(rand()*options.length)];
    const nr=r+dir.dr, nc=c+dir.dc;
    const oppMap={N:'S',E:'W',S:'N',W:'E'};
    cells[idx(r,c)][dir.d] = false;
    cells[idx(nr,nc)][oppMap[dir.d]] = false;
    visited[idx(nr,nc)] = true;
    stack.push([nr,nc]);
  }

  // انسخ نطاق الدومين إلى بقية النسخ. خطوة الدوران الأساسية 90° دائمًا، لكن كل "نسخة"
  // من أصل k نسخ تبعد (4/k) خطوات دوران عن الأصل (k=2 ⇒ 180° لكل نسخة، k=4 ⇒ 90°)
  const quarterSteps = 4 / k;
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    if(!inDomain(r,c)) continue;
    const original = cells[idx(r,c)];
    for(let t=1;t<k;t++){
      let pr=r, pc=c, cell = original;
      const steps = t*quarterSteps;
      for(let s=0;s<steps;s++){ [pr,pc] = rotatePos(pr,pc,N); cell = rotateWallsOnce(cell); }
      if(pr===r && pc===c) continue; // نقطة ثبات (المركز) — تُعالَج بشكل منفصل أدناه
      cells[idx(pr,pc)] = {...cell};
    }
  }
  // نقطة الثبات المركزية: توحيد جدران الخلية المركزية حسب رتبة الدوران
  const rc = cells[idx(center,center)];
  if(k===2){ rc.S = rc.N; rc.E = rc.W; }
  else if(k===4){ const anyOpen = !rc.N || !rc.E || !rc.S || !rc.W; rc.N=rc.E=rc.S=rc.W = !anyOpen; }

  // BFS من المركز
  const dist = new Array(N*N).fill(-1); dist[idx(center,center)]=0;
  let qh=0; const q=[[center,center]];
  while(qh<q.length){
    const [r,c]=q[qh++];
    const cell=cells[idx(r,c)];
    for(const dir of DIRS){
      if(cell[dir.d]) continue;
      const nr=r+dir.dr,nc=c+dir.dc;
      if(nr<0||nc<0||nr>=N||nc>=N) continue;
      if(dist[idx(nr,nc)]!==-1) continue;
      dist[idx(nr,nc)] = dist[idx(r,c)]+1;
      q.push([nr,nc]);
    }
  }
  return {N,cells,dist,idx,center,rotN};
}

for(const k of [2,4]){
  console.log(`\n=== k=${k} (${k} لاعبين) ===`);
  for(const N of [15,19,25]){
    const maze = buildSymmetricMaze(999, N, k);
    const total = N*N, reached = maze.dist.filter(d=>d!==-1).length;
    console.log(`N=${N}: اتصال=${reached}/${total}`, reached===total?'OK ✅':'FAIL ❌');
    // تحقق تعارضات الجدران
    let mism=0;
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      for(const dir of DIRS){
        const nr=r+dir.dr,nc=c+dir.dc;
        if(nr<0||nc<0||nr>=N||nc>=N) continue;
        const oppMap={N:'S',E:'W',S:'N',W:'E'};
        const a=maze.cells[maze.idx(r,c)][dir.d];
        const b=maze.cells[maze.idx(nr,nc)][oppMap[dir.d]];
        if(a!==b) mism++;
      }
    }
    console.log(`  تعارضات جدران=${mism}`, mism===0?'OK ✅':'FAIL ❌');
    // تحقق تماثل مسافة نقاط البداية للاعبين
    const starts = [];
    const quarterSteps = 4/k;
    for(let i=0;i<k;i++){
      let pr=0,pc=0;
      for(let s=0;s<i*quarterSteps;s++){ [pr,pc]=rotatePos(pr,pc,N); }
      starts.push([pr,pc]);
    }
    const dists = starts.map(([r,c])=>maze.dist[maze.idx(r,c)]);
    const allEqual = dists.every(d=>d===dists[0]);
    console.log(`  مسافات نقاط الانطلاق: [${dists.join(', ')}]`, allEqual?'متماثلة تمامًا ✅':'غير متماثلة ❌');
  }
}
