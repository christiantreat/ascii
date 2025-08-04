       class Command {
            execute(gameObject) {
                throw new Error("Execute method must be implemented");
            }
            
            undo(gameObject) {
                throw new Error("Undo method must be implemented");
            }
        }