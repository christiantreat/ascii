class CommandHistory {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
    }
    
    executeCommand(command, target) {
        command.execute(target);
        this.addToHistory(command);
    }
    
    addToHistory(command) {
        this.currentIndex++;
        this.history.length = this.currentIndex;
        this.history.push(command);
    }
    
    undo(target) {
        if (!this.canUndo()) return false;
        
        const command = this.history[this.currentIndex];
        command.undo(target);
        this.currentIndex--;
        return true;
    }
    
    redo(target) {
        if (!this.canRedo()) return false;
        
        this.currentIndex++;
        const command = this.history[this.currentIndex];
        command.execute(target);
        return true;
    }
    
    canUndo() {
        return this.currentIndex >= 0;
    }
    
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }
    
    clear() {
        this.history = [];
        this.currentIndex = -1;
    }
}