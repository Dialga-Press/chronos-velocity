/**
 * CHRONOS VELOCITY ENGINE v0.2.0
 * The Core Orchestrator.
 */

// --- STATE MANAGEMENT ---
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
    skipTyping: false
};

// --- DOM ELEMENTS ---
const output = document.getElementById('game-output');
const input = document.getElementById('player-input');
const invBtn = document.getElementById('inventory-btn');
const themeBtn = document.getElementById('theme-toggle');

// --- INIT ---
async function init() {
    try {
        const [r, s] = await Promise.all([
            fetch('data/rules.json').then(res => res.json()),
            fetch('data/story.json').then(res => res.json())
        ]);
        gameState.rules = r;
        gameState.story = s;
    } catch (e) {
        printLine(`CRITICAL SYSTEM FAILURE: ${e.message}`, 'system', false);
        return;
    }

    if (StorageManager.hasSave()) {
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

// --- INPUT LOGIC ---
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const val = input.value.trim();
        
        // Instant Text Completion
        if (gameState.isTyping) {
            gameState.skipTyping = true;
            e.preventDefault();
            return;
        }

        // Contextual Handling
        if (gameState.waitingForChoice) { input.value=''; if(val) handleChoiceInput(val); return; }
        if (gameState.step === 'story_input') { if(!val) return; input.value=''; handleStoryInput(val); return; }
        if (gameState.storyActive) { input.value=''; advanceStory(); return; }
        if (val) { input.value=''; processInput(val); }
    }
});

// --- MENU PROCESSOR ---
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
        if (t === 'partner' && isDuo(gameState.player.name, val)) triggerConfettiEvent();

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
            if (t === 'player') {
                if (gameState.mode === 'solo') {
                    setTimeout(() => { printLine("Configure Secondary Asset? [Y/N]", 'system'); gameState.step = 'partner_query'; }, 500);
                } else {
                    // Skip name input if partner name is already known (Easter Egg)
                    if (gameState.partner.name) {
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
    else if (gameState.step === 'partner_query') {
        if (val.toLowerCase().startsWith('y')) startCharCreation('partner');
        else { autoAssignPartner(); startGame(); }
    }
}

// --- STORY ENGINE ---
let currentSceneIndex = 0;
let currentChapterData = null;

async function loadStoryChapter(chapterId, resetIndex = true) {
    if (!gameState.story) return;
    currentChapterData = gameState.story[chapterId];
    
    if (currentChapterData) {
        if (resetIndex || gameState.step === 'main_menu') {
            if (currentChapterData.telemetry) renderTelemetry(currentChapterData);
            if (currentChapterData.show_synergy) showSynergyCard();
        }
        currentSceneIndex = resetIndex ? 0 : gameState.currentSceneIndex;
        playNextScene(false);
    } else {
        printLine(">> END OF ARCHIVE.", 'system');
        gameState.storyActive = false;
    }
}

function playNextScene(saveHistory = true) {
    if (gameState.isTyping) return;

    if (!currentChapterData || currentSceneIndex >= currentChapterData.scenes.length) {
        // End of Chapter Logic
        if (currentChapterData.sources && !gameState.citationsShown) {
            printLine("<br><strong style='color:var(--accent); letter-spacing:1px;'>>> HISTORICAL ARCHIVE:</strong>", 'system', false);
            currentChapterData.sources.forEach(src => printLine(`<a href="${src.link}" target="_blank" class="source-link">[📄] ${src.title}</a>`, 'system', false));
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

    // Auto-Save
    if (currentChapterData.id) StorageManager.save(gameState, currentChapterData.id, currentSceneIndex);
    if (saveHistory) gameState.history.push({ chapterId: currentChapterData.id, index: currentSceneIndex });

    // Mode Skip
    if (scene.mode_req && scene.mode_req !== gameState.mode) {
        if (saveHistory) gameState.history.pop();
        currentSceneIndex++;
        playNextScene(saveHistory);
        return;
    }

    // Process Content
    let text = resolveTextVariant(scene.text_blocks, scene.focus);
    text = replacePlaceholders(text);
    text = formatText(text);
    
    // Logic: Input Prompt
    if (scene.input_prompt) {
        printLine(text, scene.focus === 'ai' ? 'ai' : 'story').then(() => {
            gameState.step = 'story_input';
            gameState.currentInputType = scene.input_prompt;
            input.placeholder = scene.input_prompt === 'height' ? "E.g. 5'11 or 180" : `Enter ${scene.input_prompt}...`;
        });
        return;
    }

    // Logic: Choices
    if (scene.choices) {
        printLine(text, scene.focus === 'ai' ? 'ai' : 'story').then(() => renderChoices(scene.choices));
        return;
    }

    // Logic: Standard Scene
    // Determine FX
    let fxClass = '';
    if (scene.fx === 'shake') fxClass = 'fx-shake';
    if (scene.fx === 'heat') fxClass = 'fx-heat';
    if (scene.fx === 'cold') fxClass = 'fx-cold';

    let msgType = scene.focus === 'ai' ? 'ai' : (scene.focus === 'system' ? 'system' : 'story');

    printLine(text, msgType, true, fxClass).then(() => {
        if (scene.image) {
            const imgHTML = `
                <div class="story-image-container">
                    <img src="${scene.image}" class="story-image">
                    ${scene.image_caption ? `<div class="image-caption">${scene.image_caption}</div>` : ''}
                    ${scene.image_source ? `<div class="image-source">SOURCE: ${scene.image_source}</div>` : ''}
                </div>`;
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

// --- UTILS & HELPERS ---

function handleStoryInput(val) {
    const type = gameState.currentInputType;
    let response = null;

    if (type === 'shotgun') {
        let p1Name = gameState.player.name.toLowerCase();
        let inName = val.toLowerCase();
        if (inName.includes(p1Name)) { gameState.passenger = gameState.player.name; gameState.driver = gameState.partner.name; }
        else { gameState.passenger = gameState.partner.name; gameState.driver = gameState.player.name; }
        printLine(`>> DRIVER DESIGNATED: ${gameState.driver.toUpperCase()}`, 'system');
    } else {
        // Bio Logic via Input Handler
        if (typeof processBioInput === 'function') {
            let res = processBioInput(type, val);
            if (res && res.response) { 
                response = res.response; 
                // If handler returns formatted val (like 180cm), save that
                if(res.val) val = res.val; 
            }
        }
        // Save
        if (gameState.mode === 'solo' || currentSceneIndex < 10) gameState.player[type] = val;
        
        printLine(`>> DATA LOGGED: ${val.toUpperCase()}`, 'system');
    }

    gameState.step = 'reading';
    gameState.currentInputType = null;
    input.placeholder = "Write your response...";
    currentSceneIndex++;
    
    // Play AI reaction if exists
    if (response) {
        printLine(response, 'ai').then(() => {
            setTimeout(playNextScene, 1000);
        });
    } else {
        playNextScene();
    }
}

// Typewriter
function typeWriter(element, html, speed) {
    return new Promise((resolve) => {
        gameState.isTyping = true; gameState.skipTyping = false;
        element.classList.add('typing');
        
        const tempDiv = document.createElement('div'); tempDiv.innerHTML = html;
        const nodes = Array.from(tempDiv.childNodes);
        element.innerHTML = "";
        let nodeIndex = 0;

        function typeNode() {
            if (gameState.skipTyping) {
                element.innerHTML = html; 
                element.classList.remove('typing'); 
                element.classList.add('typed-done');
                gameState.isTyping = false; gameState.skipTyping = false; 
                scrollToBottom(); resolve(); return;
            }
            if (nodeIndex >= nodes.length) {
                element.classList.remove('typing'); element.classList.add('typed-done');
                gameState.isTyping = false; resolve(); return;
            }
            const node = nodes[nodeIndex];
            if (node.nodeType === 3) {
                const text = node.nodeValue; let charIndex = 0;
                const liveTextNode = document.createTextNode(""); element.appendChild(liveTextNode);
                function typeChar() {
                    if (gameState.skipTyping) { typeNode(); return; }
                    liveTextNode.nodeValue += text.charAt(charIndex); charIndex++;
                    scrollToBottom();
                    if (charIndex < text.length) setTimeout(typeChar, speed); else { nodeIndex++; typeNode(); }
                }
                typeChar();
            } else {
                element.appendChild(node.cloneNode(true)); nodeIndex++; setTimeout(typeNode, speed);
            }
        }
        typeNode();
    });
}

function printLine(text, type, animate = true, fxClass = '') {
    const p = document.createElement('div');
    p.classList.add('msg');
    if (type) p.classList.add(type);
    if (fxClass) p.classList.add(fxClass);
    output.appendChild(p);

    if (animate) return typeWriter(p, text, (type === 'ai' ? gameState.typingSpeedAI : gameState.typingSpeed));
    else {
        p.innerHTML = text;
        p.classList.add('typed-done');
        scrollToBottom();
        return Promise.resolve();
    }
}

// Resolvers
function resolveTextVariant(blocks, focus) {
    let bestBlock = null; let highestPriority = -1;
    let target = (focus === 'partner') ? gameState.partner : gameState.player;

    const checkCondition = (cond) => {
        if (cond === 'default') return 0;
        if (cond === target.class) return 10;
        if (cond.startsWith('origin:') && target.origin?.toLowerCase().includes(cond.split(':')[1])) return 8;
        if (cond.startsWith('gender:') && target.gender?.toLowerCase().includes(cond.split(':')[1])) return 7;
        if (cond.startsWith('synergy:')) {
            const [s1, s2] = cond.split(':')[1].split('_');
            const map = { tech:'Tech', arts:'Arts', guts:'Guts', social:'Social', bio:'Bio', lore:'Lore' };
            if (target.stats[map[s1]] >= 5 && target.stats[map[s2]] >= 5) return 9;
        }
        return -1;
    };

    blocks.forEach(block => {
        let p = checkCondition(block.condition);
        if (p > highestPriority) { highestPriority = p; bestBlock = block; }
    });
    return bestBlock ? bestBlock.text : "Data Corrupted.";
}

function replacePlaceholders(text) {
    if (!text) return "";
    text = text.replace(/{player}/g, gameState.player.name);
    text = text.replace(/{partner}/g, gameState.partner.name);
    text = text.replace(/{driver}/g, gameState.driver || gameState.player.name);
    text = text.replace(/{passenger}/g, gameState.passenger || gameState.partner.name);
    return text;
}
function formatText(text) { return text ? text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : ""; }
function isDuo(n1, n2) { n1=n1.toLowerCase(); n2=n2.toLowerCase(); return (n1==='beeth' && n2==='lava') || (n1==='lava' && n2==='beeth'); }

// UI Helpers (Compressed)
function startCharCreation(target) { printLine(target === 'player' ? "ENTER NAME (PROTAGONIST 1):" : "ENTER NAME (PROTAGONIST 2):", 'system'); gameState.step = target + '_name'; }
function applyClassSelection(val, target) { const choice=parseInt(val)-1; if(gameState.rules.backgrounds[choice]){ const s=gameState.rules.backgrounds[choice]; const t=(target==='player'?gameState.player:gameState.partner); t.class=s.id; for(let[k,v] of Object.entries(s.bonus))t.stats[k]+=v; showStatCard(s.name,t.stats,t.name); return true; } return false; }
function autoAssignPartner() { gameState.partner.class='adventurer'; gameState.partner.name="The Other"; }
function startGame() { printLine("TIMELINE SYNCHRONIZATION COMPLETE.", 'system'); setTimeout(()=>{ printLine("<hr style='opacity:0.3'>",'system',false); gameState.storyActive=true; loadStoryChapter('chapter_1_p1'); },1000); }
function loadGame() { const d=StorageManager.load(); if(!d){ printLine("ERROR: SAVE CORRUPT.",'system'); triggerNewGameMenu(); return; } Object.assign(gameState, d); gameState.storyActive=true; printLine("RESTORING TIMELINE...",'system'); loadStoryChapter(d.currentChapterId, false); updateUI(); }
function updateUI() { if(invBtn && gameState.inventory.length>0) { invBtn.style.display='block'; invBtn.innerText=`VAULT [${gameState.inventory.length}]`; } else if(invBtn) invBtn.style.display='none'; }
function renderChoices(choices) { gameState.waitingForChoice=true; gameState.currentChoices=choices; let html=`<div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">`; choices.forEach((c,i)=>{ html+=`<button onclick="makeChoice(${i})" style="background:var(--input-bg); border:1px solid var(--border-color); padding:15px; color:var(--text-primary); text-align:left; font-family:var(--font-body); cursor:pointer;"><strong style="color:var(--accent)">[${i+1}]</strong> ${c.text}</button>`; }); html+=`</div>`; const div=document.createElement('div'); div.innerHTML=html; output.appendChild(div); scrollToBottom(); }
function makeChoice(index) { if(!gameState.waitingForChoice) return; const choice=gameState.currentChoices[index]; if(choice.loot){ if(!gameState.inventory) gameState.inventory=[]; gameState.inventory.push(choice.loot); printLine(`>> ACQUIRED: ${choice.loot.name.toUpperCase()}`, 'system'); updateUI(); } if(output.lastChild.innerHTML.includes('<button')) output.removeChild(output.lastChild); printLine(`>> SELECTED: ${choice.text}`, 'system'); gameState.waitingForChoice=false; if(choice.target) loadStoryChapter(choice.target); else { currentSceneIndex++; playNextScene(); } }
function handleChoiceInput(val) { const idx=parseInt(val)-1; if(gameState.currentChoices && gameState.currentChoices[idx]) makeChoice(idx); }
function advanceStory() { if(!gameState.waitingForEnter && !gameState.isTyping) playNextScene(); }
function goBack() { if(!gameState.storyActive||gameState.isTyping) return; let rem=false; while(output.lastChild && !rem){ const el=output.lastChild; output.removeChild(el); if(el.classList.contains('story')||el.classList.contains('ai')) rem=true; } if(currentSceneIndex>0){ currentSceneIndex--; gameState.history.pop(); } gameState.step='reading'; gameState.currentInputType=null; gameState.waitingForChoice=false; input.placeholder="Write your response..."; playNextScene(false); }
function showStatCard(c,s,n) { let h=`<div class="stats-card"><div style="text-align:center;margin-bottom:20px;font-family:var(--font-head);font-size:1.4em;color:var(--text-primary)">${n}<div style="font-size:0.6em;color:var(--accent);text-transform:uppercase;">${c}</div></div><div class="stats-grid">`; for(let[k,v] of Object.entries(s)){ let p=(v/10)*100; h+=`<div class="stat-row"><div class="stat-label"><span>${k}</span><span>${v}/10</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${p}%"></div></div></div>`; } h+=`</div></div>`; printLine(h,'system',false); }
function showSynergyCard() { const p1=gameState.player.stats; const p2=gameState.partner.stats; let s={}; for(let k in p1) s[k]=p1[k]+p2[k]; let h=`<div class="stats-card" style="border-color:var(--text-primary)"><div style="text-align:center;margin-bottom:20px;font-family:var(--font-head);font-size:1.4em;color:var(--text-primary)">SYNERGY</div><div class="stats-grid">`; for(let[k,v] of Object.entries(s)){ let p=(v/20)*100; h+=`<div class="stat-row"><div class="stat-label"><span>${k}</span><span>${v}/20</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${p}%; background:var(--text-primary)"></div></div></div>`; } h+=`</div></div>`; printLine(h,'system',false); }
function renderTelemetry(c) { const h=`<hr style='border:0;border-top:1px solid var(--accent);opacity:0.3;margin:40px 0;'><div style="text-align:center;margin-bottom:30px;"><div style="font-family:var(--font-head);font-size:1.5em;color:var(--accent);">${c.title}</div><div style="font-size:0.75em;color:var(--text-secondary);">LOC: ${c.telemetry.loc} // DATE: ${c.telemetry.time}</div></div>`; const d=document.createElement('div'); d.innerHTML=h; output.appendChild(d); }
function toggleInventory() { const m=document.getElementById('inventory-modal'); const l=document.getElementById('inventory-list'); if(m.classList.contains('active')) m.classList.remove('active'); else { renderInventory(l); m.classList.add('active'); } }
function renderInventory(c) { c.innerHTML=''; if(!gameState.inventory||gameState.inventory.length===0){ c.innerHTML='<div class="empty-msg">VAULT IS EMPTY</div>'; return; } gameState.inventory.forEach(i=>{ const d=document.createElement('div'); d.classList.add('inv-item'); d.innerHTML=`<div class="inv-item-name">${i.name}</div><div class="inv-item-desc">${i.desc}</div>`; c.appendChild(d); }); }
function listClasses() { let h='<div style="margin-bottom:20px;">'; gameState.rules.backgrounds.forEach((b,i)=>{ h+=`<div class="class-card"><strong>[${i+1}] ${b.name}</strong><span>${b.desc}</span></div>`; }); h+='</div>'; printLine(h,'system',false); }
function triggerConfettiEvent() { printLine("WE HAVE BEEN WAITING FOR YOU! ✨", 'ai'); if(typeof confetti==='function'){ confetti({particleCount:100,spread:70,origin:{y:0.6}}); } }
function scrollToBottom() { setTimeout(() => output.scrollTop = output.scrollHeight, 50); }

if(invBtn) invBtn.addEventListener('click', toggleInventory);
if(themeBtn) themeBtn.addEventListener('click', () => document.body.classList.toggle('light-mode'));

init();
