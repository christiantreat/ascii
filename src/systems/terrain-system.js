// === UPDATED TERRAIN SYSTEM (SIMPLIFIED) ===
// File: src/systems/terrain-system.js

class TerrainSystem {
    constructor() {
        this.terrainTypes = {
            plains: { symbol: '▓', className: 'terrain-grass', name: 'Plains' },
            foothills: { symbol: '▒', className: 'terrain-hills', name: 'Foothills' },
            river: { symbol: '~', className: 'terrain-water', name: 'River' },
            lake: { symbol: '▀', className: 'terrain-water', name: 'Lake' },
            treasure: { symbol: '◆', className: 'terrain-gold', name: 'Treasure' },
            unknown: { symbol: '░', className: 'terrain-unknown', name: 'Unknown' },
            // Fog of war terrain types
            fog: { symbol: '▓', className: 'terrain-fog', name: 'Unknown' },
            explored: { symbol: '░', className: 'terrain-explored', name: 'Explored' }
        };
        
        // World boundaries
        this.worldBounds = {
            minX: -200,
            maxX: 200,
            minY: -200,
            maxY: 200
        };
        
        // Fog of war settings
        this.fogOfWarEnabled = true;
        this.visionRadius = 3;
        this.exploredRadius = 2;
        
        // Initialize simple world generation
        this.initializeSimpleWorld();
        
        // Cache for generated cells
        this.world = new Map();
        
        // Track explored areas
        this.exploredAreas = new Set();
        
        // Calibrate character dimensions for pixel-perfect rendering
        this.calibrateDisplay();
    }
    
    initializeSimpleWorld() {
        console.log("Initializing simple world generation system...");
        
        // Create simple world generator
        this.worldGenerator = new SimpleWorldGenerator({
            centerX: 0,
            centerY: 0,
            regionSize: 400,
            seed: Math.floor(Math.random() * 10000)
        });
        
        // Generate the world
        this.worldGenerator.generateWorld(0, 0);
        
        // Create simple terrain classifier
        this.classifier = new SimpleTerrainClassifier(this.worldGenerator);
        
        // Initialize renderer
        this.renderer = new TerrainRenderer(this.terrainTypes);
        
        console.log("Simple world generation complete!");
        this.logWorldStats();
    }
    
    logWorldStats() {
        const elevationData = this.worldGenerator.getModuleData('elevation');
        const hydrologyData = this.worldGenerator.getModuleData('hydrology');
        
        console.log("World Statistics:");
        console.log(`- Hills: ${elevationData?.hills?.length || 0}`);
        console.log(`- Rivers: ${hydrologyData?.rivers?.length || 0}`);
        console.log(`- Lakes: ${hydrologyData?.lakes?.length || 0}`);
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
    
    configureElevation(config) {
        this.worldGenerator.configureElevation(config);
        return this;
    }
    
    configureHydrology(config) {
        this.worldGenerator.configureHydrology(config);
        return this;
    }
    
    usePreset(presetName) {
        switch (presetName) {
            case 'rolling':
                this.worldGenerator.createRollingTerrain();
                break;
            case 'flat':
                this.worldGenerator.createFlatTerrain();
                break;
            case 'hilly':
                this.worldGenerator.createHillyTerrain();
                break;
            default:
                console.warn(`Unknown preset: ${presetName}`);
        }
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
        
        // Use simple classifier to determine terrain type
        const terrainType = this.classifier.classifyTerrain(x, y);
        
        // Get additional data from world generator
        const elevation = this.worldGenerator.getElevationAt(x, y);
        const analysis = this.worldGenerator.analyzePosition(x, y);
        
        // Add treasures based on terrain suitability (simplified)
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
        // Don't place in water
        if (['river', 'lake'].includes(terrainType)) {
            return false;
        }
        
        // Simple treasure placement
        let treasureChance = 0.0003;
        
        // Slightly more likely in hills
        if (terrainType === 'foothills') treasureChance *= 1.5;
        
        // Less likely near good settlement areas
        if (analysis.suitability.settlement > 0.5) treasureChance *= 0.5;
        
        return this.seededRandom(x * 2000 + y * 3000, 10000) < treasureChance;
    }
    
    isTerrainWalkable(terrainType) {
        const unwalkableTerrains = ['lake'];
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
        console.log("Regenerating simple world...");
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
    
    // === QUICK CONFIGURATION METHODS ===
    quickConfigElevation(method) {
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
        
        if (configs[method]) {
            this.worldGenerator.configureElevation(configs[method]);
        }
        return this;
    }
    
    quickConfigWater(level) {
        const configs = {
            'dry': { riverCount: 1, lakeCount: 2 },
            'normal': { riverCount: 3, lakeCount: 4 },
            'wet': { riverCount: 5, lakeCount: 6 }
        };
        
        if (configs[level]) {
            this.worldGenerator.configureHydrology(configs[level]);
        }
        return this;
    }
    
    // === TERRAIN STATISTICS ===
    getTerrainStatistics() {
        const bounds = this.getWorldBounds();
        const stats = {};
        let totalSamples = 0;
        
        // Sample terrain types across the world
        for (let x = bounds.minX; x <= bounds.maxX; x += 8) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 8) {
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
}