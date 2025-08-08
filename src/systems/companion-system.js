// === COMPANION SYSTEM ===
// File: src/systems/companion-system.js
// Manages the companion dog

class CompanionSystem {
    constructor(terrainSystem) {
        this.terrainSystem = terrainSystem;
        this.companion = null;
        
        // Rendering
        this.companionSymbol = '♥';
        this.companionClassName = 'companion-dog';
        
        // Update timing
        this.updateInterval = 200;
        this.lastUpdateTime = 0;
        this.updateLoopRunning = false;
    }
    
    initialize() {
        console.log("Initializing companion system...");
        
        try {
            // Spawn companion near player (assuming player starts at 15,15)
            setTimeout(() => {
                this.spawnCompanion(17, 17); // Spawn near but not on player
                this.startUpdateLoop();
            }, 100);
        } catch (error) {
            console.error("Error initializing companion system:", error);
        }
    }
    
    spawnCompanion(x, y) {
        if (!this.terrainSystem.canMoveTo(x, y)) {
            // Try nearby positions
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    if (this.terrainSystem.canMoveTo(x + dx, y + dy)) {
                        x = x + dx;
                        y = y + dy;
                        break;
                    }
                }
            }
        }
        
        this.companion = new CompanionDog(0, x, y, this.terrainSystem);
        console.log(`Companion spawned at (${x}, ${y})`);
    }
    
    startUpdateLoop() {
        if (this.updateLoopRunning) return;
        
        this.updateLoopRunning = true;
        
        setInterval(() => {
            try {
                this.updateCompanion();
            } catch (error) {
                console.error("Error updating companion:", error);
            }
        }, this.updateInterval);
    }
    
    updateCompanion() {
        if (!this.companion) return;
        
        const currentTime = Date.now();
        
        // Get player position safely
        let playerX = 15, playerY = 15; // Default
        try {
            if (typeof window !== 'undefined' && window.game && window.game.player) {
                playerX = window.game.player.x;
                playerY = window.game.player.y;
            }
        } catch (error) {
            console.warn("Could not get player position for companion update:", error);
        }
        
        this.companion.update(playerX, playerY, currentTime);
        this.lastUpdateTime = currentTime;
    }
    
    // Called when player presses "come" key
    callCompanion() {
        if (this.companion) {
            this.companion.comeHere();
        }
    }
    
    // Called by terrain system to check if there's a companion at this position
    getCompanionAt(x, y) {
        if (this.companion && this.companion.x === x && this.companion.y === y) {
            return this.companion;
        }
        return null;
    }
    
    // Render companion into terrain display
    renderCompanion(x, y, terrain) {
        const companion = this.getCompanionAt(x, y);
        if (!companion) return terrain;
        
        // Don't show companion under tree canopy (like deer)
        if (terrain.feature && terrain.feature.type === 'tree_canopy') {
            return terrain;
        }
        
        let companionName = `Companion (${companion.state})`;
        let additionalClass = '';
        
        // Add state-based styling
        if (companion.state === 'coming') {
            additionalClass = ' companion-coming';
        } else if (companion.state === 'following') {
            additionalClass = ' companion-following';
        }
        
        return {
            symbol: this.companionSymbol,
            className: this.companionClassName + additionalClass,
            name: companionName,
            terrain: terrain.terrain,
            feature: terrain.feature,
            companion: companion,
            discovered: terrain.discovered,
            elevation: terrain.elevation
        };
    }
    
    getStats() {
        if (!this.companion) return { hasCompanion: false };
        
        return {
            hasCompanion: true,
            state: this.companion.state,
            position: { x: this.companion.x, y: this.companion.y },
            updateInterval: this.updateInterval
        };
    }
    
    getDebugInfo() {
        return this.companion ? this.companion.getDebugInfo() : null;
    }
}