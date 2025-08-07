// === FIXED TERRAIN CLASSIFICATION ===
// File: src/systems/simple-terrain-classifier.js
// COMPLETE REPLACEMENT - Restores foothills/dirt while adding rocky terrain

class SimpleTerrainClassifier {
    constructor(worldGenerator) {
        this.worldGenerator = worldGenerator;
    }
    
    classifyTerrain(x, y) {
        // Use the simple world generator to determine terrain
        const terrainData = this.worldGenerator.getTerrainAt(x, y);
        
        // If modules provided a terrain type, use it
        if (terrainData.terrain && terrainData.terrain !== 'plains') {
            return terrainData.terrain;
        }
        
        // Get elevation and rock type for classification
        const elevation = this.worldGenerator.getElevationAt(x, y);
        const rockType = this.worldGenerator.getRockTypeAt ? this.worldGenerator.getRockTypeAt(x, y) : 'soft';
        const water = this.worldGenerator.getWaterAt(x, y);
        
        // Water takes precedence
        if (water.hasWater) {
            const hydrologyData = this.worldGenerator.getModuleData('hydrology');
            if (hydrologyData) {
                const isOnRiver = hydrologyData.rivers.some(river => 
                    river.path.some(point => 
                        Math.abs(point.x - x) <= 1 && Math.abs(point.y - y) <= 1
                    )
                );
                
                if (isOnRiver) return 'river';
                
                const isInLake = hydrologyData.lakes.some(lake => {
                    const distance = Math.sqrt((lake.x - x) ** 2 + (lake.y - y) ** 2);
                    return distance <= lake.radius;
                });
                
                if (isInLake) return 'lake';
            }
            
            return 'lake';
        }
        
        // FIXED: Terrain classification that preserves foothills/dirt
        
        // Very high elevation with hard rock = boulders (grey)
        if (rockType === 'hard' && elevation > 0.7) {
            return 'boulders';
        }
        
        // High elevation with hard rock = rocky ground (grey) 
        if (rockType === 'hard' && elevation > 0.55) {
            return 'rocks';
        }
        
        // Medium-high elevation (regardless of rock type) = foothills (brown dirt)
        if (elevation > 0.4) {
            return 'foothills';
        }
        
        // Lower elevation with hard rock = stone outcrops (grey)
        if (rockType === 'hard' && elevation > 0.25) {
            return 'stone';
        }
        
        // Medium elevation (soft rock) = foothills (brown dirt)
        if (elevation > 0.3) {
            return 'foothills';
        }
        
        // Default to plains (green grass)
        return 'plains';
    }
    
    // Legacy compatibility methods (simplified)
    isVillage(x, y) {
        return false; // No villages in simple version
    }
    
    isBuilding(x, y) {
        return false; // No buildings in simple version
    }
    
    isOnRoad(x, y) {
        return false; // No roads in simple version
    }
    
    isOnRiver(x, y) {
        const water = this.worldGenerator.getWaterAt(x, y);
        if (!water.hasWater) return false;
        
        const hydrologyData = this.worldGenerator.getModuleData('hydrology');
        if (!hydrologyData) return false;
        
        return hydrologyData.rivers.some(river => 
            river.path.some(point => 
                Math.abs(point.x - x) <= 1 && Math.abs(point.y - y) <= 1
            )
        );
    }
    
    isInLake(x, y) {
        const water = this.worldGenerator.getWaterAt(x, y);
        if (!water.hasWater) return false;
        
        const hydrologyData = this.worldGenerator.getModuleData('hydrology');
        if (!hydrologyData) return false;
        
        return hydrologyData.lakes.some(lake => {
            const distance = Math.sqrt((lake.x - x) ** 2 + (lake.y - y) ** 2);
            return distance <= lake.radius;
        });
    }
    
    isFoothills(x, y) {
        const elevation = this.worldGenerator.getElevationAt(x, y);
        return elevation >= 0.3; // Lowered threshold to show more foothills
    }
    
    isInForest(x, y) {
        return false; // No forests in simple version
    }
    
    isOnTrail(x, y) {
        return false; // No trails in simple version
    }
    
    // Enhanced methods for simple system
    getMoistureLevel(x, y) {
        const water = this.worldGenerator.getWaterAt(x, y);
        return water.moistureLevel;
    }
    
    getTemperature(x, y) {
        const elevation = this.worldGenerator.getElevationAt(x, y);
        // Simple temperature model - decreases slightly with elevation
        return Math.max(0.3, Math.min(1, 0.7 - elevation * 0.2));
    }
    
    getSuitabilityScore(x, y, purpose) {
        const analysis = this.worldGenerator.analyzePosition(x, y);
        return analysis.suitability[purpose] || 0;
    }
    
    getTerrainAnalysis(x, y) {
        return this.worldGenerator.analyzePosition(x, y);
    }
    
    // Utility methods
    seededRandom(seed, range = 1000) {
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x));
    }
}