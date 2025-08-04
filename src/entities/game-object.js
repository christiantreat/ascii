// === GAME OBJECT MODULE ===
// File: game-object.js
class GameObject {
    constructor(terrainSystem, movementRules = null) {
        this.x = 0;
        this.y = 0;
        this.terrainSystem = terrainSystem;
        this.movementRules = movementRules || this.getDefaultMovementRules();
    }
    
    getDefaultMovementRules() {
        // Default player movement rules
        return {
            canWalkOn: ['plains', 'forest', 'foothills', 'road', 'trail'],
            cannotWalkOn: ['river', 'lake', 'mountain', 'building', 'village'],
            // Optional: special rules
            requiresSpecialAccess: {
                'building': 'door'  // Can enter buildings through doors
            }
        };
    }
    
    move(deltaX, deltaY) {
        const newX = this.x + deltaX;
        const newY = this.y + deltaY;
        
        if (this.canMoveTo(newX, newY)) {
            this.x = newX;
            this.y = newY;
            return true;
        }
        
        // Optional: Provide feedback why movement failed
        this.handleBlockedMovement(newX, newY);
        return false;
    }
    
    canMoveTo(x, y) {
        // First check if position is within world bounds
        if (!this.terrainSystem.isValidPosition(x, y)) {
            return false;
        }
        
        const terrainData = this.terrainSystem.getTerrainAt(x, y);
        
        // Check if this entity cannot walk on this terrain type
        if (this.movementRules.cannotWalkOn.includes(terrainData.terrain)) {
            return false;
        }
        
        // Check if this entity can walk on this terrain type
        if (this.movementRules.canWalkOn.includes(terrainData.terrain)) {
            return true;
        }
        
        // Default: can't walk on unknown terrain
        return false;
    }
    
    handleBlockedMovement(x, y) {
        // Optional: Handle what happens when movement is blocked
        // Could show messages, play sounds, etc.
        if (!this.terrainSystem.isValidPosition(x, y)) {
            console.log("Cannot move outside world boundaries");
        } else {
            const terrain = this.terrainSystem.getTerrainAt(x, y);
            console.log(`Cannot walk on ${terrain.name}`);
        }
    }
    
    setPosition(x, y) {
        if (this.terrainSystem.isValidPosition(x, y)) {
            this.x = x;
            this.y = y;
            return true;
        }
        return false;
    }
    
    // Get current terrain info
    getCurrentTerrain() {
        return this.terrainSystem.getTerrainAt(this.x, this.y);
    }
    
    // Get position as object
    getPosition() {
        return { x: this.x, y: this.y };
    }
}