/**
 * Final Results page functionality
 */

import { getJson, postJson } from './api.js';

// Initialize final page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Final Results page loaded');
    
    // TODO: Implement final results functionality
});

// Global functions for inline onclick handlers
window.exitGame = function() {
    if (confirm('Exit the game?')) {
        window.location.href = 'index.html';
    }
};

window.playAgain = function() {
    if (confirm('Start a new game?')) {
        window.location.href = 'host.html';
    }
};

window.returnToLobby = function() {
    window.location.href = 'index.html';
};
