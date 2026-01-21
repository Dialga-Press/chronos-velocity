let gameState = {
    step: 'mode',
    mode: 'solo',
    player: { name: '', class: '', age: '', gender: '', origin: '', height: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    partner: { name: '', class: '', age: '', gender: '', origin: '', height: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    rules: null,
    story: null,
    storyActive: false,
    waitingForEnter: false,
    currentInputType: null,
    driver: '',
    passenger: '',
    history: [] 
};

const output = document.getElementById('game-output');
const input = document.getElementById('player-input');

async function init() {
    try { const r = await fetch('data/rules.json'); gameState.rules = await r.json(); } catch (e) {}
    try { const s = await fetch('data/story.json'); gameState.story = await s.json(); } catch (e) {}

    printLine("ARCHIVE SYSTEM CONNECTED.", 'system');
    setTimeout(() => {
        printLine("SELECT NARRATIVE MODE:", 'system');
        printLine("[1] SOLO CHRONICLE", 'story');
        printLine("[2] DUAL CHRONICLE", 'story');
    }, 800);
}

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const val = input.value.trim();
        input.value = '';
        
        if (gameState.step === 'story_input') { handleStoryInput(val); return; }
        if (gameState.storyActive) { advanceStory(); return; }
        if (val) processInput(val);
    }
});

// --- FIXED BACK BUTTON ---
function goBack() {
    // We can only go back if we are inside the story and not at the very start
    if (!gameState.storyActive || currentSceneIndex <= 0) return;

    // 1. Remove the last visual message (The text we just read)
    // We loop to remove 'system' messages (like "Press Enter") + the actual Story block
    let removedStoryBlock = false;
    while(output.lastChild && !removedStoryBlock) {
        const classList = output.lastChild.classList;
        output.removeChild(output.lastChild);
        
        // If we removed a story/ai block, stop. We keep removing system messages/HRs until we hit text.
        if (classList.contains('story') || classList.contains('ai')) {
            removedStoryBlock = true;
        }
    }

    // 2. Decrement Index
    currentSceneIndex--;
    if (currentSceneIndex < 0) currentSceneIndex = 0;

    // 3. Check if the scene we went back to WAS an input scene
    const scene = currentChapterData.scenes[currentSceneIndex];
    
    if (scene.input_prompt) {
        // Re-enable Input Mode
        gameState.step = 'story_input';
        gameState.currentInputType = scene.input_prompt;
        
        if (scene.input_prompt === 'height') input.placeholder = "E.g., 5'11 or 180";
        else input.placeholder = `Enter ${scene.input_prompt}...`;
        
        // Remove the prompt text too, so it doesn't duplicate when playNextScene redraws it
        if(output.lastChild) output.removeChild(output.lastChild);
        
        // Replay the scene to show the prompt again
        playNextScene(false); 
    } else {
        // Normal text scene, just reset state so user can press Enter to advance again
        gameState.step = 'reading';
        gameState.currentInputType = null;
        input.placeholder = "Write your response...";
        gameState.waitingForEnter = false; // Allow them to press enter immediately
        
        // We don't re-print the text (it's gone), we just wait for them to press enter to "Read it again" 
        // Actually, to make it look right, we should re-print it.
        playNextScene(false);
    }
}

function processInput(val) {
    if (gameState.step === 'mode') {
        if (val === '1') { gameState.mode = 'solo'; startCharCreation('player'); }
        else if (val === '2') { gameState.mode = 'coop'; startCharCreation('player'); }
    } else if (gameState.step.includes('_name')) {
        let t = gameState.step.split('_')[0];
        gameState[t].name = val;
        printLine(`${t.toUpperCase()} ID: ${val}`, 'story');
        setTimeout(listClasses, 500);
        gameState.step = t + '_class';
    } else if (gameState.step.includes('_class')) {
        let t = gameState.step.split('_')[0];
        if (applyClassSelection(val, t)) {
            if(t==='player' && gameState.mode === 'solo') {
                 setTimeout(() => { printLine("Configure Partner? [Y/N]", 'system'); gameState.step = 'partner_query'; }, 500);
            } else if (t==='player') { startCharCreation('partner'); }
            else { startGame(); }
        }
    } else if (gameState.step === 'partner_query') {
        if(val.toLowerCase().startsWith('y')) startCharCreation('partner');
        else { autoAssignPartner(); startGame(); }
    }
}

// ... (Char Creation Helpers) ...
function startCharCreation(target) {
    printLine(target === 'player' ? "ENTER NAME (PROTAGONIST 1):" : "ENTER NAME (PROTAGONIST 2):", 'system');
    gameState.step = target + '_name';
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
        showStatCard(selected.name, targetObj.stats, targetObj.name);
        return true;
    }
    return false;
}
function autoAssignPartner() {
    gameState.partner.class = 'adventurer'; gameState.partner.name = "The Other";
}
function startGame() {
    printLine("TIMELINE SYNCHRONIZATION COMPLETE.", 'system');
    setTimeout(() => { printLine("<hr style='opacity:0.3'>", 'system'); gameState.storyActive = true; loadStoryChapter('chapter_1_p1'); }, 1000);
}

// --- STORY ENGINE ---
let currentSceneIndex = 0;
let currentChapterData = null;

async function loadStoryChapter(chapterId) {
    if(!gameState.story) return;
    currentChapterData = gameState.story[chapterId];
    if(currentChapterData) {
        if(currentChapterData.telemetry) renderTelemetry(currentChapterData);
        if(currentChapterData.show_synergy) showSynergyCard();
        currentSceneIndex = 0;
        playNextScene();
    }
}

function renderTelemetry(chapter) {
    const hr = `<hr style='border:0; border-top:1px solid var(--accent); opacity:0.3; margin:40px 0;'>`;
    let html = `${hr}<div style="text-align:center; margin-bottom:30px; letter-spacing:1px;"><div style="font-family:var(--font-head); font-size:1.5em; color:var(--accent); margin-bottom:10px;">${chapter.title}</div><div style="font-size:0.75em; color:var(--text-secondary); text-transform:uppercase;">LOC: ${chapter.telemetry.loc} // DATE: ${chapter.telemetry.time}</div></div>`;
    const div = document.createElement('div'); div.innerHTML = html; output.appendChild(div);
}

function playNextScene(saveHistory = true) {
    if (!currentChapterData || currentSceneIndex >= currentChapterData.scenes.length) {
        if (currentChapterData.next_chapter) loadStoryChapter(currentChapterData.next_chapter);
        else { printLine(">> TO BE CONTINUED...", 'system'); gameState.storyActive = false; }
        return;
    }

    const scene = currentChapterData.scenes[currentSceneIndex];
    
    // SKIP LOGIC
    if (scene.mode_req && scene.mode_req !== gameState.mode) {
        currentSceneIndex++;
        playNextScene(saveHistory);
        return;
    }

    // INPUT LOGIC
    if (scene.input_prompt) {
        let promptText = resolveTextVariant(scene.text_blocks, scene.focus);
        printLine(replacePlaceholders(promptText), scene.focus === 'ai' ? 'ai' : 'story');
        gameState.step = 'story_input';
        gameState.currentInputType = scene.input_prompt;
        
        if (scene.input_prompt === 'height') input.placeholder = "E.g., 5'11 or 180";
        else input.placeholder = `Enter ${scene.input_prompt}...`;
        return; 
    }

    let text = resolveTextVariant(scene.text_blocks, scene.focus);
    text = replacePlaceholders(text);
    
    let msgType = scene.focus === 'ai' ? 'ai' : (scene.focus === 'system' ? 'system' : 'story');

    gameState.waitingForEnter = true;
    setTimeout(() => {
        printLine(text, msgType);
        currentSceneIndex++;
        if (currentSceneIndex <= currentChapterData.scenes.length) {
             printLine("<i>(Press Enter...)</i>", 'system');
        }
        gameState.waitingForEnter = false;
    }, 400);
}

function handleStoryInput(val) {
    const type = gameState.currentInputType;
    
    // --- DRIVER LOGIC FIX ---
    if (type === 'shotgun') { 
        let inputName = val.toLowerCase();
        let p1Name = gameState.player.name.toLowerCase();
        
        // "I call Shotgun" = I am Passenger.
        if (inputName.includes(p1Name)) { 
            gameState.passenger = gameState.player.name; 
            gameState.driver = gameState.partner.name; 
        } 
        else { 
            gameState.passenger = gameState.partner.name; 
            gameState.driver = gameState.player.name; 
        }
        printLine(`>> DRIVER DESIGNATED: ${gameState.driver.toUpperCase()}`, 'system');
    } 
    else {
        printLine(`>> DATA LOGGED: ${val.toUpperCase()}`, 'system');
        if (typeof processBioInput === "function") processBioInput(type, val);
    }
    
    gameState.step = 'reading';
    gameState.currentInputType = null;
    input.placeholder = "Write your response...";
    currentSceneIndex++;
    playNextScene();
}

function advanceStory() { if (!gameState.waitingForEnter) playNextScene(); }

function replacePlaceholders(text) {
    text = text.replace(/{player}/g, gameState.player.name);
    text = text.replace(/{partner}/g, gameState.partner.name);
    // Fallback if driver not set yet
    text = text.replace(/{driver}/g, gameState.driver || gameState.player.name);
    text = text.replace(/{passenger}/g, gameState.passenger || gameState.partner.name);
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return text;
}

// ... (Rest of UI functions) ...
function resolveTextVariant(blocks, focus) {
    let targetClass = gameState.player.class;
    let targetStats = gameState.player.stats;
    if (focus === 'partner') { targetClass = gameState.partner.class; targetStats = gameState.partner.stats; }
    let match = blocks.find(b => b.condition === targetClass);
    if(match) return match.text;
    const sortedStats = Object.keys(targetStats).sort((a,b) => targetStats[b] - targetStats[a]);
    const topStat = sortedStats[0].toLowerCase();
    match = blocks.find(b => b.condition === `high_${topStat}`);
    if(match) return match.text;
    match = blocks.find(b => b.condition === 'default');
    return match ? match.text : "Data Corrupted.";
}
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
function showSynergyCard() {
    const p1 = gameState.player.stats;
    const p2 = gameState.partner.stats;
    let synergy = {};
    for (let key in p1) { synergy[key] = p1[key] + p2[key]; }
    let html = `<div class="stats-card" style="border-color: var(--text-primary);"><div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">TEAM SYNERGY<div style="font-size:0.6em; color:var(--text-secondary); text-transform:uppercase; margin-top:5px; letter-spacing:2px;">COMBINED POTENTIAL</div></div><div class="stats-grid">`;
    for (let [key, val] of Object.entries(synergy)) { let pct = (val/20)*100; html += `<div class="stat-row"><div class="stat-label"><span>${key}</span><span>${val}/20</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%; background:var(--text-primary);"></div></div></div>`; }
    html += `</div></div>`;
    const div = document.createElement('div'); div.innerHTML = html; output.appendChild(div);
}
function printLine(text, type) { const p = document.createElement('div'); p.innerHTML = text; p.classList.add('msg'); if (type) p.classList.add(type); output.appendChild(p); scrollToBottom(); }
function scrollToBottom() { setTimeout(() => { output.scrollTop = output.scrollHeight; }, 50); }
const themeBtn = document.getElementById('theme-toggle');
if(themeBtn) { themeBtn.addEventListener('click', function() { document.body.classList.toggle('light-mode'); }); }
init();
