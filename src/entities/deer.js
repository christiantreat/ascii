// === DEER AI SYSTEM ===
// File: src/entities/deer.js

class Deer {
    constructor(id, x, y, terrainSystem) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.terrainSystem = terrainSystem;
        
        // AI State
        this.state = 'wandering'; // 'wandering', 'alert', 'fleeing'
        this.stateTimer = 0;
        
        // Vision and detection
        this.visionRange = 6;
        this.alertRange = 5;
        this.fleeDistance = 10;
        
        // Movement
        this.lastMoveTime = 0;
        this.moveInterval = 750; // Move every 750ms
        
        // Wandering behavior
        this.wanderTarget = null;
        this.wanderTimer = 0;
        this.wanderDuration = 3000; // Change direction every 3 seconds
        
        // Fleeing behavior
        this.fleeTarget = null;
        this.fleeTimer = 0;
        
        // Flocking
        this.flockRadius = 4; // Try to stay within 4 tiles of other fleeing deer
        
        // Generate initial wander target
        this.generateWanderTarget();
    }
    
    update(playerX, playerY, allDeer, currentTime) {
        // Update state timer
        this.stateTimer += 750; // Assuming 750ms updates
        
        // Check for player detection
        const playerDistance = this.distanceTo(playerX, playerY);
        const canSeePlayer = this.canSeePosition(playerX, playerY);
        
        // State machine
        switch (this.state) {
            case 'wandering':
                this.updateWandering(playerX, playerY, playerDistance, canSeePlayer, currentTime);
                break;
            case 'alert':
                this.updateAlert(playerX, playerY, playerDistance, canSeePlayer, currentTime);
                break;
            case 'fleeing':
                this.updateFleeing(playerX, playerY, allDeer, playerDistance, canSeePlayer, currentTime);
                break;
        }
        
        // Execute movement if it's time
        if (currentTime - this.lastMoveTime >= this.moveInterval) {
            this.executeMovement();
            this.lastMoveTime = currentTime;
        }
    }
    
    updateWandering(playerX, playerY, playerDistance, canSeePlayer, currentTime) {
        // Check if player is detected
        if (canSeePlayer && playerDistance <= this.alertRange) {
            this.setState('alert');
            return;
        }
        
        // Update wander target periodically
        this.wanderTimer += 750;
        if (this.wanderTimer >= this.wanderDuration || !this.wanderTarget) {
            this.generateWanderTarget();
            this.wanderTimer = 0;
        }
        
        // Move toward wander target (slowly)
        if (this.wanderTarget && Math.random() < 0.4) { // 40% chance to move each update
            this.moveToward(this.wanderTarget.x, this.wanderTarget.y);
        }
    }
    
    updateAlert(playerX, playerY, playerDistance, canSeePlayer, currentTime) {
        // Stay alert for a short time
        if (this.stateTimer >= 1500) { // 1.5 seconds of alert
            if (canSeePlayer && playerDistance <= this.alertRange) {
                // Player still close, start fleeing
                this.setState('fleeing');
                this.generateFleeTarget(playerX, playerY);
            } else {
                // Player moved away or lost sight, return to wandering
                this.setState('wandering');
            }
        }
    }
    
    updateFleeing(playerX, playerY, allDeer, playerDistance, canSeePlayer, currentTime) {
        // Update flee timer
        this.fleeTimer += 750;
        
        // Check if we've fled far enough
        if (playerDistance >= this.fleeDistance || this.fleeTimer >= 5000) { // 5 seconds max flee
            this.setState('wandering');
            return;
        }
        
        // Calculate flee direction with flocking
        const fleeDirection = this.calculateFleeDirection(playerX, playerY, allDeer);
        
        // Move away from player (with flocking influence)
        this.moveToward(fleeDirection.x, fleeDirection.y);
    }
    
    calculateFleeDirection(playerX, playerY, allDeer) {
        // Base flee direction - away from player
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let fleeX = this.x;
        let fleeY = this.y;
        
        if (distance > 0) {
            // Normalize and extend flee direction
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;
            fleeX = this.x + normalizedX * 5;
            fleeY = this.y + normalizedY * 5;
        }
        
        // Flocking behavior - try to move toward other fleeing deer
        const nearbyFleeingDeer = allDeer.filter(deer => 
            deer.id !== this.id && 
            deer.state === 'fleeing' && 
            this.distanceTo(deer.x, deer.y) <= this.flockRadius * 2
        );
        
        if (nearbyFleeingDeer.length > 0) {
            // Calculate average position of nearby fleeing deer
            let avgX = 0, avgY = 0;
            nearbyFleeingDeer.forEach(deer => {
                avgX += deer.x;
                avgY += deer.y;
            });
            avgX /= nearbyFleeingDeer.length;
            avgY /= nearbyFleeingDeer.length;
            
            // Blend flee direction with flocking direction (70% flee, 30% flock)
            fleeX = fleeX * 0.7 + avgX * 0.3;
            fleeY = fleeY * 0.7 + avgY * 0.3;
        }
        
        return { x: Math.floor(fleeX), y: Math.floor(fleeY) };
    }
    
    generateWanderTarget() {
        // Generate a random nearby target within 3-8 tiles
        const angle = Math.random() * Math.PI * 2;
        const distance = 3 + Math.random() * 5;
        
        const targetX = Math.floor(this.x + Math.cos(angle) * distance);
        const targetY = Math.floor(this.y + Math.sin(angle) * distance);
        
        // Make sure target is valid
        if (this.terrainSystem.canMoveTo(targetX, targetY)) {
            this.wanderTarget = { x: targetX, y: targetY };
        } else {
            // Try a closer target
            const closeX = Math.floor(this.x + Math.cos(angle) * 2);
            const closeY = Math.floor(this.y + Math.sin(angle) * 2);
            if (this.terrainSystem.canMoveTo(closeX, closeY)) {
                this.wanderTarget = { x: closeX, y: closeY };
            }
        }
    }
    
    generateFleeTarget(playerX, playerY) {
        // Calculate direction away from player
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;
            
            const fleeX = Math.floor(this.x + normalizedX * this.fleeDistance);
            const fleeY = Math.floor(this.y + normalizedY * this.fleeDistance);
            
            this.fleeTarget = { x: fleeX, y: fleeY };
        }
    }
    
    moveToward(targetX, targetY) {
        if (targetX === this.x && targetY === this.y) return;
        
        // Simple pathfinding - move one step toward target
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        
        // Determine best movement direction
        let moveX = 0, moveY = 0;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            moveX = dx > 0 ? 1 : -1;
        } else if (dy !== 0) {
            moveY = dy > 0 ? 1 : -1;
        }
        
        // Try to move in preferred direction
        const newX = this.x + moveX;
        const newY = this.y + moveY;
        
        if (this.terrainSystem.canMoveTo(newX, newY)) {
            this.x = newX;
            this.y = newY;
        } else {
            // Try alternative directions
            this.tryAlternativeMovement(dx, dy);
        }
    }
    
    tryAlternativeMovement(dx, dy) {
        // Try moving in just one axis
        const alternatives = [
            { x: dx > 0 ? 1 : (dx < 0 ? -1 : 0), y: 0 },
            { x: 0, y: dy > 0 ? 1 : (dy < 0 ? -1 : 0) },
            // Try diagonal alternatives
            { x: dx > 0 ? 1 : -1, y: dy > 0 ? 1 : -1 },
            { x: dx > 0 ? 1 : -1, y: dy > 0 ? -1 : 1 }
        ];
        
        for (const alt of alternatives) {
            const newX = this.x + alt.x;
            const newY = this.y + alt.y;
            if (this.terrainSystem.canMoveTo(newX, newY)) {
                this.x = newX;
                this.y = newY;
                return;
            }
        }
    }
    
    executeMovement() {
        // This method is called when it's time to actually move
        // The movement logic is already handled in moveToward
    }
    
    setState(newState) {
        this.state = newState;
        this.stateTimer = 0;
        
        if (newState === 'fleeing') {
            this.fleeTimer = 0;
        }
    }
    
    // Vision system for deer
    canSeePosition(x, y) {
        const distance = this.distanceTo(x, y);
        if (distance > this.visionRange) return false;
        
        return this.hasLineOfSight(this.x, this.y, x, y);
    }
    
    hasLineOfSight(fromX, fromY, toX, toY) {
        // Simple line of sight - same logic as player but for deer
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);
        const x0 = fromX;
        const y0 = fromY;
        const n = 1 + dx + dy;
        const x_inc = (toX > fromX) ? 1 : -1;
        const y_inc = (toY > fromY) ? 1 : -1;
        let error = dx - dy;
        
        let x = x0;
        let y = y0;
        
        for (let i = 0; i < n; i++) {
            if (x === toX && y === toY) {
                return true;
            }
            
            if (i > 0) {
                const feature = this.terrainSystem.getFeatureAt(x, y);
                if (feature && (feature.type === 'tree_trunk' || feature.type === 'tree_canopy')) {
                    return false;
                }
            }
            
            if (error > 0) {
                x += x_inc;
                error -= dy;
            } else {
                y += y_inc;
                error += dx;
            }
        }
        
        return true;
    }
    
    distanceTo(x, y) {
        return Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
    }
    
    getDebugInfo() {
        return {
            id: this.id,
            state: this.state,
            position: { x: this.x, y: this.y },
            wanderTarget: this.wanderTarget,
            fleeTarget: this.fleeTarget,
            visionRange: this.visionRange,
            stateTimer: this.stateTimer
        };
    }
}