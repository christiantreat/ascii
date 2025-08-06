// === FOG OF WAR SYSTEM ===
// File: src/systems/fog-of-war-system.js
// Handles all fog of war, vision, and exploration mechanics

class FogOfWarSystem {
    constructor() {
        // Fog of war settings
        this.enabled = true;
        this.visionRadius = 3;
        this.forwardVisionRange = 12;
        this.exploredRadius = 2;
        this.coneAngle = 150;
        
        // Player facing direction
        this.playerFacing = { x: 0, y: -1 };
        
        // Track explored areas
        this.exploredAreas = new Set();
        
        // Terrain types for fog display
        this.fogTerrain = { symbol: '▓', className: 'terrain-fog', name: 'Unknown' };
        
        // Reference to terrain system for line of sight blocking
        this.terrainSystem = null;
    }
    
    // ADDED: Method to set terrain system reference
    setTerrainSystem(terrainSystem) {
        this.terrainSystem = terrainSystem;
    }
    
    // Configuration methods
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    isEnabled() {
        return this.enabled;
    }
    
    setVisionRadius(radius) {
        this.visionRadius = Math.max(1, radius);
    }
    
    setForwardVisionRange(range) {
        this.forwardVisionRange = Math.max(this.visionRadius, range);
    }
    
    setConeAngle(angle) {
        this.coneAngle = Math.max(30, Math.min(180, angle));
    }
    
    setExploredRadius(radius) {
        this.exploredRadius = Math.max(0, radius);
    }
    
    updatePlayerFacing(deltaX, deltaY) {
        if (deltaX !== 0 || deltaY !== 0) {
            this.playerFacing = { x: deltaX, y: deltaY };
        }
    }
    
    // Main fog of war application
    applyFogOfWar(x, y, playerX, playerY, terrain) {
        if (!this.enabled) {
            return terrain;
        }
        
        const isInVision = this.isInVision(x, y, playerX, playerY);
        const isExplored = this.isExplored(x, y);
        
        if (!isInVision && !isExplored) {
            // Completely hidden - show fog
            return {
                ...this.fogTerrain,
                terrain: 'fog',
                feature: null,
                deer: null,
                discovered: false
            };
        } else if (!isInVision && isExplored) {
            // Previously explored but not currently visible - show dimmed
            return {
                ...terrain,
                className: terrain.className + ' terrain-explored'
            };
        }
        
        // Currently visible - show normally
        return terrain;
    }
    
    // Vision calculation
    isInVision(x, y, playerX, playerY) {
        try {
            const dx = x - playerX;
            const dy = y - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Base circular vision around player
            if (distance <= this.visionRadius) {
                return this.hasLineOfSight(playerX, playerY, x, y);
            }
            
            // Extended cone vision in facing direction
            if (distance <= this.forwardVisionRange) {
                const targetAngle = Math.atan2(dy, dx);
                const facingAngle = this.getPlayerFacingAngle();
                
                let angleDiff = Math.abs(targetAngle - facingAngle);
                if (angleDiff > Math.PI) {
                    angleDiff = 2 * Math.PI - angleDiff;
                }
                
                const coneHalfAngle = (this.coneAngle * Math.PI) / (180 * 2);
                
                if (angleDiff <= coneHalfAngle) {
                    return this.hasLineOfSight(playerX, playerY, x, y);
                }
            }
            
            return false;
        } catch (error) {
            console.warn("Error calculating vision:", error);
            return false;
        }
    }
    
    // FIXED: Line of sight now checks for tree blocking
    hasLineOfSight(fromX, fromY, toX, toY) {
        try {
            // Simple line of sight using Bresenham's line algorithm
            const dx = Math.abs(toX - fromX);
            const dy = Math.abs(toY - fromY);
            const x0 = fromX;
            const y0 = fromY;
            const n = 1 + dx + dy;
            const x_inc = (toX > fromX) ? 1 : -1;
            const y_inc = (toY > fromY) ? 1 : -1;
            let error = dx - dy;
            
            let x = x0;
            let y = y0;
            
            for (let i = 0; i < n; i++) {
                // Check if we've reached the target position
                if (x === toX && y === toY) {
                    return true; // We can see the target tile
                }
                
                // Skip the starting position for blocking checks
                if (i > 0) {
                    // RESTORED: Check if trees block line of sight
                    if (this.isPositionBlocking(x, y)) {
                        return false; // Vision is blocked by a tree
                    }
                }
                
                if (error > 0) {
                    x += x_inc;
                    error -= dy;
                } else {
                    y += y_inc;
                    error += dx;
                }
            }
            
            return true; // Clear line of sight
        } catch (error) {
            console.warn("Error calculating line of sight:", error);
            return false;
        }
    }
    
    // RESTORED: Check if a position blocks line of sight
    isPositionBlocking(x, y) {
        try {
            if (!this.terrainSystem) return false;
            
            // Check if there's a tree feature that blocks vision
            const feature = this.terrainSystem.getFeatureAt(x, y);
            
            if (feature) {
                // Both tree trunks AND tree canopy block line of sight
                if (feature.type === 'tree_trunk' || feature.type === 'tree_canopy') {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.warn("Error checking position blocking:", error);
            return false;
        }
    }
    
    // Exploration management
    updateExploration(playerX, playerY) {
        try {
            // Mark tiles in the small exploration radius
            for (let dx = -this.exploredRadius; dx <= this.exploredRadius; dx++) {
                for (let dy = -this.exploredRadius; dy <= this.exploredRadius; dy++) {
                    const x = playerX + dx;
                    const y = playerY + dy;
                    
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= this.exploredRadius) {
                        this.exploredAreas.add(`${x},${y}`);
                    }
                }
            }
            
            // Mark all currently visible tiles as explored
            const maxVisionRange = Math.max(this.visionRadius, this.forwardVisionRange);
            
            for (let dx = -maxVisionRange; dx <= maxVisionRange; dx++) {
                for (let dy = -maxVisionRange; dy <= maxVisionRange; dy++) {
                    const x = playerX + dx;
                    const y = playerY + dy;
                    
                    if (this.isInVision(x, y, playerX, playerY)) {
                        this.exploredAreas.add(`${x},${y}`);
                    }
                }
            }
        } catch (error) {
            console.warn("Error updating exploration:", error);
        }
    }
    
    isExplored(x, y) {
        return this.exploredAreas.has(`${x},${y}`);
    }
    
    clearExploration() {
        this.exploredAreas.clear();
    }
    
    // Player facing utilities
    getPlayerFacingAngle() {
        return Math.atan2(this.playerFacing.y, this.playerFacing.x);
    }
    
    getFacingDirectionName() {
        const { x, y } = this.playerFacing;
        if (x === 0 && y === -1) return 'North';
        if (x === 0 && y === 1) return 'South';
        if (x === -1 && y === 0) return 'West';
        if (x === 1 && y === 0) return 'East';
        if (x === -1 && y === -1) return 'Northwest';
        if (x === 1 && y === -1) return 'Northeast';
        if (x === -1 && y === 1) return 'Southwest';
        if (x === 1 && y === 1) return 'Southeast';
        return 'Unknown';
    }
    
    // Status information
    getStatus() {
        return {
            enabled: this.enabled,
            visionRadius: this.visionRadius,
            forwardVisionRange: this.forwardVisionRange,
            coneAngle: this.coneAngle,
            exploredRadius: this.exploredRadius,
            exploredCount: this.exploredAreas.size,
            facing: this.getFacingDirectionName(),
            facingVector: this.playerFacing
        };
    }
}