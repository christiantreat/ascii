// === TERRAIN RENDERER MODULE (FIXED VERSION) ===
// File: terrain-renderer.js
class TerrainRenderer {
    constructor(terrainTypes, featureTypes = {}) {
        this.terrainTypes = terrainTypes;
        this.featureTypes = featureTypes;
        this.frameCount = 0;
        
        // Character dimensions for pixel-perfect calculation (24px font)
        this.charWidth = 14.4;
        this.charHeight = 24;
        
        // Add varied grass color classes to terrain types
        this.setupVariedGrassColors();
    }
    
    setupVariedGrassColors() {
        // Add the varied grass color options to our terrain types
        this.grassVariations = [
            'terrain-grass-1',
            'terrain-grass-2', 
            'terrain-grass-3',
            'terrain-grass-4',
            'terrain-grass-5',
            'terrain-grass-6',
            'terrain-grass-7',
            'terrain-grass-8'
        ];
    }
    
    /**
     * Gets a consistent grass color variation for a specific tile position
     */
    getGrassVariation(x, y) {
        // Use a simple hash of the coordinates to pick a consistent color
        const hash = Math.abs((x * 73856093) ^ (y * 19349663));
        const variationIndex = hash % this.grassVariations.length;
        return this.grassVariations[variationIndex];
    }
    
    /**
     * FIXED: Simplified terrain class determination
     */
    getTerrainClassName(terrain, x, y) {
        // If there's a feature (like a tree), use the feature's class
        if (terrain.feature) {
            return `symbol ${terrain.feature.type}`;
        }
        
        // FIXED: Check if this is a deer entity
        if (terrain.deer) {
            let className = `symbol deer-entity`;
            
            // Add debug visualization if deer debug mode is on
            if (terrain.deer && typeof window !== 'undefined' && window.game && 
                window.game.terrainSystem && window.game.terrainSystem.deerManager && 
                window.game.terrainSystem.deerManager.debugMode) {
                
                // This will be handled by the debug overlay system
                const playerX = window.game.player.x;
                const playerY = window.game.player.y;
                
                if (terrain.deer.canSeePosition && terrain.deer.canSeePosition(playerX, playerY)) {
                    className += ' deer-vision-player';
                }
            }
            
            return className;
        }
        
        // For plains terrain, use varied grass colors
        if (terrain.terrain === 'plains') {
            const grassVariation = this.getGrassVariation(x, y);
            return `symbol ${grassVariation}`;
        }
        
        // For all other terrain types, use their normal class
        return `symbol ${terrain.className}`;
    }
    
    render(gameArea, cameraStartX, cameraStartY, viewWidth, viewHeight, playerX, playerY, getTerrainFunction) {
        this.frameCount++;
        let display = '';
        
        for (let viewY = 0; viewY < viewHeight; viewY++) {
            for (let viewX = 0; viewX < viewWidth; viewX++) {
                const worldX = cameraStartX + viewX;
                const worldY = cameraStartY + viewY;
                
                let symbol = '░';
                let className = 'symbol terrain-unknown';
                
                // Get terrain information for this tile
                const terrain = getTerrainFunction(worldX, worldY);
                
                // FIXED: Simplified player rendering logic
                if (worldX === playerX && worldY === playerY) {
                    // Always show player as player symbol, regardless of what's underneath
                    symbol = '◊';
                    className = 'symbol player';
                } else {
                    // Use the terrain/feature/deer symbol
                    symbol = terrain.symbol || '░';
                    className = this.getTerrainClassName(terrain, worldX, worldY);
                }
                
                display += `<span class="${className}">${symbol}</span>`;
            }
            
            // Add newline only if not the last row
            if (viewY < viewHeight - 1) {
                display += '\n';
            }
        }
        
        gameArea.innerHTML = display;
    }
    
    getViewDimensions(gameArea) {
        // Calculate exact dimensions that fill the screen perfectly
        const rect = gameArea.getBoundingClientRect();
        
        // Account for any UI elements that reduce available space
        const statusHeight = 50; // Height of status bar
        
        const availableWidth = rect.width;
        const availableHeight = rect.height - statusHeight;
        
        // Calculate how many characters fit exactly
        const width = Math.floor(availableWidth / this.charWidth);
        const height = Math.floor(availableHeight / this.charHeight);
        
        return {
            width: width,
            height: height
        };
    }
    
    // Method to test and calibrate character dimensions
    calibrateCharacterSize() {
        // Create a test element to measure actual character dimensions
        const testDiv = document.createElement('div');
        testDiv.style.position = 'absolute';
        testDiv.style.top = '-1000px';
        testDiv.style.fontFamily = '"Courier New", monospace';
        testDiv.style.fontSize = '24px';
        testDiv.style.lineHeight = '24px';
        testDiv.style.whiteSpace = 'pre';
        testDiv.textContent = '█'.repeat(10); // 10 characters
        
        document.body.appendChild(testDiv);
        const width = testDiv.getBoundingClientRect().width / 10;
        const height = testDiv.getBoundingClientRect().height;
        document.body.removeChild(testDiv);
        
        this.charWidth = width;
        this.charHeight = height;
        
        console.log(`Calibrated character size: ${width}x${height} (24px font)`);
        return { width, height };
    }
    
    /**
     * Debug method to test grass variations
     */
    testGrassVariations() {
        console.log("Testing grass variations for a 5x5 grid:");
        for (let y = 0; y < 5; y++) {
            let row = "";
            for (let x = 0; x < 5; x++) {
                const variation = this.getGrassVariation(x, y);
                const number = variation.split('-')[2];
                row += number + " ";
            }
            console.log(`Row ${y}: ${row}`);
        }
    }
}