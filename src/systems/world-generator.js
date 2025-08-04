// === TERRAIN SYSTEM MODULE ===
// File: terrain-system.js
class TerrainSystem {
    constructor() {
        this.terrainTypes = {
            plains: { symbol: '▓', className: 'terrain-grass', name: 'Plains' },
            forest: { symbol: '♠', className: 'terrain-tree', name: 'Forest' },
            mountain: { symbol: '█', className: 'terrain-stone', name: 'Mountain' },
            foothills: { symbol: '▒', className: 'terrain-hills', name: 'Foothills' },
            river: { symbol: '~', className: 'terrain-water', name: 'River' },
            lake: { symbol: '▀', className: 'terrain-water', name: 'Lake' },
            trail: { symbol: '·', className: 'terrain-path', name: 'Trail' },
            road: { symbol: '═', className: 'terrain-road', name: 'Road' },
            building: { symbol: '▬', className: 'terrain-building', name: 'Building' },
            village: { symbol: '■', className: 'terrain-village', name: 'Village' },
            treasure: { symbol: '◆', className: 'terrain-gold', name: 'Treasure' },
            unknown: { symbol: '░', className: 'terrain-unknown', name: 'Unknown' }
        };
        
        // World boundaries
        this.worldBounds = {
            minX: -200,
            maxX: 200,
            minY: -200,
            maxY: 200
        };
        
        // World features (like the reference game)
        this.villages = [];
        this.roads = [];
        this.rivers = [];
        this.mountainRanges = [];
        this.lakes = [];
        this.forests = [];
        this.trails = [];
        this.interiors = new Map(); // Building interiors
        
        // Cache for generated cells with discovery system
        this.world = new Map();
        this.frameCount = 0;
        this.gridWidth = 1;
        this.gridHeight = 1;
        
        // Generate world features around world center (0,0)
        this.generateWorldFeatures();
    }
    
    getWorldKey(x, y) {
        return `${x},${y}`;
    }
    
    generateWorldFeatures() {
        this.generateVillages();
        this.generateRoadNetwork();
        this.generateMountainRanges();
        this.generateRiverSystem();
        this.generateLakes();
        this.generateForests();
        this.generateTrailNetwork();
    }
    
    generateVillages() {
        const villageSpacing = 80; // Smaller world, closer villages
        
        for (let chunkY = -2; chunkY <= 2; chunkY++) {
            for (let chunkX = -2; chunkX <= 2; chunkX++) {
                if (this.seededRandom(chunkX * 1000 + chunkY, 1000) < 0.7) {
                    const baseX = chunkX * villageSpacing;
                    const baseY = chunkY * villageSpacing;
                    
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
    
    generateMountainRanges() {
        const numRanges = 2;
        
        for (let i = 0; i < numRanges; i++) {
            const centerX = (this.seededRandom(i * 1000, 1000) - 0.5) * 300;
            const centerY = (this.seededRandom(i * 2000, 1000) - 0.5) * 300;
            
            const length = 100 + this.seededRandom(i * 3000, 1000) * 100;
            const angle = this.seededRandom(i * 4000, 1000) * Math.PI * 2;
            
            this.mountainRanges.push({
                centerX: centerX,
                centerY: centerY,
                length: length,
                angle: angle,
                width: 25 + this.seededRandom(i * 5000, 1000) * 20
            });
        }
    }
    
    generateRiverSystem() {
        // Main river flowing through center
        this.rivers.push({
            points: this.generateRiverPath(-150, -80, 150, 100, 0)
        });
        
        // Secondary river
        this.rivers.push({
            points: this.generateRiverPath(60, -120, -80, 140, 1)
        });
        
        // Smaller tributary
        this.rivers.push({
            points: this.generateRiverPath(-50, 120, 100, 80, 2)
        });
    }
    
    generateRiverPath(startX, startY, endX, endY, seed) {
        const points = [];
        const segments = Math.floor(Math.abs(endX - startX) + Math.abs(endY - startY)) / 8;
        
        for (let i = 0; i <= segments; i++) {
            const progress = i / segments;
            const baseX = startX + (endX - startX) * progress;
            const baseY = startY + (endY - startY) * progress;
            
            const meander1 = Math.sin(progress * Math.PI * 3 + seed) * 15;
            const meander2 = Math.sin(progress * Math.PI * 6 + seed * 2) * 6;
            const totalMeander = meander1 + meander2;
            
            const perpAngle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
            
            points.push({
                x: Math.floor(baseX + Math.cos(perpAngle) * totalMeander),
                y: Math.floor(baseY + Math.sin(perpAngle) * totalMeander)
            });
        }
        
        return points;
    }
    
    generateLakes() {
        this.lakes.push({ x: 80, y: -60, radius: 12 });
        this.lakes.push({ x: -70, y: 90, radius: 15 });
        this.lakes.push({ x: 120, y: 40, radius: 8 });
    }
    
    generateForests() {
        const forestAreas = [
            {
                centerX: -80, centerY: -100,
                width: 60, height: 80,
                density: 0.8, type: 'dense'
            },
            {
                centerX: 120, centerY: 80,
                width: 50, height: 60,
                density: 0.7, type: 'mixed'
            },
            {
                centerX: 20, centerY: -70,
                width: 30, height: 25,
                density: 0.6, type: 'grove'
            },
            {
                centerX: -60, centerY: 90,
                width: 70, height: 45,
                density: 0.5, type: 'scattered'
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
    
    // Building interior generation (like reference game)
    generateBuildingInterior(buildingX, buildingY, village) {
        const buildingKey = `${buildingX},${buildingY}`;
        
        const distFromVillageCenter = Math.abs(buildingX - village.x) + Math.abs(buildingY - village.y);
        const buildingType = this.determineBuildingType(distFromVillageCenter, village);
        
        const interior = this.createInteriorLayout(buildingType, buildingX, buildingY);
        
        this.interiors.set(buildingKey, {
            type: buildingType,
            layout: interior,
            entrance: { x: buildingX, y: buildingY },
            village: village.name
        });
    }
    
    determineBuildingType(distance, village) {
        const rand = this.seededRandom(village.x * 100 + village.y + distance * 1000, 1000);
        
        if (distance === 0) {
            return 'inn';
        } else if (distance === 1) {
            if (rand < 0.4) return 'shop';
            if (rand < 0.6) return 'inn';
            if (rand < 0.8) return 'workshop';
            return 'house';
        } else {
            if (rand < 0.2) return 'workshop';
            if (rand < 0.35) return 'storage';
            if (rand < 0.45) return 'shop';
            return 'house';
        }
    }
    
    createInteriorLayout(type, buildingX, buildingY) {
        const layout = new Map();
        let width, height;
        
        switch (type) {
            case 'inn': width = 12; height = 8; break;
            case 'shop': width = 10; height = 7; break;
            case 'workshop': width = 10; height = 8; break;
            case 'storage': width = 8; height = 6; break;
            default: width = 8; height = 6; // house
        }
        
        // Fill with floor
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                layout.set(`${x},${y}`, {
                    terrain: 'floor',
                    walkable: true,
                    entity: null
                });
            }
        }
        
        // Add walls
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x === 0 || x === width-1 || y === 0 || y === height-1) {
                    layout.set(`${x},${y}`, {
                        terrain: 'wall',
                        walkable: false,
                        entity: null
                    });
                }
            }
        }
        
        // Add door
        const doorX = Math.floor(width / 2);
        layout.set(`${doorX},${height-1}`, {
            terrain: 'door',
            walkable: true,
            entity: null
        });
        
        return { layout, width, height };
    }
    
    seededRandom(seed, range = 1000) {
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x));
    }
    
    // World boundary methods
    isValidPosition(x, y) {
        return x >= this.worldBounds.minX && x <= this.worldBounds.maxX &&
               y >= this.worldBounds.minY && y <= this.worldBounds.maxY;
    }
    
    getWorldBounds() {
        return { ...this.worldBounds };
    }
    
    setWorldBounds(minX, maxX, minY, maxY) {
        this.worldBounds = { minX, maxX, minY, maxY };
    }
    
    isAtWorldBoundary(x, y) {
        return x <= this.worldBounds.minX || x >= this.worldBounds.maxX ||
               y <= this.worldBounds.minY || y >= this.worldBounds.maxY;
    }
    
    // Main terrain generation (like reference game)
    getTerrainAt(x, y) {
        if (!this.isValidPosition(x, y)) {
            return this.terrainTypes.unknown;
        }
        
        const key = this.getWorldKey(x, y);
        if (!this.world.has(key)) {
            this.generateCell(x, y);
        }
        return this.world.get(key);
    }
    
    generateCell(x, y) {
        const key = this.getWorldKey(x, y);
        let terrain = 'plains';
        let walkable = true;
        let entity = null;
        let isRoad = false;
        let waterData = null;
        
        // Check village first (like reference)
        const village = this.villages.find(v => {
            const dist = Math.abs(v.x - x) + Math.abs(v.y - y);
            return dist <= v.size;
        });
        
        if (village) {
            const distFromCenter = Math.abs(village.x - x) + Math.abs(village.y - y);
            if (distFromCenter === 0) {
                terrain = 'village';
                walkable = false;
            } else if (distFromCenter <= 2 && this.seededRandom(x * 1000 + y, 1000) < 0.6) {
                terrain = 'building';
                walkable = false;
                this.generateBuildingInterior(x, y, village);
            } else {
                terrain = 'plains';
                walkable = true;
            }
        }
        // Check roads
        else if (this.isOnRoad(x, y)) {
            terrain = 'road';
            walkable = true;
            isRoad = true;
        }
        // Check rivers
        else if (this.isOnRiver(x, y)) {
            terrain = 'river';
            walkable = false;
            waterData = this.getRiverFlowData(x, y);
        }
        // Check lakes
        else if (this.isInLake(x, y)) {
            terrain = 'lake';
            walkable = false;
            waterData = this.getLakeWaterData(x, y);
        }
        // Check mountains
        else if (this.isInMountains(x, y)) {
            const mountainLevel = this.getMountainLevel(x, y);
            if (mountainLevel > 0.7) {
                terrain = 'mountain';
                walkable = false;
            } else if (mountainLevel > 0.3) {
                terrain = 'foothills';
                walkable = true;
            } else {
                terrain = 'plains';
                walkable = true;
            }
        }
        // Check forests (with complex walkability like reference)
        else if (this.isInForest(x, y) && !isRoad) {
            const forestData = this.getForestData(x, y);
            if (forestData) {
                terrain = 'forest';
                walkable = forestData.walkable;
            }
        }
        // Check trails
        else if (this.isOnTrail(x, y)) {
            terrain = 'trail';
            walkable = true;
        }
        
        // Add treasures (like reference)
        if (walkable && !isRoad && !village && this.seededRandom(x * 2000 + y * 3000, 10000) < 0.00000005) {
            entity = 'treasure';
        }
        
        const cell = {
            terrain: terrain,
            walkable: walkable,
            entity: entity,
            discovered: false, // Discovery system like reference
            waterData: waterData
        };
        
        this.world.set(key, cell);
        return cell;
    }
    
    // Terrain checking methods (like reference game)
    isOnRoad(x, y) {
        return this.roads.some(road => {
            return this.isPointOnPath(x, y, road.waypoints, 1);
        });
    }
    
    isOnRiver(x, y) {
        return this.rivers.some(river => {
            return this.isPointOnPath(x, y, river.points, 1);
        });
    }
    
    isInLake(x, y) {
        return this.lakes.some(lake => {
            const dist = Math.sqrt((x - lake.x) ** 2 + (y - lake.y) ** 2);
            return dist <= lake.radius;
        });
    }
    
    isInMountains(x, y) {
        return this.getMountainLevel(x, y) > 0.1;
    }
    
    getMountainLevel(x, y) {
        let maxLevel = 0;
        
        this.mountainRanges.forEach(range => {
            const dx = x - range.centerX;
            const dy = y - range.centerY;
            
            const rotatedX = dx * Math.cos(-range.angle) - dy * Math.sin(-range.angle);
            const rotatedY = dx * Math.sin(-range.angle) + dy * Math.cos(-range.angle);
            
            if (Math.abs(rotatedX) <= range.length / 2) {
                const distFromSpine = Math.abs(rotatedY);
                const level = Math.max(0, 1 - (distFromSpine / range.width));
                maxLevel = Math.max(maxLevel, level);
            }
        });
        
        return maxLevel;
    }
    
    isInForest(x, y) {
        return this.forests.some(forest => {
            const dx = x - forest.centerX;
            const dy = y - forest.centerY;
            
            const normalizedDx = dx / (forest.width / 2);
            const normalizedDy = dy / (forest.height / 2);
            const distance = Math.sqrt(normalizedDx * normalizedDx + normalizedDy * normalizedDy);
            
            if (distance <= 1) {
                const inClearing = forest.clearings.some(clearing => {
                    const clearingDist = Math.sqrt((x - clearing.x) ** 2 + (y - clearing.y) ** 2);
                    return clearingDist <= clearing.radius;
                });
                return !inClearing;
            }
            return false;
        });
    }
    
    getForestData(x, y) {
        for (const forest of this.forests) {
            const dx = x - forest.centerX;
            const dy = y - forest.centerY;
            
            const normalizedDx = dx / (forest.width / 2);
            const normalizedDy = dy / (forest.height / 2);
            const distance = Math.sqrt(normalizedDx * normalizedDx + normalizedDy * normalizedDy);
            
            if (distance <= 1) {
                const inClearing = forest.clearings.some(clearing => {
                    const clearingDist = Math.sqrt((x - clearing.x) ** 2 + (y - clearing.y) ** 2);
                    return clearingDist <= clearing.radius;
                });
                
                if (inClearing) continue;
                
                let baseDensity = forest.density;
                const edgeEffect = Math.max(0, 1 - (distance * 1.2));
                let adjustedDensity = baseDensity * edgeEffect;
                
                const variation = this.seededRandom(x * 100 + y * 200, 1000) * 0.3;
                adjustedDensity += variation - 0.15;
                
                // Forest type effects
                switch (forest.type) {
                    case 'dense': adjustedDensity *= 1.2; break;
                    case 'grove': adjustedDensity *= 0.8; break;
                    case 'scattered': adjustedDensity *= 0.6; break;
                }
                
                // Determine walkability based on density
                let walkable = true;
                if (adjustedDensity > 0.9) {
                    walkable = false;
                } else if (adjustedDensity > 0.7) {
                    walkable = this.seededRandom(x * 300 + y * 400, 1000) > 0.3;
                } else if (adjustedDensity > 0.5) {
                    walkable = this.seededRandom(x * 500 + y * 600, 1000) > 0.1;
                }
                
                return {
                    type: forest.type,
                    density: Math.max(0, Math.min(1, adjustedDensity)),
                    walkable: walkable,
                    distanceFromCenter: distance
                };
            }
        }
        return null;
    }
    
    isOnTrail(x, y) {
        return this.trails.some(trail => {
            return this.isPointOnPath(x, y, trail.points, 1);
        });
    }
    
    isPointOnPath(x, y, waypoints, tolerance) {
        for (let i = 0; i < waypoints.length - 1; i++) {
            const start = waypoints[i];
            const end = waypoints[i + 1];
            
            if (this.distanceToLineSegment(x, y, start.x, start.y, end.x, end.y) <= tolerance) {
                return true;
            }
        }
        return false;
    }
    
    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    }
    
    // Water animation system (like reference)
    getRiverFlowData(x, y) {
        for (let riverIndex = 0; riverIndex < this.rivers.length; riverIndex++) {
            const river = this.rivers[riverIndex];
            
            let closestPoint = null;
            let closestDistance = Infinity;
            let pointIndex = -1;
            
            for (let i = 0; i < river.points.length; i++) {
                const point = river.points[i];
                const distance = Math.abs(point.x - x) + Math.abs(point.y - y);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPoint = point;
                    pointIndex = i;
                }
            }
            
            if (closestDistance <= 1) {
                let flowX = 0, flowY = 0;
                if (pointIndex < river.points.length - 1) {
                    const nextPoint = river.points[pointIndex + 1];
                    flowX = nextPoint.x - closestPoint.x;
                    flowY = nextPoint.y - closestPoint.y;
                }
                
                const magnitude = Math.sqrt(flowX * flowX + flowY * flowY);
                if (magnitude > 0) {
                    flowX /= magnitude;
                    flowY /= magnitude;
                }
                                    
                    return {
                   type: 'river',
                   flowX: flowX,
                   flowY: flowY,
                   speed: 1.0,
                   riverIndex: riverIndex,
                   pointIndex: pointIndex
               };
           }
       }
       return null;
   }
   
   getLakeWaterData(x, y) {
       for (let lakeIndex = 0; lakeIndex < this.lakes.length; lakeIndex++) {
           const lake = this.lakes[lakeIndex];
           const distance = Math.sqrt((x - lake.x) ** 2 + (y - lake.y) ** 2);
           
           if (distance <= lake.radius) {
               const edgeDistance = distance / lake.radius;
               
               let speed = 0;
               if (edgeDistance < 0.3) {
                   speed = 0.1; // Gentle thermal currents
               } else if (edgeDistance > 0.8) {
                   speed = 0.05; // Wind-driven movement near shore
               }
               
               const angle = this.seededRandom(x * 500 + y * 700, 1000) * Math.PI * 2;
               const flowX = Math.cos(angle) * speed;
               const flowY = Math.sin(angle) * speed;
               
               return {
                   type: 'lake',
                   flowX: flowX,
                   flowY: flowY,
                   speed: speed,
                   lakeIndex: lakeIndex,
                   edgeDistance: edgeDistance
               };
           }
       }
       return null;
   }
   
   // Water symbol animation (like reference)
   getWaterSymbol(x, y, cell) {
       if (!cell.waterData) return '▀';
       
       const waterData = cell.waterData;
       const time = this.frameCount * 0.1;
       
       if (waterData.type === 'river') {
           const animationOffset = (x + y + time) % 3;
           
           if (animationOffset < 2.4) {
               return '~';
           } else {
               return '▀';
           }
       } else if (waterData.type === 'lake') {
           const stillnessChance = waterData.speed < 0.01 ? 0.95 : (0.85 + waterData.edgeDistance * 0.1);
           const animationOffset = (x * 0.3 + y * 0.4 + time * 0.2) % 1;
           
           if (animationOffset < stillnessChance) {
               return '▀'; // Still water
           } else {
               return '~'; // Gentle movement
           }
       }
       
       return '▀';
   }
   
   // Road symbol generation (like reference)
   getRoadSymbol(x, y) {
       const hasNorth = this.isOnRoad(x, y - 1);
       const hasSouth = this.isOnRoad(x, y + 1);
       const hasEast = this.isOnRoad(x + 1, y);
       const hasWest = this.isOnRoad(x - 1, y);
       
       const connections = [hasNorth, hasSouth, hasEast, hasWest].filter(Boolean).length;
       
       if (connections >= 3) return '╬'; // road_cross
       if (hasNorth && hasSouth) return '║'; // road_ns
       if (hasEast && hasWest) return '═'; // road_ew
       
       if ((hasNorth && hasEast) || (hasSouth && hasWest)) return '╚';
       if ((hasNorth && hasWest) || (hasSouth && hasEast)) return '╗';
       
       return '═';
   }
   
   // Discovery system (like reference)
   discoverArea(centerX, centerY) {
       const radius = 8;
       for (let y = centerY - radius; y <= centerY + radius; y++) {
           for (let x = centerX - radius; x <= centerX + radius; x++) {
               const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
               if (distance <= radius) {
                   const cell = this.getTerrainAt(x, y);
                   if (!cell.discovered) {
                       cell.discovered = true;
                   }
               }
           }
       }
   }
   
   // Rendering method with animation support
   renderTerrain(gameArea, cameraStartX, cameraStartY, viewWidth, viewHeight, playerX, playerY) {
       this.frameCount++;
       let display = '';
       
       // Discover area around player
       this.discoverArea(playerX, playerY);
       
       for (let viewY = 0; viewY < viewHeight; viewY++) {
           for (let viewX = 0; viewX < viewWidth; viewX++) {
               const worldX = cameraStartX + viewX;
               const worldY = cameraStartY + viewY;
               
               let symbol = '░';
               let className = 'symbol terrain-unknown';
               
               if (worldX === playerX && worldY === playerY) {
                   symbol = '◊';
                   className = 'symbol player';
               } else {
                   const cell = this.getTerrainAt(worldX, worldY);
                   
                   if (cell.discovered) {
                       if (cell.entity === 'treasure') {
                           symbol = this.terrainTypes.treasure.symbol;
                           className = `symbol ${this.terrainTypes.treasure.className}`;
                       } else {
                           // Handle special rendering for roads and water
                           if (cell.terrain === 'road') {
                               symbol = this.getRoadSymbol(worldX, worldY);
                               className = `symbol ${this.terrainTypes.road.className}`;
                           } else if (cell.terrain === 'river' || cell.terrain === 'lake') {
                               symbol = this.getWaterSymbol(worldX, worldY, cell);
                               className = `symbol ${this.terrainTypes[cell.terrain].className}`;
                           } else {
                               const terrainData = this.terrainTypes[cell.terrain] || this.terrainTypes.plains;
                               symbol = terrainData.symbol;
                               className = `symbol ${terrainData.className}`;
                           }
                       }
                   } else {
                       // Undiscovered areas
                       symbol = '░';
                       className = 'symbol terrain-unknown';
                   }
               }
               
               display += `<span class="${className}">${symbol}</span>`;
           }
           display += '\n';
       }
       
       gameArea.innerHTML = display;
   }
   
   getViewDimensions(gameArea) {
       const rect = gameArea.getBoundingClientRect();
       return {
           width: Math.floor(rect.width / 8.4),
           height: Math.floor(rect.height / 14)
       };
   }
   
   // Access methods for world features
   getVillages() {
       return this.villages;
   }
   
   getRoads() {
       return this.roads;
   }
   
   getInteriors() {
       return this.interiors;
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
           interiors: this.interiors
       };
   }
}