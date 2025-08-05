// === TERRAIN SYSTEM WITH LAYERED TREE FEATURES ===
// File: src/systems/terrain-system.js

class TerrainSystem {
    constructor() {
        this.terrainTypes = {
            plains: { symbol: '▓', className: 'terrain-grass', name: 'Plains' },
            foothills: { symbol: '▒', className: 'terrain-hills', name: 'Foothills' },
            river: { symbol: '~', className: 'terrain-water', name: 'River' },
            lake: { symbol: '▀', className: 'terrain-water', name: 'Lake' },
            unknown: { symbol: '░', className: 'terrain-unknown', name: 'Unknown' },
            fog: { symbol: '▓', className: 'terrain-fog', name: 'Unknown' },
            explored: { symbol: '░', className: 'terrain-explored', name: 'Explored' }
        };
        
        // NEW: Feature types (things that go ON TOP of terrain)
        this.featureTypes = {
            tree_trunk: { symbol: '♠', className: 'feature-tree-trunk', name: 'Tree Trunk' },
            tree_canopy: { symbol: '♠', className: 'feature-tree-canopy', name: 'Tree Canopy' }
        };
        
        // World boundaries
        this.worldBounds = {
            minX: -100,
            maxX: 100,  
            minY: -100,
            maxY: 100
        };
        
        // Fog of war settings
        this.fogOfWarEnabled = true;
        this.visionRadius = 3;
        this.forwardVisionRange = 12;
        this.exploredRadius = 2;
        this.coneAngle = 150;
        
        // Player facing direction
        this.playerFacing = { x: 0, y: -1 };
        
        // NEW: Tree system
        this.trees = []; // Array of tree objects
        this.treeFeatures = new Map(); // Map of position -> tree feature data
        
        // NEW: Deer AI system
        this.deerManager = null; // Will be initialized after world generation
        
        // Initialize world generation
        this.initializeSimpleWorld();
        
        // Cache for generated cells
        this.world = new Map();
        
        // Track explored areas
        this.exploredAreas = new Set();
        
        this.calibrateDisplay();
    }
    
    initializeSimpleWorld() {
        console.log("Initializing world with tree features...");
        
        this.worldGenerator = new SimpleWorldGenerator({
            centerX: 0,
            centerY: 0,
            regionSize: 200,
            seed: Math.floor(Math.random() * 10000)
        });
        
        this.worldGenerator.generateWorld(0, 0);
        this.classifier = new SimpleTerrainClassifier(this.worldGenerator);
        this.renderer = new TerrainRenderer(this.terrainTypes, this.featureTypes); // Pass both terrain and feature types
        
        // NEW: Generate trees after basic terrain
        this.generateTrees();
        
        // NEW: Initialize deer system after trees are placed
        this.deerManager = new DeerManager(this);
        
        console.log("World generation complete!");
        this.logWorldStats();
    }
    
    // === NEW: TREE GENERATION SYSTEM ===
    
    generateTrees() {
        console.log("Generating trees...");
        
        this.trees = [];
        this.treeFeatures.clear();
        
        // Generate forest patches
        this.generateForestPatches();
        
        // Generate scattered individual trees
        this.generateScatteredTrees();
        
        console.log(`Generated ${this.trees.length} trees`);
    }
    
    generateForestPatches() {
        const numPatches = 3 + Math.floor(this.seededRandom(12345, 1000) * 3); // 3-5 patches
        
        for (let patchIndex = 0; patchIndex < numPatches; patchIndex++) {
            // Pick a center for the forest patch
            const centerX = this.worldBounds.minX + 20 + Math.floor(this.seededRandom(patchIndex * 1000, 1000) * (this.worldBounds.maxX - this.worldBounds.minX - 40));
            const centerY = this.worldBounds.minY + 20 + Math.floor(this.seededRandom(patchIndex * 2000, 1000) * (this.worldBounds.maxY - this.worldBounds.minY - 40));
            
            // Only place forest patches on suitable terrain (plains)
            if (!this.isGoodTreeLocation(centerX, centerY)) continue;
            
            const patchSize = 15 + Math.floor(this.seededRandom(patchIndex * 3000, 1000) * 10); // 15-24 tile radius
            const treeDensity = 0.3 + this.seededRandom(patchIndex * 4000, 1000) * 0.3; // 30-60% density
            
            // Place trees within the patch
            for (let attempts = 0; attempts < patchSize * 2; attempts++) {
                if (this.seededRandom(patchIndex * 5000 + attempts, 1000) > treeDensity) continue;
                
                const angle = this.seededRandom(patchIndex * 6000 + attempts, 1000) * Math.PI * 2;
                const distance = this.seededRandom(patchIndex * 7000 + attempts, 1000) * patchSize;
                
                const treeX = Math.floor(centerX + Math.cos(angle) * distance);
                const treeY = Math.floor(centerY + Math.sin(angle) * distance);
                
                if (this.canPlaceTree(treeX, treeY)) {
                    this.placeTree(treeX, treeY, 9); // ALL TREES ARE 3x3 (9 tiles)
                }
            }
        }
    }
    
    generateScatteredTrees() {
        const numScattered = 8 + Math.floor(this.seededRandom(99999, 1000) * 8); // 8-15 scattered trees
        
        for (let i = 0; i < numScattered; i++) {
            for (let attempts = 0; attempts < 20; attempts++) { // Try up to 20 times to place each tree
                const x = this.worldBounds.minX + 10 + Math.floor(this.seededRandom(i * 1000 + attempts, 1000) * (this.worldBounds.maxX - this.worldBounds.minX - 20));
                const y = this.worldBounds.minY + 10 + Math.floor(this.seededRandom(i * 2000 + attempts, 1000) * (this.worldBounds.maxY - this.worldBounds.minY - 20));
                
                if (this.canPlaceTree(x, y)) {
                    this.placeTree(x, y, 9); // ALL TREES ARE 3x3 (9 tiles)
                    break;
                }
            }
        }
    }
    
    canPlaceTree(x, y) {
        // Check if location is suitable for a tree
        if (!this.isGoodTreeLocation(x, y)) return false;
        
        // Check minimum distance from existing trees (avoid trunk overlap)
        const minDistance = 2;
        for (const tree of this.trees) {
            const distance = Math.sqrt((tree.trunkX - x) ** 2 + (tree.trunkY - y) ** 2);
            if (distance < minDistance) return false;
        }
        
        return true;
    }
    
    isGoodTreeLocation(x, y) {
        // Trees can only be placed on plains terrain
        const terrainType = this.classifier.classifyTerrain(x, y);
        if (terrainType !== 'plains') return false;
        
        // Make sure we're not too close to world boundaries
        const margin = 2;
        if (x < this.worldBounds.minX + margin || x > this.worldBounds.maxX - margin ||
            y < this.worldBounds.minY + margin || y > this.worldBounds.maxY - margin) {
            return false;
        }
        
        return true;
    }
    
    placeTree(trunkX, trunkY, size) {
        const tree = {
            id: this.trees.length,
            trunkX: trunkX,
            trunkY: trunkY,
            size: 9, // ALL TREES ARE 3x3
            width: 3, // Always 3x3
            height: 3 // Always 3x3
        };
        
        this.trees.push(tree);
        
        // Calculate tree layout
        const startX = trunkX - Math.floor(tree.width / 2);
        const startY = trunkY - Math.floor(tree.height / 2);
        
        // Place tree features on the map
        for (let dx = 0; dx < tree.width; dx++) {
            for (let dy = 0; dy < tree.height; dy++) {
                const featureX = startX + dx;
                const featureY = startY + dy;
                const key = `${featureX},${featureY}`;
                
                // Determine if this is the trunk or canopy
                const isTrunk = (featureX === trunkX && featureY === trunkY);
                
                this.treeFeatures.set(key, {
                    type: isTrunk ? 'tree_trunk' : 'tree_canopy',
                    treeId: tree.id,
                    trunkX: trunkX,
                    trunkY: trunkY,
                    renderOrder: trunkY * 1000 + trunkX // For layering (higher Y renders on top)
                });
            }
        }
    }
    
    // === ENHANCED TERRAIN/FEATURE SYSTEM ===
    
    getTerrainAt(x, y, playerX = null, playerY = null) {
        if (!this.isValidPosition(x, y)) {
            return {
                ...this.terrainTypes.unknown,
                terrain: 'unknown',
                feature: null,
                discovered: false
            };
        }
        
        const key = this.getWorldKey(x, y);
        if (!this.world.has(key)) {
            this.generateCell(x, y);
        }
        
        const cell = this.world.get(key);
        
        // Get feature information
        const feature = this.getFeatureAt(x, y);
        
        // Determine what to display (feature takes priority over terrain)
        let displaySymbol, displayClassName, displayName;
        
        if (feature) {
            displaySymbol = this.featureTypes[feature.type].symbol;
            displayClassName = this.featureTypes[feature.type].className;
            displayName = this.featureTypes[feature.type].name;
        } else {
            displaySymbol = this.terrainTypes[cell.terrain].symbol;
            displayClassName = this.terrainTypes[cell.terrain].className;
            displayName = this.terrainTypes[cell.terrain].name;
        }
        
        // Create base terrain object
        let baseTerrain = {
            symbol: displaySymbol,
            className: displayClassName,
            name: displayName,
            terrain: cell.terrain,
            feature: feature,
            discovered: cell.discovered,
            elevation: cell.elevation
        };
        
        // NEW: Let deer manager modify the terrain if there's a deer here
        if (this.deerManager) {
            baseTerrain = this.deerManager.renderDeer(x, y, baseTerrain);
        }
        
        // Apply fog of war
        if (this.fogOfWarEnabled && playerX !== null && playerY !== null) {
            const isInVision = this.isInVision(x, y, playerX, playerY);
            const isExplored = this.isExplored(x, y);
            
            if (!isInVision && !isExplored) {
                return {
                    ...this.terrainTypes.fog,
                    terrain: 'fog',
                    feature: null,
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
    
    getFeatureAt(x, y) {
        const key = `${x},${y}`;
        return this.treeFeatures.get(key) || null;
    }
    
    generateCell(x, y) {
        const key = this.getWorldKey(x, y);
        
        const terrainType = this.classifier.classifyTerrain(x, y);
        const elevation = this.worldGenerator.getElevationAt(x, y);
        const analysis = this.worldGenerator.analyzePosition(x, y);
        
        const cell = {
            terrain: terrainType,
            discovered: false,
            elevation: elevation,
            analysis: analysis,
            walkable: this.isTerrainWalkable(terrainType)
        };
        
        this.world.set(key, cell);
        return cell;
    }
    
    // === ENHANCED MOVEMENT AND VISION ===
    
    isTerrainWalkable(terrainType) {
        const unwalkableTerrains = ['lake'];
        return !unwalkableTerrains.includes(terrainType);
    }
    
    canMoveTo(x, y) {
        // Check basic terrain walkability
        if (!this.isValidPosition(x, y)) return false;
        
        const key = this.getWorldKey(x, y);
        if (!this.world.has(key)) {
            this.generateCell(x, y);
        }
        
        const cell = this.world.get(key);
        if (!this.isTerrainWalkable(cell.terrain)) return false;
        
        // Check if there's a blocking feature (tree trunk)
        const feature = this.getFeatureAt(x, y);
        if (feature && feature.type === 'tree_trunk') {
            return false; // Can't walk through tree trunks
        }
        
        // Tree canopy allows movement (walking under the tree)
        return true;
    }
    
    // Enhanced vision system that considers tree blocking
    isInVision(x, y, playerX, playerY) {
        const dx = x - playerX;
        const dy = y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Base circular vision around player
        if (distance <= this.visionRadius) {
            return this.hasLineOfSight(playerX, playerY, x, y);
        }
        
        // Extended cone vision in facing direction
        if (distance <= this.forwardVisionRange) {
            const targetAngle = Math.atan2(dy, dx);
            const facingAngle = this.getPlayerFacingAngle();
            
            let angleDiff = Math.abs(targetAngle - facingAngle);
            if (angleDiff > Math.PI) {
                angleDiff = 2 * Math.PI - angleDiff;
            }
            
            const coneHalfAngle = (this.coneAngle * Math.PI) / (180 * 2);
            
            if (angleDiff <= coneHalfAngle) {
                return this.hasLineOfSight(playerX, playerY, x, y);
            }
        }
        
        return false;
    }
    
    // NEW: Line of sight calculation - trees are visible but block vision beyond them
    hasLineOfSight(fromX, fromY, toX, toY) {
        // Simple line of sight using Bresenham's line algorithm
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);
        const x0 = fromX;
        const y0 = fromY;
        const n = 1 + dx + dy;
        const x_inc = (toX > fromX) ? 1 : -1;
        const y_inc = (toY > fromY) ? 1 : -1;
        let error = dx - dy;
        
        let x = x0;
        let y = y0;
        
        for (let i = 0; i < n; i++) {
            // Check if we've reached the target position
            if (x === toX && y === toY) {
                return true; // We can see the target tile (even if it's a tree)
            }
            
            // Skip the starting position for blocking checks
            if (i > 0) {
                // Check if this position blocks vision to tiles BEYOND it
                const feature = this.getFeatureAt(x, y);
                if (feature && (feature.type === 'tree_trunk' || feature.type === 'tree_canopy')) {
                    return false; // This tree blocks vision to anything beyond it
                }
            }
            
            if (error > 0) {
                x += x_inc;
                error -= dy;
            } else {
                y += y_inc;
                error += dx;
            }
        }
        
        return true; // Clear line of sight
    }
    
    // === REST OF THE EXISTING METHODS ===
    
    logWorldStats() {
        const elevationData = this.worldGenerator.getModuleData('elevation');
        const hydrologyData = this.worldGenerator.getModuleData('hydrology');
        
        console.log("World Statistics:");
        console.log(`- Hills: ${elevationData?.hills?.length || 0}`);
        console.log(`- Rivers: ${hydrologyData?.rivers?.length || 0}`);
        console.log(`- Lakes: ${hydrologyData?.lakes?.length || 0}`);
        console.log(`- Trees: ${this.trees.length}`);
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
    
    updatePlayerFacing(deltaX, deltaY) {
        if (deltaX !== 0 || deltaY !== 0) {
            this.playerFacing = { x: deltaX, y: deltaY };
        }
    }
    
    getPlayerFacingAngle() {
        return Math.atan2(this.playerFacing.y, this.playerFacing.x);
    }
    
    toggleFogOfWar() {
        this.fogOfWarEnabled = !this.fogOfWarEnabled;
        return this.fogOfWarEnabled;
    }
    
    setVisionRadius(radius) {
        this.visionRadius = Math.max(1, radius);
    }
    
    setForwardVisionRange(range) {
        this.forwardVisionRange = Math.max(this.visionRadius, range);
    }
    
    setConeAngle(angle) {
        this.coneAngle = Math.max(30, Math.min(180, angle));
    }
    
    setExploredRadius(radius) {
        this.exploredRadius = Math.max(0, radius);
    }
    
    updateExploration(playerX, playerY) {
        // Mark tiles in the small exploration radius
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
        
        // Mark all currently visible tiles as explored
        const maxVisionRange = Math.max(this.visionRadius, this.forwardVisionRange);
        
        for (let dx = -maxVisionRange; dx <= maxVisionRange; dx++) {
            for (let dy = -maxVisionRange; dy <= maxVisionRange; dy++) {
                const x = playerX + dx;
                const y = playerY + dy;
                
                if (this.isInVision(x, y, playerX, playerY)) {
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
    
    getWorldKey(x, y) {
        return `${x},${y}`;
    }
    
    seededRandom(seed, range = 1000) {
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x));
    }
    
    renderTerrain(gameArea, playerX, playerY) {
        if (this.fogOfWarEnabled) {
            this.updateExploration(playerX, playerY);
        }
        
        const viewDims = this.renderer.getViewDimensions(gameArea);
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
    
    clearExploration() {
        this.exploredAreas.clear();
        this.world.forEach(cell => {
            cell.discovered = false;
        });
    }
    
    getFogOfWarStatus() {
        const facingDirection = this.playerFacing;
        const facingName = this.getFacingDirectionName();
        
        return {
            enabled: this.fogOfWarEnabled,
            visionRadius: this.visionRadius,
            forwardVisionRange: this.forwardVisionRange,
            coneAngle: this.coneAngle,
            exploredRadius: this.exploredRadius,
            exploredCount: this.exploredAreas.size,
            facing: facingName,
            facingVector: facingDirection
        };
    }
    
    getFacingDirectionName() {
        const { x, y } = this.playerFacing;
        if (x === 0 && y === -1) return 'North';
        if (x === 0 && y === 1) return 'South';
        if (x === -1 && y === 0) return 'West';
        if (x === 1 && y === 0) return 'East';
        if (x === -1 && y === -1) return 'Northwest';
        if (x === 1 && y === -1) return 'Northeast';
        if (x === -1 && y === 1) return 'Southwest';
        if (x === 1 && y === 1) return 'Southeast';
        return 'Unknown';
    }
    
    regenerateWorld(centerX = 0, centerY = 0) {
        console.log("Regenerating world with trees...");
        this.world.clear();
        this.exploredAreas.clear();
        
        this.worldGenerator.generateWorld(centerX, centerY);
        this.generateTrees(); // Regenerate trees too
        this.logWorldStats();
        
        console.log("World regenerated successfully!");
    }
    
    regenerateModule(moduleName) {
        console.log(`Regenerating ${moduleName} module...`);
        this.worldGenerator.regenerateModule(moduleName);
        this.world.clear();
        
        console.log(`${moduleName} module regenerated!`);
    }
    
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
    
    getTerrainStatistics() {
        const bounds = this.getWorldBounds();
        const stats = {};
        let totalSamples = 0;
        
        for (let x = bounds.minX; x <= bounds.maxX; x += 8) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 8) {
                const terrain = this.classifier.classifyTerrain(x, y);
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
    }
}