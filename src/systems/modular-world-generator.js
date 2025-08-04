// === MODULAR WORLD GENERATOR ===
// File: src/systems/modular-world-generator.js

class ModularWorldGenerator {
    constructor(config = {}) {
        this.worldContext = new WorldContext(config);
        this.setupDefaultModules();
    }
    
    setupDefaultModules() {
        // Create and add default modules
        
        // 1. Elevation (foundation)
        const elevationModule = new ElevationModule({
            method: 'peaks',
            peaks: [
                { x: -50, y: -120, height: 1.0, radius: 80, type: 'mountain' },
                { x: 80, y: -60, height: 0.7, radius: 60, type: 'hill' },
                { x: -120, y: 40, height: 0.8, radius: 70, type: 'ridge' }
            ]
        });
        this.worldContext.addModule(elevationModule);
        
        // 2. Hydrology (water systems)
        const hydrologyModule = new HydrologyModule({
            riverCount: 3,
            lakeCount: 3,
            wetlandsEnabled: true
        });
        this.worldContext.addModule(hydrologyModule);
        
        // 3. Vegetation (forests, grasslands)
        const vegetationModule = new VegetationModule({
            forestCount: 4,
            grasslandsEnabled: true,
            clearingsEnabled: true
        });
        this.worldContext.addModule(vegetationModule);
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
    
    configureVegetation(config) {
        const module = this.worldContext.getModule('vegetation');
        if (module) {
            module.updateConfig(config);
        }
        return this;
    }
    
    // Module management
    addModule(module) {
        this.worldContext.addModule(module);
        return this;
    }
    
    removeModule(moduleName) {
        this.worldContext.removeModule(moduleName);
        return this;
    }
    
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
        return elevationModule ? elevationModule.getElevationAt(x, y) : 0.3;
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
    
    getVegetationAt(x, y) {
        const vegetationModule = this.worldContext.getModule('vegetation');
        if (!vegetationModule) return { type: 'none', density: 0 };
        
        return vegetationModule.getVegetationAt(x, y);
    }
    
    // Analysis methods
    analyzePosition(x, y) {
        const elevation = this.getElevationAt(x, y);
        const water = this.getWaterAt(x, y);
        const vegetation = this.getVegetationAt(x, y);
        const terrain = this.getTerrainAt(x, y);
        
        return {
            position: { x, y },
            elevation: elevation,
            water: water,
            vegetation: vegetation,
            terrain: terrain.terrain,
            features: terrain.features,
            suitability: this.calculateSuitabilityScores(x, y, elevation, water, vegetation)
        };
    }
    
    calculateSuitabilityScores(x, y, elevation, water, vegetation) {
        const scores = {};
        
        // Settlement suitability
        let settlementScore = 0;
        if (elevation > 0.2 && elevation < 0.5) settlementScore += 0.3; // Good elevation
        if (water.nearWater && !water.hasWater) settlementScore += 0.4; // Near but not in water
        if (vegetation.type === 'none' || vegetation.density < 0.3) settlementScore += 0.2; // Not too forested
        if (elevation > 0.15) settlementScore += 0.1; // Above flood level
        scores.settlement = Math.max(0, Math.min(1, settlementScore));
        
        // Agriculture suitability
        let agricultureScore = 0;
        if (elevation > 0.15 && elevation < 0.4) agricultureScore += 0.3; // Flat areas
        if (water.moistureLevel > 0.4) agricultureScore += 0.4; // Good water access
        if (vegetation.type === 'grassland' || vegetation.type === 'none') agricultureScore += 0.2;
        if (!water.hasWater) agricultureScore += 0.1; // Not flooded
        scores.agriculture = Math.max(0, Math.min(1, agricultureScore));
        
        // Defense suitability
        let defenseScore = 0;
        if (elevation > 0.4) defenseScore += 0.4; // High ground
        if (water.nearWater) defenseScore += 0.2; // Water access for siege defense
        if (vegetation.density < 0.5) defenseScore += 0.2; // Clear lines of sight
        if (elevation > 0.6) defenseScore += 0.2; // Very high ground
        scores.defense = Math.max(0, Math.min(1, defenseScore));
        
        return scores;
    }
    
    // Data access methods
    getModuleData(moduleName) {
        return this.worldContext.getModuleData(moduleName);
    }
    
    getWorldFeatures() {
        const features = {
            elevation: this.getModuleData('elevation'),
            hydrology: this.getModuleData('hydrology'),
            vegetation: this.getModuleData('vegetation')
        };
        
        // Convert to legacy format for compatibility
        return {
            villages: [], // Will be added by settlement module
            roads: [], // Will be added by infrastructure module
            rivers: features.hydrology?.rivers || [],
            lakes: features.hydrology?.lakes || [],
            forests: features.vegetation?.forests || [],
            mountainRanges: this.extractMountainRanges(features.elevation),
            trails: [] // Will be added by infrastructure module
        };
    }
    
    extractMountainRanges(elevationData) {
        // Convert elevation peaks to mountain range format for compatibility
        if (!elevationData || !elevationData.elevationMap) return [];
        
        const elevationModule = this.worldContext.getModule('elevation');
        if (!elevationModule || elevationModule.config.method !== 'peaks') return [];
        
        return elevationModule.config.peaks.map(peak => ({
            centerX: this.worldContext.config.centerX + peak.x,
            centerY: this.worldContext.config.centerY + peak.y,
            length: peak.radius * 1.5,
            width: peak.radius,
            angle: 0,
            height: peak.height
        }));
    }
    
    // Preset configurations
    createMountainousWorld() {
        this.configureElevation({
            method: 'peaks',
            peaks: [
                { x: -80, y: -100, height: 1.0, radius: 100, type: 'mountain' },
                { x: 60, y: -80, height: 0.9, radius: 80, type: 'mountain' },
                { x: -60, y: 60, height: 0.8, radius: 70, type: 'mountain' },
                { x: 100, y: 40, height: 0.7, radius: 60, type: 'hill' }
            ]
        });
        
        this.configureHydrology({
            riverCount: 5,
            lakeCount: 2,
            springElevationMin: 0.7
        });
        
        this.configureVegetation({
            forestCount: 6,
            forestElevationMax: 0.8,
            treeLineElevation: 0.85
        });
        
        return this;
    }
    
    createRollingHillsWorld() {
        this.configureElevation({
            method: 'noise',
            noiseScale: 0.008,
            noiseOctaves: 4,
            baseElevation: 0.2,
            maxElevation: 0.7
        });
        
        this.configureHydrology({
            riverCount: 4,
            lakeCount: 4,
            wetlandsEnabled: true
        });
        
        this.configureVegetation({
            forestCount: 8,
            grasslandsEnabled: true,
            forestElevationMin: 0.2,
            forestElevationMax: 0.6
        });
        
        return this;
    }
    
    createVolcanicWorld() {
        this.configureElevation({
            method: 'volcanic',
            baseElevation: 0.1
        });
        
        this.configureHydrology({
            riverCount: 2,
            lakeCount: 5, // More lakes due to calderas
            lakeElevationMax: 0.5
        });
        
        this.configureVegetation({
            forestCount: 3,
            forestElevationMin: 0.3,
            forestElevationMax: 0.7
        });
        
        return this;
    }
    
    createRidgeWorld() {
        this.configureElevation({
            method: 'ridges'
        });
        
        this.configureHydrology({
            riverCount: 4,
            lakeCount: 2
        });
        
        this.configureVegetation({
            forestCount: 5,
            forestElevationMin: 0.25,
            forestElevationMax: 0.75
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
    
    getGenerationOrder() {
        return this.worldContext.generationOrder.map(module => ({
            name: module.name,
            priority: module.priority,
            dependencies: module.dependencies
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