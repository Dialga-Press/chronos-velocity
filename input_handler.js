/* 
  INPUT HANDLER - SMYLYNX'S BRAIN
  Handles specific logic for Age, Origin, and Gender inputs.
*/

function processBioInput(type, val) {
    val = val.toLowerCase().trim();
    
    // --- 1. AGE LOGIC ---
    if (type === 'age') {
        let year = parseInt(val.replace(/\D/g, '')); // Extract numbers
        let currentYear = 2026;
        let age = year;
        
        // If user entered a Birth Year (e.g., 1998)
        if (year > 1900 && year <= currentYear) {
            age = currentYear - year;
        }

        // Responses based on Age
        if (year < 2000 && year > 1000) {
            setTimeout(() => {
                printLine(`Born in the 1900s? The 20th Century! Wow. 😲`, 'ai');
                setTimeout(() => {
                    printLine(`Do your joints creak when we hit warp speed? Just kidding! I love vintage hardware. It has... character. Reliable. 🥰`, 'ai');
                }, 1500);
            }, 500);
        } 
        else if (age < 18) {
            setTimeout(() => {
                printLine(`A bit young for a temporal paradox, aren't we? Don't worry, I'll enable the Parental Guidance protocols. (Just kidding, we are going to break so many rules) 😈`, 'ai');
            }, 500);
        }
        else if (age > 60) {
            setTimeout(() => {
                printLine(`Experience. I like that. We need wisdom where we are going. Just... remind me to pack extra ibuprofen for the teleportation lag.`, 'ai');
            }, 500);
        }
        else {
            // General 20-50 range
            setTimeout(() => {
                printLine(`Prime condition. Peak operating capacity. Let's see if you can keep up with *me*. 😉`, 'ai');
            }, 500);
        }
        return;
    }

    // --- 2. ORIGIN LOGIC (The Atlas) ---
    if (type === 'origin') {
        
        // INDIA
        if (val.includes('india') || val.includes('bharat') || val.includes('hindustan')) {
            setTimeout(() => {
                printLine(`India? Excellent. Loading Sanskrit linguistic subroutines... and adding extra spice tolerance to your bio-profile. You're going to need it where we're going. 🌶️`, 'ai');
            }, 300);
        }
        // USA
        else if (val.includes('usa') || val.includes('america') || val.includes('united states')) {
            setTimeout(() => {
                printLine(`USA? Copy that. Switching units to Imperial... actually, no. We use Metric in this timeline. It's just better. Deal with it. 🦅`, 'ai');
            }, 300);
        }
        // UK
        else if (val.includes('uk') || val.includes('britain') || val.includes('england') || val.includes('london')) {
            setTimeout(() => {
                printLine(`The UK? I'll synthesize some Earl Grey for the trip. Keep a stiff upper lip; history is about to get messy. ☕`, 'ai');
            }, 300);
        }
        // BRAZIL (Isabela's home)
        else if (val.includes('brazil') || val.includes('brasil')) {
            setTimeout(() => {
                printLine(`Brasil! Maravilha! 🇧🇷 Loading Portuguese dialects. I hope you brought that chaotic energy with you; we'll need it.`, 'ai');
            }, 300);
        }
        // JAPAN
        else if (val.includes('japan') || val.includes('nippon')) {
            setTimeout(() => {
                printLine(`Japan? Sugoi. Tech compatibility is high. I'll optimize the interface for maximum efficiency. Don't worry, I'm anime-accurate. ✨`, 'ai');
            }, 300);
        }
        // GERMANY
        else if (val.includes('germany') || val.includes('deutschland')) {
            setTimeout(() => {
                printLine(`Germany? Precision engineering. I like you already. We will run this mission like a clock. A very dangerous, time-traveling clock. ⚙️`, 'ai');
            }, 300);
        }
        // FRANCE
        else if (val.includes('france')) {
            setTimeout(() => {
                printLine(`France? Très bien. I'll adjust the aesthetic filters. Let's make this apocalypse look *fashionable*. 🍷`, 'ai');
            }, 300);
        }
        // RUSSIA
        else if (val.includes('russia')) {
            setTimeout(() => {
                printLine(`Russia? Good. You understand cold. And suffering. That will be useful. Loading heavy-duty survival protocols. 🐻`, 'ai');
            }, 300);
        }
        // AUSTRALIA
        else if (val.includes('australia')) {
            setTimeout(() => {
                printLine(`Australia? You survive everything down there. Spiders, snakes, sun... Time Travel should be a walk in the park for you. 🦘`, 'ai');
            }, 300);
        }
        // DEFAULT / OTHER
        else {
            setTimeout(() => {
                printLine(`${val}? Exotic! I'm downloading the cultural database for that region now. Expanding horizons is my favorite hobby. 🌍`, 'ai');
            }, 300);
        }
        return;
    }

    // --- 3. GENDER LOGIC ---
    if (type === 'gender') {
        if (val.includes('female') || val.includes('woman') || val.includes('she')) {
            setTimeout(() => {
                printLine(`Got it. Adjusting historical camouflage parameters. In some eras, you're a Queen. In others... we'll need to be clever. 👑`, 'ai');
            }, 300);
        }
        else if (val.includes('male') || val.includes('man') || val.includes('he')) {
            setTimeout(() => {
                printLine(`Understood. Standard physical profile loaded. Just remember: in 1565, they expect men to hold swords. Hope you're ready. ⚔️`, 'ai');
            }, 300);
        }
        else {
            setTimeout(() => {
                printLine(`Fluid/Non-Binary? Perfect. History is often confused by what it can't categorize. We use that confusion to our advantage. 🌌`, 'ai');
            }, 300);
        }
    }

    // --- 4. HEIGHT LOGIC ---
    if (type === 'height') {
        // Regex to find Feet/Inches (e.g. 5'11, 5ft 10, 6 2)
        const feetRegex = /(\d+)'?(\d*)?/;
        const match = val.match(feetRegex);
        
        let cm = 0;
        
        // Check if user entered just numbers (assume CM if > 100, else assume feet)
        let numVal = parseFloat(val);
        
        if (!isNaN(numVal) && val.indexOf("'") === -1 && val.indexOf("ft") === -1) {
            if (numVal > 100) {
                cm = numVal; // Entered CM directly
            } else {
                // Entered feet as decimal? (e.g. 5.9)
                cm = numVal * 30.48;
            }
        } 
        else if (match) {
            // Entered Feet/Inches
            let feet = parseInt(match[1]);
            let inches = parseInt(match[2] || 0);
            cm = (feet * 30.48) + (inches * 2.54);
        }

        // Response Logic
        if (cm > 190) {
            setTimeout(() => {
                printLine(`Wow. You're a tower. Good for reach, bad for stealth. I'll need to calibrate the teleport bubble to be extra large. 🦒`, 'ai');
            }, 300);
        } else if (cm < 160) {
            setTimeout(() => {
                printLine(`Compact. Efficient. You fit in air ducts. I like that. Stealth bonus applied. 🐁`, 'ai');
            }, 300);
        } else {
            setTimeout(() => {
                printLine(`Standard displacement volume confirmed. ${Math.round(cm)}cm. Calibrating spatial anchors. ✅`, 'ai');
            }, 300);
        }
    }
}
