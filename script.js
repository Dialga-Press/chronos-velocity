let gameState = {
    step: 'boot',
    mode: 'solo',
    player: { name: '', class: '', age: '', gender: '', origin: '', height: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    partner: { name: '', class: '', age: '', gender: '', origin: '', height: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    rules: null,
    story: null,
    storyActive: false,
    waitingForEnter: false,
    waitingForChoice: false,
    currentInputType: null,
    currentChoices: null,
    driver: '',
    passenger: '',
    inventory: [],
    citationsShown: false,
    history: [],
    isTyping: false,
    skipTyping: false,
    typingSpeed: 25,
    typingSpeedAI: 40
};

const output = document.getElementById('game-output');
const input = document.getElementById('player-input');

// --- INITIALIZATION ---
async function init() {
    try { 
        const r = await fetch('data/rules.json'); 
        if(!r.ok) throw new Error("Rules file missing");
        gameState.rules = await r.json(); 
        
        const s = await fetch('data/story.json'); 
        if(!s.ok) throw new Error("Story file missing");
        gameState.story = await s.json(); 
    } catch (e) { 
        printLine(`CRITICAL ERROR: ${e.message}`, 'system', false); 
        return;
    }

    // Check for Save
    if (typeof StorageManager !== 'undefined' && StorageManager.hasSave()) {
        gameState.step = 'main_menu';
        setTimeout(() => {
            printLine("EXISTING TIMELINE DETECTED.", 'system', false);
            printLine("[1] RESUME SYNCHRONIZATION", 'story', false);
            printLine("[2] INITIATE NEW TIMELINE", 'story', false);
        }, 500);
    } else { 
        triggerNewGameMenu(); 
    }
}

function triggerNewGameMenu() {
    gameState.step = 'mode_select';
    setTimeout(() => {
        printLine("SELECT NARRATIVE MODE:", 'system', false);
        printLine("[1] SOLO CHRONICLE", 'story', false);
        printLine("[2] DUAL CHRONICLE", 'story', false);
    }, 500);
}

// --- ROBUST INPUT HANDLING ---
input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        // 1. TYPING INTERRUPT
        // If text is animating, Enter simply finishes the animation.
        // CRITICAL FIX: We do NOT clear input.value here.
        if (gameState.isTyping) { 
            gameState.skipTyping = true; 
            e.preventDefault();
            return; 
        }

        const val = input.value.trim();
        
        // 2. CHOICE SELECTION (Buttons active)
        if (gameState.waitingForChoice) {
            input.value = '';
            if(val) handleChoiceInput(val);
            return;
        }

        // 3. STORY INPUT (Bio-Metric / Shotgun)
        if (gameState.step === 'story_input') { 
            if(!val) return; // Don't submit empty
            input.value = '';
            handleStoryInput(val); 
            return; 
        }

        // 4. ADVANCE STORY (Reading mode)
        if (gameState.storyActive) { 
            input.value = '';
            advanceStory(); 
            return; 
        }

        // 5. SYSTEM MENU INPUT (Mode select, etc)
        if (val) {
            input.value = '';
            processInput(val);
        }
    }
});

// --- MENU LOGIC ---
function processInput(val) {
    // MAIN MENU
    if (gameState.step === 'main_menu') {
        if (val === '1') loadGame();
        else if (val === '2') { StorageManager.clear(); triggerNewGameMenu(); }
        else printLine("Invalid Input. Enter 1 or 2.", 'system');
    }
    // MODE SELECT
    else if (gameState.step === 'mode_select') {
        if (val === '1') { gameState.mode = 'solo'; startCharCreation('player'); }
        else if (val === '2') { gameState.mode = 'coop'; startCharCreation('player'); }
        else printLine("Invalid Mode. Enter 1 or 2.", 'system');
    } 
    // NAME INPUT
    else if (gameState.step.includes('_name')) {
        let t = gameState.step.split('_')[0];
        gameState[t].name = val;

        // Easter Egg Checks
        if (t === 'player' && val.toLowerCase() === 'lava') {
            printLine("... IDENTITY FLAGGED.", 'system');
            setTimeout(() => {
                printLine("Is <strong>Beeth</strong> with you? [Y/N]", 'ai');
                gameState.step = 'easter_egg_check';
            }, 600);
            return;
        }
        if (t === 'partner') {
            const p1 = gameState.player.name.toLowerCase();
            const p2 = val.toLowerCase();
            if ((p1 === 'beeth' && p2 === 'lava') || (p1 === 'lava' && p2 === 'beeth')) {
                triggerConfettiEvent();
            }
        }

        printLine(`${t.toUpperCase()} ID: ${val}`, 'story');
        setTimeout(listClasses, 500);
        gameState.step = t + '_class';
    } 
    // EASTER EGG LOGIC
    else if (gameState.step === 'easter_egg_check') {
        if (val.toLowerCase().startsWith('y')) {
            gameState.partner.name = 'Beeth';
            triggerConfettiEvent();
            gameState.mode = 'coop'; 
            printLine(`Protagonist 1: <strong>Lava</strong>`, 'story');
            setTimeout(listClasses, 1000);
            gameState.step = 'player_class';
        } else {
            printLine(`Protagonist 1: <strong>Lava</strong>`, 'story');
            setTimeout(listClasses, 500);
            gameState.step = 'player_class';
        }
    }
    // CLASS INPUT
    else if (gameState.step.includes('_class')) {
        let t = gameState.step.split('_')[0];
        if (applyClassSelection(val, t)) {
            if(t === 'player') {
                if (gameState.mode === 'solo') {
                     setTimeout(() => { printLine("Configure Secondary Asset? [Y/N]", 'system'); gameState.step = 'partner_query'; }, 500);
                } else {
                    // Coop: Check if partner name exists
                    if (gameState.partner.name && gameState.partner.name !== '') {
                        printLine(`Protagonist 2: <strong>${gameState.partner.name}</strong>`, 'story');
                        setTimeout(() => { printLine("Select Origin Protocol:", 'system'); listClasses(); }, 500);
                        gameState.step = 'partner_class';
                    } else {
                        startCharCreation('partner');
                    }
                }
            } else { 
                startGame(); 
            }
        }
    } 
    // PARTNER QUERY
    else if (gameState.step === 'partner_query') {
        if(val.toLowerCase().startsWith('y')) startCharCreation('partner');
        else { autoAssignPartner(); startGame(); }
    }
}

// --- CORE HELPERS ---
function startCharCreation(target) {
    printLine(target === 'player' ? "ENTER NAME (PROTAGONIST 1):" : "ENTER NAME (PROTAGONIST 2):", 'system');
    gameState.step = target + '_name';
}
function applyClassSelection(val, target) {
    const choice = parseInt(val) - 1;
    if(!gameState.rules) return false;
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
    printLine("Invalid Selection. Please enter the number.", 'system');
    return false;
}
function autoAssignPartner() {
    gameState.partner.class = 'adventurer'; gameState.partner.name = "The Other";
}
function startGame() {
    printLine("TIMELINE SYNCHRONIZATION COMPLETE.", 'system');
    setTimeout(() => { printLine("<hr style='opacity:0.3'>", 'system', false); gameState.storyActive = true; loadStoryChapter('chapter_1_p1'); }, 1000);
}

function loadGame() {
    const data = StorageManager.load();
    if (!data) { printLine("ERROR: SAVE CORRUPT.", 'system'); triggerNewGameMenu(); return; }
    Object.assign(gameState, data);
    gameState.storyActive = true;
    printLine("RESTORING TIMELINE...", 'system');
    loadStoryChapter(data.currentChapterId, false);
    updateUI();
}

// --- STORY ENGINE ---
let currentSceneIndex = 0;
let currentChapterData = null;

async function loadStoryChapter(chapterId, resetIndex = true) {
    if(!gameState.story) return;
    currentChapterData = gameState.story[chapterId];
    if(currentChapterData) {
        if (resetIndex || gameState.step === 'main_menu') {
            if(currentChapterData.telemetry) renderTelemetry(currentChapterData);
            if(currentChapterData.show_synergy) showSynergyCard();
        }
        if (resetIndex) currentSceneIndex = 0;
        else currentSceneIndex = gameState.currentSceneIndex;
        playNextScene(false);
    } else {
        printLine(">> END OF ARCHIVE.", 'system');
        gameState.storyActive = false;
    }
}

function playNextScene(saveHistory = true) {
    if (gameState.isTyping) return; // Safety Block

    if (!currentChapterData || currentSceneIndex >= currentChapterData.scenes.length) {
        if (currentChapterData.sources && !gameState.citationsShown) {
            printLine("<br><strong style='color:var(--accent); letter-spacing:1px;'>>> HISTORICAL ARCHIVE:</strong>", 'system', false);
            currentChapterData.sources.forEach(src => {
                printLine(`<a href="${src.link}" target="_blank" style="color:var(--text-secondary); text-decoration:none; border-bottom:1px dotted var(--accent); font-size:0.9em; display:block; margin-bottom:5px;">[📄] ${src.title}</a>`, 'system', false);
            });
            gameState.citationsShown = true;
            printLine("<i>(Press Enter to continue...)</i>", 'system', false);
            return; 
        }
        gameState.citationsShown = false;

        if (currentChapterData.next_chapter) loadStoryChapter(currentChapterData.next_chapter);
        else { printLine(">> TO BE CONTINUED...", 'system'); gameState.storyActive = false; }
        return;
    }

    const scene = currentChapterData.scenes[currentSceneIndex];
    
    if (currentChapterData.id && typeof StorageManager !== 'undefined') StorageManager.save(gameState, currentChapterData.id, currentSceneIndex);
    if (saveHistory) gameState.history.push({ chapterId: currentChapterData.id, index: currentSceneIndex });

    if (scene.mode_req && scene.mode_req !== gameState.mode) {
        if(saveHistory) gameState.history.pop();
        currentSceneIndex++;
        playNextScene(saveHistory);
        return;
    }

    // Input Prompt
    if (scene.input_prompt) {
        let promptText = resolveTextVariant(scene.text_blocks, scene.focus);
        printLine(replacePlaceholders(promptText), scene.focus === 'ai' ? 'ai' : 'story').then(() => {
            gameState.step = 'story_input';
            gameState.currentInputType = scene.input_prompt;
            input.placeholder = scene.input_prompt === 'height' ? "E.g., 5'11 or 180" : `Enter ${scene.input_prompt}...`;
        });
        return; 
    }

    // Choices
    if (scene.choices) {
        let text = resolveTextVariant(scene.text_blocks, scene.focus);
        printLine(replacePlaceholders(text), scene.focus === 'ai' ? 'ai' : 'story').then(() => {
            renderChoices(scene.choices);
        });
        return;
    }

    let text = resolveTextVariant(scene.text_blocks, scene.focus);
    text = replacePlaceholders(text);
    text = formatText(text);
    let msgType = scene.focus === 'ai' ? 'ai' : (scene.focus === 'system' ? 'system' : 'story');

    printLine(text, msgType).then(() => {
        if (scene.image) {
            const imgHTML = `<div class="story-image-container"><img src="${scene.image}" class="story-image">${scene.image_caption ? `<div class="image-caption">${scene.image_caption}</div>` : ''}${scene.image_source ? `<div class="image-source">SOURCE: ${scene.image_source}</div>` : ''}</div>`;
            const div = document.createElement('div'); div.innerHTML = imgHTML; output.appendChild(div);
            scrollToBottom();
        }
        currentSceneIndex++;
        if (currentSceneIndex <= currentChapterData.scenes.length || currentChapterData.next_chapter) {
             printLine("<i>(Press Enter...)</i>", 'system', false);
        }
        gameState.waitingForEnter = false;
    });
}

// --- CHOICES & LOGIC ---
function renderChoices(choices) {
    gameState.waitingForChoice = true;
    gameState.currentChoices = choices;
    let html = `<div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">`;
    choices.forEach((choice, index) => {
        let disabled = false;
        let reason = "";
        if (choice.req) {
            let statVal = gameState.player.stats[choice.req.stat] || 0;
            if (!statVal) { const map = { 'tech': 'Tech', 'arts': 'Arts', 'guts': 'Guts', 'social': 'Social', 'bio': 'Bio', 'lore': 'Lore' }; statVal = gameState.player.stats[map[choice.req.stat]] || 0; }
            if (statVal < choice.req.val) { disabled = true; reason = ` [REQ: ${choice.req.stat} ${choice.req.val}]`; }
        }
        const style = disabled ? `opacity:0.5; cursor:not-allowed; border-color:#555; color:#555;` : `cursor:pointer; border-color:var(--accent); color:var(--text-story);`;
        html += `<button onclick="makeChoice(${index})" ${disabled ? 'disabled' : ''} style="background:var(--input-bg); border:1px solid; padding:15px; text-align:left; font-family:var(--font-ui); font-size:1rem; transition:all 0.2s; ${style}" onmouseover="this.style.background='var(--selection-bg)'" onmouseout="this.style.background='var(--input-bg)'"><strong style="color:var(--accent)">[${index + 1}]</strong> ${choice.text} ${reason}</button>`;
    });
    html += `</div>`;
    const div = document.createElement('div'); div.innerHTML = html; output.appendChild(div); scrollToBottom();
}

function makeChoice(index) {
    if (!gameState.waitingForChoice) return;
    const choice = gameState.currentChoices[index];
    if (choice.loot) { 
        if(!gameState.inventory) gameState.inventory = [];
        gameState.inventory.push(choice.loot); 
        printLine(`>> ACQUIRED: ${choice.loot.name.toUpperCase()}`, 'system'); 
        updateUI(); 
    }
    if(output.lastChild.innerHTML.includes('<button')) output.removeChild(output.lastChild);
    printLine(`>> SELECTED: ${choice.text}`, 'system');
    gameState.waitingForChoice = false; gameState.currentChoices = null;
    if (choice.target) loadStoryChapter(choice.target);
    else { currentSceneIndex++; playNextScene(); }
}

function handleChoiceInput(val) {
    const idx = parseInt(val) - 1;
    if (gameState.currentChoices && gameState.currentChoices[idx]) {
        // Add basic check here or allow UI to handle
        makeChoice(idx);
    }
}

// --- UTILS ---
function handleStoryInput(val) {
    const type = gameState.currentInputType;
    if (type === 'shotgun') { 
        let inputName = val.toLowerCase();
        let p1Name = gameState.player.name.toLowerCase();
        if (inputName.includes(p1Name)) { gameState.passenger = gameState.player.name; gameState.driver = gameState.partner.name; } 
        else { gameState.passenger = gameState.partner.name; gameState.driver = gameState.player.name; }
        printLine(`>> DRIVER DESIGNATED: ${gameState.driver.toUpperCase()}`, 'system');
    } else {
        printLine(`>> DATA LOGGED: ${val.toUpperCase()}`, 'system');
        if (typeof processBioInput === "function") processBioInput(type, val);
        if(gameState.mode === 'solo' || currentSceneIndex < 10) gameState.player[type] = val; 
    }
    gameState.step = 'reading'; gameState.currentInputType = null; input.placeholder = "Write your response...";
    currentSceneIndex++; playNextScene();
}

function goBack() {
    if (!gameState.storyActive || gameState.isTyping) return;
    let removedContent = false;
    while(output.lastChild && !removedContent) {
        const el = output.lastChild;
        if (el.classList.contains('msg') || el.classList.contains('story-image-container') || el.innerHTML.includes('<button')) {
            output.removeChild(el);
            if(el.classList.contains('story') || el.classList.contains('ai')) removedContent = true;
        } else { output.removeChild(el); }
    }
    if (currentSceneIndex > 0) { currentSceneIndex--; gameState.history.pop(); }
    gameState.step = 'reading'; gameState.currentInputType = null; gameState.waitingForChoice = false; gameState.currentChoices = null;
    input.placeholder = "Write your response..."; gameState.waitingForEnter = false;
    playNextScene(false);
}

function advanceStory() { if (!gameState.waitingForEnter && !gameState.isTyping) playNextScene(); }
function formatText(text) { return text ? text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : ""; }
function replacePlaceholders(text) {
    if (!text) return "";
    text = text.replace(/{player}/g, gameState.player.name);
    text = text.replace(/{partner}/g, gameState.partner.name);
    text = text.replace(/{driver}/g, gameState.driver || gameState.player.name);
    text = text.replace(/{passenger}/g, gameState.passenger || gameState.partner.name);
    return text;
}
function resolveTextVariant(blocks, focus) {
    let bestBlock = null; let highestPriority = -1; let target = gameState.player; if (focus === 'partner') target = gameState.partner;
    const checkCondition = (cond) => {
        if (cond === 'default') return 0; if (cond === target.class) return 10;
        if (cond.startsWith('origin:')) { const req = cond.split(':')[1]; if (target.origin && target.origin.toLowerCase().includes(req)) return 8; }
        if (cond.startsWith('gender:')) { const req = cond.split(':')[1]; if (target.gender && target.gender.toLowerCase().includes(req)) return 7; }
        if (cond.startsWith('synergy:')) { const parts = cond.split(':')[1].split('_'); const m = { 'tech': 'Tech', 'arts': 'Arts', 'guts': 'Guts', 'social': 'Social', 'bio': 'Bio', 'lore': 'Lore' }; if (target.stats[m[parts[0]]] >= 5 && target.stats[m[parts[1]]] >= 5) return 9; }
        if (cond.startsWith('high_')) { const statName = cond.split('_')[1]; const map = { 'tech': 'Tech', 'arts': 'Arts', 'guts': 'Guts', 'social': 'Social', 'bio': 'Bio', 'lore': 'Lore' }; const stats = target.stats; const sortedStats = Object.keys(stats).sort((a,b) => stats[b] - stats[a]); if (sortedStats[0].toLowerCase() === statName) return 5; }
        return -1;
    };
    blocks.forEach(block => { let p = checkCondition(block.condition); if (p > highestPriority) { highestPriority = p; bestBlock = block; } });
    return bestBlock ? bestBlock.text : "Data Corrupted.";
}

function updateUI() {
    const invBtn = document.getElementById('inventory-btn');
    if (invBtn && gameState.inventory && gameState.inventory.length > 0) {
        invBtn.style.display = 'block'; invBtn.innerText = `VAULT [${gameState.inventory.length}]`;
    } else if (invBtn) { invBtn.style.display = 'none'; }
}
function toggleInventory() {
    const modal = document.getElementById('inventory-modal');
    const list = document.getElementById('inventory-list');
    if (modal.classList.contains('active')) { modal.classList.remove('active'); } 
    else { renderInventory(list); modal.classList.add('active'); }
}
function renderInventory(container) {
    container.innerHTML = '';
    if (!gameState.inventory || gameState.inventory.length === 0) { container.innerHTML = '<div class="empty-msg">VAULT IS EMPTY</div>'; return; }
    gameState.inventory.forEach(item => {
        const div = document.createElement('div'); div.classList.add('inv-item');
        div.innerHTML = `<div class="inv-item-name">${item.name}</div><div class="inv-item-desc">${item.desc}</div>`;
        container.appendChild(div);
    });
}
function triggerConfettiEvent() {
    printLine("WE HAVE BEEN WAITING FOR YOU! ✨", 'ai');
    if (typeof confetti === 'function') {
        var duration = 2000; var end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }
}
function showStatCard(className, stats, name) {
    let html = `<div class="stats-card"><div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">${name}<div style="font-size:0.6em; color:var(--accent); text-transform:uppercase; margin-top:5px; letter-spacing:2px;">${className}</div></div><div class="stats-grid">`;
    for (let [key, val] of Object.entries(stats)) { let pct = (val/10)*100; html += `<div class="stat-row"><div class="stat-label"><span>${key}</span><span>${val}/10</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%"></div></div></div>`; }
    html += `</div></div>`;
    printLine(html, 'system', false);
}
function showSynergyCard() {
    const p1 = gameState.player.stats; const p2 = gameState.partner.stats; let synergy = {}; for (let key in p1) { synergy[key] = p1[key] + p2[key]; }
    let html = `<div class="stats-card" style="border-color: var(--text-primary);"><div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">TEAM SYNERGY<div style="font-size:0.6em; color:var(--text-secondary); text-transform:uppercase; margin-top:5px; letter-spacing:2px;">COMBINED POTENTIAL</div></div><div class="stats-grid">`;
    for (let [key, val] of Object.entries(synergy)) { let pct = (val/20)*100; html += `<div class="stat-row"><div class="stat-label"><span>${key}</span><span>${val}/20</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%; background:var(--text-primary);"></div></div></div>`; }
    html += `</div></div>`;
    printLine(html, 'system', false);
}
function listClasses() {
    let listHTML = '<div style="margin-bottom:20px;">';
    gameState.rules.backgrounds.forEach((bg, index) => { listHTML += `<div class="class-card"><strong>[${index + 1}] ${bg.name}</strong><span>${bg.desc}</span></div>`; });
    listHTML += '</div>'; printLine(listHTML, 'system', false);
}
function typeWriter(element, html, speed) {
    return new Promise((resolve) => {
        gameState.isTyping = true; gameState.skipTyping = false; element.classList.add('typing');
        const tempDiv = document.createElement('div'); tempDiv.innerHTML = html;
        const nodes = Array.from(tempDiv.childNodes);
        element.innerHTML = ""; let nodeIndex = 0;
        function typeNode() {
            if (gameState.skipTyping) { element.innerHTML = html; element.classList.remove('typing'); element.classList.add('typed-done'); gameState.isTyping = false; gameState.skipTyping = false; scrollToBottom(); resolve(); return; }
            if (nodeIndex >= nodes.length) { element.classList.remove('typing'); element.classList.add('typed-done'); gameState.isTyping = false; resolve(); return; }
            const node = nodes[nodeIndex];
            if (node.nodeType === 3) {
                const text = node.nodeValue; let charIndex = 0; const liveTextNode = document.createTextNode(""); element.appendChild(liveTextNode);
                function typeChar() { if (gameState.skipTyping) { typeNode(); return; } liveTextNode.nodeValue += text.charAt(charIndex); charIndex++; scrollToBottom(); if (charIndex < text.length) setTimeout(typeChar, speed); else { nodeIndex++; typeNode(); } }
                typeChar();
            } else { element.appendChild(node.cloneNode(true)); nodeIndex++; setTimeout(typeNode, speed); }
        }
        typeNode();
    });
}
function printLine(text, type, animate = true) { 
    const p = document.createElement('div'); p.classList.add('msg'); if (type) p.classList.add(type); output.appendChild(p); 
    if(animate) { return typeWriter(p, text, (type==='ai' ? 40 : 25)); } 
    else { p.innerHTML = text; p.classList.add('typed-done'); scrollToBottom(); return Promise.resolve(); }
}
function scrollToBottom() { setTimeout(() => { output.scrollTop = output.scrollHeight; }, 50); }
// Bind Listeners
const invBtn = document.getElementById('inventory-btn');
if(invBtn) invBtn.addEventListener('click', toggleInventory);
const themeBtn = document.getElementById('theme-toggle');
if(themeBtn) { themeBtn.addEventListener('click', function() { document.body.classList.toggle('light-mode'); }); }
init();
