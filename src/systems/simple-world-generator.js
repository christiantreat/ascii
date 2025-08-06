// === COMPLETE GEOLOGY-DRIVEN WORLD GENERATOR ===
// File: src/systems/simple-world-generator.js
// COMPLETE REPLACEMENT for your existing world generator

class SimpleWorldGenerator {
    constructor(config = {}) {
        this.worldContext = new WorldContext(config);
        this.setupGeologyModules(); // NEW: Setup with geology first
    }
    
    setupGeologyModules() {
        // Create geology module FIRST (highest priority)
        console.log("Setting up geology-driven world generation...");
        
        // 1. GEOLOGY MODULE (Priority 120 - Foundation)
        const geologyModule = new GeologyModule({
            formations: [
                {
                    type: 'granite_mountains',
                    count: 1,                    // One major mountain formation
                    minRadius: 50,
                    maxRadius: 80,
                    rockType: 'hard',
                    elevationEffect: 0.7         // Strong mountain formation
                },
                {
                    type: 'limestone_valleys', 
                    count: 2,                    // Two valley systems
                    minRadius: 40,
                    maxRadius: 70,
                    rockType: 'soft',
                    elevationEffect: -0.3        // Creates valleys
                },
                {
                    type: 'clay_basins',
                    count: 3,                    // Three areas that hold water
                    minRadius: 25,
                    maxRadius: 45, 
                    rockType: 'clay',
                    elevationEffect: -0.1        // Flat, water-retaining areas
                }
            ],
            baseRockType: 'soft',                // Default: limestone (good for grass)
            weatheringEffect: 0.2                // Moderate soil improvement over time
        });
        this.worldContext.addModule(geologyModule);
        
        // 2. ELEVATION MODULE (Priority 110 - Reads geology)
        const elevationModule = new ElevationModule({
            useGeology: true,                    // ENABLE geology-driven elevation
            geologicalStrength: 0.8,             // Strong geological influence
            erosionStrength: 0.2,                // Moderate erosion effects
            baseElevation: 0.15,                 // Sea level
            noiseAmount: 0.03,                   // Small random variation
            smoothingPasses: 1                   // Light smoothing for natural look
        });
        this.worldContext.addModule(elevationModule);
        
        // 3. HYDROLOGY MODULE (Priority 90 - Reads elevation)
        const hydrologyModule = new HydrologyModule({
            riverCount: 3,
            lakeCount: 4,
            minLakeRadius: 8,
            maxLakeRadius: 12,
            lakeSpacing: 60
        });
        this.worldContext.addModule(hydrologyModule);
    }
    
    // === NEW GEOLOGY CONFIGURATION METHODS ===
    
    configureGeology(config) {
        const module = this.worldContext.getModule('geology');
        if (module) {
            module.updateConfig(config);
        }
        return this;
    }
    
    // === EXISTING METHODS (enhanced) ===
    
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
    
    // === NEW GEOLOGICAL WORLD PRESETS ===
    
    createMountainousWorld() {
        console.log("Creating mountainous geological world...");
        
        this.configureGeology({
            formations: [
                {
                    type: 'granite_range',
                    count: 2,
                    minRadius: 60,
                    maxRadius: 100,
                    rockType: 'hard',
                    elevationEffect: 0.9          // Very mountainous
                },
                {
                    type: 'valley_systems',
                    count: 3,
                    minRadius: 30,
                    maxRadius: 50,
                    rockType: 'soft',
                    elevationEffect: -0.4         // Deep valleys
                }
            ]
        });
        
        this.configureElevation({
            geologicalStrength: 0.9,              // Strong geological influence
            erosionStrength: 0.1                  // Less erosion (preserve mountains)
        });
        
        this.configureHydrology({
            riverCount: 4,                        // More rivers from mountain runoff
            lakeCount: 2                          // Fewer lakes (water flows away)
        });
        
        return this;
    }
    
    createRollingHillsWorld() {
        console.log("Creating rolling hills geological world...");
        
        this.configureGeology({
            formations: [
                {
                    type: 'soft_hills',
                    count: 4,
                    minRadius: 30,
                    maxRadius: 50,
                    rockType: 'soft',
                    elevationEffect: 0.3              // Gentle hills
                },
                {
                    type: 'clay_valleys',
                    count: 3,
                    minRadius: 25,
                    maxRadius: 40,
                    rockType: 'clay',
                    elevationEffect: -0.2             // Shallow valleys
                }
            ]
        });
        
        this.configureElevation({
            geologicalStrength: 0.6,              // Moderate geological influence
            erosionStrength: 0.3,                 // More erosion (softer landscape)
            smoothingPasses: 2                    // More smoothing for rolling hills
        });
        
        this.configureHydrology({
            riverCount: 3,
            lakeCount: 5                          // More lakes in gentle terrain
        });
        
        return this;
    }
    
    createFlatPlainsWorld() {
        console.log("Creating flat plains geological world...");
        
        this.configureGeology({
            formations: [
                {
                    type: 'sedimentary_layers',
                    count: 5,                     // Many flat sedimentary layers
                    minRadius: 40,
                    maxRadius: 80,
                    rockType: 'soft',
                    elevationEffect: 0.1          // Very gentle elevation changes
                },
                {
                    type: 'clay_basins',
                    count: 4,
                    minRadius: 30,
                    maxRadius: 60,
                    rockType: 'clay',
                    elevationEffect: -0.05        // Very shallow depressions
                }
            ]
        });
        
        this.configureElevation({
            geologicalStrength: 0.4,              // Weaker geological influence
            erosionStrength: 0.4,                 // High erosion (flattens terrain)
            smoothingPasses: 3                    // Maximum smoothing
        });
        
        this.configureHydrology({
            riverCount: 2,                        // Slow, meandering rivers
            lakeCount: 6                          // Many shallow lakes
        });
        
        return this;
    }
    
    createVolcanicWorld() {
        console.log("Creating volcanic geological world...");
        
        this.configureGeology({
            formations: [
                {
                    type: 'volcanic_peaks',
                    count: 2,
                    minRadius: 20,                // Smaller but very high
                    maxRadius: 35,
                    rockType: 'hard',
                    elevationEffect: 1.0          // Maximum elevation
                },
                {
                    type: 'lava_plains',
                    count: 3,
                    minRadius: 50,
                    maxRadius: 80,
                    rockType: 'hard',             // Hardened lava
                    elevationEffect: 0.2          // Elevated plateaus
                },
                {
                    type: 'ash_valleys',
                    count: 2,
                    minRadius: 30,
                    maxRadius: 50,
                    rockType: 'soft',             // Ash creates rich soil
                    elevationEffect: -0.1         // Slight depressions
                }
            ]
        });
        
        this.configureElevation({
            geologicalStrength: 1.0,              // Maximum geological influence
            erosionStrength: 0.05,                // Minimal erosion (young terrain)
            smoothingPasses: 0                    // No smoothing (sharp features)
        });
        
        return this;
    }
    
    // === ORIGINAL PRESETS (updated to work with geology) ===
    
    createRollingTerrain() {
        return this.createRollingHillsWorld();   // Redirect to geological version
    }
    
    createFlatTerrain() {
        return this.createFlatPlainsWorld();     // Redirect to geological version
    }
    
    createHillyTerrain() {
        return this.createMountainousWorld();    // Redirect to geological version
    }
    
    // === GENERATION METHODS ===
    
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
    
    // === QUERY METHODS (enhanced with geology) ===
    
    getTerrainAt(x, y) {
        return this.worldContext.getTerrainAt(x, y);
    }
    
    getElevationAt(x, y) {
        const elevationModule = this.worldContext.getModule('elevation');
        return elevationModule ? elevationModule.getElevationAt(x, y) : 0.15;
    }
    
    // NEW: Geology query methods
    getRockTypeAt(x, y) {
        const geologyModule = this.worldContext.getModule('geology');
        return geologyModule ? geologyModule.getRockTypeAt(x, y) : 'soft';
    }
    
    getSoilQualityAt(x, y) {
        const geologyModule = this.worldContext.getModule('geology');
        return geologyModule ? geologyModule.getSoilQualityAt(x, y) : 0.5;
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
    
    // === ANALYSIS METHODS (enhanced with geology) ===
    
    analyzePosition(x, y) {
        const elevation = this.getElevationAt(x, y);
        const rockType = this.getRockTypeAt(x, y);
        const soilQuality = this.getSoilQualityAt(x, y);
        const water = this.getWaterAt(x, y);
        const terrain = this.getTerrainAt(x, y);
        
        return {
            position: { x, y },
            elevation: elevation,
            geology: {
                rockType: rockType,
                soilQuality: soilQuality,
                suitable_for: this.getGeologicalSuitability(rockType, soilQuality)
            },
            water: water,
            terrain: terrain.terrain,
            features: terrain.features,
            suitability: this.calculateAdvancedSuitabilityScores(x, y, elevation, rockType, soilQuality, water)
        };
    }
    
    getGeologicalSuitability(rockType, soilQuality) {
        const suitability = [];
        
        if (rockType === 'hard') {
            suitability.push('quarrying', 'defensive_positions');
            if (soilQuality < 0.3) suitability.push('sparse_vegetation');
        }
        
        if (rockType === 'soft') {
            suitability.push('agriculture', 'easy_excavation');
            if (soilQuality > 0.6) suitability.push('fertile_farming');
        }
        
        if (rockType === 'clay') {
            suitability.push('pottery', 'water_retention');
            if (soilQuality > 0.5) suitability.push('wetland_farming');
        }
        
        return suitability;
    }
    
    calculateAdvancedSuitabilityScores(x, y, elevation, rockType, soilQuality, water) {
        const scores = {};
        
        // Settlement suitability (enhanced with geology)
        let settlementScore = 0;
        if (elevation > 0.12 && elevation < 0.4) settlementScore += 0.3;
        if (water.nearWater && !water.hasWater) settlementScore += 0.3;
        if (rockType === 'hard') settlementScore += 0.2; // Good foundation
        if (soilQuality > 0.4) settlementScore += 0.2;
        scores.settlement = Math.max(0, Math.min(1, settlementScore));
        
        // Agriculture suitability (heavily influenced by geology)
        let agricultureScore = 0;
        if (elevation > 0.12 && elevation < 0.35) agricultureScore += 0.2;
        if (soilQuality > 0.6) agricultureScore += 0.4; // Rich soil crucial
        if (water.moistureLevel > 0.4) agricultureScore += 0.3;
        if (rockType === 'clay' && water.moistureLevel > 0.6) agricultureScore += 0.1;
        if (rockType === 'hard') agricultureScore -= 0.3; // Rocky soil poor
        scores.agriculture = Math.max(0, Math.min(1, agricultureScore));
        
        // Defense suitability
        let defenseScore = 0;
        if (elevation > 0.4) defenseScore += 0.3;
        if (rockType === 'hard') defenseScore += 0.4; // Strong fortifications
        if (water.nearWater) defenseScore += 0.2;
        if (soilQuality < 0.3) defenseScore += 0.1; // Clear fields
        scores.defense = Math.max(0, Math.min(1, defenseScore));
        
        return scores;
    }
    
    calculateSuitabilityScores(x, y, elevation, water) {
        // Fallback for compatibility with old system
        return this.calculateAdvancedSuitabilityScores(x, y, elevation, 'soft', 0.5, water);
    }
    
    // === DATA ACCESS METHODS ===
    
    getModuleData(moduleName) {
        return this.worldContext.getModuleData(moduleName);
    }
    
    getWorldFeatures() {
        const hydrologyData = this.getModuleData('hydrology');
        
        // Convert to legacy format for compatibility
        return {
            villages: [], // Will be added by settlement module
            roads: [], // Will be added by infrastructure module
            rivers: hydrologyData?.rivers || [],
            lakes: hydrologyData?.lakes || [],
            forests: [], // None in simple version
            mountainRanges: [], // Handled by geology now
            trails: [] // Will be added by infrastructure module
        };
    }
    
    // === STATISTICS AND DEBUG ===
    
    getGeologyStats() {
        const geologyModule = this.worldContext.getModule('geology');
        return geologyModule ? geologyModule.getStats() : { formations: 0, rockDistribution: {} };
    }
    
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
    
    // === UTILITY METHODS ===
    
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