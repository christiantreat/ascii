// === SIMPLE TERRAIN CLASSIFIER ===
// File: src/systems/simple-terrain-classifier.js

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
        
        // Otherwise, determine based on simple conditions
        const elevation = this.worldGenerator.getElevationAt(x, y);
        const water = this.worldGenerator.getWaterAt(x, y);
        
        // Water takes precedence
        if (water.hasWater) {
            const hydrologyData = this.worldGenerator.getModuleData('hydrology');
            if (hydrologyData) {
                // Check if position is on a river
                const isOnRiver = hydrologyData.rivers.some(river => 
                    river.path.some(point => 
                        Math.abs(point.x - x) <= 1 && Math.abs(point.y - y) <= 1
                    )
                );
                
                if (isOnRiver) return 'river';
                
                // Check if position is in a lake
                const isInLake = hydrologyData.lakes.some(lake => {
                    const distance = Math.sqrt((lake.x - x) ** 2 + (lake.y - y) ** 2);
                    return distance <= lake.radius;
                });
                
                if (isInLake) return 'lake';
            }
            
            // Default water type
            return 'lake';
        }
        
        // Elevation-based terrain (simple)
        if (elevation >= 0.35) {
            return 'foothills'; // Hills show as foothills
        }
        
        // Default to plains
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
        return elevation >= 0.35;
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