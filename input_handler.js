/**
 * SMYLNYX NATURAL LANGUAGE PROCESSOR
 * Parses bio-metric data and context.
 */

function processBioInput(type, rawVal) {
    const val = rawVal.toLowerCase().trim();
    
    // --- HEIGHT LOGIC (Unit Conversion) ---
    if (type === 'height') {
        const feetRegex = /(\d+)'?(\d*)?/;
        const match = val.match(feetRegex);
        let cm = 0;
        
        let numVal = parseFloat(val);
        if (!isNaN(numVal) && val.indexOf("'") === -1 && val.indexOf("ft") === -1) {
            cm = numVal > 100 ? numVal : numVal * 30.48; // Assume CM if > 100
        } else if (match) {
            let feet = parseInt(match[1]);
            let inches = parseInt(match[2] || 0);
            cm = (feet * 30.48) + (inches * 2.54);
        }

        if (cm > 190) return { response: `Wow. ${Math.round(cm)}cm? You're a tower. I'll calibrate the displacement bubble for 'Giant'. 🦒`, val: `${Math.round(cm)}cm` };
        if (cm < 160) return { response: `Compact format (${Math.round(cm)}cm). Excellent for stealth. 🐁`, val: `${Math.round(cm)}cm` };
        return { response: `Standard displacement (${Math.round(cm)}cm). Calibrating. ✅`, val: `${Math.round(cm)}cm` };
    }

    // --- ORIGIN LOGIC (Cultural Database) ---
    if (type === 'origin') {
        if (val.includes('india') || val.includes('bharat')) return { response: `India? Excellent. Loading Sanskrit subroutines and extra spice tolerance. 🌶️` };
        if (val.includes('usa') || val.includes('america')) return { response: `USA? Copy. I'll try to keep the metric system confusion to a minimum. 🦅` };
        if (val.includes('uk') || val.includes('britain')) return { response: `UK? Stiff upper lip. Tea synthesis modules engaged. ☕` };
        if (val.includes('brazil') || val.includes('brasil')) return { response: `Brasil? Maravilha! Bring that chaotic energy. 🇧🇷` };
        if (val.includes('mars')) return { response: `Mars? ...Wait, are you from the 2150 colony? temporal_error_log.txt created. 👽` }; // Easter egg
        return { response: `${rawVal}? Exotic. Downloading cultural database... 🌍` };
    }

    // --- AGE LOGIC ---
    if (type === 'age') {
        let year = parseInt(val.replace(/\D/g, ''));
        let age = (year > 1900 && year < 2030) ? 2026 - year : year;
        
        if (age > 100) return { response: "Vampire? Highlander? Noted." };
        if (age > 60) return { response: "Experience. Good. We need wisdom." };
        if (age < 18) return { response: "A bit young for paradoxes, but I won't tell mom." };
        return { response: "Prime operating condition. Try to keep it that way." };
    }

    return null; // No special reaction
}
