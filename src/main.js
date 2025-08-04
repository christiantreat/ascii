let game;

document.addEventListener('DOMContentLoaded', () => {
    game = new GameEngine();
});

// Initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, event listener will handle it
} else {
    // DOM is already loaded
    game = new GameEngine();
}