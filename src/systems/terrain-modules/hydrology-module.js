// === DEBUG HYDROLOGY MODULE ===
// File: src/systems/terrain-modules/hydrology-module.js
// COMPLETE REPLACEMENT - Now with extensive debugging to find the problem

class HydrologyModule extends TerrainModuleBase {
    constructor(config = {}) {
        super('hydrology', config);
        this.priority = 90;
        this.dependencies = ['geology', 'elevation'];
        
        this.rivers = [];
        this.lakes = [];
        this.springs = [];
        this.waterMap = new Map();
        
        // DEBUG: Track what's happening
        this.debugInfo = {
            springAttempts: 0,
            springCandidates: 0,
            springsPlaced: 0,
            riverAttempts: 0,
            riversCreated: 0,
            elevationSamples: [],
            springThreshold: 0
        };
    }
    
    getDefaultConfig() {
        return {
            // === SIMPLIFIED SETTINGS FOR DEBUGGING ===
            springCount: 6,                    // Reduced from 8
            springElevationMin: 0.2,           // Lowered from 0.25
            
            // === VERY PERMISSIVE RIVER SETTINGS ===
            riverStepSize: 2,
            maxRiverLength: 80,                // Shorter for testing
            minRiverLength: 4,                 // Much shorter minimum
            
            // === ELEVATION FLOW ===
            elevationWeight: 8.0,              // Still high but not extreme
            minimumGradient: 0.0001,           // Almost any downhill is OK
            
            // === ROCK TYPE (VERY PERMISSIVE) ===
            hardRockResistance: 0.1,           // Tiny penalty
            softRockBonus: 0.2,                // Small bonus
            clayChanneling: 0.3,
            
            // === FLOW PHYSICS ===
            momentumWeight: 1.0,               // Reduced
            stagnationPenalty: -1.0,           // Less harsh
            
            // === LAKE SETTINGS ===
            lakeCount: 3,
            minLakeRadius: 5,
            maxLakeRadius: 12,
            lakeSpacing: 30,
            lakeElevationMax: 0.4,             // Higher threshold
            lakeGradientMax: 0.1,              // More permissive
            
            // === CONFLUENCE ===
            confluenceEnabled: true,
            confluenceDistance: 6,
        };
    }
    
    generate(worldContext) {
        console.log("🔍 DEBUG: Starting hydrology generation with extensive logging...");
        
        // Reset everything
        this.rivers = [];
        this.lakes = [];
        this.springs = [];
        this.waterMap.clear();
        this.debugInfo = {
            springAttempts: 0,
            springCandidates: 0,
            springsPlaced: 0,
            riverAttempts: 0,
            riversCreated: 0,
            elevationSamples: [],
            springThreshold: 0
        };
        
        const elevationModule = worldContext.getModule('elevation');
        const geologyModule = worldContext.getModule('geology');
        
        console.log("🔍 DEBUG: Checking module dependencies...");
        console.log(`   - Elevation module: ${elevationModule ? 'FOUND' : 'MISSING'}`);
        console.log(`   - Geology module: ${geologyModule ? 'FOUND' : 'MISSING'}`);
        
        if (!elevationModule) {
            console.error("❌ CRITICAL: No elevation module - cannot generate water systems!");
            return this.getEmptyResult();
        }
        
        // Debug world bounds
        const bounds = worldContext.getWorldBounds();
        console.log("🔍 DEBUG: World bounds:", bounds);
        
        // Step 1: Generate springs with debugging
        this.generateDebugSprings(worldContext, elevationModule, geologyModule);
        
        // Step 2: Generate rivers with debugging
        this.generateDebugRivers(worldContext, elevationModule, geologyModule);
        
        // Step 3: Generate lakes with debugging
        this.generateDebugLakes(worldContext, elevationModule, geologyModule);
        
        // Step 4: Final debugging report
        this.printFinalDebugReport();
        
        return {
            rivers: this.rivers,
            lakes: this.lakes,
            springs: this.springs,
            waterMap: this.waterMap,
            debugInfo: this.debugInfo
        };
    }
    
    generateDebugSprings(worldContext, elevationModule, geologyModule) {
        console.log("🔍 DEBUG: === SPRING GENERATION ===");
        const bounds = worldContext.getWorldBounds();
        
        // Sample elevation distribution
        console.log("🔍 DEBUG: Sampling elevation distribution...");
        let elevationSamples = [];
        for (let i = 0; i < 100; i++) {
            const testX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            const testY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
            const elevation = elevationModule.getElevationAt(testX, testY);
            elevationSamples.push(elevation);
        }
        
        elevationSamples.sort((a, b) => b - a);
        this.debugInfo.elevationSamples = elevationSamples;
        
        const minElev = Math.min(...elevationSamples);
        const maxElev = Math.max(...elevationSamples);
        const avgElev = elevationSamples.reduce((a, b) => a + b, 0) / elevationSamples.length;
        const medianElev = elevationSamples[Math.floor(elevationSamples.length / 2)];
        const top25Elev = elevationSamples[Math.floor(elevationSamples.length * 0.25)];
        
        console.log(`🔍 DEBUG: Elevation stats:`);
        console.log(`   Min: ${minElev.toFixed(3)}, Max: ${maxElev.toFixed(3)}`);
        console.log(`   Avg: ${avgElev.toFixed(3)}, Median: ${medianElev.toFixed(3)}`);
        console.log(`   Top 25%: ${top25Elev.toFixed(3)}`);
        
        // Determine spring threshold
        const springThreshold = Math.max(this.config.springElevationMin, top25Elev);
        this.debugInfo.springThreshold = springThreshold;
        
        console.log(`🔍 DEBUG: Spring threshold set to: ${springThreshold.toFixed(3)}`);
        
        // Find spring candidates
        console.log("🔍 DEBUG: Searching for spring locations...");
        const springCandidates = [];
        const maxAttempts = this.config.springCount * 50; // More attempts
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            this.debugInfo.springAttempts++;
            
            const x = bounds.minX + 20 + this.seededRandom(attempt * 1000, 1000) * (bounds.maxX - bounds.minX - 40);
            const y = bounds.minY + 20 + this.seededRandom(attempt * 2000, 1000) * (bounds.maxY - bounds.minY - 40);
            
            const elevation = elevationModule.getElevationAt(x, y);
            
            if (elevation >= springThreshold) {
                const suitability = this.evaluateSpringLocation(x, y, elevationModule, geologyModule, springThreshold);
                if (suitability > 0.3) { // Lowered threshold
                    springCandidates.push({
                        x: Math.floor(x),
                        y: Math.floor(y),
                        suitability: suitability,
                        elevation: elevation
                    });
                    this.debugInfo.springCandidates++;
                }
            }
        }
        
        console.log(`🔍 DEBUG: Spring search results:`);
        console.log(`   Attempts: ${this.debugInfo.springAttempts}`);
        console.log(`   Candidates found: ${this.debugInfo.springCandidates}`);
        console.log(`   Above threshold: ${springCandidates.length}`);
        
        if (springCandidates.length === 0) {
            console.error("❌ CRITICAL: No spring candidates found!");
            console.log("🔍 DEBUG: Trying emergency spring placement...");
            
            // Emergency: place springs at highest elevations regardless of threshold
            const emergencyCandidates = [];
            for (let i = 0; i < 10; i++) {
                const highElev = elevationSamples[i];
                for (let attempt = 0; attempt < 20; attempt++) {
                    const x = bounds.minX + 30 + Math.random() * (bounds.maxX - bounds.minX - 60);
                    const y = bounds.minY + 30 + Math.random() * (bounds.maxY - bounds.minY - 60);
                    const testElev = elevationModule.getElevationAt(x, y);
                    
                    if (Math.abs(testElev - highElev) < 0.05) {
                        emergencyCandidates.push({
                            x: Math.floor(x),
                            y: Math.floor(y),
                            suitability: 0.8,
                            elevation: testElev
                        });
                        break;
                    }
                }
            }
            springCandidates.push(...emergencyCandidates);
            console.log(`🔍 DEBUG: Emergency placement found ${emergencyCandidates.length} locations`);
        }
        
        // Place springs
        springCandidates.sort((a, b) => b.suitability - a.suitability);
        
        for (const candidate of springCandidates) {
            if (this.springs.length >= this.config.springCount) break;
            
            // Reduced spacing requirement
            const tooClose = this.springs.some(spring => 
                this.distance(spring.x, spring.y, candidate.x, candidate.y) < 25
            );
            
            if (!tooClose) {
                this.springs.push({
                    x: candidate.x,
                    y: candidate.y,
                    flow: 0.3 + candidate.suitability * 0.7,
                    elevation: candidate.elevation,
                    rockType: geologyModule ? geologyModule.getRockTypeAt(candidate.x, candidate.y) : 'soft'
                });
                this.debugInfo.springsPlaced++;
                console.log(`✅ Spring placed at (${candidate.x}, ${candidate.y}) elevation=${candidate.elevation.toFixed(3)} suitability=${candidate.suitability.toFixed(2)}`);
            }
        }
        
        console.log(`🔍 DEBUG: Final spring count: ${this.springs.length}`);
    }
    
    evaluateSpringLocation(x, y, elevationModule, geologyModule, threshold) {
        const elevation = elevationModule.getElevationAt(x, y);
        
        if (elevation < threshold) return 0;
        
        let suitability = 0.5; // Base suitability
        
        // Higher elevation bonus
        const elevationBonus = Math.min(0.3, (elevation - threshold) * 2);
        suitability += elevationBonus;
        
        // Rock type bonus
        if (geologyModule) {
            const rockType = geologyModule.getRockTypeAt(x, y);
            if (rockType === 'hard') suitability += 0.2;
            else if (rockType === 'soft') suitability += 0.1;
        } else {
            suitability += 0.1;
        }
        
        return Math.max(0, Math.min(1, suitability));
    }
    
    generateDebugRivers(worldContext, elevationModule, geologyModule) {
        console.log("🔍 DEBUG: === RIVER GENERATION ===");
        console.log(`🔍 DEBUG: Starting with ${this.springs.length} springs`);
        
        if (this.springs.length === 0) {
            console.error("❌ CRITICAL: No springs available for river generation!");
            return;
        }
        
        this.springs.forEach((spring, index) => {
            this.debugInfo.riverAttempts++;
            console.log(`🔍 DEBUG: Tracing river ${index} from spring at (${spring.x}, ${spring.y}) elevation=${spring.elevation.toFixed(3)}`);
            
            const riverPath = this.traceDebugRiverPath(
                spring.x, spring.y, elevationModule, geologyModule, worldContext, index
            );
            
            console.log(`🔍 DEBUG: River ${index} traced ${riverPath.length} points`);
            
            const minPoints = Math.ceil(this.config.minRiverLength / this.config.riverStepSize);
            console.log(`🔍 DEBUG: Minimum required points: ${minPoints}`);
            
            if (riverPath.length >= minPoints) {
                this.rivers.push({
                    id: `river_${index}`,
                    path: riverPath,
                    spring: spring,
                    flow: spring.flow,
                    flowType: 'debug_traced'
                });
                this.debugInfo.riversCreated++;
                console.log(`✅ River ${index} CREATED with ${riverPath.length} points`);
                
                // Log a few points from the river
                const samplePoints = [0, Math.floor(riverPath.length/2), riverPath.length-1];
                samplePoints.forEach(i => {
                    if (riverPath[i]) {
                        const point = riverPath[i];
                        console.log(`   Point ${i}: (${point.x}, ${point.y}) elev=${point.elevation?.toFixed(3) || 'unknown'}`);
                    }
                });
            } else {
                console.log(`❌ River ${index} REJECTED: too short (${riverPath.length} < ${minPoints})`);
            }
        });
        
        console.log(`🔍 DEBUG: River generation complete: ${this.rivers.length} rivers created`);
    }
    
    traceDebugRiverPath(startX, startY, elevationModule, geologyModule, worldContext, seed) {
        console.log(`🔍 DEBUG: Starting river trace from (${startX}, ${startY})`);
        
        const path = [{ x: Math.floor(startX), y: Math.floor(startY), elevation: elevationModule.getElevationAt(startX, startY) }];
        let currentX = startX;
        let currentY = startY;
        let lastDirection = null;
        
        const maxSteps = Math.floor(this.config.maxRiverLength / this.config.riverStepSize);
        const stepSize = this.config.riverStepSize;
        
        console.log(`🔍 DEBUG: Max steps: ${maxSteps}, Step size: ${stepSize}`);
        
        for (let step = 0; step < maxSteps; step++) {
            const currentElevation = elevationModule.getElevationAt(currentX, currentY);
            
            // Find best direction with detailed logging
            const flowDirection = this.findDebugFlowDirection(
                currentX, currentY, elevationModule, geologyModule, seed + step, lastDirection, step
            );
            
            if (!flowDirection) {
                console.log(`🔍 DEBUG: River stopped at step ${step}: no valid flow direction`);
                break;
            }
            
            // Move in chosen direction
            const newX = currentX + Math.cos(flowDirection.angle) * stepSize;
            const newY = currentY + Math.sin(flowDirection.angle) * stepSize;
            
            if (!worldContext.isInBounds(newX, newY)) {
                console.log(`🔍 DEBUG: River stopped at step ${step}: out of bounds`);
                break;
            }
            
            const newElevation = elevationModule.getElevationAt(newX, newY);
            const elevationDrop = currentElevation - newElevation;
            
            currentX = newX;
            currentY = newY;
            lastDirection = flowDirection.angle;
            
            path.push({ 
                x: Math.floor(currentX), 
                y: Math.floor(currentY), 
                elevation: newElevation,
                elevationDrop: elevationDrop
            });
            
            // Log every 10th step
            if (step % 10 === 0 || step < 5) {
                console.log(`🔍 DEBUG: Step ${step}: (${Math.floor(currentX)}, ${Math.floor(currentY)}) elev=${newElevation.toFixed(3)} drop=${elevationDrop.toFixed(4)}`);
            }
            
            // Very generous stopping conditions
            if (newElevation <= 0.05) {
                console.log(`🔍 DEBUG: River stopped at step ${step}: reached very low elevation`);
                break;
            }
        }
        
        console.log(`🔍 DEBUG: River trace complete: ${path.length} points generated`);
        return path;
    }
    
    findDebugFlowDirection(x, y, elevationModule, geologyModule, seed, lastDirection, step) {
        const directions = [];
        const stepSize = this.config.riverStepSize;
        const currentElevation = elevationModule.getElevationAt(x, y);
        
        // Check all 8 directions
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const testX = x + Math.cos(angle) * stepSize;
            const testY = y + Math.sin(angle) * stepSize;
            const testElevation = elevationModule.getElevationAt(testX, testY);
            
            const elevationDrop = currentElevation - testElevation;
            
            let score = 0;
            
            // Very simple scoring: any downhill is good
            if (elevationDrop > 0) {
                score = elevationDrop * 10; // Simple elevation preference
            } else {
                score = -1; // Small penalty for uphill/flat
            }
            
            directions.push({ angle, score, elevationDrop, testX, testY });
        }
        
        // Sort by score
        directions.sort((a, b) => b.score - a.score);
        
        // Log direction analysis for first few steps
        if (step < 3) {
            console.log(`🔍 DEBUG: Step ${step} direction analysis:`);
            directions.slice(0, 3).forEach((dir, i) => {
                const angleDeg = (dir.angle * 180 / Math.PI).toFixed(0);
                console.log(`   ${i+1}. Angle ${angleDeg}°: score=${dir.score.toFixed(2)}, drop=${dir.elevationDrop.toFixed(4)}`);
            });
        }
        
        // Accept any positive score
        const bestDirection = directions[0];
        if (bestDirection.score > -0.5) { // Very lenient
            return bestDirection;
        }
        
        return null;
    }
    
    generateDebugLakes(worldContext, elevationModule, geologyModule) {
        console.log("🔍 DEBUG: === LAKE GENERATION ===");
        
        const bounds = worldContext.getWorldBounds();
        const lakeCandidates = [];
        
        // Simple lake placement - just find low areas
        for (let x = bounds.minX; x <= bounds.maxX; x += 20) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 20) {
                const elevation = elevationModule.getElevationAt(x, y);
                
                if (elevation <= this.config.lakeElevationMax) {
                    lakeCandidates.push({ 
                        x, 
                        y, 
                        suitability: (this.config.lakeElevationMax - elevation) / this.config.lakeElevationMax,
                        elevation: elevation
                    });
                }
            }
        }
        
        console.log(`🔍 DEBUG: Found ${lakeCandidates.length} potential lake locations`);
        
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
                    elevation: candidate.elevation,
                    type: 'debug_placed'
                });
                console.log(`✅ Lake placed at (${candidate.x}, ${candidate.y}) radius=${radius.toFixed(1)} elevation=${candidate.elevation.toFixed(3)}`);
            }
        }
        
        console.log(`🔍 DEBUG: Lake generation complete: ${this.lakes.length} lakes created`);
    }
    
    printFinalDebugReport() {
        console.log("🔍 DEBUG: === FINAL HYDROLOGY REPORT ===");
        console.log(`📊 Spring Stats:`);
        console.log(`   Attempts: ${this.debugInfo.springAttempts}`);
        console.log(`   Candidates: ${this.debugInfo.springCandidates}`);
        console.log(`   Placed: ${this.debugInfo.springsPlaced}`);
        console.log(`   Threshold: ${this.debugInfo.springThreshold.toFixed(3)}`);
        
        console.log(`📊 River Stats:`);
        console.log(`   Attempts: ${this.debugInfo.riverAttempts}`);
        console.log(`   Created: ${this.debugInfo.riversCreated}`);
        
        console.log(`📊 Final Counts:`);
        console.log(`   Springs: ${this.springs.length}`);
        console.log(`   Rivers: ${this.rivers.length}`);
        console.log(`   Lakes: ${this.lakes.length}`);
        
        if (this.rivers.length === 0) {
            console.error("❌ NO RIVERS GENERATED!");
            console.log("🔍 Possible causes:");
            console.log("   1. No springs were placed (elevation too low everywhere)");
            console.log("   2. Rivers can't find downhill paths (terrain too flat)");
            console.log("   3. Rivers too short (increase maxRiverLength or decrease minRiverLength)");
            console.log("   4. Bounds too small for river generation");
        } else {
            console.log("✅ Rivers successfully generated!");
        }
    }
    
    // === SIMPLIFIED PUBLIC API ===
    
    affectsPosition(x, y, worldContext) {
        return this.isWaterAt(x, y);
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
        }
        
        return {
            terrain,
            features,
            hasWater: this.isWaterAt(x, y),
            nearWater: this.isNearWater(x, y, 15)
        };
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
        
        this.lakes.forEach(lake => {
            const distance = Math.max(0, this.distance(x, y, lake.x, lake.y) - lake.radius);
            minDistance = Math.min(minDistance, distance);
        });
        
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
        return 0.2;
    }
    
    getRivers() { return this.rivers; }
    getLakes() { return this.lakes; }
    getSprings() { return this.springs; }
    
    getEmptyResult() {
        return {
            rivers: [],
            lakes: [],
            springs: [],
            waterMap: new Map()
        };
    }
}

// Register the debug module
window.TerrainModuleRegistry.registerModuleType('hydrology', HydrologyModule);