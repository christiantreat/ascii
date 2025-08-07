// === UPDATED GAME ENGINE WITH MENU SYSTEM ===
// File: src/game-engine.js
// COMPLETE REPLACEMENT - Now includes pauseable menu system

class GameEngine {
    constructor() {
        this.gameArea = document.getElementById('gameArea');
        
        // Initialize terrain system first
        this.terrainSystem = new TerrainSystem();
        
        // Keep using GameObject - this is correct!
        this.player = new GameObject(this.terrainSystem);
        
        this.commandHistory = new CommandHistory();
        this.commandRegistry = new Map();
        this.uiController = new UIController();
        
        // NEW: Game loop control
        this.gameLoopRunning = false;
        this.gameLoopId = null;
        
        // NEW: Menu system (initialized after UI controller)
        // Check if MenuSystem is available
        if (typeof window.MenuSystem !== 'undefined') {
            this.menuSystem = new window.MenuSystem(this);
            console.log("Menu system initialized successfully");
        } else {
            console.error("MenuSystem class not found! Check loading order.");
            console.log("Available in window:", Object.keys(window).filter(k => k.includes('Menu')));
            // Create a dummy menu system to prevent crashes
            this.menuSystem = {
                isMenuVisible: () => false,
                handleMenuKey: () => console.warn("Menu system not available"),
                handleMenuInput: () => false,
                render: () => {}
            };
        }
        
        // Initialize input handler AFTER menu system
        this.inputHandler = new InputHandler(this);
        
        // Set initial player position
        this.player.setPosition(15, 15);
        
        this.registerCommands();
        this.render();
        this.updateUI();
        
        // NEW: Start the game loop
        this.startGameLoop();
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
                
                // FIXED: Let TerrainSystem handle player movement notification
                if (this.player.x !== oldX || this.player.y !== oldY) {
                    this.terrainSystem.onPlayerMoved(this.player.x, this.player.y);
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
    
    undo() {
        const oldX = this.player.x;
        const oldY = this.player.y;
        
        if (this.commandHistory.undo(this.player)) {
            // FIXED: Let TerrainSystem handle the notification
            if (this.player.x !== oldX || this.player.y !== oldY) {
                this.terrainSystem.onPlayerMoved(this.player.x, this.player.y);
            }
            
            this.render();
            this.updateUI();
        }
    }
    
    redo() {
        const oldX = this.player.x;
        const oldY = this.player.y;
        
        if (this.commandHistory.redo(this.player)) {
            // FIXED: Let TerrainSystem handle the notification
            if (this.player.x !== oldX || this.player.y !== oldY) {
                this.terrainSystem.onPlayerMoved(this.player.x, this.player.y);
            }
            
            this.render();
            this.updateUI();
        }
    }
    
    // NEW: Game loop control methods
    startGameLoop() {
        if (this.gameLoopRunning) return;
        
        this.gameLoopRunning = true;
        const gameLoop = () => {
            if (this.gameLoopRunning) {
                // Game loop logic here (currently just rendering)
                // The terrain system updates happen in response to player actions
                // but we could add ambient updates here if needed
                
                this.gameLoopId = requestAnimationFrame(gameLoop);
            }
        };
        
        this.gameLoopId = requestAnimationFrame(gameLoop);
        console.log("Game loop started");
    }
    
    pauseGameLoop() {
        if (this.gameLoopRunning) {
            this.gameLoopRunning = false;
            if (this.gameLoopId) {
                cancelAnimationFrame(this.gameLoopId);
                this.gameLoopId = null;
            }
            console.log("Game loop paused");
        }
    }
    
    resumeGameLoop() {
        if (!this.gameLoopRunning) {
            this.startGameLoop();
            console.log("Game loop resumed");
        }
    }
    
    render() {
        // NEW: Check if menu is visible and render accordingly
        if (this.menuSystem.isMenuVisible()) {
            // First render the normal terrain
            this.terrainSystem.renderTerrain(this.gameArea, this.player.x, this.player.y);
            
            // Then render menu overlay on top
            this.menuSystem.render(
                this.gameArea,
                (x, y) => this.terrainSystem.getTerrainAt(x, y, this.player.x, this.player.y),
                this.player.x,
                this.player.y
            );
        } else {
            // Normal rendering
            this.terrainSystem.renderTerrain(this.gameArea, this.player.x, this.player.y);
        }
    }
    
    updateUI() {
        const canUndo = this.commandHistory.canUndo();
        const canRedo = this.commandHistory.canRedo();
        this.uiController.updateUndoRedoStatus(canUndo, canRedo);
        this.uiController.updatePlayerPosition(this.player.x, this.player.y);
        this.uiController.updatePlayerFacing(this.terrainSystem.getFacingDirectionName());
        
        // Show deer reaction info in debug mode
        if (this.terrainSystem.deerSystem && this.terrainSystem.deerSystem.debugMode) {
            const deerStats = this.terrainSystem.deerSystem.getDeerBehaviorStats();
            if (deerStats.totalReactions > 0) {
                this.uiController.showMessage(
                    `Deer Reactions: ${deerStats.totalReactions} pending | States: W:${deerStats.states.wandering} A:${deerStats.states.alert} F:${deerStats.states.fleeing}`, 
                    1000
                );
            }
        }
        
        // NEW: Update menu status in UI
        if (this.menuSystem.isMenuVisible()) {
            // Could add menu-specific UI updates here if needed
        }
    }
}

// Make GameEngine globally available
if (typeof window !== 'undefined') {
    window.GameEngine = GameEngine;
}