// === CORE TERRAIN SYSTEM (MAIN CONTROLLER) ===
// File: src/systems/terrain-system.js
// This is now just the main coordinator that delegates to specialized subsystems

class TerrainSystem {
    constructor() {
            // Initialize all subsystems
            this.worldSystem = new WorldSystem();
            this.fogSystem = new FogOfWarSystem();
            this.treeSystem = new TreeSystem();
            this.deerSystem = new DeerSystem(this);
            this.renderer = new TerrainRenderer(this.getTerrainTypes(), this.getFeatureTypes());

            // ADDED: Give fog system reference to this terrain system for line of sight blocking
            this.fogSystem.setTerrainSystem(this);

            // Initialize world
            this.initializeWorld();
            this.calibrateDisplay();
        }
    
    // Define terrain and feature types (these could be moved to config files later)
    getTerrainTypes() {
        return {
            plains: { symbol: '▓', className: 'terrain-grass', name: 'Plains' },
            foothills: { symbol: '▒', className: 'terrain-hills', name: 'Foothills' },
            river: { symbol: '~', className: 'terrain-water', name: 'River' },
            lake: { symbol: '▀', className: 'terrain-water', name: 'Lake' },
            unknown: { symbol: '░', className: 'terrain-unknown', name: 'Unknown' },
            fog: { symbol: '▓', className: 'terrain-fog', name: 'Unknown' },
            explored: { symbol: '░', className: 'terrain-explored', name: 'Explored' }
        };
    }
    
    getFeatureTypes() {
        return {
            tree_trunk: { symbol: '♠', className: 'feature-tree-trunk', name: 'Tree Trunk' },
            tree_canopy: { symbol: '♠', className: 'feature-tree-canopy', name: 'Tree Canopy' }
        };
    }
    
    initializeWorld() {
        console.log("Initializing terrain system...");
        
        try {
            // Initialize world generation
            this.worldSystem.initialize();
            
            // Generate trees after basic terrain
            this.treeSystem.generateTrees(this.worldSystem);
            
            // Initialize deer after trees are placed
            this.deerSystem.initialize();
            
            console.log("Terrain system initialization complete!");
            this.logWorldStats();
        } catch (error) {
            console.error("Error initializing terrain system:", error);
            this.createFallbackWorld();
        }
    }
    
    createFallbackWorld() {
        console.log("Creating fallback world due to initialization error...");
        // Create minimal systems that won't crash
        this.treeSystem.clear();
        this.deerSystem.clear();
    }
    
// Main terrain query method - coordinates all subsystems
    getTerrainAt(x, y, playerX = null, playerY = null) {
        if (!this.isValidPosition(x, y)) {
            return this.getTerrainTypes().unknown;
        }
        
        try {
            // Get base terrain from world system
            let terrain = this.worldSystem.getTerrainAt(x, y);
            
            // Add tree features
            const treeFeature = this.treeSystem.getFeatureAt(x, y);
            if (treeFeature) {
                terrain.feature = treeFeature;
                terrain.symbol = this.getFeatureTypes()[treeFeature.type].symbol;
                terrain.className = this.getFeatureTypes()[treeFeature.type].className;
                terrain.name = this.getFeatureTypes()[treeFeature.type].name;
                
                // FIXED: If this is tree canopy, it should render on top of everything
                // This creates the "walking under trees" effect
                if (treeFeature.type === 'tree_canopy') {
                    // Tree canopy takes absolute priority - player/deer are hidden underneath
                    terrain.renderPriority = 'canopy';
                }
            }
            
            // Add deer if present (but only if not under canopy)
            if (!terrain.renderPriority || terrain.renderPriority !== 'canopy') {
                terrain = this.deerSystem.renderDeer(x, y, terrain);
            }
            
            // Apply fog of war
            if (this.fogSystem.isEnabled() && playerX !== null && playerY !== null) {
                terrain = this.fogSystem.applyFogOfWar(x, y, playerX, playerY, terrain);
            }
            
            return terrain;
        } catch (error) {
            console.warn(`Error getting terrain at (${x}, ${y}):`, error);
            return this.getTerrainTypes().unknown;
        }
    }
    
// Movement validation - checks all blocking systems
    canMoveTo(x, y) {
        try {
            if (!this.isValidPosition(x, y)) return false;
            
            // Check basic terrain walkability (water, etc.)
            if (!this.worldSystem.canMoveTo(x, y)) return false;
            
            // Check if trees block movement (ONLY tree trunks should block)
            if (!this.treeSystem.canMoveTo(x, y)) return false;
            
            return true;
        } catch (error) {
            console.warn(`Error checking movement to (${x}, ${y}):`, error);
            return false;
        }
    }
    
    // Player interaction methods
    updatePlayerFacing(deltaX, deltaY) {
        this.fogSystem.updatePlayerFacing(deltaX, deltaY);
    }
    
    onPlayerMoved(playerX, playerY) {
        // Update exploration for fog of war
        if (this.fogSystem.isEnabled()) {
            this.fogSystem.updateExploration(playerX, playerY);
        }
        
        // Notify deer system
        this.deerSystem.onPlayerMoved(playerX, playerY);
    }
    
    // Rendering
    renderTerrain(gameArea, playerX, playerY) {
        try {
            // Update exploration if fog is enabled
            if (this.fogSystem.isEnabled()) {
                this.fogSystem.updateExploration(playerX, playerY);
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
        } catch (error) {
            console.error("Error rendering terrain:", error);
            if (gameArea) {
                gameArea.innerHTML = "Error rendering terrain. Check console for details.";
            }
        }
    }
    
    // World boundaries and validation
    isValidPosition(x, y) {
        return this.worldSystem.isValidPosition(x, y);
    }
    
    getWorldBounds() {
        return this.worldSystem.getWorldBounds();
    }
    
    isAtWorldBoundary(x, y) {
        return this.worldSystem.isAtWorldBoundary(x, y);
    }
    
    // Fog of War controls (delegate to fog system)
    toggleFogOfWar() {
        return this.fogSystem.toggle();
    }
    
    setVisionRadius(radius) {
        this.fogSystem.setVisionRadius(radius);
    }
    
    setForwardVisionRange(range) {
        this.fogSystem.setForwardVisionRange(range);
    }
    
    setConeAngle(angle) {
        this.fogSystem.setConeAngle(angle);
    }
    
    setExploredRadius(radius) {
        this.fogSystem.setExploredRadius(radius);
    }
    
    getFogOfWarStatus() {
        return this.fogSystem.getStatus();
    }
    
    getFacingDirectionName() {
        return this.fogSystem.getFacingDirectionName();
    }
    
    clearExploration() {
        this.fogSystem.clearExploration();
    }
    
    // World generation controls (delegate to world system)
    regenerateWorld(centerX = 0, centerY = 0) {
        try {
            console.log("Regenerating world...");
            this.worldSystem.regenerateWorld(centerX, centerY);
            this.treeSystem.generateTrees(this.worldSystem);
            this.deerSystem.respawnDeer();
            this.fogSystem.clearExploration();
            this.logWorldStats();
            console.log("World regenerated successfully!");
        } catch (error) {
            console.error("Error regenerating world:", error);
        }
    }
    
    regenerateModule(moduleName) {
        this.worldSystem.regenerateModule(moduleName);
        if (moduleName === 'elevation') {
            this.treeSystem.generateTrees(this.worldSystem);
        }
    }
    
    quickConfigElevation(method) {
        this.worldSystem.quickConfigElevation(method);
        return this;
    }
    
    quickConfigWater(level) {
        this.worldSystem.quickConfigWater(level);
        return this;
    }
    
    // Statistics and analysis
    getModuleStatus() {
        return this.worldSystem.getModuleStatus();
    }
    
    getTerrainStatistics() {
        return this.worldSystem.getTerrainStatistics();
    }
    
    getTerrainAnalysis(x, y) {
        return this.worldSystem.getTerrainAnalysis(x, y);
    }
    
    getElevationAt(x, y) {
        return this.worldSystem.getElevationAt(x, y);
    }
    
    getWorldFeatures() {
        return this.worldSystem.getWorldFeatures();
    }
    
    // Feature access methods
    getFeatureAt(x, y) {
        return this.treeSystem.getFeatureAt(x, y);
    }
    
    // Deer system access
    get deerManager() {
        return this.deerSystem;
    }
    
    // Utility methods
    logWorldStats() {
        try {
            const worldStats = this.worldSystem.getStats();
            const treeStats = this.treeSystem.getStats();
            const deerStats = this.deerSystem.getStats();
            
            console.log("World Statistics:");
            console.log(`- Hills: ${worldStats.hills}`);
            console.log(`- Rivers: ${worldStats.rivers}`);
            console.log(`- Lakes: ${worldStats.lakes}`);
            console.log(`- Trees: ${treeStats.treeCount}`);
            console.log(`- Deer: ${deerStats.deerCount}`);
        } catch (error) {
            console.warn("Error logging world stats:", error);
        }
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
    
    getViewDimensions(gameArea) {
        return this.renderer.getViewDimensions(gameArea);
    }
}