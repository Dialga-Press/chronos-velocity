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

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const val = input.value.trim();
        input.value = '';
        
        if (gameState.isTyping) { 
            gameState.skipTyping = true; 
            e.preventDefault();
            return; 
        }
        
        if (gameState.waitingForChoice) {
            if(val) handleChoiceInput(val);
            return;
        }

        if (gameState.step === 'story_input') { 
            if(!val) return; 
            handleStoryInput(val); 
            return; 
        }

        if (gameState.storyActive) { 
            advanceStory(); 
            return; 
        }

        if (val) processInput(val);
    }
});

function processInput(val) {
    if (gameState.step === 'main_menu') {
        if (val === '1') loadGame();
        else if (val === '2') { StorageManager.clear(); triggerNewGameMenu(); }
    }
    else if (gameState.step === 'mode_select') {
        if (val === '1') { gameState.mode = 'solo'; startCharCreation('player'); }
        else if (val === '2') { gameState.mode = 'coop'; startCharCreation('player'); }
    } 
    else if (gameState.step.includes('_name')) {
        let t = gameState.step.split('_')[0];
        gameState[t].name = val;

        // Easter Eggs
        if (t === 'player' && val.toLowerCase() === 'lava') {
            printLine("... IDENTITY FLAGGED.", 'system');
            setTimeout(() => { printLine("Is <strong>Beeth</strong> with you? [Y/N]", 'ai'); gameState.step = 'easter_egg_check'; }, 600);
            return;
        }
        if (t === 'partner') {
            const p1 = gameState.player.name.toLowerCase();
            const p2 = val.toLowerCase();
            if ((p1 === 'beeth' && p2 === 'lava') || (p1 === 'lava' && p2 === 'beeth')) { triggerConfettiEvent(); }
        }

        printLine(`${t.toUpperCase()} ID: ${val}`, 'story');
        setTimeout(listClasses, 500);
        gameState.step = t + '_class';
    } 
    else if (gameState.step === 'easter_egg_check') {
        if (val.toLowerCase().startsWith('y')) {
            gameState.partner.name = 'Beeth'; triggerConfettiEvent(); gameState.mode = 'coop'; 
            printLine(`Protagonist 1: <strong>Lava</strong>`, 'story'); setTimeout(listClasses, 500); gameState.step = 'player_class';
        } else {
            printLine(`Protagonist 1: <strong>Lava</strong>`, 'story'); setTimeout(listClasses, 500); gameState.step = 'player_class';
        }
    }
    else if (gameState.step.includes('_class')) {
        let t = gameState.step.split('_')[0];
        if (applyClassSelection(val, t)) {
            if(t === 'player') {
                if (gameState.mode === 'solo') {
                     setTimeout(() => { printLine("Configure Secondary Asset? [Y/N]", 'system'); gameState.step = 'partner_query'; }, 500);
                } else {
                    if (gameState.partner.name) {
                        printLine(`Protagonist 2: <strong>${gameState.partner.name}</strong>`, 'story');
                        setTimeout(() => { printLine("Select Origin Protocol:", 'system'); listClasses(); }, 500);
                        gameState.step = 'partner_class';
                    } else { startCharCreation('partner'); }
                }
            } else { 
                startGame(); 
            }
        }
    } 
    else if (gameState.step === 'partner_query') {
        if(val.toLowerCase().startsWith('y')) startCharCreation('partner');
        else { autoAssignPartner(); startGame(); }
    }
}

function startGame() {
    printLine("TIMELINE SYNCHRONIZATION COMPLETE.", 'system');
    
    // Safety: Ensure story is loaded
    if (!gameState.story) {
        printLine("BUFFERING...", 'system');
        setTimeout(() => startGame(), 1000); // Retry after 1s
        return;
    }

    setTimeout(() => { 
        printLine("<hr style='opacity:0.3'>", 'system', false); 
        gameState.storyActive = true; 
        loadStoryChapter('chapter_1_p1'); 
    }, 1000);
}

// ... (KEEP ALL OTHER FUNCTIONS: loadGame, loadStoryChapter, playNextScene, etc. EXACTLY AS THEY WERE) ...
// For brevity, I am not pasting the entire 400 lines again unless you need it. 
// Just make sure to REPLACE `processInput` and `startGame` in your file.
// If you want the full file again, tell me.

// --- CORE HELPERS REPEATED FOR SAFETY ---
function startCharCreation(target) { printLine(target === 'player' ? "ENTER NAME (PROTAGONIST 1):" : "ENTER NAME (PROTAGONIST 2):", 'system'); gameState.step = target + '_name'; }
function applyClassSelection(val, target) {
    const choice = parseInt(val) - 1;
    if(!gameState.rules) return false;
    const classes = gameState.rules.backgrounds;
    if (classes[choice]) {
        const selected = classes[choice];
        const targetObj = (target === 'player') ? gameState.player : gameState.partner;
        targetObj.class = selected.id;
        for (let [key, value] of Object.entries(selected.bonus)) { if(targetObj.stats[key] !== undefined) targetObj.stats[key] += value; }
        showStatCard(selected.name, targetObj.stats, targetObj.name);
        return true;
    }
    return false;
}
function autoAssignPartner() { gameState.partner.class = 'adventurer'; gameState.partner.name = "The Other"; }
function loadGame() {
    const data = StorageManager.load();
    if (!data) { printLine("ERROR: SAVE CORRUPT.", 'system'); triggerNewGameMenu(); return; }
    Object.assign(gameState, data);
    gameState.storyActive = true;
    printLine("RESTORING TIMELINE...", 'system');
    loadStoryChapter(data.currentChapterId, false);
    updateUI();
}
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
    if (gameState.isTyping) return;
    if (!currentChapterData || currentSceneIndex >= currentChapterData.scenes.length) {
        if (currentChapterData.sources && !gameState.citationsShown) {
            printLine("<br><strong style='color:var(--accent); letter-spacing:1px;'>>> HISTORICAL ARCHIVE:</strong>", 'system', false);
            currentChapterData.sources.forEach(src => { printLine(`<a href="${src.link}" target="_blank" style="color:var(--text-secondary); text-decoration:none; border-bottom:1px dotted var(--accent); font-size:0.9em; display:block; margin-bottom:5px;">[📄] ${src.title}</a>`, 'system', false); });
            gameState.citationsShown = true; printLine("<i>(Press Enter to continue...)</i>", 'system', false); return; 
        }
        gameState.citationsShown = false;
        if (currentChapterData.next_chapter) loadStoryChapter(currentChapterData.next_chapter);
        else { printLine(">> TO BE CONTINUED...", 'system'); gameState.storyActive = false; }
        return;
    }
    const scene = currentChapterData.scenes[currentSceneIndex];
    if (currentChapterData.id && typeof StorageManager !== 'undefined') StorageManager.save(gameState, currentChapterData.id, currentSceneIndex);
    if (saveHistory) gameState.history.push({ chapterId: currentChapterData.id, index: currentSceneIndex });
    if (scene.mode_req && scene.mode_req !== gameState.mode) { if(saveHistory) gameState.history.pop(); currentSceneIndex++; playNextScene(saveHistory); return; }
    if (scene.input_prompt) {
        let promptText = resolveTextVariant(scene.text_blocks, scene.focus);
        printLine(replacePlaceholders(promptText), scene.focus === 'ai' ? 'ai' : 'story').then(() => {
            gameState.step = 'story_input'; gameState.currentInputType = scene.input_prompt;
            input.placeholder = scene.input_prompt === 'height' ? "E.g., 5'11 or 180" : `Enter ${scene.input_prompt}...`;
        }); return; 
    }
    if (scene.choices) {
        let text = resolveTextVariant(scene.text_blocks, scene.focus);
        printLine(replacePlaceholders(text), scene.focus === 'ai' ? 'ai' : 'story').then(() => { renderChoices(scene.choices); }); return;
    }
    let text = resolveTextVariant(scene.text_blocks, scene.focus); text = replacePlaceholders(text); text = formatText(text);
    let msgType = scene.focus === 'ai' ? 'ai' : (scene.focus === 'system' ? 'system' : 'story');
    printLine(text, msgType).then(() => {
        if (scene.image) {
            const imgHTML = `<div class="story-image-container"><img src="${scene.image}" class="story-image">${scene.image_caption ? `<div class="image-caption">${scene.image_caption}</div>` : ''}${scene.image_source ? `<div class="image-source">SOURCE: ${scene.image_source}</div>` : ''}</div>`;
            const div = document.createElement('div'); div.innerHTML = imgHTML; output.appendChild(div); scrollToBottom();
        }
        currentSceneIndex++;
        if (currentSceneIndex <= currentChapterData.scenes.length || currentChapterData.next_chapter) { printLine("<i>(Press Enter...)</i>", 'system', false); }
        gameState.waitingForEnter = false;
    });
}
function handleStoryInput(val) {
    const type = gameState.currentInputType;
    if (type === 'shotgun') { 
        let inputName = val.toLowerCase(); let p1Name = gameState.player.name.toLowerCase();
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
    input.placeholder = "Write your response..."; gameState.waitingForEnter = false; playNextScene(false);
}
function advanceStory() { if (!gameState.waitingForEnter && !gameState.isTyping) playNextScene(); }
function formatText(text) { return text ? text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : ""; }
function replacePlaceholders(text) {
    if (!text) return "";
    text = text.replace(/{player}/g, gameState.player.name); text = text.replace(/{partner}/g, gameState.partner.name);
    text = text.replace(/{driver}/g, gameState.driver || gameState.player.name); text = text.replace(/{passenger}/g, gameState.passenger || gameState.partner.name);
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
function renderChoices(choices) {
    gameState.waitingForChoice = true; gameState.currentChoices = choices;
    let html = `<div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">`;
    choices.forEach((choice, index) => {
        let disabled = false; let reason = "";
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
    if (!gameState.waitingForChoice) return
