/**
 * Guest Party page functionality
 */

import { getJson, postJson } from './api.js';

// Initialize guest page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Guest Party page loaded');
    
    // Get party code from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const partyCode = urlParams.get('code');
    if (partyCode) {
        document.getElementById('party-code').textContent = partyCode;
    }
});

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

window.leaveParty = function() {
    if (confirm('Are you sure you want to leave the party?')) {
        window.location.href = 'index.html';
    }
};
