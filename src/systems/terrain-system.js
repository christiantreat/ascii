// === MODULAR TERRAIN SYSTEM ===
// File: src/systems/terrain-system.js (Updated)

class TerrainSystem {
    constructor() {
        this.terrainTypes = {
            plains: { symbol: '▓', className: 'terrain-grass', name: 'Plains' },
            forest: { symbol: '♠', className: 'terrain-tree', name: 'Forest' },
            mountain: { symbol: '█', className: 'terrain-stone', name: 'Mountain' },
            foothills: { symbol: '▒', className: 'terrain-hills', name: 'Foothills' },
            river: { symbol: '~', className: 'terrain-water', name: 'River' },
            lake: { symbol: '▀', className: 'terrain-water', name: 'Lake' },
            trail: { symbol: '·', className: 'terrain-path', name: 'Trail' },
            road: { symbol: '═', className: 'terrain-road', name: 'Road' },
            building: { symbol: '▬', className: 'terrain-building', name: 'Building' },
            village: { symbol: '■', className: 'terrain-village', name: 'Village' },
            treasure: { symbol: '◆', className: 'terrain-gold', name: 'Treasure' },
            unknown: { symbol: '░', className: 'terrain-unknown', name: 'Unknown' },
            // New terrain types
            wetland: { symbol: '≈', className: 'terrain-wetland', name: 'Wetland' },
            desert: { symbol: '▄', className: 'terrain-desert', name: 'Desert' },
            // Fog of war terrain types
            fog: { symbol: '▓', className: 'terrain-fog', name: 'Unknown' },
            explored: { symbol: '░', className: 'terrain-explored', name: 'Explored' }
        };
        
        // World boundaries
        this.worldBounds = {
            minX: -300,
            maxX: 300,
            minY: -300,
            maxY: 300
        };
        
        // Fog of war settings
        this.fogOfWarEnabled = true;
        this.visionRadius = 3;
        this.exploredRadius = 2;
        
        // Initialize modular world generation
        this.initializeModularWorld();
        
        // Cache for generated cells
        this.world = new Map();
        
        // Track explored areas
        this.exploredAreas = new Set();
        
        // Calibrate character dimensions for pixel-perfect rendering
        this.calibrateDisplay();
    }
    
    initializeModularWorld() {
        console.log("Initializing modular world generation system...");
        
        // Create modular world generator
        this.worldGenerator = new ModularWorldGenerator({
            centerX: 0,
            centerY: 0,
            regionSize: 600,
            seed: Math.floor(Math.random() * 10000)
        });
        
        // Generate the world
        this.worldGenerator.generateWorld(0, 0);
        
        // Create modular terrain classifier
        this.classifier = new ModularTerrainClassifier(this.worldGenerator);
        
        // Initialize renderer
        this.renderer = new TerrainRenderer(this.terrainTypes);
        
        console.log("Modular world generation complete!");
        this.logWorldStats();
    }
    
    logWorldStats() {
        const elevationData = this.worldGenerator.getModuleData('elevation');
        const hydrologyData = this.worldGenerator.getModuleData('hydrology');
        const vegetationData = this.worldGenerator.getModuleData('vegetation');
        
        console.log("World Statistics:");
        console.log(`- Elevation method: ${elevationData?.method || 'unknown'}`);
        console.log(`- Rivers: ${hydrologyData?.rivers?.length || 0}`);
        console.log(`- Lakes: ${hydrologyData?.lakes?.length || 0}`);
        console.log(`- Springs: ${hydrologyData?.springs?.length || 0}`);
        console.log(`- Forests: ${vegetationData?.forests?.length || 0}`);
        console.log(`- Grasslands: ${vegetationData?.grasslands?.length || 0}`);
    }
    
    calibrateDisplay() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.renderer.calibrateCharacterSize();
            });
        } else {
            this.renderer.calibrateCharacterSize();
        }
    }
    
    // === WORLD CONFIGURATION METHODS ===
    
    setElevationMethod(method, config = {}) {
        this.worldGenerator.configureElevation({ method, ...config });
        return this;
    }
    
    setHydrologyConfig(config) {
        this.worldGenerator.configureHydrology(config);
        return this;
    }
    
    setVegetationConfig(config) {
        this.worldGenerator.configureVegetation(config);
        return this;
    }
    
    usePreset(presetName) {
        switch (presetName) {
            case 'mountainous':
                this.worldGenerator.createMountainousWorld();
                break;
            case 'rolling_hills':
                this.worldGenerator.createRollingHillsWorld();
                break;
            case 'volcanic':
                this.worldGenerator.createVolcanicWorld();
                break;
            case 'ridges':
                this.worldGenerator.createRidgeWorld();
                break;
            default:
                console.warn(`Unknown preset: ${presetName}`);
        }
        return this;
    }
    
    enableModule(moduleName) {
        this.worldGenerator.enableModule(moduleName);
        return this;
    }
    
    disableModule(moduleName) {
        this.worldGenerator.disableModule(moduleName);
        return this;
    }
    
    // === FOG OF WAR METHODS ===
    toggleFogOfWar() {
        this.fogOfWarEnabled = !this.fogOfWarEnabled;
        return this.fogOfWarEnabled;
    }
    
    setVisionRadius(radius) {
        this.visionRadius = Math.max(1, radius);
    }
    
    setExploredRadius(radius) {
        this.exploredRadius = Math.max(0, radius);
    }
    
    updateExploration(playerX, playerY) {
        for (let dx = -this.exploredRadius; dx <= this.exploredRadius; dx++) {
            for (let dy = -this.exploredRadius; dy <= this.exploredRadius; dy++) {
                const x = playerX + dx;
                const y = playerY + dy;
                
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= this.exploredRadius) {
                    this.exploredAreas.add(`${x},${y}`);
                    
                    const key = this.getWorldKey(x, y);
                    if (this.world.has(key)) {
                        this.world.get(key).discovered = true;
                    }
                }
            }
        }
    }
    
    isExplored(x, y) {
        return this.exploredAreas.has(`${x},${y}`);
    }
    
    isInVision(x, y, playerX, playerY) {
        const dx = x - playerX;
        const dy = y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.visionRadius;
    }
    
    // === WORLD BOUNDARY METHODS ===
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
    
    // === TERRAIN GENERATION ===
    getTerrainAt(x, y, playerX = null, playerY = null) {
        if (!this.isValidPosition(x, y)) {
            return {
                ...this.terrainTypes.unknown,
                terrain: 'unknown',
                entity: null,
                discovered: false
            };
        }
        
        const key = this.getWorldKey(x, y);
        if (!this.world.has(key)) {
            this.generateCell(x, y);
        }
        
        const cell = this.world.get(key);
        const baseTerrain = {
            ...this.terrainTypes[cell.terrain],
            terrain: cell.terrain,
            entity: cell.entity,
            discovered: cell.discovered,
            elevation: cell.elevation
        };
        
        // Apply fog of war if enabled and player position is provided
        if (this.fogOfWarEnabled && playerX !== null && playerY !== null) {
            const isInVision = this.isInVision(x, y, playerX, playerY);
            const isExplored = this.isExplored(x, y);
            
            if (!isInVision && !isExplored) {
                return {
                    ...this.terrainTypes.fog,
                    terrain: 'fog',
                    entity: null,
                    discovered: false
                };
            } else if (!isInVision && isExplored) {
                return {
                    ...baseTerrain,
                    className: baseTerrain.className + ' explored'
                };
            }
        }
        
        return baseTerrain;
    }
    
    getWorldKey(x, y) {
        return `${x},${y}`;
    }
    
    generateCell(x, y) {
        const key = this.getWorldKey(x, y);
        
        // Use modular classifier to determine terrain type
        const terrainType = this.classifier.classifyTerrain(x, y);
        
        // Get additional data from world generator
        const elevation = this.worldGenerator.getElevationAt(x, y);
        const analysis = this.worldGenerator.analyzePosition(x, y);
        
        // Add treasures based on terrain suitability
        let entity = null;
        if (this.shouldPlaceTreasure(x, y, terrainType, analysis)) {
            entity = 'treasure';
        }
        
        const cell = {
            terrain: terrainType,
            entity: entity,
            discovered: false,
            elevation: elevation,
            analysis: analysis,
            walkable: this.isTerrainWalkable(terrainType)
        };
        
        this.world.set(key, cell);
        return cell;
    }
    
    shouldPlaceTreasure(x, y, terrainType, analysis) {
        // Don't place treasures in settlements or on roads
        if (['building', 'village', 'road'].includes(terrainType)) {
            return false;
        }
        
        // Don't place in water
        if (['river', 'lake', 'wetland'].includes(terrainType)) {
            return false;
        }
        
        // Base treasure chance
        let treasureChance = 0.0003;
        
        // Increase chance in remote areas (high elevation, low settlement suitability)
        if (analysis.elevation > 0.6) treasureChance *= 2;
        if (analysis.suitability.settlement < 0.3) treasureChance *= 1.5;
        
        // Increase chance in forests and mountains
        if (terrainType === 'forest') treasureChance *= 1.5;
        if (terrainType === 'mountain') treasureChance *= 2;
        
        return this.seededRandom(x * 2000 + y * 3000, 10000) < treasureChance;
    }
    
    isTerrainWalkable(terrainType) {
        const unwalkableTerrains = ['mountain', 'building', 'village', 'lake'];
        return !unwalkableTerrains.includes(terrainType);
    }
    
    seededRandom(seed, range = 1000) {
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x));
    }
    
    // === RENDERING METHOD ===
    renderTerrain(gameArea, playerX, playerY) {
        // Update exploration around player
        if (this.fogOfWarEnabled) {
            this.updateExploration(playerX, playerY);
        }
        
        // Get exact screen dimensions
        const viewDims = this.renderer.getViewDimensions(gameArea);
        
        // Center the view on the player
        const startX = playerX - Math.floor(viewDims.width / 2);
        const startY = playerY - Math.floor(viewDims.height / 2);
        
        this.renderer.render(
            gameArea, 
            startX, 
            startY, 
            viewDims.width, 
            viewDims.height, 
            playerX, 
            playerY,
            (x, y) => this.getTerrainAt(x, y, playerX, playerY)
        );
    }
    
    getViewDimensions(gameArea) {
        return this.renderer.getViewDimensions(gameArea);
    }
    
    // === ACCESS METHODS ===
    getWorldFeatures() {
        return this.worldGenerator.getWorldFeatures();
    }
    
    getElevationAt(x, y) {
        return this.worldGenerator.getElevationAt(x, y);
    }
    
    getTerrainAnalysis(x, y) {
        return this.worldGenerator.analyzePosition(x, y);
    }
    
    getModuleStatus() {
        return this.worldGenerator.getModuleStatus();
    }
    
    // === DEBUG METHODS ===
    clearExploration() {
        this.exploredAreas.clear();
        this.world.forEach(cell => {
            cell.discovered = false;
        });
    }
    
    getFogOfWarStatus() {
        return {
            enabled: this.fogOfWarEnabled,
            visionRadius: this.visionRadius,
            exploredRadius: this.exploredRadius,
            exploredCount: this.exploredAreas.size
        };
    }
    
    regenerateWorld(centerX = 0, centerY = 0) {
        console.log("Regenerating modular world...");
        this.world.clear();
        this.exploredAreas.clear();
        
        // Regenerate the world with current configuration
        this.worldGenerator.generateWorld(centerX, centerY);
        this.logWorldStats();
        
        console.log("World regenerated successfully!");
    }
    
    regenerateModule(moduleName) {
        console.log(`Regenerating ${moduleName} module...`);
        this.worldGenerator.regenerateModule(moduleName);
        
        // Clear cached terrain data to force regeneration
        this.world.clear();
        
        console.log(`${moduleName} module regenerated!`);
    }
    
    // === CONFIGURATION EXPORT/IMPORT ===
    exportConfiguration() {
        return {
            worldGenerator: this.worldGenerator.exportConfiguration(),
            fogOfWar: {
                enabled: this.fogOfWarEnabled,
                visionRadius: this.visionRadius,
                exploredRadius: this.exploredRadius
            },
            worldBounds: this.worldBounds
        };
    }
    
    importConfiguration(config) {
        if (config.worldGenerator) {
            this.worldGenerator.importConfiguration(config.worldGenerator);
        }
        
        if (config.fogOfWar) {
            this.fogOfWarEnabled = config.fogOfWar.enabled;
            this.visionRadius = config.fogOfWar.visionRadius;
            this.exploredRadius = config.fogOfWar.exploredRadius;
        }
        
        if (config.worldBounds) {
            this.worldBounds = { ...config.worldBounds };
        }
        
        // Clear cached data to force regeneration
        this.world.clear();
        this.exploredAreas.clear();
        
        console.log("Configuration imported successfully!");
    }
    
    // === ADVANCED TERRAIN QUERIES ===
    findSuitableLocations(purpose, count = 5, minScore = 0.5) {
        const bounds = this.getWorldBounds();
        const candidates = [];
        
        // Sample locations across the world
        for (let x = bounds.minX; x <= bounds.maxX; x += 20) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 20) {
                const analysis = this.getTerrainAnalysis(x, y);
                const score = analysis.suitability[purpose];
                
                if (score >= minScore) {
                    candidates.push({
                        x, y, score,
                        terrain: analysis.terrain.terrain,
                        elevation: analysis.elevation
                    });
                }
            }
        }
        
        // Sort by score and return top candidates
        candidates.sort((a, b) => b.score - a.score);
        return candidates.slice(0, count);
    }
    
    getTerrainStatistics() {
        const bounds = this.getWorldBounds();
        const stats = {};
        let totalSamples = 0;
        
        // Sample terrain types across the world
        for (let x = bounds.minX; x <= bounds.maxX; x += 10) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 10) {
                const terrain = this.classifier.classifyTerrain(x, y);
                stats[terrain] = (stats[terrain] || 0) + 1;
                totalSamples++;
            }
        }
        
        // Convert to percentages
        const percentages = {};
        Object.keys(stats).forEach(terrain => {
            percentages[terrain] = ((stats[terrain] / totalSamples) * 100).toFixed(1);
        });
        
        return {
            counts: stats,
            percentages: percentages,
            totalSamples: totalSamples
        };
    }
    
    // === QUICK CONFIGURATION METHODS ===
    quickConfigElevation(method) {
        const configs = {
            'flat': { method: 'noise', noiseScale: 0.005, maxElevation: 0.3 },
            'hilly': { method: 'noise', noiseScale: 0.01, maxElevation: 0.7 },
            'mountainous': { method: 'peaks', peaks: [
                { x: -50, y: -100, height: 1.0, radius: 100 },
                { x: 80, y: -60, height: 0.9, radius: 80 }
            ]},
            'volcanic': { method: 'volcanic' },
            'ridges': { method: 'ridges' }
        };
        
        if (configs[method]) {
            this.worldGenerator.configureElevation(configs[method]);
        }
        return this;
    }
    
    quickConfigWater(level) {
        const configs = {
            'dry': { riverCount: 1, lakeCount: 1, wetlandsEnabled: false },
            'normal': { riverCount: 3, lakeCount: 3, wetlandsEnabled: true },
            'wet': { riverCount: 6, lakeCount: 5, wetlandsEnabled: true },
            'flooded': { riverCount: 8, lakeCount: 8, wetlandsEnabled: true }
        };
        
        if (configs[level]) {
            this.worldGenerator.configureHydrology(configs[level]);
        }
        return this;
    }
    
    quickConfigVegetation(density) {
        const configs = {
            'sparse': { forestCount: 2, grasslandsEnabled: false },
            'normal': { forestCount: 4, grasslandsEnabled: true },
            'dense': { forestCount: 8, grasslandsEnabled: true },
            'jungle': { forestCount: 12, grasslandsEnabled: true, forestDensity: 0.9 }
        };
        
        if (configs[density]) {
            this.worldGenerator.configureVegetation(configs[density]);
        }
        return this;
    }
}