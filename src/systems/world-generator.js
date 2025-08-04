// === WORLD GENERATOR MODULE ===
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
    }
    
    generateWorld(centerX = 0, centerY = 0) {
        this.generateVillages(centerX, centerY);
        this.generateRoadNetwork();
        this.generateMountainRanges(centerX, centerY);
        this.generateRiverSystem(centerX, centerY);
        this.generateLakes(centerX, centerY);
        this.generateForests(centerX, centerY);
        this.generateTrailNetwork();
    }
    
    generateVillages(centerX, centerY) {
        const villageSpacing = 80;
        
        for (let chunkY = -2; chunkY <= 2; chunkY++) {
            for (let chunkX = -2; chunkX <= 2; chunkX++) {
                if (this.seededRandom(chunkX * 1000 + chunkY, 1000) < 0.6) {
                    const baseX = centerX + (chunkX * villageSpacing);
                    const baseY = centerY + (chunkY * villageSpacing);
                    
                    const offsetX = this.seededRandom(chunkX * 2000 + chunkY, 1000) * 40 - 20;
                    const offsetY = this.seededRandom(chunkX + chunkY * 2000, 1000) * 40 - 20;
                    
                    this.villages.push({
                        x: Math.floor(baseX + offsetX),
                        y: Math.floor(baseY + offsetY),
                        size: Math.floor(this.seededRandom(chunkX * 3000 + chunkY, 1000) * 3) + 2,
                        name: this.generateVillageName(chunkX, chunkY)
                    });
                }
            }
        }
    }
    
    generateVillageName(x, y) {
        const prefixes = ['Iron', 'Stone', 'River', 'Green', 'Golden', 'Silver', 'Oak', 'Pine', 'Hill', 'Vale'];
        const suffixes = ['ford', 'bridge', 'town', 'haven', 'dale', 'burg', 'field', 'moor', 'glen', 'crest'];
        
        const prefixIndex = Math.floor(this.seededRandom(x * 1234 + y, 1000) * prefixes.length);
        const suffixIndex = Math.floor(this.seededRandom(x + y * 5678, 1000) * suffixes.length);
        
        return prefixes[prefixIndex] + suffixes[suffixIndex];
    }
    
    generateRoadNetwork() {
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
        const waypoints = [];
        const totalDistance = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
        const numWaypoints = Math.floor(totalDistance / 40) + 1;
        
        for (let i = 0; i <= numWaypoints; i++) {
            const progress = i / numWaypoints;
            const targetX = Math.floor(from.x + (to.x - from.x) * progress);
            const targetY = Math.floor(from.y + (to.y - from.y) * progress);
            
            const curveOffset = Math.sin(progress * Math.PI) * 10;
            const perpX = -(to.y - from.y) / totalDistance * curveOffset;
            const perpY = (to.x - from.x) / totalDistance * curveOffset;
            
            waypoints.push({
                x: Math.floor(targetX + perpX),
                y: Math.floor(targetY + perpY)
            });
        }
        
        return waypoints;
    }
    
    generateMountainRanges(centerX, centerY) {
        const numRanges = 2;
        
        for (let i = 0; i < numRanges; i++) {
            const offsetX = (this.seededRandom(i * 1000, 1000) - 0.5) * 300;
            const offsetY = (this.seededRandom(i * 2000, 1000) - 0.5) * 300;
            
            const length = 100 + this.seededRandom(i * 3000, 1000) * 100;
            const angle = this.seededRandom(i * 4000, 1000) * Math.PI * 2;
            
            this.mountainRanges.push({
                centerX: centerX + offsetX,
                centerY: centerY + offsetY,
                length: length,
                angle: angle,
                width: 25 + this.seededRandom(i * 5000, 1000) * 20
            });
        }
    }
    
    generateRiverSystem(centerX, centerY) {
        // Main river
        this.rivers.push({
            points: this.generateRiverPath(
                centerX - 150, centerY - 80,
                centerX + 150, centerY + 100, 0
            )
        });
        
        // Secondary river
        this.rivers.push({
            points: this.generateRiverPath(
                centerX + 60, centerY - 120,
                centerX - 80, centerY + 140, 1
            )
        });
    }
    
    generateRiverPath(startX, startY, endX, endY, seed) {
        const points = [];
        const segments = Math.floor(Math.abs(endX - startX) + Math.abs(endY - startY)) / 8;
        
        for (let i = 0; i <= segments; i++) {
            const progress = i / segments;
            const baseX = startX + (endX - startX) * progress;
            const baseY = startY + (endY - startY) * progress;
            
            const meander1 = Math.sin(progress * Math.PI * 4 + seed) * 15;
            const meander2 = Math.sin(progress * Math.PI * 8 + seed * 2) * 6;
            const totalMeander = meander1 + meander2;
            
            const perpAngle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
            
            points.push({
                x: Math.floor(baseX + Math.cos(perpAngle) * totalMeander),
                y: Math.floor(baseY + Math.sin(perpAngle) * totalMeander)
            });
        }
        
        return points;
    }
    
    generateLakes(centerX, centerY) {
        this.lakes.push({ x: centerX + 80, y: centerY - 60, radius: 12 });
        this.lakes.push({ x: centerX - 70, y: centerY + 90, radius: 15 });
        this.lakes.push({ x: centerX + 120, y: centerY + 40, radius: 8 });
    }
    
    generateForests(centerX, centerY) {
        const forestAreas = [
            {
                centerX: centerX - 80, centerY: centerY - 100,
                width: 60, height: 80, density: 0.8, type: 'dense'
            },
            {
                centerX: centerX + 120, centerY: centerY + 80,
                width: 50, height: 60, density: 0.7, type: 'mixed'
            },
            {
                centerX: centerX + 20, centerY: centerY - 70,
                width: 30, height: 25, density: 0.6, type: 'grove'
            }
        ];
        
        forestAreas.forEach(forest => {
            this.forests.push({
                ...forest,
                clearings: this.generateForestClearings(forest)
            });
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
        this.generateRoadToForestTrails();
        this.generateClearingToClearing();
        this.generateSpecialLocationTrails();
    }
    
    generateRoadToForestTrails() {
        this.forests.forEach(forest => {
            const nearestRoadPoint = this.findNearestRoadPoint(forest.centerX, forest.centerY);
            if (nearestRoadPoint && nearestRoadPoint.distance < 40) {
                const trailPath = this.generateTrailPath(
                    nearestRoadPoint.x, nearestRoadPoint.y,
                    forest.centerX, forest.centerY
                );
                this.trails.push({ type: 'road_to_forest', points: trailPath });
            }
        });
    }
    
    generateClearingToClearing() {
        this.forests.forEach(forest => {
            forest.clearings.forEach(clearing => {
                const nearestClearings = forest.clearings
                    .filter(c => c !== clearing)
                    .map(c => ({
                        clearing: c,
                        distance: Math.sqrt((c.x - clearing.x) ** 2 + (c.y - clearing.y) ** 2)
                    }))
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 1);
                
                nearestClearings.forEach(({clearing: target}) => {
                    const trailPath = this.generateTrailPath(clearing.x, clearing.y, target.x, target.y);
                    this.trails.push({ type: 'clearing_to_clearing', points: trailPath });
                });
            });
        });
    }
    
    generateSpecialLocationTrails() {
        this.lakes.forEach(lake => {
            const nearestRoadPoint = this.findNearestRoadPoint(lake.x, lake.y);
            if (nearestRoadPoint && nearestRoadPoint.distance < 50) {
                const lakeTrail = this.generateTrailPath(
                    nearestRoadPoint.x, nearestRoadPoint.y,
                    lake.x + lake.radius, lake.y
                );
                this.trails.push({ type: 'to_lake', points: lakeTrail });
            }
        });
    }
    
    findNearestRoadPoint(x, y) {
        let nearest = null;
        let minDistance = Infinity;
        
        this.roads.forEach(road => {
            road.waypoints.forEach(point => {
                const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = { x: point.x, y: point.y, distance: distance };
                }
            });
        });
        
        return nearest;
    }
    
    generateTrailPath(startX, startY, endX, endY) {
        const points = [];
        const totalDistance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const numSegments = Math.max(3, Math.floor(totalDistance / 6));
        
        for (let i = 0; i <= numSegments; i++) {
            const progress = i / numSegments;
            let x = startX + (endX - startX) * progress;
            let y = startY + (endY - startY) * progress;
            
            if (i > 0 && i < numSegments) {
                const wander = Math.sin(progress * Math.PI * 3) * 2;
                const perpAngle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
                x += Math.cos(perpAngle) * wander;
                y += Math.sin(perpAngle) * wander;
            }
            
            points.push({ x: Math.floor(x), y: Math.floor(y) });
        }
        
        return points;
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
            trails: this.trails
        };
    }
}