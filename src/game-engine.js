class GameEngine {
    constructor() {
        this.gameArea = document.getElementById('gameArea');
        this.player = new GameObject(document.getElementById('player'));
        this.terrainSystem = new TerrainSystem();
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
        
        const command = new CommandClass(params.x || 0, params.y || 0);
        this.commandHistory.executeCommand(command, this.player);
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
        const viewDims = this.terrainSystem.getViewDimensions(this.gameArea);
        this.terrainSystem.renderTerrain(
            this.gameArea, 
            this.player.x, 
            this.player.y, 
            viewDims.width, 
            viewDims.height
        );
    }
    
    updateUI() {
        const canUndo = this.commandHistory.canUndo();
        const canRedo = this.commandHistory.canRedo();
        this.uiController.updateUndoRedoStatus(canUndo, canRedo);
        this.uiController.updatePlayerPosition(this.player.x, this.player.y);
    }
}