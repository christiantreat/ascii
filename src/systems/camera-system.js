// === CAMERA SYSTEM MODULE ===
// File: camera-system.js
class CameraSystem {
    constructor(viewWidth, viewHeight, terrainSystem) {
        this.viewWidth = viewWidth;
        this.viewHeight = viewHeight;
        this.terrainSystem = terrainSystem;
        
        // Camera position (what the camera is looking at)
        this.cameraX = 0;
        this.cameraY = 0;
    }
    
    updateCamera(playerX, playerY) {
        // Get world bounds from terrain system
        const worldBounds = this.terrainSystem.getWorldBounds();
        
        // Calculate desired camera position (centered on player)
        let desiredCameraX = playerX;
        let desiredCameraY = playerY;
        
        // Calculate how far camera can scroll before hitting world edges
        const halfViewWidth = Math.floor(this.viewWidth / 2);
        const halfViewHeight = Math.floor(this.viewHeight / 2);
        
        // Constrain camera so it doesn't show beyond world boundaries
        const cameraMinX = worldBounds.minX + halfViewWidth;
        const cameraMaxX = worldBounds.maxX - halfViewWidth;
        const cameraMinY = worldBounds.minY + halfViewHeight;
        const cameraMaxY = worldBounds.maxY - halfViewHeight;
        
        // Clamp camera position
        this.cameraX = Math.max(cameraMinX, Math.min(cameraMaxX, desiredCameraX));
        this.cameraY = Math.max(cameraMinY, Math.min(cameraMaxY, desiredCameraY));
    }
    
    getViewStartPosition() {
        return {
            startX: this.cameraX - Math.floor(this.viewWidth / 2),
            startY: this.cameraY - Math.floor(this.viewHeight / 2)
        };
    }
    
    // Camera no longer owns world boundary methods - delegates to terrain
    isPlayerAtWorldBoundary(playerX, playerY) {
        return this.terrainSystem.isAtWorldBoundary(playerX, playerY);
    }
}