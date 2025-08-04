// === TERRAIN CLASSIFIER MODULE ===
// File: terrain-classifier.js
class TerrainClassifier {
    constructor(worldFeatures) {
        this.worldFeatures = worldFeatures;
    }
    
    classifyTerrain(x, y) {
        // Check in priority order
        if (this.isVillage(x, y)) return 'village';
        if (this.isBuilding(x, y)) return 'building';
        if (this.isOnRoad(x, y)) return 'road';
        if (this.isOnRiver(x, y)) return 'river';
        if (this.isInLake(x, y)) return 'lake';
        if (this.isHighMountain(x, y)) return 'mountain';
        if (this.isFoothills(x, y)) return 'foothills';
        if (this.isInForest(x, y)) return 'forest';
        if (this.isOnTrail(x, y)) return 'trail';
        
        return 'plains';
    }
    
    isVillage(x, y) {
        const village = this.worldFeatures.villages.find(v => {
            const dist = Math.abs(v.x - x) + Math.abs(v.y - y);
            return dist <= v.size;
        });
        
        if (village) {
            const distFromCenter = Math.abs(village.x - x) + Math.abs(village.y - y);
            return distFromCenter === 0;
        }
        return false;
    }
    
    isBuilding(x, y) {
        const village = this.worldFeatures.villages.find(v => {
            const dist = Math.abs(v.x - x) + Math.abs(v.y - y);
            return dist <= v.size;
        });
        
        if (village) {
            const distFromCenter = Math.abs(village.x - x) + Math.abs(village.y - y);
            return distFromCenter > 0 && distFromCenter <= 2 && 
                   this.seededRandom(x * 1000 + y, 1000) < 0.6;
        }
        return false;
    }
    
    isOnRoad(x, y) {
        return this.worldFeatures.roads.some(road => {
            return this.isPointOnPath(x, y, road.waypoints, 1);
        });
    }
    
    isOnRiver(x, y) {
        return this.worldFeatures.rivers.some(river => {
            return this.isPointOnPath(x, y, river.points, 1);
        });
    }
    
    isInLake(x, y) {
        return this.worldFeatures.lakes.some(lake => {
            const dist = Math.sqrt((x - lake.x) ** 2 + (y - lake.y) ** 2);
            return dist <= lake.radius;
        });
    }
    
    isHighMountain(x, y) {
        return this.getMountainLevel(x, y) > 0.7;
    }
    
    isFoothills(x, y) {
        const level = this.getMountainLevel(x, y);
        return level > 0.3 && level <= 0.7;
    }
    
    getMountainLevel(x, y) {
        let maxLevel = 0;
        
        this.worldFeatures.mountainRanges.forEach(range => {
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
        return this.worldFeatures.forests.some(forest => {
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
    
    isOnTrail(x, y) {
        return this.worldFeatures.trails.some(trail => {
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
    
    seededRandom(seed, range = 1000) {
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x));
    }
}