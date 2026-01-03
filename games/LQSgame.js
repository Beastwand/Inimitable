const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'start'; // 'start', 'playing', 'paused', 'quiz', 'gameOver', 'victory'
let fitnessLevel = 1; // 1: Average, 2: Fit, 3: Muscular
let score = 0;
let distance = 0;
let gameSpeed = 3;

// Assets (Paths to local workspace)
const playerImg = new Image();
playerImg.src = 'LQSplayer.png';

const microbeImg = new Image();
microbeImg.src = 'LQSmicrobe.png';

const background1 = new Image();
background1.src = 'LQSbg1.png';

const background2 = new Image();
background2.src = 'LQSbg2.png';

const background3 = new Image();
background3.src = 'LQSbg3.png';

// Transparency Processing
let playerTransparent = null;
let microbeTransparent = null;

function processTransparency(img, callback) {
    const run = () => {
        if (!img.naturalWidth) return;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        tempCtx.drawImage(img, 0, 0);

        try {
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;

            // Sample corner for background color (usually white)
            const br = data[0], bg = data[1], bb = data[2];

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                // Remove if matches corner color or is very bright (near-white)
                // Lowered threshold to 220 to catch more off-white artifacts
                const isBackground = (Math.abs(r - br) < 30 && Math.abs(g - bg) < 30 && Math.abs(b - bb) < 30) || (r > 220 && g > 220 && b > 220);
                if (isBackground) {
                    data[i + 3] = 0;
                }
            }

            tempCtx.putImageData(imageData, 0, 0);
            const transparentImg = new Image();
            transparentImg.src = tempCanvas.toDataURL('image/png');
            transparentImg.onload = () => callback(transparentImg);
            transparentImg.onerror = () => callback(img);
        } catch (e) {
            callback(img);
        }
    };

    if (img.complete && img.naturalWidth > 0) run();
    else img.onload = run;
}

// Character settings
const player = {
    x: 100,
    y: 0,
    width: 90, // Reduced from 150 (approx 40% smaller)
    height: 90,
    dy: 0,
    jumpForce: 15, // Increased from 12
    gravity: 0.6,
    isGrounded: true,
    platform: null,
    frameX: 0,
    stage: 0,
    gunLevel: 0, // 0: None, 1: Laser, 2: Plasma
    vx: 0,
    dashTimer: 0,
    dashCooldown: 0,
    isInvulnerable: false,
    isInvulnerable: false,
    shieldActive: false,
    speedBoostTimer: 0,
    // Visual Juice Props
    scaleX: 1,
    scaleY: 1,
    muzzleTimer: 0
};

// Gun & Bullets
let bullets = [];
let enemyBullets = []; // New for Stage 3
let gunItem = null;
let powerups = []; // New for Shield/Speed

// Visual Juice Systems
let particles = [];
let damageTexts = [];
let shakeAmount = 0;
let boss = null; // New for Boss Fights
let weatherParticles = []; // New for Rain/Leaves

// ===== MEGA FEATURE PACK =====

// Combo System
let combo = {
    count: 0,
    timer: 0,
    maxTimer: 120, // 2 seconds at 60fps
    multiplier: 1,
    bestCombo: 0
};

// Progressive Difficulty
let difficultyLevel = 1;
const DIFFICULTY_THRESHOLDS = [0, 1000, 2500, 5000, 8000, 12000];

// New Enemy Types Configuration
const ENEMY_TYPES = {
    microbe: { health: 6, speed: 1, color: '#39ff14', unlockDist: 0 },
    flyer: { health: 4, speed: 1.5, color: '#00bfff', unlockDist: 1000 },
    tank: { health: 15, speed: 0.5, color: '#8b0000', unlockDist: 2000 },
    splitter: { health: 8, speed: 1.2, color: '#ff69b4', unlockDist: 3000 },
    bomber: { health: 5, speed: 1.3, color: '#ff4500', unlockDist: 4000 },
    // Restored Classics
    inflammatory: { health: 3, speed: 1.8, color: '#ff4500', unlockDist: 500 },
    oxidant: { health: 10, speed: 0.8, color: '#ffd700', unlockDist: 1500 }
};

// Weapon Tier System
const WEAPONS = {
    laser: { name: 'LASER', color: '#00f3ff', baseRate: 15, damage: 3 },
    plasma: { name: 'PLASMA', color: '#ff4500', baseRate: 70, damage: 10 },
    spray: { name: 'SPRAY', color: '#ffff00', baseRate: 45, damage: 3 },
    rail: { name: 'RAIL', color: '#bf00ff', baseRate: 66, damage: 12 }
};
let currentWeapon = 'laser';
let lastSpawnedType = null;
let weaponTier = 1;
let weaponTimer = Infinity; // Tiered weapons don't expire unless swapped

// Achievements System
const ACHIEVEMENTS = {
    firstBlood: { name: 'First Blood', desc: 'Kill your first enemy', unlocked: false },
    comboKing: { name: 'Combo King', desc: 'Reach 10x combo', unlocked: false },
    marathon: { name: 'Marathon', desc: 'Travel 10,000m', unlocked: false },
    quizMaster: { name: 'Quiz Master', desc: 'Answer 10 questions correctly', unlocked: false },
    bossSlayer: { name: 'Boss Slayer', desc: 'Defeat 5 bosses', unlocked: false },
    speedDemon: { name: 'Speed Demon', desc: 'Collect 20 speed boosts', unlocked: false }
};
let achievementToasts = [];
let stats = {
    enemiesKilled: 0,
    bossesKilled: 0,
    questionsAnswered: 0,
    speedBoostsCollected: 0,
    totalDistance: 0
};

// Unlockable Skins (Palette Swaps)
const SKINS = {
    default: { name: 'Default', hue: 0, unlocked: true },
    golden: { name: 'Golden', hue: 45, unlockCondition: 'totalDistance >= 5000' },
    neon: { name: 'Neon', hue: 180, unlockCondition: 'bossesKilled >= 10' },
    ghost: { name: 'Ghost', hue: 270, unlockCondition: 'deaths >= 50' },
    champion: { name: 'Champion', hue: 120, unlockCondition: 'allAchievements' }
};
let currentSkin = 'default';
let deaths = 0;

// Daily Challenge
let dailyChallenge = null;
const DAILY_MODIFIERS = [
    { name: 'Double Speed', effect: () => { gameSpeed *= 2; } },
    { name: 'One Hit Wonder', effect: () => { /* enemies die in one hit */ } },
    { name: 'Bullet Hell', effect: () => { /* more enemy bullets */ } },
    { name: 'Giant Enemies', effect: () => { /* enemies are bigger */ } },
    { name: 'Speed Runner', effect: () => { player.speedBoostTimer = Infinity; } }
];

// Dynamic Music
let musicIntensity = 'calm'; // 'calm', 'action', 'boss', 'victory'

// Audio Sliders
let sfxVolume = 1.0;
let musicVolume = 1.0;

// Customizable Controls
let userControls = {
    jump: ['Space', 'ArrowUp'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    down: ['ArrowDown', 'KeyS'],
    fire: ['KeyW', 'KeyZ', 'KeyX']
};
let isRebinding = null; // Stores action name currently being rebinded

function saveControls() {
    localStorage.setItem('sodaHealthControls', JSON.stringify(userControls));
}

function loadControls() {
    const saved = localStorage.getItem('sodaHealthControls');
    if (saved) {
        try {
            userControls = JSON.parse(saved);
        } catch (e) {
            console.error("Failed to load controls:", e);
        }
    }
}
loadControls(); // Immediate load

function drawGun(ctx, x, y, width, height, level = 1) {
    ctx.save();
    ctx.translate(x, y);

    const isLevel2 = level === 2;
    const isLevel3 = level === 3;
    const isLevel4 = level === 4;

    const coreColor = isLevel4 ? '#ffd700' : (isLevel3 ? '#bf00ff' : (isLevel2 ? '#ff8c00' : '#00f3ff'));
    const bodyColorStart = isLevel4 ? '#f0cc00' : (isLevel3 ? '#e0e0e0' : (isLevel2 ? '#cd7f32' : '#4a4e69'));
    const bodyColorEnd = isLevel4 ? '#b8860b' : (isLevel3 ? '#808080' : (isLevel2 ? '#8b4513' : '#22223b'));

    const bodyGrad = ctx.createLinearGradient(0, 0, 0, height);
    bodyGrad.addColorStop(0, bodyColorStart);
    bodyGrad.addColorStop(0.5, bodyColorEnd);
    bodyGrad.addColorStop(1, bodyColorStart);

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 1;

    const barrelH = (isLevel3 || isLevel4) ? height * 0.9 : (isLevel2 ? height * 0.8 : height * 0.6);

    // Level 4 Special: Side Canister
    if (isLevel4) {
        ctx.beginPath();
        ctx.roundRect(width * 0.3, -height * 0.3, width * 0.4, height * 0.6, 5);
        ctx.fill();
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.roundRect(0, (height - barrelH) / 2, width, barrelH, 3);
    ctx.fill();
    ctx.stroke();

    // Grip
    ctx.beginPath();
    ctx.roundRect(width * 0.1, height * 0.5, width * 0.3, height * 0.6, 3);
    ctx.fill();
    ctx.stroke();

    // Secondary detail for level 3/4
    if (isLevel3 || isLevel4) {
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(width * 0.2, height * 0.5);
        ctx.lineTo(width * 0.8, height * 0.5);
        ctx.stroke();
    }

    ctx.shadowBlur = 10;
    ctx.shadowColor = coreColor;
    ctx.fillStyle = coreColor;
    ctx.fillRect(width * 0.4, height * 0.3, width * 0.4, height * 0.15);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(width - 5, height * 0.2, 5, barrelH * 0.5);

    ctx.restore();
}

function drawBullet(ctx, b) {
    const { x, y, width, height, type } = b;
    ctx.save();

    if (type === 'pellet') {
        const lifeRatio = b.life / 60;
        ctx.globalAlpha = lifeRatio;
        ctx.fillStyle = '#fff7cc';
        ctx.beginPath();
        ctx.arc(x, y, width / 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'rail') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#bf00ff';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#bf00ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 10, y + height / 2);
        ctx.lineTo(x + width, y + height / 2);
        ctx.stroke();
    } else if (type === 'plasma') {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const radius = width / 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff4500';
        const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#ffd700');
        grad.addColorStop(1, '#ff4500');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'entropy') {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0000';
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'spread') {
        // 3-way spread - red bullets
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff6b6b';
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'homing') {
        // Homing missile - purple with trail
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#9b59b6';
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.moveTo(x + width, y + height / 2);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 5, y + height / 2);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        ctx.fill();
        // Exhaust
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(x - 5, y + height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'freeze') {
        // Freeze ray - cyan snowflake
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ffff';
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
        ctx.fill();
        // Snowflake pattern
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(x + width / 2, y + height / 2);
            ctx.lineTo(x + width / 2 + Math.cos(angle) * width / 2, y + height / 2 + Math.sin(angle) * height / 2);
            ctx.stroke();
        }
    } else if (type === 'beam') {
        // Continuous beam - yellow laser line
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffff00';
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = height;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y + height / 2);
        ctx.lineTo(x + width, y + height / 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = height / 3;
        ctx.beginPath();
        ctx.moveTo(x, y + height / 2);
        ctx.lineTo(x + width, y + height / 2);
        ctx.stroke();
    } else {
        // Default laser
        ctx.fillStyle = '#00f3ff';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 5, y + 1, width - 10, height - 2);
    }

    if (b.type === 'molecule') {
        drawMolecule(ctx, b.x, b.y, b.width * 2, b.moleculeType || 'oxidant', 1.0);
    } else if (b.type === 'missile') {
        ctx.fillStyle = '#ff4500';
        ctx.beginPath();
        // Pointing LEFT (Horizontal)
        ctx.moveTo(b.x, b.y + b.height / 2);
        ctx.lineTo(b.x + b.width, b.y);
        ctx.lineTo(b.x + b.width, b.y + b.height);
        ctx.fill();
        // Thruster smoke
        spawnParticles(b.x + b.width, b.y + b.height / 2, '#555', 1, 'trail');
    } else if (b.type === 'inflammation') {
        ctx.fillStyle = 'rgba(255, 69, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.width / 2, 0, Math.PI * 2);
        ctx.fill();
        if (Math.random() < 0.3) spawnParticles(b.x, b.y, '#ff4500', 1, 'trail');
    }

    ctx.restore();
}

// Platforms
// Platforms
let platforms = [];
const minPlatformDistance = 1500;
let lastPlatformSpawn = 0;
let lastEnemySpawn = 0;
let lastPowerupDistance = 0; // New for Power-up spacing
let lastQuizDistance = 0; // Cooldown between quizzes
let fireCooldown = 0;     // Rate limiting for auto-fire
let gunTutorialTimer = 0; // Show "Press W" message
let hasShownGunTutorial = false;

// Quiz Data - 15 Questions based on the article
const allQuestions = [
    { q: "Which 'natural sugar' helps prevent sugar metabolism when consumed simultaneously?", options: ["Allulose", "Fructose", "Sucralose"], correct: 0 },
    { q: "What specific health benefit is attributed to Brassica (cruciferous) vegetables like broccoli in the source material?", options: ["They help the body clear synthetic chemicals and carcinogens.", "They alter how fructose is digested to prevent it from increasing liver fat.", "They are the most powerful food for downregulating inflammation."], correct: 0 },
    { q: "What specialized muscle exercise can be performed while seated?", options: ["Soleus Push-up", "Bicep Curl", "Squat"], correct: 0 },
    { q: "Garlic is a natural source of which prebiotic fiber?", options: ["Inulin", "Pectin", "Cellulose"], correct: 0 },
    { q: "Which vegetable enhances the breakdown of synthetic compounds in the liver?", options: ["Broccoli", "Carrot", "Potato"], correct: 0 },
    { q: "What makes Soleus muscle exercises highly convenient?", options: ["Can be done while seated", "Requires no oxygen", "Builds biceps"], correct: 0 },
    { q: "What is a primary benefit of a short walk after a meal?", options: ["Glucose clearance", "Muscle building", "Improved vision"], correct: 0 },
    { q: "Garlic's organosulfur compounds can help protect against:", options: ["Genotoxicity", "Hair loss", "Dehydration"], correct: 0 },
    { q: "According to the article, inulin consumption can alter how which sugar is digested?", options: ["Fructose", "Glucose", "Lactose"], correct: 0 },
    { q: "Autophagy refers to what process mentioned in the article?", options: ["Cellular cleaning", "Fat storage", "Bone growth"], correct: 0 },
    { q: "Which brand of Allulose did the author mention buying or recommending?", options: ["NOW", "Pyure", "Splenda"], correct: [0, 1] },
    { q: "Which fruit's biomarker was better after eating sugary food with it?", options: ["Blueberry", "Avocado", "Garlic"], correct: 0 },
    { q: "Blueberries are specifically highlighted for reducing:", options: ["Inflammation", "Muscle mass", "Sleep"], correct: 0 },
    { q: "According to the article, dietary engineering can lead to a:", options: ["Net health gain", "Guaranteed loss", "Sugar crash"], correct: 0 },
    { q: "Which plant contains sulforaphane for liver detoxification?", options: ["Broccoli", "Garlic", "Blueberry"], correct: 0 },
    // 15 New Questions
    { q: "The article cites 2025 research on inulin, a type of fiber. What did this research suggest about inulin's effect on fructose?", options: ["It provides a source of natural sugar that is healthier than fructose.", "It completely blocks the absorption of fructose in the digestive system.", "It can alter fructose digestion, causing it to be used for health-promoting purposes."], correct: 2 },
    { q: "The article discusses addressing health concerns related to:", options: ["Microplastics", "Radiowaves", "Solar flares"], correct: 0 },
    { q: "Which mineral is explicitly mentioned as being restored by healthy foods?", options: ["Magnesium (Mg)", "Iron (Fe)", "Zinc (Zn)"], correct: 0 },
    { q: "Matcha has been studied for its ability to block effects on:", options: ["DNA", "Eyelashes", "Nail growth"], correct: 0 },
    { q: "Exercises focusing on which area can also aid glucose clearance?", options: ["Arm muscles", "Toes", "Ear lobes"], correct: 0 },
    { q: "Which brand of Blueberry powder was recommended in the article?", options: ["Jungle Powders", "Blue Forest", "Nature Mix"], correct: 0 },
    { q: "Inulin can cause fructose to be utilized for:", options: ["Health promotion", "Fat storage", "Liver stress"], correct: 0 },
    { q: "Dr. Marc Hamilton is associated with research on which muscle?", options: ["Soleus", "Deltoid", "Gluteus"], correct: 0 },
    { q: "Which secondary sweetener was mentioned alongside Allulose?", options: ["Molasses", "Stevia", "Aspartame"], correct: 0 },
    { q: "Phenolic compounds for sugar metabolism are derived from:", options: ["Plants", "Salt", "Air"], correct: 0 },
    { q: "Which Garlic brand was linked in the article?", options: ["Spice World", "Garlic King", "Organic Farms"], correct: 0 },
    { q: "Which Broccoli supplement brand was mentioned?", options: ["Micro Ingredients", "Veggie Health", "Green Power"], correct: 0 },
    { q: "According to the study, Allulose remains effective for how long after eating?", options: ["One hour", "Five minutes", "A full day"], correct: 0 },
    { q: "What 'relevant addition' usually comes with nutritious plant foods?", options: ["Vitamin C", "Vitamin D", "B12"], correct: 0 },
    { q: "The article mentions getting benefits of autophagy while:", options: ["Still eating food", "Sleeping only", "Sprinting"], correct: 0 }
];

// Shuffle helper
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Select a random 15 for this run (from 30)
const questions = shuffle([...allQuestions]).slice(0, 15);
let currentQuestionIndex = 0;


let backgrounds = [];

// Resize canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.y = canvas.height - 200;

    // Re-initialize backgrounds with current canvas width
    backgrounds = [
        { x: 0, img: background1, speed: 0.5, isBg: true },
        { x: canvas.width, img: background1, speed: 0.5, isBg: true }
    ];
}
window.addEventListener('resize', resize);
resize();

// Input
const keys = {};
window.addEventListener('keydown', e => {
    // Handling Rebinding State
    if (isRebinding) {
        e.preventDefault();
        // Don't allow Escape to be bound (used for cancel/close)
        if (e.code === 'Escape') {
            isRebinding = null;
            updateControlsUI();
            return;
        }

        // Update the control (keeping it simple: one key per action for remapping UI)
        userControls[isRebinding] = [e.code];
        saveControls();
        isRebinding = null;
        updateControlsUI();
        return;
    }

    keys[e.code] = true;

    // Pause Logic
    const isPauseKey = e.code === 'Escape';
    const isSecondaryPlayKey = userControls.jump.includes(e.code);

    if (isPauseKey) {
        const controlsMenu = document.getElementById('controls-menu');
        if (controlsMenu && !controlsMenu.classList.contains('hidden')) {
            toggleControlsMenu();
            return;
        }
    }

    if (isPauseKey && gameState === 'playing') {
        gameState = 'paused';
    } else if (gameState === 'paused' && (isSecondaryPlayKey || isPauseKey)) {
        gameState = 'playing';
    }

    // Numeric Quiz Selection (Keys 1, 2, 3)
    if (gameState === 'quiz') {
        if (e.code === 'Digit1') handleNumericSelection(0);
        if (e.code === 'Digit2') handleNumericSelection(1);
        if (e.code === 'Digit3') handleNumericSelection(2);
    }
});

function handleNumericSelection(index) {
    const options = document.querySelectorAll('.option-btn');
    if (options[index]) {
        options[index].click();
    }
}

function playerJump() {
    if (player.isGrounded && (gameState === 'playing' || gameState === 'start')) {
        if (gameState === 'start') {
            startGame();
        }
        player.dy = -player.jumpForce - (fitnessLevel * 1.5);
        player.isGrounded = false;
        player.platform = null; // Detach from platform
        try { soundManager.play('jump'); } catch (e) { }
        // Jump Stretch
        player.scaleX = 0.7;
        player.scaleY = 1.3;
    }
}

window.addEventListener('keyup', e => keys[e.code] = false);

// Mobile/Pointer Jump Support
window.addEventListener('pointerdown', (e) => {
    // Don't jump if tapping UI elements (like quiz buttons, start screen, or controls menu)
    if (e.target.tagName === 'BUTTON' || e.target.closest('.option-btn') || e.target.closest('#start-screen') || e.target.closest('#controls-menu')) return;

    if (gameState === 'playing' || gameState === 'start') {
        playerJump();
    }
});

// Entities
let enemies = [];

function drawMolecule(ctx, x, y, size, type, alpha = 1.0) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + size / 2, y + size / 2);

    const isOxidant = type === 'oxidant';
    const mainColor = isOxidant ? '#ffd700' : '#ff4500';
    const subColor = isOxidant ? '#fffa65' : '#ff9f43';

    // 1. Core Sphere (Using gradients instead of shadowBlur for performance)
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.7, mainColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent edge

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Orbiting Detail
    ctx.rotate(Date.now() * 0.002);
    ctx.strokeStyle = subColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, size / 1.8, size / 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Label (Restored at smaller 8px size)
    ctx.rotate(-(Date.now() * 0.002));
    ctx.fillStyle = 'white';
    ctx.font = 'bold 8px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(type, 0, size / 2 + 10);

    ctx.restore();
}

function update() {
    if (gameState !== 'playing') return;

    distance += gameSpeed;

    // Shooting - Rate limited Auto-fire
    if (fireCooldown > 0) fireCooldown--;
    const isFiring = userControls.fire.some(k => keys[k]);
    if (isFiring && player.gunLevel > 0 && gameState === 'playing' && fireCooldown <= 0) {
        const wpn = WEAPONS[currentWeapon];
        let damage = wpn.damage;
        let rate = wpn.baseRate;

        if (currentWeapon === 'laser') {
            // Laser Scaling: Speed
            // Tier 1 is 10% slower than base (15 -> 16.5), then 20% faster each tier
            const baseDelay = wpn.baseRate * 1.1;
            rate = Math.round(baseDelay * Math.pow(0.8, weaponTier - 1));
            bullets.push({
                x: player.x + player.width,
                y: player.y + player.height / 2 - 2,
                width: 20,
                height: 5,
                speed: 12,
                type: 'laser',
                damage: damage
            });
            soundManager.play('shoot');
        } else if (currentWeapon === 'plasma') {
            // Plasma Scaling: Size (15% per tier) + Speed (10% faster per tier)
            const scale = Math.pow(1.15, weaponTier - 1);
            const size = 60 * scale;
            rate = Math.round(wpn.baseRate * Math.pow(0.9, weaponTier - 1));
            bullets.push({
                x: player.x + player.width,
                y: player.y + player.height / 2 - size / 2,
                width: size,
                height: size,
                speed: 8,
                type: 'plasma',
                damage: damage
            });
            soundManager.play('plasma');
        } else if (currentWeapon === 'spray') {
            // Spray Scaling: Floating Pellets (Start at 5, +1 per tier)
            const count = 5 + (weaponTier - 1);
            for (let i = 0; i < count; i++) {
                bullets.push({
                    x: player.x + player.width,
                    y: player.y + player.height / 2,
                    width: 10,
                    height: 10,
                    speed: 12 + Math.random() * 5,
                    dy: (Math.random() - 0.5) * 8, // Up/down spread
                    type: 'pellet',
                    damage: damage,
                    life: 60 + Math.floor(Math.random() * 20)
                });
            }
            soundManager.play('shoot');
            rate = wpn.baseRate; // Use baseRate (now 35)
        } else if (currentWeapon === 'rail') {
            bullets.push({
                x: player.x + player.width,
                y: player.y + player.height / 2 - 2,
                width: 40,
                height: 4,
                speed: 20,
                type: 'rail',
                damage: damage,
                pierceCount: weaponTier + 1, // Tier 1: 2 pierces (3 hits), Tier 4: 5 pierces (6 hits)
                hitHistory: [] // Track unique enemies hit
            });
            spawnParticles(player.x + player.width, player.y + player.height / 2, '#bf00ff', 5, 'trail');
            soundManager.play('shoot');
            rate = wpn.baseRate;
        }

        fireCooldown = rate;
        player.muzzleTimer = 4;
    }

    // Visual Juice Update
    updateParticles();
    updateDamageTexts();
    if (shakeAmount > 0) shakeAmount *= 0.9;

    // Tutorial Timer (Counts down)
    if (gunTutorialTimer > 0) gunTutorialTimer--;

    // Dashboard / Dash Logic
    if (keys['ShiftLeft'] && player.dashCooldown <= 0) {
        player.dashTimer = 20;
        player.dashCooldown = 80;
        spawnParticles(player.x, player.y + player.height / 2, 'white', 10, 'trail');
        shakeScreen(4);
    }

    if (player.dashTimer > 0) {
        player.dashTimer--;
        player.x += 12;
        player.isInvulnerable = true;
        // Ghost trail effect
        if (player.dashTimer % 4 === 0) {
            spawnParticles(player.x, player.y + player.height / 2, 'rgba(255,255,255,0.5)', 5, 'trail');
        }
    } else {
        player.isInvulnerable = false;
    }
    if (player.dashCooldown > 0) player.dashCooldown--;

    // Speed Boost Logic
    if (player.speedBoostTimer > 0) {
        player.speedBoostTimer--;
        gameSpeed = 6; // Increased from 5 to 6 for "More Speed"
    } else {
        gameSpeed = 3; // Reset
    }

    // Jump logic
    const isJumping = userControls.jump.some(k => keys[k]);
    if (isJumping) {
        playerJump();
    }

    // Horizontal steering
    const isRight = userControls.right.some(k => keys[k]);
    const isLeft = userControls.left.some(k => keys[k]);
    if (isRight) player.x = Math.min(canvas.width - player.width, player.x + 5);
    if (isLeft) player.x = Math.max(0, player.x - 5);

    // Apply Horizontal Velocity (Knockback)
    player.x += player.vx;
    player.vx *= 0.9;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;

    player.dy += player.gravity;
    player.y += player.dy;

    // Ground collision
    const groundY = canvas.height - 200;
    if (player.y > groundY) {
        if (!player.isGrounded) {
            // Land Squash
            player.scaleX = 1.3;
            player.scaleY = 0.7;
        }
        player.y = groundY;
        player.dy = 0;
        player.isGrounded = true;
        player.platform = null; // Ensure platform is null if on ground
    }

    // Squash & Stretch Recovery (Lerp to 1)
    player.scaleX += (1 - player.scaleX) * 0.1;
    player.scaleY += (1 - player.scaleY) * 0.1;

    // Muzzle Flash Timer
    if (player.muzzleTimer > 0) player.muzzleTimer--;

    // Update Backgrounds
    backgrounds.forEach(bg => {
        bg.x -= bg.speed * (gameSpeed / 3);
        // Fix gap: Snap to integer and ensure a 2px overlap to hide the seam
        if (bg.x <= -canvas.width) {
            bg.x += canvas.width * 2 - 2;
        }
    });

    // Environment Transitions
    // Stage progress pauses while boss is alive (backgrounds stay the same)
    const effectiveIndex = boss ? Math.min(currentQuestionIndex, boss.spawnIndex - 1) : currentQuestionIndex;
    const targetBg = effectiveIndex < 5 ? background1 : (effectiveIndex < 10 ? background2 : background3);

    backgrounds.forEach(bg => {
        if (bg.isBg) {
            bg.img = targetBg;
        }
    });

    // Update Enemies (Stable removal using filter)
    enemies = enemies.filter(enemy => {
        // Horizontal Movement
        if (enemy.isFrozen) {
            enemy.x -= 0; // Stop horizontal approach relative to character
        } else {
            enemy.x -= enemy.speed;
        }

        // Forgiving Collision detection (using inner 60% of sprite)
        const pPadding = player.width * 0.2;
        const ePadding = enemy.width * 0.2;

        if (
            !player.isInvulnerable && !enemy.phasingOut &&
            player.x + pPadding < enemy.x + enemy.width - ePadding &&
            player.x + player.width - pPadding > enemy.x + ePadding &&
            player.y + pPadding < enemy.y + enemy.height - ePadding &&
            player.y + player.height - pPadding > enemy.y + ePadding
        ) {
            if (player.shieldActive) {
                player.shieldActive = false;
                player.isInvulnerable = true;
                player.dashTimer = 30; // Brief invun post-hit
                spawnDamageText(player.x, player.y, "SHIELD BROKEN!", "#4facfe");
                shakeScreen(15);
                soundManager.play('explosion'); // Audio (Shield break)
                spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#4facfe', 20);

                // Directional Knockback (Push AWAY from impact)
                const midPX = player.x + player.width / 2;
                const midPY = player.y + player.height / 2;
                const midEX = enemy.x + enemy.width / 2;
                const midEY = enemy.y + enemy.height / 2;

                const dx = midPX - midEX;
                const dy = midPY - midEY;

                if (Math.abs(dx) > Math.abs(dy)) {
                    // Impact from side: Push AWAY from enemy center
                    // If monster is on right (midEX > midPX), dx is negative, player.vx = -5 (Left)
                    player.vx = dx > 0 ? 5 : -5;
                } else {
                    // Impact from above/below
                    player.dy = dy > 0 ? 3 : -3;
                }

                return false; // Remove enemy on shield break for safety
            } else {
                handleGameOver();
            }
        }

        // Movement patterns for different enemy types
        const speedMod = enemy.isFrozen ? 0.3 : 1;
        if (enemy.freezeTimer > 0) {
            enemy.freezeTimer--;
            if (enemy.freezeTimer <= 0) enemy.isFrozen = false;
        }

        if (enemy.type === 'flyer') {
            // Sine wave movement
            if (!enemy.isFrozen) {
                enemy.phase += 0.08;
                enemy.y = enemy.baseY + Math.sin(enemy.phase) * 60;
            }
        } else if (enemy.type !== 'microbe' && enemy.type !== 'tank' && enemy.type !== 'splitter' && enemy.type !== 'bomber' && enemy.type !== 'mini') {
            // Original molecule movement
            if (!enemy.isFrozen) {
                enemy.phase += 0.05;
                enemy.y = enemy.baseY + Math.sin(enemy.phase) * (enemy.type === 'cytokine' ? 80 : 30);
            }

            // Extreme Hazard: Fire at player
            if (currentQuestionIndex >= 10 && Math.random() < 0.005) {
                enemyBullets.push({
                    x: enemy.x,
                    y: enemy.y + enemy.height / 2,
                    width: 15,
                    height: 15,
                    speed: -gameSpeed - 2,
                    dy: 0,
                    type: 'entropy'
                });
            }
        } else if (enemy.type === 'microbe' && currentQuestionIndex >= 10) {
            // Jumping Microbes logic
            if (!enemy.isFrozen) {
                if (!enemy.dy) enemy.dy = 0;
                if (!enemy.isGrounded) {
                    enemy.dy += 0.6;
                    enemy.y += enemy.dy;
                    if (enemy.y >= enemy.baseY) {
                        enemy.y = enemy.baseY;
                        enemy.dy = 0;
                        enemy.isGrounded = true;
                    }
                } else if (Math.random() < 0.01 && enemy.x < canvas.width * 0.8) {
                    enemy.dy = -12;
                    enemy.isGrounded = false;
                }
            }
        }

        // Update Phasing Out
        if (enemy.phasingOut) {
            enemy.opacity = (enemy.opacity || 1.0) - 0.05;
        }

        // Keep only if visible and on screen
        return (enemy.opacity === undefined || enemy.opacity > 0) && enemy.x + enemy.width > -200;
    });

    // Update Platforms
    let onPlatform = false;
    platforms = platforms.filter(p => {
        p.x -= gameSpeed;

        // Platform Collision (One-way: only land from top)
        const isDown = userControls.down.some(k => keys[k]);
        if (
            !isDown && // Fall through platforms when Down is pressed
            player.dy > 0 && // Only collide while falling
            player.x + player.width * 0.7 > p.x && // Slightly tighter collision
            player.x + player.width * 0.3 < p.x + p.width &&
            player.y + player.height > p.y &&
            player.y + player.height < p.y + p.height + player.dy + 2
        ) {
            player.y = p.y - player.height;
            player.dy = 0;
            player.isGrounded = true;
            player.platform = p;
            onPlatform = true;
        }

        return p.x + p.width > -200;
    });

    if (!onPlatform && player.platform) {
        player.isGrounded = false;
        player.platform = null;
    }

    // Spawn Quiz every 6000 units (roughly 30 seconds), ensuring at least 4000 units since the last one
    if (Math.floor(distance) % 6000 < gameSpeed && distance > 1000 && (distance - lastQuizDistance > 4000)) {
        if (currentQuestionIndex < questions.length) {
            lastQuizDistance = distance;
            startQuiz();
        } else if (!boss && hasSpawnedBossForCurrent) {
            // Victory only after 15th question AND final boss defeated
            gameState = 'victory';
            showUI('victory');
        }
    }

    spawnEnemy();
    spawnPlatform();
    spawnGunItem();
    spawnPowerup();
    updateBullets();
    updateBoss();
    updateWeather();
    updateCombo();
    updateHUD();

    // Track stats for achievements
    stats.totalDistance = Math.max(stats.totalDistance, Math.floor(distance));
    if (stats.totalDistance >= 10000) unlockAchievement('marathon');
}

function updateWeather() {
    // Spawn weather
    // Stage 3 starts at Question 10 (Bio Level)
    const isStage3 = currentQuestionIndex >= 10;
    // Increased rain chance from 0.2 to 0.35
    if (Math.random() < (isStage3 ? 0.05 : 0.35)) {
        weatherParticles.push({
            x: Math.random() * canvas.width,
            y: -20,
            vx: isStage3 ? (Math.random() - 0.5) * 2 : 1, // Wind
            vy: isStage3 ? 2 + Math.random() * 2 : 10 + Math.random() * 5,
            size: isStage3 ? 8 : 2,
            type: isStage3 ? 'leaf' : 'rain',
            angle: Math.random() * Math.PI * 2
        });
    }

    weatherParticles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.type === 'leaf') p.angle += 0.05;
        if (p.y > canvas.height) weatherParticles.splice(i, 1);
    });
}

function updateBoss() {
    if (!boss) {
        // Trigger boss every 5 questions
        if (currentQuestionIndex > 0 && currentQuestionIndex % 5 === 0 && !hasSpawnedBossForCurrent) {
            spawnBoss();
        } else if (currentQuestionIndex % 5 !== 0) {
            // Reset for next boss interval
            hasSpawnedBossForCurrent = false;
        }
        return;
    }

    // Move Boss
    if (boss.x > canvas.width * 0.7) {
        boss.x -= 2; // Entry
    } else {
        boss.phase += 0.02;
        boss.y = boss.baseY + Math.sin(boss.phase) * 100;

        // Decrement Attack Cooldown
        if (boss.attackCooldown > 0) boss.attackCooldown--;

        const hpPercent = boss.health / boss.maxHealth;
        // Basic Attack Logic: Reduced chances and added cooldown check
        const attackChance = hpPercent > 0.6 ? 0.02 : 0.04;
        if (Math.random() < attackChance && !boss.streamTimer && boss.attackCooldown <= 0) {
            const bul = {
                x: boss.x + boss.width / 2,
                y: boss.y + boss.height / 2,
                width: 15,
                height: 15,
                speed: -7 - (Math.random() * 3), // Faster, less drift
                dy: (Math.random() - 0.5) * 1.2, // Further reduced vertical spread for fairer patterns
                type: 'entropy'
            };

            // Boss 1: Rare Horizontal Missile (approx once every 10s at 60fps)
            if (boss.canShootDownMissile && Math.random() < 0.0016) {
                bul.type = 'missile';
                bul.speed = -12;
                bul.dy = 0;
                bul.width = 30; // Shortened for dodgeability
                bul.height = 15; // Slimmer for dodgeability
            }

            // Experimental Ingredients Attack: Molecule graphics at player
            if (boss.canShootMolecules) {
                const dx = (player.x + player.width / 2) - bul.x;
                const dy = (player.y + player.height / 2) - bul.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                bul.speed = (dx / dist) * 8;
                bul.dy = (dy / dist) * 8;
                bul.type = 'molecule';
                bul.moleculeType = Math.random() > 0.5 ? 'oxidant' : 'inflammatory';
            }

            enemyBullets.push(bul);
            boss.attackCooldown = 40 + Math.random() * 40; // Cooldown between ~0.6 and 1.3 seconds
        }

        // --- Rare Aimed Shot (Every 8-12 seconds) ---
        // Prevents safe spots at bottom of screen
        if (!boss.lastAimedShotTime) boss.lastAimedShotTime = Date.now();
        const nowTime = Date.now();
        if (nowTime - boss.lastAimedShotTime > 10000) {
            const dx = (player.x + player.width / 2) - (boss.x + boss.width / 2);
            const dy = (player.y + player.height / 2) - (boss.y + boss.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            enemyBullets.push({
                x: boss.x + boss.width / 2,
                y: boss.y + boss.height / 2,
                width: 12,
                height: 12,
                speed: (dx / dist) * 5, // Slower (was 7.5)
                dy: (dy / dist) * 5,    // Slower (was 7.5)
                type: 'entropy'
            });
            boss.lastAimedShotTime = nowTime;
            spawnDamageText(boss.x, boss.y - 30, "TAKE AIM!", "#ff0000", 16);
        }

        // Boss 2: Inflation Stream
        if (boss.canShootStream) {
            if (boss.streamTimer > 0) {
                boss.streamTimer--;
                if (boss.streamTimer % 3 === 0) {
                    enemyBullets.push({
                        x: boss.x + boss.width / 2,
                        y: boss.y + boss.height / 2,
                        width: 12,
                        height: 12,
                        speed: -10, // Horizontal only
                        dy: 0,
                        type: 'inflammation'
                    });
                    // Steam effect along the horizontal path
                    spawnParticles(boss.x - (60 - boss.streamTimer) * 10, boss.y + boss.height / 2, '#fff', 1, 'trail');
                }
            } else if (Math.random() < 0.005 && boss.attackCooldown <= 0) { // Reduced from 0.01 for better pacing
                boss.streamTimer = 60; // 1 second spray
                boss.attackCooldown = 120; // 2 second pause after a big stream
                spawnDamageText(boss.x, boss.y - 50, "INFLAMMATION SPRAY!", "#ff4500");
            }
        }
    }
}

function spawnBoss() {
    let bossType = 'sugar';
    let bossName = 'BIG SUGAR';
    let bossColor = '#ff4500'; // FD&C Red No. 40 (Orange-Red)
    let subName = '';

    if (currentQuestionIndex >= 15) {
        bossName = 'EXPERIMENTAL INGREDIENTS';
        bossColor = '#9b59b6'; // Purple
    } else if (currentQuestionIndex >= 10) {
        bossName = 'HYDROGENATED OILS';
        bossColor = '#ffa500'; // Orange/Gold for oil
    } else {
        subName = 'FD&C Red No. 40';
    }

    boss = {
        x: canvas.width + 200,
        y: canvas.height / 2 - 100,
        baseY: canvas.height / 2 - 100,
        width: 200,
        height: 200,
        health: 200 + (currentQuestionIndex * 35), // Buffed health scaling
        maxHealth: 200 + (currentQuestionIndex * 35),
        phase: 0,
        hitTimer: 0,
        type: bossType,
        name: bossName,
        subName: subName,
        color: bossColor,
        isSticky: false, // Hydrogenated Oils and Experimental Ingredients don't leave gum (User Request)
        canShootMolecules: (currentQuestionIndex >= 15),
        canShootDownMissile: (currentQuestionIndex < 10 || currentQuestionIndex >= 15), // Boss 3 can also shoot missiles
        canShootStream: (currentQuestionIndex >= 10 && currentQuestionIndex < 15),
        isBottle: (currentQuestionIndex >= 10 && currentQuestionIndex < 15),
        streamTimer: 0,
        attackCooldown: 0, // Pause between special attacks
        spawnIndex: currentQuestionIndex
    };
    hasSpawnedBossForCurrent = true;
    console.log(`Spawned Boss: ${bossName} at Q${currentQuestionIndex}`);
    spawnDamageText(canvas.width / 2, canvas.height / 2, `${bossName} APPROACHES!`, bossColor);
}


function spawnPowerup() {
    // Speed Boost: Increased frequency
    // Distance reduced from 3000 to 1500, chance increased
    if (distance - lastPowerupDistance > 1500 && Math.random() < 0.003) {
        powerups.push({
            x: canvas.width,
            y: canvas.height - 250 - Math.random() * 200,
            width: 35,
            height: 35,
            type: Math.random() > 0.5 ? 'speed' : 'shield' // Balanced 50/50
        });
        lastPowerupDistance = distance;
    }

    powerups = powerups.filter(pu => {
        pu.x -= gameSpeed;
        if (
            player.x < pu.x + pu.width &&
            player.x + player.width > pu.x &&
            player.y < pu.y + pu.height &&
            player.y + player.height > pu.y
        ) {
            if (pu.type === 'shield') {
                player.shieldActive = true;
                spawnDamageText(player.x, player.y, "SHIELD!", "#4facfe");
            } else {
                player.speedBoostTimer = 300; // 5 seconds
                distance += 500; // WARP: Skip distance to next question
                spawnDamageText(player.x, player.y, "BROCCOLI SPEED!", "#32cd32");
            }
            shakeScreen(5);
            soundManager.play('powerup'); // Audio
            spawnParticles(pu.x + pu.width / 2, pu.y + pu.height / 2, pu.type === 'shield' ? '#4facfe' : '#32cd32', 20);
            return false;
        }
        return pu.x + pu.width > 0;
    });
}


function spawnEnemy() {
    if (boss) return; // No regular enemies during boss

    // Progressive Difficulty: Update difficulty based on distance
    for (let i = DIFFICULTY_THRESHOLDS.length - 1; i >= 0; i--) {
        if (distance >= DIFFICULTY_THRESHOLDS[i]) {
            difficultyLevel = i + 1;
            break;
        }
    }

    // Spawn rate scales with difficulty
    const baseMinDist = fitnessLevel === 3 ? 150 : (fitnessLevel === 2 ? 250 : 400);
    const minSpawnDist = Math.max(100, baseMinDist - difficultyLevel * 20);

    if (distance - lastEnemySpawn > minSpawnDist + Math.random() * 300 && gameState === 'playing') {
        // Chance for a "Double Spawn" (scales with difficulty)
        const count = Math.random() < (0.2 + difficultyLevel * 0.05) ? 2 : 1;

        for (let i = 0; i < count; i++) {
            // Determine available enemy types based on distance
            const available = Object.entries(ENEMY_TYPES).filter(([_, cfg]) => distance >= cfg.unlockDist);
            const typeRoll = Math.random();
            let enemyType = 'microbe';

            // Weight towards newer enemy types as distance increases
            if (available.length > 1 && typeRoll > 0.4) {
                const candidates = available.slice(1); // Exclude microbe for variety
                enemyType = candidates[Math.floor(Math.random() * candidates.length)][0];
            }

            const cfg = ENEMY_TYPES[enemyType] || ENEMY_TYPES.microbe;
            let yPos = canvas.height - 180;

            // Flying enemies spawn higher
            if (enemyType === 'flyer') {
                yPos = canvas.height - 350 - Math.random() * 200;
            } else if (enemyType !== 'microbe') {
                yPos = canvas.height - 250 - Math.random() * 150;
            }

            const size = enemyType === 'tank' ? 80 : (enemyType === 'microbe' ? 60 : 50);

            enemies.push({
                x: canvas.width + 100 + (i * 80),
                y: yPos,
                baseY: yPos,
                width: size,
                height: size,
                type: enemyType,
                speed: gameSpeed * cfg.speed * (1 + difficultyLevel * 0.1),
                phase: Math.random() * Math.PI * 2,
                health: cfg.health + Math.floor(difficultyLevel / 2), // Scale HP with difficulty
                hitTimer: 0,
                isFrozen: false,
                freezeTimer: 0
            });
        }

        lastEnemySpawn = distance;
    }
}

// Helper: Spawn mini enemy from Splitter
function spawnMiniEnemy(x, y) {
    enemies.push({
        x: x,
        y: y,
        baseY: y,
        width: 30,
        height: 30,
        type: 'mini',
        speed: gameSpeed * 1.5,
        phase: Math.random() * Math.PI * 2,
        health: 2,
        hitTimer: 0
    });
}

// Helper: Create explosion from Bomber
function createExplosion(x, y) {
    const radius = 80;
    spawnParticles(x, y, '#ff4500', 20);
    shakeScreen(10);
    soundManager.play('explosion');

    // Check if player is in explosion radius
    const dx = (player.x + player.width / 2) - x;
    const dy = (player.y + player.height / 2) - y;
    if (Math.sqrt(dx * dx + dy * dy) < radius && !player.isInvulnerable) {
        if (player.shieldActive) {
            player.shieldActive = false;
            spawnDamageText(player.x, player.y, "SHIELD BROKEN!", "#4facfe");
        } else {
            handleGameOver();
        }
    }
}

// Helper: Unlock Achievement
function unlockAchievement(id) {
    if (ACHIEVEMENTS[id] && !ACHIEVEMENTS[id].unlocked) {
        ACHIEVEMENTS[id].unlocked = true;
        achievementToasts.push({
            text: `🏆 ${ACHIEVEMENTS[id].name}`,
            timer: 180 // 3 seconds
        });
        soundManager.play('powerup');
        saveProgress();
    }
}

// Helper: Update Combo Timer
function updateCombo() {
    if (combo.timer > 0) {
        combo.timer--;
        if (combo.timer === 0) {
            combo.count = 0;
            combo.multiplier = 1;
        }
    }

    // Update difficulty-based music intensity
    if (boss) {
        musicIntensity = 'boss';
    } else if (combo.count >= 5) {
        musicIntensity = 'action';
    } else {
        musicIntensity = 'calm';
    }
}

// Save/Load Progress
function saveProgress() {
    const data = {
        stats: stats,
        achievements: ACHIEVEMENTS,
        currentSkin: currentSkin,
        deaths: deaths,
        sfxVolume: sfxVolume,
        musicVolume: musicVolume,
        dailyChallengeComplete: dailyChallenge?.completed || false,
        dailyChallengeDate: new Date().toDateString()
    };
    localStorage.setItem('sodaHealthProgress', JSON.stringify(data));
}

function loadProgress() {
    const saved = localStorage.getItem('sodaHealthProgress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            Object.assign(stats, data.stats || {});
            Object.entries(data.achievements || {}).forEach(([k, v]) => {
                if (ACHIEVEMENTS[k]) ACHIEVEMENTS[k].unlocked = v.unlocked;
            });
            currentSkin = data.currentSkin || 'default';
            deaths = data.deaths || 0;
            sfxVolume = data.sfxVolume ?? 1.0;
            musicVolume = data.musicVolume ?? 1.0;

            // Check if daily challenge was completed today
            if (data.dailyChallengeDate === new Date().toDateString()) {
                if (dailyChallenge) dailyChallenge.completed = data.dailyChallengeComplete;
            }
        } catch (e) {
            console.error('Failed to load progress:', e);
        }
    }

    // Check skin unlocks
    checkSkinUnlocks();

    // Initialize daily challenge
    initDailyChallenge();
}

// Check and unlock skins based on conditions
function checkSkinUnlocks() {
    if (stats.totalDistance >= 5000 && !SKINS.golden.unlocked) {
        SKINS.golden.unlocked = true;
        achievementToasts.push({ text: '🎨 New Skin: GOLDEN!', timer: 300 });
    }
    if (stats.bossesKilled >= 10 && !SKINS.neon.unlocked) {
        SKINS.neon.unlocked = true;
        achievementToasts.push({ text: '🎨 New Skin: NEON!', timer: 300 });
    }
    if (deaths >= 50 && !SKINS.ghost.unlocked) {
        SKINS.ghost.unlocked = true;
        achievementToasts.push({ text: '🎨 New Skin: GHOST!', timer: 300 });
    }
    // Champion skin: all achievements
    const allUnlocked = Object.values(ACHIEVEMENTS).every(a => a.unlocked);
    if (allUnlocked && !SKINS.champion.unlocked) {
        SKINS.champion.unlocked = true;
        achievementToasts.push({ text: '🎨 New Skin: CHAMPION!', timer: 300 });
    }
}

// Cycle through unlocked skins (press K)
function cycleSkin() {
    const unlockedSkins = Object.entries(SKINS).filter(([_, s]) => s.unlocked).map(([k]) => k);
    const currentIndex = unlockedSkins.indexOf(currentSkin);
    const nextIndex = (currentIndex + 1) % unlockedSkins.length;
    currentSkin = unlockedSkins[nextIndex];
    spawnDamageText(player.x, player.y, `Skin: ${SKINS[currentSkin].name}`, '#ffd700');
    saveProgress();
}

// Initialize Daily Challenge based on date
function initDailyChallenge() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const modifierIndex = seed % DAILY_MODIFIERS.length;

    dailyChallenge = {
        name: DAILY_MODIFIERS[modifierIndex].name,
        effect: DAILY_MODIFIERS[modifierIndex].effect,
        completed: false,
        reward: Object.keys(SKINS)[seed % Object.keys(SKINS).length] // Random skin hint
    };

    console.log(`Daily Challenge: ${dailyChallenge.name}`);
}

// Apply daily challenge modifier (press P)
function toggleDailyChallenge() {
    if (!dailyChallenge) return;
    if (dailyChallenge.active) {
        // Reset game speed if it was modified
        gameSpeed = 3;
        dailyChallenge.active = false;
        spawnDamageText(player.x, player.y, "Daily OFF", "#ff6b6b");
    } else {
        dailyChallenge.effect();
        dailyChallenge.active = true;
        spawnDamageText(player.x, player.y, `Daily: ${dailyChallenge.name}!`, "#ffd700");
    }
}

function spawnGunItem() {
    // Weighted spawn for weapon tiers
    if (!gunItem && Math.random() < 0.007 && distance > 500) {
        // Increase variety: lower weight for laser after 1000m. Prevent direct duplicates.
        let pool = distance > 1000 ? ['plasma', 'spray', 'rail', 'plasma', 'spray', 'rail', 'laser'] : ['laser', 'plasma', 'spray', 'rail'];
        // Filter out the last spawned type to ensure variety
        if (lastSpawnedType) {
            pool = pool.filter(t => t !== lastSpawnedType);
        }
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        lastSpawnedType = chosen;

        gunItem = {
            x: canvas.width,
            y: canvas.height - 250 - Math.random() * 150,
            width: 45, // Slimmer (was 50)
            height: 35, // Slimmer (was 40)
            weaponType: chosen,
            color: WEAPONS[chosen].color,
            isSpecial: true
        };
    }

    if (gunItem) {
        gunItem.x -= gameSpeed;
        if (
            player.x < gunItem.x + gunItem.width &&
            player.x + player.width > gunItem.x &&
            player.y < gunItem.y + gunItem.height &&
            player.y + player.height > gunItem.y
        ) {
            const pickedType = gunItem.weaponType;
            if (pickedType === currentWeapon && player.gunLevel > 0) {
                weaponTier = Math.min(4, weaponTier + 1);
                spawnDamageText(player.x, player.y, `TIER UP: ${weaponTier}/4`, WEAPONS[pickedType].color);
            } else {
                currentWeapon = pickedType;
                weaponTier = 1;
                player.gunLevel = 1; // Enable shooting
                spawnDamageText(player.x, player.y, `${WEAPONS[pickedType].name} EQUIP!`, WEAPONS[pickedType].color);
            }
            fireCooldown = 0; // Immediate fire
            soundManager.play('powerup');
            gunItem = null;
        }
        else if (gunItem.x + gunItem.width < 0) {
            gunItem = null;
        }
    }
}


function updateBullets() {
    // 1. Update positions
    if (bullets.length > 0) {
        bullets = bullets.filter(b => {
            if (b.type === 'pellet') {
                b.life--;
                if (b.life < 40) {
                    b.speed *= 0.9;
                    b.dy = (b.dy || 0) - 0.3;
                    if (Math.random() < 0.2) {
                        spawnParticles(b.x, b.y, '#ffd700', 1, 'trail');
                    }
                }
                b.x += b.speed;
                b.y += (b.dy || 0);
                return b.life > 0;
            } else if (b.type === 'homing') {
                // Find nearest enemy
                if (!b.target || b.target.health <= 0) {
                    let minDist = Infinity;
                    enemies.forEach(e => {
                        if (e.phasingOut) return;
                        const dx = e.x - b.x;
                        const dy = e.y - b.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < minDist) {
                            minDist = dist;
                            b.target = e;
                        }
                    });
                }
                if (b.target) {
                    const dx = b.target.x + b.target.width / 2 - b.x;
                    const dy = b.target.y + b.target.height / 2 - b.y;
                    const angle = Math.atan2(dy, dx);
                    b.dy = b.dy * 0.9 + Math.sin(angle) * 2;
                    b.speed = Math.min(12, b.speed + 0.2);
                }
                b.x += b.speed;
                b.y += (b.dy || 0);
                spawnParticles(b.x, b.y, '#9b59b6', 1, 'trail');
                return b.x < canvas.width && b.x > 0;
            } else if (b.type === 'beam') {
                b.life--;
                return b.life > 0;
            } else if (b.type === 'spread' || b.type === 'freeze') {
                b.x += b.speed;
                b.y += (b.dy || 0);
                return b.x < canvas.width;
            } else {
                b.x += b.speed;
                return b.x < canvas.width;
            }
        });
    }

    if (enemyBullets.length > 0) {
        enemyBullets = enemyBullets.filter(eb => {
            eb.x += eb.speed;
            eb.y += (eb.dy || 0);
            // Check player collision
            if (
                !player.isInvulnerable &&
                eb.x < player.x + player.width &&
                eb.x + eb.width > player.x &&
                eb.y < player.y + player.height &&
                eb.y + eb.height > player.y
            ) {
                if (player.shieldActive) {
                    player.shieldActive = false;
                    player.isInvulnerable = true;
                    player.isInvulnerable = true;
                    player.dashTimer = 30;
                    spawnDamageText(player.x, player.y, "SHIELD BROKEN!", "#4facfe");
                    shakeScreen(15);
                    spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#4facfe', 20);

                    // Bullet Knockback: Always push LEFT (Away from projectile trajectory)
                    player.vx = -4;
                    player.dy = -2;

                    return false;
                } else {
                    handleGameOver();
                    return false;
                }
            }
            return eb.x + eb.width > 0;
        });
    }

    // 2. Collision detection
    if (bullets.length === 0 || (enemies.length === 0 && !boss)) {
        // Still update hit timers even if no bullets
        enemies.forEach(e => {
            if (e.hitTimer > 0) e.hitTimer--;
        });
        return;
    }

    const hitBullets = new Set();
    const hitEnemies = new Set();

    for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i];
        for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (hitEnemies.has(j) || e.phasingOut) continue;

            if (
                b.x < e.x + e.width &&
                b.x + b.width > e.x &&
                b.y < e.y + e.height &&
                b.y + b.height > e.y
            ) {
                // Pierce logic: rail and beam pierce, others don't
                if (b.type === 'rail') {
                    // Check if we already hit this specific enemy instance
                    if (b.hitHistory && b.hitHistory.includes(e)) continue;

                    if (b.pierceCount <= 0) {
                        hitBullets.add(i);
                    } else {
                        b.pierceCount--;
                        if (b.hitHistory) b.hitHistory.push(e);
                    }
                } else if (b.type !== 'beam') {
                    hitBullets.add(i);
                }

                // Damage Logic
                let damage = b.damage || 1;
                if (b.type === 'rail') damage = 14; // Tuned: beats Oxidants (10) but Tank (15) remains as per User Request
                else if (b.type === 'plasma') damage = 12; // Beats Oxidant (10) in 1 shot
                else if (b.type === 'laser') damage = 3;
                else if (b.type === 'pellet') damage = 2;
                else if (b.type === 'spread') damage = 3; // Buffed from 2
                else if (b.type === 'homing') damage = 4;
                else if (b.type === 'freeze') damage = 4; // Buffed from 1 (User Request)
                else if (b.type === 'beam') damage = 0.5;

                // Freeze effect
                if (b.type === 'freeze') {
                    e.isFrozen = true;
                    e.freezeTimer = 180; // 3 seconds frozen
                    spawnParticles(e.x + e.width / 2, e.y + e.height / 2, '#00ffff', 5);
                }

                e.health -= damage;
                e.hitTimer = 10;
                const isMolecule = e.type !== 'microbe';
                spawnDamageText(e.x + e.width / 2, e.y, `-${damage}`, damage >= 6 ? '#ff8c00' : '#ff0000', isMolecule ? 14 : 20);
                soundManager.play('hit');

                if (e.health <= 0) {
                    hitEnemies.add(j);
                    const splatColor = ENEMY_TYPES[e.type]?.color || '#39ff14';
                    spawnParticles(e.x + e.width / 2, e.y + e.height / 2, splatColor, 8);

                    // Combo System
                    combo.count++;
                    combo.timer = combo.maxTimer;
                    combo.multiplier = Math.min(10, 1 + Math.floor(combo.count / 3));
                    if (combo.count > combo.bestCombo) combo.bestCombo = combo.count;

                    // Stats & Achievements
                    stats.enemiesKilled++;
                    if (stats.enemiesKilled === 1) unlockAchievement('firstBlood');
                    if (combo.count >= 10) unlockAchievement('comboKing');

                    // Score with multiplier
                    score += 100 * combo.multiplier;

                    // Splitter: spawn 2 mini enemies
                    if (e.type === 'splitter') {
                        spawnMiniEnemy(e.x, e.y - 20);
                        spawnMiniEnemy(e.x, e.y + 20);
                    }

                    // Bomber: create damage zone
                    if (e.type === 'bomber') {
                        createExplosion(e.x + e.width / 2, e.y + e.height / 2);
                    }
                }

                // If it's a rail shot, we don't break; we continue through other enemies
                // Rail pierces until pierceCount is exhausted
                if (b.type !== 'rail' || hitBullets.has(i)) break;
            }
        }

        // Consolidated Interception Logic (Plasma + Standard vs Missiles)
        const iPadding = (b.type === 'plasma') ? b.width * 0.3 : 0; // 30% padding for Plasma "eat" zone
        for (let k = enemyBullets.length - 1; k >= 0; k--) {
            const eb = enemyBullets[k];
            if (
                b.x - iPadding < eb.x + eb.width &&
                b.x + b.width + iPadding > eb.x &&
                b.y - iPadding < eb.y + eb.height &&
                b.y + b.height + iPadding > eb.y
            ) {
                // Plasma eats EVERYTHING and persists
                if (b.type === 'plasma') {
                    enemyBullets.splice(k, 1);
                    spawnParticles(eb.x, eb.y, '#ff4500', 5);
                    spawnDamageText(eb.x, eb.y, "EATEN!", "#ff8c00", 12);
                }
                // Other bullets (except beam) can destroy missiles but are consumed
                else if (b.type !== 'beam' && eb.type === 'missile') {
                    hitBullets.add(i);
                    enemyBullets.splice(k, 1);
                    spawnParticles(eb.x, eb.y, '#ff4500', 10);
                    spawnDamageText(eb.x, eb.y, "DESTROYED!", "#ff4500", 12);
                    break; // Bullet is gone, stop checking other enemy bullets
                }
            }
        }

        // Boss Collision
        if (boss && !hitBullets.has(i)) {
            if (
                b.x < boss.x + boss.width &&
                b.x + b.width > boss.x &&
                b.y < boss.y + boss.height &&
                b.y + boss.height > boss.y
            ) {
                if (b.type === 'rail') {
                    if (b.hitHistory && b.hitHistory.includes(boss)) return; // Don't multi-hit boss same bullet
                    if (b.hitHistory) b.hitHistory.push(boss);
                } else {
                    hitBullets.add(i);
                }

                let damage = 1;
                if (b.type === 'rail') damage = 12; // Rail does extra to boss
                else if (b.type === 'plasma') damage = 8;
                else if (b.type === 'laser') damage = 4;
                else if (b.type === 'pellet') damage = 3;

                boss.health -= damage;
                boss.hitTimer = 10;
                spawnDamageText(boss.x + boss.width / 2, boss.y, `-${damage}`, '#ff00ff');

                if (boss.health <= 0) {
                    spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, boss.color, 50);
                    spawnDamageText(boss.x, boss.y, "CRITICAL DETOX!", "#39ff14");

                    // Level 2 Special: Spawn many small sticky gums
                    if (boss.isSticky) {
                        for (let i = 0; i < 15; i++) {
                            const rx = boss.x + (Math.random() - 0.5) * boss.width;
                            const ry = boss.y + (Math.random() - 0.5) * boss.height;
                            spawnMiniEnemy(rx, ry);
                        }
                    }

                    boss = null;
                    shakeScreen(20);
                    soundManager.play('explosion');

                    // Stats & Achievements
                    stats.bossesKilled++;
                    if (stats.bossesKilled >= 5) unlockAchievement('bossSlayer');

                    // Big score bonus
                    score += 1000 * combo.multiplier;
                    musicIntensity = 'action';
                    return;
                }
            }
        }
    }

    // Removal pass handled at end of function
    // (Redundant loop removed)

    // 4. Apply removals
    if (hitBullets.size > 0) bullets = bullets.filter((_, i) => !hitBullets.has(i));
    if (hitEnemies.size > 0) enemies = enemies.filter((_, i) => !hitEnemies.has(i));

    // Update hit timers
    enemies.forEach(e => {
        if (e.hitTimer > 0) e.hitTimer--;
    });
}

function spawnPlatform() {
    const timeSinceLast = distance - lastPlatformSpawn;
    if (timeSinceLast > minPlatformDistance && Math.random() < 0.05 && gameState === 'playing') {
        const width = 150 + Math.random() * 100;
        const h = 25; // Slightly thicker
        // Lower platforms for easier jumping (Stage 1 can jump ~150-200px)
        const y = canvas.height - 250 - Math.random() * 150;

        platforms.push({
            x: canvas.width + 100,
            y: y,
            width: width,
            height: h,
            speed: gameSpeed
        });
        lastPlatformSpawn = distance;
    }
}

// --- Visual Juice Helpers ---
function spawnParticles(x, y, color, count = 10, type = 'splat') {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * (type === 'trail' ? 2 : 10),
            vy: (Math.random() - 0.5) * (type === 'trail' ? 2 : 10),
            size: Math.random() * (type === 'trail' ? 3 : 5) + 2,
            color: color,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02,
            gravity: type === 'splat' ? 0.3 : 0
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles(ctx) {
    ctx.save();
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function spawnDamageText(x, y, text, color = '#ff0000', size = 20) {
    damageTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        life: 1.0,
        vy: -2,
        size: size
    });
}

function updateDamageTexts() {
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        const dt = damageTexts[i];
        dt.y += dt.vy;
        dt.life -= 0.02;
        if (dt.life <= 0) damageTexts.splice(i, 1);
    }
}

function drawDamageTexts(ctx) {
    ctx.save();
    damageTexts.forEach(dt => {
        ctx.globalAlpha = dt.life;
        ctx.fillStyle = dt.color;
        // Optimization: Removed shadowBlur
        ctx.font = `bold ${dt.size || 20}px Courier New`;
        ctx.textAlign = 'center';
        ctx.fillText(dt.text, dt.x, dt.y);
    });
    ctx.restore();
}

function shakeScreen(amount) {
    if (isNaN(amount)) return;
    shakeAmount = Math.max(shakeAmount, amount);
}



function drawPowerup(ctx, pu) {
    ctx.save();
    const isShield = pu.type === 'shield';

    if (pu.type === 'speed') {
        // Detailed Broccoli Icon (Formerly Shield)
        const cx = pu.x + pu.width / 2;
        const cy = pu.y + pu.height / 2;

        // Stem with branching detail
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(cx - 3, cy, 6, 12);

        // Minor side branch
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy + 4);
        ctx.lineTo(cx - 8, cy - 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#8b4513';
        ctx.stroke();

        // High-Detail Florets (Layered clusters)
        const floretColors = ['#1e5d1e', '#228b22', '#32cd32', '#90ee90'];

        // Base Layer (Darker)
        floretColors.forEach((color, idx) => {
            ctx.fillStyle = color;
            const rowCount = 3 + idx;
            for (let i = 0; i < rowCount; i++) {
                const ang = (i / rowCount) * Math.PI * 2 + (idx * 0.5);
                const dist = 6 + idx * 2;
                const rx = cx + Math.cos(ang) * dist;
                const ry = cy - 6 + Math.sin(ang) * (dist * 0.5);
                ctx.beginPath();
                ctx.arc(rx, ry, 10 - idx * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Highlights/Texture (Tiny dots for "grain")
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let i = 0; i < 15; i++) {
            const tx = cx + (Math.random() - 0.5) * 25;
            const ty = cy - 10 + (Math.random() - 0.5) * 15;
            ctx.beginPath();
            ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

    } else {
        // Draw Blueberries (Shield)
        const cx = pu.x + pu.width / 2;
        const cy = pu.y + pu.height / 2;

        // Cluster of berries
        const berryOffsets = [
            { x: -6, y: -6 }, { x: 6, y: -6 },
            { x: -6, y: 6 }, { x: 6, y: 6 },
            { x: 0, y: 0 }
        ];

        berryOffsets.forEach(off => {
            ctx.beginPath();
            ctx.arc(cx + off.x, cy + off.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#4facfe'; // Blueberry Blue
            ctx.fill();
            // Shine
            ctx.beginPath();
            ctx.arc(cx + off.x - 2, cy + off.y - 2, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fill();
        });
    }

    // Label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Courier New'; // Increased size
    ctx.textAlign = 'center';
    ctx.fillText(isShield ? "SHIELD" : "SPEED", pu.x + pu.width / 2, pu.y - 12);

    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Screen Shake
    if (shakeAmount > 0.1) {
        const sx = (Math.random() - 0.5) * shakeAmount;
        const sy = (Math.random() - 0.5) * shakeAmount;
        ctx.translate(sx, sy);
    }

    // Draw Backgrounds
    backgrounds.forEach(bg => {
        if (bg.isBg && bg.img) {
            ctx.drawImage(bg.img, bg.x, 0, canvas.width, canvas.height);
        }
    });


    // 2. Copyright Patch (Drawn as part of background so actors stay in front)
    backgrounds.forEach(bg => {
        // Updated Logic: Show only in Level 1 (Fast Food)
        if (bg.img === background1 && currentQuestionIndex < 5) {
            const patchX = bg.x + (canvas.width * 0.07);
            const patchY = canvas.height * 0.63;
            const patchW = canvas.width * 0.16;
            const patchH = canvas.height * 0.06;

            if (patchX + patchW > 0 && patchX < canvas.width) {
                ctx.fillStyle = '#1c1c1c';
                ctx.fillRect(patchX, patchY, patchW, patchH);
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#39ff14';
                ctx.fillStyle = '#39ff14';
                ctx.font = 'bold 15px Courier New';
                ctx.textAlign = 'center';
                ctx.fillText("NEON NIBBLES", patchX + patchW / 2, patchY + patchH / 2 + 5);
                ctx.shadowBlur = 0;
            }
        }
    });

    // Draw Boss
    if (boss) {
        ctx.save();
        // Hit effect removed by request to prevent freeze

        const centerX = boss.x + boss.width / 2;
        const centerY = boss.y + boss.height / 2;

        // Basic Boss Rendering (Reverted)

        // Body
        if (boss.isBottle) {
            // Draw Bottle Appearance (Hydrogenated Oils)
            const bX = centerX - boss.width * 0.3;
            const bY = boss.y;
            const bW = boss.width * 0.6;
            const bH = boss.height;

            // Bottle Body
            ctx.fillStyle = boss.color;
            ctx.beginPath();
            ctx.roundRect(bX, bY + 40, bW, bH - 40, 10);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Bottle Neck
            ctx.fillStyle = boss.color;
            ctx.fillRect(centerX - 20, bY + 10, 40, 30);
            ctx.strokeRect(centerX - 20, bY + 10, 40, 30);

            // Cap
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(centerX - 25, bY, 50, 15);

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Courier New'; // Smaller font for longer text
            ctx.textAlign = 'center';
            ctx.fillText("HYDROGENATED", centerX, bY + bH * 0.65);
            ctx.fillText("OILS", centerX, bY + bH * 0.75);
        } else {
            const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, boss.width / 2);
            grad.addColorStop(0, boss.color);
            grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, boss.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // Sub-text for BIG SUGAR
        if (boss.subName) {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.font = 'italic 18px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(`"${boss.subName}"`, centerX, boss.y + boss.height + 40);
        } else {
            // Main Boss Name Display (User Request for Boss 3)
            ctx.fillStyle = boss.color;
            ctx.font = 'bold 22px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(boss.name, centerX, boss.y + boss.height + 40);
        }

        // Simple Spikes
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const ang = (i * Math.PI * 2) / 12 + boss.phase;
            const ox = centerX + (boss.width / 2) * Math.cos(ang);
            const oy = centerY + (boss.width / 2) * Math.sin(ang);
            const ex = centerX + (boss.width * 0.8) * Math.cos(ang);
            const ey = centerY + (boss.width * 0.8) * Math.sin(ang);
            ctx.moveTo(ox, oy);
            ctx.lineTo(ex, ey);
        }
        ctx.stroke();

        // Boss Health Bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(centerX - 100, boss.y - 40, 200, 15);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(centerX - 100, boss.y - 30, 200 * (boss.health / boss.maxHealth), 15);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - 100, boss.y - 30, 200, 15);

        ctx.restore();
    }

    // Draw Enemies
    enemies.forEach(enemy => {
        if (enemy.opacity <= 0) return;
        ctx.save();
        if (enemy.phasingOut) ctx.globalAlpha = enemy.opacity;
        if (enemy.isFrozen) ctx.filter = 'hue-rotate(180deg) saturate(0.5)';
        if (enemy.hitTimer > 0) {
            ctx.filter = 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)';
        }

        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height / 2;
        const cfg = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.microbe;

        if (enemy.type === 'microbe') {
            if (microbeImg.complete && microbeImg.naturalWidth > 0) {
                const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.05;
                const pw = enemy.width * pulse;
                const ph = enemy.height * pulse;
                ctx.drawImage(microbeImg, enemy.x - (pw - enemy.width) / 2, enemy.y - (ph - enemy.height) / 2, pw, ph);
            } else {
                ctx.fillStyle = cfg.color;
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }
        } else if (enemy.type === 'flyer') {
            // Flying enemy: Wings + Core
            ctx.fillStyle = cfg.color;
            ctx.beginPath();
            ctx.ellipse(cx, cy, enemy.width / 2, enemy.height / 3, 0, 0, Math.PI * 2);
            ctx.fill();
            // Wings
            const wingFlap = Math.sin(Date.now() * 0.02) * 15;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy);
            ctx.lineTo(cx - 30, cy - 20 + wingFlap);
            ctx.lineTo(cx - 30, cy + 10 + wingFlap);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 10, cy);
            ctx.lineTo(cx + 30, cy - 20 - wingFlap);
            ctx.lineTo(cx + 30, cy + 10 - wingFlap);
            ctx.closePath();
            ctx.fill();
            // Eye
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(cx + 5, cy - 5, 5, 0, Math.PI * 2);
            ctx.fill();
            // Label
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText("FRUCTOSE", cx, cy + 25);
        } else if (enemy.type === 'tank') {
            // Heavy armored enemy
            ctx.fillStyle = cfg.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            // Armor plates
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 4;
            ctx.strokeRect(enemy.x + 5, enemy.y + 5, enemy.width - 10, enemy.height - 10);
            ctx.strokeRect(enemy.x + 15, enemy.y + 15, enemy.width - 30, enemy.height - 30);
            // Shield icon
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 20px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('🛡️', cx, cy + 8);
            // Label
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Courier New';
            ctx.fillText("TRANS FAT", cx, enemy.y + enemy.height + 12);
        } else if (enemy.type === 'splitter') {
            // Blobby enemy that splits
            ctx.fillStyle = cfg.color;
            ctx.beginPath();
            const wobble = Math.sin(Date.now() * 0.01) * 3;
            ctx.arc(cx, cy, enemy.width / 2 + wobble, 0, Math.PI * 2);
            ctx.fill();
            // Inner blobs
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(cx - 8, cy - 5, 8, 0, Math.PI * 2);
            ctx.arc(cx + 8, cy + 5, 8, 0, Math.PI * 2);
            ctx.fill();
            // Label
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText("sticky gum", cx, cy + 30);
        } else if (enemy.type === 'bomber') {
            // Explosive enemy
            ctx.fillStyle = cfg.color;
            ctx.beginPath();
            ctx.arc(cx, cy, enemy.width / 2, 0, Math.PI * 2);
            ctx.fill();
            // Fuse
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx, cy - enemy.height / 2);
            ctx.lineTo(cx, cy - enemy.height / 2 - 15);
            ctx.stroke();
            // Spark
            if (Date.now() % 500 < 250) {
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(cx, cy - enemy.height / 2 - 18, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            // Danger icon
            ctx.fillStyle = 'black';
            ctx.font = 'bold 16px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('💣', cx, cy + 6);
            // Label
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Courier New';
            ctx.fillText("ALCOHOL", cx, cy + 30);
        } else if (enemy.type === 'mini') {
            // Mini splitter offspring
            ctx.fillStyle = '#ff69b4';
            ctx.beginPath();
            ctx.arc(cx, cy, enemy.width / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Default: molecule types
            drawMolecule(ctx, enemy.x, enemy.y, enemy.width, enemy.type, enemy.phasingOut ? enemy.opacity : 1.0);
        }
        ctx.restore();
    });

    // Draw Active Bullets
    bullets.forEach(b => {
        drawBullet(ctx, b);
    });

    // Draw Enemy Bullets
    enemyBullets.forEach(eb => {
        drawBullet(ctx, eb);
    });

    // --- Visual Juice Layer ---
    drawParticles(ctx);
    drawDamageTexts(ctx);

    // Draw Weather
    ctx.save();
    weatherParticles.forEach(p => {
        if (p.type === 'rain') {
            ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx, p.y + 5);
            ctx.stroke();
        } else {
            // Leaf
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset for next particle
        }
    });
    ctx.restore();

    // Draw Powerups
    powerups.forEach(pu => {
        drawPowerup(ctx, pu);
    });

    // Draw Gun Item Pickup
    if (gunItem) {
        const wpnData = WEAPONS[gunItem.weaponType] || WEAPONS.laser;
        ctx.save();

        // REVERTED: Slimmer, cleaner box
        ctx.fillStyle = wpnData.color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(gunItem.x, gunItem.y, gunItem.width, gunItem.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(gunItem.x, gunItem.y, gunItem.width, gunItem.height);

        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = wpnData.color;

        // Small icon inside
        let visualLvl = 1;
        if (gunItem.weaponType === 'plasma') visualLvl = 2;
        if (gunItem.weaponType === 'rail') visualLvl = 3;
        if (gunItem.weaponType === 'spray') visualLvl = 4;
        drawGun(ctx, gunItem.x + 5, gunItem.y + 10, gunItem.width - 10, gunItem.height - 20, visualLvl);

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Courier New'; // Revert font size
        ctx.textAlign = 'center';
        ctx.fillText(wpnData.name, gunItem.x + gunItem.width / 2, gunItem.y - 12);
        ctx.restore();
    }

    // Draw Platforms
    platforms.forEach(p => {
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        grad.addColorStop(0, '#555');
        grad.addColorStop(0.3, '#ddd');
        grad.addColorStop(0.7, '#888');
        grad.addColorStop(1, '#333');

        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
    });

    // Draw Player (In Front)
    const currentImg = playerImg;
    const isLvl2 = player.gunLevel === 2;

    // Boundary safety: keep player on screen
    const safeY = Math.min(Math.max(player.y, 0), canvas.height - player.height);
    const safeX = Math.min(Math.max(player.x, 0), canvas.width - player.width);

    const spriteW = currentImg.naturalWidth ? currentImg.naturalWidth / 4 : 250;
    const spriteH = currentImg.naturalHeight ? currentImg.naturalHeight / 3 : 250;

    // Head clearance upgrade: 10% offset (further lowering the selection from the file)
    const labelOffset = spriteH * 0.10;

    const animFrame = Math.floor(Date.now() / 220) % 4;

    if (currentImg.complete && currentImg.naturalWidth > 0) {
        ctx.save();

        // Squash & Stretch Transform
        ctx.translate(player.x + player.width / 2, player.y + player.height);
        ctx.scale(player.scaleX, player.scaleY);
        ctx.translate(-(player.x + player.width / 2), -(player.y + player.height));

        // Apply skin hue rotation
        const skinHue = SKINS[currentSkin]?.hue || 0;
        if (skinHue !== 0) {
            ctx.filter = `hue-rotate(${skinHue}deg)`;
        }

        if (player.dashTimer > 0) {
            ctx.globalAlpha = 0.6;
        }
        ctx.drawImage(
            currentImg,
            animFrame * spriteW, (fitnessLevel - 1) * spriteH + labelOffset, spriteW, spriteH - labelOffset,
            safeX, safeY, player.width, player.height
        );
        ctx.restore();
    }

    // Shield Visual (Blueberries Theme)
    if (player.shieldActive) {
        ctx.strokeStyle = '#4facfe';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const rad = player.width * 0.7;
        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;

        // Bumpy perimeter
        for (let a = 0; a < Math.PI * 2; a += 0.2) {
            const bump = Math.sin(a * 10) * 5;
            const px = cx + (rad + bump) * Math.cos(a);
            const py = cy + (rad + bump) * Math.sin(a);
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = 'rgba(79, 172, 254, 0.15)';
        ctx.fill();
    }

    if (player.gunLevel > 0) {
        const gunX = player.x + player.width * 0.4;
        const gunY = player.y + player.height * 0.45;

        let visualLvl = 1;
        if (currentWeapon === 'plasma') visualLvl = 2;
        if (currentWeapon === 'rail') visualLvl = 3;
        if (currentWeapon === 'spray') visualLvl = 4;

        drawGun(ctx, gunX, gunY, 60, 30, visualLvl);

        // Muzzle Flash
        if (player.muzzleTimer > 0) {
            ctx.save();
            ctx.translate(gunX + 60, gunY + 15); // End of gun
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            const size = 15 + Math.random() * 10;
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Gun Tutorial Message
    if (gunTutorialTimer > 0) {
        ctx.save();
        const gunName = WEAPONS[currentWeapon].name;
        const msg = `${gunName} ACQUIRED!`;
        const subMsg = currentWeapon === 'spray' ? "YELLOW SPRAYER" : (currentWeapon === 'plasma' ? "SLOW BUT POWERFUL" : "NEW WEAPON ACQUIRED!");

        ctx.fillStyle = WEAPONS[currentWeapon].color + '33'; // 20% alpha
        ctx.fillRect(0, canvas.height / 2 - 100, canvas.width, 100);

        ctx.fillStyle = WEAPONS[currentWeapon].color;
        ctx.font = 'bold 30px Courier New';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillText(msg, canvas.width / 2, canvas.height / 2 - 50);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Courier New';
        ctx.fillText(subMsg, canvas.width / 2, canvas.height / 2 - 20);
        ctx.restore();
    }

    // 4. Overlays
    // Pause Overlay
    if (gameState === 'paused') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    }

    // ===== NEW WEAPON HUD =====
    if ((gameState === 'playing' || gameState === 'paused') && weaponTier > 0) {
        ctx.save();
        const wpn = WEAPONS[currentWeapon];
        const hudWidth = 220;
        const hudHeight = 70;
        const hudX = canvas.width - hudWidth - 20;
        const hudY = 140;

        // Glass-morphism card
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = wpn.color;
        ctx.beginPath();
        ctx.roundRect(hudX, hudY, hudWidth, hudHeight, 8);
        ctx.fill();
        ctx.strokeStyle = wpn.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Gun Icon
        let gunLvl = 1;
        if (currentWeapon === 'plasma') gunLvl = 2;
        if (currentWeapon === 'rail') gunLvl = 3;
        if (currentWeapon === 'spray') gunLvl = 4;
        drawGun(ctx, hudX + 15, hudY + 15, 60, 30, gunLvl);

        // Text Info
        ctx.shadowBlur = 0;
        ctx.fillStyle = wpn.color;
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(wpn.name, hudX + 90, hudY + 30);

        // Tier Indicator Pips
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i < weaponTier ? wpn.color : '#333';
            ctx.shadowBlur = i < weaponTier ? 5 : 0;
            ctx.shadowColor = wpn.color;
            ctx.fillRect(hudX + 90 + i * 30, hudY + 42, 25, 8);
        }

        ctx.font = 'bold 11px Courier New';
        ctx.fillStyle = '#888';
        ctx.fillText(`TIER ${weaponTier}/4`, hudX + 90, hudY + 64);

        ctx.restore();
    }

    // ===== COMBO DISPLAY =====
    if (combo.count > 0) {
        ctx.save();
        const comboScale = 1 + Math.min(combo.count / 20, 0.5);
        ctx.font = `bold ${Math.floor(24 * comboScale)}px Courier New`;
        ctx.textAlign = 'center';

        // Rainbow effect for high combos
        const hue = (Date.now() / 10) % 360;
        ctx.fillStyle = combo.count >= 10 ? `hsl(${hue}, 100%, 60%)` : '#ffff00';
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.fillStyle;

        ctx.fillText(`${combo.count}x COMBO!`, canvas.width / 2, 120);

        if (combo.multiplier > 1) {
            ctx.font = 'bold 16px Courier New';
            ctx.fillStyle = '#39ff14';
            ctx.fillText(`SCORE x${combo.multiplier}`, canvas.width / 2, 145);
        }
        ctx.restore();
    }

    // ===== ACHIEVEMENT TOASTS =====
    achievementToasts = achievementToasts.filter(toast => {
        toast.timer--;
        return toast.timer > 0;
    });

    achievementToasts.forEach((toast, i) => {
        ctx.save();
        const alpha = Math.min(1, toast.timer / 30);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        const y = 180 + i * 50;
        ctx.fillRect(canvas.width / 2 - 150, y, 300, 40);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 150, y, 300, 40);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(toast.text, canvas.width / 2, y + 26);
        ctx.restore();
    });

    // ===== DIFFICULTY INDICATOR =====
    ctx.save();
    ctx.font = '12px Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#888';
    ctx.fillText(`Difficulty: ${difficultyLevel}`, 20, canvas.height - 20);
    ctx.restore();

    ctx.restore(); // Restore shake translation
}



// --- Audio System (Web Audio API) ---
const soundManager = {
    ctx: null,
    init: function () {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Master volume
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            console.error("Audio Init Failed:", e);
        }
    },
    play: function (type) {
        if (this.mutedSFX || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        gain.gain.value = sfxVolume; // Apply SFX volume

        const now = this.ctx.currentTime;

        if (type === 'jump') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'shoot') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'plasma') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.3);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'powerup') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            osc.frequency.setValueAtTime(1000, now + 0.2);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'explosion') {
            // Noise burst simulation
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.2);
            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    },
    startMusic: function () {
        if (!this.ctx) return;
        // Dynamic Music System
        setInterval(() => {
            if (this.mutedMusic || gameState !== 'playing') return;
            const t = this.ctx.currentTime;
            const vol = musicVolume * 0.3;

            // Base frequency changes with intensity
            let baseFreq = musicIntensity === 'boss' ? 82 : (musicIntensity === 'action' ? 110 : 55);
            let tempo = musicIntensity === 'boss' ? 0.7 : (musicIntensity === 'action' ? 0.8 : 1.0);

            // Bass
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.connect(g);
            g.connect(this.masterGain);
            o.type = musicIntensity === 'boss' ? 'square' : 'sawtooth';
            o.frequency.setValueAtTime(baseFreq * 2, t);
            o.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.2 * tempo);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.3 * tempo);
            o.start(t);
            o.stop(t + 0.3 * tempo);

            // Hi-hat (more frequent during action)
            const hihatChance = musicIntensity === 'calm' ? 0.3 : (musicIntensity === 'action' ? 0.7 : 0.9);
            if (Math.random() < hihatChance) {
                const h = this.ctx.createOscillator();
                const hg = this.ctx.createGain();
                h.connect(hg);
                hg.connect(this.masterGain);
                h.type = 'square';
                h.frequency.setValueAtTime(musicIntensity === 'boss' ? 1200 : 800, t + 0.25 * tempo);
                hg.gain.setValueAtTime(0.05 * musicVolume, t + 0.25 * tempo);
                hg.gain.exponentialRampToValueAtTime(0.001, t + 0.3 * tempo);
                h.start(t + 0.25 * tempo);
                h.stop(t + 0.3 * tempo);
            }

            // Extra percussion during boss fight
            if (musicIntensity === 'boss' && Math.random() > 0.6) {
                const kick = this.ctx.createOscillator();
                const kg = this.ctx.createGain();
                kick.connect(kg);
                kg.connect(this.masterGain);
                kick.type = 'sine';
                kick.frequency.setValueAtTime(150, t + 0.4);
                kick.frequency.exponentialRampToValueAtTime(30, t + 0.5);
                kg.gain.setValueAtTime(0.3 * musicVolume, t + 0.4);
                kg.gain.exponentialRampToValueAtTime(0.01, t + 0.55);
                kick.start(t + 0.4);
                kick.stop(t + 0.55);
            }
        }, 400); // Slightly faster base tempo
    },
    mutedSFX: false,
    mutedMusic: true,
    toggleSFX: function () {
        this.mutedSFX = !this.mutedSFX;
        const el = document.getElementById('sfx-stat');
        if (el) {
            el.innerHTML = `[I] SFX: ${this.mutedSFX ? 'OFF' : 'ON'}`;
            el.style.color = this.mutedSFX ? '#aaa' : '#39ff14';
        }
    },
    toggleMusic: function () {
        this.mutedMusic = !this.mutedMusic;
        const el = document.getElementById('music-stat');
        if (el) {
            el.innerHTML = `[O] Music: ${this.mutedMusic ? 'OFF' : 'ON'}`;
            el.style.color = this.mutedMusic ? '#aaa' : '#39ff14';
        }
    }
};

// Robust initialization
function init() {
    console.log("SodaHealth Quest: Initializing...");

    // Load saved progress (achievements, stats, skins)
    loadProgress();

    hideUI('quiz-container'); // Safety: Ensure hidden on load
    hideUI('game-over');
    hideUI('victory');
    hideUI('hud');

    // Init Audio on first user interaction to bypass browser autoplay policy
    const startAudio = () => {
        if (!soundManager.ctx) {
            soundManager.init();
            soundManager.startMusic();
        }
    };
    window.addEventListener('click', startAudio, { once: true });
    window.addEventListener('keydown', (e) => {
        startAudio();
        const key = e.key.toLowerCase();
        // Mute Controls
        if (key === 'i') soundManager.toggleSFX();
        if (key === 'o') soundManager.toggleMusic();

        // Volume Sliders
        if (key === ',') {
            sfxVolume = Math.max(0, sfxVolume - 0.1);
            spawnDamageText(player.x, player.y, `SFX: ${Math.round(sfxVolume * 100)}%`, '#ff6b6b');
            saveProgress();
        }
        if (key === '.') {
            sfxVolume = Math.min(1, sfxVolume + 0.1);
            spawnDamageText(player.x, player.y, `SFX: ${Math.round(sfxVolume * 100)}%`, '#39ff14');
            saveProgress();
        }
        if (key === '[') {
            musicVolume = Math.max(0, musicVolume - 0.1);
            spawnDamageText(player.x, player.y, `Music: ${Math.round(musicVolume * 100)}%`, '#ff6b6b');
            saveProgress();
        }
        if (key === ']') {
            musicVolume = Math.min(1, musicVolume + 0.1);
            spawnDamageText(player.x, player.y, `Music: ${Math.round(musicVolume * 100)}%`, '#39ff14');
            saveProgress();
        }

        // Skin Cycle (K)
        if (key === 'k') cycleSkin();

        // Daily Challenge (P)
        if (key === 'p') toggleDailyChallenge();

        // Restart Game (Enter)
        if (key === 'enter') {
            if (gameState === 'start') startGame();
            else if (gameState === 'gameOver' || gameState === 'victory') location.reload();
        }
    });

    // Global Error Handler for Canvas
    window.onerror = function (msg, url, lineNo, columnNo, error) {
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = '20px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText("ERROR: " + msg, 50, 100);
        ctx.fillText("Line: " + lineNo, 50, 130);
        ctx.restore();
        gameState = 'error'; // Stop loop
        return false;
    };

    try {
        resize();
        updateHUD();
        loop();
        console.log("SodaHealth Quest: Loop started.");
    } catch (e) {
        console.error("SodaHealth Quest: Initialization error:", e);
    }
}

function startGame() {
    hideUI('start-screen');
    showUI('hud');
    gameState = 'playing';

    // Initialize Audio Context on user gesture
    if (!soundManager.ctx) {
        soundManager.init();
        soundManager.startMusic();
    }

    // Explicitly reset combat state
    player.gunLevel = 0;
    weaponTier = 0;
    fireCooldown = 0;
    weaponTimer = 0;
    currentWeapon = 'laser';
}

function updateHUD() {
    // Fitness Text
    const fitEl = document.getElementById('fitness-stat');
    if (fitEl) {
        let text = "Sedentary (Slow & Low Jump)";
        if (fitnessLevel === 2) text = "Active (Average Speed)";
        if (fitnessLevel === 3) text = "Athletic (High Speed & Jump)";
        fitEl.innerText = text;

        // Color coding
        fitEl.style.color = fitnessLevel === 1 ? '#ff6b6b' : (fitnessLevel === 2 ? '#ffff00' : '#39ff14');
    }

    // Score: Distance value
    const distEl = document.getElementById('score-val');
    if (distEl) distEl.innerText = Math.floor(distance);

    // Power Bar (Quiz Progress)
    const powerEl = document.getElementById('power-bar');
    if (powerEl) {
        const progress = (currentQuestionIndex / questions.length) * 100;
        powerEl.style.width = progress + '%';
    }
}

function showUI(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

function hideUI(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

// Game Loop
// Game Loop
function loop() {
    try {
        if (gameState === 'playing' || gameState === 'paused') {
            update();
        }
        draw();
        requestAnimationFrame(loop);
    } catch (e) {
        console.error("Game Loop Error:", e);
        // Force draw error to screen
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = '16px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText("CRASH TRACE:", 20, 50);
        const lines = e.stack ? e.stack.split('\n') : [e.toString()];
        lines.forEach((line, i) => {
            ctx.fillText(line.substring(0, 80), 20, 80 + i * 20);
        });
        ctx.restore();
        gameState = 'error';
    }
}

// Game Over Logic with High Score
function handleGameOver() {
    hideUI('quiz-container'); // Ensure quiz is hidden
    gameState = 'gameOver';
    const currentScore = Math.floor(distance);
    let bestScore = localStorage.getItem('sodaHealthBestScore') || 0;

    let msg = `run distance: ${currentScore}m`;

    if (currentScore > bestScore) {
        localStorage.setItem('sodaHealthBestScore', currentScore);
        msg += ` <br> 🏆 NEW RECORD! (Old: ${bestScore}m)`;
        // Fanfare Sound (if Audio enabled)
        if (soundManager) soundManager.play('powerup');
    } else {
        msg += ` <br> Best: ${bestScore}m`;
    }

    const el = document.getElementById('high-score-display');
    if (el) el.innerHTML = msg;

    showUI('game-over');
}


// --- Quiz Logic ---
function startQuiz() {
    if (gameState === 'quiz') return;
    gameState = 'quiz';
    enemyBullets = []; // Clear all projectiles on screen for a fair transition

    // During boss, serve random questions from the current stage
    if (boss) {
        const stageStart = Math.max(0, boss.spawnIndex - (boss.spawnIndex % 5)); // Start of the 5-question block
        currentQuizIndex = stageStart + Math.floor(Math.random() * 5); // Random question within that block
    } else {
        currentQuizIndex = currentQuestionIndex;
    }

    const container = document.getElementById('quiz-container');
    if (container) container.classList.remove('hidden');

    const q = questions[currentQuizIndex];
    if (!q) return; // Safety check

    const qText = document.getElementById('question-text');
    const optionsCont = document.getElementById('options-container');

    if (qText) {
        qText.innerText = q.q;
        // Dynamic Question Scaling
        if (q.q.length > 140) qText.style.fontSize = '0.85rem';
        else if (q.q.length > 100) qText.style.fontSize = '0.95rem';
        else qText.style.fontSize = '1.1rem';
    }

    if (optionsCont) {
        optionsCont.innerHTML = '';
        q.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';

            // Dynamic Answer Scaling
            if (opt.length > 50) btn.style.fontSize = '0.8rem';
            else if (opt.length > 30) btn.style.fontSize = '0.95rem';
            else btn.style.fontSize = '1.1rem';

            // Structure: Number on left, Text centered, using idx+1.
            btn.innerHTML = `<span class="opt-num">${i + 1}</span><span class="opt-text">${opt}</span>`;

            btn.onclick = () => checkAnswer(i);
            optionsCont.appendChild(btn);
        });
    }
}

function checkAnswer(selectedIndex) {
    const q = questions[currentQuizIndex];
    let isCorrect = false;

    if (Array.isArray(q.correct)) {
        isCorrect = q.correct.includes(selectedIndex);
    } else {
        isCorrect = selectedIndex === q.correct;
    }

    if (isCorrect) {
        soundManager.play('powerup');
        stats.questionsAnswered++;

        // Progression Logic: Level up every 3 correct answers
        if (stats.questionsAnswered % 3 === 0) {
            fitnessLevel = Math.min(3, fitnessLevel + 1);
            spawnDamageText(player.x, player.y, "FITNESS UP!", "#39ff14");
        }
        updateHUD(); // Update text

        if (stats.questionsAnswered === 10) unlockAchievement('quizMaster');
        score += 500;
        spawnDamageText(player.x, player.y, "CORRECT!", "#39ff14");

        // Reward: Phase out current enemies
        enemies.forEach(en => {
            en.phasingOut = true;
            if (en.opacity === undefined) en.opacity = 1.0;
        });

        // ONLY progress the level index if no boss is active
        if (!boss) {
            currentQuestionIndex++;
        }
    } else {
        soundManager.play('explosion');
        spawnDamageText(player.x, player.y, "WRONG!", "#ff0000");
    }

    const container = document.getElementById('quiz-container');
    if (container) container.classList.add('hidden');

    gameState = 'playing';
}

// Final housekeeping code removed to keep file clean

// --- Controls Menu Logic ---
function toggleControlsMenu() {
    const el = document.getElementById('controls-menu');
    if (el) {
        const isHidden = el.classList.contains('hidden');
        if (isHidden) {
            el.classList.remove('hidden');
            updateControlsUI();
        } else {
            el.classList.add('hidden');
            isRebinding = null;
        }
    }
}

function updateControlsUI() {
    const list = document.getElementById('controls-list');
    const prompt = document.getElementById('rebind-prompt');
    if (!list) return;

    prompt.innerText = isRebinding ? `Press any key to bind to ${isRebinding.toUpperCase()}` : "";

    list.innerHTML = "";
    Object.keys(userControls).forEach(action => {
        const item = document.createElement('div');
        item.className = 'control-item';

        const label = document.createElement('span');
        label.innerText = action.charAt(0).toUpperCase() + action.slice(1);

        const btn = document.createElement('div');
        btn.className = 'rebind-btn' + (isRebinding === action ? ' rebinding' : '');
        btn.innerText = userControls[action].join(' / ').replace(/Key|Digit|Arrow/g, '');
        btn.onclick = () => startRemapping(action);

        item.appendChild(label);
        item.appendChild(btn);
        list.appendChild(item);
    });
}

function startRemapping(action) {
    isRebinding = action;
    updateControlsUI();
}

function resetControls() {
    userControls = {
        jump: ['Space', 'ArrowUp'],
        left: ['ArrowLeft'],
        right: ['ArrowRight'],
        down: ['ArrowDown', 'KeyS'],
        fire: ['KeyW', 'KeyZ', 'KeyX']
    };
    saveControls();
    isRebinding = null;
    updateControlsUI();
}

// Wait for DOM and then start
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    window.addEventListener('DOMContentLoaded', init);
}
