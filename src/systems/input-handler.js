class InputHandler {
    constructor(game) {
        this.game = game;
        this.setupKeyboardInput();
    }
    
    setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            if (this.handleUndoRedoInput(e)) return;
            this.handleMovementInput(e);
        });
    }
    
    handleUndoRedoInput(e) {
        if (!(e.ctrlKey || e.metaKey)) return false;
        
        if (e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.game.undo();
            return true;
        }
        
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
            'ArrowRight': { x: 1, y: 0 }
        };
        
        const movement = movementMap[e.key];
        if (movement) {
            this.game.executeCommand('move', movement);
        }
    }
}