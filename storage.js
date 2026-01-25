/**
 * CHRONOS ARCHIVE STORAGE SYSTEM
 * Handles state serialization, versioning, and auto-saves.
 */
const SAVE_KEY = 'CHRONOS_VELOCITY_CORE';
const CURRENT_VERSION = '0.2.0';

const StorageManager = {
    save: (gameState, chapterId, sceneIndex) => {
        const payload = {
            version: CURRENT_VERSION,
            timestamp: Date.now(),
            data: {
                ...gameState,
                currentChapterId: chapterId,
                currentSceneIndex: sceneIndex,
                // Sanitize history to prevent circular structures or bloat
                history: gameState.history.slice(-50) 
            }
        };
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
            // Trigger a visual save indicator if we had one
            console.log(`[SYS] ARCHIVE SAVED :: ${chapterId}:${sceneIndex}`);
        } catch (e) {
            console.error("[SYS] SAVE FAILURE", e);
        }
    },

    load: () => {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return null;
            const payload = JSON.parse(raw);
            
            // Version migration logic could go here
            return payload.data;
        } catch (e) {
            console.error("[SYS] CORRUPT DATA", e);
            return null;
        }
    },

    hasSave: () => !!localStorage.getItem(SAVE_KEY),
    
    clear: () => {
        localStorage.removeItem(SAVE_KEY);
        console.warn("[SYS] TIMELINE PURGED");
    }
};
