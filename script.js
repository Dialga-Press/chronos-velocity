let gameState = {
    step: 'name', // name, class, story
    player: {
        name: '',
        class: '',
        stats: { Tech: 0, Arts: 0, Guts: 0, Social: 0 }
    },
    rules: null,
    story: null
};

const output = document.getElementById('game-output');
const input = document.getElementById('player-input');

// 1. Initialize
async function init() {
    printLine("INITIALIZING CHRONOS LINK...");
    try {
        const rulesRes = await fetch('data/rules.json');
        gameState.rules = await rulesRes.json();
        
        // Load Story Data later, for now just rules
        printLine("CONNECTION ESTABLISHED.");
        printLine("ENTER AGENT NAME:");
    } catch (e) {
        printLine("ERROR: DATA CORRUPTION DETECTED.");
    }
}

// 2. Handle Input
input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const val = input.value;
        input.value = '';
        printLine(`> ${val}`, 'user-text');
        processInput(val);
    }
});

// 3. Logic Processor
function processInput(val) {
    if (gameState.step === 'name') {
        gameState.player.name = val;
        printLine(`IDENTITY CONFIRMED: ${val}`);
        printLine("SELECT BACKGROUND PROTOCOL:");
        
        // List classes from JSON
        gameState.rules.backgrounds.forEach((bg, index) => {
            printLine(`[${index + 1}] ${bg.name}: ${bg.desc}`);
        });
        
        gameState.step = 'class';
    } 
    else if (gameState.step === 'class') {
        const choice = parseInt(val) - 1;
        const classes = gameState.rules.backgrounds;
        
        if (classes[choice]) {
            const selected = classes[choice];
            gameState.player.class = selected.id;
            
            // Apply Bonuses
            for (let [key, value] of Object.entries(selected.bonus)) {
                gameState.player.stats[key] += value;
            }
            
            printLine(`PROTOCOL LOADED: ${selected.name.toUpperCase()}`);
            printLine(`STATS UPDATED: Tech:${gameState.player.stats.Tech} | Arts:${gameState.player.stats.Arts}`);
            printLine("--------------------------------");
            printLine("STARTING VOLUME 1...");
            // Here you would trigger the story engine
            gameState.step = 'story';
        } else {
            printLine("ERROR: INVALID PROTOCOL. RETRY.");
        }
    }
}

// Helper to print text to screen
function printLine(text, className = '') {
    const p = document.createElement('div');
    p.textContent = text;
    if (className) p.classList.add(className);
    output.appendChild(p);
    output.scrollTop = output.scrollHeight; // Auto scroll
}

// Start
init();

// ... (Previous Init Code) ...

function renderScene(sceneId) {
    const chapter = gameState.story.chapter_1; // simplified for MVP
    const scene = chapter.scenes.find(s => s.id === sceneId);
    
    if (scene) {
        scene.text_blocks.forEach(block => {
            const text = resolveTextVariant(block);
            printLine(text, 'story-text');
        });
    }
}

function resolveTextVariant(blockObj) {
    // 1. Check for specific Class ID match
    let match = blockObj.find(t => t.condition === gameState.player.class);
    if (match) return match.text;

    // 2. Check for Stat Match (e.g., "high_tech")
    // Find highest stat
    const stats = gameState.player.stats;
    const maxStat = Object.keys(stats).reduce((a, b) => stats[a] > stats[b] ? a : b);
    
    match = blockObj.find(t => t.condition === `high_${maxStat.toLowerCase()}`);
    if (match) return match.text;

    // 3. Fallback to default
    match = blockObj.find(t => t.condition === 'default');
    return match ? match.text : "ERROR: TEXT NOT FOUND";
}
