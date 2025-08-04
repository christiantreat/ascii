class InputHandler {
    constructor(game) {
        this.game = game;
        this.setupKeyboardInput();
    }
    
    setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            // Handle special keys first
            if (this.handleSpecialInput(e)) return;
            
            // Handle undo/redo (higher priority)
            if (this.handleUndoRedoInput(e)) return;
            
            // Then handle movement
            this.handleMovementInput(e);
        });
    }
    
    handleSpecialInput(e) {
        // Fog of War controls
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            const fogEnabled = this.game.terrainSystem.toggleFogOfWar();
            this.game.uiController.showMessage(
                fogEnabled ? 'Fog of War: ON' : 'Fog of War: OFF', 
                2000
            );
            this.game.render();
            return true;
        }
        
        // Clear exploration (for debugging)
        if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.game.terrainSystem.clearExploration();
            this.game.uiController.showMessage('Exploration cleared', 1500);
            this.game.render();
            return true;
        }
        
        // Increase exploration radius
        if (e.key === ']') {
            e.preventDefault();
            const currentRadius = this.game.terrainSystem.exploredRadius;
            this.game.terrainSystem.setExploredRadius(currentRadius + 1);
            this.game.uiController.showMessage(`Exploration radius: ${currentRadius + 1}`, 1500);
            this.game.render();
            return true;
        }
        
        // Decrease exploration radius
        if (e.key === '[') {
            e.preventDefault();
            const currentRadius = this.game.terrainSystem.exploredRadius;
            const newRadius = Math.max(0, currentRadius - 1);
            this.game.terrainSystem.setExploredRadius(newRadius);
            this.game.uiController.showMessage(`Exploration radius: ${newRadius}`, 1500);
            this.game.render();
            return true;
        }
        
        // Increase vision radius
        if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            const currentRadius = this.game.terrainSystem.visionRadius;
            this.game.terrainSystem.setVisionRadius(currentRadius + 1);
            this.game.uiController.showMessage(`Vision radius: ${currentRadius + 1}`, 1500);
            this.game.render();
            return true;
        }
        
        // Decrease vision radius
        if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            const currentRadius = this.game.terrainSystem.visionRadius;
            const newRadius = Math.max(1, currentRadius - 1);
            this.game.terrainSystem.setVisionRadius(newRadius);
            this.game.uiController.showMessage(`Vision radius: ${newRadius}`, 1500);
            this.game.render();
            return true;
        }
        
        // Show fog of war status
        if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            const status = this.game.terrainSystem.getFogOfWarStatus();
            const message = `FoW: ${status.enabled ? 'ON' : 'OFF'} | Vision: ${status.visionRadius} | Explored: ${status.exploredCount}`;
            this.game.uiController.showMessage(message, 3000);
            return true;
        }
        
        // Quick terrain configuration
        if (e.key === '1') {
            e.preventDefault();
            this.game.terrainSystem.quickConfigElevation('flat').regenerateWorld();
            this.game.uiController.showMessage('Terrain: Flat plains', 2000);
            this.game.render();
            return true;
        }
        
        if (e.key === '2') {
            e.preventDefault();
            this.game.terrainSystem.quickConfigElevation('hilly').regenerateWorld();
            this.game.uiController.showMessage('Terrain: Rolling hills', 2000);
            this.game.render();
            return true;
        }
        
        if (e.key === '3') {
            e.preventDefault();
            this.game.terrainSystem.quickConfigElevation('mountainous').regenerateWorld();
            this.game.uiController.showMessage('Terrain: Mountainous', 2000);
            this.game.render();
            return true;
        }
        
        if (e.key === '4') {
            e.preventDefault();
            this.game.terrainSystem.quickConfigElevation('volcanic').regenerateWorld();
            this.game.uiController.showMessage('Terrain: Volcanic', 2000);
            this.game.render();
            return true;
        }
        
        // Module controls
        if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.game.terrainSystem.regenerateModule('elevation');
            this.game.uiController.showMessage('Elevation regenerated', 1500);
            this.game.render();
            return true;
        }
        
        if (e.key === 'w' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.game.terrainSystem.regenerateModule('hydrology');
            this.game.uiController.showMessage('Water systems regenerated', 1500);
            this.game.render();
            return true;
        }
        
        if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.game.terrainSystem.regenerateModule('vegetation');
            this.game.uiController.showMessage('Vegetation regenerated', 1500);
            this.game.render();
            return true;
        }
        
        // Module toggle
        if (e.key === 'm' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const status = this.game.terrainSystem.getModuleStatus();
            const moduleNames = status.map(m => `${m.name}: ${m.enabled ? 'ON' : 'OFF'}`).join(' | ');
            this.game.uiController.showMessage(`Modules: ${moduleNames}`, 4000);
            return true;
        }
        
        // Terrain statistics
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const stats = this.game.terrainSystem.getTerrainStatistics();
            const top3 = Object.entries(stats.percentages)
                .sort(([,a], [,b]) => parseFloat(b) - parseFloat(a))
                .slice(0, 3)
                .map(([terrain, percent]) => `${terrain}: ${percent}%`)
                .join(' | ');
            this.game.uiController.showMessage(`Terrain: ${top3}`, 4000);
            return true;
        }
        
        // Show terrain analysis
        if (e.key === 't' || e.key === 'T') {
            e.preventDefault();
            const analysis = this.game.terrainSystem.getTerrainAnalysis(
                this.game.player.x, 
                this.game.player.y
            );
            const message = `Terrain: ${analysis.terrain} | Elev: ${analysis.elevation.toFixed(2)} | Settlement: ${analysis.suitability.settlement.toFixed(2)}`;
            this.game.uiController.showMessage(message, 4000);
            return true;
        }
        
        // Regenerate world
        if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.game.terrainSystem.regenerateWorld();
            this.game.uiController.showMessage('World regenerated!', 2000);
            this.game.render();
            return true;
        }
        
        // Toggle instructions
        if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            this.game.uiController.toggleInstructions();
            return true;
        }
        
        return false;
    }
    
    handleUndoRedoInput(e) {
        // Only process if Ctrl or Cmd is held
        if (!(e.ctrlKey || e.metaKey)) return false;
        
        if (e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.game.undo();
            return true;
        }
        
        // Handle both Ctrl+Y and Ctrl+Shift+Z for redo
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
            e.preventDefault();
            this.game.redo();
            return true;
        }
        
        return false;
    }
    
    handleMovementInput(e) {
        const movementMap = {
            'ArrowUp': { x: 0, y: -1 },
            'ArrowDown': { x: 0, y: 1 },
            'ArrowLeft': { x: -1, y: 0 },
            'ArrowRight': { x: 1, y: 0 },
            // Also support WASD keys
            'w': { x: 0, y: -1 },
            'W': { x: 0, y: -1 },
            's': { x: 0, y: 1 },
            'S': { x: 0, y: 1 },
            'a': { x: -1, y: 0 },
            'A': { x: -1, y: 0 },
            'd': { x: 1, y: 0 },
            'D': { x: 1, y: 0 }
        };
        
        const movement = movementMap[e.key];
        if (movement) {
            e.preventDefault(); // Prevent page scrolling with arrow keys
            this.game.executeCommand('move', movement);
        }
    }
    
    // Method to handle mouse clicks in the future
    setupMouseInput() {
        // Future: Handle mouse clicks for movement or interaction
    }
}