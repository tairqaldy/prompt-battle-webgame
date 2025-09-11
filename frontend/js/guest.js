/**
 * Guest Party page functionality
 */

import { getJson, postJson } from './api.js';

// Game state
let currentPlayer = null;
let roomCode = null;
let players = [];

// Initialize guest page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Guest Party page loaded');
    
    // Get party code from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = urlParams.get('code');
    
    if (!roomCode) {
        alert('No party code provided. Redirecting to lobby.');
        window.location.href = 'index.html';
        return;
    }
    
    // Load player info
    const savedPlayer = localStorage.getItem('currentPlayer');
    if (savedPlayer) {
        currentPlayer = JSON.parse(savedPlayer);
    }
    
    // Set party code in UI
    document.getElementById('party-code').textContent = roomCode;
    
    // Load room data
    await loadRoomData();
    
    // Start polling for updates
    startPolling();
});

async function loadRoomData() {
    try {
        const response = await getJson(`/api/rooms/${roomCode}/players`);
        if (response.success) {
            players = response.players || [];
            updatePlayersList();
        } else {
            console.error('Failed to load room data:', response.error);
        }
    } catch (error) {
        console.error('Error loading room data:', error);
    }
}

function updatePlayersList() {
    const playerList = document.querySelector('.player-list');
    if (!playerList) return;
    
    playerList.innerHTML = '';
    
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <span class="player-name">@ ${player.name}</span>
        `;
        playerList.appendChild(playerItem);
    });
    
    // Add empty slots (max 8 players)
    const maxPlayers = 8;
    for (let i = players.length; i < maxPlayers; i++) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'player-item empty';
        emptyItem.innerHTML = '<span class="empty-slot">Empty slot</span>';
        playerList.appendChild(emptyItem);
    }
}

function updateStatusMessage(message) {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = `"${message}"`;
    }
}

function startPolling() {
    // Poll for player updates and active rounds every 2 seconds
    setInterval(async () => {
        try {
            // Check for player updates
            const playersResponse = await getJson(`/api/rooms/${roomCode}/players`);
            if (playersResponse.success) {
                const newPlayers = playersResponse.players;
                if (JSON.stringify(newPlayers) !== JSON.stringify(players)) {
                    players = newPlayers;
                    updatePlayersList();
                }
            }
            
            // Check for active rounds
            const roundResponse = await getJson(`/api/rooms/${roomCode}/active-round`);
            if (roundResponse.success && roundResponse.hasActiveRound) {
                // Game has started, show message and redirect
                updateStatusMessage('Game starting... Redirecting to round!');
                console.log('Game started, redirecting to round:', roundResponse.roundId);
                
                // Small delay to show the message
                setTimeout(() => {
                    window.location.href = `round.html?roundId=${roundResponse.roundId}`;
                }, 1000);
                return; // Stop polling
            }
        } catch (error) {
            console.error('Error polling for updates:', error);
        }
    }, 2000);
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

window.leaveParty = function() {
    if (confirm('Are you sure you want to leave the party?')) {
        // Clear any stored data
        localStorage.removeItem('currentPlayer');
        localStorage.removeItem('currentGame');
        
        // Redirect to lobby
        window.location.href = 'index.html';
    }
};
