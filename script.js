let gameState = {
    step: 'mode',
    mode: 'solo',
    player: { name: '', class: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    partner: { name: '', class: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    rules: null,
    story: null,
    storyActive: false,
    waitingForEnter: false
};

const output = document.getElementById('game-output');
const input = document.getElementById('player-input');

async function init() {
    try {
        const rulesRes = await fetch('data/rules.json');
        gameState.rules = await rulesRes.json();
    } catch (e) { console.error("Rules Error:", e); printLine("ERROR: RULES DATA CORRUPTED.", 'system'); }

    // Pre-load story to check for errors immediately
    try {
        const storyRes = await fetch('data/story.json');
        gameState.story = await storyRes.json();
    } catch (e) { console.error("Story Error:", e); printLine("ERROR: STORY JSON INVALID. CHECK CONSOLE.", 'system'); }

    printLine("ARCHIVE SYSTEM CONNECTED.", 'system');
    setTimeout(() => {
        printLine("SELECT NARRATIVE MODE:", 'system');
        printLine("[1] SOLO CHRONICLE", 'story');
        printLine("[2] DUAL CHRONICLE (Two Players)", 'story');
    }, 800);
}

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const val = input.value.trim();
        input.value = '';
        if (gameState.storyActive) { advanceStory(); return; }
        if(!val) return;
        processInput(val);
    }
});

function processInput(val) {
    // 1. MODE SELECTION
    if (gameState.step === 'mode') {
        if (val === '1') {
            gameState.mode = 'solo';
            printLine("MODE: SOLO CHRONICLE.", 'system');
            startCharCreation('player');
        } else if (val === '2') {
            gameState.mode = 'coop';
            printLine("MODE: DUAL CHRONICLE.", 'system');
            startCharCreation('player');
        } else { printLine("Invalid Input.", 'system'); }
    } 
    // 2. PLAYER CREATION
    else if (gameState.step === 'player_name') {
        gameState.player.name = val;
        printLine(`Protagonist 1: <strong>${val}</strong>`, 'story');
        setTimeout(() => { printLine("Select Origin Protocol:", 'system'); listClasses(); }, 500);
        gameState.step = 'player_class';
    }
    else if (gameState.step === 'player_class') {
        if (applyClassSelection(val, 'player')) {
            // LOGIC CHANGE: Ask solo players if they want to customize partner
            if (gameState.mode === 'solo') {
                setTimeout(() => {
                    printLine("Do you wish to manually configure the Secondary Asset? [Y/N]", 'system');
                    gameState.step = 'partner_query';
                }, 800);
            } else {
                setTimeout(() => startCharCreation('partner'), 800);
            }
        }
    }
    // 3. PARTNER QUERY (New Logic)
    else if (gameState.step === 'partner_query') {
        if (val.toLowerCase() === 'y' || val.toLowerCase() === 'yes') {
            startCharCreation('partner');
        } else {
            printLine("Acknowledged. System will auto-assign compatible partner.", 'story');
            autoAssignPartner();
            startGame();
        }
    }
    // 4. PARTNER CREATION
    else if (gameState.step === 'partner_name') {
        gameState.partner.name = val;
        printLine(`Protagonist 2: <strong>${val}</strong>`, 'story');
        setTimeout(() => { printLine("Select Origin Protocol:", 'system'); listClasses(); }, 500);
        gameState.step = 'partner_class';
    }
    else if (gameState.step === 'partner_class') {
        if (applyClassSelection(val, 'partner')) {
            startGame();
        }
    }
}

function startCharCreation(target) {
    if (target === 'player') {
        printLine("ENTER NAME (PROTAGONIST 1):", 'system');
        gameState.step = 'player_name';
    } else {
        printLine("ENTER NAME (PROTAGONIST 2):", 'system');
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
        for (let [key, value] of Object.entries(selected.bonus)) {
            if(targetObj.stats[key] !== undefined) targetObj.stats[key] += value;
        }
        if (target === 'player') showStatCard(selected.name, targetObj.stats, targetObj.name);
        if (target === 'partner') showStatCard(selected.name, targetObj.stats, targetObj.name);
        return true;
    } else {
        printLine("Invalid selection.", 'system');
        return false;
    }
}

function autoAssignPartner() {
    const pClass = gameState.player.class;
    let partnerId = 'adventurer';
    if (pClass.includes('eng')) partnerId = 'artist';
    else if (pClass === 'artist' || pClass === 'popstar') partnerId = 'mech_eng';
    else if (pClass === 'doctor') partnerId = 'athlete';
    else if (pClass === 'athlete') partnerId = 'historian';
    
    gameState.partner.class = partnerId;
    gameState.partner.name = "The Other";
    const selected = gameState.rules.backgrounds.find(c => c.id === partnerId);
    if(selected) {
        for (let [key, value] of Object.entries(selected.bonus)) {
            gameState.partner.stats[key] += value;
        }
    }
}

function startGame() {
    printLine("TIMELINE SYNCHRONIZATION COMPLETE.", 'system');
    setTimeout(() => {
        printLine("<hr style='border:0; border-top:1px solid var(--accent); opacity:0.3; margin:30px 0;'>", 'system'); 
        gameState.storyActive = true;
        loadStoryChapter('chapter_1_p1');
    }, 1000);
}

// --- SYNERGY ---
function showSynergyCard() {
    const p1 = gameState.player.stats;
    const p2 = gameState.partner.stats;
    let synergy = {};
    for (let key in p1) { synergy[key] = p1[key] + p2[key]; }

    let html = `
    <div class="stats-card" style="border-color: var(--text-primary);">
        <div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">
            TEAM SYNERGY
            <div style="font-size:0.6em; color:var(--text-secondary); text-transform:uppercase; margin-top:5px; letter-spacing:2px;">COMBINED POTENTIAL</div>
        </div>
        <div class="stats-grid">`;

    for (let [key, val] of Object.entries(synergy)) {
        let pct = (val / 20) * 100;
        html += `<div class="stat-row"><div class="stat-label"><span>${key}</span><span>${val}/20</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%; background:var(--text-primary);"></div></div></div>`;
    }
    html += `</div></div>`;
    const div = document.createElement('div'); div.innerHTML = html; output.appendChild(div);
}

// --- STORY ENGINE ---
let currentSceneIndex = 0;
let currentChapterData = null;

async function loadStoryChapter(chapterId) {
    // Story is pre-loaded in init(), but check just in case
    if(!gameState.story) return;
    
    currentChapterData = gameState.story[chapterId];
    if(currentChapterData) {
        if(currentChapterData.telemetry) renderTelemetry(currentChapterData);
        if(currentChapterData.show_synergy) showSynergyCard();
        currentSceneIndex = 0;
        playNextScene();
    } else {
        printLine(">> END OF ARCHIVE.", 'system');
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
    const div = document.createElement('div'); div.innerHTML = html; output.appendChild(div);
}

function playNextScene() {
    if (!currentChapterData || currentSceneIndex >= currentChapterData.scenes.length) {
        if (currentChapterData.next_chapter) {
            loadStoryChapter(currentChapterData.next_chapter);
        } else {
            printLine(">> END OF VOLUME 1", 'system');
            gameState.storyActive = false;
        }
        return;
    }

    const scene = currentChapterData.scenes[currentSceneIndex];
    let text = resolveTextVariant(scene.text_blocks, scene.focus);
    
    text = text.replace(/{player}/g, gameState.player.name);
    text = text.replace(/{partner}/g, gameState.partner.name);
    text = formatText(text);
    
    let msgType = 'story'; 
    if (scene.focus === 'ai') msgType = 'ai';
    if (scene.focus === 'system') msgType = 'system';

    gameState.waitingForEnter = true;
    setTimeout(() => {
        printLine(text, msgType);
        currentSceneIndex++;
        if (currentSceneIndex <= currentChapterData.scenes.length || currentChapterData.next_chapter) {
             printLine("<i>(Press Enter...)</i>", 'system');
        }
        gameState.waitingForEnter = false;
    }, 400);
}

function formatText(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function advanceStory() {
    if (gameState.waitingForEnter) return;
    playNextScene();
}

function resolveTextVariant(blocks, focus) {
    let targetClass = gameState.player.class;
    let targetStats = gameState.player.stats;

    if (focus === 'partner') {
        targetClass = gameState.partner.class;
        targetStats = gameState.partner.stats;
    }

    let match = blocks.find(b => b.condition === targetClass);
    if(match) return match.text;

    const sortedStats = Object.keys(targetStats).sort((a,b) => targetStats[b] - targetStats[a]);
    const topStat = sortedStats[0].toLowerCase();
    match = blocks.find(b => b.condition === `high_${topStat}`);
    if(match) return match.text;

    match = blocks.find(b => b.condition === 'default');
    return match ? match.text : "Data Corrupted.";
}

// UI Functions
function listClasses() {
    let listHTML = '<div style="margin-bottom:20px;">';
    gameState.rules.backgrounds.forEach((bg, index) => {
        listHTML += `<div class="class-card"><strong>[${index + 1}] ${bg.name}</strong><span>${bg.desc}</span></div>`;
    });
    listHTML += '</div>';
    const div = document.createElement('div'); div.innerHTML = listHTML; div.classList.add('msg'); output.appendChild(div); scrollToBottom();
}
function showStatCard(className, stats, name) {
    let html = `<div class="stats-card"><div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">${name}<div style="font-size:0.6em; color:var(--accent); text-transform:uppercase; margin-top:5px; letter-spacing:2px;">${className}</div></div><div class="stats-grid">`;
    for (let [key, val] of Object.entries(stats)) { let pct = (val/10)*100; html += `<div class="stat-row"><div class="stat-label"><span>${key}</span><span>${val}/10</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%"></div></div></div>`; }
    html += `</div></div>`;
    const div = document.createElement('div'); div.innerHTML = html; output.appendChild(div); scrollToBottom();
}
function printLine(text, type) { const p = document.createElement('div'); p.innerHTML = text; p.classList.add('msg'); if (type) p.classList.add(type); output.appendChild(p); scrollToBottom(); }
function scrollToBottom() { setTimeout(() => { output.scrollTop = output.scrollHeight; }, 50); }

// Theme Toggler
const themeBtn = document.getElementById('theme-toggle');
if(themeBtn) { themeBtn.addEventListener('click', function() { document.body.classList.toggle('light-mode'); }); }
init();
