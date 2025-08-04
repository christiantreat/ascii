// === TERRAIN MODULE BASE CLASSES ===
// File: src/systems/terrain-modules/terrain-module-base.js

class TerrainModuleBase {
    constructor(name, config = {}) {
        this.name = name;
        this.config = { ...this.getDefaultConfig(), ...config };
        this.enabled = true;
        this.priority = 0; // Higher priority modules run first
        this.dependencies = []; // List of module names this depends on
        this.data = new Map(); // Module-specific data storage
    }
    
    // Override in subclasses
    getDefaultConfig() {
        return {};
    }
    
    // Override in subclasses - main generation logic
    generate(worldContext) {
        throw new Error(`Generate method must be implemented in ${this.name} module`);
    }
    
    // Override in subclasses - check if this module affects a position
    affectsPosition(x, y, worldContext) {
        return false;
    }
    
    // Override in subclasses - get data for a specific position
    getDataAt(x, y, worldContext) {
        return null;
    }
    
    // Utility methods available to all modules
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    enable() {
        this.enabled = true;
    }
    
    disable() {
        this.enabled = false;
    }
    
    isEnabled() {
        return this.enabled;
    }
    
    seededRandom(seed, range = 1000) {
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x));
    }
    
    // Helper for smooth interpolation
    smoothStep(x) {
        return x * x * (3 - 2 * x);
    }
    
    // Helper for distance calculations
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    // Helper for noise generation
    noise(x, y, seed = 0) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
    }
}

// === WORLD CONTEXT CLASS ===
class WorldContext {
    constructor(config = {}) {
        this.config = {
            centerX: 0,
            centerY: 0,
            regionSize: 400,
            seed: Math.floor(Math.random() * 10000),
            ...config
        };
        
        this.modules = new Map();
        this.moduleData = new Map();
        this.generationOrder = [];
    }
    
    addModule(module) {
        this.modules.set(module.name, module);
        this.updateGenerationOrder();
    }
    
    removeModule(moduleName) {
        this.modules.delete(moduleName);
        this.moduleData.delete(moduleName);
        this.updateGenerationOrder();
    }
    
    getModule(name) {
        return this.modules.get(name);
    }
    
    getModuleData(name) {
        return this.moduleData.get(name);
    }
    
    setModuleData(name, data) {
        this.moduleData.set(name, data);
    }
    
    updateGenerationOrder() {
        // Sort modules by priority and dependencies
        const modules = Array.from(this.modules.values()).filter(m => m.enabled);
        
        // Simple topological sort for dependencies
        const sorted = [];
        const visited = new Set();
        
        const visit = (module) => {
            if (visited.has(module.name)) return;
            visited.add(module.name);
            
            // Visit dependencies first
            module.dependencies.forEach(depName => {
                const dep = this.modules.get(depName);
                if (dep && dep.enabled) {
                    visit(dep);
                }
            });
            
            sorted.push(module);
        };
        
        modules.forEach(visit);
        
        // Sort by priority within dependency order
        this.generationOrder = sorted.sort((a, b) => b.priority - a.priority);
    }
    
    generateWorld() {
        console.log(`Generating world with ${this.generationOrder.length} modules...`);
        
        // Clear previous data
        this.moduleData.clear();
        
        // Generate in dependency order
        this.generationOrder.forEach(module => {
            console.log(`Running ${module.name} module...`);
            try {
                const result = module.generate(this);
                this.setModuleData(module.name, result);
            } catch (error) {
                console.error(`Error in ${module.name} module:`, error);
            }
        });
        
        console.log("World generation complete!");
    }
    
    getTerrainAt(x, y) {
        // Query all modules to determine terrain at position
        let terrain = 'plains'; // Default
        let features = [];
        
        // Check modules in reverse priority order (higher priority overrides)
        const sortedModules = this.generationOrder.slice().reverse();
        
        for (const module of sortedModules) {
            if (module.affectsPosition(x, y, this)) {
                const moduleData = module.getDataAt(x, y, this);
                if (moduleData && moduleData.terrain) {
                    terrain = moduleData.terrain;
                }
                if (moduleData && moduleData.features) {
                    features.push(...moduleData.features);
                }
            }
        }
        
        return {
            terrain,
            features,
            modules: this.generationOrder.map(m => m.name)
        };
    }
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    // Helper methods for modules
    isInBounds(x, y) {
        const halfSize = this.config.regionSize / 2;
        return x >= this.config.centerX - halfSize && 
               x <= this.config.centerX + halfSize &&
               y >= this.config.centerY - halfSize && 
               y <= this.config.centerY + halfSize;
    }
    
    getWorldBounds() {
        const halfSize = this.config.regionSize / 2;
        return {
            minX: this.config.centerX - halfSize,
            maxX: this.config.centerX + halfSize,
            minY: this.config.centerY - halfSize,
            maxY: this.config.centerY + halfSize
        };
    }
}

// === MODULE REGISTRY ===
class ModuleRegistry {
    constructor() {
        this.moduleTypes = new Map();
    }
    
    registerModuleType(name, moduleClass) {
        this.moduleTypes.set(name, moduleClass);
    }
    
    createModule(type, config = {}) {
        const ModuleClass = this.moduleTypes.get(type);
        if (!ModuleClass) {
            throw new Error(`Unknown module type: ${type}`);
        }
        return new ModuleClass(config);
    }
    
    getAvailableModules() {
        return Array.from(this.moduleTypes.keys());
    }
}

// Global registry instance
window.TerrainModuleRegistry = new ModuleRegistry();