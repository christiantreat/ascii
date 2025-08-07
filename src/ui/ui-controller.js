// === UI CONTROLLER (UPDATED FOR CONE VISION) ===
// File: src/ui/ui-controller.js

class UIController {
    constructor() {
        this.elements = this.initializeElements();
        this.setupInstructionFade();
    }
    
    initializeElements() {
        return {
            undoStatus: document.getElementById('undoStatus'),
            redoStatus: document.getElementById('redoStatus'),
            position: document.getElementById('position'),
            facing: document.getElementById('facing'), // NEW: facing direction display
            instructions: document.querySelector('.instructions')
        };
    }
    
    setupInstructionFade() {
        // Auto-hide instructions after 5 seconds
        if (this.elements.instructions) {
            setTimeout(() => {
                this.elements.instructions.style.opacity = '0';
                setTimeout(() => {
                    this.elements.instructions.style.display = 'none';
                }, 2000);
            }, 5000);
        }
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
        if (this.elements.position) {
            this.elements.position.textContent = `Position: ${x}, ${y}`;
        }
    }
    
    // NEW: Update player facing direction display
    updatePlayerFacing(facingDirection) {
        if (this.elements.facing) {
            this.elements.facing.textContent = `Facing: ${facingDirection}`;
            this.elements.facing.className = 'facing-info';
        } else {
            // If facing element doesn't exist, create it dynamically
            this.createFacingElement(facingDirection);
        }
    }
    
    createFacingElement(facingDirection) {
        // Create facing direction element if it doesn't exist
        const statusBar = document.querySelector('.status');
        if (statusBar && !this.elements.facing) {
            const facingElement = document.createElement('span');
            facingElement.id = 'facing';
            facingElement.className = 'facing-info';
            facingElement.textContent = `Facing: ${facingDirection}`;
            
            // Insert after position element
            const positionElement = this.elements.position;
            if (positionElement) {
                positionElement.insertAdjacentElement('afterend', facingElement);
            } else {
                statusBar.appendChild(facingElement);
            }
            
            this.elements.facing = facingElement;
        }
    }
    
    showMessage(message, duration = 3000) {
        // Create temporary message overlay
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            font-size: 16px;
            z-index: 2000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // Fade in
        setTimeout(() => {
            messageDiv.style.opacity = '1';
        }, 10);
        
        // Fade out and remove
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, duration);
    }
    
    toggleInstructions() {
        if (this.elements.instructions) {
            const isVisible = this.elements.instructions.style.display !== 'none';
            this.elements.instructions.style.display = isVisible ? 'none' : 'block';
            this.elements.instructions.style.opacity = isVisible ? '0' : '0.8';
        }
    }
    
    updateGameState(state) {
        // Future: Display additional game state info
        console.log('Game state updated:', state);
    }
    
    // Handle window resize for responsive full screen
    handleResize() {
        // Trigger a re-render when window size changes
        if (window.game) {
            setTimeout(() => {
                window.game.render();
            }, 100);
        }
    }
    
    // NEW: Show cone vision status information
    showConeVisionStatus(status) {
        const message = `Vision: ${status.visionRadius}+${status.forwardVisionRange} tiles | Cone: ${status.coneAngle}° | Facing: ${status.facing}`;
        this.showMessage(message, 4000);
    }
}

// Make UIController globally available
if (typeof window !== 'undefined') {
    window.UIController = UIController;
}