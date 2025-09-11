/**
 * Final Results Screen page functionality
 */

import { getJson } from './api.js';

let currentPlayer = null;
let roomCode = null;
let finalResults = null;

// Initialize final results page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Final Results Screen page loaded');
    
    // Get room code from URL
    const urlParams = new URLSearchParams(window.location.search);
    roomCode = urlParams.get('roomCode');
    
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
    
    // Load final results data
    await loadFinalResults();
});

async function loadFinalResults() {
    try {
        const response = await getJson(`/api/rooms/${roomCode}/final-results`);
        if (response.success) {
            finalResults = response;
            
            // Update UI with final results
            updateWinnerInfo();
            updateGameStats();
            updateFinalLeaderboard();
            
        } else {
            showError('Failed to load final results: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading final results:', error);
        showError('Failed to load final results. Please refresh the page.');
    }
}

function updateWinnerInfo() {
    if (!finalResults.finalResults || finalResults.finalResults.length === 0) return;
    
    // Get winner (highest total score)
    const winner = finalResults.finalResults[0];
    
    document.getElementById('winner-name').textContent = winner.playerName;
    document.getElementById('winner-score').textContent = winner.totalScore || 0;
    
    // For now, use the first result as "best prompt" - in a real game this would be more sophisticated
    document.getElementById('best-prompt-text').textContent = winner.promptText || 'No prompt available';
    document.getElementById('best-prompt-score').textContent = `Score: ${winner.score || 0}`;
}

function updateGameStats() {
    if (!finalResults.finalResults) return;
    
    const results = finalResults.finalResults;
    const totalPlayers = results.length;
    const totalRounds = 3; // This would be dynamic in a real game
    const totalScore = results.reduce((sum, r) => sum + (r.totalScore || 0), 0);
    const averageScore = totalPlayers > 0 ? Math.round(totalScore / totalPlayers) : 0;
    const highestScore = Math.max(...results.map(r => r.totalScore || 0));
    
    document.getElementById('total-rounds').textContent = totalRounds;
    document.getElementById('total-players').textContent = totalPlayers;
    document.getElementById('average-score').textContent = averageScore;
    document.getElementById('highest-score').textContent = highestScore;
}

function updateFinalLeaderboard() {
    const leaderboard = document.getElementById('final-leaderboard');
    leaderboard.innerHTML = '';
    
    if (!finalResults.finalResults) return;
    
    const sortedResults = [...finalResults.finalResults].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    
    sortedResults.forEach((result, index) => {
        const leaderboardItem = document.createElement('div');
        leaderboardItem.className = 'leaderboard-item';
        leaderboardItem.innerHTML = `
            <span class="rank">${index + 1}${getOrdinalSuffix(index + 1)}</span>
            <span class="player-name">${result.playerName}</span>
            <span class="score">${result.totalScore || 0}</span>
        `;
        leaderboard.appendChild(leaderboardItem);
    });
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
window.playAgain = function() {
    if (confirm('Start a new game in the same room?')) {
        // Clear current game data but keep player info
        localStorage.removeItem('currentGame');
        localStorage.removeItem('isHost');
        
        // Redirect to host page to start new game
        window.location.href = `host.html?code=${roomCode}`;
    }
};

window.returnToLobby = function() {
    if (confirm('Return to the main lobby?')) {
        // Clear all game data
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

// Utility functions
function showError(message) {
    alert('Error: ' + message);
}