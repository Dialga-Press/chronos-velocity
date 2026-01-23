/* 
  STORAGE MODULE
  Handles Auto-Saving and State Hydration.
*/

const SAVE_KEY = 'CHRONOS_VELOCITY_V1';

const StorageManager = {
    // Save the current state
    save: (gameState, currentChapterId, currentSceneIndex) => {
        const data = {
            timestamp: Date.now(),
            mode: gameState.mode,
            player: gameState.player,
            partner: gameState.partner,
            driver: gameState.driver,
            passenger: gameState.passenger,
            history: gameState.history,
            currentChapterId: currentChapterId,
            currentSceneIndex: currentSceneIndex
        };
        
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            console.log(">> AUTO-SAVE COMPLETE");
        } catch (e) {
            console.error("Save failed:", e);
        }
    },

    // Load the state
    load: () => {
        try {
            const data = localStorage.getItem(SAVE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error("Load failed:", e);
            return null;
        }
    },

    // Check if save exists
    hasSave: () => {
        return !!localStorage.getItem(SAVE_KEY);
    },

    // Wipe save (Hard Reset)
    clear: () => {
        localStorage.removeItem(SAVE_KEY);
        console.log(">> SAVE DATA WIPED");
    }
};
