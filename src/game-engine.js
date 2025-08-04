// === GAME ENGINE MODULE ===
// File: game-engine.js
class GameEngine {
    constructor() {
        this.gameArea = document.getElementById('gameArea');
        this.terrainSystem = new TerrainSystem();
        this.player = new GameObject(this.terrainSystem);  // Pass terrain to player
        this.commandHistory = new CommandHistory();
        this.commandRegistry = new Map();
        this.uiController = new UIController();
        this.inputHandler = new InputHandler(this);
        
        // Initialize camera system with terrain reference
        const viewDims = this.terrainSystem.getViewDimensions(this.gameArea);
        this.camera = new CameraSystem(viewDims.width, viewDims.height, this.terrainSystem);
        
        // Set initial player position at world center
        this.player.setPosition(0, 0);
        
        // Update camera to focus on player
        this.camera.updateCamera(this.player.x, this.player.y);
        
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
        
        // Store previous position for checking if move succeeded
        const prevX = this.player.x;
        const prevY = this.player.y;
        
        // Execute the command
        this.commandHistory.executeCommand(command, this.player);
        
        // Check if player actually moved (not blocked by world boundary)
        const moveSucceeded = (this.player.x !== prevX || this.player.y !== prevY);
        
        if (moveSucceeded) {
            // Update camera based on new player position
            this.camera.updateCamera(this.player.x, this.player.y);
        }
        
        // Always render and update UI (even if move was blocked)
        this.render();
        this.updateUI();
    }
    
    undo() {
        const prevX = this.player.x;
        const prevY = this.player.y;
        
        if (this.commandHistory.undo(this.player)) {
            // Check if player position actually changed
            if (this.player.x !== prevX || this.player.y !== prevY) {
                this.camera.updateCamera(this.player.x, this.player.y);
            }
            this.render();
            this.updateUI();
        }
    }
    
    redo() {
        const prevX = this.player.x;
        const prevY = this.player.y;
        
        if (this.commandHistory.redo(this.player)) {
            // Check if player position actually changed
            if (this.player.x !== prevX || this.player.y !== prevY) {
                this.camera.updateCamera(this.player.x, this.player.y);
            }
            this.render();
            this.updateUI();
        }
    }
    
    render() {
        const viewDims = this.terrainSystem.getViewDimensions(this.gameArea);
        const viewStart = this.camera.getViewStartPosition();
        
        this.terrainSystem.renderTerrain(
            this.gameArea, 
            viewStart.startX, 
            viewStart.startY,
            viewDims.width, 
            viewDims.height,
            this.player.x,
            this.player.y
        );
    }
    
    updateUI() {
        const canUndo = this.commandHistory.canUndo();
        const canRedo = this.commandHistory.canRedo();
        this.uiController.updateUndoRedoStatus(canUndo, canRedo);
        this.uiController.updatePlayerPosition(this.player.x, this.player.y);
        
        // Check world boundary through camera (which delegates to terrain)
        if (this.camera.isPlayerAtWorldBoundary(this.player.x, this.player.y)) {
            this.uiController.showMessage("You've reached the edge of the world!");
        }
    }
    
    // Method to change world size - now delegates to terrain system
    setWorldBounds(minX, maxX, minY, maxY) {
        this.terrainSystem.setWorldBounds(minX, maxX, minY, maxY);
        
        // Make sure player is still within bounds after world size change
        if (!this.terrainSystem.isValidPosition(this.player.x, this.player.y)) {
            const bounds = this.terrainSystem.getWorldBounds();
            const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, this.player.x));
            const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, this.player.y));
            this.player.setPosition(clampedX, clampedY);
            this.camera.updateCamera(this.player.x, this.player.y);
            this.render();
            this.updateUI();
        }
    }
    
    // Helper methods for accessing world information
    getWorldBounds() {
        return this.terrainSystem.getWorldBounds();
    }
    
    isValidWorldPosition(x, y) {
        return this.terrainSystem.isValidPosition(x, y);
    }
    
    getTerrainAt(x, y) {
        return this.terrainSystem.getTerrainAt(x, y);
    }
}