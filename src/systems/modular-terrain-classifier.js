// === MODULAR TERRAIN CLASSIFIER ===
// File: src/systems/modular-terrain-classifier.js

class ModularTerrainClassifier {
    constructor(worldGenerator) {
        this.worldGenerator = worldGenerator;
    }
    
    classifyTerrain(x, y) {
        // Use the modular world generator to determine terrain
        const terrainData = this.worldGenerator.getTerrainAt(x, y);
        
        // If modules provided a terrain type, use it
        if (terrainData.terrain && terrainData.terrain !== 'plains') {
            return terrainData.terrain;
        }
        
        // Otherwise, determine based on conditions
        const elevation = this.worldGenerator.getElevationAt(x, y);
        const water = this.worldGenerator.getWaterAt(x, y);
        const vegetation = this.worldGenerator.getVegetationAt(x, y);
        
        // Water takes precedence
        if (water.hasWater) {
            // Check if it's a river or lake based on flow/size
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
        
        // Check for wetlands
        if (water.nearWater && water.moistureLevel > 0.7 && elevation < 0.3) {
            return 'wetland'; // You'll need to add this terrain type
        }
        
        // Elevation-based terrain
        if (elevation >= 0.75) {
            return 'mountain';
        } else if (elevation >= 0.45) {
            return 'foothills';
        }
        
        // Vegetation-based terrain
        if (vegetation.type === 'forest') {
            return 'forest';
        } else if (vegetation.type === 'desert') {
            return 'desert'; // You'll need to add this terrain type
        }
        
        // Default to plains
        return 'plains';
    }
    
    // Legacy compatibility methods
    isVillage(x, y) {
        // Will be implemented when settlement module is added
        return false;
    }
    
    isBuilding(x, y) {
        // Will be implemented when settlement module is added
        return false;
    }
    
    isOnRoad(x, y) {
        // Will be implemented when infrastructure module is added
        return false;
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
    
    isHighMountain(x, y) {
        const elevation = this.worldGenerator.getElevationAt(x, y);
        return elevation >= 0.75;
    }
    
    isFoothills(x, y) {
        const elevation = this.worldGenerator.getElevationAt(x, y);
        return elevation >= 0.45 && elevation < 0.75;
    }
    
    isInForest(x, y) {
        const vegetation = this.worldGenerator.getVegetationAt(x, y);
        return vegetation.type === 'forest';
    }
    
    isOnTrail(x, y) {
        // Will be implemented when infrastructure module is added
        return false;
    }
    
    // Enhanced methods for modular system
    getMoistureLevel(x, y) {
        const water = this.worldGenerator.getWaterAt(x, y);
        return water.moistureLevel;
    }
    
    getTemperature(x, y) {
        const elevation = this.worldGenerator.getElevationAt(x, y);
        // Simple temperature model - decreases with elevation
        return Math.max(0, Math.min(1, 0.7 - elevation * 0.4));
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