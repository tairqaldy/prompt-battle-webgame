/**
 * Freeze Screen page functionality
 */

import { getJson } from './api.js';

let currentPlayer = null;
let roundId = null;
let roomCode = null;
let roundData = null;

// Initialize freeze page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Freeze Screen page loaded');
    
    // Get round ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    roundId = urlParams.get('roundId');
    roomCode = urlParams.get('roomCode');
    
    if (!roundId) {
        alert('No round ID provided. Redirecting to lobby.');
        window.location.href = 'index.html';
        return;
    }
    
    // Load player info
    const savedPlayer = localStorage.getItem('currentPlayer');
    if (savedPlayer) {
        currentPlayer = JSON.parse(savedPlayer);
    }
    
    // Set room code in UI
    if (roomCode) {
        document.getElementById('room-code').textContent = roomCode;
    }
    
    // Load round data
    await loadRoundData();
    
    // Set up WebSocket event handlers
    setupSocketHandlers();
    
    // Start checking for results
    startResultsPolling();
});

async function loadRoundData() {
    try {
        const response = await getJson(`/api/rounds/${roundId}`);
        if (response.success) {
            roundData = response.round;
            
            // Update UI with round data
            document.getElementById('round-number').textContent = '1'; // Default to round 1
            document.getElementById('round-number-2').textContent = '1';
            
            // Load the image
            const gameImage = document.getElementById('game-image');
            if (gameImage && roundData.imagePath) {
                gameImage.src = roundData.imagePath;
            }
            
        } else {
            showError('Failed to load round data: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading round data:', error);
        showError('Failed to load round data. Please refresh the page.');
    }
}

function setupSocketHandlers() {
    if (window.socketClient) {
        window.socketClient.on('round-ended', (data) => {
            console.log('Round ended, redirecting to results');
            // Redirect to results page
            window.location.href = `results.html?roundId=${data.roundId}&roomCode=${roomCode}`;
        });
        
        window.socketClient.on('prompt-submitted', (data) => {
            updateSubmissionStatus(data.playerName);
        });
    }
}

function updateSubmissionStatus(playerName) {
    const submissionList = document.getElementById('submission-list');
    
    // Check if player already in list
    const existingItem = submissionList.querySelector(`[data-player="${playerName}"]`);
    if (existingItem) return;
    
    // Add new submission
    const submissionItem = document.createElement('div');
    submissionItem.className = 'submission-item';
    submissionItem.setAttribute('data-player', playerName);
    submissionItem.innerHTML = `
        <span class="player-name">${playerName}</span>
        <span class="status submitted">✅ Submitted</span>
    `;
    
    submissionList.appendChild(submissionItem);
}

function startResultsPolling() {
    // Poll for results every 2 seconds
    const pollInterval = setInterval(async () => {
        try {
            const response = await getJson(`/api/rounds/${roundId}/results`);
            if (response.success && response.results && response.results.length > 0) {
                // Results are ready, redirect to results page
                clearInterval(pollInterval);
                window.location.href = `results.html?roundId=${roundId}&roomCode=${roomCode}`;
            }
        } catch (error) {
            console.error('Error polling for results:', error);
        }
    }, 2000);
    
    // Stop polling after 30 seconds
    setTimeout(() => {
        clearInterval(pollInterval);
    }, 30000);
}

// Global functions for inline onclick handlers
window.leaveRoom = function() {
    if (confirm('Are you sure you want to leave the game?')) {
        // Clear game data
        localStorage.removeItem('currentGame');
        localStorage.removeItem('currentPlayer');
        
        // Leave room via socket
        if (window.socketClient) {
            window.socketClient.leaveRoom();
        }
        
        window.location.href = 'index.html';
    }
};

// Utility functions
function showError(message) {
    alert('Error: ' + message);
}