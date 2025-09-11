/**
 * Host Party page functionality
 */

import { getJson, postJson } from './api.js';

// Initialize host page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Host Party page loaded');
    
    // Generate a random party code
    generatePartyCode();
});

function generatePartyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('party-code').textContent = code;
}

// Global functions for inline onclick handlers
window.copyPartyCode = function() {
    const partyCode = document.getElementById('party-code').textContent;
    navigator.clipboard.writeText(partyCode).then(() => {
        alert('Party code copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = partyCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Party code copied to clipboard!');
    });
};

window.kickPlayer = function(playerName) {
    if (confirm(`Are you sure you want to kick ${playerName}?`)) {
        console.log(`Kicking player: ${playerName}`);
        // TODO: Implement kick player functionality
    }
};

window.startGame = function() {
    const settings = {
        rounds: document.getElementById('rounds-setting').value,
        timeLimit: document.getElementById('time-setting').value,
        maxPlayers: document.getElementById('players-setting').value,
        characterLimit: document.getElementById('chars-setting').value
    };
    
    console.log('Starting game with settings:', settings);
    
    // TODO: Implement start game functionality
    alert('Game starting! (Feature coming soon)');
};
