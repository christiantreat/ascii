// === COMPANION DOG ===
// File: src/entities/companion-dog.js
// A friendly dog that follows you around and comes when called

class CompanionDog extends GameObject {
    constructor(id, x, y, terrainSystem) {
        super(terrainSystem);
        this.id = id;
        this.x = x;
        this.y = y;
        
        // AI States
        this.state = 'wandering'; // 'wandering', 'following', 'coming'
        this.stateTimer = 0;
        
        // Behavior settings
        this.wanderRadius = 8;      // How far from player to wander
        this.followDistance = 2;    // How close to stay when following
        this.comingSpeed = 200;     // How fast to move when called (ms)
        this.wanderSpeed = 1000;    // Normal wandering speed (ms)
        this.followSpeed = 400;     // Speed when following player
        
        // Movement timing
        this.lastMoveTime = 0;
        this.currentMoveInterval = this.wanderSpeed;
        
        // Wandering behavior
        this.wanderTarget = null;
        this.wanderTimer = 0;
        this.wanderDuration = 3000; // Change wander direction every 3 seconds
        this.idleTimer = 0;
        this.idleActions = ['sit', 'sniff', 'look_around', 'scratch'];
        this.currentIdleAction = null;
        
        // Player tracking
        this.playerX = x;
        this.playerY = y;
        this.lastPlayerDistance = 0;
        this.playerIdleTime = 0;
        
        // Start with a wander target
        this.generateWanderTarget();
    }
    
    update(playerX, playerY, currentTime) {
        this.stateTimer += 200;
        
        // Track player position and movement
        const playerMoved = (this.playerX !== playerX || this.playerY !== playerY);
        this.playerX = playerX;
        this.playerY = playerY;
        
        if (playerMoved) {
            this.playerIdleTime = 0;
        } else {
            this.playerIdleTime += 200;
        }
        
        const distanceToPlayer = this.distanceTo(playerX, playerY);
        this.lastPlayerDistance = distanceToPlayer;
        
        // State machine
        switch (this.state) {
            case 'wandering':
                this.updateWandering(playerX, playerY, currentTime);
                break;
            case 'following':
                this.updateFollowing(playerX, playerY, currentTime);
                break;
            case 'coming':
                this.updateComing(playerX, playerY, currentTime);
                break;
        }
        
        // Execute movement if it's time
        if (currentTime - this.lastMoveTime >= this.currentMoveInterval) {
            this.executeMovement();
            this.lastMoveTime = currentTime;
        }
    }
    
    updateWandering(playerX, playerY, currentTime) {
        const distanceToPlayer = this.distanceTo(playerX, playerY);
        
        // If player moves and we're close, automatically start following
        if (this.playerIdleTime === 0 && distanceToPlayer <= 6) {
            this.setState('following');
            return;
        }
        
        // If we're too far from player, go back to them
        if (distanceToPlayer > this.wanderRadius * 1.5) {
            this.setState('following');
            return;
        }
        
        // Normal wandering behavior
        this.wanderTimer += 200;
        
        // If player has been idle for a while, do idle actions
        if (this.playerIdleTime > 5000) {
            this.doIdleAction();
        } else {
            // Regular wandering
            if (this.wanderTimer >= this.wanderDuration || !this.wanderTarget) {
                this.generateWanderTarget();
                this.wanderTimer = 0;
            }
            
            // Move toward wander target (sometimes)
            if (this.wanderTarget && Math.random() < 0.4) {
                this.moveSingleTileToward(this.wanderTarget.x, this.wanderTarget.y);
            }
        }
    }
    
    updateFollowing(playerX, playerY, currentTime) {
        const distanceToPlayer = this.distanceTo(playerX, playerY);
        
        // If player stops moving for a while, go back to wandering
        if (this.playerIdleTime > 3000) {
            this.setState('wandering');
            return;
        }
        
        // If we're too close, stop and wait
        if (distanceToPlayer <= this.followDistance) {
            // Just wait near player
            return;
        }
        
        // If we're too far, catch up
        if (distanceToPlayer > this.followDistance + 2) {
            this.moveSingleTileToward(playerX, playerY);
        }
    }
    
    updateComing(playerX, playerY, currentTime) {
        const distanceToPlayer = this.distanceTo(playerX, playerY);
        
        // When we reach the player, switch to following
        if (distanceToPlayer <= this.followDistance) {
            this.setState('following');
            return;
        }
        
        // Move directly toward player
        this.moveSingleTileToward(playerX, playerY);
    }
    
    // Called when player presses the "come" key
    comeHere() {
        console.log(`Companion dog ${this.id} coming!`);
        this.setState('coming');
    }
    
    setState(newState) {
        if (this.state !== newState) {
            console.log(`Dog ${this.id}: ${this.state} -> ${newState}`);
            this.state = newState;
            this.stateTimer = 0;
            
            // Set appropriate movement speed
            switch (newState) {
                case 'wandering':
                    this.currentMoveInterval = this.wanderSpeed;
                    break;
                case 'following':
                    this.currentMoveInterval = this.followSpeed;
                    break;
                case 'coming':
                    this.currentMoveInterval = this.comingSpeed;
                    break;
            }
        }
    }
    
    generateWanderTarget() {
        // Pick a random spot within wander radius of player
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * this.wanderRadius;
        
        const targetX = Math.floor(this.playerX + Math.cos(angle) * distance);
        const targetY = Math.floor(this.playerY + Math.sin(angle) * distance);
        
        if (this.terrainSystem.canMoveTo(targetX, targetY)) {
            this.wanderTarget = { x: targetX, y: targetY };
        } else {
            // Try a closer spot
            const closeX = Math.floor(this.playerX + Math.cos(angle) * 3);
            const closeY = Math.floor(this.playerY + Math.sin(angle) * 3);
            if (this.terrainSystem.canMoveTo(closeX, closeY)) {
                this.wanderTarget = { x: closeX, y: closeY };
            }
        }
    }
    
    doIdleAction() {
        // Pick a random idle action every few seconds
        if (this.stateTimer % 2000 === 0) {
            this.currentIdleAction = this.idleActions[Math.floor(Math.random() * this.idleActions.length)];
            console.log(`Dog ${this.id} is ${this.currentIdleAction}`);
        }
        
        // Don't move much when doing idle actions
        if (Math.random() < 0.1) {
            // Occasionally move just 1 tile in a random direction
            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
            ];
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const newX = this.x + dir.x;
            const newY = this.y + dir.y;
            
            if (this.terrainSystem.canMoveTo(newX, newY)) {
                this.x = newX;
                this.y = newY;
            }
        }
    }
    
    moveSingleTileToward(targetX, targetY) {
        if (targetX === this.x && targetY === this.y) return;
        
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        
        // Calculate the best single-tile move
        let moveX = 0, moveY = 0;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            moveX = dx > 0 ? 1 : -1;
            if (Math.abs(dy) > 0.5) {
                moveY = dy > 0 ? 1 : -1;
            }
        } else {
            moveY = dy > 0 ? 1 : -1;
            if (Math.abs(dx) > 0.5) {
                moveX = dx > 0 ? 1 : -1;
            }
        }
        
        // Try diagonal movement first
        if (moveX !== 0 && moveY !== 0) {
            const newX = this.x + moveX;
            const newY = this.y + moveY;
            if (this.terrainSystem.canMoveTo(newX, newY)) {
                this.x = newX;
                this.y = newY;
                return;
            }
        }
        
        // Try horizontal movement
        if (moveX !== 0) {
            const newX = this.x + moveX;
            if (this.terrainSystem.canMoveTo(newX, this.y)) {
                this.x = newX;
                return;
            }
        }
        
        // Try vertical movement
        if (moveY !== 0) {
            const newY = this.y + moveY;
            if (this.terrainSystem.canMoveTo(this.x, newY)) {
                this.y = newY;
                return;
            }
        }
    }
    
    executeMovement() {
        // Movement is handled in the state update methods
    }
    
    distanceTo(x, y) {
        return Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
    }
    
    getDebugInfo() {
        return {
            id: this.id,
            state: this.state,
            position: { x: this.x, y: this.y },
            distanceToPlayer: this.lastPlayerDistance.toFixed(1),
            currentAction: this.currentIdleAction,
            playerIdleTime: this.playerIdleTime
        };
    }
}