// === SIMPLE ELEVATION MODULE ===
// File: src/systems/terrain-modules/elevation-module.js

class ElevationModule extends TerrainModuleBase {
    constructor(config = {}) {
        super('elevation', config);
        this.priority = 100; // High priority - foundation for other modules
        this.elevationMap = new Map();
    }
    
    getDefaultConfig() {
        return {
            // Simple scattered hills approach
            hillCount: 100,           // Number of hills to generate
            minHillRadius: 15,      // Minimum hill size
            maxHillRadius: 100,      // Maximum hill size
            minHillHeight: 0.3,     // Minimum hill height (0-1)
            maxHillHeight: 0.6,     // Maximum hill height (0-1)
            hillSpacing: 10,        // Minimum distance between hills
            
            // General settings
            baseElevation: 0.15,    // Base ground level
            resolution: 1,          // Generate every N units, interpolate between
            smoothing: true,        // Smooth out the elevation
            
            // Noise for natural variation
            noiseAmount: 0.05,      // How much random noise to add
        };
    }
    
    generate(worldContext) {
        console.log("Generating simple elevation with scattered hills...");
        
        this.elevationMap.clear();
        const bounds = worldContext.getWorldBounds();
        
        // Step 1: Generate hill locations
        const hills = this.generateHillLocations(worldContext, bounds);
        console.log(`Placed ${hills.length} hills`);
        
        // Step 2: Generate elevation map
        this.generateElevationMap(worldContext, bounds, hills);
        
        // Step 3: Add some smoothing if enabled
        if (this.config.smoothing) {
            this.smoothElevation(bounds);
        }
        
        return {
            elevationMap: this.elevationMap,
            hills: hills,
            bounds: bounds
        };
    }
    
    generateHillLocations(worldContext, bounds) {
        const hills = [];
        const centerX = worldContext.config.centerX;
        const centerY = worldContext.config.centerY;
        
        // Try to place hills randomly, but with minimum spacing
        for (let attempt = 0; attempt < this.config.hillCount * 3; attempt++) {
            if (hills.length >= this.config.hillCount) break;
            
            // Random position within bounds
            const x = centerX + (this.seededRandom(attempt * 1000 + worldContext.config.seed, 1000) - 0.5) * (bounds.maxX - bounds.minX) * 0.8;
            const y = centerY + (this.seededRandom(attempt * 2000 + worldContext.config.seed, 1000) - 0.5) * (bounds.maxY - bounds.minY) * 0.8;
            
            // Check spacing from existing hills
            const tooClose = hills.some(hill => 
                this.distance(hill.x, hill.y, x, y) < this.config.hillSpacing
            );
            
            if (!tooClose) {
                const radius = this.config.minHillRadius + 
                             this.seededRandom(attempt * 3000 + worldContext.config.seed, 1000) * 
                             (this.config.maxHillRadius - this.config.minHillRadius);
                             
                const height = this.config.minHillHeight + 
                             this.seededRandom(attempt * 4000 + worldContext.config.seed, 1000) * 
                             (this.config.maxHillHeight - this.config.minHillHeight);
                
                hills.push({
                    x: Math.floor(x),
                    y: Math.floor(y),
                    radius: radius,
                    height: height,
                    type: 'hill'
                });
            }
        }
        
        return hills;
    }
    
    generateElevationMap(worldContext, bounds, hills) {
        const resolution = this.config.resolution;
        
        for (let x = bounds.minX; x <= bounds.maxX; x += resolution) {
            for (let y = bounds.minY; y <= bounds.maxY; y += resolution) {
                let elevation = this.config.baseElevation;
                
                // Add influence from all hills
                hills.forEach(hill => {
                    const distance = this.distance(x, y, hill.x, hill.y);
                    if (distance < hill.radius) {
                        const influence = 1 - (distance / hill.radius);
                        const smoothInfluence = this.smoothStep(influence);
                        elevation = Math.max(elevation, this.config.baseElevation + hill.height * smoothInfluence);
                    }
                });
                
                // Add some noise for natural variation
                const noiseValue = this.noise(x * 0.02, y * 0.02, worldContext.config.seed) * this.config.noiseAmount;
                elevation = Math.max(0, Math.min(1, elevation + noiseValue));
                
                this.elevationMap.set(`${x},${y}`, elevation);
            }
        }
    }
    
    smoothElevation(bounds) {
        const smoothed = new Map();
        const resolution = this.config.resolution;
        
        for (let x = bounds.minX; x <= bounds.maxX; x += resolution) {
            for (let y = bounds.minY; y <= bounds.maxY; y += resolution) {
                const neighbors = [
                    this.getElevation(x - resolution, y),
                    this.getElevation(x + resolution, y),
                    this.getElevation(x, y - resolution),
                    this.getElevation(x, y + resolution),
                    this.getElevation(x, y)
                ];
                
                const average = neighbors.reduce((sum, elev) => sum + elev, 0) / neighbors.length;
                smoothed.set(`${x},${y}`, average);
            }
        }
        
        this.elevationMap = smoothed;
    }
    
    getElevation(x, y) {
        // Check exact coordinate first
        const exact = this.elevationMap.get(`${x},${y}`);
        if (exact !== undefined) return exact;
        
        // Find nearest stored elevation (interpolate if needed)
        const resolution = this.config.resolution;
        const nearX = Math.round(x / resolution) * resolution;
        const nearY = Math.round(y / resolution) * resolution;
        const near = this.elevationMap.get(`${nearX},${nearY}`);
        if (near !== undefined) return near;
        
        // Default to base elevation if not found
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
            terrainType = 'foothills'; // Hills show as foothills
        }
        
        return {
            elevation: elevation,
            terrain: terrainType,
            features: [`elevation-${elevation.toFixed(2)}`]
        };
    }
    
    // Public API for other modules
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

// Register the module
window.TerrainModuleRegistry.registerModuleType('elevation', ElevationModule);