/**
 * Main Lobby page functionality
 */

import { getJson } from './api.js';

// Initialize lobby page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Main Lobby page loaded');
    
    // Test API connection
    try {
        const health = await getJson('/api/health');
        console.log('API health check:', health);
    } catch (error) {
        console.error('Failed to connect to API:', error);
    }
});

// Global functions for inline onclick handlers
window.showJoinParty = function() {
    const joinSection = document.getElementById('join-party-section');
    joinSection.style.display = joinSection.style.display === 'none' ? 'block' : 'none';
};

window.showHowToPlay = function() {
    alert('How to Play:\n\n1. Create or join a party\n2. Write prompts for AI-generated images\n3. Compete with other players\n4. Get scored on prompt accuracy');
};

window.showSettings = function() {
    alert('Settings feature coming soon!');
};

window.joinParty = function() {
    const partyCode = document.getElementById('party-code').value.trim();
    if (partyCode.length === 6) {
        // Navigate to guest page with party code
        window.location.href = `guest.html?code=${partyCode}`;
    } else {
        alert('Please enter a valid 6-character party code');
    }
};
