// === HYDROLOGY MODULE ===
// File: src/systems/terrain-modules/hydrology-module.js

class HydrologyModule extends TerrainModuleBase {
    constructor(config = {}) {
        super('hydrology', config);
        this.priority = 90; // High priority - water affects everything
        this.dependencies = ['elevation']; // Needs elevation data
        
        this.rivers = [];
        this.lakes = [];
        this.springs = [];
        this.waterMap = new Map();
    }
    
    getDefaultConfig() {
        return {
            // River generation
            riverCount: 3,
            minRiverLength: 50,
            maxRiverLength: 200,
            riverMeandering: 0.3,
            riverStepSize: 4,
            springElevationMin: 0.6, // Springs appear in high places
            
            // Lake generation
            lakeCount: 3,
            minLakeRadius: 8,
            maxLakeRadius: 20,
            lakeElevationMax: 0.4, // Lakes in low places
            lakeSpacing: 60, // Minimum distance between lakes
            
            // Water flow
            flowAccumulation: true,
            drainageBasins: true,
            
            // Wetland generation
            wetlandsEnabled: true,
            wetlandDistance: 15, // Distance from water to create wetlands
            
            // Water table
            waterTableEnabled: false,
            waterTableDepth: 0.1
        };
    }
    
    generate(worldContext) {
        console.log("Generating hydrology...");
        
        this.rivers = [];
        this.lakes = [];
        this.springs = [];
        this.waterMap.clear();
        
        const elevationModule = worldContext.getModule('elevation');
        if (!elevationModule) {
            console.warn("Hydrology module requires elevation module!");
            return this.getEmptyResult();
        }
        
        // Step 1: Find water sources (springs in high places)
        this.generateSprings(worldContext, elevationModule);
        
        // Step 2: Generate rivers from springs
        this.generateRivers(worldContext, elevationModule);
        
        // Step 3: Generate lakes in low areas
        this.generateLakes(worldContext, elevationModule);
        
        // Step 4: Calculate water influence zones
        this.calculateWaterInfluence(worldContext);
        
        return {
            rivers: this.rivers,
            lakes: this.lakes,
            springs: this.springs,
            waterMap: this.waterMap
        };
    }
    
    generateSprings(worldContext, elevationModule) {
        const bounds = worldContext.getWorldBounds();
        const candidates = [];
        
        // Sample high-elevation areas for potential springs
        for (let x = bounds.minX; x <= bounds.maxX; x += 20) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 20) {
                const elevation = elevationModule.getElevationAt(x, y);
                
                if (elevation >= this.config.springElevationMin) {
                    const suitability = elevation + this.seededRandom(x * 1000 + y, 1000) * 0.3;
                    candidates.push({ x, y, elevation, suitability });
                }
            }
        }
        
        // Sort by suitability and select best locations
        candidates.sort((a, b) => b.suitability - a.suitability);
        const springCount = Math.min(this.config.riverCount * 2, candidates.length);
        
        for (let i = 0; i < springCount; i++) {
            const candidate = candidates[i];
            this.springs.push({
                x: candidate.x,
                y: candidate.y,
                elevation: candidate.elevation,
                flow: 0.5 + this.seededRandom(candidate.x + candidate.y, 1000) * 0.5,
                type: 'mountain_spring'
            });
        }
        
        console.log(`Generated ${this.springs.length} springs`);
    }
    
    generateRivers(worldContext, elevationModule) {
        this.springs.forEach((spring, index) => {
            const riverPath = this.traceRiverPath(spring, elevationModule, worldContext, index);
            
            if (riverPath.length >= this.config.minRiverLength / this.config.riverStepSize) {
                this.rivers.push({
                    id: `river_${index}`,
                    source: spring,
                    path: riverPath,
                    flow: spring.flow,
                    length: riverPath.length * this.config.riverStepSize
                });
            }
        });
        
        console.log(`Generated ${this.rivers.length} rivers`);
    }
    
    traceRiverPath(spring, elevationModule, worldContext, seed) {
        const path = [{ x: spring.x, y: spring.y }];
        let currentX = spring.x;
        let currentY = spring.y;
        let currentElevation = spring.elevation;
        
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
            
            // If no downhill direction, add some meandering
            if (bestDirection === null) {
                const prevDirection = path.length > 1 ? 
                    Math.atan2(currentY - path[path.length - 2].y, currentX - path[path.length - 2].x) : 
                    this.seededRandom(seed * 1000 + step, 1000) * Math.PI * 2;
                
                const meanderAmount = (this.seededRandom(seed * 2000 + step, 1000) - 0.5) * this.config.riverMeandering;
                bestDirection = prevDirection + meanderAmount;
            }
            
            // Move in chosen direction
            currentX += Math.cos(bestDirection) * stepSize;
            currentY += Math.sin(bestDirection) * stepSize;
            
            if (!worldContext.isInBounds(currentX, currentY)) break;
            
            currentElevation = elevationModule.getElevationAt(currentX, currentY);
            path.push({ x: Math.floor(currentX), y: Math.floor(currentY), elevation: currentElevation });
            
            // Stop if we've reached very low elevation (sea level)
            if (currentElevation <= 0.15) break;
            
            // Stop if we hit an existing water body
            if (this.isNearExistingWater(currentX, currentY, 10)) break;
        }
        
        return path;
    }
    
    generateLakes(worldContext, elevationModule) {
        const bounds = worldContext.getWorldBounds();
        const candidates = [];
        
        // Find low-elevation areas for lakes
        for (let x = bounds.minX; x <= bounds.maxX; x += 30) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 30) {
                const elevation = elevationModule.getElevationAt(x, y);
                
                if (elevation <= this.config.lakeElevationMax) {
                    // Check if area is relatively flat (good for lakes)
                    const gradient = elevationModule.getGradient(x, y, 5);
                    if (gradient.magnitude < 0.1) {
                        const suitability = (this.config.lakeElevationMax - elevation) + 
                                          (0.1 - gradient.magnitude) * 2 +
                                          this.seededRandom(x * 777 + y * 333, 1000) * 0.2;
                        candidates.push({ x, y, elevation, suitability });
                    }
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
                    type: 'natural_lake'
                });
            }
        }
        
        console.log(`Generated ${this.lakes.length} lakes`);
    }
    
    calculateWaterInfluence(worldContext) {
        const bounds = worldContext.getWorldBounds();
        
        // Mark all water tiles and influence zones
        for (let x = bounds.minX; x <= bounds.maxX; x += 2) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 2) {
                let waterData = this.getWaterDataAt(x, y);
                
                if (waterData.hasWater || waterData.nearWater || waterData.isWetland) {
                    this.waterMap.set(`${x},${y}`, waterData);
                }
            }
        }
    }
    
    getWaterDataAt(x, y) {
        let hasWater = false;
        let nearWater = false;
        let isWetland = false;
        let waterType = null;
        let distanceToWater = Infinity;
        
        // Check if position is in a lake
        for (const lake of this.lakes) {
            const distance = this.distance(x, y, lake.x, lake.y);
            if (distance <= lake.radius) {
                hasWater = true;
                waterType = 'lake';
                distanceToWater = 0;
                break;
            } else if (distance <= lake.radius + this.config.wetlandDistance) {
                const wetlandDistance = distance - lake.radius;
                if (wetlandDistance < distanceToWater) {
                    distanceToWater = wetlandDistance;
                    nearWater = true;
                    if (this.config.wetlandsEnabled && wetlandDistance < this.config.wetlandDistance / 2) {
                        isWetland = true;
                    }
                }
            }
        }
        
        // Check if position is on a river
        if (!hasWater) {
            for (const river of this.rivers) {
                for (let i = 0; i < river.path.length - 1; i++) {
                    const segment = river.path[i];
                    const distance = this.distance(x, y, segment.x, segment.y);
                    
                    if (distance <= 1) {
                        hasWater = true;
                        waterType = 'river';
                        distanceToWater = 0;
                        break;
                    } else if (distance < distanceToWater) {
                        distanceToWater = distance;
                        if (distance <= this.config.wetlandDistance) {
                            nearWater = true;
                            if (this.config.wetlandsEnabled && distance <= this.config.wetlandDistance / 3) {
                                isWetland = true;
                            }
                        }
                    }
                }
                if (hasWater) break;
            }
        }
        
        return {
            hasWater,
            nearWater,
            isWetland,
            waterType,
            distanceToWater: Math.min(distanceToWater, this.config.wetlandDistance)
        };
    }
    
    isNearExistingWater(x, y, radius) {
        // Check existing rivers
        for (const river of this.rivers) {
            for (const point of river.path) {
                if (this.distance(x, y, point.x, point.y) <= radius) {
                    return true;
                }
            }
        }
        
        // Check existing lakes
        for (const lake of this.lakes) {
            if (this.distance(x, y, lake.x, lake.y) <= lake.radius + radius) {
                return true;
            }
        }
        
        return false;
    }
    
    affectsPosition(x, y, worldContext) {
        if (!worldContext.isInBounds(x, y)) return false;
        
        const waterData = this.getWaterDataAt(x, y);
        return waterData.hasWater || waterData.nearWater || waterData.isWetland;
    }
    
    getDataAt(x, y, worldContext) {
        const waterData = this.getWaterDataAt(x, y);
        
        let terrain = null;
        let features = [];
        
        if (waterData.hasWater) {
            terrain = waterData.waterType === 'lake' ? 'lake' : 'river';
            features.push(`water-${waterData.waterType}`);
        } else if (waterData.isWetland) {
            terrain = 'wetland';
            features.push('wetland');
        } else if (waterData.nearWater) {
            features.push(`near-water-${waterData.distanceToWater.toFixed(0)}m`);
        }
        
        return {
            terrain,
            features,
            waterData
        };
    }
    
    getEmptyResult() {
        return {
            rivers: [],
            lakes: [],
            springs: [],
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
    
    getSprings() {
        return this.springs;
    }
    
    isWaterAt(x, y) {
        const data = this.getWaterDataAt(x, y);
        return data.hasWater;
    }
    
    isNearWater(x, y, maxDistance = null) {
        const data = this.getWaterDataAt(x, y);
        if (maxDistance === null) {
            return data.nearWater;
        }
        return data.distanceToWater <= maxDistance;
    }
    
    getDistanceToWater(x, y) {
        const data = this.getWaterDataAt(x, y);
        return data.distanceToWater;
    }
    
    getMoistureLevel(x, y) {
        const data = this.getWaterDataAt(x, y);
        
        if (data.hasWater) return 1.0;
        if (data.isWetland) return 0.8;
        if (data.nearWater) {
            return Math.max(0.3, 0.8 * (1 - data.distanceToWater / this.config.wetlandDistance));
        }
        return 0.3; // Base moisture
    }
}

// Register the module
window.TerrainModuleRegistry.registerModuleType('hydrology', HydrologyModule);