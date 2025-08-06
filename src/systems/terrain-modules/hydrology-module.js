// === GEOLOGY-AWARE HYDROLOGY MODULE ===
// File: src/systems/terrain-modules/hydrology-module.js (REPLACEMENT)
// Creates realistic rivers that understand geology

class HydrologyModule extends TerrainModuleBase {
    constructor(config = {}) {
        super('hydrology', config);
        this.priority = 90; // High priority - water affects everything
        this.dependencies = ['geology', 'elevation']; // NOW DEPENDS ON BOTH
        
        this.rivers = [];
        this.lakes = [];
        this.springs = []; // NEW: Natural water sources
        this.waterMap = new Map();
    }
    
    getDefaultConfig() {
        return {
            // === REALISTIC RIVER GENERATION ===
            springCount: 10,                // Natural springs (river sources)
            springElevationMin: 0.2,       // Springs appear in highlands
            springProximityToHardRock: 30, // Springs near hard rock (realistic!)
            
            // === RIVER FLOW BEHAVIOR ===
            riverStepSize: 2,              // How far each river step goes
            maxRiverLength: 150,           // Maximum river length
            minRiverLength: 20,            // Don't create tiny rivers
            
            // === GEOLOGICAL RIVER PREFERENCES ===
            hardRockAvoidance: 0.8,        // Rivers avoid hard rock (0-1)
            softRockPreference: 0.6,       // Rivers prefer soft rock (0-1) 
            clayChanneling: 0.4,           // Clay helps channel water (0-1)
            
            // === REALISTIC LAKE GENERATION ===
            lakeCount: 4,
            minLakeRadius: 6,
            maxLakeRadius: 25,
            lakeSpacing: 50,
            
            // Lake placement preferences (geological!)
            lakeClayPreference: 0.7,       // Lakes prefer clay (water retention)
            lakeLowElevationMax: 0.3,      // Lakes in low areas
            lakeHardRockAvoidance: 0.6,    // Lakes avoid hard rock
            
            // === RIVER CONFLUENCE ===
            confluenceEnabled: true,       // Rivers can join together
            confluenceDistance: 8,         // Rivers within this distance merge
        };
    }
    
    generate(worldContext) {
        console.log("Generating geology-aware water systems...");
        
        this.rivers = [];
        this.lakes = [];
        this.springs = [];
        this.waterMap.clear();
        
        const elevationModule = worldContext.getModule('elevation');
        const geologyModule = worldContext.getModule('geology');
        
        if (!elevationModule || !geologyModule) {
            console.warn("Hydrology module requires both elevation and geology modules!");
            return this.getEmptyResult();
        }
        
        // Step 1: Find realistic spring locations (river sources)
        this.generateSprings(worldContext, elevationModule, geologyModule);
        
        // Step 2: Generate rivers from springs (following geological logic)
        this.generateRealisticRivers(worldContext, elevationModule, geologyModule);
        
        // Step 3: Generate lakes in geologically suitable locations
        this.generateGeologicallyAwareLakes(worldContext, elevationModule, geologyModule);
        
        // Step 4: Connect rivers that flow close together
        if (this.config.confluenceEnabled) {
            this.createRiverConfluences();
        }
        
        console.log(`Generated ${this.springs.length} springs, ${this.rivers.length} rivers, ${this.lakes.length} lakes`);
        
        return {
            rivers: this.rivers,
            lakes: this.lakes,
            springs: this.springs,
            waterMap: this.waterMap
        };
    }
    
    generateSprings(worldContext, elevationModule, geologyModule) {
        const bounds = worldContext.getWorldBounds();
        const springCandidates = [];
        
        // Look for good spring locations
        for (let attempt = 0; attempt < this.config.springCount * 10; attempt++) {
            const x = bounds.minX + 20 + this.seededRandom(attempt * 1000, 1000) * (bounds.maxX - bounds.minX - 40);
            const y = bounds.minY + 20 + this.seededRandom(attempt * 2000, 1000) * (bounds.maxY - bounds.minY - 40);
            
            const suitability = this.evaluateSpringLocation(x, y, elevationModule, geologyModule);
            if (suitability > 0.5) {
                springCandidates.push({
                    x: Math.floor(x),
                    y: Math.floor(y),
                    suitability: suitability
                });
            }
        }
        
        // Select the best spring locations with minimum spacing
        springCandidates.sort((a, b) => b.suitability - a.suitability);
        
        for (const candidate of springCandidates) {
            if (this.springs.length >= this.config.springCount) break;
            
            // Check spacing from existing springs
            const tooClose = this.springs.some(spring => 
                this.distance(spring.x, spring.y, candidate.x, candidate.y) < 40
            );
            
            if (!tooClose) {
                this.springs.push({
                    x: candidate.x,
                    y: candidate.y,
                    flow: 0.5 + candidate.suitability * 0.5,
                    elevation: elevationModule.getElevationAt(candidate.x, candidate.y),
                    rockType: geologyModule.getRockTypeAt(candidate.x, candidate.y)
                });
            }
        }
        
        console.log(`Found ${this.springs.length} spring locations`);
    }
    
    evaluateSpringLocation(x, y, elevationModule, geologyModule) {
        let suitability = 0;
        
        // Springs need high elevation
        const elevation = elevationModule.getElevationAt(x, y);
        if (elevation < this.config.springElevationMin) return 0;
        
        // Higher elevation is better (up to a point)
        if (elevation > this.config.springElevationMin && elevation < 0.8) {
            suitability += (elevation - this.config.springElevationMin) * 2;
        }
        
        // Springs often appear where hard rock meets soft rock (geological contact zones)
        const rockType = geologyModule.getRockTypeAt(x, y);
        const nearbyRockTypes = [
            geologyModule.getRockTypeAt(x - 5, y),
            geologyModule.getRockTypeAt(x + 5, y),
            geologyModule.getRockTypeAt(x, y - 5),
            geologyModule.getRockTypeAt(x, y + 5)
        ];
        
        const hasHardRockNearby = nearbyRockTypes.includes('hard');
        const hasSoftRockNearby = nearbyRockTypes.includes('soft');
        
        if (hasHardRockNearby && hasSoftRockNearby) {
            suitability += 0.4; // Geological contact zone - great for springs!
        } else if (hasHardRockNearby) {
            suitability += 0.2; // Hard rock can create springs
        }
        
        // Springs prefer areas with some slope (water needs to flow out)
        const gradient = elevationModule.getGradient(x, y, 3);
        if (gradient.magnitude > 0.02 && gradient.magnitude < 0.15) {
            suitability += 0.2; // Good drainage
        }
        
        return Math.max(0, Math.min(1, suitability));
    }
    
    generateRealisticRivers(worldContext, elevationModule, geologyModule) {
        // Generate a river from each spring
        this.springs.forEach((spring, index) => {
            const riverPath = this.traceGeologicalRiverPath(
                spring.x, spring.y, elevationModule, geologyModule, worldContext, index
            );
            
            if (riverPath.length >= this.config.minRiverLength / this.config.riverStepSize) {
                this.rivers.push({
                    id: `river_${index}`,
                    path: riverPath,
                    spring: spring,
                    flow: spring.flow
                });
            }
        });
    }
    
    traceGeologicalRiverPath(startX, startY, elevationModule, geologyModule, worldContext, seed) {
        const path = [{ x: Math.floor(startX), y: Math.floor(startY) }];
        let currentX = startX;
        let currentY = startY;
        
        const maxSteps = Math.floor(this.config.maxRiverLength / this.config.riverStepSize);
        const stepSize = this.config.riverStepSize;
        
        for (let step = 0; step < maxSteps; step++) {
            const bestDirection = this.findBestRiverDirection(
                currentX, currentY, elevationModule, geologyModule, seed + step
            );
            
            if (!bestDirection) break; // No good direction found
            
            // Move in chosen direction
            currentX += Math.cos(bestDirection) * stepSize;
            currentY += Math.sin(bestDirection) * stepSize;
            
            if (!worldContext.isInBounds(currentX, currentY)) break;
            
            const currentElevation = elevationModule.getElevationAt(currentX, currentY);
            path.push({ 
                x: Math.floor(currentX), 
                y: Math.floor(currentY), 
                elevation: currentElevation,
                rockType: geologyModule.getRockTypeAt(currentX, currentY)
            });
            
            // Stop if we've reached very low elevation (sea/lake)
            if (currentElevation <= 0.12) break;
            
            // Stop if we hit an existing lake
            if (this.isNearLake(currentX, currentY, 6)) break;
        }
        
        return path;
    }
    
    findBestRiverDirection(x, y, elevationModule, geologyModule, seed) {
        const directions = [];
        const stepSize = this.config.riverStepSize;
        
        // Check 8 directions
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const testX = x + Math.cos(angle) * stepSize;
            const testY = y + Math.sin(angle) * stepSize;
            
            const score = this.evaluateRiverDirection(x, y, testX, testY, elevationModule, geologyModule);
            directions.push({ angle, score });
        }
        
        // Sort by score and add some randomness
        directions.sort((a, b) => b.score - a.score);
        
        // Pick from the top 3 directions with some randomness
        const topDirections = directions.slice(0, 3).filter(d => d.score > 0);
        if (topDirections.length === 0) return null;
        
        const randomIndex = Math.floor(this.seededRandom(seed, 1000) * topDirections.length);
        return topDirections[randomIndex].angle;
    }
    
    evaluateRiverDirection(fromX, fromY, toX, toY, elevationModule, geologyModule) {
        let score = 0;
        
        // ELEVATION: Rivers want to flow downhill
        const fromElevation = elevationModule.getElevationAt(fromX, fromY);
        const toElevation = elevationModule.getElevationAt(toX, toY);
        const elevationDrop = fromElevation - toElevation;
        
        if (elevationDrop > 0) {
            score += elevationDrop * 10; // Reward downhill flow
        } else {
            score -= 2; // Penalize uphill flow heavily
        }
        
        // GEOLOGY: Rivers prefer certain rock types
        const toRockType = geologyModule.getRockTypeAt(toX, toY);
        
        if (toRockType === 'soft') {
            score += this.config.softRockPreference; // Soft rock erodes easily - good for rivers
        } else if (toRockType === 'hard') {
            score -= this.config.hardRockAvoidance; // Hard rock resists river cutting
        } else if (toRockType === 'clay') {
            score += this.config.clayChanneling; // Clay channels water well
        }
        
        // GRADIENT: Prefer moderate gradients (not too steep, not too flat)
        const gradient = elevationModule.getGradient(toX, toY);
        if (gradient.magnitude > 0.01 && gradient.magnitude < 0.2) {
            score += 0.3; // Good drainage
        } else if (gradient.magnitude > 0.3) {
            score -= 0.5; // Too steep - waterfalls are rare
        }
        
        return score;
    }
    
    generateGeologicallyAwareLakes(worldContext, elevationModule, geologyModule) {
        const bounds = worldContext.getWorldBounds();
        const lakeCandidates = [];
        
        // Find good locations for lakes based on geology
        for (let x = bounds.minX; x <= bounds.maxX; x += 15) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 15) {
                const suitability = this.evaluateLakeLocation(x, y, elevationModule, geologyModule);
                
                if (suitability > 0.4) {
                    lakeCandidates.push({ x, y, suitability });
                }
            }
        }
        
        // Sort by suitability and place lakes with spacing
        lakeCandidates.sort((a, b) => b.suitability - a.suitability);
        
        for (const candidate of lakeCandidates) {
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
                    elevation: elevationModule.getElevationAt(candidate.x, candidate.y),
                    rockType: geologyModule.getRockTypeAt(candidate.x, candidate.y),
                    type: 'geological'
                });
            }
        }
        
        console.log(`Generated ${this.lakes.length} geologically-aware lakes`);
    }
    
    evaluateLakeLocation(x, y, elevationModule, geologyModule) {
        let suitability = 0;
        
        // Lakes prefer low elevation
        const elevation = elevationModule.getElevationAt(x, y);
        if (elevation > this.config.lakeLowElevationMax) return 0;
        
        suitability += (this.config.lakeLowElevationMax - elevation) * 2;
        
        // Lakes LOVE clay (water retention)
        const rockType = geologyModule.getRockTypeAt(x, y);
        if (rockType === 'clay') {
            suitability += this.config.lakeClayPreference;
        } else if (rockType === 'hard') {
            suitability -= this.config.lakeHardRockAvoidance; // Hard rock doesn't hold water well
        } else if (rockType === 'soft') {
            suitability += 0.2; // Soft rock is okay for lakes
        }
        
        // Lakes prefer flat areas
        const gradient = elevationModule.getGradient(x, y, 5);
        if (gradient.magnitude < 0.05) {
            suitability += 0.3; // Flat areas hold water better
        }
        
        // Lakes prefer to be near rivers (but not on them)
        const nearRiver = this.rivers.some(river => {
            return river.path.some(point => {
                const distance = this.distance(point.x, point.y, x, y);
                return distance > 5 && distance < 20; // Near but not on river
            });
        });
        
        if (nearRiver) suitability += 0.2;
        
        return Math.max(0, Math.min(1, suitability));
    }
    
    createRiverConfluences() {
        // Rivers that flow close together should merge
        for (let i = 0; i < this.rivers.length; i++) {
            for (let j = i + 1; j < this.rivers.length; j++) {
                const river1 = this.rivers[i];
                const river2 = this.rivers[j];
                
                // Check if rivers flow close to each other
                const confluencePoint = this.findConfluencePoint(river1, river2);
                if (confluencePoint) {
                    // Merge the rivers at confluence point
                    this.mergeRivers(river1, river2, confluencePoint);
                }
            }
        }
    }
    
    findConfluencePoint(river1, river2) {
        // Look for points where rivers are close
        for (const point1 of river1.path) {
            for (const point2 of river2.path) {
                const distance = this.distance(point1.x, point1.y, point2.x, point2.y);
                if (distance <= this.config.confluenceDistance) {
                    return {
                        x: Math.floor((point1.x + point2.x) / 2),
                        y: Math.floor((point1.y + point2.y) / 2)
                    };
                }
            }
        }
        return null;
    }
    
    mergeRivers(river1, river2, confluencePoint) {
        // This is complex - for now just mark them as connected
        river1.confluences = river1.confluences || [];
        river2.confluences = river2.confluences || [];
        
        river1.confluences.push({ river: river2.id, point: confluencePoint });
        river2.confluences.push({ river: river1.id, point: confluencePoint });
    }
    
    // === EXISTING API (updated) ===
    
    isNearLake(x, y, maxDistance = 15) {
        return this.lakes.some(lake => 
            this.distance(x, y, lake.x, lake.y) <= lake.radius + maxDistance
        );
    }
    
    affectsPosition(x, y, worldContext) {
        if (!worldContext.isInBounds(x, y)) return false;
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
    
    // === PUBLIC API ===
    
    getRivers() { return this.rivers; }
    getLakes() { return this.lakes; }
    getSprings() { return this.springs; }
    
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
    
    getEmptyResult() {
        return {
            rivers: [],
            lakes: [],
            springs: [],
            waterMap: new Map()
        };
    }
}

// Register the updated module
window.TerrainModuleRegistry.registerModuleType('hydrology', HydrologyModule);