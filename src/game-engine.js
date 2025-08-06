// === REACTIVE GAME ENGINE ===
// File: src/game-engine.js

class GameEngine {
    constructor() {
        this.gameArea = document.getElementById('gameArea');
        
        // Initialize terrain system first
        this.terrainSystem = new TerrainSystem();
        
        // Create player with terrain system
        this.player = new GameObject(this.terrainSystem);
        
        this.commandHistory = new CommandHistory();
        this.commandRegistry = new Map();
        this.uiController = new UIController();
        this.inputHandler = new InputHandler(this);
        
        // Set initial player position
        this.player.setPosition(15, 15);
        
        this.registerCommands();
        this.render();
        this.updateUI();
    }
    
    registerCommands() {
        this.registerCommand('move', MoveCommand);
    }
    
    registerCommand(name, CommandClass) {
        this.commandRegistry.set(name, CommandClass);
    }
    
    executeCommand(commandName, params = {}) {
        const CommandClass = this.commandRegistry.get(commandName);
        if (!CommandClass) {
            console.error(`Command "${commandName}" not found`);
            return;
        }
        
        // Enhanced movement handling with immediate deer reactions
        if (commandName === 'move') {
            const deltaX = params.x || 0;
            const deltaY = params.y || 0;
            
            // Store old position for comparison
            const oldX = this.player.x;
            const oldY = this.player.y;
            
            // Update terrain system with player facing direction BEFORE executing move
            this.terrainSystem.updatePlayerFacing(deltaX, deltaY);
            
            // Check if the movement is possible
            const newX = this.player.x + deltaX;
            const newY = this.player.y + deltaY;
            
            if (this.terrainSystem.canMoveTo(newX, newY)) {
                const command = new CommandClass(deltaX, deltaY);
                this.commandHistory.executeCommand(command, this.player);
                
                // CRITICAL: Immediately notify deer of player movement
                if (this.player.x !== oldX || this.player.y !== oldY) {
                    this.onPlayerMoved(this.player.x, this.player.y, oldX, oldY);
                }
            } else {
                // Movement blocked - show a message
                const feature = this.terrainSystem.getFeatureAt(newX, newY);
                if (feature && feature.type === 'tree_trunk') {
                    this.uiController.showMessage('Blocked by tree trunk', 1000);
                } else {
                    this.uiController.showMessage('Cannot move there', 1000);
                }
                // Still update facing direction even if movement is blocked
            }
        } else {
            const command = new CommandClass(params.x || 0, params.y || 0);
            this.commandHistory.executeCommand(command, this.player);
        }
        
        this.render();
        this.updateUI();
    }
    
    // NEW: Critical method - called immediately when player moves
    onPlayerMoved(newX, newY, oldX, oldY) {
        try {
            // Immediately notify deer manager of player movement
            if (this.terrainSystem.deerManager) {
                this.terrainSystem.deerManager.onPlayerMoved(newX, newY);
            }
            
            // Debug logging for movement
            if (this.terrainSystem.deerManager && this.terrainSystem.deerManager.debugMode) {
                const deltaX = newX - oldX;
                const deltaY = newY - oldY;
                const direction = this.getDirectionName(deltaX, deltaY);
                console.log(`Player moved ${direction} from (${oldX}, ${oldY}) to (${newX}, ${newY})`);
                
                // Show nearby deer info
                const nearbyDeer = this.terrainSystem.deerManager.getDeerNearPlayer(newX, newY, 10);
                if (nearbyDeer.length > 0) {
                    console.log(`${nearbyDeer.length} deer within 10 tiles:`, 
                        nearbyDeer.map(d => `Deer ${d.id}: ${d.state} at (${d.x}, ${d.y})`));
                }
            }
        } catch (error) {
            console.error("Error notifying deer of player movement:", error);
        }
    }
    
    getDirectionName(deltaX, deltaY) {
        if (deltaX === 0 && deltaY === -1) return 'North';
        if (deltaX === 0 && deltaY === 1) return 'South';
        if (deltaX === -1 && deltaY === 0) return 'West';
        if (deltaX === 1 && deltaY === 0) return 'East';
        if (deltaX === -1 && deltaY === -1) return 'Northwest';
        if (deltaX === 1 && deltaY === -1) return 'Northeast';
        if (deltaX === -1 && deltaY === 1) return 'Southwest';
        if (deltaX === 1 && deltaY === 1) return 'Southeast';
        return 'Unknown';
    }
    
    undo() {
        const oldX = this.player.x;
        const oldY = this.player.y;
        
        if (this.commandHistory.undo(this.player)) {
            // If undo moved the player, notify deer
            if (this.player.x !== oldX || this.player.y !== oldY) {
                this.onPlayerMoved(this.player.x, this.player.y, oldX, oldY);
            }
            
            this.render();
            this.updateUI();
        }
    }
    
    redo() {
        const oldX = this.player.x;
        const oldY = this.player.y;
        
        if (this.commandHistory.redo(this.player)) {
            // If redo moved the player, notify deer
            if (this.player.x !== oldX || this.player.y !== oldY) {
                this.onPlayerMoved(this.player.x, this.player.y, oldX, oldY);
            }
            
            this.render();
            this.updateUI();
        }
    }
    
    render() {
        this.terrainSystem.renderTerrain(this.gameArea, this.player.x, this.player.y);
    }
    
    updateUI() {
        const canUndo = this.commandHistory.canUndo();
        const canRedo = this.commandHistory.canRedo();
        this.uiController.updateUndoRedoStatus(canUndo, canRedo);
        this.uiController.updatePlayerPosition(this.player.x, this.player.y);
        this.uiController.updatePlayerFacing(this.terrainSystem.getFacingDirectionName());
        
        // NEW: Show deer reaction info in debug mode
        if (this.terrainSystem.deerManager && this.terrainSystem.deerManager.debugMode) {
            const deerStats = this.terrainSystem.deerManager.getDeerBehaviorStats();
            if (deerStats.totalReactions > 0) {
                this.uiController.showMessage(
                    `Deer Reactions: ${deerStats.totalReactions} pending | States: W:${deerStats.states.wandering} A:${deerStats.states.alert} F:${deerStats.states.fleeing}`, 
                    1000
                );
            }
        }
    }
    
    // NEW: Method to test deer reaction speed
    testDeerReactions() {
        if (!this.terrainSystem.deerManager) {
            console.log("No deer manager available");
            return;
        }
        
        console.log("Testing deer reaction speed...");
        const startTime = Date.now();
        
        // Simulate rapid player movement
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const testX = this.player.x + (Math.random() - 0.5) * 10;
                const testY = this.player.y + (Math.random() - 0.5) * 10;
                this.terrainSystem.deerManager.onPlayerMoved(testX, testY);
                
                if (i === 4) {
                    const endTime = Date.now();
                    const stats = this.terrainSystem.deerManager.getDeerBehaviorStats();
                    console.log(`Reaction test completed in ${endTime - startTime}ms`);
                    console.log(`Total reactions generated: ${stats.totalReactions}`);
                    console.log(`Reactive deer: ${stats.reactiveDeer.length}`);
                }
            }, i * 100);
        }
    }
}