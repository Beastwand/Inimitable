const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'playing'; // 'playing', 'paused', 'quiz', 'gameOver', 'victory'
let fitnessLevel = 1; // 1: Average, 2: Fit, 3: Muscular
let score = 0;
let distance = 0;
let gameSpeed = 3;

// Assets (Paths to local workspace)
const playerImg = new Image();
playerImg.src = 'player_consistent.png';

const microbeImg = new Image();
microbeImg.src = 'microbe_enemy.png';

const background1 = new Image();
background1.src = 'candy_store_bg.png';

const background2 = new Image();
background2.src = 'fast_food_bg.png';

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
    gunLevel: 0 // 0: None, 1: Laser, 2: Plasma
};

// Gun & Bullets
let bullets = [];
let enemyBullets = []; // New for Stage 3
let gunItem = null;

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
        const lifeRatio = b.life / 60; // Fades out over 60 frames
        ctx.globalAlpha = lifeRatio;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffd700';
        ctx.fillStyle = '#fff7cc';
        ctx.beginPath();
        ctx.arc(x, y, width / 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'rail') {
        // High-velocity purple kinetic bolt
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

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            const angle = Math.random() * Math.PI * 2;
            ctx.arc(centerX, centerY, radius * 0.7, angle, angle + 1);
            ctx.stroke();
        }
    } else if (type === 'entropy') {
        // Enemy projectile
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0000';
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f3ff';
        ctx.fillStyle = '#00f3ff';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 5, y + 1, width - 10, height - 2);

        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;

        for (let i = 0; i < 2; i++) {
            const offset = Math.sin(Date.now() * 0.1 + i) * 5;
            ctx.beginPath();
            ctx.moveTo(x + width * 0.2, y + height / 2);
            ctx.lineTo(x + width * 0.8, y + height / 2 + offset);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// Platforms
// Platforms
let platforms = [];
const minPlatformDistance = 1500;
let lastPlatformSpawn = 0;
let lastEnemySpawn = 0;
let lastQuizDistance = 0; // Cooldown between quizzes
let fireCooldown = 0;     // Rate limiting for auto-fire
let gunTutorialTimer = 0; // Show "Press W" message
let hasShownGunTutorial = false;

// Quiz Data - 15 Questions based on the article
const allQuestions = [
    { q: "Which 'natural sugar' helps prevent sugar metabolism when consumed simultaneously?", options: ["Allulose", "Fructose", "Sucralose"], correct: 0 },
    { q: "Which fruit can attenuate a reduced serum antioxidant effect of sugar?", options: ["Blueberry", "Apple", "Banana"], correct: 0 },
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
    { q: "Which antioxidant found in natural extracts counteracts inflammation?", options: ["Hesperidin", "Melatonin", "Caffeine"], correct: 0 },
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
        { x: canvas.width, img: background1, speed: 0.5, isBg: true },
        // Anchor objects for Building silhouettes (None) or Trees (Stage 3)
        { x: 0, speed: 0.8, isBuilding: true },
        { x: canvas.width, speed: 0.8, isBuilding: true }
    ];
}
window.addEventListener('resize', resize);
resize();

// Input
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;

    // Pause Logic
    if (e.code === 'Escape' && gameState === 'playing') {
        gameState = 'paused';
    } else if (gameState === 'paused' && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Escape')) {
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
window.addEventListener('keyup', e => keys[e.code] = false);

// Entities
let enemies = [];

function drawMolecule(ctx, x, y, size, type) {
    ctx.lineWidth = 3;
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    if (type === 'cytokine') {
        ctx.strokeStyle = '#ff00ff'; // Purple
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + (size / 2) * Math.cos(angle), centerY + (size / 2) * Math.sin(angle));
        }
        ctx.stroke();

        // Label with background
        const txt = "inflammatory cytokine";
        ctx.font = 'bold 11px monospace';
        const tw = ctx.measureText(txt).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'; // Max contrast
        ctx.fillRect(centerX - tw / 2 - 4, y + size + 5, tw + 8, 15);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(txt, centerX, y + size + 16);
    } else {
        ctx.strokeStyle = '#ff3300'; // Red/Orange
        ctx.beginPath();
        const radius = size / 3;
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const lx = centerX + radius * Math.cos(angle);
            const ly = centerY + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(lx, ly);
            else ctx.lineTo(lx, ly);
        }
        ctx.closePath();
        ctx.stroke();

        // Label with background
        const txt = "oxidant molecule";
        ctx.font = 'bold 11px monospace';
        const tw = ctx.measureText(txt).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'; // Max contrast
        ctx.fillRect(centerX - tw / 2 - 4, y + size + 5, tw + 8, 15);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(txt, centerX, y + size + 16);
    }
}

function update() {
    if (gameState !== 'playing') return;

    distance += gameSpeed;

    // Shooting (W Key) - Rate limited Auto-fire
    if (fireCooldown > 0) fireCooldown--;
    if (keys['KeyW'] && player.gunLevel > 0 && gameState === 'playing' && fireCooldown <= 0) {
        const isLvl2 = player.gunLevel === 2;
        const isLvl3 = player.gunLevel === 3;
        const isLvl4 = player.gunLevel === 4;

        if (isLvl4) {
            const count = 5 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                bullets.push({
                    x: player.x + player.width,
                    y: player.y + player.height / 2,
                    width: 10,
                    height: 10,
                    speed: 12 + Math.random() * 5,
                    dy: (Math.random() - 0.5) * 8,
                    type: 'pellet',
                    life: 60 + Math.floor(Math.random() * 20)
                });
            }
            fireCooldown = 80;
        } else {
            bullets.push({
                x: player.x + player.width,
                y: player.y + player.height / 2 - (isLvl3 ? 5 : (isLvl2 ? 15 : 2)),
                width: isLvl3 ? 40 : (isLvl2 ? 30 : 20),
                height: isLvl3 ? 8 : (isLvl2 ? 30 : 5),
                speed: isLvl3 ? 20 : (isLvl2 ? 8 : 12),
                type: isLvl3 ? 'rail' : (isLvl2 ? 'plasma' : 'laser')
            });
            fireCooldown = isLvl3 ? 60 : (isLvl2 ? 45 : 15);
        }
    }

    // Tutorial Timer (Counts down)
    if (gunTutorialTimer > 0) gunTutorialTimer--;

    // Jump logic: Space or ArrowUp
    if ((keys['Space'] || keys['ArrowUp']) && player.isGrounded) {
        player.dy = -player.jumpForce - (fitnessLevel * 1.5);
        player.isGrounded = false;
        player.platform = null; // Detach from platform
    }

    // Horizontal steering: Adding ArrowLeft/ArrowRight to nudge player
    if (keys['ArrowRight']) player.x = Math.min(canvas.width - player.width, player.x + 5);
    if (keys['ArrowLeft']) player.x = Math.max(0, player.x - 5);

    player.dy += player.gravity;
    player.y += player.dy;

    // Ground collision
    const groundY = canvas.height - 200;
    if (player.y > groundY) {
        player.y = groundY;
        player.dy = 0;
        player.isGrounded = true;
        player.platform = null; // Ensure platform is null if on ground
    }

    // Update Backgrounds
    backgrounds.forEach(bg => {
        bg.x -= bg.speed * (gameSpeed / 3);
        // Fix gap: Snap to integer and ensure a 2px overlap to hide the seam
        if (bg.x <= -canvas.width) {
            bg.x += canvas.width * 2 - 2;
        }
    });

    // Environment Transitions
    const targetBg = currentQuestionIndex < 5 ? background2 : (currentQuestionIndex < 10 ? background1 : null);

    backgrounds.forEach(bg => {
        if (bg.isBg) {
            bg.img = targetBg;
        }
    });

    // Update Enemies (Stable removal using filter)
    enemies = enemies.filter(enemy => {
        enemy.x -= enemy.speed;

        // Forgiving Collision detection (using inner 60% of sprite)
        const pPadding = player.width * 0.2;
        const ePadding = enemy.width * 0.2;

        if (
            player.x + pPadding < enemy.x + enemy.width - ePadding &&
            player.x + player.width - pPadding > enemy.x + ePadding &&
            player.y + pPadding < enemy.y + enemy.height - ePadding &&
            player.y + player.height - pPadding > enemy.y + ePadding
        ) {
            gameState = 'gameOver';
            showUI('game-over');
        }

        // Up/down movement for molecules
        if (enemy.type !== 'microbe') {
            enemy.phase += 0.05;
            enemy.y = enemy.baseY + Math.sin(enemy.phase) * (enemy.type === 'cytokine' ? 80 : 30);

            // Extreme Hazard: Fire at player
            if (currentQuestionIndex >= 10 && Math.random() < 0.005) {
                enemyBullets.push({
                    x: enemy.x,
                    y: enemy.y + enemy.height / 2,
                    width: 15,
                    height: 15,
                    speed: -gameSpeed - 2,
                    type: 'entropy'
                });
            }
        } else if (currentQuestionIndex >= 10) {
            // Jumping Microbes logic
            if (!enemy.dy) enemy.dy = 0;
            if (!enemy.isGrounded) {
                enemy.dy += 0.6; // Gravity
                enemy.y += enemy.dy;
                if (enemy.y >= enemy.baseY) {
                    enemy.y = enemy.baseY;
                    enemy.dy = 0;
                    enemy.isGrounded = true;
                }
            } else if (Math.random() < 0.01 && enemy.x < canvas.width * 0.8) {
                // Jump!
                enemy.dy = -12;
                enemy.isGrounded = false;
            }
        }

        // Keep only if on screen
        return enemy.x + enemy.width > -200;
    });

    // Update Platforms
    let onPlatform = false;
    platforms = platforms.filter(p => {
        p.x -= gameSpeed;

        // Platform Collision (One-way: only land from top)
        if (
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
        } else {
            gameState = 'victory';
            showUI('victory');
        }
    }

    spawnEnemy();
    spawnPlatform();
    spawnGunItem();
    updateBullets();
    updateHUD();
}


function spawnEnemy() {
    // Aggressive spawn rates for constant action
    const minSpawnDist = fitnessLevel === 3 ? 150 : (fitnessLevel === 2 ? 250 : 400);

    if (distance - lastEnemySpawn > minSpawnDist + Math.random() * 300 && gameState === 'playing') {
        // Chance for a "Double Spawn" (two enemies at once)
        const count = Math.random() < (0.3 + fitnessLevel * 0.1) ? 2 : 1;

        for (let i = 0; i < count; i++) {
            const typeRoll = Math.random();
            let enemyType = 'microbe';
            let yPos = canvas.height - 180;

            if (typeRoll > 0.6) {
                enemyType = Math.random() > 0.5 ? 'cytokine' : 'oxidant';
                yPos = canvas.height - 300 - Math.random() * 250;
            }

            enemies.push({
                x: canvas.width + 100 + (i * 80), // Offset double spawns
                y: yPos,
                baseY: yPos,
                width: enemyType === 'microbe' ? 60 : 50,
                height: enemyType === 'microbe' ? 60 : 50,
                type: enemyType,
                speed: gameSpeed * (enemyType === 'microbe' ? 1.0 : 1.3),
                phase: Math.random() * Math.PI * 2,
                health: 6, // Scaled for hits-to-kill balance
                hitTimer: 0 // For visual feedback
            });
        }

        lastEnemySpawn = distance;
    }
}

function spawnGunItem() {
    // Random spawning: removed stage gating
    if (!gunItem && Math.random() < 0.005 && distance > 500) {
        const lvls = [1, 2, 3, 4];
        const randomLvl = lvls[Math.floor(Math.random() * lvls.length)];

        // Don't spawn what we already have
        if (randomLvl !== player.gunLevel) {
            gunItem = {
                x: canvas.width,
                y: canvas.height - 250 - Math.random() * 100,
                width: 40,
                height: 30,
                level: randomLvl
            };
        }
    }
    if (gunItem) {
        gunItem.x -= gameSpeed;
        if (
            player.x < gunItem.x + gunItem.width &&
            player.x + player.width > gunItem.x &&
            player.y < gunItem.y + gunItem.height &&
            player.y + player.height > gunItem.y
        ) {
            player.gunLevel = gunItem.level;
            gunItem = null;

            if (!hasShownGunTutorial || player.gunLevel >= 2) {
                gunTutorialTimer = 180;
                hasShownGunTutorial = true;
            }
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
                }
                b.x += b.speed;
                b.y += (b.dy || 0);
                return b.life > 0;
            } else {
                b.x += b.speed;
                return b.x < canvas.width;
            }
        });
    }

    if (enemyBullets.length > 0) {
        enemyBullets = enemyBullets.filter(eb => {
            eb.x += eb.speed;
            // Check player collision
            if (
                eb.x < player.x + player.width &&
                eb.x + eb.width > player.x &&
                eb.y < player.y + player.height &&
                eb.y + eb.height > player.y
            ) {
                gameState = 'gameOver';
                showUI('game-over');
                return false;
            }
            return eb.x + eb.width > 0;
        });
    }

    // 2. Collision detection
    if (bullets.length === 0 || enemies.length === 0) {
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
            if (hitEnemies.has(j)) continue;

            if (
                b.x < e.x + e.width &&
                b.x + b.width > e.x &&
                b.y < e.y + e.height &&
                b.y + b.height > e.y
            ) {
                // Tier 3: Pierce through enemies
                if (b.type !== 'rail') hitBullets.add(i);

                // Damage Logic: Monster HP is 6
                let damage = 1;
                if (b.type === 'rail') damage = 8;
                else if (b.type === 'plasma') damage = 6;
                else if (b.type === 'laser') damage = 3;
                else if (b.type === 'pellet') damage = 2; // 3 pellets to kill

                e.health -= damage;
                e.hitTimer = 10;

                if (e.health <= 0) {
                    hitEnemies.add(j);
                }

                // If it's a rail shot, we don't break; we continue through other enemies
                if (b.type !== 'rail') break;
            }
        }
    }

    // 3. Apply removals
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

// Comic Book Style Building Logic
function drawSilhouettes(ctx, startX, color, isNature = false) {
    let bx = startX;

    // Comic Book Palette (Dark Blues/Purples)
    const buildingColors = ['#0d1b2a', '#1b263b', '#2e1c3b', '#1c2541'];

    for (let i = 0; i < 6; i++) {
        const seed = Math.abs(Math.sin(i * 12.34));
        const baseW = 80 + seed * 60;
        const totalH = isNature ? (100 + seed * 80) : (300 + seed * 250);

        // --- 1. Main Structure (Gradient + Outline) ---
        const bColor = buildingColors[i % buildingColors.length];

        ctx.fillStyle = isNature ? color : bColor;
        // Add a gradient for depth if city
        if (!isNature) {
            const grad = ctx.createLinearGradient(bx, canvas.height - totalH, bx + baseW, canvas.height);
            grad.addColorStop(0, bColor);
            grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad;
        }

        ctx.strokeStyle = '#000000'; // Bold Inked Outline
        ctx.lineWidth = 3;

        const bY = canvas.height - totalH - 100;

        ctx.fillRect(bx, bY, baseW, totalH);
        ctx.strokeRect(bx, bY, baseW, totalH);

        // --- 2. Architectural Details (Art Deco / Comic) ---
        if (!isNature) {
            // Roof Spire/Steps
            ctx.fillStyle = bColor;
            ctx.fillRect(bx + 10, bY - 30, baseW - 20, 30);
            ctx.strokeRect(bx + 10, bY - 30, baseW - 20, 30);

            // Vertical "Girders" lines
            ctx.beginPath();
            ctx.moveTo(bx + baseW / 2, bY);
            ctx.lineTo(bx + baseW / 2, canvas.height - 100);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.stroke();
        }

        // --- 3. Windows (Lit squares) ---
        // Warm yellow/orange for distinct "comic city" feel
        const windowColor = isNature ? 'rgba(255,255,255,0.05)' : (currentQuestionIndex >= 5 ? '#feca57' : '#ff9ff3');

        ctx.fillStyle = windowColor;
        for (let wy = bY + 40; wy < canvas.height - 150; wy += 50) {
            for (let wx = bx + 15; wx < bx + baseW - 15; wx += 20) {
                // Randomly unlit windows
                if (Math.sin(wx * wy + i) > -0.5) {
                    ctx.fillRect(wx, wy, 10, 15);
                }
            }
        }

        bx += baseW + 300 + seed * 100; // Wide spacing

        // Safety: Don't draw into next tile (prevents overlap)
        if (bx - startX > canvas.width) break;
    }
}

function drawNature(ctx) {
    // 1. Clear Cyan Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#00d2ff'); // Bright Cyan
    skyGrad.addColorStop(0.6, '#92fe9d'); // Transition to soft green
    skyGrad.addColorStop(1, '#667eea'); // Deep horizon
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. The Sun
    const sunX = canvas.width * 0.8;
    const sunY = 150;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 150);
    sunGrad.addColorStop(0, 'rgba(255, 255, 200, 1)');
    sunGrad.addColorStop(0.2, 'rgba(255, 255, 100, 0.8)');
    sunGrad.addColorStop(1, 'rgba(255, 255, 50, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 150, 0, Math.PI * 2);
    ctx.fill();

    // 3. Far Distant Silhouettes (City fading away)
    backgrounds.forEach(bg => {
        if (bg.isBuilding) {
            drawSilhouettes(ctx, bg.x * 0.5, 'rgba(40, 60, 80, 0.15)', true);
        }
    });
}

function drawTrees(ctx, startX) {
    let tx = startX;
    for (let i = 0; i < 5; i++) {
        const seed = Math.abs(Math.sin(i * 7.89));
        const treeH = 80 + seed * 60;

        // Trunk
        ctx.fillStyle = '#4b2e1e';
        ctx.fillRect(tx, canvas.height - 100 - treeH, 10, treeH);

        // Leaves (Lush layered circles)
        ctx.fillStyle = '#2d5a27';
        ctx.beginPath();
        ctx.arc(tx + 5, canvas.height - 100 - treeH - 20, 30 + seed * 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a7d34';
        ctx.beginPath();
        ctx.arc(tx - 10, canvas.height - 100 - treeH - 40, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tx + 20, canvas.height - 100 - treeH - 40, 25, 0, Math.PI * 2);
        ctx.fill();

        tx += 250 + seed * 200;
        if (tx - startX > canvas.width) break;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'left'; // Default
    if (currentQuestionIndex >= 10) {
        drawNature(ctx);
        backgrounds.forEach(bg => {
            if (bg.isBuilding) {
                drawTrees(ctx, bg.x);
            }
        });
    } else {
        // City Stage
        backgrounds.forEach(bg => {
            if (bg.img) {
                ctx.drawImage(bg.img, bg.x, 0, canvas.width, canvas.height);
            }
        });
    }

    // 2. Copyright Patch (Drawn as part of background so actors stay in front)
    backgrounds.forEach(bg => {
        if (bg.img === background2 && currentQuestionIndex < 5) {
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

    // 3. Actors & Entities
    // Draw Enemies
    enemies.forEach(enemy => {
        ctx.save();
        if (enemy.hitTimer > 0) {
            ctx.filter = 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)'; // Reddish hurt flash
        }

        if (enemy.type === 'microbe') {
            if (microbeImg.complete && microbeImg.naturalWidth > 0) {
                ctx.drawImage(microbeImg, enemy.x, enemy.y, enemy.width, enemy.height);
            } else {
                ctx.fillStyle = 'green';
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }
        } else {
            drawMolecule(ctx, enemy.x, enemy.y, enemy.width, enemy.type);
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

    // Draw Gun Item Pickup
    if (gunItem) {
        drawGun(ctx, gunItem.x, gunItem.y, gunItem.width, gunItem.height, gunItem.level);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gunItem.level === 2 ? "UPGRADE" : "PICKUP", gunItem.x + gunItem.width / 2, gunItem.y - 10);
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
        ctx.drawImage(
            currentImg,
            animFrame * spriteW, (fitnessLevel - 1) * spriteH + labelOffset, spriteW, spriteH - labelOffset,
            safeX, safeY, player.width, player.height
        );
    }

    if (player.gunLevel > 0) {
        drawGun(ctx, safeX + player.width - 25, safeY + player.height / 2, isLvl2 ? 50 : 40, isLvl2 ? 25 : 20, player.gunLevel);
    }

    // Gun Tutorial Message
    if (gunTutorialTimer > 0) {
        ctx.save();
        const isLvl4 = player.gunLevel === 4;
        const msg = isLvl4 ? "GOLD SHOTGUN ACQUIRED!" : (isLvl2 ? "UPGRADED PLASMA CANNON!" : "NEW WEAPON ACQUIRED!");
        const subMsg = isLvl4 ? "SHORT RANGE BUSTER" : (isLvl2 ? "SLOW BUT POWERFUL" : "HOLD 'W' TO FIRE");

        ctx.fillStyle = isLvl4 ? 'rgba(255, 215, 0, 0.2)' : (isLvl2 ? 'rgba(255, 140, 0, 0.2)' : 'rgba(0, 243, 255, 0.2)');
        ctx.fillRect(0, canvas.height / 2 - 100, canvas.width, 100);

        ctx.fillStyle = isLvl4 ? '#ffd700' : (isLvl2 ? '#ff8c00' : '#00f3ff');
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
}

function startQuiz() {
    gameState = 'quiz';
    const q = questions[currentQuestionIndex];
    document.getElementById('question-text').innerText = q.q;
    const optionsDiv = document.getElementById('options-container');
    optionsDiv.innerHTML = '';

    // Create option objects and shuffle them
    const shuffledOptions = shuffle(q.options.map((opt, i) => ({
        text: opt,
        isCorrect: Array.isArray(q.correct) ? q.correct.includes(i) : i === q.correct
    })));

    shuffledOptions.forEach((opt, idx) => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        // Add numeric prefix for accessibility
        btn.innerHTML = `<span style="color: #39ff14; margin-right: 10px;">${idx + 1}.</span> ${opt.text}`;
        btn.onclick = () => checkAnswer(opt.isCorrect);
        optionsDiv.appendChild(btn);
    });

    showUI('quiz-container');
}

function checkAnswer(isCorrect) {
    if (isCorrect) {
        fitnessLevel = Math.min(3, fitnessLevel + 1);
        updateHUD();
        currentQuestionIndex++;
        gameState = 'playing';
        hideUI('quiz-container');

        // Clear all microbes after answering to ensure a safe transition
        enemies = [];
        lastEnemySpawn = distance + 600; // Extra buffer before next spawn
    } else {
        // Penalty or Reset
        gameState = 'gameOver';
        showUI('game-over');
    }
}

// Robust initialization
function init() {
    console.log("SodaHealth Quest: Initializing...");
    try {
        resize();
        updateHUD();
        loop();
        console.log("SodaHealth Quest: Loop started.");
    } catch (e) {
        console.error("SodaHealth Quest: Initialization error:", e);
    }
}

function updateHUD() {
    const fitnessEl = document.getElementById('fitness-stat');
    const scoreEl = document.getElementById('score-val');
    const powerEl = document.getElementById('power-bar');

    if (fitnessEl) {
        const stats = ["Average", "Agile & Fit", "Peak Human Performance"];
        fitnessEl.innerText = stats[fitnessLevel - 1];
    }
    if (scoreEl) {
        scoreEl.innerText = Math.floor(distance);
    }
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
function loop() {
    if (gameState === 'playing' || gameState === 'paused') {
        update();
    }
    draw();
    requestAnimationFrame(loop);
}

// Wait for DOM and then start
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    window.addEventListener('DOMContentLoaded', init);
}

