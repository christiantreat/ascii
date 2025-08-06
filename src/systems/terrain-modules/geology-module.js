// === GEOLOGY MODULE ===
// File: src/systems/terrain-modules/geology-module.js
// The foundation layer that determines rock types and soil quality

class GeologyModule extends TerrainModuleBase {
    constructor(config = {}) {
        super('geology', config);
        this.priority = 120; // HIGHEST priority - geology is the foundation
        this.dependencies = []; // Nothing depends on geology, geology depends on nothing
        
        // Storage for geological data
        this.rockTypeMap = new Map(); // What rock type is at each location
        this.soilQualityMap = new Map(); // Soil quality derived from rock weathering
        this.geologicalFormations = []; // Major rock formations (like granite intrusions)
    }
    
    getDefaultConfig() {
        return {
            // === ROCK FORMATION SETTINGS ===
            formations: [
                // Hard rock formations (become hills and mountains)
                {
                    type: 'granite_intrusion',
                    count: 2,              // 2 granite formations
                    minRadius: 40,         // Minimum size
                    maxRadius: 80,         // Maximum size  
                    rockType: 'hard',      // Creates hard rock
                    elevationEffect: 0.6   // Strong elevation boost
                },
                
                // Soft rock formations (become valleys)
                {
                    type: 'limestone_beds',
                    count: 3,              // 3 limestone areas
                    minRadius: 30,
                    maxRadius: 60,
                    rockType: 'soft',      // Creates soft rock
                    elevationEffect: -0.3  // Lowers elevation (valleys)
                },
                
                // Clay formations (hold water)
                {
                    type: 'clay_deposits',
                    count: 4,              // 4 clay areas
                    minRadius: 20,
                    maxRadius: 40,
                    rockType: 'clay',      // Creates clay
                    elevationEffect: -0.1  // Slightly lower (flat areas)
                }
            ],
            
            // === ROCK TYPE PROPERTIES ===
            rockProperties: {
                'hard': {
                    erosionResistance: 0.9,    // Hard to erode
                    soilQuality: 0.2,          // Poor, thin soil
                    waterRetention: 0.1,       // Water runs off
                    elevationBonus: 0.4        // Forms high areas
                },
                'soft': {
                    erosionResistance: 0.3,    // Erodes easily
                    soilQuality: 0.8,          // Rich, deep soil  
                    waterRetention: 0.4,       // Moderate water retention
                    elevationBonus: -0.2       // Forms valleys
                },
                'clay': {
                    erosionResistance: 0.5,    // Medium erosion
                    soilQuality: 0.6,          // Good soil when not waterlogged
                    waterRetention: 0.9,       // Holds water (creates wetlands)
                    elevationBonus: -0.1       // Slightly low (flat)
                }
            },
            
            // === GENERATION SETTINGS ===
            baseRockType: 'soft',          // Default rock type (limestone)
            noiseAmount: 0.1,              // Random variation in rock types
            formationOverlap: true,        // Allow formations to overlap
            weatheringEffect: 0.3          // How much weathering affects soil
        };
    }
    
    generate(worldContext) {
        console.log("Generating geological foundation...");
        
        // Clear previous data
        this.rockTypeMap.clear();
        this.soilQualityMap.clear();
        this.geologicalFormations = [];
        
        const bounds = worldContext.getWorldBounds();
        
        // Step 1: Create major geological formations
        this.generateGeologicalFormations(worldContext, bounds);
        
        // Step 2: Fill in the rock type map for every position
        this.generateRockTypeMap(worldContext, bounds);
        
        // Step 3: Calculate soil quality based on rock weathering
        this.generateSoilMap(worldContext, bounds);
        
        console.log(`Generated ${this.geologicalFormations.length} geological formations`);
        
        return {
            rockTypeMap: this.rockTypeMap,
            soilQualityMap: this.soilQualityMap,
            formations: this.geologicalFormations
        };
    }
    
    generateGeologicalFormations(worldContext, bounds) {
        // Create each type of geological formation
        this.config.formations.forEach(formationType => {
            for (let i = 0; i < formationType.count; i++) {
                const formation = this.createFormation(formationType, bounds, worldContext.config.seed + i * 1000);
                if (formation) {
                    this.geologicalFormations.push(formation);
                }
            }
        });
        
        console.log(`Created formations: ${this.geologicalFormations.map(f => f.type).join(', ')}`);
    }
    
    createFormation(formationType, bounds, seed) {
        // Pick a random location for this formation
        const centerX = bounds.minX + 30 + this.seededRandom(seed, 1000) * (bounds.maxX - bounds.minX - 60);
        const centerY = bounds.minY + 30 + this.seededRandom(seed + 1000, 1000) * (bounds.maxY - bounds.minY - 60);
        
        // Pick a random size within the specified range
        const radius = formationType.minRadius + 
                      this.seededRandom(seed + 2000, 1000) * 
                      (formationType.maxRadius - formationType.minRadius);
        
        return {
            id: this.geologicalFormations.length,
            type: formationType.type,
            centerX: Math.floor(centerX),
            centerY: Math.floor(centerY),
            radius: radius,
            rockType: formationType.rockType,
            elevationEffect: formationType.elevationEffect,
            strength: 0.8 + this.seededRandom(seed + 3000, 1000) * 0.4 // 0.8 to 1.2 strength
        };
    }
    
    generateRockTypeMap(worldContext, bounds) {
        // For every position in the world, determine what rock type it has
        for (let x = bounds.minX; x <= bounds.maxX; x += 2) { // Sample every 2 units for performance
            for (let y = bounds.minY; y <= bounds.maxY; y += 2) {
                const rockType = this.determineRockTypeAt(x, y);
                this.rockTypeMap.set(`${x},${y}`, rockType);
            }
        }
    }
    
    determineRockTypeAt(x, y) {
        let dominantRockType = this.config.baseRockType; // Start with default (limestone)
        let strongestInfluence = 0;
        
        // Check influence from each geological formation
        this.geologicalFormations.forEach(formation => {
            const distance = this.distance(x, y, formation.centerX, formation.centerY);
            
            if (distance < formation.radius) {
                // We're inside this formation - calculate its influence
                const influence = (1 - distance / formation.radius) * formation.strength;
                
                if (influence > strongestInfluence) {
                    strongestInfluence = influence;
                    dominantRockType = formation.rockType;
                }
            }
        });
        
        // Add some geological noise for realism
        const noise = this.noise(x * 0.01, y * 0.01, 12345);
        if (noise > 0.7 && this.seededRandom(x * 1337 + y, 1000) > 0.8) {
            // Occasional random rock intrusions
            const rockTypes = ['hard', 'soft', 'clay'];
            dominantRockType = rockTypes[Math.floor(this.seededRandom(x + y * 1000, 1000) * 3)];
        }
        
        return dominantRockType;
    }
    
    generateSoilMap(worldContext, bounds) {
        // Calculate soil quality based on rock type and weathering
        for (let x = bounds.minX; x <= bounds.maxX; x += 2) {
            for (let y = bounds.minY; y <= bounds.maxY; y += 2) {
                const rockType = this.getRockTypeAt(x, y);
                const soilQuality = this.calculateSoilQuality(x, y, rockType);
                this.soilQualityMap.set(`${x},${y}`, soilQuality);
            }
        }
    }
    
    calculateSoilQuality(x, y, rockType) {
        const rockProps = this.config.rockProperties[rockType];
        let soilQuality = rockProps.soilQuality;
        
        // Weathering makes soil slightly better over time (adds variation)
        const weathering = this.noise(x * 0.02, y * 0.02, 54321) * this.config.weatheringEffect;
        soilQuality = Math.max(0, Math.min(1, soilQuality + weathering));
        
        return soilQuality;
    }
    
    // === PUBLIC API FOR OTHER MODULES ===
    
    getRockTypeAt(x, y) {
        // Check exact position first
        const exact = this.rockTypeMap.get(`${x},${y}`);
        if (exact) return exact;
        
        // Find nearest sampled position (we sample every 2 units)
        const nearX = Math.round(x / 2) * 2;
        const nearY = Math.round(y / 2) * 2;
        const near = this.rockTypeMap.get(`${nearX},${nearY}`);
        if (near) return near;
        
        // Default fallback
        return this.config.baseRockType;
    }
    
    getSoilQualityAt(x, y) {
        // Check exact position first  
        const exact = this.soilQualityMap.get(`${x},${y}`);
        if (exact !== undefined) return exact;
        
        // Find nearest sampled position
        const nearX = Math.round(x / 2) * 2;
        const nearY = Math.round(y / 2) * 2;
        const near = this.soilQualityMap.get(`${nearX},${nearY}`);
        if (near !== undefined) return near;
        
        // Calculate on-demand if not found
        const rockType = this.getRockTypeAt(x, y);
        return this.config.rockProperties[rockType].soilQuality;
    }
    
    getErosionResistanceAt(x, y) {
        const rockType = this.getRockTypeAt(x, y);
        return this.config.rockProperties[rockType].erosionResistance;
    }
    
    getWaterRetentionAt(x, y) {
        const rockType = this.getRockTypeAt(x, y);
        return this.config.rockProperties[rockType].waterRetention;
    }
    
    getElevationInfluenceAt(x, y) {
        const rockType = this.getRockTypeAt(x, y);
        let influence = this.config.rockProperties[rockType].elevationBonus;
        
        // Add influence from nearby geological formations
        this.geologicalFormations.forEach(formation => {
            const distance = this.distance(x, y, formation.centerX, formation.centerY);
            if (distance < formation.radius) {
                const formationInfluence = (1 - distance / formation.radius) * formation.elevationEffect * formation.strength;
                influence += formationInfluence * 0.3; // Moderate formation influence
            }
        });
        
        return influence;
    }
    
    // === TERRAIN MODULE INTERFACE ===
    
    affectsPosition(x, y, worldContext) {
        return worldContext.isInBounds(x, y);
    }
    
    getDataAt(x, y, worldContext) {
        const rockType = this.getRockTypeAt(x, y);
        const soilQuality = this.getSoilQualityAt(x, y);
        
        return {
            terrain: null, // Geology doesn't directly create visible terrain
            features: [`rock-${rockType}`, `soil-${soilQuality.toFixed(1)}`],
            geologicalData: {
                rockType: rockType,
                soilQuality: soilQuality,
                erosionResistance: this.getErosionResistanceAt(x, y),
                waterRetention: this.getWaterRetentionAt(x, y),
                elevationInfluence: this.getElevationInfluenceAt(x, y)
            }
        };
    }
    
    // === UTILITY AND DEBUG ===
    
    getFormations() {
        return this.geologicalFormations;
    }
    
    getStats() {
        const rockCounts = { hard: 0, soft: 0, clay: 0 };
        
        // Count rock types (sample a subset for performance)
        for (const [key, rockType] of this.rockTypeMap) {
            rockCounts[rockType] = (rockCounts[rockType] || 0) + 1;
        }
        
        return {
            formations: this.geologicalFormations.length,
            rockDistribution: rockCounts,
            totalSamples: this.rockTypeMap.size
        };
    }
}

// Register the module with the terrain system
window.TerrainModuleRegistry.registerModuleType('geology', GeologyModule);