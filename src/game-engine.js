// === FIXED GAME ENGINE WITH MENU SYSTEM ===
// File: src/game-engine.js
// COMPLETE REPLACEMENT - Fixed menu rendering issues

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
        
        // Store reference to overlay for menu cleanup
        this.menuOverlay = null;
        
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
    
    // FIXED: Simplified rendering that works with menu overlay
    render() {
        try {
            // Always render the terrain first
            this.terrainSystem.renderTerrain(this.gameArea, this.player.x, this.player.y);
            
            // Clean up any existing menu overlay
            this.cleanupMenuOverlay();
            
            // If menu is visible, render it as an overlay
            if (this.menuSystem.isMenuVisible()) {
                this.renderMenuOverlay();
            }
        } catch (error) {
            console.error("Render error:", error);
        }
    }
    
    // FIXED: Smaller menu overlay that matches game style
    renderMenuOverlay() {
        try {
            // Remove any existing overlay
            this.cleanupMenuOverlay();
            
            // Create menu overlay
            this.menuOverlay = document.createElement('div');
            this.menuOverlay.id = 'menu-overlay';
            this.menuOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                font-family: 'Courier New', monospace;
            `;
            
            // Create menu content - MUCH SMALLER
            const menuContent = document.createElement('div');
            menuContent.style.cssText = `
                background: rgba(20, 20, 20, 0.98);
                border: 1px solid #666;
                padding: 12px 16px;
                color: white;
                font-size: 12px;
                min-width: 280px;
                max-width: 350px;
                text-align: left;
                line-height: 1.2;
            `;
            
            // Generate menu HTML
            menuContent.innerHTML = this.generateMenuHTML();
            this.menuOverlay.appendChild(menuContent);
            
            // Make sure gameArea is positioned relative
            this.gameArea.style.position = 'relative';
            this.gameArea.appendChild(this.menuOverlay);
            
        } catch (error) {
            console.error("Menu overlay render error:", error);
        }
    }
    
    // FIXED: Smaller menu HTML that matches ASCII game style
    generateMenuHTML() {
        if (!this.menuSystem.currentMenu) return "<div>No menu available</div>";
        
        const menu = this.menuSystem.currentMenu;
        let html = `<div style="text-align: center; color: #ffd700; font-weight: bold; font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 6px;">
            ${menu.title}
        </div>`;
        
        // Add menu items - smaller and more compact
        menu.items.forEach((item, index) => {
            const isSelected = index === this.menuSystem.selectedIndex;
            const textColor = isSelected ? '#ff6b6b' : (item.action ? '#ffffff' : '#888888');
            const backgroundColor = isSelected ? 'rgba(255, 107, 107, 0.2)' : 'transparent';
            const arrow = isSelected ? '>' : ' ';
            
            html += `<div style="
                color: ${textColor};
                background: ${backgroundColor};
                margin: 2px 0;
                padding: 3px 6px;
                cursor: ${item.action ? 'pointer' : 'default'};
                font-size: 11px;
                font-family: 'Courier New', monospace;
            ">
                <span style="color: #ff6b6b; font-weight: bold; width: 12px; display: inline-block;">${arrow}</span>${item.text}
            </div>`;
        });
        
        // Add compact instructions
        html += `<div style="
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #444;
            font-size: 10px;
            color: #888;
            text-align: center;
            line-height: 1.2;
        ">
            ↑↓/WS: Navigate | Enter: Select | Esc: Back | M: Close
        </div>`;
        
        return html;
    }
    
    // NEW: Clean up menu overlay
    cleanupMenuOverlay() {
        if (this.menuOverlay && this.menuOverlay.parentNode) {
            this.menuOverlay.parentNode.removeChild(this.menuOverlay);
            this.menuOverlay = null;
        }
        
        // Also clean up any orphaned overlays
        const existingOverlays = document.querySelectorAll('#menu-overlay');
        existingOverlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
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
    }
}

// Make GameEngine globally available
if (typeof window !== 'undefined') {
    window.GameEngine = GameEngine;
}