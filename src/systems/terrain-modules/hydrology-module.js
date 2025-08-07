// === BALANCED HYDROLOGY MODULE (SHOULD ACTUALLY WORK!) ===
// File: src/systems/terrain-modules/hydrology-module.js

class HydrologyModule extends TerrainModuleBase {
    constructor(config = {}) {
        super('hydrology', config);
        this.priority = 90;
        this.dependencies = ['geology', 'elevation'];
        
        this.rivers = [];
        this.lakes = [];
        this.springs = [];
        this.waterMap = new Map();
    }
    
    getDefaultConfig() {
        return {
            // === BALANCED RIVER GENERATION ===
            springCount: 8,
            springElevationMin: 0.25,          // BALANCED: Not too high, not too low
            springProximityToHardRock: 30,
            
            // === RIVER FLOW BEHAVIOR ===
            riverStepSize: 2,
            maxRiverLength: 100,               // Slightly shorter
            minRiverLength: 10,                // MUCH shorter minimum
            
            // === GEOLOGICAL PREFERENCES ===
            hardRockAvoidance: 0.4,            // REDUCED: Rivers can cut through hard rock
            softRockPreference: 0.6,           // Moderate preference
            clayChanneling: 0.4,
            
            // === LAKE GENERATION ===
            lakeCount: 4,
            minLakeRadius: 6,
            maxLakeRadius: 18,
            lakeSpacing: 35,                   // Closer spacing
            
            // Lake placement
            lakeClayPreference: 0.6,
            lakeLowElevationMax: 0.3,          // Higher max elevation for lakes
            lakeHardRockAvoidance: 0.4,
            
            // === RIVER CONFLUENCE ===
            confluenceEnabled: true,
            confluenceDistance: 8,
        };
    }
    
    generate(worldContext) {
        console.log("🌊 Generating BALANCED water systems...");
        
        this.rivers = [];
        this.lakes = [];
        this.springs = [];
        this.waterMap.clear();
        
        const elevationModule = worldContext.getModule('elevation');
        const geologyModule = worldContext.getModule('geology');
        
        if (!elevationModule) {
            console.warn("❌ Hydrology module requires elevation module!");
            return this.getEmptyResult();
        }
        
        // Step 1: Analyze terrain and find springs
        this.generateAdaptiveSprings(worldContext, elevationModule, geologyModule);
        
        // Step 2: Generate rivers from springs
        this.generateBalancedRivers(worldContext, elevationModule, geologyModule);
        
        // Step 3: Generate lakes
        this.generateBalancedLakes(worldContext, elevationModule, geologyModule);
        
        // Step 4: Connect rivers
        if (this.config.confluenceEnabled) {
            this.createRiverConfluences();
        }
        
        console.log(`🌊 FINAL RESULT: ${this.springs.length} springs, ${this.rivers.length} rivers, ${this.lakes.length} lakes`);
        
        return {
            rivers: this.rivers,
            lakes: this.lakes,
            springs: this.springs,
            waterMap: this.waterMap
        };
    }
    
    generateAdaptiveSprings(worldContext, elevationModule, geologyModule) {
        console.log("🏔️ Finding spring locations with adaptive elevation...");
        const bounds = worldContext.getWorldBounds();
        
        // STEP 1: Sample terrain to understand elevation distribution
        let elevationSamples = [];
        for (let i = 0; i < 100; i++) {
            const testX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            const testY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
            const elevation = elevationModule.getElevationAt(testX, testY);
            elevationSamples.push(elevation);
        }
        
        elevationSamples.sort((a, b) => b - a);
        
        // STEP 2: Set adaptive spring elevation requirement
        const highestElevation = elevationSamples[0];
        const medianElevation = elevationSamples[Math.floor(elevationSamples.length * 0.5)];
        
        // Springs should be in the top 40% of elevations, but not impossibly high
        const adaptiveMinElevation = Math.max(
            medianElevation + 0.05,  // At least a bit above median
            highestElevation * 0.6   // At least 60% of max height
        );
        
        console.log(`📊 Terrain analysis:`);
        console.log(`   Highest elevation: ${highestElevation.toFixed(3)}`);
        console.log(`   Median elevation: ${medianElevation.toFixed(3)}`);
        console.log(`   Spring minimum: ${adaptiveMinElevation.toFixed(3)}`);
        
        // STEP 3: Find spring candidates
        const springCandidates = [];
        let totalAttempts = 0;
        let elevationRejections = 0;
        
        for (let attempt = 0; attempt < this.config.springCount * 25; attempt++) {
            totalAttempts++;
            const x = bounds.minX + 20 + this.seededRandom(attempt * 1000, 1000) * (bounds.maxX - bounds.minX - 40);
            const y = bounds.minY + 20 + this.seededRandom(attempt * 2000, 1000) * (bounds.maxY - bounds.minY - 40);
            
            const elevation = elevationModule.getElevationAt(x, y);
            
            if (elevation < adaptiveMinElevation) {
                elevationRejections++;
                continue;
            }
            
            const suitability = this.evaluateSpringLocation(x, y, elevationModule, geologyModule, adaptiveMinElevation);
            if (suitability > 0.3) { // Lowered threshold
                springCandidates.push({
                    x: Math.floor(x),
                    y: Math.floor(y),
                    suitability: suitability,
                    elevation: elevation
                });
            }
        }
        
        console.log(`🏔️ Spring search: ${springCandidates.length} candidates from ${totalAttempts} attempts (${elevationRejections} elevation rejections)`);
        
        // STEP 4: Place springs with spacing
        springCandidates.sort((a, b) => b.suitability - a.suitability);
        
        for (const candidate of springCandidates) {
            if (this.springs.length >= this.config.springCount) break;
            
            const tooClose = this.springs.some(spring => 
                this.distance(spring.x, spring.y, candidate.x, candidate.y) < 30 // Reduced spacing
            );
            
            if (!tooClose) {
                this.springs.push({
                    x: candidate.x,
                    y: candidate.y,
                    flow: 0.5 + candidate.suitability * 0.5,
                    elevation: candidate.elevation,
                    rockType: geologyModule ? geologyModule.getRockTypeAt(candidate.x, candidate.y) : 'soft'
                });
                console.log(`✅ Spring placed at (${candidate.x}, ${candidate.y}) elevation=${candidate.elevation.toFixed(3)}`);
            }
        }
        
        console.log(`🏔️ Result: ${this.springs.length} springs created`);
    }
    
    evaluateSpringLocation(x, y, elevationModule, geologyModule, minElevation) {
        let suitability = 0;
        const elevation = elevationModule.getElevationAt(x, y);
        
        // Must meet minimum elevation
        if (elevation < minElevation) {
            return 0;
        }
        
        // Base suitability for meeting minimum
        suitability += 0.4;
        
        // Bonus for higher elevation (but not too demanding)
        const elevationBonus = Math.min(0.4, (elevation - minElevation) * 2);
        suitability += elevationBonus;
        
        // Geology bonus (if available)
        if (geologyModule) {
            const rockType = geologyModule.getRockTypeAt(x, y);
            if (rockType === 'hard') {
                suitability += 0.3; // Hard rock creates springs
            } else if (rockType === 'soft') {
                suitability += 0.1; // Soft rock is okay
            }
        } else {
            suitability += 0.2; // No geology penalty
        }
        
        // Slope bonus
        const gradient = elevationModule.getGradient ? elevationModule.getGradient(x, y, 3) : { magnitude: 0.1 };
        if (gradient.magnitude > 0.01 && gradient.magnitude < 0.3) {
            suitability += 0.2;
        }
        
        return Math.max(0, Math.min(1, suitability));
    }
    
    generateBalancedRivers(worldContext, elevationModule, geologyModule) {
        console.log("🌊 Generating rivers with balanced settings...");
        
        this.springs.forEach((spring, index) => {
            console.log(`🌊 Tracing river ${index} from spring at (${spring.x}, ${spring.y})`);
            
            const riverPath = this.traceBalancedRiverPath(
                spring.x, spring.y, elevationModule, geologyModule, worldContext, index
            );
            
            const minPoints = Math.ceil(this.config.minRiverLength / this.config.riverStepSize);
            if (riverPath.length >= minPoints) {
                this.rivers.push({
                    id: `river_${index}`,
                    path: riverPath,
                    spring: spring,
                    flow: spring.flow
                });
                console.log(`✅ River ${index} created with ${riverPath.length} points`);
            } else {
                console.log(`❌ River ${index} too short (${riverPath.length} points < ${minPoints} required)`);
            }
        });
        
        console.log(`🌊 Rivers created: ${this.rivers.length} from ${this.springs.length} springs`);
    }
    
    traceBalancedRiverPath(startX, startY, elevationModule, geologyModule, worldContext, seed) {
        const path = [{ x: Math.floor(startX), y: Math.floor(startY) }];
        let currentX = startX;
        let currentY = startY;
        
        const maxSteps = Math.floor(this.config.maxRiverLength / this.config.riverStepSize);
        const stepSize = this.config.riverStepSize;
        
        const startElevation = elevationModule.getElevationAt(startX, startY);
        
        for (let step = 0; step < maxSteps; step++) {
            const bestDirection = this.findBestRiverDirection(
                currentX, currentY, elevationModule, geologyModule, seed + step
            );
            
            if (!bestDirection) {
                console.log(`  River stopped: no good direction at step ${step}`);
                break;
            }
            
            // Move in chosen direction
            currentX += Math.cos(bestDirection) * stepSize;
            currentY += Math.sin(bestDirection) * stepSize;
            
            if (!worldContext.isInBounds(currentX, currentY)) {
                console.log(`  River stopped: out of bounds at step ${step}`);
                break;
            }
            
            const currentElevation = elevationModule.getElevationAt(currentX, currentY);
            path.push({ 
                x: Math.floor(currentX), 
                y: Math.floor(currentY), 
                elevation: currentElevation,
                rockType: geologyModule ? geologyModule.getRockTypeAt(currentX, currentY) : 'soft'
            });
            
            // BALANCED: Use relative sea level based on start elevation
            const relativeSeaLevel = Math.max(0.05, startElevation * 0.2); // 20% of start elevation
            
            if (currentElevation <= relativeSeaLevel) {
                console.log(`  River stopped: reached sea level at step ${step} (${currentElevation.toFixed(3)} <= ${relativeSeaLevel.toFixed(3)})`);
                break;
            }
            
            // Stop if we hit an existing lake
            if (this.isNearLake(currentX, currentY, 6)) {
                console.log(`  River stopped: reached lake at step ${step}`);
                break;
            }
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
        
        // Sort by score
        directions.sort((a, b) => b.score - a.score);
        
        // Pick from top directions with some randomness
        const goodDirections = directions.filter(d => d.score > -1); // Very lenient
        if (goodDirections.length === 0) return null;
        
        const topCount = Math.min(3, goodDirections.length);
        const randomIndex = Math.floor(this.seededRandom(seed, 1000) * topCount);
        return goodDirections[randomIndex].angle;
    }
    
    evaluateRiverDirection(fromX, fromY, toX, toY, elevationModule, geologyModule) {
        let score = 0;
        
        // ELEVATION: Rivers want to flow downhill
        const fromElevation = elevationModule.getElevationAt(fromX, fromY);
        const toElevation = elevationModule.getElevationAt(toX, toY);
        const elevationDrop = fromElevation - toElevation;
        
        if (elevationDrop > 0) {
            score += elevationDrop * 8; // Good downhill flow
        } else if (elevationDrop > -0.01) {
            score += 1; // Tolerate flat areas
        } else {
            score -= 3; // Penalize uphill, but not impossibly
        }
        
        // GEOLOGY: More balanced preferences
        if (geologyModule) {
            const toRockType = geologyModule.getRockTypeAt(toX, toY);
            
            if (toRockType === 'soft') {
                score += this.config.softRockPreference;
            } else if (toRockType === 'hard') {
                score -= this.config.hardRockAvoidance;
            } else if (toRockType === 'clay') {
                score += this.config.clayChanneling;
            }
        }
        
        // GRADIENT: Prefer moderate gradients
        const gradient = elevationModule.getGradient ? elevationModule.getGradient(toX, toY) : { magnitude: 0.1 };
        if (gradient.magnitude > 0.005 && gradient.magnitude < 0.3) {
            score += 0.5; // Good drainage
        }
        
        return score;
    }
    
    generateBalancedLakes(worldContext, elevationModule, geologyModule) {
        console.log("🏞️ Generating balanced lakes...");
        const bounds = worldContext.getWorldBounds();
        const lakeCandidates = [];
        
        // Sample lake locations
        for (let x = bounds.minX; x <= bounds.maxX; x += 12) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 12) {
                const suitability = this.evaluateLakeLocation(x, y, elevationModule, geologyModule);
                
                if (suitability > 0.3) { // Lowered threshold
                    lakeCandidates.push({ x, y, suitability });
                }
            }
        }
        
        lakeCandidates.sort((a, b) => b.suitability - a.suitability);
        
        for (const candidate of lakeCandidates) {
            if (this.lakes.length >= this.config.lakeCount) break;
            
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
                    rockType: geologyModule ? geologyModule.getRockTypeAt(candidate.x, candidate.y) : 'soft',
                    type: 'geological'
                });
                console.log(`✅ Lake placed at (${candidate.x}, ${candidate.y}) radius=${radius.toFixed(1)}`);
            }
        }
        
        console.log(`🏞️ Generated ${this.lakes.length} balanced lakes`);
    }
    
    evaluateLakeLocation(x, y, elevationModule, geologyModule) {
        let suitability = 0;
        
        const elevation = elevationModule.getElevationAt(x, y);
        if (elevation > this.config.lakeLowElevationMax) return 0;
        
        suitability += (this.config.lakeLowElevationMax - elevation) * 1.5; // Less demanding
        
        if (geologyModule) {
            const rockType = geologyModule.getRockTypeAt(x, y);
            if (rockType === 'clay') {
                suitability += this.config.lakeClayPreference;
            } else if (rockType === 'hard') {
                suitability -= this.config.lakeHardRockAvoidance;
            } else {
                suitability += 0.2; // Soft rock is good
            }
        } else {
            suitability += 0.3; // No geology penalty
        }
        
        // Prefer flat areas
        const gradient = elevationModule.getGradient ? elevationModule.getGradient(x, y, 5) : { magnitude: 0.1 };
        if (gradient.magnitude < 0.08) {
            suitability += 0.3;
        }
        
        return Math.max(0, Math.min(1, suitability));
    }
    
    createRiverConfluences() {
        // Simplified confluence logic
        for (let i = 0; i < this.rivers.length; i++) {
            for (let j = i + 1; j < this.rivers.length; j++) {
                const river1 = this.rivers[i];
                const river2 = this.rivers[j];
                
                const confluencePoint = this.findConfluencePoint(river1, river2);
                if (confluencePoint) {
                    this.mergeRivers(river1, river2, confluencePoint);
                }
            }
        }
    }
    
    findConfluencePoint(river1, river2) {
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
        river1.confluences = river1.confluences || [];
        river2.confluences = river2.confluences || [];
        
        river1.confluences.push({ river: river2.id, point: confluencePoint });
        river2.confluences.push({ river: river1.id, point: confluencePoint });
    }
    
    // === UTILITY METHODS ===
    
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
            features.push(`near-water`);
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