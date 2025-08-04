// === IMPROVED WORLD GENERATOR MODULE ===
// File: world-generator.js
class WorldGenerator {
    constructor() {
        this.villages = [];
        this.roads = [];
        this.rivers = [];
        this.mountainRanges = [];
        this.lakes = [];
        this.forests = [];
        this.trails = [];
        
        // New: Elevation and terrain data
        this.elevationMap = new Map();
        this.waterSources = [];
        this.regionCenter = { x: 0, y: 0 };
        this.regionSize = 400; // Local region size
    }
    
    generateWorld(centerX = 0, centerY = 0) {
        this.regionCenter = { x: centerX, y: centerY };
        
        // Step 1: Generate elevation (foundation for everything else)
        this.generateElevation(centerX, centerY);
        
        // Step 2: Create major geographic features
        this.generateMountainRanges(centerX, centerY);
        this.generateWaterSources(); // Springs in mountains
        
        // Step 3: Generate water systems (follow elevation)
        this.generateRiverSystem(centerX, centerY);
        this.generateLakes(centerX, centerY);
        
        // Step 4: Generate vegetation (depends on water and elevation)
        this.generateForests(centerX, centerY);
        
        // Step 5: Generate settlements (near water, on flat areas)
        this.generateVillages(centerX, centerY);
        
        // Step 6: Connect settlements with terrain-aware roads
        this.generateRoadNetwork();
        this.generateTrailNetwork();
    }
    
    // === ELEVATION SYSTEM ===
    generateElevation(centerX, centerY) {
        const radius = this.regionSize / 2;
        
        // Create several elevation peaks and ridges
        const elevationSources = [
            // Main mountain in the north
            { x: centerX - 50, y: centerY - 120, height: 1.0, radius: 80, type: 'peak' },
            // Secondary hills
            { x: centerX + 80, y: centerY - 60, height: 0.7, radius: 60, type: 'hill' },
            { x: centerX - 120, y: centerY + 40, height: 0.8, radius: 70, type: 'ridge' },
            // Gentle slopes
            { x: centerX + 40, y: centerY + 80, height: 0.4, radius: 90, type: 'slope' }
        ];
        
        // Generate elevation for the entire region
        for (let x = centerX - radius; x <= centerX + radius; x += 2) {
            for (let y = centerY - radius; y <= centerY + radius; y += 2) {
                let elevation = 0.1; // Base sea level
                
                // Combine influence from all elevation sources
                elevationSources.forEach(source => {
                    const distance = Math.sqrt((x - source.x) ** 2 + (y - source.y) ** 2);
                    if (distance < source.radius) {
                        const influence = 1 - (distance / source.radius);
                        const contribution = source.height * this.smoothStep(influence);
                        elevation = Math.max(elevation, contribution);
                    }
                });
                
                // Add some noise for natural variation
                const noise = this.noise(x * 0.01, y * 0.01) * 0.1;
                elevation = Math.max(0, Math.min(1, elevation + noise));
                
                this.elevationMap.set(`${x},${y}`, elevation);
            }
        }
    }
    
    getElevation(x, y) {
        // Check exact coordinate first
        const exact = this.elevationMap.get(`${x},${y}`);
        if (exact !== undefined) return exact;
        
        // Find nearest stored elevation (since we store every 2 units)
        const nearX = Math.round(x / 2) * 2;
        const nearY = Math.round(y / 2) * 2;
        const near = this.elevationMap.get(`${nearX},${nearY}`);
        if (near !== undefined) return near;
        
        // Default to low elevation if not found
        return 0.2;
    }
    
    // === IMPROVED MOUNTAIN GENERATION ===
    generateMountainRanges(centerX, centerY) {
        // Create mountain ranges based on high elevation areas
        this.mountainRanges = [
            {
                centerX: centerX - 50,
                centerY: centerY - 120,
                length: 120,
                angle: Math.PI / 6, // Northeast-southwest
                width: 40,
                peaks: [
                    { x: centerX - 30, y: centerY - 100 },
                    { x: centerX - 70, y: centerY - 140 }
                ]
            },
            {
                centerX: centerX - 120,
                centerY: centerY + 40,
                length: 80,
                angle: Math.PI / 3,
                width: 30,
                peaks: [
                    { x: centerX - 100, y: centerY + 20 },
                    { x: centerX - 140, y: centerY + 60 }
                ]
            }
        ];
    }
    
    // === WATER SOURCE GENERATION ===
    generateWaterSources() {
        this.waterSources = [];
        
        // Springs emerge from high elevation areas
        this.mountainRanges.forEach(range => {
            range.peaks.forEach(peak => {
                // Add springs near mountain peaks
                for (let i = 0; i < 2; i++) {
                    const angle = (i * Math.PI * 2) / 2;
                    const distance = 20 + this.seededRandom(peak.x + peak.y + i, 1000) * 15;
                    
                    this.waterSources.push({
                        x: peak.x + Math.cos(angle) * distance,
                        y: peak.y + Math.sin(angle) * distance,
                        flow: 0.5 + this.seededRandom(peak.x * 2 + peak.y + i, 1000) * 0.5,
                        type: 'spring'
                    });
                }
            });
        });
    }
    
    // === IMPROVED RIVER SYSTEM ===
    generateRiverSystem(centerX, centerY) {
        this.rivers = [];
        
        this.waterSources.forEach((source, index) => {
            if (source.type === 'spring') {
                const riverPath = this.generateRiverPath(source.x, source.y, index);
                if (riverPath.length > 5) { // Only create rivers with substantial length
                    this.rivers.push({
                        points: riverPath,
                        source: source,
                        flow: source.flow
                    });
                }
            }
        });
    }
    
    generateRiverPath(startX, startY, seed) {
        const points = [{ x: startX, y: startY }];
        let currentX = startX;
        let currentY = startY;
        let currentElevation = this.getElevation(currentX, currentY);
        
        const maxLength = 150;
        const stepSize = 4;
        
        for (let step = 0; step < maxLength; step++) {
            // Find the direction of steepest descent
            let bestDirection = null;
            let bestElevation = currentElevation;
            
            // Check 8 directions
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const testX = currentX + Math.cos(angle) * stepSize;
                const testY = currentY + Math.sin(angle) * stepSize;
                const testElevation = this.getElevation(testX, testY);
                
                if (testElevation < bestElevation) {
                    bestElevation = testElevation;
                    bestDirection = angle;
                }
            }
            
            // If no downhill direction found, try to continue in current direction with some meandering
            if (bestDirection === null) {
                const lastDirection = points.length > 1 ? 
                    Math.atan2(currentY - points[points.length - 2].y, currentX - points[points.length - 2].x) : 
                    this.seededRandom(seed * 1000 + step, 1000) * Math.PI * 2;
                
                bestDirection = lastDirection + (this.seededRandom(seed * 2000 + step, 1000) - 0.5) * 0.5;
            }
            
            // Move in the chosen direction
            currentX += Math.cos(bestDirection) * stepSize;
            currentY += Math.sin(bestDirection) * stepSize;
            currentElevation = this.getElevation(currentX, currentY);
            
            points.push({ x: Math.floor(currentX), y: Math.floor(currentY) });
            
            // Stop if we've reached very low elevation (sea level)
            if (currentElevation <= 0.15) break;
            
            // Stop if we've moved too far from the region
            const distanceFromCenter = Math.sqrt(
                (currentX - this.regionCenter.x) ** 2 + 
                (currentY - this.regionCenter.y) ** 2
            );
            if (distanceFromCenter > this.regionSize / 2) break;
        }
        
        return points;
    }
    
    // === IMPROVED VILLAGE PLACEMENT ===
    generateVillages(centerX, centerY) {
        this.villages = [];
        const candidates = [];
        
        // Find good locations for villages
        const searchRadius = this.regionSize / 2 - 50;
        const gridSize = 40;
        
        for (let x = centerX - searchRadius; x <= centerX + searchRadius; x += gridSize) {
            for (let y = centerY - searchRadius; y <= centerY + searchRadius; y += gridSize) {
                const score = this.evaluateSettlementLocation(x, y);
                if (score > 0.3) {
                    candidates.push({ x, y, score });
                }
            }
        }
        
        // Sort by score and select the best locations
        candidates.sort((a, b) => b.score - a.score);
        const numVillages = Math.min(8, candidates.length);
        
        for (let i = 0; i < numVillages; i++) {
            const candidate = candidates[i];
            
            // Make sure villages aren't too close to each other
            const tooClose = this.villages.some(village => {
                const distance = Math.sqrt((village.x - candidate.x) ** 2 + (village.y - candidate.y) ** 2);
                return distance < 60;
            });
            
            if (!tooClose) {
                this.villages.push({
                    x: candidate.x,
                    y: candidate.y,
                    size: Math.floor(candidate.score * 4) + 2,
                    name: this.generateVillageName(candidate.x, candidate.y),
                    settlementScore: candidate.score
                });
            }
        }
    }
    
    evaluateSettlementLocation(x, y) {
        let score = 0;
        
        // Prefer flat areas (low elevation but not too low)
        const elevation = this.getElevation(x, y);
        if (elevation > 0.15 && elevation < 0.5) {
            score += 0.4;
        } else if (elevation >= 0.5 && elevation < 0.7) {
            score += 0.2; // Hills are okay but not ideal
        }
        
        // Strongly prefer locations near water
        const nearWater = this.rivers.some(river => {
            return river.points.some(point => {
                const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
                return distance < 25;
            });
        });
        
        if (nearWater) score += 0.5;
        
        // Prefer locations near but not in forests
        const nearForest = this.isNearForest(x, y, 30);
        const inForest = this.isInForest(x, y);
        
        if (nearForest && !inForest) score += 0.2;
        if (inForest) score -= 0.3; // Don't build in dense forest
        
        // Add some randomness
        score += this.seededRandom(x * 1000 + y, 1000) * 0.1;
        
        return Math.max(0, Math.min(1, score));
    }
    
    // === HELPER METHODS ===
    smoothStep(x) {
        return x * x * (3 - 2 * x);
    }
    
    noise(x, y) {
        // Simple noise function
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }
    
    isNearForest(x, y, radius) {
        // This will be implemented when we improve forests
        return this.seededRandom(x * 543 + y * 777, 1000) > 0.7;
    }
    
    isInForest(x, y) {
        // This will be implemented when we improve forests
        return this.seededRandom(x * 123 + y * 456, 1000) > 0.8;
    }
    
    // === EXISTING METHODS (keeping for compatibility) ===
    generateVillageName(x, y) {
        const prefixes = ['Iron', 'Stone', 'River', 'Green', 'Golden', 'Silver', 'Oak', 'Pine', 'Hill', 'Vale'];
        const suffixes = ['ford', 'bridge', 'town', 'haven', 'dale', 'burg', 'field', 'moor', 'glen', 'crest'];
        
        const prefixIndex = Math.floor(this.seededRandom(x * 1234 + y, 1000) * prefixes.length);
        const suffixIndex = Math.floor(this.seededRandom(x + y * 5678, 1000) * suffixes.length);
        
        return prefixes[prefixIndex] + suffixes[suffixIndex];
    }
    
    generateRoadNetwork() {
        this.roads = [];
        this.villages.forEach(village => {
            const nearbyVillages = this.villages
                .filter(v => v !== village)
                .map(v => ({
                    village: v,
                    distance: Math.abs(v.x - village.x) + Math.abs(v.y - village.y)
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 2);
            
            nearbyVillages.forEach(({village: target}) => {
                this.roads.push({
                    from: village,
                    to: target,
                    waypoints: this.generateRoadPath(village, target)
                });
            });
        });
    }
    
    generateRoadPath(from, to) {
        // Simple pathfinding - could be improved to follow terrain
        const waypoints = [];
        const totalDistance = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
        const numWaypoints = Math.floor(totalDistance / 40) + 1;
        
        for (let i = 0; i <= numWaypoints; i++) {
            const progress = i / numWaypoints;
            const targetX = Math.floor(from.x + (to.x - from.x) * progress);
            const targetY = Math.floor(from.y + (to.y - from.y) * progress);
            
            waypoints.push({ x: targetX, y: targetY });
        }
        
        return waypoints;
    }
    
    generateLakes(centerX, centerY) {
        this.lakes = [];
        
        // Place lakes in low-lying areas
        const lakeCandidates = [
            { x: centerX + 80, y: centerY - 60 },
            { x: centerX - 70, y: centerY + 90 },
            { x: centerX + 120, y: centerY + 40 }
        ];
        
        lakeCandidates.forEach(candidate => {
            const elevation = this.getElevation(candidate.x, candidate.y);
            if (elevation < 0.4) { // Only place lakes in low areas
                this.lakes.push({
                    x: candidate.x,
                    y: candidate.y,
                    radius: 8 + this.seededRandom(candidate.x + candidate.y, 1000) * 8
                });
            }
        });
    }
    
    generateForests(centerX, centerY) {
        // Simplified for now - will improve in next iteration
        const forestAreas = [
            {
                centerX: centerX - 80, centerY: centerY - 100,
                width: 60, height: 80, density: 0.8, type: 'dense'
            },
            {
                centerX: centerX + 120, centerY: centerY + 80,
                width: 50, height: 60, density: 0.7, type: 'mixed'
            }
        ];
        
        forestAreas.forEach(forest => {
            // Only place forests where elevation and water conditions are suitable
            const elevation = this.getElevation(forest.centerX, forest.centerY);
            if (elevation > 0.2 && elevation < 0.8) {
                this.forests.push({
                    ...forest,
                    clearings: this.generateForestClearings(forest)
                });
            }
        });
    }
    
    generateForestClearings(forest) {
        const clearings = [];
        const numClearings = Math.floor(forest.width * forest.height / 800) + 1;
        
        for (let i = 0; i < numClearings; i++) {
            const offsetX = (this.seededRandom(forest.centerX + i * 1000, 1000) - 0.5) * forest.width * 0.6;
            const offsetY = (this.seededRandom(forest.centerY + i * 2000, 1000) - 0.5) * forest.height * 0.6;
            
            clearings.push({
                x: forest.centerX + offsetX,
                y: forest.centerY + offsetY,
                radius: 6 + this.seededRandom(i * 3000, 1000) * 8
            });
        }
        
        return clearings;
    }
    
    generateTrailNetwork() {
        this.trails = [];
        // Simplified for now
    }
    
    seededRandom(seed, range = 1000) {
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x));
    }
    
    getWorldFeatures() {
        return {
            villages: this.villages,
            roads: this.roads,
            rivers: this.rivers,
            mountainRanges: this.mountainRanges,
            lakes: this.lakes,
            forests: this.forests,
            trails: this.trails,
            // New data
            elevationMap: this.elevationMap,
            waterSources: this.waterSources
        };
    }
    
    // New method to get elevation data
    getElevationData() {
        return {
            elevationMap: this.elevationMap,
            getElevation: (x, y) => this.getElevation(x, y)
        };
    }
}