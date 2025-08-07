// === CENTRALIZED TERRAIN CONFIGURATION ===
// File: src/config/terrain-config.js
// All terrain settings in one easy-to-edit file!

class TerrainConfig {
    constructor() {
        // This object contains ALL terrain settings
        // Edit these values to customize your game world!
        this.config = {
            
            // === WORLD BOUNDARIES ===
            world: {
                minX: -100,
                maxX: 100,
                minY: -100,
                maxY: 100,
                regionSize: 200,
                defaultSeed: 12345 // Change this for different worlds
            },
            
            // === TERRAIN VISUAL APPEARANCE ===
            terrainTypes: {
                plains: { 
                    symbol: '▓', 
                    className: 'terrain-grass', 
                    name: 'Plains',
                    walkable: true
                },
                foothills: { 
                    symbol: '▒', 
                    className: 'terrain-hills', 
                    name: 'Foothills',
                    walkable: true
                },
                river: { 
                    symbol: '~', 
                    className: 'terrain-water', 
                    name: 'River',
                    walkable: false
                },
                lake: { 
                    symbol: '▀', 
                    className: 'terrain-water', 
                    name: 'Lake',
                    walkable: false
                },
                // Rocky terrain types
                rocks: { 
                    symbol: '▓', 
                    className: 'terrain-rocks', 
                    name: 'Rocky Ground',
                    walkable: true
                },
                boulders: { 
                    symbol: '▒', 
                    className: 'terrain-boulders', 
                    name: 'Boulder Field',
                    walkable: true
                },
                stone: { 
                    symbol: '░', 
                    className: 'terrain-stone', 
                    name: 'Stone Outcrops',
                    walkable: true
                },
                // Special terrain
                unknown: { 
                    symbol: '░', 
                    className: 'terrain-unknown', 
                    name: 'Unknown',
                    walkable: false
                },
                fog: { 
                    symbol: '▓', 
                    className: 'terrain-fog', 
                    name: 'Unknown',
                    walkable: false
                },
                explored: { 
                    symbol: '░', 
                    className: 'terrain-explored', 
                    name: 'Explored',
                    walkable: true
                }
            },
            
            // === TREE AND FEATURE TYPES ===
            featureTypes: {
                tree_trunk: { 
                    symbol: '♠', 
                    className: 'feature-tree-trunk', 
                    name: 'Tree Trunk',
                    walkable: false,
                    blocksVision: true
                },
                tree_canopy: { 
                    symbol: '♠', 
                    className: 'feature-tree-canopy', 
                    name: 'Tree Canopy',
                    walkable: true, // Can walk under canopy
                    blocksVision: true
                }
            },
            
            // === GEOLOGY MODULE SETTINGS ===
            geology: {
                formations: [
                    {
                        type: 'granite_intrusion',
                        count: 2,              // Number of granite formations
                        minRadius: 40,         // Minimum size
                        maxRadius: 80,         // Maximum size  
                        rockType: 'hard',      // Creates hard rock
                        elevationEffect: 0.6   // Strong elevation boost
                    },
                    {
                        type: 'limestone_beds',
                        count: 3,              // Number of limestone areas
                        minRadius: 30,
                        maxRadius: 60,
                        rockType: 'soft',      // Creates soft rock
                        elevationEffect: -0.3  // Lowers elevation (valleys)
                    },
                    {
                        type: 'clay_deposits',
                        count: 4,              // Number of clay areas
                        minRadius: 20,
                        maxRadius: 40,
                        rockType: 'clay',      // Creates clay
                        elevationEffect: -0.1  // Slightly lower (flat areas)
                    }
                ],
                rockProperties: {
                    hard: {
                        erosionResistance: 0.9,    // Hard to erode
                        soilQuality: 0.2,          // Poor, thin soil
                        waterRetention: 0.1,       // Water runs off
                        elevationBonus: 0.4        // Forms high areas
                    },
                    soft: {
                        erosionResistance: 0.3,    // Erodes easily
                        soilQuality: 0.8,          // Rich, deep soil  
                        waterRetention: 0.4,       // Moderate water retention
                        elevationBonus: -0.2       // Forms valleys
                    },
                    clay: {
                        erosionResistance: 0.5,    // Medium erosion
                        soilQuality: 0.6,          // Good soil when not waterlogged
                        waterRetention: 0.9,       // Holds water (creates wetlands)
                        elevationBonus: -0.1       // Slightly low (flat)
                    }
                },
                baseRockType: 'soft',          // Default rock type
                noiseAmount: 0.1,              // Random variation
                weatheringEffect: 0.3          // How much weathering affects soil
            },
            
            // === ELEVATION MODULE SETTINGS ===
            elevation: {
                useGeology: true,              // Use geology to drive elevation
                geologicalStrength: 0.7,       // How much geology affects elevation
                baseElevation: 0.2,            // Sea level
                maxElevation: 1.0,             // Highest possible elevation
                erosionStrength: 0.3,          // How much erosion lowers elevation
                weatheringRate: 0.1,           // How quickly rocks weather
                noiseAmount: 0.05,             // Random variation for realism
                smoothingPasses: 2,            // How many times to smooth elevation
                // Fallback settings if no geology
                fallbackHillCount: 6,
                fallbackHillRadius: 35
            },
            
            // === WATER SYSTEM SETTINGS ===
            hydrology: {
                springCount: 8,                // Number of water springs
                springElevationMin: 0.25,      // Springs appear above this elevation
                springProximityToHardRock: 30, // Springs near hard rock
                riverStepSize: 2,              // How far rivers move each step
                maxRiverLength: 100,           // Maximum river length
                minRiverLength: 10,            // Minimum river length
                hardRockAvoidance: 0.4,        // Rivers avoid hard rock
                softRockPreference: 0.6,       // Rivers prefer soft rock
                clayChanneling: 0.4,           // Rivers flow along clay
                lakeCount: 4,                  // Number of lakes
                minLakeRadius: 6,              // Smallest lake size
                maxLakeRadius: 18,             // Largest lake size
                lakeSpacing: 35,               // Distance between lakes
                lakeClayPreference: 0.6,       // Lakes prefer clay areas
                lakeLowElevationMax: 0.3,      // Lakes only in low areas
                lakeHardRockAvoidance: 0.4,    // Lakes avoid hard rock
                confluenceEnabled: true,       // Rivers can merge
                confluenceDistance: 8          // How close rivers merge
            },
            
            // === VEGETATION SETTINGS ===
            vegetation: {
                forestCount: 4,                // Number of forest areas
                minForestSize: 30,             // Smallest forest
                maxForestSize: 80,             // Largest forest
                forestSpacing: 40,             // Distance between forests
                forestElevationMin: 0.25,      // Forests above this elevation
                forestElevationMax: 0.75,      // Forests below this elevation
                forestMoistureMin: 0.4,        // Forests need this much moisture
                forestDensity: 0.8,            // How dense forests are
                clearingsEnabled: true,        // Allow clearings in forests
                clearingChance: 0.3,           // Chance of clearings
                minClearingRadius: 8,          // Smallest clearing
                maxClearingRadius: 15,         // Largest clearing
                grasslandsEnabled: true,       // Enable grassland areas
                grasslandElevationMin: 0.15,   // Grasslands elevation range
                grasslandElevationMax: 0.5,
                grasslandMoistureMin: 0.3,     // Grasslands moisture needs
                treeLineElevation: 0.8         // No trees above this elevation
            },
            
            // === TREE SYSTEM SETTINGS ===
            trees: {
                maxTrees: 50,                  // Total number of trees
                minTreeSpacing: 2,             // Minimum distance between trees
                forestPatchCount: 3,           // Number of forest patches
                scatteredTreeCount: 15,        // Individual scattered trees
                treeSize: 9,                   // Tree area (always 3x3 = 9)
                treeWidth: 3,                  // Tree width
                treeHeight: 3                  // Tree height
            },
            
            // === DEER AI SETTINGS ===
            deer: {
                maxDeerCount: 8,               // Maximum number of deer
                playerDetectionRadius: 25,     // How far deer can sense player
                visionRange: 8,                // Deer vision distance
                alertRange: 7,                 // Distance when deer become alert
                fleeDistance: 15,              // Distance deer try to reach when fleeing
                panicDistance: 4,              // Immediate panic distance
                // Movement timing (milliseconds)
                baseMoveInterval: 1000,        // Normal movement speed
                alertMoveInterval: 500,        // Alert movement speed
                fleeMoveInterval: 150,         // Fleeing movement speed
                maxReactionsPerUpdate: 2,      // Max reactions processed per update
                wanderDuration: 4000,          // How long deer wander in one direction
                wanderMoveChance: 0.3,         // Chance deer moves while wandering
                maxFleeTime: 10000,            // Maximum time spent fleeing
                playerMemoryTime: 4000,        // How long deer remember player location
                flockRadius: 6,                // Distance for flocking behavior
                flockStrength: 0.4             // Strength of flocking behavior
            },
            
            // === FOG OF WAR SETTINGS ===
            fogOfWar: {
                enabled: true,                 // Fog of war on/off
                visionRadius: 3,               // Base circular vision
                forwardVisionRange: 12,        // Extended forward vision
                exploredRadius: 2,             // Area marked as explored
                coneAngle: 150,                // Vision cone angle (degrees)
                playerFacing: { x: 0, y: -1 }  // Default facing direction (north)
            },
            
            // === TERRAIN GENERATION PRESETS ===
            presets: {
                // Quick elevation presets
                elevation: {
                    flat: { 
                        hillCount: 2,
                        minHillRadius: 15,
                        maxHillRadius: 25,
                        minHillHeight: 0.18,
                        maxHillHeight: 0.28,
                        hillSpacing: 80
                    },
                    rolling: { 
                        hillCount: 6,
                        minHillRadius: 20,
                        maxHillRadius: 35,
                        minHillHeight: 0.25,
                        maxHillHeight: 0.45,
                        hillSpacing: 45
                    },
                    hilly: { 
                        hillCount: 10,
                        minHillRadius: 18,
                        maxHillRadius: 32,
                        minHillHeight: 0.3,
                        maxHillHeight: 0.55,
                        hillSpacing: 30
                    }
                },
                
                // Water level presets
                water: {
                    dry: { riverCount: 1, lakeCount: 2 },
                    normal: { riverCount: 3, lakeCount: 4 },
                    wet: { riverCount: 5, lakeCount: 6 }
                },
                
                // Geological world presets
                geological: {
                    mountainous: {
                        formations: [
                            {
                                type: 'granite_range',
                                count: 2,
                                minRadius: 60,
                                maxRadius: 100,
                                rockType: 'hard',
                                elevationEffect: 0.9
                            },
                            {
                                type: 'valley_systems',
                                count: 3,
                                minRadius: 30,
                                maxRadius: 50,
                                rockType: 'soft',
                                elevationEffect: -0.4
                            }
                        ]
                    },
                    
                    rolling: {
                        formations: [
                            {
                                type: 'soft_hills',
                                count: 4,
                                minRadius: 30,
                                maxRadius: 50,
                                rockType: 'soft',
                                elevationEffect: 0.3
                            },
                            {
                                type: 'clay_valleys',
                                count: 3,
                                minRadius: 25,
                                maxRadius: 40,
                                rockType: 'clay',
                                elevationEffect: -0.2
                            }
                        ]
                    },
                    
                    flat: {
                        formations: [
                            {
                                type: 'sedimentary_layers',
                                count: 5,
                                minRadius: 40,
                                maxRadius: 80,
                                rockType: 'soft',
                                elevationEffect: 0.1
                            },
                            {
                                type: 'clay_basins',
                                count: 4,
                                minRadius: 30,
                                maxRadius: 60,
                                rockType: 'clay',
                                elevationEffect: -0.05
                            }
                        ]
                    },
                    
                    volcanic: {
                        formations: [
                            {
                                type: 'volcanic_peaks',
                                count: 2,
                                minRadius: 20,
                                maxRadius: 35,
                                rockType: 'hard',
                                elevationEffect: 1.0
                            },
                            {
                                type: 'lava_plains',
                                count: 3,
                                minRadius: 50,
                                maxRadius: 80,
                                rockType: 'hard',
                                elevationEffect: 0.2
                            },
                            {
                                type: 'ash_valleys',
                                count: 2,
                                minRadius: 30,
                                maxRadius: 50,
                                rockType: 'soft',
                                elevationEffect: -0.1
                            }
                        ]
                    }
                }
            },
            
            // === RENDERING SETTINGS ===
            rendering: {
                charWidth: 14.4,               // Character width in pixels
                charHeight: 24,                // Character height in pixels
                fontSize: 24,                  // Font size
                grassVariations: 8,            // Number of grass color variations
                rockVariations: 4              // Number of rock color variations
            },
            
            // === PERFORMANCE SETTINGS ===
            performance: {
                deerUpdateInterval: 200,       // Deer AI update frequency (ms)
                gameLoopInterval: 16,          // Game loop frequency (60 FPS)
                chunkGenerationRadius: 50,     // How far ahead to generate terrain
                explorationRadius: 8           // How far player exploration reaches
            }
        };
    }
    
    // === GETTER METHODS ===
    // These make it easy to access specific config sections
    
    getWorldConfig() {
        return this.config.world;
    }
    
    getTerrainTypes() {
        return this.config.terrainTypes;
    }
    
    getFeatureTypes() {
        return this.config.featureTypes;
    }
    
    getGeologyConfig() {
        return this.config.geology;
    }
    
    getElevationConfig() {
        return this.config.elevation;
    }
    
    getHydrologyConfig() {
        return this.config.hydrology;
    }
    
    getVegetationConfig() {
        return this.config.vegetation;
    }
    
    getTreeConfig() {
        return this.config.trees;
    }
    
    getDeerConfig() {
        return this.config.deer;
    }
    
    getFogOfWarConfig() {
        return this.config.fogOfWar;
    }
    
    getRenderingConfig() {
        return this.config.rendering;
    }
    
    getPerformanceConfig() {
        return this.config.performance;
    }
    
    // === PRESET METHODS ===
    // These return specific preset configurations
    
    getElevationPreset(presetName) {
        return this.config.presets.elevation[presetName];
    }
    
    getWaterPreset(presetName) {
        return this.config.presets.water[presetName];
    }
    
    getGeologicalPreset(presetName) {
        return this.config.presets.geological[presetName];
    }
    
    // === CONFIGURATION METHODS ===
    // These allow runtime modification of settings
    
    updateGeology(newConfig) {
        this.config.geology = { ...this.config.geology, ...newConfig };
        return this;
    }
    
    updateElevation(newConfig) {
        this.config.elevation = { ...this.config.elevation, ...newConfig };
        return this;
    }
    
    updateHydrology(newConfig) {
        this.config.hydrology = { ...this.config.hydrology, ...newConfig };
        return this;
    }
    
    updateDeer(newConfig) {
        this.config.deer = { ...this.config.deer, ...newConfig };
        return this;
    }
    
    updateFogOfWar(newConfig) {
        this.config.fogOfWar = { ...this.config.fogOfWar, ...newConfig };
        return this;
    }
    
    // === UTILITY METHODS ===
    
    // Get the full configuration object
    getFullConfig() {
        return this.config;
    }
    
    // Reset to default settings
    resetToDefaults() {
        // This would recreate the default config
        // For now, you'd need to reload the page
        console.log("Reset to defaults - reload page to apply");
    }
    
    // Export configuration as JSON (for saving/loading)
    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }
    
    // Import configuration from JSON
    importConfig(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.config = { ...this.config, ...imported };
            return true;
        } catch (error) {
            console.error("Invalid configuration JSON:", error);
            return false;
        }
    }
    
    // Validate configuration (basic checks)
    validateConfig() {
        const errors = [];
        
        // Check required sections exist
        const requiredSections = ['world', 'terrainTypes', 'geology', 'elevation', 'hydrology'];
        requiredSections.forEach(section => {
            if (!this.config[section]) {
                errors.push(`Missing required section: ${section}`);
            }
        });
        
        // Check numeric ranges
        if (this.config.deer && this.config.deer.maxDeerCount < 1) {
            errors.push("Deer count must be at least 1");
        }
        
        if (this.config.elevation && (this.config.elevation.baseElevation < 0 || this.config.elevation.baseElevation > 1)) {
            errors.push("Base elevation must be between 0 and 1");
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Create and export a global configuration instance
// This makes the config available to all other modules
const TERRAIN_CONFIG = new TerrainConfig();

// Make it available globally
if (typeof window !== 'undefined') {
    window.TERRAIN_CONFIG = TERRAIN_CONFIG;
}