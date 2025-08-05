// === DEER MANAGER SYSTEM ===
// File: src/systems/deer-manager.js

class DeerManager {
    constructor(terrainSystem) {
        this.terrainSystem = terrainSystem;
        this.deer = [];
        this.updateInterval = 750; // 750ms between updates
        this.lastUpdateTime = 0;
        this.debugMode = false;
        
        // Deer rendering
        this.deerSymbol = '♦';
        this.deerClassName = 'deer-entity';
        
        this.spawnDeer();
        this.startUpdateLoop();
    }
    
    spawnDeer() {
        console.log("Spawning 20 deer...");
        
        const worldBounds = this.terrainSystem.getWorldBounds();
        let spawned = 0;
        const maxAttempts = 200; // Try up to 200 times to spawn all deer
        
        for (let attempt = 0; attempt < maxAttempts && spawned < 20; attempt++) {
            // Random position within world bounds (with margin)
            const x = worldBounds.minX + 10 + Math.floor(Math.random() * (worldBounds.maxX - worldBounds.minX - 20));
            const y = worldBounds.minY + 10 + Math.floor(Math.random() * (worldBounds.maxY - worldBounds.minY - 20));
            
            // Check if position is suitable for deer
            if (this.isGoodDeerSpawnLocation(x, y)) {
                const deer = new Deer(spawned, x, y, this.terrainSystem);
                this.deer.push(deer);
                spawned++;
            }
        }
        
        console.log(`Successfully spawned ${spawned} deer`);
    }
    
    isGoodDeerSpawnLocation(x, y) {
        // Check if terrain is walkable
        if (!this.terrainSystem.canMoveTo(x, y)) return false;
        
        // Get terrain type
        const terrainData = this.terrainSystem.getTerrainAt(x, y);
        
        // Prefer plains and foothills, avoid water
        if (terrainData.terrain === 'river' || terrainData.terrain === 'lake') return false;
        
        // Don't spawn too close to existing deer
        const tooClose = this.deer.some(deer => {
            const distance = Math.sqrt((deer.x - x) ** 2 + (deer.y - y) ** 2);
            return distance < 5;
        });
        
        return !tooClose;
    }
    
    startUpdateLoop() {
        // Set up timer-based updates
        setInterval(() => {
            this.updateAllDeer();
        }, this.updateInterval);
    }
    
    updateAllDeer() {
        const currentTime = Date.now();
        
        // Get player position from the game engine
        const playerX = window.game ? window.game.player.x : 0;
        const playerY = window.game ? window.game.player.y : 0;
        
        // Update each deer
        this.deer.forEach(deer => {
            deer.update(playerX, playerY, this.deer, currentTime);
        });
        
        this.lastUpdateTime = currentTime;
    }
    
    getDeerAt(x, y) {
        return this.deer.find(deer => deer.x === x && deer.y === y);
    }
    
    renderDeer(x, y, terrain) {
        const deer = this.getDeerAt(x, y);
        if (!deer) return terrain;
        
        // Check if deer should be hidden under tree canopy
        if (terrain.feature && terrain.feature.type === 'tree_canopy') {
            // Deer is under canopy - show canopy instead of deer
            return terrain;
        }
        
        // Show deer
        return {
            symbol: this.deerSymbol,
            className: this.deerClassName,
            name: `Deer (${deer.state})`,
            terrain: terrain.terrain,
            feature: terrain.feature,
            deer: deer,
            discovered: terrain.discovered,
            elevation: terrain.elevation
        };
    }
    
    // Debug mode functionality
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        return this.debugMode;
    }
    
    getDebugInfo() {
        if (!this.debugMode) return null;
        
        return {
            deerCount: this.deer.length,
            deer: this.deer.map(deer => deer.getDebugInfo()),
            lastUpdate: this.lastUpdateTime
        };
    }
    
    isDeerVisibleAt(x, y, playerX, playerY) {
        if (!this.debugMode) return false;
        
        const deer = this.getDeerAt(x, y);
        if (!deer) return false;
        
        return deer.canSeePosition(playerX, playerY);
    }
    
    getDeerVisionTiles(playerX, playerY) {
        if (!this.debugMode) return [];
        
        const visionTiles = [];
        
        this.deer.forEach(deer => {
            // Check all tiles within deer's vision range
            for (let dx = -deer.visionRange; dx <= deer.visionRange; dx++) {
                for (let dy = -deer.visionRange; dy <= deer.visionRange; dy++) {
                    const checkX = deer.x + dx;
                    const checkY = deer.y + dy;
                    
                    if (deer.canSeePosition(checkX, checkY)) {
                        visionTiles.push({
                            x: checkX,
                            y: checkY,
                            deerId: deer.id,
                            canSeePlayer: (checkX === playerX && checkY === playerY)
                        });
                    }
                }
            }
        });
        
        return visionTiles;
    }
    
    // Utility methods
    getDeerStates() {
        const states = { wandering: 0, alert: 0, fleeing: 0 };
        this.deer.forEach(deer => {
            states[deer.state]++;
        });
        return states;
    }
    
    getDeerNearPlayer(playerX, playerY, radius = 10) {
        return this.deer.filter(deer => {
            const distance = Math.sqrt((deer.x - playerX) ** 2 + (deer.y - playerY) ** 2);
            return distance <= radius;
        });
    }
    
    respawnDeer() {
        // Remove all deer and spawn new ones
        this.deer = [];
        this.spawnDeer();
    }
    
    // Performance monitoring
    getPerformanceInfo() {
        return {
            deerCount: this.deer.length,
            updateInterval: this.updateInterval,
            lastUpdateTime: this.lastUpdateTime,
            debugMode: this.debugMode
        };
    }
}