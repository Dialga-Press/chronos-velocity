let gameState = {
    step: 'mode', // Start with mode selection
    mode: 'solo', // 'solo' or 'coop'
    player: {
        name: '',
        class: '',
        stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 }
    },
    partner: {
        name: 'Unknown',
        class: 'default', // Will be assigned
        stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 }
    },
    rules: null,
    story: null,
    storyActive: false,
    waitingForEnter: false // Prevents skipping text too fast
};

const output = document.getElementById('game-output');
const input = document.getElementById('player-input');

async function init() {
    try {
        const rulesRes = await fetch('data/rules.json');
        gameState.rules = await rulesRes.json();
    } catch (e) {
        console.error("Failed to load data", e);
    }

    printLine("SYSTEM CONNECTED.", 'system');
    setTimeout(() => {
        printLine("SELECT OPERATION MODE:", 'system');
        printLine("[1] SOLO SYNC (System assigns compatible partner)", 'story');
        printLine("[2] DUAL LINK (Manual partner configuration)", 'story');
    }, 800);
}

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const val = input.value.trim();
        input.value = '';
        
        // If we are reading story, ANY key advances, we don't need text
        if (gameState.storyActive) {
            advanceStory();
            return;
        }

        if(!val) return;
        processInput(val);
    }
});

function processInput(val) {
    // --- 1. MODE SELECTION ---
    if (gameState.step === 'mode') {
        if (val === '1') {
            gameState.mode = 'solo';
            printLine("MODE: SOLO SYNC SELECTED.", 'system');
            startCharCreation('player');
        } else if (val === '2') {
            gameState.mode = 'coop';
            printLine("MODE: DUAL LINK SELECTED.", 'system');
            startCharCreation('player');
        } else {
            printLine("Invalid Input. Enter 1 or 2.", 'system');
        }
    } 
    
    // --- 2. PLAYER CREATION ---
    else if (gameState.step === 'player_name') {
        gameState.player.name = val;
        printLine(`Identity Verified: <strong>${val}</strong>`, 'story');
        setTimeout(() => {
            printLine("Select Your Origin Protocol:", 'system');
            listClasses();
        }, 500);
        gameState.step = 'player_class';
    }
    else if (gameState.step === 'player_class') {
        if (applyClassSelection(val, 'player')) {
            if (gameState.mode === 'coop') {
                printLine("PLAYER 1 REGISTERED.", 'system');
                setTimeout(() => startCharCreation('partner'), 800);
            } else {
                autoAssignPartner();
                startGame();
            }
        }
    }

    // --- 3. PARTNER CREATION (Co-op Only) ---
    else if (gameState.step === 'partner_name') {
        gameState.partner.name = val;
        printLine(`Partner Identity: <strong>${val}</strong>`, 'story');
        setTimeout(() => {
            printLine("Select Partner's Origin Protocol:", 'system');
            listClasses();
        }, 500);
        gameState.step = 'partner_class';
    }
    else if (gameState.step === 'partner_class') {
        if (applyClassSelection(val, 'partner')) {
            startGame();
        }
    }
}

// --- HELPER FUNCTIONS ---

function startCharCreation(target) {
    if (target === 'player') {
        printLine("ENTER YOUR NAME:", 'system');
        gameState.step = 'player_name';
    } else {
        printLine("ENTER PARTNER'S NAME:", 'system');
        gameState.step = 'partner_name';
    }
}

function applyClassSelection(val, target) {
    const choice = parseInt(val) - 1;
    const classes = gameState.rules.backgrounds;
    
    if (classes[choice]) {
        const selected = classes[choice];
        const targetObj = (target === 'player') ? gameState.player : gameState.partner;
        
        targetObj.class = selected.id;
        
        // Apply Bonuses
        for (let [key, value] of Object.entries(selected.bonus)) {
            if(targetObj.stats[key] !== undefined) {
                targetObj.stats[key] += value;
            }
        }
        
        // Show Card
        if (target === 'player') showStatCard(selected.name, targetObj.stats, targetObj.name);
        // We don't show partner card immediately to save screen space, but we could.
        
        return true;
    } else {
        printLine("Invalid selection.", 'system');
        return false;
    }
}

function autoAssignPartner() {
    // Simple logic: Pick a class that balances the player
    // If Player is Tech, Partner is Arts/Guts.
    const pClass = gameState.player.class;
    let partnerId = 'adventurer'; // Default fallback
    
    if (pClass.includes('eng')) partnerId = 'artist';
    else if (pClass === 'artist' || pClass === 'popstar') partnerId = 'mech_eng';
    else if (pClass === 'doctor') partnerId = 'athlete';
    else if (pClass === 'athlete') partnerId = 'historian';
    
    gameState.partner.class = partnerId;
    gameState.partner.name = "Traveler B"; // Generic name
    
    // Apply stats for the ghost partner
    const classes = gameState.rules.backgrounds;
    const selected = classes.find(c => c.id === partnerId);
    if(selected) {
        for (let [key, value] of Object.entries(selected.bonus)) {
            gameState.partner.stats[key] += value;
        }
    }
}

function startGame() {
    printLine("SYNCHRONIZATION COMPLETE.", 'system');
    setTimeout(() => {
        printLine("<hr style='border:0; border-top:1px solid var(--accent); opacity:0.3; margin:30px 0;'>", 'system'); 
        gameState.storyActive = true;
        loadStoryChapter('chapter_1');
    }, 1000);
}

// --- STORY ENGINE ---

let currentSceneIndex = 0;
let currentChapterData = null;

async function loadStoryChapter(chapterId) {
    if(!gameState.story) {
        try {
            const res = await fetch('data/story.json');
            gameState.story = await res.json();
        } catch(e) { return; }
    }
    
    currentChapterData = gameState.story[chapterId];
    
    if(currentChapterData) {
        renderTelemetry(currentChapterData);
        currentSceneIndex = 0;
        playNextScene();
    } else {
        printLine(">> NULL POINTER EXCEPTION: End of Content.", 'system');
        gameState.storyActive = false;
    }
}

function renderTelemetry(chapter) {
    const hr = `<hr style='border:0; border-top:1px solid var(--accent); opacity:0.3; margin:40px 0;'>`;
    let html = `
    ${hr}
    <div style="text-align:center; margin-bottom:30px; letter-spacing:1px;">
        <div style="font-family:var(--font-head); font-size:1.5em; color:var(--accent); margin-bottom:10px;">
            ${chapter.title}
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.75em; color:var(--text-secondary); font-family:var(--font-body); text-transform:uppercase;">
            <div style="text-align:right; border-right:1px solid var(--border-color); padding-right:15px;">
                <div>LOC: ${chapter.telemetry.loc}</div>
                <div>COORDS: ${chapter.telemetry.coords}</div>
            </div>
            <div style="text-align:left; padding-left:15px;">
                <div>DATE: ${chapter.telemetry.time}</div>
                <div>COND: ${chapter.telemetry.weather}</div>
            </div>
        </div>
    </div>`;
    
    const div = document.createElement('div');
    div.innerHTML = html;
    output.appendChild(div);
}

function playNextScene() {
    // Check if chapter is done
    if (!currentChapterData || currentSceneIndex >= currentChapterData.scenes.length) {
        if (currentChapterData.next_chapter) {
            // Auto-load next chapter? Or wait for input?
            // Let's load automatically for smooth flow
            loadStoryChapter(currentChapterData.next_chapter);
        } else {
            printLine(">> END OF VOLUME 1 DEMO", 'system');
            gameState.storyActive = false;
        }
        return;
    }

    const scene = currentChapterData.scenes[currentSceneIndex];
    let text = resolveTextVariant(scene.text_blocks);
    
    // Format Text (Replace placeholders)
    text = text.replace(/{player}/g, gameState.player.name);
    text = text.replace(/{partner}/g, gameState.partner.name);
    
    // Delay for effect
    gameState.waitingForEnter = true; // Lock input until printed
    setTimeout(() => {
        printLine(text, 'story');
        currentSceneIndex++;
        
        // Always show "Press Enter" if there is more content or a next chapter
        if (currentSceneIndex <= currentChapterData.scenes.length || currentChapterData.next_chapter) {
             printLine("<i>(Press Enter to continue...)</i>", 'system');
        }
        gameState.waitingForEnter = false; // Unlock
    }, 400);
}

function advanceStory() {
    if (gameState.waitingForEnter) return; // Prevent skipping
    playNextScene();
}

function resolveTextVariant(blocks) {
    // 1. Check Player Class
    let match = blocks.find(b => b.condition === gameState.player.class);
    if(match) return match.text;

    // 2. Check Partner Class (if story block allows checking partner)
    // You can add "partner_mech_eng" to JSON conditions if you want specific partner text

    // 3. High Stat Match
    const stats = gameState.player.stats;
    const sortedStats = Object.keys(stats).sort((a,b) => stats[b] - stats[a]);
    const topStat = sortedStats[0].toLowerCase();
    
    match = blocks.find(b => b.condition === `high_${topStat}`);
    if(match) return match.text;

    // 4. Default
    match = blocks.find(b => b.condition === 'default');
    return match ? match.text : "Data Corrupted.";
}

// --- UI UTILS ---
function listClasses() {
    let listHTML = '<div style="margin-bottom:20px;">';
    gameState.rules.backgrounds.forEach((bg, index) => {
        listHTML += `
            <div class="class-card">
                <strong>[${index + 1}] ${bg.name}</strong>
                <span>${bg.desc}</span>
            </div>`;
    });
    listHTML += '</div>';
    const div = document.createElement('div');
    div.innerHTML = listHTML;
    div.classList.add('msg');
    output.appendChild(div);
    scrollToBottom();
}

function showStatCard(className, stats, name) {
    let html = `
    <div class="stats-card">
        <div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">
            ${name}
            <div style="font-size:0.6em; color:var(--accent); text-transform:uppercase; margin-top:5px; letter-spacing:2px;">${className}</div>
        </div>
        <div class="stats-grid">`;

    for (let [key, val] of Object.entries(stats)) {
        let pct = (val / 10) * 100;
        html += `
        <div class="stat-row">
            <div class="stat-label"><span>${key}</span><span>${val}/10</span></div>
            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    }
    html += `</div></div>`;
    const div = document.createElement('div');
    div.innerHTML = html;
    output.appendChild(div);
    scrollToBottom();
}

function printLine(text, type) {
    const p = document.createElement('div');
    p.innerHTML = text;
    p.classList.add('msg');
    if (type) p.classList.add(type);
    output.appendChild(p);
    scrollToBottom();
}

function scrollToBottom() {
    setTimeout(() => { output.scrollTop = output.scrollHeight; }, 50);
}

init();
