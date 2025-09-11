/**
 * Freeze Screen page functionality
 */

import { getJson, postJson } from './api.js';

// Initialize freeze page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Freeze Screen page loaded');
    
    // TODO: Implement freeze screen functionality
});

// Global functions for inline onclick handlers
window.cancelWait = function() {
    if (confirm('Cancel waiting and return to lobby?')) {
        window.location.href = 'index.html';
    }
};

window.leaveRoom = function() {
    if (confirm('Are you sure you want to leave the game?')) {
        window.location.href = 'index.html';
    }
};
