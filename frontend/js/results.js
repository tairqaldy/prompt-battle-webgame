/**
 * Results page functionality
 */

import { getJson, postJson } from './api.js';

// Initialize results page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Results page loaded');
    
    // TODO: Implement results functionality
});

// Global functions for inline onclick handlers
window.nextRound = function() {
    if (confirm('Start next round?')) {
        window.location.href = 'round.html';
    }
};
