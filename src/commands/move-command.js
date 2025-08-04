class MoveCommand extends Command {
    constructor(deltaX, deltaY) {
        super();
        this.deltaX = deltaX;
        this.deltaY = deltaY;
        this.previousX = null;
        this.previousY = null;
    }
    
    execute(gameObject) {
        this.previousX = gameObject.x;
        this.previousY = gameObject.y;
        gameObject.move(this.deltaX, this.deltaY);
    }
    
    undo(gameObject) {
        if (this.previousX !== null && this.previousY !== null) {
            gameObject.setPosition(this.previousX, this.previousY);
        }
    }
}