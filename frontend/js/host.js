/**
 * Host Party page functionality
 */

import { getJson, postJson } from './api.js';

// Game state
let currentPlayer = null;
let roomCode = null;
let players = [];
let gameState = null;

// Initialize host page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Host Party page loaded');
    
    // Get room code from URL
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = urlParams.get('code');
    
    if (!roomCode) {
        alert('No room code provided. Redirecting to lobby.');
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
    
    // Set up WebSocket event handlers
    setupSocketHandlers();
    
    // Start polling for updates (fallback)
    startPolling();
});

function setupSocketHandlers() {
    if (window.socketClient) {
        window.socketClient.on('player-joined', (data) => {
            console.log('Player joined:', data);
            players = data.players;
            updatePlayersList();
        });
        
        window.socketClient.on('player-left', (data) => {
            console.log('Player left:', data);
            players = data.players;
            updatePlayersList();
        });
        
        window.socketClient.on('round-started', (data) => {
            console.log('Round started:', data);
            // Store game info
            localStorage.setItem('currentGame', JSON.stringify(data));
            
            // Navigate to round page
            window.location.href = `round.html?roundId=${data.roundId}&roomCode=${roomCode}`;
        });
        
        window.socketClient.on('error', (error) => {
            showError(error.message || 'Connection error');
        });
    }
}

async function loadRoomData() {
    try {
        const response = await getJson(`/api/rooms/${roomCode}`);
        if (response.success) {
            gameState = response.room;
            players = gameState.players || [];
            updatePlayersList();
        } else {
            showError('Failed to load room data: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading room data:', error);
        showError('Failed to load room data. Please refresh the page.');
    }
}

function updatePlayersList() {
    const playerList = document.querySelector('.player-list');
    playerList.innerHTML = '';
    
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <span class="player-name">${player.name}</span>
            <button class="kick-btn" onclick="kickPlayer(${player.id}, '${player.name}')">✕</button>
        `;
        playerList.appendChild(playerItem);
    });
    
    // Add empty slots
    const maxPlayers = parseInt(document.getElementById('players-setting').value) || 8;
    for (let i = players.length; i < maxPlayers; i++) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'player-item empty';
        emptyItem.innerHTML = '<span class="empty-slot">Empty slot</span>';
        playerList.appendChild(emptyItem);
    }
}

function startPolling() {
    // Poll for player updates every 2 seconds
    setInterval(async () => {
        try {
            const response = await getJson(`/api/rooms/${roomCode}/players`);
            if (response.success) {
                const newPlayers = response.players;
                if (JSON.stringify(newPlayers) !== JSON.stringify(players)) {
                    players = newPlayers;
                    updatePlayersList();
                }
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

window.kickPlayer = async function(playerId, playerName) {
    if (confirm(`Are you sure you want to kick ${playerName}?`)) {
        try {
            const response = await fetch(`/api/rooms/${roomCode}/players/${playerId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Remove player from local list
                players = players.filter(p => p.id !== playerId);
                updatePlayersList();
            } else {
                showError('Failed to kick player: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error kicking player:', error);
            showError('Failed to kick player. Please try again.');
        }
    }
};

window.startGame = async function() {
    if (players.length < 2) {
        showError('Need at least 2 players to start the game');
        return;
    }
    
    try {
        showLoading('Starting game...');
        
        // Use WebSocket to start game
        if (window.socketClient && window.socketClient.connected) {
            window.socketClient.startGame();
        } else {
            // Fallback to REST API
            const response = await postJson(`/api/rooms/${roomCode}/start`, {});
            
            if (response.success) {
                // Store game info
                localStorage.setItem('currentGame', JSON.stringify(response.game));
                
                // Navigate to round page
                window.location.href = `round.html?roundId=${response.game.roundId}&roomCode=${roomCode}`;
            } else {
                showError('Failed to start game: ' + (response.error || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error('Error starting game:', error);
        showError('Failed to start game. Please try again.');
    } finally {
        hideLoading();
    }
};

// Utility functions
function showError(message) {
    alert('Error: ' + message);
}

function showLoading(message) {
    const button = document.querySelector('.start-game-btn');
    if (button) {
        button.disabled = true;
        button.textContent = message;
    }
}

function hideLoading() {
    const button = document.querySelector('.start-game-btn');
    if (button) {
        button.disabled = false;
        button.textContent = 'Start Game';
    }
}
