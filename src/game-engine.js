// === GAME ENGINE (UPDATED FOR TREE FEATURES) ===
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
        
        // Enhanced movement handling with tree collision
        if (commandName === 'move') {
            const deltaX = params.x || 0;
            const deltaY = params.y || 0;
            
            // Update terrain system with player facing direction BEFORE executing move
            this.terrainSystem.updatePlayerFacing(deltaX, deltaY);
            
            // Check if the movement is possible (considering trees)
            const newX = this.player.x + deltaX;
            const newY = this.player.y + deltaY;
            
            if (this.terrainSystem.canMoveTo(newX, newY)) {
                const command = new CommandClass(deltaX, deltaY);
                this.commandHistory.executeCommand(command, this.player);
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
    
    undo() {
        if (this.commandHistory.undo(this.player)) {
            this.render();
            this.updateUI();
        }
    }
    
    redo() {
        if (this.commandHistory.redo(this.player)) {
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
    }
}