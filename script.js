let gameState = {
    step: 'mode',
    mode: 'solo',
    player: { name: '', class: '', age: '', gender: '', origin: '', height: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    partner: { name: '', class: '', age: '', gender: '', origin: '', height: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    rules: null,
    story: null,
    storyActive: false,
    waitingForEnter: false,
    waitingForChoice: false, // NEW STATE
    currentInputType: null,
    driver: '',
    passenger: '',
    citationsShown: false,
    history: [] 
};

const output = document.getElementById('game-output');
const input = document.getElementById('player-input');

async function init() {
    try { 
        const r = await fetch('data/rules.json'); if(!r.ok) throw new Error("Rules"); gameState.rules = await r.json(); 
        const s = await fetch('data/story.json'); if(!s.ok) throw new Error("Story"); gameState.story = await s.json(); 
    } catch (e) { 
        printLine(`CRITICAL ERROR: ${e.message}`, 'system'); return;
    }

    if (StorageManager.hasSave()) {
        gameState.step = 'main_menu';
        setTimeout(() => {
            printLine("EXISTING TIMELINE DETECTED.", 'system');
            printLine("[1] RESUME SYNCHRONIZATION", 'story');
            printLine("[2] INITIATE NEW TIMELINE", 'story');
        }, 800);
    } else { triggerNewGameMenu(); }
}

function triggerNewGameMenu() {
    gameState.step = 'mode_select';
    setTimeout(() => {
        printLine("SELECT NARRATIVE MODE:", 'system');
        printLine("[1] SOLO CHRONICLE", 'story');
        printLine("[2] DUAL CHRONICLE", 'story');
    }, 500);
}

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const val = input.value.trim();
        input.value = '';
        
        if (gameState.isTyping) { gameState.skipTyping = true; return; }
        
        // CHOICE HANDLING via Text Input (Optional)
        if (gameState.waitingForChoice) {
            handleChoiceInput(val);
            return;
        }

        if (gameState.step === 'story_input') { handleStoryInput(val); return; }
        if (gameState.storyActive) { advanceStory(); return; }
        if (val) processInput(val);
    }
});

// --- CORE FUNCTIONS ---

function playNextScene(saveHistory = true) {
    if (!currentChapterData || currentSceneIndex >= currentChapterData.scenes.length) {
        // End of Chapter / Citations Logic
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
    
    // Save History
    if (saveHistory) gameState.history.push({ chapterId: currentChapterData.id, index: currentSceneIndex });

    // Mode Skip
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

    // --- NEW: CHOICE SYSTEM ---
    if (scene.choices) {
        let text = resolveTextVariant(scene.text_blocks, scene.focus);
        text = replacePlaceholders(text);
        let msgType = scene.focus === 'ai' ? 'ai' : (scene.focus === 'system' ? 'system' : 'story');

        printLine(text, msgType).then(() => {
            renderChoices(scene.choices);
        });
        return; // Stop here, wait for click/input
    }

    // Standard Text
    let text = resolveTextVariant(scene.text_blocks, scene.focus);
    text = replacePlaceholders(text);
    text = formatText(text);
    let msgType = scene.focus === 'ai' ? 'ai' : (scene.focus === 'system' ? 'system' : 'story');

    printLine(text, msgType).then(() => {
        // Image
        if (scene.image) {
            const imgHTML = `<div class="story-image-container"><img src="${scene.image}" class="story-image">${scene.image_caption ? `<div class="image-caption">${scene.image_caption}</div>` : ''}${scene.image_source ? `<div class="image-source">SOURCE: ${scene.image_source}</div>` : ''}</div>`;
            const div = document.createElement('div'); div.innerHTML = imgHTML; output.appendChild(div);
        }
        
        currentSceneIndex++;
        if (currentSceneIndex <= currentChapterData.scenes.length || currentChapterData.next_chapter) {
             printLine("<i>(Press Enter...)</i>", 'system', false);
        }
        gameState.waitingForEnter = false;
        
        // Auto-Save
        if (currentChapterData.id) StorageManager.save(gameState, currentChapterData.id, currentSceneIndex);
    });
}

function renderChoices(choices) {
    gameState.waitingForChoice = true;
    gameState.currentChoices = choices;
    
    let html = `<div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">`;
    
    choices.forEach((choice, index) => {
        // Check requirements (e.g. Needs Tech > 5)
        let disabled = false;
        let reason = "";
        
        if (choice.req) {
            const statVal = gameState.player.stats[choice.req.stat] || 0;
            if (statVal < choice.req.val) {
                disabled = true;
                reason = ` (Requires ${choice.req.stat} ${choice.req.val})`;
            }
        }

        const style = disabled 
            ? `opacity:0.5; cursor:not-allowed; border-color:#555; color:#555;` 
            : `cursor:pointer; border-color:var(--accent); color:var(--text-story);`;

        html += `
        <button 
            onclick="makeChoice(${index})" 
            ${disabled ? 'disabled' : ''}
            style="background:var(--input-bg); border:1px solid; padding:15px; text-align:left; font-family:var(--font-ui); font-size:1rem; transition:all 0.2s; ${style}"
            onmouseover="this.style.background='var(--selection-bg)'" 
            onmouseout="this.style.background='var(--input-bg)'"
        >
            <strong style="color:var(--accent)">[${index + 1}]</strong> ${choice.text} ${reason}
        </button>`;
    });
    
    html += `</div>`;
    const div = document.createElement('div'); div.innerHTML = html; output.appendChild(div);
    scrollToBottom();
}

function makeChoice(index) {
    if (!gameState.waitingForChoice) return;
    const choice = gameState.currentChoices[index];
    
    // Visual Feedback
    printLine(`>> SELECTED: ${choice.text}`, 'system');
    
    // Remove the buttons (optional, but cleaner)
    if(output.lastChild.innerHTML.includes('<button')) output.removeChild(output.lastChild);

    gameState.waitingForChoice = false;
    gameState.currentChoices = null;

    // Logic: Redirect to a new chapter or advance
    if (choice.target) {
        loadStoryChapter(choice.target);
    } else {
        // Just advance
        currentSceneIndex++;
        playNextScene();
    }
}

function handleChoiceInput(val) {
    const idx = parseInt(val) - 1;
    if (gameState.currentChoices && gameState.currentChoices[idx]) {
        // Check requirement
        const choice = gameState.currentChoices[idx];
        if (choice.req) {
            const statVal = gameState.player.stats[choice.req.stat] || 0;
            if (statVal < choice.req.val) {
                printLine(">> REQUIREMENTS NOT MET.", 'system');
                return;
            }
        }
        makeChoice(idx);
    }
}

// ... (Rest of Input Process, Helpers, Typewriter - KEEP PREVIOUS CODE) ...
// Copy goBack, handleStoryInput, advanceStory, helpers from v0.1.4
function goBack() {
    if (!gameState.storyActive || gameState.isTyping || gameState.waitingForChoice) return;
    let removedContent = false;
    while(output.lastChild && !removedContent) {
        const el = output.lastChild;
        const isContent = el.classList.contains('story') || el.classList.contains('ai');
        output.removeChild(el);
        if (isContent) removedContent = true;
    }
    if (currentSceneIndex > 0) { currentSceneIndex--; gameState.history.pop(); }
    gameState.step = 'reading'; gameState.currentInputType = null; gameState.waitingForChoice = false;
    input.placeholder = "Write your response..."; gameState.waitingForEnter = false;
}

function processInput(val) {
    if (gameState.step === 'main_menu') {
        if (val === '1') loadGame(); else if (val === '2') { StorageManager.clear(); triggerNewGameMenu(); }
    } else if (gameState.step === 'mode_select') {
        if (val === '1') { gameState.mode = 'solo'; startCharCreation('player'); } else if (val === '2') { gameState.mode = 'coop'; startCharCreation('player'); }
    } else if (gameState.step.includes('_name')) {
        let t = gameState.step.split('_')[0]; gameState[t].name = val; printLine(`${t.toUpperCase()} ID: ${val}`, 'story'); setTimeout(listClasses, 500); gameState.step = t + '_class';
    } else if (gameState.step.includes('_class')) {
        let t = gameState.step.split('_')[0]; if (applyClassSelection(val, t)) { if(t==='player' && gameState.mode === 'solo') { setTimeout(() => { printLine("Configure Secondary Asset? [Y/N]", 'system'); gameState.step = 'partner_query'; }, 500); } else if (t==='player') { startCharCreation('partner'); } else { startGame(); } }
    } else if (gameState.step === 'partner_query') {
        if(val.toLowerCase().startsWith('y')) startCharCreation('partner'); else { autoAssignPartner(); startGame(); }
    }
}
function loadGame() {
    const data = StorageManager.load();
    if (!data) { printLine("ERROR: TIMELINE CORRUPTED.", 'system'); triggerNewGameMenu(); return; }
    gameState.mode = data.mode; gameState.player = data.player; gameState.partner = data.partner;
    gameState.driver = data.driver; gameState.passenger = data.passenger; gameState.history = data.history || [];
    printLine("RESTORING TIMELINE...", 'system'); gameState.storyActive = true;
    currentSceneIndex = data.currentSceneIndex; loadStoryChapter(data.currentChapterId, false);
}
// Add remaining helpers (startCharCreation, applyClassSelection, autoAssignPartner, startGame, handleStoryInput, advanceStory, formatText, replacePlaceholders, resolveTextVariant, listClasses, showStatCard, showSynergyCard, typeWriter, printLine, scrollToBottom)
// Ensure `makeChoice` is globally accessible (window.makeChoice = makeChoice) if modules isolate scope, but in basic JS script tags it's fine.
