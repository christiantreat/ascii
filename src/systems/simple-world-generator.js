// === SIMPLE MODULAR WORLD GENERATOR ===
// File: src/systems/simple-world-generator.js

class SimpleWorldGenerator {
    constructor(config = {}) {
        this.worldContext = new WorldContext(config);
        this.setupSimpleModules();
    }
    
    setupSimpleModules() {
        // Only create the simple modules we want
        
        // 1. Elevation (scattered hills)
        const elevationModule = new ElevationModule({
            hillCount: 6,           // Not too many hills
            minHillRadius: 20,      
            maxHillRadius: 35,      
            minHillHeight: 0.25,    
            maxHillHeight: 0.5,     // Keep hills moderate
            hillSpacing: 40,        
            baseElevation: 0.15,    
            smoothing: true,
            noiseAmount: 0.03       // Small amount of variation
        });
        this.worldContext.addModule(elevationModule);
        
        // 2. Hydrology (simple rivers and lakes)
        const hydrologyModule = new HydrologyModule({
            riverCount: 3,          // A few rivers
            lakeCount: 4,           // Several lakes
            minLakeRadius: 8,
            maxLakeRadius: 12,
            lakeSpacing: 60
        });
        this.worldContext.addModule(hydrologyModule);
    }
    
    // Configuration methods
    configureElevation(config) {
        const module = this.worldContext.getModule('elevation');
        if (module) {
            module.updateConfig(config);
        }
        return this;
    }
    
    configureHydrology(config) {
        const module = this.worldContext.getModule('hydrology');
        if (module) {
            module.updateConfig(config);
        }
        return this;
    }
    
    // Module management
    enableModule(moduleName) {
        const module = this.worldContext.getModule(moduleName);
        if (module) {
            module.enable();
            this.worldContext.updateGenerationOrder();
        }
        return this;
    }
    
    disableModule(moduleName) {
        const module = this.worldContext.getModule(moduleName);
        if (module) {
            module.disable();
            this.worldContext.updateGenerationOrder();
        }
        return this;
    }
    
    // Generation methods
    generateWorld(centerX = 0, centerY = 0) {
        this.worldContext.updateConfig({ centerX, centerY });
        this.worldContext.generateWorld();
        return this;
    }
    
    regenerateModule(moduleName) {
        const module = this.worldContext.getModule(moduleName);
        if (module && module.enabled) {
            console.log(`Regenerating ${moduleName} module...`);
            const result = module.generate(this.worldContext);
            this.worldContext.setModuleData(moduleName, result);
        }
        return this;
    }
    
    // Query methods
    getTerrainAt(x, y) {
        return this.worldContext.getTerrainAt(x, y);
    }
    
    getElevationAt(x, y) {
        const elevationModule = this.worldContext.getModule('elevation');
        return elevationModule ? elevationModule.getElevationAt(x, y) : 0.15;
    }
    
    getWaterAt(x, y) {
        const hydrologyModule = this.worldContext.getModule('hydrology');
        if (!hydrologyModule) return { hasWater: false, nearWater: false };
        
        return {
            hasWater: hydrologyModule.isWaterAt(x, y),
            nearWater: hydrologyModule.isNearWater(x, y),
            distanceToWater: hydrologyModule.getDistanceToWater(x, y),
            moistureLevel: hydrologyModule.getMoistureLevel(x, y)
        };
    }
    
    // Analysis methods
    analyzePosition(x, y) {
        const elevation = this.getElevationAt(x, y);
        const water = this.getWaterAt(x, y);
        const terrain = this.getTerrainAt(x, y);
        
        return {
            position: { x, y },
            elevation: elevation,
            water: water,
            terrain: terrain.terrain,
            features: terrain.features,
            suitability: this.calculateSuitabilityScores(x, y, elevation, water)
        };
    }
    
    calculateSuitabilityScores(x, y, elevation, water) {
        const scores = {};
        
        // Settlement suitability - prefer flat areas near water
        let settlementScore = 0;
        if (elevation > 0.12 && elevation < 0.3) settlementScore += 0.4; // Good elevation
        if (water.nearWater && !water.hasWater) settlementScore += 0.4; // Near but not in water
        if (elevation > 0.14) settlementScore += 0.2; // Above flood level
        scores.settlement = Math.max(0, Math.min(1, settlementScore));
        
        // Agriculture suitability - prefer very flat areas with water
        let agricultureScore = 0;
        if (elevation > 0.12 && elevation < 0.25) agricultureScore += 0.4; // Flat areas
        if (water.moistureLevel > 0.4) agricultureScore += 0.4; // Good water access
        if (!water.hasWater) agricultureScore += 0.2; // Not flooded
        scores.agriculture = Math.max(0, Math.min(1, agricultureScore));
        
        return scores;
    }
    
    // Data access methods
    getModuleData(moduleName) {
        return this.worldContext.getModuleData(moduleName);
    }
    
    getWorldFeatures() {
        const hydrologyData = this.getModuleData('hydrology');
        
        // Convert to legacy format for compatibility
        return {
            villages: [], // None for now
            roads: [], // None for now
            rivers: hydrologyData?.rivers || [],
            lakes: hydrologyData?.lakes || [],
            forests: [], // None for now
            mountainRanges: [], // None for simple version
            trails: [] // None for now
        };
    }
    
    // Quick configuration presets
    createRollingTerrain() {
        this.configureElevation({
            hillCount: 8,
            minHillRadius: 25,
            maxHillRadius: 45,
            minHillHeight: 0.2,
            maxHillHeight: 0.4,
            hillSpacing: 35
        });
        
        this.configureHydrology({
            riverCount: 4,
            lakeCount: 5
        });
        
        return this;
    }
    
    createFlatTerrain() {
        this.configureElevation({
            hillCount: 3,
            minHillRadius: 15,
            maxHillRadius: 25,
            minHillHeight: 0.18,
            maxHillHeight: 0.3,
            hillSpacing: 60
        });
        
        this.configureHydrology({
            riverCount: 2,
            lakeCount: 6
        });
        
        return this;
    }
    
    createHillyTerrain() {
        this.configureElevation({
            hillCount: 12,
            minHillRadius: 18,
            maxHillRadius: 35,
            minHillHeight: 0.25,
            maxHillHeight: 0.55,
            hillSpacing: 25
        });
        
        this.configureHydrology({
            riverCount: 5,
            lakeCount: 3
        });
        
        return this;
    }
    
    // Debug and testing methods
    getModuleStatus() {
        const modules = Array.from(this.worldContext.modules.values());
        return modules.map(module => ({
            name: module.name,
            enabled: module.enabled,
            priority: module.priority,
            dependencies: module.dependencies,
            config: module.config
        }));
    }
    
    exportConfiguration() {
        return {
            worldConfig: this.worldContext.config,
            modules: this.getModuleStatus()
        };
    }
    
    importConfiguration(config) {
        if (config.worldConfig) {
            this.worldContext.updateConfig(config.worldConfig);
        }
        
        if (config.modules) {
            config.modules.forEach(moduleConfig => {
                const module = this.worldContext.getModule(moduleConfig.name);
                if (module) {
                    module.updateConfig(moduleConfig.config);
                    if (moduleConfig.enabled !== undefined) {
                        if (moduleConfig.enabled) {
                            module.enable();
                        } else {
                            module.disable();
                        }
                    }
                }
            });
            this.worldContext.updateGenerationOrder();
        }
        
        return this;
    }
    
    // Utility methods
    getWorldBounds() {
        return this.worldContext.getWorldBounds();
    }
    
    isInBounds(x, y) {
        return this.worldContext.isInBounds(x, y);
    }
    
    setSeed(seed) {
        this.worldContext.updateConfig({ seed });
        return this;
    }
    
    setRegionSize(size) {
        this.worldContext.updateConfig({ regionSize: size });
        return this;
    }
}