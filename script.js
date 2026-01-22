let gameState = {
    step: 'mode',
    mode: 'solo',
    player: { name: '', class: '', age: '', gender: '', origin: '', height: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    partner: { name: '', class: '', age: '', gender: '', origin: '', height: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    rules: null,
    story: null,
    storyActive: false,
    waitingForEnter: false,
    isTyping: false, // NEW: Prevents skipping scenes while typing
    typingSpeed: 25, // ms per char (Standard)
    typingSpeedAI: 40, // ms per char (Slower, thoughtful)
    skipTyping: false, // Flag to finish immediately
    currentInputType: null,
    driver: '',
    passenger: '',
    citationsShown: false,
    history: [] 
};

const output = document.getElementById('game-output');
const input = document.getElementById('player-input');

async function init() {
    try { const r = await fetch('data/rules.json'); gameState.rules = await r.json(); } catch (e) { console.error(e); }
    try { const s = await fetch('data/story.json'); gameState.story = await s.json(); } catch (e) { console.error(e); }

    // Initial system message (Instant)
    printLine("ARCHIVE SYSTEM CONNECTED.", 'system', false);
    setTimeout(() => {
        printLine("SELECT NARRATIVE MODE:", 'system', false);
        printLine("[1] SOLO CHRONICLE", 'story', false);
        printLine("[2] DUAL CHRONICLE", 'story', false);
    }, 800);
}

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const val = input.value.trim();
        
        // 1. If Typing, force finish
        if (gameState.isTyping) {
            gameState.skipTyping = true;
            return;
        }

        // 2. If Story Input
        if (gameState.step === 'story_input') { 
            input.value = '';
            if(!val) return;
            handleStoryInput(val); 
            return; 
        }

        // 3. If Story Reading
        if (gameState.storyActive) { 
            input.value = '';
            advanceStory(); 
            return; 
        }

        // 4. Normal Input
        input.value = '';
        if (val) processInput(val);
    }
});

function goBack() {
    if (!gameState.storyActive || gameState.isTyping) return;

    let removedContent = false;
    while(output.lastChild && !removedContent) {
        const el = output.lastChild;
        const isContent = el.classList.contains('story') || el.classList.contains('ai');
        output.removeChild(el);
        if (isContent) removedContent = true;
    }

    if (currentSceneIndex > 0) {
        currentSceneIndex--;
        gameState.history.pop();
    }

    gameState.step = 'reading'; 
    gameState.currentInputType = null;
    input.placeholder = "Write your response...";
    gameState.waitingForEnter = false;
}

// --- TYPEWRITER ENGINE (The Magic) ---
function typeWriter(element, html, speed) {
    return new Promise((resolve) => {
        gameState.isTyping = true;
        gameState.skipTyping = false;
        element.classList.add('typing'); // Add blinking cursor

        // Parse HTML into text nodes and tag nodes
        // We create a temp div to parse the HTML structure
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const nodes = Array.from(tempDiv.childNodes);
        element.innerHTML = ""; // Clear for typing

        let nodeIndex = 0;
        
        function typeNode() {
            if (gameState.skipTyping) {
                element.innerHTML = html; // Instant finish
                element.classList.remove('typing');
                element.classList.add('typed-done');
                gameState.isTyping = false;
                gameState.skipTyping = false;
                scrollToBottom();
                resolve();
                return;
            }

            if (nodeIndex >= nodes.length) {
                element.classList.remove('typing');
                element.classList.add('typed-done');
                gameState.isTyping = false;
                resolve();
                return;
            }

            const node = nodes[nodeIndex];

            if (node.nodeType === 3) { // Text Node
                const text = node.nodeValue;
                let charIndex = 0;
                
                // Create a text node in the live element
                const liveTextNode = document.createTextNode("");
                element.appendChild(liveTextNode);

                function typeChar() {
                    if (gameState.skipTyping) { typeNode(); return; } // Check skip

                    liveTextNode.nodeValue += text.charAt(charIndex);
                    charIndex++;
                    scrollToBottom();

                    if (charIndex < text.length) {
                        setTimeout(typeChar, speed);
                    } else {
                        nodeIndex++;
                        typeNode();
                    }
                }
                typeChar();

            } else { // HTML Element (strong, span, etc.)
                // Clone the element without its inner text first (complex, let's simplify)
                // Simplified: Just append the element instantly if it's a tag, 
                // OR recursively type inside it. For stability, let's append tags instantly for v0.1.3
                // but if it's a structural tag (like span), we might want to type inside.
                
                // V0.1.3 Strategy: Append the tag structure, then recurse typing? 
                // Too complex for single file. 
                // SIMPLE STRATEGY: Treat tags as instant blocks.
                
                element.appendChild(node.cloneNode(true));
                nodeIndex++;
                setTimeout(typeNode, speed);
            }
        }

        typeNode();
    });
}

// Modified printLine to handle typing
async function printLine(text, type, animate = true) {
    const p = document.createElement('div');
    p.classList.add('msg');
    if (type) p.classList.add(type);
    output.appendChild(p);

    if (animate) {
        // Determine speed
        let spd = gameState.typingSpeed;
        if (type === 'ai') spd = gameState.typingSpeedAI;
        if (type === 'system') spd = 5; // Fast system text

        await typeWriter(p, text, spd);
    } else {
        p.innerHTML = text;
        p.classList.add('typed-done');
        scrollToBottom();
    }
}

// ... (Process Input Logic - Simplified for brevity, use previous if not changed) ...
function processInput(val) {
    if (gameState.step === 'mode') {
        if (val === '1') { gameState.mode = 'solo'; startCharCreation('player'); }
        else if (val === '2') { gameState.mode = 'coop'; startCharCreation('player'); }
    } else if (gameState.step.includes('_name')) {
        let t = gameState.step.split('_')[0];
        gameState[t].name = val;
        printLine(`${t.toUpperCase()} ID: ${val}`, 'story'); // Animate this
        setTimeout(listClasses, 1000); // Wait for typing
        gameState.step = t + '_class';
    } else if (gameState.step.includes('_class')) {
        let t = gameState.step.split('_')[0];
        if (applyClassSelection(val, t)) {
            if(t==='player' && gameState.mode === 'solo') {
                 setTimeout(() => { printLine("Configure Secondary Asset? [Y/N]", 'system'); gameState.step = 'partner_query'; }, 1000);
            } else if (t==='player') { startCharCreation('partner'); }
            else { startGame(); }
        }
    } else if (gameState.step === 'partner_query') {
        if(val.toLowerCase().startsWith('y')) startCharCreation('partner');
        else { autoAssignPartner(); startGame(); }
    }
}

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
    setTimeout(() => { printLine("<hr style='opacity:0.3'>", 'system', false); gameState.storyActive = true; loadStoryChapter('chapter_1_p1'); }, 1500);
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
    if (gameState.isTyping) return; // Block while typing

    if (!currentChapterData || currentSceneIndex >= currentChapterData.scenes.length) {
        // Citations
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
        // We Await the typing before showing input
        printLine(replacePlaceholders(promptText), scene.focus === 'ai' ? 'ai' : 'story').then(() => {
            gameState.step = 'story_input';
            gameState.currentInputType = scene.input_prompt;
            if (scene.input_prompt === 'height') input.placeholder = "E.g., 5'11 or 180";
            else input.placeholder = `Enter ${scene.input_prompt}...`;
        });
        return; 
    }

    // Image
    if (scene.image) {
        const imgHTML = `
            <div class="story-image-container">
                <img src="${scene.image}" alt="Archive Visual" class="story-image">
                ${scene.image_caption ? `<div class="image-caption">${scene.image_caption}</div>` : ''}
                ${scene.image_source ? `<div class="image-source">SOURCE: ${scene.image_source}</div>` : ''}
            </div>
        `;
        const div = document.createElement('div'); div.innerHTML = imgHTML; output.appendChild(div);
    }

    // Text
    let text = resolveTextVariant(scene.text_blocks, scene.focus);
    text = replacePlaceholders(text);
    text = formatText(text);
    
    let msgType = scene.focus === 'ai' ? 'ai' : (scene.focus === 'system' ? 'system' : 'story');

    // Call Typewriter
    printLine(text, msgType).then(() => {
        currentSceneIndex++;
        if (currentSceneIndex <= currentChapterData.scenes.length || currentChapterData.next_chapter) {
             printLine("<i>(Press Enter...)</i>", 'system', false);
        }
        gameState.waitingForEnter = false;
    });
}

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
    gameState.step = 'reading';
    gameState.currentInputType = null;
    input.placeholder = "Write your response...";
    currentSceneIndex++;
    playNextScene();
}

function advanceStory() { 
    if (gameState.isTyping) return; // Prevent double advance
    if (!gameState.waitingForEnter) playNextScene(); 
}

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
    let bestBlock = null;
    let highestPriority = -1;
    let target = gameState.player;
    if (focus === 'partner') target = gameState.partner;

    const checkCondition = (cond) => {
        if (cond === 'default') return 0; 
        if (cond === target.class) return 10;
        if (cond.startsWith('origin:')) {
            const reqOrigin = cond.split(':')[1];
            if (target.origin && target.origin.toLowerCase().includes(reqOrigin)) return 8;
        }
        if (cond.startsWith('gender:')) {
            const reqGender = cond.split(':')[1];
            if (target.gender && target.gender.toLowerCase().includes(reqGender)) return 7;
        }
        if (cond.startsWith('synergy:')) {
            const parts = cond.split(':')[1].split('_');
            const map = { 'tech': 'Tech', 'arts': 'Arts', 'guts': 'Guts', 'social': 'Social', 'bio': 'Bio', 'lore': 'Lore' };
            const s1 = target.stats[map[parts[0]]];
            const s2 = target.stats[map[parts[1]]];
            if (s1 >= 5 && s2 >= 5) return 9;
        }
        if (cond.startsWith('high_')) {
            const statName = cond.split('_')[1];
            const map = { 'tech': 'Tech', 'arts': 'Arts', 'guts': 'Guts', 'social': 'Social', 'bio': 'Bio', 'lore': 'Lore' };
            const stats = target.stats;
            const sortedStats = Object.keys(stats).sort((a,b) => stats[b] - stats[a]);
            if (sortedStats[0].toLowerCase() === statName) return 5;
        }
        return -1;
    };

    blocks.forEach(block => {
        let priority = checkCondition(block.condition);
        if (priority > highestPriority) {
            highestPriority = priority;
            bestBlock = block;
        }
    });
    return bestBlock ? bestBlock.text : "Data Corrupted.";
}

function listClasses() {
    let listHTML = '<div style="margin-bottom:20px;">';
    gameState.rules.backgrounds.forEach((bg, index) => {
        listHTML += `<div class="class-card"><strong>[${index + 1}] ${bg.name}</strong><span>${bg.desc}</span></div>`;
    });
    listHTML += '</div>';
    printLine(listHTML, 'system', false); // No typing for lists
}
function showStatCard(className, stats, name) {
    let html = `<div class="stats-card"><div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">${name}<div style="font-size:0.6em; color:var(--accent); text-transform:uppercase; margin-top:5px; letter-spacing:2px;">${className}</div></div><div class="stats-grid">`;
    for (let [key, val] of Object.entries(stats)) { let pct = (val/10)*100; html += `<div class="stat-row"><div class="stat-label"><span>${key}</span><span>${val}/10</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%"></div></div></div>`; }
    html += `</div></div>`;
    printLine(html, 'system', false);
}
function showSynergyCard() {
    const p1 = gameState.player.stats;
    const p2 = gameState.partner.stats;
    let synergy = {};
    for (let key in p1) { synergy[key] = p1[key] + p2[key]; }
    let html = `<div class="stats-card" style="border-color: var(--text-primary);"><div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">TEAM SYNERGY<div style="font-size:0.6em; color:var(--text-secondary); text-transform:uppercase; margin-top:5px; letter-spacing:2px;">COMBINED POTENTIAL</div></div><div class="stats-grid">`;
    for (let [key, val] of Object.entries(synergy)) { let pct = (val/20)*100; html += `<div class="stat-row"><div class="stat-label"><span>${key}</span><span>${val}/20</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%; background:var(--text-primary);"></div></div></div>`; }
    html += `</div></div>`;
    printLine(html, 'system', false);
}
function printLine(text, type, animate = true) { 
    const p = document.createElement('div'); 
    p.classList.add('msg'); 
    if (type) p.classList.add(type); 
    output.appendChild(p); 
    
    if(animate) {
        return typeWriter(p, text, (type==='ai' ? 40 : 25));
    } else {
        p.innerHTML = text;
        p.classList.add('typed-done');
        scrollToBottom();
        return Promise.resolve();
    }
}
function scrollToBottom() { setTimeout(() => { output.scrollTop = output.scrollHeight; }, 50); }
const themeBtn = document.getElementById('theme-toggle');
if(themeBtn) { themeBtn.addEventListener('click', function() { document.body.classList.toggle('light-mode'); }); }
init();
