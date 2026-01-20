let gameState = {
    step: 'name', 
    player: {
        name: '',
        class: '',
        stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } // Base Human Stats
    },
    rules: null,
    story: null
};

const output = document.getElementById('game-output');
const input = document.getElementById('player-input');

async function init() {
    printLine("System Initialization...", 'system');
    try {
        const rulesRes = await fetch('data/rules.json');
        gameState.rules = await rulesRes.json();
        
        // Update base stats from JSON if exists
        if(gameState.rules.base_stats) {
             Object.keys(gameState.player.stats).forEach(key => {
                 gameState.player.stats[key] = gameState.rules.base_stats;
             });
        }

        printLine("Chronos Link Established.", 'system');
        setTimeout(() => printLine("Please identify yourself, Traveler.", 'story'), 500);
    } catch (e) {
        console.error(e);
        printLine("Error: Data Stream Corrupted.", 'system');
    }
}

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const val = input.value;
        if(!val) return;
        input.value = '';
        
        // Don't print user input directly, make it feel like a dialogue choice
        // printLine(`> ${val}`, 'system'); 
        processInput(val);
    }
});

function processInput(val) {
    if (gameState.step === 'name') {
        gameState.player.name = val;
        printLine(`Identity Verified: ${val}`, 'system');
        setTimeout(() => {
            printLine("Select your Origin Protocol:", 'story');
            listClasses();
        }, 600);
        gameState.step = 'class';
    } 
    else if (gameState.step === 'class') {
        const choice = parseInt(val) - 1;
        const classes = gameState.rules.backgrounds;
        
        if (classes[choice]) {
            const selected = classes[choice];
            gameState.player.class = selected.id;
            
            // Apply Bonuses to Base Stats
            for (let [key, value] of Object.entries(selected.bonus)) {
                if(gameState.player.stats[key] !== undefined) {
                    gameState.player.stats[key] += value;
                }
            }
            
            printLine(`Protocol Selected: ${selected.name}`, 'system');
            
            // Show the Cool Stat Card
            showStatCard(selected.name, gameState.player.stats);

            printLine("Loading Volume 1...", 'system');
            gameState.step = 'story';
        } else {
            printLine("Invalid Selection. Try again.", 'system');
        }
    }
}

function listClasses() {
    let listHTML = '<div class="stats-grid" style="margin-bottom:20px;">';
    gameState.rules.backgrounds.forEach((bg, index) => {
        listHTML += `
            <div style="margin-bottom:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:5px;">
                <strong style="color:var(--accent)">[${index + 1}] ${bg.name}</strong><br>
                <span style="font-size:0.85em; color:#aaa;">${bg.desc}</span>
            </div>`;
    });
    listHTML += '</div>';
    
    const div = document.createElement('div');
    div.innerHTML = listHTML;
    div.classList.add('msg');
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
}

function showStatCard(className, stats) {
    let html = `
    <div class="stats-card">
        <div style="text-align:center; margin-bottom:15px; font-family:var(--font-head); font-size:1.2em; color:var(--text-primary)">
            ${gameState.player.name} <span style="color:var(--text-secondary)">|</span> <span style="color:var(--accent)">${className}</span>
        </div>
        <div class="stats-grid">`;

    for (let [key, val] of Object.entries(stats)) {
        // Calculate percentage (max 10)
        let pct = (val / 10) * 100;
        let color = '#d4af37'; // Default Gold
        if(val > 7) color = '#4a90e2'; // Blue for high stats
        
        html += `
        <div class="stat-row">
            <div class="stat-label">
                <span>${key}</span>
                <span>${val}</span>
            </div>
            <div class="stat-bar-bg">
                <div class="stat-bar-fill" style="width:${pct}%; background:${color}"></div>
            </div>
        </div>`;
    }
    html += `</div></div>`;

    const div = document.createElement('div');
    div.innerHTML = html;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
}

function printLine(text, type) {
    const p = document.createElement('div');
    p.innerHTML = text; // Allow HTML
    p.classList.add('msg');
    if (type) p.classList.add(type);
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
}

init();
