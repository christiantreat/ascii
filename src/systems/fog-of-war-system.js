// === DAY/NIGHT FOG OF WAR SYSTEM ===
// File: src/systems/fog-of-war-system.js
// COMPLETE REPLACEMENT - Now supports day/night lighting

class FogOfWarSystem {
    constructor() {
        // Fog of war settings
        this.enabled = true;
        this.visionRadius = 4;
        this.forwardVisionRange = 15;
        this.exploredRadius = 2;
        this.coneAngle = 160;
        
        // Player facing direction
        this.playerFacing = { x: 0, y: -1 };
        
        // Track explored areas
        this.exploredAreas = new Set();
        
        // NEW: Time of day system integration
        this.timeOfDaySystem = null;
        
        // Terrain types for fog display (will be enhanced with time-based variants)
        this.fogTerrain = { symbol: '▓', className: 'terrain-fog', name: 'Unknown' };
        
        // Reference to terrain system for line of sight blocking
        this.terrainSystem = null;
    }
    
    // Method to set terrain system reference
    setTerrainSystem(terrainSystem) {
        this.terrainSystem = terrainSystem;
    }
    
    // NEW: Set time of day system reference
    setTimeOfDaySystem(timeOfDaySystem) {
        this.timeOfDaySystem = timeOfDaySystem;
        this.updateVisionForTimeOfDay();
    }
    
    // NEW: Update vision settings based on time of day
    updateVisionForTimeOfDay() {
        if (!this.timeOfDaySystem) return;
        
        const visionSettings = this.timeOfDaySystem.getCurrentVisionSettings();
        this.visionRadius = visionSettings.baseVision;
        this.forwardVisionRange = visionSettings.forwardVision;
        this.coneAngle = visionSettings.coneAngle;
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
    
    // ENHANCED: Main fog of war application with day/night support
    applyFogOfWar(x, y, playerX, playerY, terrain) {
        if (!this.enabled) {
            return terrain;
        }
        
        const isInVision = this.isInVision(x, y, playerX, playerY);
        const isExplored = this.isExplored(x, y);
        
        // NEW: Get current lighting conditions
        const lighting = this.timeOfDaySystem ? 
            this.timeOfDaySystem.getLightingConditions() : 
            { lighting: 'day', cssTimeClass: 'time-day' };
        
        if (!isInVision && !isExplored) {
            // Completely hidden - show time-appropriate fog
            return {
                ...this.getTimeBasedFogTerrain(lighting),
                terrain: 'fog',
                feature: null,
                deer: null,
                discovered: false
            };
        } else if (!isInVision && isExplored) {
            // Previously explored but not currently visible - show dimmed with time-based lighting
            return {
                ...terrain,
                className: this.addTimeBasedExploredClass(terrain.className, lighting)
            };
        }
        
        // Currently visible - show with time-based lighting
        return {
            ...terrain,
            className: this.addTimeBasedVisibleClass(terrain.className, lighting)
        };
    }
    
    // NEW: Get fog terrain appearance based on time of day
    getTimeBasedFogTerrain(lighting) {
        const timeClass = lighting.cssTimeClass || 'time-day';
        
        return {
            symbol: this.fogTerrain.symbol,
            className: `terrain-fog ${timeClass}`,
            name: this.getFogDescription(lighting.lighting)
        };
    }
    
    // NEW: Get fog description based on time of day
    getFogDescription(timeOfDay) {
        const descriptions = {
            day: 'Distant haze',
            dusk: 'Gathering shadows',
            night: 'Darkness',
            dawn: 'Morning mist'
        };
        return descriptions[timeOfDay] || 'Unknown';
    }
    
    // NEW: Add time-based explored class
    addTimeBasedExploredClass(originalClassName, lighting) {
        const timeClass = lighting.cssTimeClass || 'time-day';
        const exploredClass = 'terrain-explored';
        
        // Don't add if already present
        if (originalClassName.includes(exploredClass)) {
            return originalClassName;
        }
        
        // Add both explored and time-based classes
        return `${originalClassName} ${exploredClass} ${timeClass}`;
    }
    
    // NEW: Add time-based visible class
    addTimeBasedVisibleClass(originalClassName, lighting) {
        const timeClass = lighting.cssTimeClass || 'time-day';
        
        // Add time-based lighting to visible tiles
        return `${originalClassName} ${timeClass}`;
    }
    
    // Vision calculation (unchanged)
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
    
    // Line of sight calculation (unchanged)
    hasLineOfSight(fromX, fromY, toX, toY) {
        try {
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
                if (x === toX && y === toY) {
                    return true;
                }
                
                if (i > 0) {
                    if (this.isPositionBlocking(x, y)) {
                        return false;
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
            
            return true;
        } catch (error) {
            console.warn("Error calculating line of sight:", error);
            return false;
        }
    }
    
    // Check if a position blocks line of sight (unchanged)
    isPositionBlocking(x, y) {
        try {
            if (!this.terrainSystem) return false;
            
            const feature = this.terrainSystem.getFeatureAt(x, y);
            
            if (feature) {
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
    
    // Exploration management (unchanged)
    updateExploration(playerX, playerY) {
        try {
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
    
    // Player facing utilities (unchanged)
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
    
    // NEW: Time of day controls
    advanceTimeOfDay() {
        if (this.timeOfDaySystem) {
            const advanced = this.timeOfDaySystem.advanceTime();
            if (advanced) {
                this.updateVisionForTimeOfDay();
            }
            return advanced;
        }
        return false;
    }
    
    setTimeOfDay(timeOfDay) {
        if (this.timeOfDaySystem) {
            const success = this.timeOfDaySystem.setTimeOfDay(timeOfDay);
            if (success) {
                this.updateVisionForTimeOfDay();
            }
            return success;
        }
        return false;
    }
    
    // ENHANCED: Status information with time of day
    getStatus() {
        const timeStatus = this.timeOfDaySystem ? this.timeOfDaySystem.getStatus() : {
            timeOfDay: 'day',
            description: 'No time system'
        };
        
        return {
            enabled: this.enabled,
            visionRadius: this.visionRadius,
            forwardVisionRange: this.forwardVisionRange,
            coneAngle: this.coneAngle,
            exploredRadius: this.exploredRadius,
            exploredCount: this.exploredAreas.size,
            facing: this.getFacingDirectionName(),
            facingVector: this.playerFacing,
            // NEW: Time of day info
            timeOfDay: timeStatus.timeOfDay,
            timeDescription: timeStatus.description,
            isTransitioning: timeStatus.isTransitioning || false
        };
    }
}