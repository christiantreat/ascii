class UIController {
    constructor() {
        this.elements = this.initializeElements();
    }
    
    initializeElements() {
        return {
            undoStatus: document.getElementById('undoStatus'),
            redoStatus: document.getElementById('redoStatus')
        };
    }
    
    updateUndoRedoStatus(canUndo, canRedo) {
        if (this.elements.undoStatus) {
            this.elements.undoStatus.textContent = canUndo ? 'Undo: Available' : 'Undo: None';
            this.elements.undoStatus.className = canUndo ? 'available' : 'unavailable';
        }
        
        if (this.elements.redoStatus) {
            this.elements.redoStatus.textContent = canRedo ? 'Redo: Available' : 'Redo: None';
            this.elements.redoStatus.className = canRedo ? 'available' : 'unavailable';
        }
    }
    
    updatePlayerPosition(x, y) {
        // Can be used to display coordinates in UI
        console.log(`Player position: ${x}, ${y}`);
    }
    
    showMessage(message) {
        console.log(`UI Message: ${message}`);
    }
    
    updateGameState(state) {
        // Future: Display game state info like position, score, etc.
    }
}