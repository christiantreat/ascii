// === ELEVATION-AWARE TERRAIN CLASSIFIER MODULE ===
// File: terrain-classifier.js
class TerrainClassifier {
    constructor(worldFeatures, elevationData = null) {
        this.worldFeatures = worldFeatures;
        this.elevationData = elevationData;
    }
    
    classifyTerrain(x, y) {
        // Get elevation for this location
        const elevation = this.elevationData ? this.elevationData.getElevation(x, y) : 0.3;
        
        // Check special features first (highest priority)
        if (this.isVillage(x, y)) return 'village';
        if (this.isBuilding(x, y)) return 'building';
        
        // Check infrastructure
        if (this.isOnRoad(x, y)) return 'road';
        if (this.isOnTrail(x, y)) return 'trail';
        
        // Check water features
        if (this.isOnRiver(x, y)) return 'river';
        if (this.isInLake(x, y)) return 'lake';
        
        // Elevation-based terrain classification
        if (elevation <= 0.15) {
            // Very low elevation - water or wetlands
            return this.isNearWater(x, y) ? 'lake' : 'plains';
        } else if (elevation <= 0.25) {
            // Low elevation - plains, possibly with water influence
            if (this.isNearWater(x, y)) {
                return this.seededRandom(x * 1337 + y, 1000) > 0.7 ? 'forest' : 'plains';
            }
            return 'plains';
        } else if (elevation <= 0.45) {
            // Medium-low elevation - mixed terrain
            if (this.isInForest(x, y)) return 'forest';
            return 'plains';
        } else if (elevation <= 0.65) {
            // Medium-high elevation - foothills
            if (this.isInForest(x, y)) return 'forest';
            return 'foothills';
        } else if (elevation <= 0.85) {
            // High elevation - mountains or high foothills
            return this.isHighMountain(x, y) ? 'mountain' : 'foothills';
        } else {
            // Very high elevation - mountains
            return 'mountain';
        }
    }
    
    // === WATER DETECTION ===
    isNearWater(x, y, radius = 15) {
        // Check rivers
        const nearRiver = this.worldFeatures.rivers.some(river => {
            return river.points.some(point => {
                const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
                return distance <= radius;
            });
        });
        
        if (nearRiver) return true;
        
        // Check lakes
        const nearLake = this.worldFeatures.lakes.some(lake => {
            const distance = Math.sqrt((x - lake.x) ** 2 + (y - lake.y) ** 2);
            return distance <= (lake.radius + radius);
        });
        
        return nearLake;
    }
    
    // === EXISTING METHODS (improved with elevation awareness) ===
    isVillage(x, y) {
        return this.worldFeatures.villages.some(v => {
            const dist = Math.abs(v.x - x) + Math.abs(v.y - y);
            return dist === 0;
        });
    }
    
    isBuilding(x, y) {
        return this.worldFeatures.villages.some(v => {
            const dist = Math.abs(v.x - x) + Math.abs(v.y - y);
            return dist > 0 && dist <= 2 && this.seededRandom(x * 1000 + y, 1000) < 0.6;
        });
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
        // Use elevation data if available, otherwise fall back to geometric method
        if (this.elevationData) {
            return this.elevationData.getElevation(x, y) > 0.75;
        }
        return this.getMountainLevel(x, y) > 0.7;
    }
    
    isFoothills(x, y) {
        // Use elevation data if available
        if (this.elevationData) {
            const elevation = this.elevationData.getElevation(x, y);
            return elevation > 0.45 && elevation <= 0.75;
        }
        
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
        // Enhanced forest detection with elevation consideration
        const inGeometricForest = this.worldFeatures.forests.some(forest => {
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
        
        if (inGeometricForest) return true;
        
        // Add procedural forests based on elevation and water proximity
        if (this.elevationData) {
            const elevation = this.elevationData.getElevation(x, y);
            const nearWater = this.isNearWater(x, y, 25);
            
            // Forests like medium elevations and being near (but not in) water
            if (elevation > 0.25 && elevation < 0.7 && nearWater) {
                const forestNoise = this.seededRandom(x * 0.01 + y * 0.01, 1000);
                return forestNoise > 0.6;
            }
        }
        
        return false;
    }
    
    isOnTrail(x, y) {
        return this.worldFeatures.trails.some(trail => {
            return this.isPointOnPath(x, y, trail.points, 1);
        });
    }
    
    // === UTILITY METHODS ===
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
    
    // === NEW TERRAIN ANALYSIS METHODS ===
    
    getTerrainTransition(x, y, radius = 2) {
        // Analyze surrounding terrain to create smooth transitions
        const centerTerrain = this.classifyTerrain(x, y);
        const surroundingTerrain = [];
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                if (dx === 0 && dy === 0) continue;
                surroundingTerrain.push(this.classifyTerrain(x + dx, y + dy));
            }
        }
        
        // Count terrain types in the area
        const terrainCounts = {};
        surroundingTerrain.forEach(terrain => {
            terrainCounts[terrain] = (terrainCounts[terrain] || 0) + 1;
        });
        
        return {
            centerTerrain,
            dominantSurrounding: Object.keys(terrainCounts).reduce((a, b) => 
                terrainCounts[a] > terrainCounts[b] ? a : b
            ),
            terrainCounts,
            isTransitionZone: Object.keys(terrainCounts).length > 2
        };
    }
    
    getElevationGradient(x, y, stepSize = 1) {
        // Calculate elevation gradient for terrain effects
        if (!this.elevationData) return { dx: 0, dy: 0, magnitude: 0 };
        
        const centerElevation = this.elevationData.getElevation(x, y);
        const eastElevation = this.elevationData.getElevation(x + stepSize, y);
        const northElevation = this.elevationData.getElevation(x, y - stepSize);
        
        const dx = eastElevation - centerElevation;
        const dy = centerElevation - northElevation; // Negative because Y increases downward
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        return { dx, dy, magnitude };
    }
    
    getSuitabilityScore(x, y, purpose) {
        // Evaluate how suitable a location is for different purposes
        const elevation = this.elevationData ? this.elevationData.getElevation(x, y) : 0.3;
        const nearWater = this.isNearWater(x, y);
        const gradient = this.getElevationGradient(x, y);
        
        switch (purpose) {
            case 'settlement':
                let score = 0;
                // Prefer flat areas
                if (gradient.magnitude < 0.1) score += 0.4;
                // Prefer medium elevation (not too low, not too high)
                if (elevation > 0.2 && elevation < 0.5) score += 0.3;
                // Strongly prefer near water
                if (nearWater) score += 0.4;
                // Avoid forests and mountains
                if (this.isInForest(x, y)) score -= 0.2;
                if (this.isHighMountain(x, y)) score -= 0.5;
                return Math.max(0, Math.min(1, score));
                
            case 'agriculture':
                let agScore = 0;
                // Prefer very flat areas
                if (gradient.magnitude < 0.05) agScore += 0.5;
                // Prefer low-medium elevation
                if (elevation > 0.15 && elevation < 0.4) agScore += 0.3;
                // Need water access
                if (nearWater) agScore += 0.3;
                // Avoid forests, mountains, and water
                if (this.isInForest(x, y) || this.isHighMountain(x, y) || this.isInLake(x, y)) agScore -= 0.4;
                return Math.max(0, Math.min(1, agScore));
                
            case 'defense':
                let defScore = 0;
                // Prefer higher elevation for visibility
                if (elevation > 0.4) defScore += 0.4;
                // Prefer some slope for defensive advantage
                if (gradient.magnitude > 0.1 && gradient.magnitude < 0.3) defScore += 0.3;
                // Good to be near water but not in it
                if (nearWater && !this.isInLake(x, y) && !this.isOnRiver(x, y)) defScore += 0.2;
                return Math.max(0, Math.min(1, defScore));
                
            default:
                return 0.5;
        }
    }
    
    // === CLIMATE AND ENVIRONMENT METHODS ===
    
    getMoistureLevel(x, y) {
        // Calculate moisture based on proximity to water and elevation
        let moisture = 0.3; // Base moisture
        
        // Water sources add moisture
        this.worldFeatures.rivers.forEach(river => {
            const minDistance = Math.min(...river.points.map(point => 
                Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2)
            ));
            if (minDistance < 50) {
                moisture += Math.max(0, 0.4 * (1 - minDistance / 50));
            }
        });
        
        this.worldFeatures.lakes.forEach(lake => {
            const distance = Math.sqrt((x - lake.x) ** 2 + (y - lake.y) ** 2);
            if (distance < lake.radius + 30) {
                moisture += Math.max(0, 0.3 * (1 - distance / (lake.radius + 30)));
            }
        });
        
        // Higher elevation tends to be drier (rain shadow effect)
        if (this.elevationData) {
            const elevation = this.elevationData.getElevation(x, y);
            if (elevation > 0.6) {
                moisture *= (1 - (elevation - 0.6) * 0.5);
            }
        }
        
        return Math.max(0, Math.min(1, moisture));
    }
    
    getTemperature(x, y) {
        // Simple temperature model based on elevation
        let temperature = 0.7; // Base temperature (temperate)
        
        if (this.elevationData) {
            const elevation = this.elevationData.getElevation(x, y);
            // Temperature decreases with elevation
            temperature -= elevation * 0.4;
        }
        
        return Math.max(0, Math.min(1, temperature));
    }
}