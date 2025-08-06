// === REACTIVE DEER MANAGER SYSTEM ===
// File: src/systems/deer-manager.js

class DeerManager {
    constructor(terrainSystem) {
        this.terrainSystem = terrainSystem;
        this.deer = [];
        this.updateInterval = 200; // Regular updates every 200ms
        this.lastUpdateTime = 0;
        this.debugMode = false;
        
        // Deer rendering
        this.deerSymbol = '♦';
        this.deerClassName = 'deer-entity';
        
        this.maxDeerCount = 8;
        this.playerDetectionRadius = 25; // Increased for immediate reactions
        
        this.initializeDeer();
    }
    
    initializeDeer() {
        setTimeout(() => {
            this.spawnDeer();
            this.startUpdateLoop();
        }, 100);
    }
    
    spawnDeer() {
        console.log("Spawning reactive deer AI...");
        
        const worldBounds = this.terrainSystem.getWorldBounds();
        let spawned = 0;
        const maxAttempts = 150;
        
        for (let attempt = 0; attempt < maxAttempts && spawned < this.maxDeerCount; attempt++) {
            const margin = 25;
            const x = worldBounds.minX + margin + Math.floor(Math.random() * (worldBounds.maxX - worldBounds.minX - 2 * margin));
            const y = worldBounds.minY + margin + Math.floor(Math.random() * (worldBounds.maxY - worldBounds.minY - 2 * margin));
            
            if (this.isGoodDeerSpawnLocation(x, y)) {
                const deer = new Deer(spawned, x, y, this.terrainSystem);
                this.deer.push(deer);
                spawned++;
            }
        }
        
        console.log(`Successfully spawned ${spawned} reactive deer`);
    }
    
    isGoodDeerSpawnLocation(x, y) {
        try {
            if (!this.terrainSystem || !this.terrainSystem.canMoveTo) {
                return false;
            }
            
            if (!this.terrainSystem.canMoveTo(x, y)) return false;
            
            let terrainData;
            try {
                terrainData = this.terrainSystem.getTerrainAt(x, y);
            } catch (error) {
                console.warn("Error getting terrain data for deer spawn:", error);
                return false;
            }
            
            if (terrainData.terrain === 'river' || terrainData.terrain === 'lake') return false;
            
            const minDistance = 15; // Increased spacing
            const tooClose = this.deer.some(deer => {
                const distance = Math.sqrt((deer.x - x) ** 2 + (deer.y - y) ** 2);
                return distance < minDistance;
            });
            
            // Don't spawn too close to center
            const distanceFromCenter = Math.sqrt(x * x + y * y);
            if (distanceFromCenter < 20) return false;
            
            return !tooClose;
        } catch (error) {
            console.warn("Error checking deer spawn location:", error);
            return false;
        }
    }
    
    startUpdateLoop() {
        setInterval(() => {
            try {
                this.updateAllDeer();
            } catch (error) {
                console.error("Error updating deer:", error);
            }
        }, this.updateInterval);
    }
    
    updateAllDeer() {
        const currentTime = Date.now();
        
        let playerX = 0, playerY = 0;
        try {
            if (typeof window !== 'undefined' && window.game && window.game.player) {
                playerX = window.game.player.x;
                playerY = window.game.player.y;
            }
        } catch (error) {
            console.warn("Could not get player position for deer update:", error);
        }
        
        // Update deer with distance-based optimization
        this.deer.forEach((deer, index) => {
            try {
                const distanceToPlayer = Math.sqrt((deer.x - playerX) ** 2 + (deer.y - playerY) ** 2);
                
                if (distanceToPlayer <= this.playerDetectionRadius || deer.state === 'fleeing') {
                    deer.update(playerX, playerY, this.deer, currentTime);
                } else {
                    // Distant deer - just basic wandering
                    if (Math.random() < 0.05) {
                        deer.generateWanderTarget();
                        if (deer.wanderTarget) {
                            deer.moveToward(deer.wanderTarget.x, deer.wanderTarget.y);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error updating deer ${index}:`, error);
            }
        });
        
        this.lastUpdateTime = currentTime;
        
        // Debug logging
        if (this.debugMode && Math.random() < 0.02) {
            const fleeingCount = this.deer.filter(d => d.state === 'fleeing').length;
            const alertCount = this.deer.filter(d => d.state === 'alert').length;
            if (fleeingCount > 0 || alertCount > 0) {
                console.log(`[${currentTime}] Deer states - Fleeing: ${fleeingCount}, Alert: ${alertCount}`);
            }
        }
    }
    
    // NEW: Critical method - called immediately when player moves
    onPlayerMoved(playerX, playerY) {
        const currentTime = Date.now();
        
        // Only check deer that could potentially see the player
        this.deer.forEach(deer => {
            try {
                const distance = Math.sqrt((deer.x - playerX) ** 2 + (deer.y - playerY) ** 2);
                
                // Only process immediate reactions for deer within detection range
                if (distance <= this.playerDetectionRadius) {
                    deer.reactToPlayerMovement(playerX, playerY, currentTime);
                }
            } catch (error) {
                console.error(`Error processing immediate reaction for deer ${deer.id}:`, error);
            }
        });
        
        if (this.debugMode) {
            const reactingDeer = this.deer.filter(d => d.reactionQueue && d.reactionQueue.length > 0);
            if (reactingDeer.length > 0) {
                console.log(`Player moved to (${playerX}, ${playerY}) - ${reactingDeer.length} deer reacting immediately`);
            }
        }
    }
    
    getDeerAt(x, y) {
        return this.deer.find(deer => deer.x === x && deer.y === y);
    }
    
    renderDeer(x, y, terrain) {
        const deer = this.getDeerAt(x, y);
        if (!deer) return terrain;
        
        if (terrain.feature && terrain.feature.type === 'tree_canopy') {
            return terrain;
        }
        
        let deerSymbol = this.deerSymbol;
        let deerName = `Deer (${deer.state})`;
        let additionalClass = '';
        
        if (this.debugMode) {
            switch (deer.state) {
                case 'wandering':
                    deerSymbol = '♦';
                    break;
                case 'alert':
                    deerSymbol = '♢';
                    break;
                case 'fleeing':
                    deerSymbol = '♦';
                    additionalClass = ' deer-fleeing';
                    break;
            }
            
            // Show reaction queue info
            if (deer.reactionQueue && deer.reactionQueue.length > 0) {
                deerName += ` [R:${deer.reactionQueue.length}]`;
                additionalClass += ' deer-reacting';
            }
        } else if (deer.state === 'fleeing') {
            additionalClass = ' deer-fleeing';
        }
        
        return {
            symbol: deerSymbol,
            className: this.deerClassName + additionalClass,
            name: deerName,
            terrain: terrain.terrain,
            feature: terrain.feature,
            deer: deer,
            discovered: terrain.discovered,
            elevation: terrain.elevation
        };
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log(`Reactive deer debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
        
        if (this.debugMode) {
            const states = this.getDeerStates();
            console.log(`Current deer states:`, states);
            
            if (typeof window !== 'undefined' && window.game && window.game.player) {
                const playerX = window.game.player.x;
                const playerY = window.game.player.y;
                
                this.deer.forEach(deer => {
                    const distance = Math.sqrt((deer.x - playerX) ** 2 + (deer.y - playerY) ** 2);
                    const reactionCount = deer.reactionQueue ? deer.reactionQueue.length : 0;
                    console.log(`Deer ${deer.id}: ${deer.state} at (${deer.x}, ${deer.y}), distance: ${distance.toFixed(1)}, reactions: ${reactionCount}`);
                });
            }
        }
        
        return this.debugMode;
    }
    
    getDebugInfo() {
        if (!this.debugMode) return null;
        
        return {
            deerCount: this.deer.length,
            updateInterval: this.updateInterval,
            deer: this.deer.map(deer => deer.getDebugInfo()),
            lastUpdate: this.lastUpdateTime,
            playerDetectionRadius: this.playerDetectionRadius,
            totalReactions: this.deer.reduce((sum, deer) => sum + (deer.reactionQueue ? deer.reactionQueue.length : 0), 0)
        };
    }
    
    isDeerVisibleAt(x, y, playerX, playerY) {
        if (!this.debugMode) return false;
        
        const deer = this.getDeerAt(x, y);
        if (!deer) return false;
        
        try {
            return deer.canSeePosition(playerX, playerY);
        } catch (error) {
            console.warn("Error checking deer visibility:", error);
            return false;
        }
    }
    
    getDeerVisionTiles(playerX, playerY) {
        if (!this.debugMode) return [];
        
        const visionTiles = [];
        
        this.deer.forEach(deer => {
            try {
                if (deer.state === 'wandering') return;
                
                for (let dx = -deer.visionRange; dx <= deer.visionRange; dx++) {
                    for (let dy = -deer.visionRange; dy <= deer.visionRange; dy++) {
                        const checkX = deer.x + dx;
                        const checkY = deer.y + dy;
                        
                        if (deer.canSeePosition(checkX, checkY)) {
                            visionTiles.push({
                                x: checkX,
                                y: checkY,
                                deerId: deer.id,
                                deerState: deer.state,
                                canSeePlayer: (checkX === playerX && checkY === playerY),
                                hasReactions: deer.reactionQueue && deer.reactionQueue.length > 0
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn(`Error calculating vision for deer ${deer.id}:`, error);
            }
        });
        
        return visionTiles;
    }
    
    getDeerStates() {
        const states = { wandering: 0, alert: 0, fleeing: 0 };
        this.deer.forEach(deer => {
            if (states[deer.state] !== undefined) {
                states[deer.state]++;
            }
        });
        return states;
    }
    
    getDeerNearPlayer(playerX, playerY, radius = 15) {
        return this.deer.filter(deer => {
            try {
                const distance = Math.sqrt((deer.x - playerX) ** 2 + (deer.y - playerY) ** 2);
                return distance <= radius;
            } catch (error) {
                console.warn("Error calculating deer distance:", error);
                return false;
            }
        });
    }
    
    // Force all deer to flee (for testing)
    scareAllDeer(playerX, playerY) {
        console.log("Scaring all deer with immediate reactions!");
        const currentTime = Date.now();
        
        this.deer.forEach(deer => {
            deer.addReaction('immediate_flee', { playerX, playerY, priority: 100 });
            deer.setState('fleeing');
            deer.currentMoveInterval = deer.fleeMoveInterval;
            deer.generateFleeTarget(playerX, playerY);
            deer.fleeTimer = 0;
            deer.lastPlayerSeen = currentTime;
        });
    }
    
    // Reset all deer to calm state
    calmAllDeer() {
        console.log("Calming all deer...");
        this.deer.forEach(deer => {
            deer.setState('wandering');
            deer.currentMoveInterval = deer.baseMoveInterval;
            deer.generateWanderTarget();
            deer.reactionQueue = []; // Clear any pending reactions
        });
    }
    
    respawnDeer() {
        console.log("Respawning all deer...");
        this.deer = [];
        this.spawnDeer();
    }
    
    // NEW: Get detailed behavior statistics with reaction info
    getDeerBehaviorStats() {
        const stats = {
            totalDeer: this.deer.length,
            states: this.getDeerStates(),
            averageDistanceFromPlayer: 0,
            totalReactions: 0,
            fleeingDeer: [],
            alertDeer: [],
            reactiveDeer: []
        };
        
        if (typeof window !== 'undefined' && window.game && window.game.player) {
            const playerX = window.game.player.x;
            const playerY = window.game.player.y;
            
            let totalDistance = 0;
            this.deer.forEach(deer => {
                const distance = Math.sqrt((deer.x - playerX) ** 2 + (deer.y - playerY) ** 2);
                totalDistance += distance;
                
                const reactionCount = deer.reactionQueue ? deer.reactionQueue.length : 0;
                stats.totalReactions += reactionCount;
                
                if (reactionCount > 0) {
                    stats.reactiveDeer.push({
                        id: deer.id,
                        state: deer.state,
                        reactions: reactionCount,
                        distance: distance.toFixed(1)
                    });
                }
                
                if (deer.state === 'fleeing') {
                    stats.fleeingDeer.push({
                        id: deer.id,
                        distance: distance.toFixed(1),
                        fleeTime: deer.fleeTimer,
                        reactions: reactionCount
                    });
                } else if (deer.state === 'alert') {
                    stats.alertDeer.push({
                        id: deer.id,
                        distance: distance.toFixed(1),
                        alertTime: deer.stateTimer,
                        reactions: reactionCount
                    });
                }
            });
            
            stats.averageDistanceFromPlayer = (totalDistance / this.deer.length).toFixed(1);
        }
        
        return stats;
    }
    
    // Performance monitoring with reaction tracking
    getPerformanceInfo() {
        const nearPlayer = typeof window !== 'undefined' && window.game && window.game.player ? 
            this.getDeerNearPlayer(window.game.player.x, window.game.player.y, this.playerDetectionRadius).length : 0;
        
        const totalReactions = this.deer.reduce((sum, deer) => 
            sum + (deer.reactionQueue ? deer.reactionQueue.length : 0), 0);
            
        return {
            deerCount: this.deer.length,
            updateInterval: this.updateInterval,
            lastUpdateTime: this.lastUpdateTime,
            debugMode: this.debugMode,
            playerDetectionRadius: this.playerDetectionRadius,
            deerNearPlayer: nearPlayer,
            maxDeerCount: this.maxDeerCount,
            pendingReactions: totalReactions,
            averageReactionsPerDeer: (totalReactions / this.deer.length).toFixed(2)
        };
    }
}