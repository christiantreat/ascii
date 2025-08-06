// === COMPLETE UPDATED INPUT HANDLER WITH GEOLOGY ===
// File: src/systems/input-handler.js
// COMPLETE REPLACEMENT with geology controls added

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
        
        // Vision controls
        if (e.key === ']') {
            e.preventDefault();
            const currentRadius = this.game.terrainSystem.exploredRadius;
            this.game.terrainSystem.setExploredRadius(currentRadius + 1);
            this.game.uiController.showMessage(`Exploration radius: ${currentRadius + 1}`, 1500);
            this.game.render();
            return true;
        }
        
        if (e.key === '[') {
            e.preventDefault();
            const currentRadius = this.game.terrainSystem.fogSystem.exploredRadius;
            const newRadius = Math.max(0, currentRadius - 1);
            this.game.terrainSystem.setExploredRadius(newRadius);
            this.game.uiController.showMessage(`Exploration radius: ${newRadius}`, 1500);
            this.game.render();
            return true;
        }
        
        // Base vision radius controls
        if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            const currentRadius = this.game.terrainSystem.fogSystem.visionRadius;
            this.game.terrainSystem.setVisionRadius(currentRadius + 1);
            this.game.uiController.showMessage(`Base vision radius: ${currentRadius + 1}`, 1500);
            this.game.render();
            return true;
        }
        
        if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            const currentRadius = this.game.terrainSystem.fogSystem.visionRadius;
            const newRadius = Math.max(1, currentRadius - 1);
            this.game.terrainSystem.setVisionRadius(newRadius);
            this.game.uiController.showMessage(`Base vision radius: ${newRadius}`, 1500);
            this.game.render();
            return true;
        }
        
        // Forward vision controls
        if (e.key === 'q' || e.key === 'Q') {
            e.preventDefault();
            const currentRange = this.game.terrainSystem.fogSystem.forwardVisionRange;
            this.game.terrainSystem.setForwardVisionRange(currentRange + 1);
            this.game.uiController.showMessage(`Forward vision: ${currentRange + 1} tiles`, 1500);
            this.game.render();
            return true;
        }
        
        if (e.key === 'u' || e.key === 'U') {
            e.preventDefault();
            const currentRange = this.game.terrainSystem.fogSystem.forwardVisionRange;
            const newRange = Math.max(this.game.terrainSystem.fogSystem.visionRadius, currentRange - 1);
            this.game.terrainSystem.setForwardVisionRange(newRange);
            this.game.uiController.showMessage(`Forward vision: ${newRange} tiles`, 1500);
            this.game.render();
            return true;
        }
        
        // Cone angle controls
        if (e.key === 'x' || e.key === 'X') {
            e.preventDefault();
            const currentAngle = this.game.terrainSystem.fogSystem.coneAngle;
            const newAngle = Math.min(180, currentAngle + 10);
            this.game.terrainSystem.setConeAngle(newAngle);
            this.game.uiController.showMessage(`Cone angle: ${newAngle}°`, 1500);
            this.game.render();
            return true;
        }
        
        if (e.key === 'v' || e.key === 'V') {
            e.preventDefault();
            const currentAngle = this.game.terrainSystem.fogSystem.coneAngle;
            const newAngle = Math.max(30, currentAngle - 10);
            this.game.terrainSystem.setConeAngle(newAngle);
            this.game.uiController.showMessage(`Cone angle: ${newAngle}°`, 1500);
            this.game.render();
            return true;
        }
        
        // Show vision status
        if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            const status = this.game.terrainSystem.getFogOfWarStatus();
            this.game.uiController.showConeVisionStatus(status);
            return true;
        }
        
        // Deer debug controls
        if (e.key === 'D' && e.shiftKey) {
            e.preventDefault();
            if (this.game.terrainSystem.deerSystem) {
                const debugEnabled = this.game.terrainSystem.deerSystem.toggleDebugMode();
                const deerStates = this.game.terrainSystem.deerSystem.getDeerStates();
                const message = debugEnabled ? 
                    `Deer Debug: ON | W:${deerStates.wandering} A:${deerStates.alert} F:${deerStates.fleeing}` :
                    'Deer Debug: OFF';
                this.game.uiController.showMessage(message, 3000);
                this.game.render();
            }
            return true;
        }
        
        // Scare all deer
        if (e.key === 'S' && e.shiftKey) {
            e.preventDefault();
            if (this.game.terrainSystem.deerSystem) {
                this.game.terrainSystem.deerSystem.scareAllDeer(
                    this.game.player.x, 
                    this.game.player.y
                );
                this.game.uiController.showMessage('All deer scared! Watch them flee!', 2000);
                this.game.render();
            }
            return true;
        }
        
        // Calm all deer
        if (e.key === 'C' && e.shiftKey) {
            e.preventDefault();
            if (this.game.terrainSystem.deerSystem) {
                this.game.terrainSystem.deerSystem.calmAllDeer();
                this.game.uiController.showMessage('All deer calmed down', 2000);
                this.game.render();
            }
            return true;
        }
        
        // Show deer behavior stats
        if (e.key === 'B' && e.shiftKey) {
            e.preventDefault();
            if (this.game.terrainSystem.deerSystem) {
                const stats = this.game.terrainSystem.deerSystem.getDeerBehaviorStats();
                const message = `Deer Stats: ${stats.totalDeer} total | Avg dist: ${stats.averageDistanceFromPlayer} | W:${stats.states.wandering} A:${stats.states.alert} F:${stats.states.fleeing}`;
                this.game.uiController.showMessage(message, 4000);
            }
            return true;
        }
        
        // Respawn deer
        if (e.key === 'R' && e.shiftKey) {
            e.preventDefault();
            if (this.game.terrainSystem.deerSystem) {
                this.game.terrainSystem.deerSystem.respawnDeer();
                this.game.uiController.showMessage('Deer respawned in new locations', 2000);
                this.game.render();
            }
            return true;
        }
        
        // === ORIGINAL TERRAIN CONTROLS ===
        
        // Quick terrain configuration (original)
        if (e.key === '1') {
            e.preventDefault();
            this.game.terrainSystem.quickConfigElevation('flat').regenerateWorld();
            this.game.uiController.showMessage('Terrain: Flat plains', 2000);
            this.game.render();
            return true;
        }
        
        if (e.key === '2') {
            e.preventDefault();
            this.game.terrainSystem.quickConfigElevation('rolling').regenerateWorld();
            this.game.uiController.showMessage('Terrain: Rolling hills', 2000);
            this.game.render();
            return true;
        }
        
        if (e.key === '3') {
            e.preventDefault();
            this.game.terrainSystem.quickConfigElevation('hilly').regenerateWorld();
            this.game.uiController.showMessage('Terrain: Hilly', 2000);
            this.game.render();
            return true;
        }
        
        // Water level controls (original)
        if (e.key === '4') {
            e.preventDefault();
            this.game.terrainSystem.quickConfigWater('dry').regenerateWorld();
            this.game.uiController.showMessage('Water: Dry landscape', 2000);
            this.game.render();
            return true;
        }
        
        if (e.key === '5') {
            e.preventDefault();
            this.game.terrainSystem.quickConfigWater('normal').regenerateWorld();
            this.game.uiController.showMessage('Water: Normal amount', 2000);
            this.game.render();
            return true;
        }
        
        if (e.key === '6') {
            e.preventDefault();
            this.game.terrainSystem.quickConfigWater('wet').regenerateWorld();
            this.game.uiController.showMessage('Water: Lots of water', 2000);
            this.game.render();
            return true;
        }
        
        // === NEW GEOLOGICAL TERRAIN PRESETS ===
        
        if (e.key === '7') {
            e.preventDefault();
            this.game.terrainSystem.worldSystem.worldGenerator.createMountainousWorld();
            this.game.terrainSystem.regenerateWorld();
            this.game.uiController.showMessage('Geology: Mountainous terrain', 2000);
            this.game.render();
            return true;
        }
        
        if (e.key === '8') {
            e.preventDefault();
            this.game.terrainSystem.worldSystem.worldGenerator.createRollingHillsWorld();
            this.game.terrainSystem.regenerateWorld();
            this.game.uiController.showMessage('Geology: Rolling hills', 2000);
            this.game.render();
            return true;
        }
        
        if (e.key === '9') {
            e.preventDefault();
            this.game.terrainSystem.worldSystem.worldGenerator.createFlatPlainsWorld();
            this.game.terrainSystem.regenerateWorld();
            this.game.uiController.showMessage('Geology: Flat plains', 2000);
            this.game.render();
            return true;
        }
        
        if (e.key === '0') {
            e.preventDefault();
            this.game.terrainSystem.worldSystem.worldGenerator.createVolcanicWorld();
            this.game.terrainSystem.regenerateWorld();
            this.game.uiController.showMessage('Geology: Volcanic terrain', 2000);
            this.game.render();
            return true;
        }
        
        // Module controls (original)
        if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.game.terrainSystem.regenerateModule('elevation');
            this.game.uiController.showMessage('Hills regenerated', 1500);
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
        
        // NEW: Geology module control
        if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.game.terrainSystem.regenerateModule('geology');
            this.game.uiController.showMessage('Geology regenerated', 1500);
            this.game.render();
            return true;
        }
        
        // Module status (enhanced)
        if (e.key === 'm' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const status = this.game.terrainSystem.getModuleStatus();
            const moduleNames = status.map(m => `${m.name}: ${m.enabled ? 'ON' : 'OFF'}`).join(' | ');
            this.game.uiController.showMessage(`Modules: ${moduleNames}`, 4000);
            return true;
        }
        
        // Terrain statistics (original)
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
        
        // === ENHANCED TERRAIN ANALYSIS (with geology) ===
        
        if (e.key === 't' || e.key === 'T') {
            e.preventDefault();
            const analysis = this.game.terrainSystem.worldSystem.worldGenerator.analyzePosition(
                this.game.player.x, 
                this.game.player.y
            );
            
            // Show geological information
            const message = `Terrain: ${analysis.terrain} | Rock: ${analysis.geology.rockType} | Soil: ${analysis.geology.soilQuality.toFixed(2)} | Elev: ${analysis.elevation.toFixed(2)} | Settlement: ${analysis.suitability.settlement.toFixed(2)}`;
            this.game.uiController.showMessage(message, 5000);
            return true;
        }
        
        // NEW: Geological details
        if (e.key === 'G' && !e.shiftKey) {
            e.preventDefault();
            const analysis = this.game.terrainSystem.worldSystem.worldGenerator.analyzePosition(
                this.game.player.x, 
                this.game.player.y
            );
            
            const suitableFor = analysis.geology.suitable_for.join(', ') || 'general use';
            const message = `Geology: ${analysis.geology.rockType} rock, soil quality ${analysis.geology.soilQuality.toFixed(2)} | Good for: ${suitableFor}`;
            this.game.uiController.showMessage(message, 4000);
            return true;
        }
        
        // NEW: Show geological statistics
        if (e.key === 'L' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const geologyStats = this.game.terrainSystem.worldSystem.worldGenerator.getGeologyStats();
            const rockTypes = Object.entries(geologyStats.rockDistribution)
                .map(([rock, count]) => `${rock}: ${count}`)
                .join(' | ');
            this.game.uiController.showMessage(`Geology: ${geologyStats.formations} formations | ${rockTypes}`, 4000);
            return true;
        }
        
        // Regenerate world (original)
        if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.game.terrainSystem.regenerateWorld();
            this.game.uiController.showMessage('World regenerated!', 2000);
            this.game.render();
            return true;
        }
        
        // Toggle instructions (original)
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
        
        // Prevent conflict with terrain controls
        if (e.key === 'z' && !e.shiftKey) {
            if (!['e', 'w', 'g', 'm', 's', 'r', 'l'].includes(e.key)) {
                e.preventDefault();
                this.game.undo();
                return true;
            }
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
            // WASD keys - but only if no modifiers are pressed
            'w': { x: 0, y: -1 },
            'W': { x: 0, y: -1 },
            's': { x: 0, y: 1 },
            'S': { x: 0, y: 1 },
            'a': { x: -1, y: 0 },
            'A': { x: -1, y: 0 },
            'd': { x: 1, y: 0 },
            'D': { x: 1, y: 0 }
        };
        
        // Only allow movement if no modifier keys are pressed
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
            return; // Don't handle movement if modifier keys are pressed
        }
        
        const movement = movementMap[e.key];
        if (movement) {
            e.preventDefault(); // Prevent page scrolling with arrow keys
            this.game.executeCommand('move', movement);
        }
    }
}