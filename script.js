let gameState = {
    step: 'name', 
    player: {
        name: '',
        class: '',
        // Initialize with Base Stats (2) for everyone
        stats: { Tech: 2, Arts: 2, Guts: 2, Social: 2, Bio: 2, Lore: 2 }
    },
    rules: null,
    story: null
};

const output = document.getElementById('game-output');
const input = document.getElementById('player-input');

async function init() {
    // 1. Load Data
    try {
        const rulesRes = await fetch('data/rules.json');
        gameState.rules = await rulesRes.json();
    } catch (e) {
        console.error("Failed to load rules", e);
        printLine("Error: Could not load game data.", 'system');
    }

    // 2. Start Interface
    printLine("System Connected.", 'system');
    setTimeout(() => {
        printLine("Welcome, Traveler. Before we synchronize with the timeline, I need to know who you are.", 'story');
        printLine("Enter your name:", 'system');
    }, 800);
}

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const val = input.value.trim();
        if(!val && gameState.step !== 'reading') return; // Allow empty enter for reading
        input.value = '';
        processInput(val);
    }
});

function processInput(val) {
    // STEP 1: NAME
    if (gameState.step === 'name') {
        gameState.player.name = val;
        
        // Visual feedback
        const div = document.createElement('div');
        div.classList.add('msg', 'story');
        div.innerHTML = `Identity Verified: <strong>${val}</strong>`;
        output.appendChild(div);

        setTimeout(() => {
            printLine("Select your Origin Protocol:", 'system');
            listClasses(); 
        }, 600);
        gameState.step = 'class';
    } 
    // STEP 2: CLASS SELECTION
    else if (gameState.step === 'class') {
        const choice = parseInt(val) - 1;
        const classes = gameState.rules.backgrounds;
        
        if (classes[choice]) {
            const selected = classes[choice];
            gameState.player.class = selected.id;
            
            // Apply Bonuses
            for (let [key, value] of Object.entries(selected.bonus)) {
                if(gameState.player.stats[key] !== undefined) {
                    gameState.player.stats[key] += value;
                }
            }
            
            showStatCard(selected.name, gameState.player.stats);
            
            // START THE STORY ENGINE
            setTimeout(() => {
                printLine("<hr style='border:0; border-top:1px solid var(--accent); opacity:0.3; margin:30px 0;'>", 'system'); 
                loadStoryChapter('chapter_1');
            }, 1000);

            gameState.step = 'reading'; 
        } else {
            printLine("Invalid selection. Please enter the number.", 'system');
        }
    }
    // STEP 3: READING STORY
    else if (gameState.step === 'reading') {
        advanceStory();
    }
}

// --- NEW STORY FUNCTIONS ---

let currentSceneIndex = 0;
let currentChapterData = null;

async function loadStoryChapter(chapterId) {
    // Fetch story data if not loaded
    if(!gameState.story) {
        try {
            const res = await fetch('data/story.json');
            gameState.story = await res.json();
        } catch(e) {
            printLine("Error loading story chapter.", 'system');
            return;
        }
    }
    
    currentChapterData = gameState.story[chapterId];
    if(currentChapterData) {
        printLine(currentChapterData.title, 'system');
        playNextScene();
    } else {
        printLine("End of available content.", 'system');
    }
}

function playNextScene() {
    if (!currentChapterData || currentSceneIndex >= currentChapterData.scenes.length) {
        printLine(">> END OF VOLUME 1 DEMO", 'system');
        return;
    }

    const scene = currentChapterData.scenes[currentSceneIndex];
    const text = resolveTextVariant(scene.text_blocks);
    
    // Typing delay
    setTimeout(() => {
        printLine(text, 'story');
        currentSceneIndex++;
        
        // If there are more scenes, prompt user to continue
        if (currentSceneIndex < currentChapterData.scenes.length) {
             printLine("<i>(Press Enter to continue...)</i>", 'system');
        } else {
             printLine("<i>(End of Chapter)</i>", 'system');
        }
    }, 600);
}

function advanceStory() {
    playNextScene();
}

function resolveTextVariant(blocks) {
    // 1. Exact Class Match
    let match = blocks.find(b => b.condition === gameState.player.class);
    if(match) return match.text;

    // 2. High Stat Match (Check top stat)
    const stats = gameState.player.stats;
    // Sort keys by value descending
    const sortedStats = Object.keys(stats).sort((a,b) => stats[b] - stats[a]);
    const topStat = sortedStats[0].toLowerCase();
    
    match = blocks.find(b => b.condition === `high_${topStat}`);
    if(match) return match.text;

    // 3. Default
    match = blocks.find(b => b.condition === 'default');
    return match ? match.text : "Data Corrupted.";
}

// Function to update stats dynamically during the story
function updateStat(statName, amount) {
    if (gameState.player.stats[statName] !== undefined) {
        gameState.player.stats[statName] += amount;
        // Clamp at 10
        if(gameState.player.stats[statName] > 10) gameState.player.stats[statName] = 10;
        
        printLine(`>> STAT UPDATE: ${statName} +${amount}`, 'system');
    }
}

// --- UI FUNCTIONS ---

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

function showStatCard(className, stats) {
    let html = `
    <div class="stats-card">
        <div style="text-align:center; margin-bottom:20px; font-family:var(--font-head); font-size:1.4em; color:var(--text-primary)">
            ${gameState.player.name}
            <div style="font-size:0.6em; color:var(--accent); text-transform:uppercase; margin-top:5px; letter-spacing:2px;">${className}</div>
        </div>
        <div class="stats-grid">`;

    for (let [key, val] of Object.entries(stats)) {
        // Calculate percentage (max 10)
        let pct = (val / 10) * 100;
        
        html += `
        <div class="stat-row">
            <div class="stat-label">
                <span>${key}</span>
                <span>${val}/10</span>
            </div>
            <div class="stat-bar-bg">
                <div class="stat-bar-fill" style="width:${pct}%"></div>
            </div>
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
    // Small delay to ensure DOM is rendered before scrolling
    setTimeout(() => {
        output.scrollTop = output.scrollHeight;
    }, 50);
}

init();

// --- THEME TOGGLER ---
const themeBtn = document.getElementById('theme-toggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');

// 1. Check Local Storage on Load
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'light') {
    document.body.classList.add('light-mode');
    toggleIcons(true);
}

// 2. Button Click Event
if(themeBtn) {
    themeBtn.addEventListener('click', function() {
        document.body.classList.toggle('light-mode');
        
        let theme = 'dark';
        if (document.body.classList.contains('light-mode')) {
            theme = 'light';
            toggleIcons(true);
        } else {
            toggleIcons(false);
        }
        
        // Save preference
        localStorage.setItem('theme', theme);
    });
}

function toggleIcons(isLight) {
    if(sunIcon && moonIcon) {
        if (isLight) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }
}
