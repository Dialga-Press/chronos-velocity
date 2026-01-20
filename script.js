// State Management
let gameState = {
    step: 'boot', 
    player: {
        name: 'UNKNOWN',
        class: 'CIVILIAN',
        stats: { Tech: 1, Guts: 1, Charm: 1, Lore: 1 }
    },
    rules: null
};

const output = document.getElementById('story-output');
const input = document.getElementById('player-input');

// Audio for vibes (Optional logic placeholder)
const sfxType = new Audio(); // Placeholder if you add sound later

async function init() {
    try {
        const res = await fetch('data/rules.json');
        gameState.rules = await res.json();
        typeWriter(gameState.rules.intro_text, 'system-msg');
        gameState.step = 'name';
    } catch (e) {
        output.innerHTML = "CRITICAL ERROR: DATABASE DISCONNECTED.";
    }
}

// Typewriter Effect (The Visual Novel feel)
function typeWriter(text, className = '') {
    const div = document.createElement('div');
    if(className) div.classList.add(className);
    output.appendChild(div);
    
    let i = 0;
    const speed = 20; // ms per char

    function type() {
        if (i < text.length) {
            div.innerHTML += text.charAt(i) === '\n' ? '<br>' : text.charAt(i);
            i++;
            output.scrollTop = output.scrollHeight;
            setTimeout(type, speed);
        }
    }
    type();
}

// Update the MHA Stats Bars
function updateHUD() {
    document.getElementById('char-name').innerText = gameState.player.name.toUpperCase();
    document.getElementById('char-archetype').innerText = gameState.player.class.toUpperCase();
    
    // Animate Bars (Max stat 10 for visuals)
    document.getElementById('bar-tech').style.width = (gameState.player.stats.Tech * 10) + '%';
    document.getElementById('bar-guts').style.width = (gameState.player.stats.Guts * 10) + '%';
    document.getElementById('bar-charm').style.width = (gameState.player.stats.Charm * 10) + '%';
    document.getElementById('bar-lore').style.width = (gameState.player.stats.Lore * 10) + '%';
}

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const val = input.value;
        if(!val) return;
        
        input.value = '';
        
        // Add User Input to log
        const p = document.createElement('div');
        p.textContent = `>> ${val}`;
        p.classList.add('user-msg');
        output.appendChild(p);

        processGame(val);
    }
});

function processGame(val) {
    if (gameState.step === 'name') {
        gameState.player.name = val;
        typeWriter(`IDENTITY VERIFIED: ${val}. \n\nSELECT YOUR ARCHETYPE:`);
        
        // List Classes
        let list = "";
        gameState.rules.backgrounds.forEach((bg, index) => {
            list += `\n[${index + 1}] ${bg.name}\n   "${bg.desc}"\n`;
        });
        typeWriter(list);
        
        gameState.step = 'class';
    }
    else if (gameState.step === 'class') {
        const choice = parseInt(val) - 1;
        const selected = gameState.rules.backgrounds[choice];
        
        if (selected) {
            gameState.player.class = selected.name;
            // Add Bonuses
            for (let [k, v] of Object.entries(selected.bonus)) {
                gameState.player.stats[k] += v;
            }
            updateHUD();
            typeWriter(`\nARCHETYPE LOCKED: ${selected.name}.\nSTATS UPDATED.\n\nINITIALIZING VOLUME 1: THE DROP...`);
            gameState.step = 'story_start';
        } else {
            typeWriter("INVALID SELECTION. RETRY.");
        }
    }
}

init();
