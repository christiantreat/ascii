// === UPDATED WORLD SYSTEM USING CENTRALIZED CONFIG ===
// File: src/systems/world-system.js
// COMPLETE REPLACEMENT - Now uses centralized configuration

class WorldSystem {
    constructor() {
        // Get configuration from centralized config
        this.config = window.TERRAIN_CONFIG;
        
        // Get world boundaries from config
        const worldConfig = this.config.getWorldConfig();
        this.worldBounds = {
            minX: worldConfig.minX,
            maxX: worldConfig.maxX,
            minY: worldConfig.minY,
            maxY: worldConfig.maxY
        };
        
        // Cache for generated cells
        this.world = new Map();
        
        // World generation components
        this.worldGenerator = null;
        this.classifier = null;
    }
    
    initialize() {
        console.log("Initializing world system with centralized configuration...");
        
        try {
            const worldConfig = this.config.getWorldConfig();
            
            // Create world generator with config
            this.worldGenerator = new SimpleWorldGenerator({
                centerX: 0,
                centerY: 0,
                regionSize: worldConfig.regionSize,
                seed: worldConfig.defaultSeed
            });
            
            // Configure the world generator with all our settings
            this.configureWorldGenerator();
            
            // Generate the world
            this.worldGenerator.generateWorld(0, 0);
            
            // Create terrain classifier
            this.classifier = new SimpleTerrainClassifier(this.worldGenerator);
            
            console.log("World system initialized successfully with configuration!");
        } catch (error) {
            console.error("Error initializing world system:", error);
            throw error;
        }
    }
    
    configureWorldGenerator() {
        // Configure geology
        const geologyConfig = this.config.getGeologyConfig();
        this.worldGenerator.configureGeology(geologyConfig);
        
        // Configure elevation
        const elevationConfig = this.config.getElevationConfig();
        this.worldGenerator.configureElevation(elevationConfig);
        
        // Configure hydrology
        const hydrologyConfig = this.config.getHydrologyConfig();
        this.worldGenerator.configureHydrology(hydrologyConfig);
        
        console.log("World generator configured with all settings from centralized config");
    }
    
    getTerrainAt(x, y) {
        if (!this.isValidPosition(x, y)) {
            const terrainTypes = this.config.getTerrainTypes();
            return {
                symbol: terrainTypes.unknown.symbol,
                className: terrainTypes.unknown.className,
                name: terrainTypes.unknown.name,
                terrain: 'unknown',
                discovered: false,
                elevation: 0.2
            };
        }
        
        try {
            const key = this.getWorldKey(x, y);
            if (!this.world.has(key)) {
                this.generateCell(x, y);
            }
            
            const cell = this.world.get(key);
            const terrainTypes = this.config.getTerrainTypes();
            const terrainConfig = terrainTypes[cell.terrain] || terrainTypes.unknown;
            
            return {
                symbol: terrainConfig.symbol,
                className: terrainConfig.className,
                name: terrainConfig.name,
                terrain: cell.terrain,
                discovered: cell.discovered,
                elevation: cell.elevation,
                feature: null // Will be added by other systems
            };
        } catch (error) {
            console.warn(`Error getting terrain at (${x}, ${y}):`, error);
            const terrainTypes = this.config.getTerrainTypes();
            return {
                symbol: terrainTypes.unknown.symbol,
                className: terrainTypes.unknown.className,
                name: terrainTypes.unknown.name,
                terrain: 'unknown',
                discovered: false,
                elevation: 0.2
            };
        }
    }
    
    generateCell(x, y) {
        try {
            const key = this.getWorldKey(x, y);
            
            // Use classifier to determine terrain type
            const terrainType = this.classifier ? this.classifier.classifyTerrain(x, y) : 'plains';
            const elevation = this.worldGenerator ? this.worldGenerator.getElevationAt(x, y) : 0.2;
            
            const cell = {
                terrain: terrainType,
                discovered: false,
                elevation: elevation,
                walkable: this.isTerrainWalkable(terrainType)
            };
            
            this.world.set(key, cell);
            return cell;
        } catch (error) {
            console.warn(`Error generating cell at (${x}, ${y}):`, error);
            const cell = {
                terrain: 'plains',
                discovered: false,
                elevation: 0.2,
                walkable: true
            };
            this.world.set(this.getWorldKey(x, y), cell);
            return cell;
        }
    }
    
    canMoveTo(x, y) {
        try {
            if (!this.isValidPosition(x, y)) return false;
            
            const key = this.getWorldKey(x, y);
            if (!this.world.has(key)) {
                this.generateCell(x, y);
            }
            
            const cell = this.world.get(key);
            return this.isTerrainWalkable(cell.terrain);
        } catch (error) {
            console.warn(`Error checking world movement to (${x}, ${y}):`, error);
            return false;
        }
    }
    
    isTerrainWalkable(terrainType) {
        const terrainTypes = this.config.getTerrainTypes();
        const terrainConfig = terrainTypes[terrainType];
        
        if (terrainConfig) {
            return terrainConfig.walkable;
        }
        
        // Fallback for unknown terrain types
        return terrainType !== 'lake' && terrainType !== 'river';
    }
    
    // World boundaries and validation using config
    isValidPosition(x, y) {
        return x >= this.worldBounds.minX && x <= this.worldBounds.maxX &&
               y >= this.worldBounds.minY && y <= this.worldBounds.maxY;
    }
    
    getWorldBounds() {
        return { ...this.worldBounds };
    }
    
    setWorldBounds(minX, maxX, minY, maxY) {
        this.worldBounds = { minX, maxX, minY, maxY };
        
        // Update the config as well
        this.config.config.world.minX = minX;
        this.config.config.world.maxX = maxX;
        this.config.config.world.minY = minY;
        this.config.config.world.maxY = maxY;
    }
    
    isAtWorldBoundary(x, y) {
        return x <= this.worldBounds.minX || x >= this.worldBounds.maxX ||
               y <= this.worldBounds.minY || y >= this.worldBounds.maxY;
    }
    
    // World generation controls using presets from config
    regenerateWorld(centerX = 0, centerY = 0) {
        try {
            console.log("Regenerating world system with configuration...");
            this.world.clear();
            
            if (this.worldGenerator) {
                // Reconfigure before regenerating
                this.configureWorldGenerator();
                this.worldGenerator.generateWorld(centerX, centerY);
            }
            
            console.log("World system regenerated successfully!");
        } catch (error) {
            console.error("Error regenerating world system:", error);
        }
    }
    
    regenerateModule(moduleName) {
        try {
            console.log(`Regenerating ${moduleName} module with configuration...`);
            if (this.worldGenerator) {
                // Reconfigure the specific module before regenerating
                switch (moduleName) {
                    case 'geology':
                        this.worldGenerator.configureGeology(this.config.getGeologyConfig());
                        break;
                    case 'elevation':
                        this.worldGenerator.configureElevation(this.config.getElevationConfig());
                        break;
                    case 'hydrology':
                        this.worldGenerator.configureHydrology(this.config.getHydrologyConfig());
                        break;
                }
                this.worldGenerator.regenerateModule(moduleName);
            }
            this.world.clear();
            console.log(`${moduleName} module regenerated!`);
        } catch (error) {
            console.error(`Error regenerating ${moduleName} module:`, error);
        }
    }
    
    quickConfigElevation(method) {
        try {
            const preset = this.config.getElevationPreset(method);
            if (preset && this.worldGenerator) {
                // Apply the preset to elevation configuration
                const elevationConfig = { ...this.config.getElevationConfig(), ...preset };
                this.worldGenerator.configureElevation(elevationConfig);
            }
        } catch (error) {
            console.error(`Error configuring elevation (${method}):`, error);
        }
        return this;
    }
    
    quickConfigWater(level) {
        try {
            const preset = this.config.getWaterPreset(level);
            if (preset && this.worldGenerator) {
                // Apply the preset to hydrology configuration
                const hydrologyConfig = { ...this.config.getHydrologyConfig(), ...preset };
                this.worldGenerator.configurehydrology(hydrologyConfig);
            }
        } catch (error) {
            console.error(`Error configuring water (${level}):`, error);
        }
        return this;
    }
    
    // Apply geological presets
    applyGeologicalPreset(presetName) {
        try {
            const preset = this.config.getGeologicalPreset(presetName);
            if (preset && this.worldGenerator) {
                // Create a geology configuration with the preset
                const geologyConfig = {
                    ...this.config.getGeologyConfig(),
                    formations: preset.formations
                };
                this.worldGenerator.configureGeology(geologyConfig);
            }
        } catch (error) {
            console.error(`Error applying geological preset (${presetName}):`, error);
        }
        return this;
    }
    
    // Analysis and statistics
    getModuleStatus() {
        return this.worldGenerator ? this.worldGenerator.getModuleStatus() : [];
    }
    
    getTerrainStatistics() {
        try {
            const bounds = this.getWorldBounds();
            const stats = {};
            let totalSamples = 0;
            const perfConfig = this.config.getPerformanceConfig();
            
            // Use performance config to determine sampling rate
            const sampleStep = 8; // Could be configurable
            
            for (let x = bounds.minX; x <= bounds.maxX; x += sampleStep) {
                for (let y = bounds.minY; y <= bounds.maxY; y += sampleStep) {
                    const terrain = this.classifier ? this.classifier.classifyTerrain(x, y) : 'plains';
                    stats[terrain] = (stats[terrain] || 0) + 1;
                    totalSamples++;
                }
            }
            
            const percentages = {};
            Object.keys(stats).forEach(terrain => {
                percentages[terrain] = ((stats[terrain] / totalSamples) * 100).toFixed(1);
            });
            
            return {
                counts: stats,
                percentages: percentages,
                totalSamples: totalSamples,
                configUsed: 'centralized'
            };
        } catch (error) {
            console.error("Error calculating terrain statistics:", error);
            return {
                counts: { plains: 1 },
                percentages: { plains: "100.0" },
                totalSamples: 1,
                configUsed: 'fallback'
            };
        }
    }
    
    getTerrainAnalysis(x, y) {
        return this.worldGenerator ? this.worldGenerator.analyzePosition(x, y) : {
            terrain: 'plains', elevation: 0.2, suitability: { settlement: 0.5 }
        };
    }
    
    getElevationAt(x, y) {
        return this.worldGenerator ? this.worldGenerator.getElevationAt(x, y) : 0.2;
    }
    
    getWorldFeatures() {
        return this.worldGenerator ? this.worldGenerator.getWorldFeatures() : {
            villages: [], roads: [], rivers: [], lakes: [], forests: [], mountainRanges: [], trails: []
        };
    }
    
    // Statistics for logging
    getStats() {
        try {
            const elevationData = this.worldGenerator ? this.worldGenerator.getModuleData('elevation') : null;
            const hydrologyData = this.worldGenerator ? this.worldGenerator.getModuleData('hydrology') : null;
            
            return {
                hills: elevationData?.hills?.length || 0,
                rivers: hydrologyData?.rivers?.length || 0,
                lakes: hydrologyData?.lakes?.length || 0,
                configurationUsed: 'centralized'
            };
        } catch (error) {
            console.warn("Error getting world stats:", error);
            return { hills: 0, rivers: 0, lakes: 0, configurationUsed: 'fallback' };
        }
    }
    
    // Configuration access
    getConfig() {
        return this.config;
    }
    
    updateConfiguration(section, newValues) {
        switch (section) {
            case 'world':
                // Update world boundaries
                if (newValues.minX !== undefined) this.worldBounds.minX = newValues.minX;
                if (newValues.maxX !== undefined) this.worldBounds.maxX = newValues.maxX;
                if (newValues.minY !== undefined) this.worldBounds.minY = newValues.minY;
                if (newValues.maxY !== undefined) this.worldBounds.maxY = newValues.maxY;
                break;
            case 'geology':
                this.config.updateGeology(newValues);
                if (this.worldGenerator) {
                    this.worldGenerator.configureGeology(this.config.getGeologyConfig());
                }
                break;
            case 'elevation':
                this.config.updateElevation(newValues);
                if (this.worldGenerator) {
                    this.worldGenerator.configureElevation(this.config.getElevationConfig());
                }
                break;
            case 'hydrology':
                this.config.updateHydrology(newValues);
                if (this.worldGenerator) {
                    this.worldGenerator.configureHydrology(this.config.getHydrologyConfig());
                }
                break;
        }
        
        return this;
    }
    
    // Utility methods
    getWorldKey(x, y) {
        return `${x},${y}`;
    }
    
    markCellDiscovered(x, y) {
        const key = this.getWorldKey(x, y);
        if (this.world.has(key)) {
            this.world.get(key).discovered = true;
        }
    }
    
    // Configuration validation
    validateConfiguration() {
        return this.config.validateConfig();
    }
    
    // Export current world state with configuration
    exportWorldState() {
        return {
            configuration: this.config.exportConfig(),
            worldBounds: this.worldBounds,
            generatedCells: Array.from(this.world.entries()),
            timestamp: new Date().toISOString()
        };
    }
}