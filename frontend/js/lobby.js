/**
 * Main Lobby page functionality
 */

import { getJson, postJson } from './api.js';

// Game state
let currentPlayer = null;

// Initialize lobby page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Main Lobby page loaded');
    
    // Test API connection
    try {
        const health = await getJson('/api/health');
        console.log('API health check:', health);
        
        // Load player name from localStorage if exists
        const savedPlayer = localStorage.getItem('currentPlayer');
        if (savedPlayer) {
            currentPlayer = JSON.parse(savedPlayer);
        }
        
        // Set up WebSocket event handlers
        setupSocketHandlers();
        
    } catch (error) {
        console.error('Failed to connect to API:', error);
        showError('Unable to connect to server. Please check your connection.');
    }
});

function setupSocketHandlers() {
    if (window.socketClient) {
        window.socketClient.on('error', (error) => {
            showError(error.message || 'Connection error');
        });
    }
}

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

window.joinParty = async function() {
    const partyCode = document.getElementById('party-code').value.trim().toUpperCase();
    
    if (partyCode.length !== 6) {
        showError('Please enter a valid 6-character party code');
        return;
    }
    
    // Get player name
    const playerName = prompt('Enter your name:');
    if (!playerName || playerName.trim().length === 0) {
        showError('Please enter a valid player name');
        return;
    }
    
    try {
        showLoading('Joining party...');
        
        // Use WebSocket to join room
        if (window.socketClient && window.socketClient.connected) {
            const response = await window.socketClient.joinRoom(partyCode, playerName.trim());
            
            // Store player info
            currentPlayer = response.player;
            localStorage.setItem('currentPlayer', JSON.stringify(currentPlayer));
            localStorage.setItem('isHost', 'false');
            
            // Navigate to guest page
            window.location.href = `guest.html?code=${partyCode}`;
        } else {
            // Fallback to REST API
            const response = await postJson(`/api/rooms/${partyCode}/join`, {
                playerName: playerName.trim()
            });
            
            if (response.success) {
                // Store player info
                currentPlayer = response.player;
                localStorage.setItem('currentPlayer', JSON.stringify(currentPlayer));
                localStorage.setItem('isHost', 'false');
                
                // Navigate to guest page
                window.location.href = `guest.html?code=${partyCode}`;
            } else {
                showError('Failed to join party: ' + (response.error || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error('Error joining party:', error);
        if (error.message.includes('404')) {
            showError('Party not found. Please check the party code.');
        } else if (error.message.includes('409')) {
            showError('Player name already taken or room is full.');
        } else {
            showError('Failed to join party. Please try again.');
        }
    } finally {
        hideLoading();
    }
};

window.createParty = async function() {
    // Get player name
    const playerName = prompt('Enter your name:');
    if (!playerName || playerName.trim().length === 0) {
        showError('Please enter a valid player name');
        return;
    }
    
    try {
        showLoading('Creating party...');
        
        const response = await postJson('/api/rooms', {
            settings: {
                rounds: 3,
                timeLimit: 60,
                maxPlayers: 8,
                characterLimit: 100
            }
        });
        
        if (response.success) {
            // Join the created room as host using WebSocket
            if (window.socketClient && window.socketClient.connected) {
                const joinResponse = await window.socketClient.joinRoom(response.room.code, playerName.trim());
                
                // Store player info
                currentPlayer = joinResponse.player;
                localStorage.setItem('currentPlayer', JSON.stringify(currentPlayer));
                localStorage.setItem('isHost', 'true');
                
                // Navigate to host page
                window.location.href = `host.html?code=${response.room.code}`;
            } else {
                // Fallback to REST API
                const joinResponse = await postJson(`/api/rooms/${response.room.code}/join`, {
                    playerName: playerName.trim()
                });
                
                if (joinResponse.success) {
                    // Store player info
                    currentPlayer = joinResponse.player;
                    localStorage.setItem('currentPlayer', JSON.stringify(currentPlayer));
                    localStorage.setItem('isHost', 'true');
                    
                    // Navigate to host page
                    window.location.href = `host.html?code=${response.room.code}`;
                } else {
                    showError('Failed to join created party: ' + (joinResponse.error || 'Unknown error'));
                }
            }
        } else {
            showError('Failed to create party: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error creating party:', error);
        showError('Failed to create party. Please try again.');
    } finally {
        hideLoading();
    }
};

// Utility functions
function showError(message) {
    alert('Error: ' + message);
}

function showLoading(message) {
    // Simple loading indicator
    const button = event.target;
    if (button) {
        button.disabled = true;
        button.textContent = message;
    }
}

function hideLoading() {
    // Reset button states
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.disabled = false;
        if (btn.textContent.includes('...')) {
            btn.textContent = btn.textContent.replace('...', '');
        }
    });
}
