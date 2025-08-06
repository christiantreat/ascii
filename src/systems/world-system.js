// === WORLD SYSTEM (TERRAIN GENERATION) ===
// File: src/systems/world-system.js
// Handles all world generation, terrain classification, and basic terrain queries

class WorldSystem {
    constructor() {
        // World boundaries
        this.worldBounds = {
            minX: -100,
            maxX: 100,  
            minY: -100,
            maxY: 100
        };
        
        // Cache for generated cells
        this.world = new Map();
        
        // World generation components
        this.worldGenerator = null;
        this.classifier = null;
    }
    
    initialize() {
        console.log("Initializing world system...");
        
        try {
            // Create world generator
            this.worldGenerator = new SimpleWorldGenerator({
                centerX: 0,
                centerY: 0,
                regionSize: 200,
                seed: Math.floor(Math.random() * 10000)
            });
            
            // Generate the world
            this.worldGenerator.generateWorld(0, 0);
            
            // Create terrain classifier
            this.classifier = new SimpleTerrainClassifier(this.worldGenerator);
            
            console.log("World system initialized successfully!");
        } catch (error) {
            console.error("Error initializing world system:", error);
            throw error;
        }
    }
    
    getTerrainAt(x, y) {
        if (!this.isValidPosition(x, y)) {
            return {
                symbol: '░',
                className: 'terrain-unknown',
                name: 'Unknown',
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
            
            return {
                symbol: this.getTerrainSymbol(cell.terrain),
                className: this.getTerrainClassName(cell.terrain),
                name: this.getTerrainName(cell.terrain),
                terrain: cell.terrain,
                discovered: cell.discovered,
                elevation: cell.elevation,
                feature: null // Will be added by other systems
            };
        } catch (error) {
            console.warn(`Error getting terrain at (${x}, ${y}):`, error);
            return {
                symbol: '░',
                className: 'terrain-unknown',
                name: 'Unknown',
                terrain: 'unknown',
                discovered: false,
                elevation: 0.2
            };
        }
    }
    
    generateCell(x, y) {
        try {
            const key = this.getWorldKey(x, y);
            
            const terrainType = this.classifier ? this.classifier.classifyTerrain(x, y) : 'plains';
            const elevation = this.worldGenerator ? this.worldGenerator.getElevationAt(x, y) : 0.2;
            const analysis = this.worldGenerator ? this.worldGenerator.analyzePosition(x, y) : null;
            
            const cell = {
                terrain: terrainType,
                discovered: false,
                elevation: elevation,
                analysis: analysis,
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
                analysis: null,
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
        const unwalkableTerrains = ['lake'];
        return !unwalkableTerrains.includes(terrainType);
    }
    
    // Terrain type mapping methods
    getTerrainSymbol(terrainType) {
        const symbols = {
            plains: '▓',
            foothills: '▒',
            river: '~',
            lake: '▀',
            unknown: '░'
        };
        return symbols[terrainType] || '░';
    }
    
    getTerrainClassName(terrainType) {
        const classNames = {
            plains: 'terrain-grass',
            foothills: 'terrain-hills',
            river: 'terrain-water',
            lake: 'terrain-water',
            unknown: 'terrain-unknown'
        };
        return classNames[terrainType] || 'terrain-unknown';
    }
    
    getTerrainName(terrainType) {
        const names = {
            plains: 'Plains',
            foothills: 'Foothills',
            river: 'River',
            lake: 'Lake',
            unknown: 'Unknown'
        };
        return names[terrainType] || 'Unknown';
    }
    
    // World boundaries and validation
    isValidPosition(x, y) {
        return x >= this.worldBounds.minX && x <= this.worldBounds.maxX &&
               y >= this.worldBounds.minY && y <= this.worldBounds.maxY;
    }
    
    getWorldBounds() {
        return { ...this.worldBounds };
    }
    
    setWorldBounds(minX, maxX, minY, maxY) {
        this.worldBounds = { minX, maxX, minY, maxY };
    }
    
    isAtWorldBoundary(x, y) {
        return x <= this.worldBounds.minX || x >= this.worldBounds.maxX ||
               y <= this.worldBounds.minY || y >= this.worldBounds.maxY;
    }
    
    // World generation controls
    regenerateWorld(centerX = 0, centerY = 0) {
        try {
            console.log("Regenerating world system...");
            this.world.clear();
            
            if (this.worldGenerator) {
                this.worldGenerator.generateWorld(centerX, centerY);
            }
            
            console.log("World system regenerated successfully!");
        } catch (error) {
            console.error("Error regenerating world system:", error);
        }
    }
    
    regenerateModule(moduleName) {
        try {
            console.log(`Regenerating ${moduleName} module in world system...`);
            if (this.worldGenerator) {
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
            const configs = {
                'flat': { 
                    hillCount: 2,
                    minHillRadius: 15,
                    maxHillRadius: 25,
                    minHillHeight: 0.18,
                    maxHillHeight: 0.28,
                    hillSpacing: 80
                },
                'rolling': { 
                    hillCount: 6,
                    minHillRadius: 20,
                    maxHillRadius: 35,
                    minHillHeight: 0.25,
                    maxHillHeight: 0.45,
                    hillSpacing: 45
                },
                'hilly': { 
                    hillCount: 10,
                    minHillRadius: 18,
                    maxHillRadius: 32,
                    minHillHeight: 0.3,
                    maxHillHeight: 0.55,
                    hillSpacing: 30
                }
            };
            
            if (configs[method] && this.worldGenerator) {
                this.worldGenerator.configureElevation(configs[method]);
            }
        } catch (error) {
            console.error(`Error configuring elevation (${method}):`, error);
        }
        return this;
    }
    
    quickConfigWater(level) {
        try {
            const configs = {
                'dry': { riverCount: 1, lakeCount: 2 },
                'normal': { riverCount: 3, lakeCount: 4 },
                'wet': { riverCount: 5, lakeCount: 6 }
            };
            
            if (configs[level] && this.worldGenerator) {
                this.worldGenerator.configureHydrology(configs[level]);
            }
        } catch (error) {
            console.error(`Error configuring water (${level}):`, error);
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
            
            for (let x = bounds.minX; x <= bounds.maxX; x += 8) {
                for (let y = bounds.minY; y <= bounds.maxY; y += 8) {
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
                totalSamples: totalSamples
            };
        } catch (error) {
            console.error("Error calculating terrain statistics:", error);
            return {
                counts: { plains: 1 },
                percentages: { plains: "100.0" },
                totalSamples: 1
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
                lakes: hydrologyData?.lakes?.length || 0
            };
        } catch (error) {
            console.warn("Error getting world stats:", error);
            return { hills: 0, rivers: 0, lakes: 0 };
        }
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
}