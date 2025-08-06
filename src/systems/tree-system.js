// === TREE SYSTEM ===
// File: src/systems/tree-system.js
// Handles all tree generation, placement, and interaction

class TreeSystem {
    constructor() {
        // Tree storage
        this.trees = [];
        this.treeFeatures = new Map(); // Maps position to tree feature data
        
        // Tree generation settings
        this.maxTrees = 50;
        this.minTreeSpacing = 2;
        this.forestPatchCount = 3;
        this.scatteredTreeCount = 15;
    }
    
    generateTrees(worldSystem) {
        console.log("Generating trees...");
        
        this.clear();
        
        try {
            // Generate forest patches
            this.generateForestPatches(worldSystem);
            
            // Generate scattered individual trees
            this.generateScatteredTrees(worldSystem);
            
            console.log(`Generated ${this.trees.length} trees`);
        } catch (error) {
            console.error("Error generating trees:", error);
        }
    }
    
    generateForestPatches(worldSystem) {
        const worldBounds = worldSystem.getWorldBounds();
        const numPatches = 3 + Math.floor(this.seededRandom(12345, 1000) * 3); // 3-5 patches
        
        for (let patchIndex = 0; patchIndex < numPatches; patchIndex++) {
            try {
                // Pick a center for the forest patch
                const centerX = worldBounds.minX + 20 + Math.floor(
                    this.seededRandom(patchIndex * 1000, 1000) * (worldBounds.maxX - worldBounds.minX - 40)
                );
                const centerY = worldBounds.minY + 20 + Math.floor(
                    this.seededRandom(patchIndex * 2000, 1000) * (worldBounds.maxY - worldBounds.minY - 40)
                );
                
                // Only place forest patches on suitable terrain
                if (!this.isGoodTreeLocation(centerX, centerY, worldSystem)) continue;
                
                const patchSize = 15 + Math.floor(this.seededRandom(patchIndex * 3000, 1000) * 10); // 15-24 tile radius
                const treeDensity = 0.3 + this.seededRandom(patchIndex * 4000, 1000) * 0.3; // 30-60% density
                
                // Place trees within the patch
                for (let attempts = 0; attempts < patchSize * 2; attempts++) {
                    if (this.seededRandom(patchIndex * 5000 + attempts, 1000) > treeDensity) continue;
                    
                    const angle = this.seededRandom(patchIndex * 6000 + attempts, 1000) * Math.PI * 2;
                    const distance = this.seededRandom(patchIndex * 7000 + attempts, 1000) * patchSize;
                    
                    const treeX = Math.floor(centerX + Math.cos(angle) * distance);
                    const treeY = Math.floor(centerY + Math.sin(angle) * distance);
                    
                    if (this.canPlaceTree(treeX, treeY, worldSystem)) {
                        this.placeTree(treeX, treeY);
                    }
                }
            } catch (error) {
                console.warn(`Error generating forest patch ${patchIndex}:`, error);
            }
        }
    }
    
    generateScatteredTrees(worldSystem) {
        const worldBounds = worldSystem.getWorldBounds();
        const numScattered = 8 + Math.floor(this.seededRandom(99999, 1000) * 8); // 8-15 scattered trees
        
        for (let i = 0; i < numScattered; i++) {
            try {
                for (let attempts = 0; attempts < 20; attempts++) {
                    const x = worldBounds.minX + 10 + Math.floor(
                        this.seededRandom(i * 1000 + attempts, 1000) * (worldBounds.maxX - worldBounds.minX - 20)
                    );
                    const y = worldBounds.minY + 10 + Math.floor(
                        this.seededRandom(i * 2000 + attempts, 1000) * (worldBounds.maxY - worldBounds.minY - 20)
                    );
                    
                    if (this.canPlaceTree(x, y, worldSystem)) {
                        this.placeTree(x, y);
                        break;
                    }
                }
            } catch (error) {
                console.warn(`Error generating scattered tree ${i}:`, error);
            }
        }
    }
    
    canPlaceTree(x, y, worldSystem) {
        try {
            // Check if location is suitable for a tree
            if (!this.isGoodTreeLocation(x, y, worldSystem)) return false;
            
            // Check minimum distance from existing trees (avoid trunk overlap)
            for (const tree of this.trees) {
                const distance = Math.sqrt((tree.trunkX - x) ** 2 + (tree.trunkY - y) ** 2);
                if (distance < this.minTreeSpacing) return false;
            }
            
            return true;
        } catch (error) {
            console.warn("Error checking tree placement:", error);
            return false;
        }
    }
    
   isGoodTreeLocation(x, y, worldSystem) {
        try {
            // FIXED: Changed from worldSystem.classifier to worldSystem
            if (!worldSystem || !worldSystem.getTerrainAt) {
                return false;
            }
            
            // Get terrain data instead of trying to classify directly
            const terrain = worldSystem.getTerrainAt(x, y);
            if (terrain.terrain !== 'plains') return false;
            
            // Make sure we're not too close to world boundaries
            const bounds = worldSystem.getWorldBounds();
            const margin = 2;
            if (x < bounds.minX + margin || x > bounds.maxX - margin ||
                y < bounds.minY + margin || y > bounds.maxY - margin) {
                return false;
            }
            
            return true;
        } catch (error) {
            console.warn("Error checking tree location:", error);
            return false;
        }
    }
    
    placeTree(trunkX, trunkY) {
        try {
            const tree = {
                id: this.trees.length,
                trunkX: trunkX,
                trunkY: trunkY,
                size: 9, // All trees are 3x3 (9 tiles)
                width: 3, // Always 3x3
                height: 3 // Always 3x3
            };
            
            this.trees.push(tree);
            
            // Calculate tree layout (3x3 centered on trunk)
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
                        renderOrder: trunkY * 1000 + trunkX
                    });
                }
            }
        } catch (error) {
            console.error("Error placing tree:", error);
        }
    }
    
// Query methods
    getFeatureAt(x, y) {
        const key = `${x},${y}`;
        return this.treeFeatures.get(key) || null;
    }
    
    // FIXED: Only tree trunks block movement - canopy allows movement
    canMoveTo(x, y) {
        try {
            // Check if there's a blocking tree feature
            const feature = this.getFeatureAt(x, y);
            
            // ONLY tree trunks block movement - canopy allows walking under
            if (feature && feature.type === 'tree_trunk') {
                return false; // Can't walk through tree trunks
            }
            
            // Tree canopy allows movement (walking under the tree)
            // No tree feature also allows movement
            return true;
        } catch (error) {
            console.warn(`Error checking tree movement to (${x}, ${y}):`, error);
            return true; // Default to allowing movement
        }
    }
    
    // Tree information
    getTreeAt(x, y) {
        const feature = this.getFeatureAt(x, y);
        if (!feature) return null;
        
        return this.trees.find(tree => tree.id === feature.treeId) || null;
    }
    
    getTrees() {
        return [...this.trees]; // Return copy to prevent external modification
    }
    
    // Management methods
    clear() {
        this.trees = [];
        this.treeFeatures.clear();
    }
    
    removeTree(treeId) {
        try {
            const treeIndex = this.trees.findIndex(tree => tree.id === treeId);
            if (treeIndex === -1) return false;
            
            const tree = this.trees[treeIndex];
            
            // Remove tree features from map
            const startX = tree.trunkX - Math.floor(tree.width / 2);
            const startY = tree.trunkY - Math.floor(tree.height / 2);
            
            for (let dx = 0; dx < tree.width; dx++) {
                for (let dy = 0; dy < tree.height; dy++) {
                    const featureX = startX + dx;
                    const featureY = startY + dy;
                    const key = `${featureX},${featureY}`;
                    this.treeFeatures.delete(key);
                }
            }
            
            // Remove tree from array
            this.trees.splice(treeIndex, 1);
            
            // Update tree IDs for remaining trees
            this.trees.forEach((tree, index) => {
                tree.id = index;
            });
            
            return true;
        } catch (error) {
            console.error(`Error removing tree ${treeId}:`, error);
            return false;
        }
    }
    
    // Statistics
    getStats() {
        return {
            treeCount: this.trees.length,
            forestPatches: this.countForestPatches(),
            scatteredTrees: this.countScatteredTrees(),
            maxTrees: this.maxTrees
        };
    }
    
    countForestPatches() {
        // This is a simple approximation - count trees that are close to other trees
        let patchTrees = 0;
        for (const tree of this.trees) {
            const nearbyTrees = this.trees.filter(other => {
                if (other.id === tree.id) return false;
                const distance = Math.sqrt(
                    (other.trunkX - tree.trunkX) ** 2 + (other.trunkY - tree.trunkY) ** 2
                );
                return distance <= 10; // Trees within 10 tiles are considered part of a patch
            });
            if (nearbyTrees.length >= 2) {
                patchTrees++;
            }
        }
        return patchTrees;
    }
    
    countScatteredTrees() {
        return this.trees.length - this.countForestPatches();
    }
    
    // Utility methods
    seededRandom(seed, range = 1000) {
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x));
    }
    
    // Debug methods
    getDebugInfo() {
        return {
            treeCount: this.trees.length,
            featureCount: this.treeFeatures.size,
            trees: this.trees.map(tree => ({
                id: tree.id,
                position: { x: tree.trunkX, y: tree.trunkY },
                size: `${tree.width}x${tree.height}`
            }))
        };
    }
    
    // Line of sight checking (for fog of war integration)
    blocksLineOfSight(x, y) {
        const feature = this.getFeatureAt(x, y);
        return feature && (feature.type === 'tree_trunk' || feature.type === 'tree_canopy');
    }
}