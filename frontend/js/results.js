/**
 * Results Screen page functionality
 */

import { getJson } from './api.js';

let currentPlayer = null;
let roundId = null;
let roomCode = null;
let resultsData = null;
let isHost = false;

// Initialize results page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Results Screen page loaded');
    
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
    
    // Check if current player is host
    isHost = localStorage.getItem('isHost') === 'true';
    
    // Set room code in UI
    if (roomCode) {
        document.getElementById('room-code').textContent = roomCode;
    }
    
    // Load results data
    await loadResultsData();
    
    // Set up WebSocket event handlers
    setupSocketHandlers();
});

async function loadResultsData() {
    try {
        const response = await getJson(`/api/rounds/${roundId}/results`);
        if (response.success) {
            resultsData = response;
            
            // Update UI with results
            updatePlayerPerformance();
            updateAllSubmissions();
            updateRoundLeaderboard();
            updateRoundInfo();
            
        } else {
            showError('Failed to load results: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading results:', error);
        showError('Failed to load results. Please refresh the page.');
    }
}

function updatePlayerPerformance() {
    if (!currentPlayer || !resultsData.results) return;
    
    const playerResult = resultsData.results.find(r => r.playerName === currentPlayer.name);
    if (!playerResult) return;
    
    // Update player stats
    document.getElementById('player-score').textContent = playerResult.score;
    document.getElementById('words-matched').textContent = playerResult.matched ? playerResult.matched.split(', ').length : 0;
    document.getElementById('words-missed').textContent = playerResult.missed ? playerResult.missed.split(', ').length : 0;
    
    // Find player rank
    const sortedResults = [...resultsData.results].sort((a, b) => b.score - a.score);
    const playerRank = sortedResults.findIndex(r => r.playerName === currentPlayer.name) + 1;
    document.getElementById('player-rank').textContent = `${playerRank}${getOrdinalSuffix(playerRank)}`;
    
    // Update prompts
    document.getElementById('player-prompt').textContent = playerResult.promptText;
    document.getElementById('original-prompt').textContent = resultsData.round.sourcePrompt;
    document.getElementById('score-explanation').textContent = playerResult.explanation || 'No explanation available';
}

function updateAllSubmissions() {
    const submissionsContainer = document.getElementById('all-submissions');
    submissionsContainer.innerHTML = '';
    
    if (!resultsData.results) return;
    
    const sortedResults = [...resultsData.results].sort((a, b) => b.score - a.score);
    
    sortedResults.forEach((result, index) => {
        const submissionItem = document.createElement('div');
        submissionItem.className = 'submission-item';
        submissionItem.innerHTML = `
            <span class="player-name">${result.playerName}</span>
            <span class="score">${result.score}%</span>
        `;
        submissionsContainer.appendChild(submissionItem);
    });
}

function updateRoundLeaderboard() {
    const leaderboard = document.getElementById('round-leaderboard');
    leaderboard.innerHTML = '';
    
    if (!resultsData.results) return;
    
    const sortedResults = [...resultsData.results].sort((a, b) => b.score - a.score);
    
    sortedResults.forEach((result, index) => {
        const leaderboardItem = document.createElement('div');
        leaderboardItem.className = 'leaderboard-item';
        leaderboardItem.innerHTML = `
            <span class="rank">${index + 1}${getOrdinalSuffix(index + 1)}</span>
            <span class="player-name">${result.playerName}</span>
            <span class="score">${result.score}%</span>
        `;
        leaderboard.appendChild(leaderboardItem);
    });
}

function updateRoundInfo() {
    // Update round numbers (this would be dynamic in a real game)
    document.getElementById('round-number').textContent = '1';
    document.getElementById('round-number-2').textContent = '1';
    
    // Show appropriate buttons based on host status
    if (isHost) {
        document.getElementById('next-round-section').style.display = 'block';
    } else {
        document.getElementById('game-complete-section').style.display = 'block';
    }
}

function setupSocketHandlers() {
    if (window.socketClient) {
        window.socketClient.on('round-started', (data) => {
            console.log('New round started, redirecting');
            window.location.href = `round.html?roundId=${data.roundId}&roomCode=${roomCode}`;
        });
    }
}

function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

// Global functions for inline onclick handlers
window.leaveRoom = function() {
    if (confirm('Are you sure you want to leave the game?')) {
        // Clear game data
        localStorage.removeItem('currentGame');
        localStorage.removeItem('currentPlayer');
        localStorage.removeItem('isHost');
        
        // Leave room via socket
        if (window.socketClient) {
            window.socketClient.leaveRoom();
        }
        
        window.location.href = 'index.html';
    }
};

window.nextRound = function() {
    if (!isHost) {
        alert('Only the host can start the next round');
        return;
    }
    
    if (window.socketClient) {
        window.socketClient.startGame();
    }
};

window.viewFinalResults = function() {
    window.location.href = `final.html?roomCode=${roomCode}`;
};

// Utility functions
function showError(message) {
    alert('Error: ' + message);
}