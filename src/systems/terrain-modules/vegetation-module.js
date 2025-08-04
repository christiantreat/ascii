// === VEGETATION MODULE ===
// File: src/systems/terrain-modules/vegetation-module.js

class VegetationModule extends TerrainModuleBase {
    constructor(config = {}) {
        super('vegetation', config);
        this.priority = 70; // Medium priority - depends on elevation and water
        this.dependencies = ['elevation', 'hydrology'];
        
        this.forests = [];
        this.grasslands = [];
        this.vegetationMap = new Map();
    }
    
    getDefaultConfig() {
        return {
            // Forest generation
            forestCount: 4,
            minForestSize: 30,
            maxForestSize: 80,
            forestSpacing: 40,
            
            // Forest preferences
            forestElevationMin: 0.25,
            forestElevationMax: 0.75,
            forestMoistureMin: 0.4,
            forestDensity: 0.8,
            
            // Clearing generation
            clearingsEnabled: true,
            clearingChance: 0.3,
            minClearingRadius: 8,
            maxClearingRadius: 15,
            
            // Grassland generation
            grasslandsEnabled: true,
            grasslandElevationMin: 0.15,
            grasslandElevationMax: 0.5,
            grasslandMoistureMin: 0.3,
            
            // Tree line (elevation above which no trees grow)
            treeLineElevation: 0.8,
            
            // Vegetation types
            vegetationTypes: {
                'dense_forest': { density: 0.9, symbol: '♠' },
                'mixed_forest': { density: 0.7, symbol: '♣' },
                'light_forest': { density: 0.5, symbol: '♦' },
                'grassland': { density: 0.3, symbol: '▓' },
                'scrubland': { density: 0.2, symbol: '░' }
            }
        };
    }
    
    generate(worldContext) {
        console.log("Generating vegetation...");
        
        this.forests = [];
        this.grasslands = [];
        this.vegetationMap.clear();
        
        const elevationModule = worldContext.getModule('elevation');
        const hydrologyModule = worldContext.getModule('hydrology');
        
        if (!elevationModule) {
            console.warn("Vegetation module requires elevation module!");
            return this.getEmptyResult();
        }
        
        // Step 1: Identify suitable areas for forests
        this.identifyForestAreas(worldContext, elevationModule, hydrologyModule);
        
        // Step 2: Generate forest patches
        this.generateForests(worldContext, elevationModule, hydrologyModule);
        
        // Step 3: Generate grasslands
        if (this.config.grasslandsEnabled) {
            this.generateGrasslands(worldContext, elevationModule, hydrologyModule);
        }
        
        // Step 4: Calculate vegetation coverage map
        this.calculateVegetationCoverage(worldContext, elevationModule, hydrologyModule);
        
        return {
            forests: this.forests,
            grasslands: this.grasslands,
            vegetationMap: this.vegetationMap
        };
    }
    
    identifyForestAreas(worldContext, elevationModule, hydrologyModule) {
        const bounds = worldContext.getWorldBounds();
        const candidates = [];
        
        // Sample potential forest locations
        for (let x = bounds.minX; x <= bounds.maxX; x += 20) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 20) {
                const suitability = this.calculateForestSuitability(x, y, elevationModule, hydrologyModule);
                
                if (suitability > 0.5) {
                    candidates.push({ x, y, suitability });
                }
            }
        }
        
        return candidates.sort((a, b) => b.suitability - a.suitability);
    }
    
    calculateForestSuitability(x, y, elevationModule, hydrologyModule) {
        let suitability = 0;
        
        // Check elevation requirements
        const elevation = elevationModule.getElevationAt(x, y);
        if (elevation < this.config.forestElevationMin || elevation > this.config.forestElevationMax) {
            return 0;
        }
        
        // Above tree line?
        if (elevation > this.config.treeLineElevation) {
            return 0;
        }
        
        // Elevation suitability
        const elevationSuit = this.smoothStep(1 - Math.abs(elevation - 0.5) / 0.3);
        suitability += elevationSuit * 0.4;
        
        // Check moisture requirements
        let moisture = 0.3; // Base moisture
        if (hydrologyModule) {
            moisture = hydrologyModule.getMoistureLevel(x, y);
            
            // Don't place forests in water
            if (hydrologyModule.isWaterAt(x, y)) {
                return 0;
            }
        }
        
        if (moisture >= this.config.forestMoistureMin) {
            const moistureSuit = Math.min(1, moisture / 0.8);
            suitability += moistureSuit * 0.4;
        }
        
        // Check slope (forests prefer moderate slopes)
        const gradient = elevationModule.getGradient(x, y, 3);
        const slopeSuit = gradient.magnitude > 0.05 && gradient.magnitude < 0.2 ? 1 : 0.5;
        suitability += slopeSuit * 0.2;
        
        return Math.max(0, Math.min(1, suitability));
    }
    
    generateForests(worldContext, elevationModule, hydrologyModule) {
        const candidates = this.identifyForestAreas(worldContext, elevationModule, hydrologyModule);
        let forestsPlaced = 0;
        
        for (const candidate of candidates) {
            if (forestsPlaced >= this.config.forestCount) break;
            
            // Check spacing from existing forests
            const tooClose = this.forests.some(forest => 
                this.distance(forest.centerX, forest.centerY, candidate.x, candidate.y) < this.config.forestSpacing
            );
            
            if (!tooClose) {
                const forestSize = this.config.minForestSize + 
                                 this.seededRandom(candidate.x + candidate.y, 1000) * 
                                 (this.config.maxForestSize - this.config.minForestSize);
                
                const forest = {
                    centerX: candidate.x,
                    centerY: candidate.y,
                    width: forestSize,
                    height: forestSize * (0.8 + this.seededRandom(candidate.x * 2 + candidate.y, 1000) * 0.4),
                    density: this.config.forestDensity,
                    type: this.determineForestType(candidate, elevationModule, hydrologyModule),
                    clearings: []
                };
                
                // Generate clearings within the forest
                if (this.config.clearingsEnabled) {
                    forest.clearings = this.generateClearings(forest, worldContext);
                }
                
                this.forests.push(forest);
                forestsPlaced++;
            }
        }
        
        console.log(`Generated ${this.forests.length} forests`);
    }
    
    determineForestType(candidate, elevationModule, hydrologyModule) {
        const elevation = elevationModule.getElevationAt(candidate.x, candidate.y);
        const moisture = hydrologyModule ? hydrologyModule.getMoistureLevel(candidate.x, candidate.y) : 0.5;
        
        if (elevation > 0.6 && moisture < 0.6) {
            return 'coniferous'; // High, dry
        } else if (moisture > 0.7) {
            return 'rainforest'; // Very wet
        } else if (elevation < 0.4) {
            return 'lowland'; // Low elevation
        } else {
            return 'mixed'; // Default
        }
    }
    
    generateClearings(forest, worldContext) {
        const clearings = [];
        const numClearings = Math.floor((forest.width * forest.height) / 2000) + 1;
        
        for (let i = 0; i < numClearings; i++) {
            if (this.seededRandom(forest.centerX + forest.centerY + i, 1000) < this.config.clearingChance) {
                const offsetX = (this.seededRandom(forest.centerX + i * 1000, 1000) - 0.5) * forest.width * 0.6;
                const offsetY = (this.seededRandom(forest.centerY + i * 2000, 1000) - 0.5) * forest.height * 0.6;
                
                const radius = this.config.minClearingRadius + 
                             this.seededRandom(i * 3000, 1000) * 
                             (this.config.maxClearingRadius - this.config.minClearingRadius);
                
                clearings.push({
                    x: forest.centerX + offsetX,
                    y: forest.centerY + offsetY,
                    radius: radius,
                    type: 'natural'
                });
            }
        }
        
        return clearings;
    }
    
    generateGrasslands(worldContext, elevationModule, hydrologyModule) {
        const bounds = worldContext.getWorldBounds();
        
        // Grasslands fill areas that aren't forested, too dry for forests, or at wrong elevation
        for (let x = bounds.minX; x <= bounds.maxX; x += 25) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 25) {
                const elevation = elevationModule.getElevationAt(x, y);
                
                if (elevation >= this.config.grasslandElevationMin && 
                    elevation <= this.config.grasslandElevationMax) {
                    
                    // Don't place grasslands in water
                    if (hydrologyModule && hydrologyModule.isWaterAt(x, y)) continue;
                    
                    // Don't place grasslands in existing forests
                    if (this.isInForest(x, y)) continue;
                    
                    const moisture = hydrologyModule ? hydrologyModule.getMoistureLevel(x, y) : 0.4;
                    
                    if (moisture >= this.config.grasslandMoistureMin) {
                        const size = 20 + this.seededRandom(x + y, 1000) * 30;
                        
                        this.grasslands.push({
                            centerX: x,
                            centerY: y,
                            radius: size,
                            density: 0.3 + moisture * 0.3,
                            type: moisture > 0.6 ? 'lush_grassland' : 'dry_grassland'
                        });
                    }
                }
            }
        }
        
        console.log(`Generated ${this.grasslands.length} grassland areas`);
    }
    
    calculateVegetationCoverage(worldContext, elevationModule, hydrologyModule) {
        const bounds = worldContext.getWorldBounds();
        
        for (let x = bounds.minX; x <= bounds.maxX; x += 3) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 3) {
                const coverage = this.getVegetationCoverageAt(x, y, elevationModule, hydrologyModule);
                
                if (coverage.type !== 'none') {
                    this.vegetationMap.set(`${x},${y}`, coverage);
                }
            }
        }
    }
    
    getVegetationCoverageAt(x, y, elevationModule, hydrologyModule) {
        // Check if in forest
        for (const forest of this.forests) {
            if (this.isInForestArea(x, y, forest)) {
                // Check if in a clearing
                const inClearing = forest.clearings.some(clearing => 
                    this.distance(x, y, clearing.x, clearing.y) <= clearing.radius
                );
                
                if (inClearing) {
                    return { type: 'clearing', density: 0.1, forestType: forest.type };
                } else {
                    return { type: 'forest', density: forest.density, forestType: forest.type };
                }
            }
        }
        
        // Check if in grassland
        for (const grassland of this.grasslands) {
            if (this.distance(x, y, grassland.centerX, grassland.centerY) <= grassland.radius) {
                return { type: 'grassland', density: grassland.density, grasslandType: grassland.type };
            }
        }
        
        // Check for sparse vegetation based on conditions
        const elevation = elevationModule.getElevationAt(x, y);
        const moisture = hydrologyModule ? hydrologyModule.getMoistureLevel(x, y) : 0.3;
        
        if (elevation > this.config.treeLineElevation) {
            return { type: 'alpine', density: 0.1 };
        } else if (moisture < 0.2) {
            return { type: 'desert', density: 0.05 };
        } else if (elevation > 0.2 && moisture > 0.3) {
            return { type: 'scrubland', density: 0.2 };
        }
        
        return { type: 'none', density: 0 };
    }
    
    isInForest(x, y) {
        return this.forests.some(forest => this.isInForestArea(x, y, forest));
    }
    
    isInForestArea(x, y, forest) {
        const dx = x - forest.centerX;
        const dy = y - forest.centerY;
        
        const normalizedDx = dx / (forest.width / 2);
        const normalizedDy = dy / (forest.height / 2);
        const distance = Math.sqrt(normalizedDx * normalizedDx + normalizedDy * normalizedDy);
        
        return distance <= 1;
    }
    
    affectsPosition(x, y, worldContext) {
        if (!worldContext.isInBounds(x, y)) return false;
        
        const coverage = this.vegetationMap.get(`${Math.floor(x/3)*3},${Math.floor(y/3)*3}`);
        return coverage && coverage.type !== 'none';
    }
    
    getDataAt(x, y, worldContext) {
        const elevationModule = worldContext.getModule('elevation');
        const hydrologyModule = worldContext.getModule('hydrology');
        
        const coverage = this.getVegetationCoverageAt(x, y, elevationModule, hydrologyModule);
        
        let terrain = null;
        let features = [];
        
        switch (coverage.type) {
            case 'forest':
                terrain = 'forest';
                features.push(`forest-${coverage.forestType}`, `density-${coverage.density.toFixed(1)}`);
                break;
            case 'clearing':
                terrain = 'plains'; // Clearings are essentially plains
                features.push('forest-clearing');
                break;
            case 'grassland':
                terrain = 'plains';
                features.push(`grassland-${coverage.grasslandType}`);
                break;
            case 'scrubland':
                terrain = 'plains';
                features.push('scrubland');
                break;
            case 'alpine':
                terrain = 'foothills'; // Alpine areas are like high foothills
                features.push('alpine-vegetation');
                break;
            case 'desert':
                terrain = 'desert';
                features.push('arid');
                break;
        }
        
        return {
            terrain,
            features,
            vegetationData: coverage
        };
    }
    
    getEmptyResult() {
        return {
            forests: [],
            grasslands: [],
            vegetationMap: new Map()
        };
    }
    
    // Public API for other modules
    getForests() {
        return this.forests;
    }
    
    getGrasslands() {
        return this.grasslands;
    }
    
    getVegetationAt(x, y) {
        const key = `${Math.floor(x/3)*3},${Math.floor(y/3)*3}`;
        return this.vegetationMap.get(key) || { type: 'none', density: 0 };
    }
    
    isForested(x, y) {
        const vegetation = this.getVegetationAt(x, y);
        return vegetation.type === 'forest';
    }
    
    getVegetationDensity(x, y) {
        const vegetation = this.getVegetationAt(x, y);
        return vegetation.density || 0;
    }
}

// Register the module
window.TerrainModuleRegistry.registerModuleType('vegetation', VegetationModule);