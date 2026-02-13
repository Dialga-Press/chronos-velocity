/* 
   CHRONOS VELOCITY ENGINE v0.1.7
   Features: Audio Synthesis, Parallax, Persistence
*/

// --- 1. AUDIO CONTROLLER (The Wizarding Synth) ---
const AudioController = {
    ctx: null, masterGain: null, reverbNode: null, isMuted: false, isInit: false,

    init() {
        if (this.isInit) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Master Volume
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Default safe volume

        // Algorithmic Reverb (The "Void" Sound)
        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = this.createImpulse(2.0, 2.0); // 2s decay
        this.reverbNode.connect(this.masterGain);

        // Dry Path
        this.masterGain.connect(this.ctx.destination);
        this.isInit = true;
        console.log("[SYS] AUDIO: ONLINE");
    },

    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

    toggleMute() {
        if (!this.isInit) this.init();
        this.isMuted = !this.isMuted;
        const now = this.ctx.currentTime;
        // Smooth fade to prevent popping
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.3, now + 0.1);
        return this.isMuted;
    },

    // Procedural Impulse Response (Math-based Reverb)
    createImpulse(duration, decay) {
        const rate = this.ctx.sampleRate;
        const length = rate * duration;
        const impulse = this.ctx.createBuffer(2, length, rate);
        const L = impulse.getChannelData(0), R = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const n = i / length;
            // Noise * Decay Curve
            L[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
            R[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
        }
        return impulse;
    },

    // SFX: The "Magical Chime" (Celesta-like)
    playChime(pitchOffset = 0) {
        if (this.isMuted || !this.isInit) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        // Random slight detune for organic feel
        osc.frequency.setValueAtTime(880 + (Math.random() * 10) + pitchOffset, t);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.01); // Attack
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0); // Long Decay

        osc.connect(gain);
        gain.connect(this.reverbNode); // Wet
        gain.connect(this.masterGain); // Dry
        osc.start(t);
        osc.stop(t + 1.0);
    },

    // SFX: The "Data Blip" (UI Interaction)
    playBlip() {
        if (this.isMuted || !this.isInit) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, t);
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.1);
    },
    
    // Shortcuts
    playType() { this.playChime(400); }, // High pitch for text
    playAI() { this.playChime(-200); }   // Low pitch for AI
};

// --- 2. GAME STATE ---
let gameState = {
    step: 'boot',
    mode: 'solo',
    player: { name: '', class: '', age: '', gender: '', origin: '', height: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    partner: { name: '', class: '', age: '', gender: '', origin: '', height: '', stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 } },
    inventory: [],
    history: [],
    rules: null,
    story: null,
    storyActive: false,
    waitingForEnter: false,
    waitingForChoice: false,
    currentInputType: null,
    currentChoices: null,
    driver: '',
    passenger: '',
    citationsShown: false,
    isTyping: false,
    skipTyping: false,
    typingSpeed: 25,
    typingSpeedAI: 40
};

// --- 3. STORAGE MANAGER ---
const StorageManager = {
    save: (gs, chId, scIdx) => {
        const data = {
            timestamp: Date.now(),
            mode: gs.mode,
            player: gs.player,
            partner: gs.partner,
            driver: gs.driver,
            passenger: gs.passenger,
            inventory: gs.inventory,
            history: gs.history,
            currentChapterId: chId,
            currentSceneIndex: scIdx
        };
        try { localStorage.setItem('CV_SAVE_V1', JSON.stringify(data)); } catch(e){}
    },
    load: () => {
        try { return JSON.parse(localStorage.getItem('CV_SAVE_V1')); } catch(e){ return null; }
    },
    hasSave: () => !!localStorage.getItem('CV_SAVE_V1'),
    clear: () => localStorage.removeItem('CV_SAVE_V1')
};

// --- 4. INPUT PROCESSOR ---
const InputProcessor = {
    processBio(type, rawVal) {
        const val = rawVal.toLowerCase().trim();
        let response = null;
        let formattedVal = rawVal;

        if (type === 'height') {
            const match = val.match(/(\d+)'?(\d*)?/);
            let cm = parseFloat(val);
            if (match && val.includes("'")) {
                cm = (parseInt(match[1]) * 30.48) + (parseInt(match[2] || 0) * 2.54);
            }
            if (cm > 190) response = `Wow. ${Math.round(cm)}cm? You're a tower. 🦒`;
            else if (cm < 160) response = `Compact format (${Math.round(cm)}cm). Stealth bonus. 🐁`;
            else response = `Standard displacement (${Math.round(cm)}cm). Calibrating. ✅`;
            formattedVal = `${Math.round(cm)}cm`;
        }
        else if (type === 'origin') {
            if (val.includes('india')) response = "India? Excellent. Loading Sanskrit subroutines. 🌶️";
            else if (val.includes('uk')) response = "UK? Stiff upper lip. Tea synthesis engaged. ☕";
            else if (val.includes('usa')) response = "USA? Switching units to Metric. Deal with it. 🦅";
            else response = `${rawVal}? Exotic. Downloading cultural database... 🌍`;
        }
        return { response, formattedVal };
    }
};

// --- 5. DOM & INIT ---
const output = document.getElementById('game-output');
const input = document.getElementById('player-input');
const invBtn = document.getElementById('inventory-btn');
const themeBtn = document.getElementById('theme-toggle');

// Create Audio Button dynamically if not in HTML
let audioBtn = document.getElementById('audio-toggle');
if (!audioBtn) {
    // Inject into header if missing
    const headerControls = document.querySelector('.header-controls');
    if(headerControls) {
        audioBtn = document.createElement('button');
        audioBtn.id = 'audio-toggle';
        audioBtn.innerHTML = '🔈'; // Start icon
        audioBtn.style.background = 'none';
        audioBtn.style.border = 'none';
        audioBtn.style.color = 'var(--text-secondary)';
        audioBtn.style.fontSize = '1.2rem';
        audioBtn.style.cursor = 'pointer';
        headerControls.prepend(audioBtn);
    }
}

async function init() {
    // Global Listeners for Audio Unlocking
    document.addEventListener('click', () => AudioController.init(), { once: true });
    document.addEventListener('keydown', () => AudioController.init(), { once: true });

    // UI Bindings
    if(themeBtn) themeBtn.addEventListener('click', () => document.body.classList.toggle('light-mode'));
    if(invBtn) invBtn.addEventListener('click', toggleInventory);
    if(audioBtn) audioBtn.addEventListener('click', () => {
        const muted = AudioController.toggleMute();
        audioBtn.innerHTML = muted ? '🔇' : '🔈';
        audioBtn.style.opacity = muted ? '0.5' : '1';
    });
    
    // Data Fetch
    try {
        const [rulesRes, storyRes] = await Promise.all([
            fetch('data/rules.json'),
            fetch('data/story.json')
        ]);
        if (!rulesRes.ok || !storyRes.ok) throw new Error("File Fetch Failed");
        gameState.rules = await rulesRes.json();
        gameState.story = await storyRes.json();
    } catch (e) {
        printLine(`CRITICAL ERROR: ${e.message}`, 'system', false);
        return;
    }

    // Parallax Effect Listener
    document.addEventListener('mousemove', (e) => {
        const images = document.querySelectorAll('.story-image');
        images.forEach(img => {
            const speed = 15;
            const x = (window.innerWidth - e.pageX * speed) / 100;
            const y = (window.innerHeight - e.pageY * speed) / 100;
            img.style.transform = `translateX(${x}px) translateY(${y}px) rotateY(${x * 0.05}deg) rotateX(${y * 0.05}deg)`;
        });
    });

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
    printLine("SELECT NARRATIVE MODE:", 'system', false).then(() => {
        printLine("[1] SOLO CHRONICLE", 'story', false);
        printLine("[2] DUAL CHRONICLE", 'story', false);
    });
}

// --- 6. MAIN INPUT LOOP ---
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const val = input.value.trim();
        AudioController.resume(); // Ensure audio active
        
        if (gameState.isTyping) {
            gameState.skipTyping = true;
            e.preventDefault();
            return;
        }

        if (gameState.waitingForChoice) { input.value=''; if(val) handleChoiceInput(val); return; }
        if (gameState.step === 'story_input') { if(!val) return; input.value=''; handleStoryInput(val); return; }
        if (gameState.storyActive) { input.value=''; advanceStory(); return; }
        
        if (val) {
            input.value = '';
            processMenuInput(val);
        }
    }
});

// --- MENU LOGIC ---
function processMenuInput(val) {
    AudioController.playBlip();

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
        
        if (t === 'player' && val.toLowerCase() === 'lava') {
            printLine("... IDENTITY FLAGGED.", 'system');
            setTimeout(() => { printLine("Is <strong>Beeth</strong> with you? [Y/N]", 'ai'); gameState.step = 'easter_egg_check'; }, 600);
            return;
        }
        if (t === 'partner') { if (isDuo(gameState.player.name, val)) triggerConfettiEvent(); }

        printLine(`${t.toUpperCase()} ID: ${val}`, 'story');
        listClasses();
        gameState.step = t + '_class';
    }
    else if (gameState.step === 'easter_egg_check') {
        if (val.toLowerCase().startsWith('y')) {
            gameState.partner.name = 'Beeth'; triggerConfettiEvent(); gameState.mode = 'coop';
            printLine(`Protagonist 1: <strong>Lava</strong>`, 'story'); setTimeout(() => listClasses(), 1000); gameState.step = 'player_class';
        } else {
            printLine(`Protagonist 1: <strong>Lava</strong>`, 'story'); setTimeout(() => listClasses(), 500); gameState.step = 'player_class';
        }
    }
    else if (gameState.step.includes('_class')) {
        let t = gameState.step.split('_')[0];
        if (applyClassSelection(val, t)) {
            const DELAY = 2000;
            if (t === 'player') {
                if (gameState.mode === 'solo') {
                    setTimeout(() => { printLine("Configure Secondary Asset? [Y/N]", 'system'); gameState.step = 'partner_query'; }, DELAY);
                } else {
                    if (gameState.partner.name) {
                        setTimeout(() => {
                            printLine(`Protagonist 2: <strong>${gameState.partner.name}</strong>`, 'story');
                            setTimeout(() => { printLine("Select Origin Protocol:", 'system'); listClasses(); }, 500);
                            gameState.step = 'partner_class';
                        }, DELAY);
                    } else {
                        setTimeout(() => startCharCreation('partner'), DELAY);
                    }
                }
            } else {
                setTimeout(() => startGame(), DELAY);
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
    if (currentChapterData.id) StorageManager.save(gameState, currentChapterData.id, currentSceneIndex);
    if (saveHistory) gameState.history.push({ chapterId: currentChapterData.id, index: currentSceneIndex });

    if (scene.mode_req && scene.mode_req !== gameState.mode) {
        if(saveHistory) gameState.history.pop();
        currentSceneIndex++; playNextScene(saveHistory); return;
    }

    if (scene.input_prompt) {
        let promptText = resolveTextVariant(scene.text_blocks, scene.focus);
        printLine(replacePlaceholders(promptText), scene.focus === 'ai' ? 'ai' : 'story').then(() => {
            gameState.step = 'story_input';
            gameState.currentInputType = scene.input_prompt;
            input.placeholder = scene.input_prompt === 'height' ? "E.g. 5'11" : `Enter ${scene.input_prompt}...`;
        });
        return;
    }

    if (scene.choices) {
        let text = replacePlaceholders(resolveTextVariant(scene.text_blocks, scene.focus));
        printLine(text, scene.focus === 'ai' ? 'ai' : 'story').then(() => renderChoices(scene.choices));
        return;
    }

    let text = resolveTextVariant(scene.text_blocks, scene.focus);
    text = replacePlaceholders(text);
    text = formatText(text);
    let msgType = scene.focus === 'ai' ? 'ai' : (scene.focus === 'system' ? 'system' : 'story');
    
    let fxClass = '';
    if (scene.fx === 'shake') fxClass = 'fx-shake';
    if (scene.fx === 'heat') fxClass = 'fx-heat';
    if (scene.fx === 'cold') fxClass = 'fx-cold';

    printLine(text, msgType, true, fxClass).then(() => {
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

// --- UTILS ---
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
        if (typeof InputProcessor !== 'undefined') {
            let res = InputProcessor.processBio(type, val);
            if (res && res.response) { response = res.response; if(res.formattedVal) val = res.formattedVal; }
        }
        if (gameState.mode === 'solo' || currentSceneIndex < 10) gameState.player[type] = val;
        printLine(`>> DATA LOGGED: ${val.toUpperCase()}`, 'system');
    }
    gameState.step = 'reading'; gameState.currentInputType = null; input.placeholder = "Write your response..."; currentSceneIndex++;
    if (response) { printLine(response, 'ai').then(() => { setTimeout(playNextScene, 1000); }); } else { playNextScene(); }
}

function typeWriter(element, html, speed) {
    return new Promise((resolve) => {
        gameState.isTyping = true; gameState.skipTyping = false; element.classList.add('typing');
        const tempDiv = document.createElement('div'); tempDiv.innerHTML = html;
        const nodes = Array.from(tempDiv.childNodes);
        element.innerHTML = ""; let nodeIndex = 0;
        function typeNode() {
            if (gameState.skipTyping) { element.innerHTML = html; finishTyping(); resolve(); return; }
            if (nodeIndex >= nodes.length) { finishTyping(); resolve(); return; }
            const node = nodes[nodeIndex];
            if (node.nodeType === 3) {
                const text = node.nodeValue; let charIndex = 0; const liveTextNode = document.createTextNode(""); element.appendChild(liveTextNode);
                function typeChar() {
                    if (gameState.skipTyping) { typeNode(); return; }
                    liveTextNode.nodeValue += text.charAt(charIndex); charIndex++;
                    
                    // AUDIO TRIGGER
                    if(charIndex % 3 === 0) {
                        if(element.classList.contains('ai')) AudioController.playAI();
                        else AudioController.playType();
                    }
                    
                    output.scrollTop = output.scrollHeight;
                    if (charIndex < text.length) setTimeout(typeChar, speed); else { nodeIndex++; typeNode(); }
                }
                typeChar();
            } else { element.appendChild(node.cloneNode(true)); nodeIndex++; setTimeout(typeNode, speed); }
        }
        function finishTyping() { element.classList.remove('typing'); element.classList.add('typed-done'); gameState.isTyping = false; output.scrollTop = output.scrollHeight; }
        typeNode();
    });
}

function printLine(text, type, animate = true, fxClass = '') {
    const p = document.createElement('div'); p.classList.add('msg'); if (type) p.classList.add(type); if (fxClass) p.classList.add(fxClass); output.appendChild(p);
    if (animate) return typeWriter(p, text, (type === 'ai' ? 40 : 25)); else { p.innerHTML = text; p.classList.add('typed-done'); return Promise.resolve(); }
}

// ... Rest of UI Helpers (listClasses, showStatCard, etc) ...
function startCharCreation(target) { printLine(target === 'player' ? "ENTER NAME (PROTAGONIST 1):" : "ENTER NAME (PROTAGONIST 2):", 'system'); gameState.step = target + '_name'; }
function applyClassSelection(val, target) { const choice=parseInt(val)-1; if(gameState.rules.backgrounds[choice]){ const s=gameState.rules.backgrounds[choice]; const t=(target==='player'?gameState.player:gameState.partner); t.class=s.id; for(let[k,v] of Object.entries(s.bonus))t.stats[k]+=v; showStatCard(s.name,t.stats,t.name); return true; } return false; }
function autoAssignPartner() { gameState.partner.class = 'adventurer'; gameState.partner.name = "The Other"; }
function loadGame() { const data=StorageManager.load(); if(!data){ printLine("ERROR: SAVE CORRUPT.",'system'); triggerNewGameMenu(); return; } AudioController.playBlip(); Object.assign(gameState, data); gameState.storyActive=true; printLine("RESTORING TIMELINE...",'system'); loadStoryChapter(data.currentChapterId, false); updateUI(); }
function listClasses() { let h='<div style="margin-bottom:20px;">'; gameState.rules.backgrounds.forEach((b,i)=>{ h+=`<div class="class-card"><strong>[${i+1}] ${b.name}</strong><span>${b.desc}</span></div>`; }); h+='</div>'; printLine(h,'system',false); }
function showStatCard(c,s,n) { let h=`<div class="stats-card"><div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">${n}<div style="font-size:0.6em; color:var(--accent); text-transform:uppercase;">${c}</div></div><div class="stats-grid">`; for(let[k,v] of Object.entries(s)){ let p=(v/10)*100; h+=`<div class="stat-row"><div class="stat-label"><span>${k}</span><span>${v}/10</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${p}%"></div></div></div>`; } h+=`</div></div>`; printLine(h,'system',false); }
function showSynergyCard() { const p1=gameState.player.stats; const p2=gameState.partner.stats; let s={}; for(let k in p1) s[k]=p1[k]+p2[k]; let h=`<div class="stats-card" style="border-color:var(--text-primary)"><div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">TEAM SYNERGY<div style="font-size:0.6em; color:var(--text-secondary); text-transform:uppercase;">COMBINED POTENTIAL</div></div><div class="stats-grid">`; for(let[k,v] of Object.entries(s)){ let p=(v/20)*100; h+=`<div class="stat-row"><div class="stat-label"><span>${k}</span><span>${v}/20</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${p}%; background:var(--text-primary)"></div></div></div>`; } h+=`</div></div>`; printLine(h,'system',false); }
function renderTelemetry(c) { const hr = `<hr style='border:0; border-top:1px solid var(--accent); opacity:0.3; margin:40px 0;'>`; let html = `${hr}<div style="text-align:center; margin-bottom:30px; letter-spacing:1px;"><div style="font-family:var(--font-head); font-size:1.5em; color:var(--accent); margin-bottom:10px;">${c.title}</div><div style="font-size:0.75em; color:var(--text-secondary); text-transform:uppercase;">LOC: ${c.telemetry.loc} // DATE: ${c.telemetry.time}</div></div>`; const div = document.createElement('div'); div.innerHTML = html; output.appendChild(div); }
function renderChoices(choices) { gameState.waitingForChoice=true; gameState.currentChoices=choices; let html=`<div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">`; choices.forEach((c,i)=>{ let disabled=false; if(c.req){ let statVal=gameState.player.stats[c.req.stat]||0; if(statVal<c.req.val) disabled=true; } html+=`<button onclick="window.engine.makeChoice(${i})" ${disabled?'disabled':''} class="class-card" style="width:100%; text-align:left; cursor:pointer;"><strong style="color:var(--accent)">[${i+1}]</strong> ${c.text}</button>`; }); html+=`</div>`; const div=document.createElement('div'); div.innerHTML=html; output.appendChild(div); scrollToBottom(); }
function makeChoice(i) { AudioController.playBlip(); if(!gameState.waitingForChoice) return; const c=gameState.currentChoices[i]; if(c.loot){ if(!gameState.inventory) gameState.inventory=[]; gameState.inventory.push(c.loot); printLine(`>> ACQUIRED: ${c.loot.name.toUpperCase()}`, 'system'); updateUI(); } if(output.lastChild.innerHTML.includes('<button')) output.removeChild(output.lastChild); printLine(`>> SELECTED: ${c.text}`, 'system'); gameState.waitingForChoice=false; if(c.target) loadStoryChapter(c.target); else { currentSceneIndex++; playNextScene(); } }
function handleChoiceInput(val) { const idx = parseInt(val) - 1; if (gameState.currentChoices && gameState.currentChoices[idx]) makeChoice(idx); }
function updateUI() { if (invBtn && gameState.inventory.length > 0) { invBtn.style.display = 'block'; invBtn.innerText = `VAULT [${gameState.inventory.length}]`; } else if (invBtn) { invBtn.style.display = 'none'; } }
function toggleInventory() { const m=document.getElementById('inventory-modal'); const l=document.getElementById('inventory-list'); if (m.classList.contains('active')) { m.classList.remove('active'); } else { renderInventory(l); m.classList.add('active'); } }
function renderInventory(c) { c.innerHTML=''; if(!gameState.inventory||gameState.inventory.length===0){ c.innerHTML='<div class="empty-msg">VAULT IS EMPTY</div>'; return; } gameState.inventory.forEach(i=>{ const d=document.createElement('div'); d.classList.add('inv-item'); d.innerHTML=`<div class="inv-item-name">${i.name}</div><div class="inv-item-desc">${i.desc}</div>`; c.appendChild(d); }); }
function triggerConfettiEvent() { printLine("WE HAVE BEEN WAITING FOR YOU! ✨", 'ai'); if (typeof confetti === 'function') { var duration = 2000; var end = Date.now() + duration; (function frame() { confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } }); confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } }); if (Date.now() < end) requestAnimationFrame(frame); }()); } }
function goBack() { if (!gameState.storyActive || gameState.isTyping) return; let rem = false; while(output.lastChild && !rem) { const el = output.lastChild; output.removeChild(el); if(el.classList.contains('story') || el.classList.contains('ai')) rem = true; } if (currentSceneIndex > 0) { currentSceneIndex--; gameState.history.pop(); } else if (gameState.history.length > 0) { const prevState = gameState.history.pop(); if(prevState && prevState.chapterId !== currentChapterData.id) { currentChapterData = gameState.story[prevState.chapterId]; currentSceneIndex = prevState.index; } } gameState.step = 'reading'; gameState.currentInputType = null; gameState.waitingForChoice = false; gameState.currentChoices = null; input.placeholder = "Write your response..."; gameState.waitingForEnter = false; playNextScene(false); }
function formatText(text) { return text ? text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : ""; }
function replacePlaceholders(text) { if (!text) return ""; text = text.replace(/{player}/g, gameState.player.name); text = text.replace(/{partner}/g, gameState.partner.name); text = text.replace(/{driver}/g, gameState.driver || gameState.player.name); text = text.replace(/{passenger}/g, gameState.passenger || gameState.partner.name); return text; }
function resolveTextVariant(blocks, focus) { let bestBlock = null; let highestPriority = -1; let target = (focus === 'partner') ? gameState.partner : gameState.player; const checkCondition = (cond) => { if (cond === 'default') return 0; if (cond === target.class) return 10; if (cond.startsWith('origin:') && target.origin?.toLowerCase().includes(cond.split(':')[1])) return 8; if (cond.startsWith('gender:') && target.gender?.toLowerCase().includes(cond.split(':')[1])) return 7; if (cond.startsWith('synergy:')) { const [s1, s2] = cond.split(':')[1].split('_'); const map = { tech:'Tech', arts:'Arts', guts:'Guts', social:'Social', bio:'Bio', lore:'Lore' }; if (target.stats[map[s1]] >= 5 && target.stats[map[s2]] >= 5) return 9; } return -1; }; blocks.forEach(block => { let p = checkCondition(block.condition); if (p > highestPriority) { highestPriority = p; bestBlock = block; } }); return bestBlock ? bestBlock.text : "Data Corrupted."; }
function isDuo(n1, n2) { n1=n1.toLowerCase(); n2=n2.toLowerCase(); return (n1==='beeth' && n2==='lava') || (n1==='lava' && n2==='beeth'); }
function advanceStory() { if(!gameState.waitingForEnter && !gameState.isTyping) playNextScene(); }
function scrollToBottom() { setTimeout(() => output.scrollTop = output.scrollHeight, 50); }

init();
