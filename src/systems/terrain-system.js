// === TERRAIN SYSTEM MODULE ===
// File: terrain-system.js
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
            unknown: { symbol: '░', className: 'terrain-unknown', name: 'Unknown' }
        };
        
        // World boundaries
        this.worldBounds = {
            minX: -200,
            maxX: 200,
            minY: -200,
            maxY: 200
        };
        
        // Initialize modular components
        this.worldGenerator = new WorldGenerator();
        this.worldGenerator.generateWorld(0, 0);
        
        this.classifier = new TerrainClassifier(this.worldGenerator.getWorldFeatures());
        this.renderer = new TerrainRenderer(this.terrainTypes);
        
        // Cache for generated cells
        this.world = new Map();
        this.gridWidth = 1;
        this.gridHeight = 1;
    }
    
    // World boundary methods
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
    
    // Main terrain generation method
   getTerrainAt(x, y) {
    if (!this.isValidPosition(x, y)) {
        return this.terrainTypes.unknown;
    }
    
    const key = this.getWorldKey(x, y);
    if (!this.world.has(key)) {
        this.generateCell(x, y);
    }
    
    const cell = this.world.get(key);
    return {
        terrain: cell.terrain,
        entity: cell.entity,
        discovered: cell.discovered,
        waterData: cell.waterData
    };
}
    
    generateCell(x, y) {
        const key = `${x},${y}`;
        
        // Use classifier to determine terrain type
        const terrainType = this.classifier.classifyTerrain(x, y);
        
        // Add occasional treasures
        let entity = null;
        if (terrainType !== 'building' && terrainType !== 'village' && terrainType !== 'road' && 
            this.seededRandom(x * 2000 + y * 3000, 10000) < 0.0005) {
            entity = 'treasure';
        }
        
        const terrainData = this.terrainTypes[terrainType] || this.terrainTypes.plains;
        const cell = {
            ...terrainData,
            entity: entity,
            walkable: terrainType !== 'mountain' && terrainType !== 'building' && terrainType !== 'village'
        };
        
        this.world.set(key, cell);
        return cell;
    }
    
    seededRandom(seed, range = 1000) {
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x));
    }
    
    // Rendering method (delegates to renderer)
    renderTerrain(gameArea, cameraStartX, cameraStartY, viewWidth, viewHeight, playerX, playerY) {
        this.renderer.render(
            gameArea, 
            cameraStartX, 
            cameraStartY, 
            viewWidth, 
            viewHeight, 
            playerX, 
            playerY,
            (x, y) => this.getTerrainAt(x, y)  // Pass terrain lookup function
        );
    }
    
    getViewDimensions(gameArea) {
        return this.renderer.getViewDimensions(gameArea);
    }
    
    // Access to world features for other systems
    getWorldFeatures() {
        return this.worldGenerator.getWorldFeatures();
    }
}