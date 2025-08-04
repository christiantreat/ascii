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
        return false;
    }
    
    canMoveTo(x, y) {
        const terrainData = this.terrainSystem.getTerrainAt(x, y);
        
        // Check if this entity can walk on this terrain type
        if (this.movementRules.cannotWalkOn.includes(terrainData.terrain)) {
            return false;
        }
        
        if (this.movementRules.canWalkOn.includes(terrainData.terrain)) {
            return true;
        }
        
        // Default: can't walk on unknown terrain
        return false;
    }
    
    setPosition(x, y) {
        if (this.terrainSystem.isValidPosition(x, y)) {
            this.x = x;
            this.y = y;
        }
    }
    
    // No more world bounds here - terrain system handles it
}