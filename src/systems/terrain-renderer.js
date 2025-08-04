// === TERRAIN RENDERER MODULE ===
// File: terrain-renderer.js
class TerrainRenderer {
    constructor(terrainTypes) {
        this.terrainTypes = terrainTypes;
        this.frameCount = 0;
        
        // Character dimensions for pixel-perfect calculation
        this.charWidth = 7.2;  // Approximate width of Courier New at 12px
        this.charHeight = 12;  // Height matches font-size exactly
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
                
                if (worldX === playerX && worldY === playerY) {
                    symbol = '◊';
                    className = 'symbol player';
                } else {
                    const terrain = getTerrainFunction(worldX, worldY);
                    symbol = terrain.entity === 'treasure' ? 
                             this.terrainTypes.treasure.symbol : terrain.symbol;
                    className = `symbol ${terrain.entity === 'treasure' ? 
                                this.terrainTypes.treasure.className : terrain.className}`;
                }
                
                display += `<span class="${className}">${symbol}</span>`;
            }
            
            // Add newline only if not the last row (prevents extra line at bottom)
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
        const instructionsHeight = 0; // Instructions are overlaid
        
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
        testDiv.style.fontSize = '12px';
        testDiv.style.lineHeight = '12px';
        testDiv.style.whiteSpace = 'pre';
        testDiv.textContent = '█'.repeat(10); // 10 characters
        
        document.body.appendChild(testDiv);
        const width = testDiv.getBoundingClientRect().width / 10;
        const height = testDiv.getBoundingClientRect().height;
        document.body.removeChild(testDiv);
        
        this.charWidth = width;
        this.charHeight = height;
        
        console.log(`Calibrated character size: ${width}x${height}`);
        return { width, height };
    }
}