// In src/entities/player.js (new file)
class Player extends GameObject {
    constructor(terrainSystem) {
        const playerMovementRules = {
            canWalkOn: ['plains', 'forest', 'foothills', 'road', 'trail'],
            cannotWalkOn: ['river', 'lake', 'mountain', 'building', 'village']
        };
        super(terrainSystem, playerMovementRules);
    }
}