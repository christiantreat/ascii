// In src/entities/player.js (new file)
class Player extends GameObject {
    constructor(terrainSystem) {
        const playerMovementRules = {
            canWalkOn: ['plains', 'forest', 'foothills', 'mountain', 'road', 'trail'],
            cannotWalkOn: ['river', 'lake', 'building', 'village']
        };
        super(terrainSystem, playerMovementRules);
    }
}