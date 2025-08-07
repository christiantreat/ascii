// === POPUP MENU SYSTEM ===
// File: src/ui/menu-system.js
// Handles pauseable popup menus with game loop control

class MenuSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.isVisible = false;
        this.currentMenu = null;
        this.menuStack = []; // For nested menus
        this.gameWasPaused = false;
        
        // Menu definitions
        this.menus = {
            main: {
                title: "Game Menu",
                items: [
                    { text: "Resume Game", action: () => this.closeMenu() },
                    { text: "Terrain Options", action: () => this.showMenu('terrain') },
                    { text: "Deer Controls", action: () => this.showMenu('deer') },
                    { text: "Vision Settings", action: () => this.showMenu('vision') },
                    { text: "World Generation", action: () => this.showMenu('world') },
                    { text: "Configuration", action: () => this.showMenu('config') },
                    { text: "Help", action: () => this.showMenu('help') }
                ]
            },
            terrain: {
                title: "Terrain Presets",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Flat Plains (1)", action: () => this.applyTerrainPreset('flat') },
                    { text: "Rolling Hills (2)", action: () => this.applyTerrainPreset('rolling') },
                    { text: "Hilly Terrain (3)", action: () => this.applyTerrainPreset('hilly') },
                    { text: "Dry Landscape (4)", action: () => this.applyWaterPreset('dry') },
                    { text: "Normal Water (5)", action: () => this.applyWaterPreset('normal') },
                    { text: "Wet Landscape (6)", action: () => this.applyWaterPreset('wet') }
                ]
            },
            deer: {
                title: "Deer AI Controls",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Toggle Debug Mode", action: () => this.toggleDeerDebug() },
                    { text: "Scare All Deer", action: () => this.scareAllDeer() },
                    { text: "Calm All Deer", action: () => this.calmAllDeer() },
                    { text: "Show Deer Stats", action: () => this.showDeerStats() },
                    { text: "Respawn Deer", action: () => this.respawnDeer() },
                    { text: "Deer Settings", action: () => this.showMenu('deerSettings') }
                ]
            },
            deerSettings: {
                title: "Deer Configuration",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Increase Deer Count", action: () => this.adjustDeerCount(1) },
                    { text: "Decrease Deer Count", action: () => this.adjustDeerCount(-1) },
                    { text: "Make Deer Faster", action: () => this.adjustDeerSpeed(-50) },
                    { text: "Make Deer Slower", action: () => this.adjustDeerSpeed(50) },
                    { text: "Increase Detection Range", action: () => this.adjustDeerDetection(2) },
                    { text: "Decrease Detection Range", action: () => this.adjustDeerDetection(-2) }
                ]
            },
            vision: {
                title: "Vision & Fog Controls",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Toggle Fog of War", action: () => this.toggleFogOfWar() },
                    { text: "Increase Vision (+)", action: () => this.adjustVision(1) },
                    { text: "Decrease Vision (-)", action: () => this.adjustVision(-1) },
                    { text: "Increase Forward Vision (Q)", action: () => this.adjustForwardVision(1) },
                    { text: "Decrease Forward Vision (U)", action: () => this.adjustForwardVision(-1) },
                    { text: "Wider Cone Angle (X)", action: () => this.adjustConeAngle(10) },
                    { text: "Narrower Cone Angle (V)", action: () => this.adjustConeAngle(-10) },
                    { text: "Clear Exploration", action: () => this.clearExploration() }
                ]
            },
            world: {
                title: "World Generation",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Geological Presets", action: () => this.showMenu('geological') },
                    { text: "Regenerate World (Ctrl+R)", action: () => this.regenerateWorld() },
                    { text: "Regenerate Hills (Ctrl+E)", action: () => this.regenerateModule('elevation') },
                    { text: "Regenerate Water (Ctrl+W)", action: () => this.regenerateModule('hydrology') },
                    { text: "Regenerate Geology (Ctrl+G)", action: () => this.regenerateModule('geology') },
                    { text: "Show Terrain Stats", action: () => this.showTerrainStats() },
                    { text: "Show Module Status", action: () => this.showModuleStatus() }
                ]
            },
            geological: {
                title: "Geological Terrain Types",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Mountainous Terrain (7)", action: () => this.applyGeologicalPreset('mountainous') },
                    { text: "Rolling Hills (8)", action: () => this.applyGeologicalPreset('rolling') },
                    { text: "Flat Plains (9)", action: () => this.applyGeologicalPreset('flat') },
                    { text: "Volcanic Terrain (0)", action: () => this.applyGeologicalPreset('volcanic') }
                ]
            },
            config: {
                title: "Configuration Options",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Show Current Config", action: () => this.showCurrentConfig() },
                    { text: "Export Configuration", action: () => this.exportConfiguration() },
                    { text: "Validate Config", action: () => this.validateConfiguration() },
                    { text: "Reset to Defaults", action: () => this.resetConfiguration() },
                    { text: "Performance Settings", action: () => this.showMenu('performance') }
                ]
            },
            performance: {
                title: "Performance Settings",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Increase Chunk Generation", action: () => this.adjustChunkGeneration(10) },
                    { text: "Decrease Chunk Generation", action: () => this.adjustChunkGeneration(-10) },
                    { text: "Faster Deer Updates", action: () => this.adjustDeerUpdateSpeed(-50) },
                    { text: "Slower Deer Updates", action: () => this.adjustDeerUpdateSpeed(50) },
                    { text: "Show Performance Info", action: () => this.showPerformanceInfo() }
                ]
            },
            help: {
                title: "Game Help",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Movement: Arrow Keys/WASD", action: null },
                    { text: "Menu: M key", action: null },
                    { text: "Fog Toggle: F key", action: null },
                    { text: "Terrain Analysis: T key", action: null },
                    { text: "Geology Details: G key", action: null },
                    { text: "Undo: Ctrl+Z | Redo: Ctrl+Y", action: null },
                    { text: "Deer react instantly to movement!", action: null },
                    { text: "All settings stored in terrain-config.js", action: null }
                ]
            }
        }; text: "Rolling Hills (2)", action: () => this.applyTerrainPreset('rolling') },
                    { text: "Hilly Terrain (3)", action: () => this.applyTerrainPreset('hilly') },
                    { text: "Dry Landscape (4)", action: () => this.applyWaterPreset('dry') },
                    { text: "Normal Water (5)", action: () => this.applyWaterPreset('normal') },
                    { text: "Wet Landscape (6)", action: () => this.applyWaterPreset('wet') }
                ]
            },
            deer: {
                title: "Deer AI Controls",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Toggle Debug Mode", action: () => this.toggleDeerDebug() },
                    { text: "Scare All Deer", action: () => this.scareAllDeer() },
                    { text: "Calm All Deer", action: () => this.calmAllDeer() },
                    { text: "Show Deer Stats", action: () => this.showDeerStats() },
                    { text: "Respawn Deer", action: () => this.respawnDeer() }
                ]
            },
            vision: {
                title: "Vision & Fog Controls",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Toggle Fog of War", action: () => this.toggleFogOfWar() },
                    { text: "Increase Vision (+)", action: () => this.adjustVision(1) },
                    { text: "Decrease Vision (-)", action: () => this.adjustVision(-1) },
                    { text: "Increase Forward Vision (Q)", action: () => this.adjustForwardVision(1) },
                    { text: "Decrease Forward Vision (U)", action: () => this.adjustForwardVision(-1) },
                    { text: "Wider Cone Angle (X)", action: () => this.adjustConeAngle(10) },
                    { text: "Narrower Cone Angle (V)", action: () => this.adjustConeAngle(-10) },
                    { text: "Clear Exploration", action: () => this.clearExploration() }
                ]
            },
            world: {
                title: "World Generation",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Geological Presets", action: () => this.showMenu('geological') },
                    { text: "Regenerate World (Ctrl+R)", action: () => this.regenerateWorld() },
                    { text: "Regenerate Hills (Ctrl+E)", action: () => this.regenerateModule('elevation') },
                    { text: "Regenerate Water (Ctrl+W)", action: () => this.regenerateModule('hydrology') },
                    { text: "Regenerate Geology (Ctrl+G)", action: () => this.regenerateModule('geology') },
                    { text: "Show Terrain Stats", action: () => this.showTerrainStats() },
                    { text: "Show Module Status", action: () => this.showModuleStatus() }
                ]
            },
            geological: {
                title: "Geological Terrain Types",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Mountainous Terrain (7)", action: () => this.applyGeologicalPreset('mountainous') },
                    { text: "Rolling Hills (8)", action: () => this.applyGeologicalPreset('rolling') },
                    { text: "Flat Plains (9)", action: () => this.applyGeologicalPreset('flat') },
                    { text: "Volcanic Terrain (0)", action: () => this.applyGeologicalPreset('volcanic') }
                ]
            },
            help: {
                title: "Game Help",
                items: [
                    { text: "← Back", action: () => this.goBack() },
                    { text: "Movement: Arrow Keys/WASD", action: null },
                    { text: "Menu: M key", action: null },
                    { text: "Fog Toggle: F key", action: null },
                    { text: "Terrain Analysis: T key", action: null },
                    { text: "Geology Details: G key", action: null },
                    { text: "Undo: Ctrl+Z | Redo: Ctrl+Y", action: null },
                    { text: "Deer react instantly to movement!", action: null }
                ]
            }
        };
        
        this.selectedIndex = 0;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Don't add event listeners here - they'll be handled by InputHandler
        // This prevents conflicts with existing input handling
    }
    
    // Called by InputHandler when menu key is pressed
    handleMenuKey() {
        if (this.isVisible) {
            this.closeMenu();
        } else {
            this.showMenu('main');
        }
    }
    
    // Called by InputHandler for menu navigation
    handleMenuInput(key) {
        if (!this.isVisible) return false;
        
        switch (key) {
            case 'ArrowUp':
            case 'w':
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                return true;
                
            case 'ArrowDown':
            case 's':
                if (this.currentMenu) {
                    this.selectedIndex = Math.min(this.currentMenu.items.length - 1, this.selectedIndex + 1);
                }
                return true;
                
            case 'Enter':
            case ' ':
                this.activateSelectedItem();
                return true;
                
            case 'Escape':
                if (this.menuStack.length > 0) {
                    this.goBack();
                } else {
                    this.closeMenu();
                }
                return true;
                
            default:
                return false;
        }
    }
    
    showMenu(menuName) {
        const menu = this.menus[menuName];
        if (!menu) {
            console.warn(`Menu '${menuName}' not found`);
            return;
        }
        
        // Push current menu onto stack if we have one
        if (this.currentMenu) {
            this.menuStack.push({
                menu: this.currentMenu,
                selectedIndex: this.selectedIndex
            });
        }
        
        this.currentMenu = menu;
        this.selectedIndex = 0;
        
        if (!this.isVisible) {
            this.pauseGame();
            this.isVisible = true;
        }
    }
    
    goBack() {
        if (this.menuStack.length > 0) {
            const previous = this.menuStack.pop();
            this.currentMenu = previous.menu;
            this.selectedIndex = previous.selectedIndex;
        } else {
            this.closeMenu();
        }
    }
    
    closeMenu() {
        this.isVisible = false;
        this.currentMenu = null;
        this.menuStack = [];
        this.selectedIndex = 0;
        this.resumeGame();
    }
    
    activateSelectedItem() {
        if (!this.currentMenu || this.selectedIndex >= this.currentMenu.items.length) return;
        
        const item = this.currentMenu.items[this.selectedIndex];
        if (item.action) {
            item.action();
        }
    }
    
    pauseGame() {
        if (this.gameEngine.gameLoopRunning) {
            this.gameEngine.pauseGameLoop();
            this.gameWasPaused = false;
        } else {
            this.gameWasPaused = true;
        }
    }
    
    resumeGame() {
        if (!this.gameWasPaused) {
            this.gameEngine.resumeGameLoop();
        }
    }
    
    // NEW: Configuration menu actions
    
    adjustDeerCount(delta) {
        const config = window.TERRAIN_CONFIG;
        const currentCount = config.getDeerConfig().maxDeerCount;
        const newCount = Math.max(1, Math.min(20, currentCount + delta));
        
        config.updateDeer({ maxDeerCount: newCount });
        this.gameEngine.terrainSystem.updateConfig('deer', { maxDeerCount: newCount });
        
        this.gameEngine.uiController.showMessage(`Max deer count: ${newCount}`, 2000);
        
        // Respawn deer with new count
        if (this.gameEngine.terrainSystem.deerSystem) {
            this.gameEngine.terrainSystem.deerSystem.respawnDeer();
        }
    }
    
    adjustDeerSpeed(deltaMs) {
        const config = window.TERRAIN_CONFIG;
        const currentSpeed = config.getDeerConfig().baseMoveInterval;
        const newSpeed = Math.max(100, Math.min(3000, currentSpeed + deltaMs));
        
        config.updateDeer({ baseMoveInterval: newSpeed });
        this.gameEngine.terrainSystem.updateConfig('deer', { baseMoveInterval: newSpeed });
        
        this.gameEngine.uiController.showMessage(`Deer speed: ${newSpeed}ms interval`, 2000);
    }
    
    adjustDeerDetection(delta) {
        const config = window.TERRAIN_CONFIG;
        const currentRange = config.getDeerConfig().playerDetectionRadius;
        const newRange = Math.max(5, Math.min(50, currentRange + delta));
        
        config.updateDeer({ playerDetectionRadius: newRange });
        this.gameEngine.terrainSystem.updateConfig('deer', { playerDetectionRadius: newRange });
        
        this.gameEngine.uiController.showMessage(`Deer detection range: ${newRange} tiles`, 2000);
    }
    
    adjustChunkGeneration(delta) {
        const config = window.TERRAIN_CONFIG;
        const currentRadius = config.getPerformanceConfig().chunkGenerationRadius;
        const newRadius = Math.max(20, Math.min(100, currentRadius + delta));
        
        config.config.performance.chunkGenerationRadius = newRadius;
        this.gameEngine.uiController.showMessage(`Chunk generation radius: ${newRadius}`, 2000);
    }
    
    adjustDeerUpdateSpeed(deltaMs) {
        const config = window.TERRAIN_CONFIG;
        const currentInterval = config.getPerformanceConfig().deerUpdateInterval;
        const newInterval = Math.max(50, Math.min(1000, currentInterval + deltaMs));
        
        config.config.performance.deerUpdateInterval = newInterval;
        this.gameEngine.uiController.showMessage(`Deer update interval: ${newInterval}ms`, 2000);
        
        // Apply to deer system if available
        if (this.gameEngine.terrainSystem.deerSystem) {
            this.gameEngine.terrainSystem.deerSystem.updateInterval = newInterval;
        }
    }
    
    showCurrentConfig() {
        const config = window.TERRAIN_CONFIG;
        const deerConfig = config.getDeerConfig();
        const worldConfig = config.getWorldConfig();
        
        const message = `World: ${worldConfig.minX} to ${worldConfig.maxX} | Deer: ${deerConfig.maxDeerCount} max | Detection: ${deerConfig.playerDetectionRadius}`;
        this.gameEngine.uiController.showMessage(message, 4000);
    }
    
    exportConfiguration() {
        const config = window.TERRAIN_CONFIG;
        const exported = config.exportConfig();
        
        // Create a downloadable file
        const blob = new Blob([exported], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'terrain-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.gameEngine.uiController.showMessage('Configuration exported!', 2000);
        this.closeMenu();
    }
    
    validateConfiguration() {
        const config = window.TERRAIN_CONFIG;
        const validation = config.validateConfig();
        
        if (validation.isValid) {
            this.gameEngine.uiController.showMessage('Configuration is valid!', 2000);
        } else {
            const errors = validation.errors.slice(0, 2).join(', '); // Show first 2 errors
            this.gameEngine.uiController.showMessage(`Config errors: ${errors}`, 4000);
        }
    }
    
    resetConfiguration() {
        const config = window.TERRAIN_CONFIG;
        config.resetToDefaults();
        this.gameEngine.uiController.showMessage('Configuration reset - reload page to apply', 3000);
        this.closeMenu();
    }
    
    showPerformanceInfo() {
        const config = window.TERRAIN_CONFIG;
        const perfConfig = config.getPerformanceConfig();
        const deerConfig = config.getDeerConfig();
        
        const message = `Chunk Gen: ${perfConfig.chunkGenerationRadius} | Deer Updates: ${perfConfig.deerUpdateInterval}ms | Max Deer: ${deerConfig.maxDeerCount}`;
        this.gameEngine.uiController.showMessage(message, 4000);
    }
    
    applyTerrainPreset(preset) {
        this.gameEngine.terrainSystem.quickConfigElevation(preset).regenerateWorld();
        this.gameEngine.uiController.showMessage(`Terrain: ${preset} applied`, 2000);
        this.gameEngine.render();
        this.closeMenu();
    }
    
    applyWaterPreset(preset) {
        this.gameEngine.terrainSystem.quickConfigWater(preset).regenerateWorld();
        this.gameEngine.uiController.showMessage(`Water: ${preset} applied`, 2000);
        this.gameEngine.render();
        this.closeMenu();
    }
    
    applyGeologicalPreset(preset) {
        const worldGenerator = this.gameEngine.terrainSystem.worldSystem.worldGenerator;
        
        switch (preset) {
            case 'mountainous':
                worldGenerator.createMountainousWorld();
                break;
            case 'rolling':
                worldGenerator.createRollingHillsWorld();
                break;
            case 'flat':
                worldGenerator.createFlatPlainsWorld();
                break;
            case 'volcanic':
                worldGenerator.createVolcanicWorld();
                break;
        }
        
        this.gameEngine.terrainSystem.regenerateWorld();
        this.gameEngine.uiController.showMessage(`Geological terrain: ${preset} applied`, 2000);
        this.gameEngine.render();
        this.closeMenu();
    }
    
    toggleDeerDebug() {
        if (this.gameEngine.terrainSystem.deerSystem) {
            const debugEnabled = this.gameEngine.terrainSystem.deerSystem.toggleDebugMode();
            const message = debugEnabled ? 'Deer Debug: ON' : 'Deer Debug: OFF';
            this.gameEngine.uiController.showMessage(message, 2000);
            this.gameEngine.render();
        }
    }
    
    scareAllDeer() {
        if (this.gameEngine.terrainSystem.deerSystem) {
            this.gameEngine.terrainSystem.deerSystem.scareAllDeer(
                this.gameEngine.player.x,
                this.gameEngine.player.y
            );
            this.gameEngine.uiController.showMessage('All deer scared!', 2000);
            this.gameEngine.render();
        }
        this.closeMenu();
    }
    
    calmAllDeer() {
        if (this.gameEngine.terrainSystem.deerSystem) {
            this.gameEngine.terrainSystem.deerSystem.calmAllDeer();
            this.gameEngine.uiController.showMessage('All deer calmed', 2000);
            this.gameEngine.render();
        }
    }
    
    showDeerStats() {
        if (this.gameEngine.terrainSystem.deerSystem) {
            const stats = this.gameEngine.terrainSystem.deerSystem.getDeerBehaviorStats();
            const message = `Deer: ${stats.totalDeer} total | W:${stats.states.wandering} A:${stats.states.alert} F:${stats.states.fleeing}`;
            this.gameEngine.uiController.showMessage(message, 4000);
        }
    }
    
    respawnDeer() {
        if (this.gameEngine.terrainSystem.deerSystem) {
            this.gameEngine.terrainSystem.deerSystem.respawnDeer();
            this.gameEngine.uiController.showMessage('Deer respawned', 2000);
            this.gameEngine.render();
        }
        this.closeMenu();
    }
    
    toggleFogOfWar() {
        const fogEnabled = this.gameEngine.terrainSystem.toggleFogOfWar();
        const message = fogEnabled ? 'Fog of War: ON' : 'Fog of War: OFF';
        this.gameEngine.uiController.showMessage(message, 2000);
        this.gameEngine.render();
    }
    
    adjustVision(delta) {
        const currentRadius = this.gameEngine.terrainSystem.fogSystem.visionRadius;
        const newRadius = Math.max(1, currentRadius + delta);
        this.gameEngine.terrainSystem.setVisionRadius(newRadius);
        this.gameEngine.uiController.showMessage(`Base vision radius: ${newRadius}`, 1500);
        this.gameEngine.render();
    }
    
    adjustForwardVision(delta) {
        const currentRange = this.gameEngine.terrainSystem.fogSystem.forwardVisionRange;
        const newRange = Math.max(this.gameEngine.terrainSystem.fogSystem.visionRadius, currentRange + delta);
        this.gameEngine.terrainSystem.setForwardVisionRange(newRange);
        this.gameEngine.uiController.showMessage(`Forward vision: ${newRange} tiles`, 1500);
        this.gameEngine.render();
    }
    
    adjustConeAngle(delta) {
        const currentAngle = this.gameEngine.terrainSystem.fogSystem.coneAngle;
        const newAngle = Math.max(30, Math.min(180, currentAngle + delta));
        this.gameEngine.terrainSystem.setConeAngle(newAngle);
        this.gameEngine.uiController.showMessage(`Cone angle: ${newAngle}°`, 1500);
        this.gameEngine.render();
    }
    
    clearExploration() {
        this.gameEngine.terrainSystem.clearExploration();
        this.gameEngine.uiController.showMessage('Exploration cleared', 1500);
        this.gameEngine.render();
    }
    
    regenerateWorld() {
        this.gameEngine.terrainSystem.regenerateWorld();
        this.gameEngine.uiController.showMessage('World regenerated!', 2000);
        this.gameEngine.render();
        this.closeMenu();
    }
    
    regenerateModule(moduleName) {
        this.gameEngine.terrainSystem.regenerateModule(moduleName);
        const moduleNames = {
            elevation: 'Hills',
            hydrology: 'Water systems',
            geology: 'Geology'
        };
        this.gameEngine.uiController.showMessage(`${moduleNames[moduleName] || moduleName} regenerated`, 1500);
        this.gameEngine.render();
    }
    
    showTerrainStats() {
        const stats = this.gameEngine.terrainSystem.getTerrainStatistics();
        const top3 = Object.entries(stats.percentages)
            .sort(([,a], [,b]) => parseFloat(b) - parseFloat(a))
            .slice(0, 3)
            .map(([terrain, percent]) => `${terrain}: ${percent}%`)
            .join(' | ');
        this.gameEngine.uiController.showMessage(`Terrain: ${top3}`, 4000);
    }
    
    showModuleStatus() {
        const status = this.gameEngine.terrainSystem.getModuleStatus();
        const moduleNames = status.map(m => `${m.name}: ${m.enabled ? 'ON' : 'OFF'}`).join(' | ');
        this.gameEngine.uiController.showMessage(`Modules: ${moduleNames}`, 4000);
    }
    
    // Render the menu overlay
    render(gameArea, getTerrainFunction, playerX, playerY) {
        if (!this.isVisible || !this.currentMenu) return;
        
        // Get the current display
        const lines = gameArea.innerHTML.split('\n');
        
        // Calculate menu dimensions
        const longestTitle = this.currentMenu.title.length;
        const longestItem = Math.max(...this.currentMenu.items.map(item => item.text.length));
        const menuWidth = Math.max(longestTitle, longestItem) + 6; // +6 for padding and borders
        const menuHeight = this.currentMenu.items.length + 4; // +4 for title and borders
        
        // Calculate position (center of screen)
        const viewHeight = lines.length;
        const viewWidth = lines[0] ? lines[0].replace(/<[^>]*>/g, '').length : 60;
        
        const startY = Math.floor((viewHeight - menuHeight) / 2);
        const startX = Math.floor((viewWidth - menuWidth) / 2);
        
        // Render menu box
        for (let y = 0; y < menuHeight; y++) {
            const lineIndex = startY + y;
            if (lineIndex < 0 || lineIndex >= lines.length) continue;
            
            let line = lines[lineIndex];
            const lineChars = this.parseLineToChars(line);
            
            for (let x = 0; x < menuWidth; x++) {
                const charIndex = startX + x;
                if (charIndex < 0) continue;
                
                let symbol = ' ';
                let className = 'symbol building'; // Brown background
                
                // Draw border
                if (y === 0 || y === menuHeight - 1) {
                    if (x === 0) symbol = '╔';
                    else if (x === menuWidth - 1) symbol = '╗';
                    else symbol = '═';
                    if (y === menuHeight - 1) {
                        if (x === 0) symbol = '╚';
                        else if (x === menuWidth - 1) symbol = '╝';
                    }
                    className = 'symbol stone'; // Gray border
                } else if (x === 0 || x === menuWidth - 1) {
                    symbol = '║';
                    className = 'symbol stone'; // Gray border
                }
                // Draw title
                else if (y === 1) {
                    const titleStart = Math.floor((menuWidth - this.currentMenu.title.length) / 2);
                    const titleIndex = x - titleStart;
                    if (titleIndex >= 0 && titleIndex < this.currentMenu.title.length) {
                        symbol = this.currentMenu.title[titleIndex];
                        className = 'symbol gold'; // Golden title
                    }
                }
                // Draw menu items
                else if (y >= 3 && y - 3 < this.currentMenu.items.length) {
                    const itemIndex = y - 3;
                    const item = this.currentMenu.items[itemIndex];
                    const isSelected = itemIndex === this.selectedIndex;
                    
                    if (x === 2 && isSelected) {
                        symbol = '>';
                        className = 'symbol player'; // Red selection arrow
                    } else if (x >= 3 && x - 3 < item.text.length) {
                        symbol = item.text[x - 3];
                        className = isSelected ? 'symbol player' : 
                                   (item.action ? 'symbol village' : 'symbol stone'); // Red if selected, brown if clickable, gray if info
                    }
                }
                
                // Update the character in the line
                this.setCharAt(lineChars, charIndex, symbol, className);
            }
            
            lines[lineIndex] = this.charsToLine(lineChars);
        }
        
        // Add instruction at bottom
        const instructionY = startY + menuHeight + 1;
        if (instructionY < lines.length) {
            const instruction = "↑↓ Navigate | Enter: Select | Esc: Back/Close | M: Toggle Menu";
            const instructionX = Math.max(0, Math.floor((viewWidth - instruction.length) / 2));
            
            const lineChars = this.parseLineToChars(lines[instructionY]);
            
            for (let i = 0; i < instruction.length; i++) {
                const charIndex = instructionX + i;
                if (charIndex >= 0) {
                    this.setCharAt(lineChars, charIndex, instruction[i], 'symbol gold');
                }
            }
            
            lines[instructionY] = this.charsToLine(lineChars);
        }
        
        gameArea.innerHTML = lines.join('\n');
    }
    
    // Helper methods for line manipulation
    parseLineToChars(line) {
        const chars = [];
        const spanRegex = /<span class="([^"]*)">(.*?)<\/span>/g;
        let lastIndex = 0;
        let match;
        
        while ((match = spanRegex.exec(line)) !== null) {
            // Add any text before this span
            for (let i = lastIndex; i < match.index; i++) {
                chars.push({ symbol: ' ', className: 'symbol terrain' });
            }
            
            // Add the span content
            chars.push({ symbol: match[2], className: match[1] });
            lastIndex = spanRegex.lastIndex;
        }
        
        // Add any remaining text
        for (let i = lastIndex; i < line.length; i++) {
            chars.push({ symbol: ' ', className: 'symbol terrain' });
        }
        
        return chars;
    }
    
    setCharAt(lineChars, index, symbol, className) {
        // Extend array if needed
        while (lineChars.length <= index) {
            lineChars.push({ symbol: ' ', className: 'symbol terrain' });
        }
        
        lineChars[index] = { symbol, className };
    }
    
    charsToLine(lineChars) {
        return lineChars.map(char => `<span class="${char.className}">${char.symbol}</span>`).join('');
    }
    
    // Check if menu is currently visible
    isMenuVisible() {
        return this.isVisible;
    }
}

// Test to make sure the class is properly defined
console.log("MenuSystem class loaded successfully");

// Make it globally available (REQUIRED for GameEngine to find it)
if (typeof window !== 'undefined') {
    window.MenuSystem = MenuSystem;
    window.MenuSystemClass = MenuSystem; // Backup reference
}