// === ENHANCED RIVER RENDERING SYSTEM ===
// File: src/systems/river-system.js
// NEW FILE - Creates flowing, connected rivers that look realistic

class RiverSystem {
    constructor() {
        // River rendering data
        this.riverTiles = new Map(); // Position -> river tile info
        this.riverConnections = new Map(); // Position -> connection info
        
        // River symbols for different flow directions and types
        this.riverSymbols = {
            // Basic flow directions
            'horizontal': '═',      // ═ flowing left-right
            'vertical': '║',        // ║ flowing up-down
            'northeast': '╗',       // ╗ flowing to northeast
            'northwest': '╔',       // ╔ flowing to northwest  
            'southeast': '╝',       // ╝ flowing to southeast
            'southwest': '╚',       // ╚ flowing to southwest
            
            // T-junctions and confluences
            'junction_north': '╦',  // ╦ river joins from north
            'junction_south': '╩',  // ╩ river joins from south
            'junction_east': '╣',   // ╣ river joins from east
            'junction_west': '╠',   // ╠ river joins from west
            'confluence': '╬',      // ╬ multiple rivers meet
            
            // Special river features
            'source': '●',          // ● spring/source
            'mouth': '▼',           // ▼ river mouth (flows into lake/sea)
            'rapids': '≈',          // ≈ fast-flowing section
            'default': '~'          // ~ fallback generic water
        };
    }
    
    // Main method: Process rivers from hydrology data and create flowing visuals
    processRivers(hydrologyData) {
        console.log("🌊 Processing rivers for flowing visualization...");
        
        this.riverTiles.clear();
        this.riverConnections.clear();
        
        if (!hydrologyData || !hydrologyData.rivers) {
            console.warn("No river data found");
            return;
        }
        
        // Step 1: Mark all river tiles and their flow directions
        hydrologyData.rivers.forEach((river, riverIndex) => {
            this.processRiverPath(river, riverIndex);
        });
        
        // Step 2: Detect confluences (where rivers meet)
        this.detectConfluences();
        
        // Step 3: Calculate final symbols for each river tile
        this.calculateRiverSymbols();
        
        console.log(`🌊 Processed ${hydrologyData.rivers.length} rivers with ${this.riverTiles.size} flowing tiles`);
    }
    
    // Process a single river's path to determine flow directions
    processRiverPath(river, riverIndex) {
        const path = river.path;
        if (!path || path.length < 2) return;
        
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const key = `${point.x},${point.y}`;
            
            // Determine what type of river tile this is
            let tileType = 'middle';
            if (i === 0) tileType = 'source';
            else if (i === path.length - 1) tileType = 'mouth';
            
            // Calculate flow direction from this tile
            let flowDirection = null;
            if (i < path.length - 1) {
                const nextPoint = path[i + 1];
                flowDirection = this.calculateFlowDirection(point, nextPoint);
            }
            
            // Store river tile information
            if (!this.riverTiles.has(key)) {
                this.riverTiles.set(key, {
                    x: point.x,
                    y: point.y,
                    rivers: [], // Multiple rivers can flow through same tile
                    tileType: tileType,
                    flowDirections: [],
                    finalSymbol: '~'
                });
            }
            
            // Add this river's contribution to the tile
            const tile = this.riverTiles.get(key);
            tile.rivers.push({
                riverId: riverIndex,
                riverName: river.id || `river_${riverIndex}`,
                flow: river.flow || 0.5,
                tileType: tileType
            });
            
            if (flowDirection) {
                tile.flowDirections.push(flowDirection);
            }
        }
    }
    
    // Calculate the flow direction between two points
    calculateFlowDirection(fromPoint, toPoint) {
        const dx = toPoint.x - fromPoint.x;
        const dy = toPoint.y - fromPoint.y;
        
        // Normalize to basic directions
        const dirX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
        const dirY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
        
        // Convert to direction name
        if (dirX === 0 && dirY === -1) return 'north';
        if (dirX === 0 && dirY === 1) return 'south';
        if (dirX === -1 && dirY === 0) return 'west';
        if (dirX === 1 && dirY === 0) return 'east';
        if (dirX === 1 && dirY === -1) return 'northeast';
        if (dirX === -1 && dirY === -1) return 'northwest';
        if (dirX === 1 && dirY === 1) return 'southeast';
        if (dirX === -1 && dirY === 1) return 'southwest';
        
        return 'unknown';
    }
    
    // Detect where multiple rivers meet (confluences)
    detectConfluences() {
        for (const [key, tile] of this.riverTiles) {
            if (tile.rivers.length > 1) {
                // Multiple rivers flow through this tile
                tile.isConfluence = true;
                console.log(`🌊 Confluence detected at (${tile.x}, ${tile.y}) - ${tile.rivers.length} rivers meet`);
            }
        }
    }
    
    // Calculate the final symbol for each river tile based on flow directions
    calculateRiverSymbols() {
        for (const [key, tile] of this.riverTiles) {
            tile.finalSymbol = this.determineRiverSymbol(tile);
        }
    }
    
    // Determine the best symbol for a river tile based on its properties
    determineRiverSymbol(tile) {
        // Handle special cases first
        if (tile.isConfluence) {
            return this.riverSymbols.confluence; // ╬
        }
        
        // Handle source and mouth
        if (tile.rivers.some(r => r.tileType === 'source')) {
            return this.riverSymbols.source; // ●
        }
        
        if (tile.rivers.some(r => r.tileType === 'mouth')) {
            return this.riverSymbols.mouth; // ▼
        }
        
        // Handle flow directions
        const directions = [...new Set(tile.flowDirections)]; // Remove duplicates
        
        if (directions.length === 0) {
            return this.riverSymbols.default; // ~
        }
        
        // Single direction flows
        if (directions.length === 1) {
            const dir = directions[0];
            switch (dir) {
                case 'north':
                case 'south':
                    return this.riverSymbols.vertical; // ║
                case 'east':
                case 'west':
                    return this.riverSymbols.horizontal; // ═
                case 'northeast':
                    return this.riverSymbols.northeast; // ╗
                case 'northwest':
                    return this.riverSymbols.northwest; // ╔
                case 'southeast':
                    return this.riverSymbols.southeast; // ╝
                case 'southwest':
                    return this.riverSymbols.southwest; // ╚
                default:
                    return this.riverSymbols.default; // ~
            }
        }
        
        // Multiple directions - determine best junction symbol
        return this.determineJunctionSymbol(directions);
    }
    
    // Determine junction symbol when river has multiple flow directions
    determineJunctionSymbol(directions) {
        const dirSet = new Set(directions);
        
        // Check for T-junctions (three-way intersections)
        if (dirSet.has('north') && dirSet.has('east') && dirSet.has('west')) {
            return this.riverSymbols.junction_north; // ╦
        }
        if (dirSet.has('south') && dirSet.has('east') && dirSet.has('west')) {
            return this.riverSymbols.junction_south; // ╩
        }
        if (dirSet.has('north') && dirSet.has('south') && dirSet.has('east')) {
            return this.riverSymbols.junction_east; // ╣
        }
        if (dirSet.has('north') && dirSet.has('south') && dirSet.has('west')) {
            return this.riverSymbols.junction_west; // ╠
        }
        
        // Check for straight-through flows
        if ((dirSet.has('north') && dirSet.has('south')) || 
            (dirSet.has('northeast') && dirSet.has('southwest')) ||
            (dirSet.has('northwest') && dirSet.has('southeast'))) {
            return this.riverSymbols.vertical; // ║
        }
        
        if ((dirSet.has('east') && dirSet.has('west')) ||
            (dirSet.has('northeast') && dirSet.has('southwest')) ||
            (dirSet.has('northwest') && dirSet.has('southeast'))) {
            return this.riverSymbols.horizontal; // ═
        }
        
        // Default to confluence symbol for complex intersections
        return this.riverSymbols.confluence; // ╬
    }
    
    // Public API: Check if position has a river
    hasRiverAt(x, y) {
        return this.riverTiles.has(`${x},${y}`);
    }
    
    // Public API: Get river information at position
    getRiverAt(x, y) {
        return this.riverTiles.get(`${x},${y}`) || null;
    }
    
    // Public API: Get river symbol for rendering
    getRiverSymbol(x, y) {
        const tile = this.riverTiles.get(`${x},${y}`);
        return tile ? tile.finalSymbol : null;
    }
    
    // Public API: Get all river tiles (for debugging)
    getAllRiverTiles() {
        return Array.from(this.riverTiles.values());
    }
    
    // Debug: Print river statistics
    debugRiverStats() {
        const stats = {
            totalTiles: this.riverTiles.size,
            confluences: 0,
            sources: 0,
            mouths: 0,
            symbolCounts: {}
        };
        
        for (const tile of this.riverTiles.values()) {
            if (tile.isConfluence) stats.confluences++;
            if (tile.rivers.some(r => r.tileType === 'source')) stats.sources++;
            if (tile.rivers.some(r => r.tileType === 'mouth')) stats.mouths++;
            
            const symbol = tile.finalSymbol;
            stats.symbolCounts[symbol] = (stats.symbolCounts[symbol] || 0) + 1;
        }
        
        console.log("🌊 River System Statistics:", stats);
        return stats;
    }
}