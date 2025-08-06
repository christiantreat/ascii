// === SINGLE TILE MOVEMENT DEER AI ===
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
        
        // Detection ranges
        this.visionRange = 8;
        this.alertRange = 7;
        this.fleeDistance = 15;
        this.panicDistance = 4;
        
        // CHANGED: Movement timing for single tile moves
        this.lastMoveTime = 0;
        this.baseMoveInterval = 1000; // Wandering speed
        this.alertMoveInterval = 500;  // Alert speed
        this.fleeMoveInterval = 150;   // Fleeing speed (fast but only 1 tile)
        this.currentMoveInterval = this.baseMoveInterval;
        
        // Reaction system
        this.lastPlayerPosition = { x: null, y: null };
        this.lastPlayerDistance = Infinity;
        this.reactionQueue = [];
        this.maxReactionsPerUpdate = 2; // Reduced from 3
        
        // Wandering behavior
        this.wanderTarget = null;
        this.wanderTimer = 0;
        this.wanderDuration = 4000;
        this.wanderMoveChance = 0.3;
        
        // Fleeing behavior
        this.fleeTarget = null;
        this.fleeTimer = 0;
        this.maxFleeTime = 10000;
        this.playerMemoryTime = 4000;
        this.lastPlayerSeen = 0;
        
        // CHANGED: Remove multi-tile movement
        // this.fleeSpeed = 2; // REMOVED - deer now move 1 tile at a time
        
        // Flocking
        this.flockRadius = 6;
        this.flockStrength = 0.4;
        
        this.generateWanderTarget();
    }
    
    // Immediate reaction to player movement
    reactToPlayerMovement(playerX, playerY, currentTime) {
        const playerDistance = this.distanceTo(playerX, playerY);
        const canSeePlayer = this.canSeePosition(playerX, playerY);
        
        // Check if player position changed
        const playerMoved = (this.lastPlayerPosition.x !== null && 
            (Math.abs(this.lastPlayerPosition.x - playerX) > 0 || 
             Math.abs(this.lastPlayerPosition.y - playerY) > 0));
        
        // Check if player is getting closer
        const playerApproaching = playerDistance < this.lastPlayerDistance - 0.5;
        
        if (canSeePlayer && (playerMoved || playerApproaching)) {
            // IMMEDIATE PANIC if player is very close
            if (playerDistance <= this.panicDistance) {
                this.addReaction('immediate_flee', { playerX, playerY, priority: 100 });
            }
            // IMMEDIATE ALERT if player enters alert range
            else if (playerDistance <= this.alertRange && this.state === 'wandering') {
                this.addReaction('become_alert', { playerX, playerY, priority: 80 });
            }
            // IMMEDIATE FLEE if already alert and player gets closer
            else if (playerDistance <= this.alertRange + 2 && this.state === 'alert') {
                this.addReaction('start_fleeing', { playerX, playerY, priority: 90 });
            }
        }
        
        // Update tracking
        this.lastPlayerPosition = { x: playerX, y: playerY };
        this.lastPlayerDistance = playerDistance;
        
        // Process immediate reactions
        this.processReactionQueue(currentTime);
    }
    
    addReaction(type, data) {
        const reaction = { type, data, timestamp: Date.now() };
        
        if (data.priority >= 90) {
            this.reactionQueue.unshift(reaction); // High priority
        } else {
            this.reactionQueue.push(reaction); // Normal priority
        }
        
        // Limit queue size
        if (this.reactionQueue.length > 3) { // Reduced from 5
            this.reactionQueue = this.reactionQueue.slice(0, 3);
        }
    }
    
    processReactionQueue(currentTime) {
        let reactionsProcessed = 0;
        
        while (this.reactionQueue.length > 0 && reactionsProcessed < this.maxReactionsPerUpdate) {
            const reaction = this.reactionQueue.shift();
            
            switch (reaction.type) {
                case 'immediate_flee':
                    this.setState('fleeing');
                    this.currentMoveInterval = this.fleeMoveInterval;
                    this.generateFleeTarget(reaction.data.playerX, reaction.data.playerY);
                    this.lastPlayerSeen = currentTime;
                    // CHANGED: Move only 1 tile immediately
                    this.executeImmediateSingleTileMovement(reaction.data.playerX, reaction.data.playerY);
                    break;
                    
                case 'become_alert':
                    if (this.state === 'wandering') {
                        this.setState('alert');
                        this.currentMoveInterval = this.alertMoveInterval;
                        this.lastPlayerSeen = currentTime;
                    }
                    break;
                    
                case 'start_fleeing':
                    this.setState('fleeing');
                    this.currentMoveInterval = this.fleeMoveInterval;
                    this.generateFleeTarget(reaction.data.playerX, reaction.data.playerY);
                    this.lastPlayerSeen = currentTime;
                    break;
            }
            
            reactionsProcessed++;
        }
    }
    
    // CHANGED: New method for single tile immediate movement
    executeImmediateSingleTileMovement(playerX, playerY) {
        // Move exactly 1 tile away from player immediately
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Calculate direction away from player
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;
            
            // Try to move 1 tile in the best escape direction
            let bestMove = null;
            let bestDistance = 0;
            
            // Check all 8 possible moves (including diagonals)
            const possibleMoves = [
                { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
                { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
            ];
            
            possibleMoves.forEach(move => {
                const newX = this.x + move.x;
                const newY = this.y + move.y;
                
                if (this.terrainSystem.canMoveTo(newX, newY)) {
                    // Calculate how far this move takes us from the player
                    const newDistance = Math.sqrt((newX - playerX) ** 2 + (newY - playerY) ** 2);
                    
                    // Also check if this move is generally in the "away" direction
                    const moveAlignment = (move.x * normalizedX + move.y * normalizedY);
                    const score = newDistance + moveAlignment * 2; // Prefer moves in the right direction
                    
                    if (score > bestDistance) {
                        bestDistance = score;
                        bestMove = { x: newX, y: newY };
                    }
                }
            });
            
            // Execute the best move (exactly 1 tile)
            if (bestMove) {
                this.x = bestMove.x;
                this.y = bestMove.y;
                console.log(`Deer ${this.id} immediately moved 1 tile from (${this.x + (playerX - bestMove.x)}, ${this.y + (playerY - bestMove.y)}) to (${this.x}, ${this.y})`);
            }
        }
        
        // Reset move timer so deer doesn't move again immediately
        this.lastMoveTime = Date.now();
    }
    
    update(playerX, playerY, allDeer, currentTime) {
        // Update state timer
        this.stateTimer += 200;
        
        // Check for player detection
        const playerDistance = this.distanceTo(playerX, playerY);
        const canSeePlayer = this.canSeePosition(playerX, playerY);
        
        // Update player memory
        if (canSeePlayer) {
            this.lastPlayerPosition = { x: playerX, y: playerY };
            this.lastPlayerSeen = currentTime;
        }
        
        // State machine
        switch (this.state) {
            case 'wandering':
                this.updateWandering(playerX, playerY, playerDistance, canSeePlayer, currentTime, allDeer);
                break;
            case 'alert':
                this.updateAlert(playerX, playerY, playerDistance, canSeePlayer, currentTime);
                break;
            case 'fleeing':
                this.updateFleeing(playerX, playerY, allDeer, playerDistance, canSeePlayer, currentTime);
                break;
        }
        
        // Execute movement if it's time (normal timed movement - always 1 tile)
        if (currentTime - this.lastMoveTime >= this.currentMoveInterval) {
            this.executeMovement();
            this.lastMoveTime = currentTime;
        }
    }
    
    updateWandering(playerX, playerY, playerDistance, canSeePlayer, currentTime, allDeer) {
        // Check if other deer are fleeing nearby (herd behavior)
        const nearbyFleeingDeer = this.getNearbyFleeingDeer(allDeer, 12);
        if (nearbyFleeingDeer.length > 0) {
            this.setState('alert');
            this.currentMoveInterval = this.alertMoveInterval;
            return;
        }
        
        // Update wander target periodically
        this.wanderTimer += 200;
        if (this.wanderTimer >= this.wanderDuration || !this.wanderTarget) {
            this.generateWanderTarget();
            this.wanderTimer = 0;
        }
        
        // Move toward wander target (randomly) - 1 tile at a time
        if (this.wanderTarget && Math.random() < this.wanderMoveChance) {
            this.moveSingleTileToward(this.wanderTarget.x, this.wanderTarget.y);
        }
    }
    
    updateAlert(playerX, playerY, playerDistance, canSeePlayer, currentTime) {
        // Faster transition from alert
        if (this.stateTimer >= 600) {
            if (canSeePlayer && playerDistance <= this.alertRange) {
                this.setState('fleeing');
                this.currentMoveInterval = this.fleeMoveInterval;
                this.generateFleeTarget(playerX, playerY);
            } else {
                this.setState('wandering');
                this.currentMoveInterval = this.baseMoveInterval;
            }
        }
        
        // While alert, slowly back away 1 tile at a time
        if (canSeePlayer && playerDistance < this.alertRange + 1) {
            const awayX = this.x + (this.x - playerX);
            const awayY = this.y + (this.y - playerY);
            this.moveSingleTileToward(Math.floor(awayX), Math.floor(awayY));
        }
    }
    
    updateFleeing(playerX, playerY, allDeer, playerDistance, canSeePlayer, currentTime) {
        this.fleeTimer += 200;
        
        const hasRecentPlayerMemory = (currentTime - this.lastPlayerSeen) < this.playerMemoryTime;
        const effectivePlayerDistance = hasRecentPlayerMemory ? 
            this.distanceTo(this.lastPlayerPosition.x, this.lastPlayerPosition.y) : 
            playerDistance;
        
        // Stop fleeing if conditions are met
        if (this.fleeTimer >= this.maxFleeTime || 
            (effectivePlayerDistance >= this.fleeDistance && this.fleeTimer >= 3000)) {
            this.setState('wandering');
            this.currentMoveInterval = this.baseMoveInterval;
            return;
        }
        
        // CHANGED: Move 1 tile per update instead of multiple tiles
        const fleeDirection = this.calculateFleeDirection(
            hasRecentPlayerMemory ? this.lastPlayerPosition.x : playerX,
            hasRecentPlayerMemory ? this.lastPlayerPosition.y : playerY,
            allDeer
        );
        
        this.moveSingleTileToward(fleeDirection.x, fleeDirection.y);
    }
    
    calculateFleeDirection(playerX, playerY, allDeer) {
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let fleeX = this.x;
        let fleeY = this.y;
        
        if (distance > 0) {
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;
            fleeX = this.x + normalizedX * 10; // Direction, not actual distance
            fleeY = this.y + normalizedY * 10;
        }
        
        // Flocking behavior
        const nearbyFleeingDeer = this.getNearbyFleeingDeer(allDeer, this.flockRadius);
        
        if (nearbyFleeingDeer.length > 0) {
            let avgFleeX = 0, avgFleeY = 0;
            nearbyFleeingDeer.forEach(deer => {
                const deerDx = deer.x - playerX;
                const deerDy = deer.y - playerY;
                const deerDist = Math.sqrt(deerDx * deerDx + deerDy * deerDy);
                if (deerDist > 0) {
                    avgFleeX += deerDx / deerDist;
                    avgFleeY += deerDy / deerDist;
                }
            });
            avgFleeX /= nearbyFleeingDeer.length;
            avgFleeY /= nearbyFleeingDeer.length;
            
            fleeX = fleeX * (1 - this.flockStrength) + (this.x + avgFleeX * 10) * this.flockStrength;
            fleeY = fleeY * (1 - this.flockStrength) + (this.y + avgFleeY * 10) * this.flockStrength;
        }
        
        return { x: Math.floor(fleeX), y: Math.floor(fleeY) };
    }
    
    getNearbyFleeingDeer(allDeer, radius) {
        return allDeer.filter(deer => 
            deer.id !== this.id && 
            deer.state === 'fleeing' && 
            this.distanceTo(deer.x, deer.y) <= radius
        );
    }
    
    // CHANGED: New method that always moves exactly 1 tile
    moveSingleTileToward(targetX, targetY) {
        if (targetX === this.x && targetY === this.y) return;
        
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        
        // Calculate the best single-tile move
        let moveX = 0, moveY = 0;
        
        // Determine direction preference
        if (Math.abs(dx) > Math.abs(dy)) {
            // Prefer horizontal movement
            moveX = dx > 0 ? 1 : -1;
            if (Math.abs(dy) > 0.5) { // Add vertical component if significant
                moveY = dy > 0 ? 1 : -1;
            }
        } else {
            // Prefer vertical movement
            moveY = dy > 0 ? 1 : -1;
            if (Math.abs(dx) > 0.5) { // Add horizontal component if significant
                moveX = dx > 0 ? 1 : -1;
            }
        }
        
        // Try diagonal movement first (most efficient)
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
        
        // Try alternative single-tile moves
        this.tryAlternativeSingleTileMovement(dx, dy);
    }
    
    // CHANGED: Alternative movement that only moves 1 tile
    tryAlternativeSingleTileMovement(dx, dy) {
        const alternatives = [
            { x: dx > 0 ? 1 : (dx < 0 ? -1 : 0), y: 0 },
            { x: 0, y: dy > 0 ? 1 : (dy < 0 ? -1 : 0) },
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
        ];
        
        for (const alt of alternatives) {
            const newX = this.x + alt.x;
            const newY = this.y + alt.y;
            if (this.terrainSystem.canMoveTo(newX, newY)) {
                this.x = newX;
                this.y = newY;
                return; // Move exactly 1 tile and stop
            }
        }
    }
    
    generateWanderTarget() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 4 + Math.random() * 6;
        
        const targetX = Math.floor(this.x + Math.cos(angle) * distance);
        const targetY = Math.floor(this.y + Math.sin(angle) * distance);
        
        if (this.terrainSystem.canMoveTo(targetX, targetY)) {
            this.wanderTarget = { x: targetX, y: targetY };
        } else {
            const closeX = Math.floor(this.x + Math.cos(angle) * 3);
            const closeY = Math.floor(this.y + Math.sin(angle) * 3);
            if (this.terrainSystem.canMoveTo(closeX, closeY)) {
                this.wanderTarget = { x: closeX, y: closeY };
            }
        }
    }
    
    generateFleeTarget(playerX, playerY) {
        const candidates = [];
        
        for (let attempt = 0; attempt < 12; attempt++) {
            const dx = this.x - playerX;
            const dy = this.y - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const baseAngle = Math.atan2(dy, dx);
                const angle = baseAngle + (Math.random() - 0.5) * Math.PI * 0.6;
                
                const fleeDistance = this.fleeDistance + Math.random() * 8;
                const fleeX = Math.floor(this.x + Math.cos(angle) * fleeDistance);
                const fleeY = Math.floor(this.y + Math.sin(angle) * fleeDistance);
                
                if (this.terrainSystem.canMoveTo(fleeX, fleeY)) {
                    const distanceFromPlayer = Math.sqrt((fleeX - playerX) ** 2 + (fleeY - playerY) ** 2);
                    candidates.push({ x: fleeX, y: fleeY, distance: distanceFromPlayer });
                }
            }
        }
        
        if (candidates.length > 0) {
            candidates.sort((a, b) => b.distance - a.distance);
            this.fleeTarget = { x: candidates[0].x, y: candidates[0].y };
        }
    }
    
    // CHANGED: Rename old method to avoid confusion
    executeMovement() {
        // Movement logic is now handled in moveSingleTileToward
    }
    
    setState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            this.stateTimer = 0;
            
            if (newState === 'fleeing') {
                this.fleeTimer = 0;
            }
        }
    }
    
    canSeePosition(x, y) {
        const distance = this.distanceTo(x, y);
        if (distance > this.visionRange) return false;
        
        return this.hasLineOfSight(this.x, this.y, x, y);
    }
    
    hasLineOfSight(fromX, fromY, toX, toY) {
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
            reactionQueueLength: this.reactionQueue.length,
            lastPlayerDistance: this.lastPlayerDistance.toFixed(2),
            currentMoveInterval: this.currentMoveInterval,
            movementType: "single-tile", // NEW: Indicates movement type
            maxTilesPerMove: 1 // NEW: Shows max tiles per movement
        };
    }
}