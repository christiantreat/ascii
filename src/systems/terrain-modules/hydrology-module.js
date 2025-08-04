// === SIMPLE HYDROLOGY MODULE ===
// File: src/systems/terrain-modules/hydrology-module.js

class HydrologyModule extends TerrainModuleBase {
    constructor(config = {}) {
        super('hydrology', config);
        this.priority = 90; // High priority - water affects everything
        this.dependencies = ['elevation']; // Needs elevation data
        
        this.rivers = [];
        this.lakes = [];
        this.waterMap = new Map();
    }
    
    getDefaultConfig() {
        return {
            // River generation
            riverCount: 7,
            minRiverLength: 40,
            maxRiverLength: 120,
            riverStepSize: 3,
            
            // Lake generation
            lakeCount: 4,
            minLakeRadius: 6,
            maxLakeRadius: 15,
            lakeSpacing: 50, // Minimum distance between lakes
            
            // Water placement preferences
            preferLowElevation: true,  // Lakes prefer low areas
            riverFlowsDownhill: true,  // Rivers follow elevation
        };
    }
    
    generate(worldContext) {
        console.log("Generating simple water systems...");
        
        this.rivers = [];
        this.lakes = [];
        this.waterMap.clear();
        
        const elevationModule = worldContext.getModule('elevation');
        if (!elevationModule) {
            console.warn("Hydrology module requires elevation module!");
            return this.getEmptyResult();
        }
        
        // Step 1: Generate lakes in low areas
        this.generateLakes(worldContext, elevationModule);
        
        // Step 2: Generate rivers that flow downhill
        this.generateRivers(worldContext, elevationModule);
        
        return {
            rivers: this.rivers,
            lakes: this.lakes,
            waterMap: this.waterMap
        };
    }
    
    generateLakes(worldContext, elevationModule) {
        const bounds = worldContext.getWorldBounds();
        const candidates = [];
        
        // Find good spots for lakes (low elevation, flat areas)
        for (let x = bounds.minX; x <= bounds.maxX; x += 25) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 25) {
                const elevation = elevationModule.getElevationAt(x, y);
                const gradient = elevationModule.getGradient(x, y, 5);
                
                // Prefer low elevation and flat areas
                let suitability = 0;
                if (elevation < 0.25) suitability += 0.5; // Low elevation bonus
                if (gradient.magnitude < 0.08) suitability += 0.3; // Flat area bonus
                
                // Add some randomness
                suitability += this.seededRandom(x * 1000 + y, 1000) * 0.3;
                
                if (suitability > 0.4) {
                    candidates.push({ x, y, elevation, suitability });
                }
            }
        }
        
        // Sort by suitability and place lakes with minimum spacing
        candidates.sort((a, b) => b.suitability - a.suitability);
        
        for (const candidate of candidates) {
            if (this.lakes.length >= this.config.lakeCount) break;
            
            // Check spacing from existing lakes
            const tooClose = this.lakes.some(lake => 
                this.distance(lake.x, lake.y, candidate.x, candidate.y) < this.config.lakeSpacing
            );
            
            if (!tooClose) {
                const radius = this.config.minLakeRadius + 
                             this.seededRandom(candidate.x + candidate.y * 2, 1000) * 
                             (this.config.maxLakeRadius - this.config.minLakeRadius);
                
                this.lakes.push({
                    x: candidate.x,
                    y: candidate.y,
                    radius: radius,
                    elevation: candidate.elevation,
                    type: 'lake'
                });
            }
        }
        
        console.log(`Generated ${this.lakes.length} lakes`);
    }
    
    generateRivers(worldContext, elevationModule) {
        const bounds = worldContext.getWorldBounds();
        
        // Start rivers from higher elevation areas
        for (let i = 0; i < this.config.riverCount; i++) {
            const startX = bounds.minX + (bounds.maxX - bounds.minX) * this.seededRandom(i * 1000, 1000);
            const startY = bounds.minY + (bounds.maxY - bounds.minY) * this.seededRandom(i * 2000, 1000);
            
            // Only start from areas that are reasonably high
            const startElevation = elevationModule.getElevationAt(startX, startY);
            if (startElevation > 0.25) {
                const riverPath = this.traceRiverPath(startX, startY, elevationModule, worldContext, i);
                
                if (riverPath.length >= this.config.minRiverLength / this.config.riverStepSize) {
                    this.rivers.push({
                        id: `river_${i}`,
                        path: riverPath,
                        startElevation: startElevation
                    });
                }
            }
        }
        
        console.log(`Generated ${this.rivers.length} rivers`);
    }
    
    traceRiverPath(startX, startY, elevationModule, worldContext, seed) {
        const path = [{ x: Math.floor(startX), y: Math.floor(startY) }];
        let currentX = startX;
        let currentY = startY;
        let currentElevation = elevationModule.getElevationAt(currentX, currentY);
        
        const maxSteps = Math.floor(this.config.maxRiverLength / this.config.riverStepSize);
        const stepSize = this.config.riverStepSize;
        
        for (let step = 0; step < maxSteps; step++) {
            // Find direction of steepest descent
            let bestDirection = null;
            let bestElevation = currentElevation;
            
            // Check 8 directions
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const testX = currentX + Math.cos(angle) * stepSize;
                const testY = currentY + Math.sin(angle) * stepSize;
                
                if (!worldContext.isInBounds(testX, testY)) continue;
                
                const testElevation = elevationModule.getElevationAt(testX, testY);
                
                if (testElevation < bestElevation) {
                    bestElevation = testElevation;
                    bestDirection = angle;
                }
            }
            
            // If no downhill direction, add some meandering in the general downhill direction
            if (bestDirection === null) {
                const generalDirection = this.seededRandom(seed * 1000 + step, 1000) * Math.PI * 2;
                bestDirection = generalDirection;
            }
            
            // Move in chosen direction
            currentX += Math.cos(bestDirection) * stepSize;
            currentY += Math.sin(bestDirection) * stepSize;
            
            if (!worldContext.isInBounds(currentX, currentY)) break;
            
            currentElevation = elevationModule.getElevationAt(currentX, currentY);
            path.push({ x: Math.floor(currentX), y: Math.floor(currentY), elevation: currentElevation });
            
            // Stop if we've reached very low elevation
            if (currentElevation <= 0.12) break;
            
            // Stop if we hit a lake
            if (this.isNearLake(currentX, currentY, 8)) break;
        }
        
        return path;
    }
    
    isNearLake(x, y, radius) {
        return this.lakes.some(lake => 
            this.distance(x, y, lake.x, lake.y) <= lake.radius + radius
        );
    }
    
    affectsPosition(x, y, worldContext) {
        if (!worldContext.isInBounds(x, y)) return false;
        
        // Check if position has water
        return this.isWaterAt(x, y) || this.isNearWater(x, y, 10);
    }
    
    getDataAt(x, y, worldContext) {
        let terrain = null;
        let features = [];
        
        if (this.isInLake(x, y)) {
            terrain = 'lake';
            features.push('water-lake');
        } else if (this.isOnRiver(x, y)) {
            terrain = 'river';
            features.push('water-river');
        } else if (this.isNearWater(x, y, 8)) {
            features.push(`near-water-${this.getDistanceToWater(x, y).toFixed(0)}m`);
        }
        
        return {
            terrain,
            features,
            hasWater: this.isWaterAt(x, y),
            nearWater: this.isNearWater(x, y, 15)
        };
    }
    
    getEmptyResult() {
        return {
            rivers: [],
            lakes: [],
            waterMap: new Map()
        };
    }
    
    // Public API for other modules
    getRivers() {
        return this.rivers;
    }
    
    getLakes() {
        return this.lakes;
    }
    
    isWaterAt(x, y) {
        return this.isInLake(x, y) || this.isOnRiver(x, y);
    }
    
    isInLake(x, y) {
        return this.lakes.some(lake => {
            const distance = this.distance(x, y, lake.x, lake.y);
            return distance <= lake.radius;
        });
    }
    
    isOnRiver(x, y) {
        return this.rivers.some(river => {
            return river.path.some(point => {
                return Math.abs(point.x - x) <= 1 && Math.abs(point.y - y) <= 1;
            });
        });
    }
    
    isNearWater(x, y, maxDistance = 15) {
        return this.getDistanceToWater(x, y) <= maxDistance;
    }
    
    getDistanceToWater(x, y) {
        let minDistance = Infinity;
        
        // Check distance to lakes
        this.lakes.forEach(lake => {
            const distance = Math.max(0, this.distance(x, y, lake.x, lake.y) - lake.radius);
            minDistance = Math.min(minDistance, distance);
        });
        
        // Check distance to rivers
        this.rivers.forEach(river => {
            river.path.forEach(point => {
                const distance = this.distance(x, y, point.x, point.y);
                minDistance = Math.min(minDistance, distance);
            });
        });
        
        return minDistance;
    }
    
    getMoistureLevel(x, y) {
        const distance = this.getDistanceToWater(x, y);
        
        if (this.isWaterAt(x, y)) return 1.0;
        if (distance <= 5) return 0.8;
        if (distance <= 10) return 0.6;
        if (distance <= 20) return 0.4;
        return 0.2; // Base moisture
    }
}

// Register the module
window.TerrainModuleRegistry.registerModuleType('hydrology', HydrologyModule);