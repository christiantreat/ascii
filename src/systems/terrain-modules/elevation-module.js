// === GEOLOGY-DRIVEN ELEVATION MODULE ===
// File: src/systems/terrain-modules/elevation-module.js
// COMPLETE REPLACEMENT for your existing elevation module

class ElevationModule extends TerrainModuleBase {
    constructor(config = {}) {
        super('elevation', config);
        this.priority = 110; // High priority, but lower than geology
        this.dependencies = ['geology']; // NOW DEPENDS ON GEOLOGY
        this.elevationMap = new Map();
    }
    
    getDefaultConfig() {
        return {
            // === GEOLOGY-BASED ELEVATION ===
            useGeology: true,              // Use geology to drive elevation
            geologicalStrength: 0.7,       // How much geology affects elevation (0-1)
            
            // === ELEVATION SETTINGS ===
            baseElevation: 0.2,            // Sea level
            maxElevation: 1.0,             // Highest possible elevation
            
            // === EROSION AND WEATHERING ===
            erosionStrength: 0.3,          // How much erosion lowers elevation
            weatheringRate: 0.1,           // How quickly rocks weather
            
            // === NATURAL VARIATION ===
            noiseAmount: 0.05,             // Random variation for realism
            smoothingPasses: 2,            // How many times to smooth elevation
            
            // === FALLBACK SETTINGS (if no geology) ===
            fallbackHillCount: 6,
            fallbackHillRadius: 35
        };
    }
    
    generate(worldContext) {
        console.log("Generating geology-driven elevation...");
        
        this.elevationMap.clear();
        const bounds = worldContext.getWorldBounds();
        
        // Check if we have geology data
        const geologyModule = worldContext.getModule('geology');
        
        if (geologyModule && this.config.useGeology) {
            // GEOLOGY-DRIVEN APPROACH
            this.generateGeologyBasedElevation(worldContext, bounds, geologyModule);
        } else {
            // FALLBACK: Traditional random hills approach
            console.warn("No geology module found - using fallback hill generation");
            this.generateFallbackElevation(worldContext, bounds);
        }
        
        // Apply smoothing for natural look
        if (this.config.smoothingPasses > 0) {
            this.smoothElevation(bounds, this.config.smoothingPasses);
        }
        
        return {
            elevationMap: this.elevationMap,
            bounds: bounds,
            generationMethod: geologyModule ? 'geology-driven' : 'fallback'
        };
    }
    
    generateGeologyBasedElevation(worldContext, bounds, geologyModule) {
        console.log("Using geology to create realistic elevation...");
        
        // For every position, calculate elevation based on underlying geology
        for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
                const elevation = this.calculateGeologyElevation(x, y, geologyModule, worldContext);
                this.elevationMap.set(`${x},${y}`, elevation);
            }
        }
    }
    
    calculateGeologyElevation(x, y, geologyModule, worldContext) {
        // Start with base elevation (sea level)
        let elevation = this.config.baseElevation;
        
        // Get geological influence at this position
        const geologicalInfluence = geologyModule.getElevationInfluenceAt(x, y);
        
        // Apply geological influence
        elevation += geologicalInfluence * this.config.geologicalStrength;
        
        // Apply erosion based on rock resistance
        const erosionResistance = geologyModule.getErosionResistanceAt(x, y);
        const erosionEffect = (1 - erosionResistance) * this.config.erosionStrength;
        elevation -= erosionEffect * 0.2; // Hard rocks resist erosion, soft rocks erode more
        
        // Add natural noise for realism
        const noise = this.noise(x * 0.02, y * 0.02, worldContext.config.seed) * this.config.noiseAmount;
        elevation += noise;
        
        // Clamp to valid range
        elevation = Math.max(0.05, Math.min(this.config.maxElevation, elevation));
        
        return elevation;
    }
    
    generateFallbackElevation(worldContext, bounds) {
        // Traditional hill-based approach (same as old version)
        console.log("Generating fallback elevation with traditional hills...");
        
        const hills = this.generateFallbackHills(worldContext, bounds);
        
        for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
                let elevation = this.config.baseElevation;
                
                // Add influence from hills
                hills.forEach(hill => {
                    const distance = this.distance(x, y, hill.x, hill.y);
                    if (distance < hill.radius) {
                        const influence = 1 - (distance / hill.radius);
                        const smoothInfluence = this.smoothStep(influence);
                        elevation = Math.max(elevation, this.config.baseElevation + hill.height * smoothInfluence);
                    }
                });
                
                // Add noise
                const noise = this.noise(x * 0.02, y * 0.02, worldContext.config.seed) * this.config.noiseAmount;
                elevation = Math.max(0, Math.min(1, elevation + noise));
                
                this.elevationMap.set(`${x},${y}`, elevation);
            }
        }
    }
    
    generateFallbackHills(worldContext, bounds) {
        const hills = [];
        for (let i = 0; i < this.config.fallbackHillCount; i++) {
            const x = bounds.minX + this.seededRandom(i * 1000 + worldContext.config.seed, 1000) * (bounds.maxX - bounds.minX);
            const y = bounds.minY + this.seededRandom(i * 2000 + worldContext.config.seed, 1000) * (bounds.maxY - bounds.minY);
            
            hills.push({
                x: Math.floor(x),
                y: Math.floor(y),
                radius: this.config.fallbackHillRadius,
                height: 0.3 + this.seededRandom(i * 3000 + worldContext.config.seed, 1000) * 0.3
            });
        }
        return hills;
    }
    
    smoothElevation(bounds, passes) {
        for (let pass = 0; pass < passes; pass++) {
            const smoothed = new Map();
            
            for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
                for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
                    const neighbors = [
                        this.getElevation(x - 1, y),
                        this.getElevation(x + 1, y),
                        this.getElevation(x, y - 1),
                        this.getElevation(x, y + 1),
                        this.getElevation(x, y)
                    ];
                    
                    const average = neighbors.reduce((sum, elev) => sum + elev, 0) / neighbors.length;
                    smoothed.set(`${x},${y}`, average);
                }
            }
            
            this.elevationMap = smoothed;
        }
    }
    
    // === EXISTING API (unchanged) ===
    
    getElevation(x, y) {
        const exact = this.elevationMap.get(`${x},${y}`);
        if (exact !== undefined) return exact;
        
        // Fallback to base elevation if not found
        return this.config.baseElevation;
    }
    
    affectsPosition(x, y, worldContext) {
        return worldContext.isInBounds(x, y);
    }
    
    getDataAt(x, y, worldContext) {
        const elevation = this.getElevation(x, y);
        
        // Simple terrain classification based on elevation
        let terrainType = 'plains';
        if (elevation > 0.35) {
            terrainType = 'foothills'; // Higher areas show as hills
        }
        
        return {
            elevation: elevation,
            terrain: terrainType,
            features: [`elevation-${elevation.toFixed(2)}`]
        };
    }
    
    // === PUBLIC API FOR OTHER MODULES ===
    
    getElevationAt(x, y) {
        return this.getElevation(x, y);
    }
    
    getGradient(x, y, stepSize = 1) {
        const centerElevation = this.getElevation(x, y);
        const eastElevation = this.getElevation(x + stepSize, y);
        const northElevation = this.getElevation(x, y - stepSize);
        
        const dx = eastElevation - centerElevation;
        const dy = centerElevation - northElevation;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        return { dx, dy, magnitude };
    }
    
    isHilly(x, y) {
        return this.getElevation(x, y) > 0.35;
    }
    
    isFlat(x, y) {
        const gradient = this.getGradient(x, y);
        return gradient.magnitude < 0.05;
    }
}

// Register the updated module
window.TerrainModuleRegistry.registerModuleType('elevation', ElevationModule);