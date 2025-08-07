// === FIXED TERRAIN RENDERER MODULE ===
// File: src/systems/terrain-renderer.js
// COMPLETE REPLACEMENT - Fixed grass variation handling in fog of war

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
     * FIXED: Improved terrain class determination with proper fog of war support
     */
getTerrainClassName(terrain, x, y) {
    // If there's a feature (like a tree), use the feature's class
    if (terrain.feature) {
        let className = `symbol ${terrain.feature.type}`;
        if (terrain.className && terrain.className.includes('terrain-explored')) {
            className += ' terrain-explored';
        }
        return className;
    }
    
    // Check if this is a deer entity
    if (terrain.deer) {
        let className = `symbol deer-entity`;
        
        if (terrain.deer && typeof window !== 'undefined' && window.game && 
            window.game.terrainSystem && window.game.terrainSystem.deerManager && 
            window.game.terrainSystem.deerManager.debugMode) {
            
            const playerX = window.game.player.x;
            const playerY = window.game.player.y;
            
            if (terrain.deer.canSeePosition && terrain.deer.canSeePosition(playerX, playerY)) {
                className += ' deer-vision-player';
            }
        }
        
        if (terrain.className && terrain.className.includes('terrain-explored')) {
            className += ' terrain-explored';
        }
        
        return className;
    }
    
    // For plains terrain, use varied grass colors
    if (terrain.terrain === 'plains') {
        const grassVariation = this.getGrassVariation(x, y);
        let className = `symbol ${grassVariation}`;
        
        if (terrain.className && terrain.className.includes('terrain-explored')) {
            className += ' terrain-explored';
        }
        
        return className;
    }
    
    // NEW: For rocky terrain, add variations
    if (terrain.terrain === 'rocks' || terrain.terrain === 'boulders' || terrain.terrain === 'stone') {
        const rockVariation = this.getRockVariation(x, y, terrain.terrain);
        let className = `symbol ${rockVariation}`;
        
        if (terrain.className && terrain.className.includes('terrain-explored')) {
            className += ' terrain-explored';
        }
        
        return className;
    }
    
    // For all other terrain types, preserve fog classes
    let className = `symbol ${terrain.className}`;
    
    if (terrain.className && terrain.className.includes('symbol')) {
        className = terrain.className;
    }
    
    return className;
}

// NEW: Add this method to TerrainRenderer class
getRockVariation(x, y, rockType) {
    // Create consistent variations for each rock type
    const hash = Math.abs((x * 73856093) ^ (y * 19349663));
    const variationCount = 4; // 4 variations per rock type
    const variationIndex = (hash % variationCount) + 1;
    
    return `terrain-${rockType}-${variationIndex}`;
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
                
                // FIXED: Handle rendering priority for tree canopy over player
                if (worldX === playerX && worldY === playerY) {
                    // Check if player is under tree canopy
                    if (terrain.feature && terrain.feature.type === 'tree_canopy') {
                        // Show tree canopy instead of player (player is underneath)
                        symbol = terrain.symbol || '♠';
                        className = this.getTerrainClassName(terrain, worldX, worldY);
                    } else {
                        // Normal player rendering
                        symbol = '◊';
                        className = 'symbol player';
                        
                        // FIXED: Even the player symbol should be dimmed if in explored area
                        if (terrain.className && terrain.className.includes('terrain-explored')) {
                            className += ' terrain-explored';
                        }
                    }
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