// =================================================================
// المُصهر النجمي - The Stellar Forge: v5.5 - Audio Balance
// =================================================================

// --- المتغيرات العامة وإدارة الحالة ---
let gameState = 'START_SCREEN';
let canvas, voice, sounds = {};
let hasInteracted = false;
let star, cosmicEnvironment;

let gasParticles = []; const NUM_GAS_PARTICLES = 150; let currentMass = 0; const MAIN_SEQUENCE_MASS = 0.08;
let protoplanetaryDisk = []; const NUM_DISK_PARTICLES = 500; let planets = []; let objectToName = null;
let chapter3Timer; const RED_GIANT_DELAY = 45000; const SUPERNOVA_DELAY = 20000;

// متغيرات الكاميرا والإبحار
let sailButton;
let cameraState = { target: null, pos: null, zoom: 1.0, targetZoom: 1.0 };
let navigationalTargets = [];
let currentNavIndex = -1;

// واجهة المستخدم والعناصر التفاعلية
let startButton, encyclopediaIcon, encyclopediaModal, closeEncyclopediaButton, encyclopediaEntries;
let planetHUD, hudName, hudType, hudTemp, hudHab;
let namingModal, namingTitle, namingDesc, nameInput, confirmNameButton;

// إحصائيات الإرث الكوني
let starName = ""; let planetCount = 0; let moonCount = 0; let bestHabitablePlanet = null;

// --- موسوعة المعرفة ---
const encyclopediaData = {
    'Sahaab': { title: "السحابة الجزيئية", content: "هي أبرد وأكثف أجزاء الوسط بين النجمي، وتتكون بشكل أساسي من غاز الهيدروجين الجزيئي. هنا، في هذه المشاتل الكونية، تبدأ الجاذبية عملها لتلد نجوماً جديدة." },
    'Protostar': { title: "النجم الأولي", content: "عندما ينهار لب السحابة، يتشكل جسم حار وكثيف يسمى النجم الأولي. إنه يتوهج ليس بسبب الاندماج النووي، بل بسبب الحرارة الناتجة عن ضغط الجاذبية الهائل. وفي هذه المرحلة، يطلق نفاثات قوية من قطبيه." },
    'MainSequence': { title: "نجم النسق الأساسي", content: "لقد نجحت! النجم مستقر الآن ويقوم بالاندماج النووي في لبه، محولاً الهيدروجين إلى هيليوم. شمسنا هي نجم نسق أساسي. هذا هو أطول فصل في حياة النجم." },
    'ProtoplanetaryDisk': { title: "القرص الكوكبي الأولي", content: "هذا القرص الدوار من الغاز والغبار هو المادة المتبقية من تكوين النجم. داخله، تتجمع حبيبات الغبار لتشكل كويكبات مصغرة، ثم كواكب كاملة." },
    'Accretion': { title: "كيف تتكون الكواكب؟ (التراكم)", content: "تسمى هذه العملية بالتراكم. داخل القرص الكوكبي، تلتصق حبيبات الغبار الصغيرة ببعضها البعض، مكونةً حصى. هذه الحصى تتجمع لتشكل صخوراً، ثم كويكبات مصغرة. جاذبية هذه الأجسام الأكبر تسحب المزيد من المواد، وتنمو تدريجياً لتصبح كواكب حقيقية على مدى ملايين السنين." },
    'RockyPlanet': { title: "كوكب صخري", content: "في المنطقة الداخلية الحارة للنظام، تتبخر المواد الخفيفة مثل الجليد والغاز، وتبقى فقط الصخور والمعادن لتشكل كواكب صغيرة وكثيفة مثل الأرض والمريخ." },
    'GasGiant': { title: "عملاق غازي", content: "في المنطقة الخارجية الباردة، يمكن للجليد أن يتجمد، مما يسمح بتكوين نوى ضخمة تجذب كميات هائلة من غازي الهيدروجين والهيليوم، لتشكل كواكب عملاقة مثل المشتري وزحل." },
    'IceGiant': { title: "عملاق جليدي", content: "في أبعد المناطق وأكثرها برودة، تتشكل كواكب شبيهة بالعمالقة الغازية ولكنها تحتوي على نسبة أعلى من 'الجليد' مثل الماء والميثان والأمونيا، مثل أورانوس ونبتون." },
    'GoldilocksZone': { title: "المنطقة الصالحة للحياة", content: "تُعرف أيضاً بـ'منطقة غولديلوكس'، وهي النطاق المداري حول نجم حيث تكون درجة حرارة سطحه مناسبة لوجود الماء السائل. إنها أفضل مكان للبحث عن حياة كما نعرفها." },
    'Moons': { title: "ولادة الأقمار", content: "تماماً كما يتشكل قرص حول النجم، يمكن أن تتشكل أقراص مصغرة من المواد حول الكواكب العملاقة أثناء تكوينها. من هذه الأقراص، تولد الأقمار. بعض الأقمار قد تكون أيضاً كويكبات تم أسرها بجاذبية الكوكب." },
    'RedGiant': { title: "العملاق الأحمر", content: "عندما ينفد وقود الهيدروجين في لب النجم، يبدأ في حرق الهيدروجين في غلاف حول اللب. هذا يجعله يتضخم بشكل هائل ويبرد سطحه، متحولاً إلى عملاق أحمر." },
    'Supernova': { title: "المستعر الأعظم", content: "بالنسبة للنجوم الضخمة، تكون النهاية دراماتيكية. ينهار اللب تحت تأثير جاذبيته، مما يؤدي إلى انفجار كارثي يسمى المستعر الأعظم، والذي ينثر عناصر أثقل من الحديد في جميع أنحاء المجرة." }
};
let unlockedEntries = new Set();


// =================================================================
// P5.JS الوظائف الأساسية
// =================================================================

function preload() {}

function setup() {
    let gameContainer = select('#game-container');
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent(gameContainer);
    colorMode(HSB, 360, 100, 100, 100);
    textFont('Cairo');
    
    loadSoundsAsynchronously();
    setupUI();
    setupVoice();

    cameraState.pos = createVector(width / 2, height / 2);
    cosmicEnvironment = new CosmicEnvironment();
}

function draw() {
    background(0);
    
    updateCamera();
    push();
    applyCameraTransforms();

    cosmicEnvironment.updateAndDisplay();
    
    switch (gameState) {
        case 'GATHERING': updateAndDrawChapter1(); break;
        case 'FORMING_PLANETS': updateAndDrawChapter2(); break;
        case 'RED_GIANT': updateAndDrawChapter3_RedGiant(); break;
        case 'SUPERNOVA': updateAndDrawChapter3_Supernova(); break;
        case 'END_CREDITS': drawEndCredits(); break;
    }

    pop();

    updatePlanetHUD();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
    if (!hasInteracted) return;

    const worldMouseX = (mouseX - width / 2) / cameraState.zoom + cameraState.pos.x;
    const worldMouseY = (mouseY - height / 2) / cameraState.zoom + cameraState.pos.y;
    
    if (gameState === 'FORMING_PLANETS' || gameState === 'RED_GIANT') {
        for (const p of planets) {
            if (dist(worldMouseX, worldMouseY, p.pos.x, p.pos.y) < p.size / 2 + 15 / cameraState.zoom) {
                setCameraTarget(p);
                currentNavIndex = navigationalTargets.indexOf(p);
                return;
            }
        }
    }

    switch (gameState) {
        case 'GATHERING':
            gasParticles.forEach(p => p.applyBoost());
            if (star) star.pulse();
            break;
        case 'FORMING_PLANETS':
            let d = dist(worldMouseX, worldMouseY, width/2, height/2);
            if (d > star.size * 0.8 && d < width*0.45) {
                createPlanet(worldMouseX, worldMouseY);
            }
            break;
    }
}


// =================================================================
// التحكم بالواجهة والصوت
// =================================================================

function loadSoundsAsynchronously() {
    soundFormats('mp3');
    
    const soundPaths = {
        'bgm-chapter1': { local: 'sssd.mp3', remote: 'https://bigsoundbank.com/UPLOAD/mp3/0212.mp3' },
        'bgm-chapter2': { local: 'fff.mp3', remote: 'https://www.chosic.com/wp-content/uploads/2021/04/And-So-It-Begins-Inspired-By-Crush-Sometimes.mp3' },
        'bgm-chapter3': { local: 'ddd.mp3', remote: 'https://www.chosic.com/wp-content/uploads/2022/11/The-Epic-2-by-Keys-of-Moon.mp3' },
        'sfx-supernova': { local: 'qqq.mp3', remote: 'https://bigsoundbank.com/UPLOAD/mp3/0255.mp3' },
        'sfx-comet': { local: 'www.wav', remote: 'https://bigsoundbank.com/UPLOAD/mp3/1440.mp3' }
    };

    for (const key in soundPaths) {
        const paths = soundPaths[key];
        loadSound(paths.local, (sound) => { sounds[key] = sound; }, () => {
            loadSound(paths.remote, (sound) => { sounds[key] = sound; }, () => console.error(`FATAL: Could not load sound for ${key}`));
        });
    }
}

function setupUI() {
    startButton = select('#start-button').mousePressed(startGame);
    encyclopediaModal = select('#encyclopedia-modal');
    closeEncyclopediaButton = select('#close-encyclopedia').mousePressed(() => encyclopediaModal.removeClass('show'));
    encyclopediaEntries = select('#encyclopedia-entries');
    planetHUD = select('#planet-hud');
    hudName = select('#hud-planet-name');
    hudType = select('#hud-planet-type');
    hudTemp = select('#hud-planet-temp');
    hudHab = select('#hud-planet-hab');
    namingModal = select('#naming-modal');
    namingTitle = select('#naming-title');
    namingDesc = select('#naming-desc');
    nameInput = select('#name-input');
    confirmNameButton = select('#confirm-name-button').mousePressed(confirmName);
    sailButton = select('#sail-button').mousePressed(cycleNavigationTarget);
}

function setupVoice() {
    voice = new SpeechSynthesisUtterance();
    voice.lang = 'ar-SA';
    voice.rate = 0.9;
    speechSynthesis.onvoiceschanged = () => {
        const voices = speechSynthesis.getVoices();
        const arabicVoice = voices.find(v => v.lang.startsWith('ar')) || voices.find(v => v.default && v.lang.startsWith('ar'));
        if (arabicVoice) voice.voice = arabicVoice;
    };
}

function speak(text, callback) {
    if (!hasInteracted) { if(callback) callback(); return; }
    voice.text = text;
    voice.onend = callback || (() => {});
    speechSynthesis.cancel();
    speechSynthesis.speak(voice);
}

// *** تعديل مستوى الصوت هنا ***
function playMusic(key) {
    if (!hasInteracted) return;
    Object.values(sounds).forEach(s => { if (s.isLoaded() && s.isPlaying()) s.stop(); });
    if (sounds[key] && sounds[key].isLoaded()) {
        sounds[key].setVolume(0.25); // صوت موسيقى الخلفية ضعيف
        sounds[key].loop();
    } else if (key) {
        setTimeout(() => playMusic(key), 1000);
    }
}

// *** تعديل مستوى الصوت هنا ***
function playSFX(key) {
    if (!hasInteracted) return;
    if (sounds[key] && sounds[key].isLoaded()) {
        sounds[key].setVolume(0.7); // صوت المؤثرات الصوتية أعلى
        sounds[key].play();
    }
}

function unlockEntry(key) {
    if (!unlockedEntries.has(key)) unlockedEntries.add(key);
}

function updateEncyclopediaDisplay() {
    encyclopediaEntries.html('');
    if (unlockedEntries.size === 0) {
        encyclopediaEntries.html('<p>اكتشف أسرار الكون أثناء رحلتك.</p>');
        return;
    }
    const allKeys = Object.keys(encyclopediaData);
    allKeys.forEach(key => {
        if (unlockedEntries.has(key)) {
            const entry = encyclopediaData[key];
            encyclopediaEntries.html(encyclopediaEntries.html() + `<h3>${entry.title}</h3><p>${entry.content}</p>`);
        }
    });
}

// =================================================================
// دوال الكاميرا والإبحار
// =================================================================

function updateCamera() {
    let targetPos = createVector(width/2, height/2);
    if (cameraState.target && cameraState.target.pos) {
        targetPos = cameraState.target.pos;
    }
    cameraState.pos.lerp(targetPos, 0.05);
    cameraState.zoom = lerp(cameraState.zoom, cameraState.targetZoom, 0.05);
}

function applyCameraTransforms() {
    translate(width / 2, height / 2);
    scale(cameraState.zoom);
    translate(-cameraState.pos.x, -cameraState.pos.y);
}

function setCameraTarget(target) {
    cameraState.target = target;
    if (target === null) {
        cameraState.targetZoom = 1.0;
        currentNavIndex = -1;
    } else {
        cameraState.targetZoom = target === star ? 1.2 : 2.5;
    }
}

function cycleNavigationTarget() {
    currentNavIndex++;
    if (currentNavIndex >= navigationalTargets.length) {
        currentNavIndex = -1;
        setCameraTarget(null);
    } else {
        const newTarget = navigationalTargets[currentNavIndex];
        setCameraTarget(newTarget);
    }
}

// =================================================================
// منطق اللعبة والفصول
// =================================================================

function startGame() {
    if (hasInteracted) return;
    hasInteracted = true;
    userStartAudio(); 
    select('#start-screen').hide();
    if (!select('#encyclopedia-icon')) {
        encyclopediaIcon = createDiv('<i class="fas fa-book-open"></i>');
        encyclopediaIcon.id('encyclopedia-icon').parent('game-container');
        encyclopediaIcon.mousePressed(() => {
            updateEncyclopediaDisplay();
            encyclopediaModal.addClass('show');
        });
    }
    setupChapter1();
}

function setupChapter1() {
    gameState = 'GATHERING';
    playMusic('bgm-chapter1');
    star = new Star();
    gasParticles = Array.from({length: NUM_GAS_PARTICLES}, () => new GasParticle());
    unlockEntry('Sahaab');
    speak("أهلاً بك أيها العالم الكوني. أمامك سحابة هائلة من الغاز والغبار. بنقراتك، ستمنحها قوة الجاذبية لتبدأ رحلة تكوين نجم جديد. هيا، لنبدأ.", () => unlockEntry('Protostar'));
}

function updateAndDrawChapter1() {
    star.update();
    star.display();
    gasParticles.forEach(p => {
        p.attract(star.pos); p.update(); p.display();
        if (p.isAbsorbed(star.pos, 20)) {
            currentMass += 0.0001; star.grow(0.01); p.reset();
        }
    });
    if (currentMass >= MAIN_SEQUENCE_MASS && star.stage !== 'MainSequence') {
        star.evolveToMainSequence();
        unlockEntry('MainSequence');
        showNamingModal(star, 'star');
    } else if (currentMass > MAIN_SEQUENCE_MASS / 3 && star.stage === 'Cloud') {
        star.evolveToProtostar();
    }
}

function setupChapter2() {
    gameState = 'FORMING_PLANETS';
    playMusic('bgm-chapter2');
    gasParticles = [];
    protoplanetaryDisk = Array.from({length: NUM_DISK_PARTICLES}, () => new DiskParticle());
    cosmicEnvironment.createAsteroidBelt();
    navigationalTargets = [star];
    select('#navigation-controls').style('display', 'block');
    setCameraTarget(star);
    unlockEntry('ProtoplanetaryDisk');
    unlockEntry('GoldilocksZone');
    speak(`رائع! نجمك المسمى ${star.name} يسطع بقوة. انظر، المادة المتبقية تشكلت في قرص دوار. هذا هو مهد العوالم الجديدة. انقر داخل القرص لتجمع الغبار وتصنع الكواكب.`);
}

function updateAndDrawChapter2() {
    noFill();
    stroke(120, 80, 80, 10);
    strokeWeight(width * 0.1);
    ellipse(width/2, height/2, width * 0.5);
    star.update();
    star.displayRadiant();
    protoplanetaryDisk.forEach(p => { p.update(); p.display(); });
    planets.forEach(p => { p.grow(protoplanetaryDisk); p.update(); p.display(); });
    protoplanetaryDisk = protoplanetaryDisk.filter(p => !p.absorbed);
}

function createPlanet(x, y) {
    unlockEntry('Accretion');
    let newPlanet = new Planet(x, y);
    planets.push(newPlanet);
    navigationalTargets.push(newPlanet);
    planetCount++;
    moonCount += newPlanet.moons.length;
    if (newPlanet.habitability > (bestHabitablePlanet ? bestHabitablePlanet.habitability : 0)) {
        bestHabitablePlanet = newPlanet;
    }
    if (planets.length === 1) {
        clearTimeout(chapter3Timer);
        chapter3Timer = setTimeout(setupChapter3_RedGiant, RED_GIANT_DELAY);
    }
}

function showNamingModal(object, type) {
    objectToName = { object, type };
    namingTitle.html(type === 'star' ? 'ولادة نجم!' : 'عالم جديد!');
    namingDesc.html(type === 'star' ? 'لقد نجحت في إشعال نجم. ما الاسم الذي ستطلقه على هذا المصباح الكوني؟' : `لقد شكلت كوكباً من نوع ${object.typeName}! ما الاسم الذي ستطلقه عليه؟`);
    namingModal.addClass('show');
    nameInput.value('');
}

function confirmName() {
    if (objectToName) {
        let name = nameInput.value() || "مجهول";
        objectToName.object.name = name;
        if(objectToName.type === 'star'){
            starName = name; 
            speak(`يا له من منظر! لقد أشعلت نجمًا. قوته الآن تنبع من الاندماج النووي في قلبه. لكن القصة بدأت للتو.`, () => setTimeout(setupChapter2, 4000));
        } else {
            let hab_msg = '';
            if (objectToName.object.inHabitableZone) hab_msg = "... يا للروعة! إنه في المنطقة الصالحة للحياة! فرصة واعدة لدعم الحياة!";
            else if (objectToName.object.habitability > 50) hab_msg = `... ويبدو أن لديه فرصة جيدة لدعم الحياة!`;
            speak(`عظيم! لقد أسميت هذا العالم بـ ${name}${hab_msg}يا للروعة! إنه في المنطقة الصالحة للحياة! فرصة واعدة لدعم الحياة!`);
             
        }
    }
    namingModal.removeClass('show');
    objectToName = null;
}

function updatePlanetHUD() {
    if (gameState !== 'FORMING_PLANETS' && gameState !== 'RED_GIANT') {
        planetHUD.style('display', 'none'); return;
    }
    let hoveredPlanet = null;
    for (const p of planets) {
        const screenPos = worldToScreen(p.pos);
        if (dist(mouseX, mouseY, screenPos.x, screenPos.y) < (p.size * cameraState.zoom) / 2 + 10) {
            hoveredPlanet = p; break;
        }
    }
    if (hoveredPlanet) {
        const screenPos = worldToScreen(hoveredPlanet.pos);
        hudName.html(hoveredPlanet.name || "قيد التكوين...");
        hudType.html(hoveredPlanet.typeName);
        hudTemp.html(`${hoveredPlanet.temperature.toFixed(0)} °C`);
        hudHab.html(`${hoveredPlanet.habitability.toFixed(0)}%`);
        planetHUD.style('display', 'block').style('left', `${screenPos.x + 20}px`).style('top', `${screenPos.y}px`);
    } else {
        planetHUD.style('display', 'none');
    }
}

function worldToScreen(worldPos) {
    return createVector( (worldPos.x - cameraState.pos.x) * cameraState.zoom + width / 2, (worldPos.y - cameraState.pos.y) * cameraState.zoom + height / 2 );
}

function setupChapter3_RedGiant() {
    gameState = 'RED_GIANT';
    playMusic('bgm-chapter3');
    protoplanetaryDisk = [];
    setCameraTarget(star);
    unlockEntry('RedGiant');
    speak("كل شيء له نهاية، حتى النجوم. لقد استهلك نجمك وقوده وبدأ يتضخم... ليصبح عملاقًا أحمر مهيبًا.", () => {
        clearTimeout(chapter3Timer);
        chapter3Timer = setTimeout(setupChapter3_Supernova, SUPERNOVA_DELAY);
    });
}

function updateAndDrawChapter3_RedGiant() {
    star.becomeRedGiant();
    star.update();
    star.display();
    planets.forEach(p => {
        p.update(); p.display();
        if (dist(p.pos.x, p.pos.y, star.pos.x, star.pos.y) < star.size / 2) p.isDestroyed = true;
    });
    planets = planets.filter(p => !p.isDestroyed);
    navigationalTargets = navigationalTargets.filter(t => t === star || !t.isDestroyed);
}

function setupChapter3_Supernova() {
    gameState = 'SUPERNOVA';
    playMusic(null);
    setCameraTarget(null);
    select('#navigation-controls').style('display', 'none');
    star.initiateSupernova();
    planets = [];
    unlockEntry('Supernova');
}

function updateAndDrawChapter3_Supernova() {
    star.displaySupernova();
    if (star.supernovaState.isFinished) {
        gameState = 'END_CREDITS';
        speak("لا تحزن. هذا ليس فناءً، بل هو ولادة جديدة. هذه العناصر الثقيلة التي تناثرت في الكون ستشكل نجوماً وكواكباً جديدة... وربما حياة في مكان ما. لقد أكملت الدورة الكونية. شكراً لك، أيها العالم الكوني.");
    }
}

function drawEndCredits() {
    star.displayNebulaRemnant();
    textAlign(CENTER, CENTER);
    fill(255, 80);
    textSize(48); text("الإرث الكوني", width/2, height/3 - 50);
    textSize(24); text(`نجمك: ${starName}`, width/2, height/2 - 60);
    text(`عوالم مخلوقة: ${planetCount} كوكب, ${moonCount} قمر`, width/2, height/2 - 20);
    if (bestHabitablePlanet) {
        text(`أعظم آمالك: كوكب "${bestHabitablePlanet.name}" (${bestHabitablePlanet.habitability.toFixed(0)}% صلاحية للحياة)`, width/2, height/2 + 20);
    } else {
        text("لم يتم العثور على عوالم واعدة... لكن الغبار النجمي سيحاول مجدداً.", width/2, height/2 + 20);
    }
    textSize(18); text("لقد أكملت الدورة الكونية بنجاح", width/2, height/2 + 80);
}

// =================================================================
// الفئات (Classes)
// =================================================================

class Star {
    constructor() { this.pos = createVector(width/2, height/2); this.size = 20; this.targetSize = 20; this.stage = 'Cloud'; this.color = color(240, 50, 15, 20); this.pulseSize = 0; this.coronaParticles = []; this.flares = []; this.supernovaState = { stage: 'none', t: 0, debris: [], isFinished: false, nebulaRemnant: null }; this.name = "النجم الأولي"; this.bipolarJets = []; }
    grow(amount) { this.targetSize += amount; }
    pulse() { this.pulseSize = 20; }
    evolveToProtostar() { if(this.stage === 'Cloud') { this.stage = 'Protostar'; this.color = color(35, 80, 90, 80); this.bipolarJets.push(new BipolarJet(this.pos, createVector(0, -1))); this.bipolarJets.push(new BipolarJet(this.pos, createVector(0, 1))); } }
    evolveToMainSequence() { this.stage = 'MainSequence'; this.bipolarJets = []; this.coronaParticles = Array.from({length: 100}, () => new CoronaParticle(this.pos)); }
    becomeRedGiant() { this.stage = 'RedGiant'; this.targetSize = width * 0.6; this.color = color(15, 100, 100); this.coronaParticles = []; this.flares = []; }
    initiateSupernova() { this.stage = 'Supernova'; this.supernovaState.stage = 'collapsing'; this.supernovaState.t = 0; speak("إنه ينهار على نفسه... استعد!", () => { playSFX('sfx-supernova'); this.supernovaState.stage = 'exploding'; this.supernovaState.t = 0; let gameContainer = select('#game-container').elt; gameContainer.style.animation = 'shake 0.5s'; setTimeout(() => gameContainer.style.animation = '', 500); for (let i = 0; i < 150; i++) { this.supernovaState.debris.push(new Debris(this.pos)); } }); }
    displaySupernova() { let state = this.supernovaState; state.t++; if (state.stage === 'collapsing') { let s = lerp(this.size, 0, state.t / 120); fill(255); noStroke(); ellipse(this.pos.x, this.pos.y, s, s); if (s <= 1) { this.supernovaState.t = 120; } } else if (state.stage === 'exploding') { state.debris.forEach(d => { d.update(); d.display(); }); if (state.t > 400) { state.isFinished = true; } } }
    
    displayNebulaRemnant() {
        if (!this.supernovaState.nebulaRemnant) {
            this.supernovaState.nebulaRemnant = [];
            for (let i = 0; i < 80; i++) {
                let hueValue = random(1) > 0.5 ? random(240, 290) : random(330, 360);
                this.supernovaState.nebulaRemnant.push({
                    angle: random(TWO_PI),
                    radius: random(width * 0.05, width * 0.25),
                    speed: random(-0.001, 0.001),
                    color: color(hueValue, 80, 100),
                    size: random(50, 150),
                    life: 1.0,
                    fadeSpeed: random(0.0005, 0.001)
                });
            }
        }
        
        blendMode(ADD);
        this.supernovaState.nebulaRemnant.forEach(p => {
            p.angle += p.speed;
            if (p.life > 0) p.life -= p.fadeSpeed;
            
            const currentSize = p.size * p.life;
            const currentAlpha = 15 * p.life;

            if (p.life > 0) {
                let x = this.pos.x + p.radius * cos(p.angle);
                let y = this.pos.y + p.radius * sin(p.angle);
                fill(p.color, currentAlpha);
                noStroke();
                ellipse(x, y, currentSize, currentSize);
            }
        });
        blendMode(BLEND);
    }

    update() { this.size = lerp(this.size, this.targetSize, 0.02); if (this.pulseSize > 0) this.pulseSize -= 1; this.coronaParticles.forEach(p => p.update(this.size)); this.flares.forEach(f => f.update()); this.flares = this.flares.filter(f => !f.isDone); this.bipolarJets.forEach(j => j.update()); if (this.stage === 'MainSequence' && random() < 0.01) { this.flares.push(new SolarFlare(this.pos, this.size)); } }
    display() { this.bipolarJets.forEach(j => j.display()); push(); translate(this.pos.x, this.pos.y); let glow = color(this.color); glow.setAlpha(15); for (let i = 4; i > 0; i--) { fill(glow); ellipse(0, 0, this.size + i * 10 + this.pulseSize); } fill(this.color); ellipse(0, 0, this.size); pop(); }
    displayRadiant() { this.color = color(60, 5, 100); this.targetSize = constrain(width * 0.1, 80, 150); this.coronaParticles.forEach(p => p.display()); this.flares.forEach(f => f.display()); push(); translate(this.pos.x, this.pos.y); let glow = color(this.color); glow.setAlpha(20); for (let i = 4; i > 0; i--) { fill(glow); beginShape(); for(let a = 0; a < TWO_PI; a+= 0.1) { let r = (this.size + i * 15)/2 + noise(a*5, frameCount*0.01) * 20; vertex(r * cos(a), r * sin(a)); } endShape(CLOSE); } fill(this.color); beginShape(); for(let a = 0; a < TWO_PI; a+= 0.1) { let r = this.size/2 + noise(a, frameCount*0.02) * 5; vertex(r * cos(a), r * sin(a)); } endShape(CLOSE); pop(); }
}

class Planet { constructor(x, y) { this.pos = createVector(x, y); this.orbitalRadius = dist(x, y, width/2, height/2); this.angle = atan2(y - height/2, x - width/2); this.orbitalSpeed = sqrt(constrain(star.size, 50, 200) / this.orbitalRadius) * 0.01; this.size = 5; this.isFullyGrown = false; this.name = ""; this.isDestroyed = false; this.moons = []; let distRatio = this.orbitalRadius / (width * 0.45); this.temperature = lerp(350, -200, distRatio); if (distRatio < 0.2) { this.type = 'Rocky'; this.typeName="صخري"; this.targetSize = random(12, 20); this.color = color(25, lerp(80, 50, distRatio/0.3), 90); unlockEntry('RockyPlanet'); } else if (distRatio < 0.6) { this.type = 'GasGiant'; this.typeName="عملاق غازي"; this.targetSize = random(40, 60); this.color = color(200, 70, 80); this.hasRings = random() > 0.4; unlockEntry('GasGiant'); } else { this.type = 'IceGiant'; this.typeName="عملاق جليدي"; this.targetSize = random(30, 45); this.color = color(220, 50, 95); this.hasRings = random() > 0.6; unlockEntry('IceGiant'); } this.inHabitableZone = (this.orbitalRadius > width * 0.2 && this.orbitalRadius < width * 0.3); this.habitability = this.inHabitableZone ? random(70, 98) : random(0, 20); if(this.type !== 'Rocky') this.habitability /= 5; let moonChance = (this.type === 'GasGiant' || this.type === 'IceGiant') ? 0.7 : 0.1; if (random() < moonChance) { let numMoons = (this.type === 'Rocky') ? 1 : floor(random(1, 5)); for(let i=0; i<numMoons; i++) { this.moons.push(new Moon(this)); } unlockEntry('Moons'); } } grow(particles) { if (this.isFullyGrown) return; particles.forEach(p => { if (!p.absorbed) { let p_x = width/2 + p.radius * cos(p.angle); let p_y = height/2 + p.radius * sin(p.angle); if (dist(this.pos.x, this.pos.y, p_x, p_y) < this.size * 1.5) { p.absorbed = true; this.size += 0.1; } } }); if (this.size >= this.targetSize) { this.isFullyGrown = true; this.size = this.targetSize; showNamingModal(this, 'planet'); } } update() { this.angle += this.orbitalSpeed; this.pos.x = width/2 + this.orbitalRadius * cos(this.angle); this.pos.y = height/2 + this.orbitalRadius * sin(this.angle); this.moons.forEach(m => m.update(this.pos)); } display() { push(); translate(this.pos.x, this.pos.y); if (this.hasRings) { stroke(0, 0, 100, 30); strokeWeight(this.size * 0.1); noFill(); ellipse(0, 0, this.size * 2); } noStroke(); fill(this.color); ellipse(0, 0, this.size); if(this.type === 'GasGiant') { stroke(hue(this.color), saturation(this.color), brightness(this.color) - 20, 50); strokeWeight(this.size / 8); line(-this.size/2, 0, this.size/2, 0); } pop(); this.moons.forEach(m => m.display()); } }
class Debris { constructor(origin) { this.pos = origin.copy(); this.vel = p5.Vector.random2D().mult(random(5, 15)); this.history = []; this.maxLife = random(150, 250); this.life = this.maxLife; let hueValue = random(1) > 0.5 ? random(240, 290) : random(330, 360); this.color = color(hueValue, 80, 100); this.radius = 0; this.angle = this.vel.heading(); this.speed = this.vel.mag(); } update() { this.life--; this.pos.add(this.vel); this.vel.mult(0.98); this.history.push(this.pos.copy()); if (this.history.length > 15) this.history.shift(); this.radius = this.pos.dist(star.pos); } display() { noStroke(); this.history.forEach((p, i) => { let alpha = map(i, 0, this.history.length, 0, 50) * (this.life / this.maxLife); fill(hue(this.color), 80, 100, alpha); ellipse(p.x, p.y, i / 2); }); let headAlpha = 100 * (this.life / this.maxLife); fill(this.color, headAlpha); ellipse(this.pos.x, this.pos.y, 5); } }
class CosmicEnvironment { constructor() { this.bgStars = Array.from({length: 3}, (_, i) => Array.from({length: 100}, () => ({ pos: createVector(random(width), random(height)), size: random(0.5, 2 - i * 0.5), alpha: random(30, 80 - i * 20), layer: i + 1 }))).flat(); this.galaxies = []; this.comets = []; this.asteroids = []; if(random() > 0.5) this.galaxies.push(new Galaxy()); this.nebulaNoiseSeed1 = random(1000); this.nebulaNoiseSeed2 = random(2000); } createAsteroidBelt() { let beltRadius = width * 0.35; let beltWidth = 50; for (let i = 0; i < 200; i++) { this.asteroids.push(new Asteroid(beltRadius, beltWidth)); } } updateAndDisplay() { this.drawBackgroundNebula(); this.bgStars.forEach(s => { s.pos.y += 0.05 * s.layer; if(s.pos.y > height) s.pos.y = 0; fill(0, 0, 100, s.alpha); noStroke(); ellipse(s.pos.x, s.pos.y, s.size); }); [...this.galaxies, ...this.comets, ...this.asteroids].forEach(obj => obj.updateAndDisplay()); this.comets = this.comets.filter(c => !c.isDone); if (random() < 0.002 && this.comets.length < 1 && gameState !== 'START_SCREEN' && gameState !== 'GATHERING') { this.comets.push(new Comet()); playSFX('sfx-comet'); } } drawBackgroundNebula() { let t = frameCount * 0.0005; for (let x = 0; x < width; x += 20) { for (let y = 0; y < height; y += 20) { let n1 = noise(x * 0.005, y * 0.005, t + this.nebulaNoiseSeed1); let n2 = noise(x * 0.005, y * 0.005, t + this.nebulaNoiseSeed2); if (n1 > 0.5) { fill(260, 80, 20, (n1 - 0.5) * 20); noStroke(); rect(x, y, 20, 20); } if (n2 > 0.5) { fill(330, 70, 30, (n2 - 0.5) * 20); noStroke(); rect(x, y, 20, 20); } } } } }
class Moon { constructor(parentPlanet){ this.parentPos = parentPlanet.pos.copy(); this.orbitalRadius = parentPlanet.size/2 + random(10, 25); this.angle = random(TWO_PI); this.speed = random(0.02, 0.05); this.size = random(2, 5); this.color = color(0, 0, random(70, 90)); } update(newParentPos) { this.parentPos = newParentPos; this.angle += this.speed; } display() { let x = this.parentPos.x + this.orbitalRadius * cos(this.angle); let y = this.parentPos.y + this.orbitalRadius * sin(this.angle); fill(this.color); noStroke(); ellipse(x, y, this.size); } }
class BipolarJet { constructor(origin, direction) { this.origin = origin; this.direction = direction.copy(); this.particles = []; } update() { if(this.particles.length < 50) { this.particles.push(new JetParticle(this.origin, this.direction)); } this.particles.forEach(p => p.update()); this.particles = this.particles.filter(p => p.life > 0); } display() { this.particles.forEach(p => p.display()); } }
class JetParticle { constructor(origin, direction) { this.pos = origin.copy(); let angle = direction.heading() + random(-0.1, 0.1); this.vel = p5.Vector.fromAngle(angle, random(5, 10)); this.life = 100; this.maxLife = this.life; this.size = random(2, 6); } update() { this.pos.add(this.vel); this.vel.mult(0.98); this.life--; } display() { let alpha = map(this.life, 0, this.maxLife, 0, 80); fill(180, 80, 100, alpha); noStroke(); ellipse(this.pos.x, this.pos.y, this.size); } }
class Asteroid { constructor(beltRadius, beltWidth) { this.radius = beltRadius + random(-beltWidth / 2, beltWidth / 2); this.angle = random(TWO_PI); this.speed = random(0.0005, 0.001) * (width / (this.radius * 2)); this.size = random(2, 6); this.shape = Array.from({length: 8}, () => random(0.7, 1.3)); this.color = color(25, 10, random(40, 60)); } update() { this.angle += this.speed; } updateAndDisplay() { this.update(); let x = width/2 + this.radius * cos(this.angle); let y = height/2 + this.radius * sin(this.angle); fill(this.color); noStroke(); push(); translate(x, y); beginShape(); for (let i = 0; i < this.shape.length; i++) { let angle = map(i, 0, this.shape.length, 0, TWO_PI); let r = this.size * this.shape[i]; vertex(r * cos(angle), r * sin(angle)); } endShape(CLOSE); pop(); } }
class GasParticle { constructor() { this.reset(); } reset() { let edge = floor(random(4)); if (edge === 0) { this.pos = createVector(random(width), -20); } else if (edge === 1) { this.pos = createVector(random(width), height + 20); } else if (edge === 2) { this.pos = createVector(-20, random(height)); } else { this.pos = createVector(width + 20, random(height)); } this.vel = createVector(); this.acc = createVector(); this.maxSpeed = random(1, 2.5); this.size = random(2, 5); this.color = color(random(200, 280), 50, 100, random(50, 90)); } attract(target) { let force = p5.Vector.sub(target, this.pos); force.setMag(0.1); this.acc.add(force); } applyBoost() { let boost = p5.Vector.sub(star.pos, this.pos); boost.setMag(0.5); this.acc.add(boost); } update() { this.vel.add(this.acc); this.vel.limit(this.maxSpeed); this.pos.add(this.vel); this.acc.mult(0); } display() { fill(this.color); noStroke(); ellipse(this.pos.x, this.pos.y, this.size, this.size); } isAbsorbed(target, threshold) { return dist(this.pos.x, this.pos.y, target.x, target.y) < threshold; } }
class DiskParticle { constructor() { this.center = createVector(width/2, height/2); this.radius = random(star.targetSize*1.2, width * 0.45); this.angle = random(TWO_PI); this.speed = random(0.001, 0.005) * (width / (this.radius * 2)); this.size = random(1, 3.5); this.color = color(random(20, 50), 60, 80, random(40, 70)); this.absorbed = false; this.history = []; } update() { this.angle += this.speed; let x = this.center.x + this.radius * cos(this.angle); let y = this.center.y + this.radius * sin(this.angle); let noiseFactor = 20; x += map(noise(this.angle, this.radius * 0.01), 0, 1, -noiseFactor, noiseFactor); y += map(noise(this.angle + 100, this.radius * 0.01), 0, 1, -noiseFactor, noiseFactor); this.history.push(createVector(x, y)); if (this.history.length > 5) this.history.shift(); } display() { noStroke(); this.history.forEach((p, i) => { fill(hue(this.color), saturation(this.color), brightness(this.color), map(i, 0, this.history.length, 0, 50)); ellipse(p.x, p.y, this.size * (i/this.history.length)); }); } }
class CoronaParticle { constructor(center) { this.center = center; this.reset(1); } reset(size) { this.radius = random(size/2, size*1.5); this.angle = random(TWO_PI); this.life = random(50, 150); this.maxLife = this.life; } update(size) { this.life--; if (this.life <= 0) this.reset(size); } display() { let alpha = (this.life / this.maxLife) * 50; let x = this.center.x + cos(this.angle)*this.radius; let y = this.center.y + sin(this.angle)*this.radius; fill(60, 20, 100, alpha); ellipse(x,y,2,2); }}
class SolarFlare { constructor(center, starSize) { this.pos = center.copy(); this.angle = random(TWO_PI); this.vel = p5.Vector.fromAngle(this.angle, random(5, 10)); this.life = 100; } update() { this.pos.add(this.vel); this.vel.mult(0.95); this.life -= 2; if (this.life <= 0) this.isDone = true; } display() { fill(60, 80, 100, this.life); ellipse(this.pos.x, this.pos.y, 10); } }
class Galaxy { constructor() { this.pos = createVector(random(width), random(height*0.2)); this.size = random(50, 150); this.angle = random(TWO_PI); this.particles = Array.from({length: 200}, () => ({ r: random(this.size), a: random(TWO_PI), c: color(random(200,300), 50, 100, random(10,40)) })); } updateAndDisplay() { this.angle += 0.0005; push(); translate(this.pos.x, this.pos.y); rotate(this.angle); this.particles.forEach(p => { fill(p.c); ellipse(p.r * cos(p.a), p.r * sin(p.a) * 0.3, 2); }); pop(); } }
class Comet { constructor() { this.pos = createVector(random(width), -20); this.vel = createVector(random(-1,1), random(2,4)); this.history = []; this.isDone = false; } updateAndDisplay() { this.pos.add(this.vel); this.history.push(this.pos.copy()); if (this.history.length > 30) this.history.shift(); if (this.pos.y > height + 50) this.isDone = true; this.history.forEach((p,i) => { let alpha = map(i, 0, this.history.length, 0, 80); fill(180, 80, 100, alpha); ellipse(p.x, p.y, 20 - i*0.5); }); } }