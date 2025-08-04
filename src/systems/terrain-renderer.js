// === TERRAIN RENDERER MODULE ===
// File: terrain-renderer.js
class TerrainRenderer {
    constructor(terrainTypes) {
        this.terrainTypes = terrainTypes;
        this.frameCount = 0;
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
            display += '\n';
        }
        
        gameArea.innerHTML = display;
    }
    
    getViewDimensions(gameArea) {
        const rect = gameArea.getBoundingClientRect();
        return {
            width: Math.floor(rect.width / 8.4),
            height: Math.floor(rect.height / 14)
        };
    }
}