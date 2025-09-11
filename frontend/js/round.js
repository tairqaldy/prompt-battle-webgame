/**
 * In-Game Round page functionality
 */

import { getJson, postJson } from './api.js';

let timerInterval;
let timeRemaining = 60; // seconds
let currentPlayer = null;
let roundId = null;
let roundData = null;
let submitted = false;

// Initialize round page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('In-Game Round page loaded');
    
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
    
    // Load round data
    await loadRoundData();
    
    if (roundData) {
        // Initialize UI
        updateCharCount();
        
        // Start timer if round is active
        if (roundData.isActive) {
            startTimer();
        }
        
        // Check if player already submitted
        await checkSubmissionStatus();
    }
    
    // Set up WebSocket event handlers
    setupSocketHandlers();
});

function setupSocketHandlers() {
    if (window.socketClient) {
        window.socketClient.on('round-ended', (data) => {
            console.log('Round ended:', data);
            // Redirect to results page
            window.location.href = `results.html?roundId=${data.roundId}&roomCode=${roomCode}`;
        });
        
        window.socketClient.on('prompt-submitted', (data) => {
            console.log('Prompt submitted by:', data.playerName);
            // Update UI to show submission status
            updateSubmissionStatus(data.playerName);
        });
        
        window.socketClient.on('error', (error) => {
            showError(error.message || 'Connection error');
        });
    }
}

async function loadRoundData() {
    try {
        const response = await getJson(`/api/rounds/${roundId}`);
        if (response.success) {
            roundData = response.round;
            
            // Update UI with round data
            document.getElementById('timer-total').textContent = 
                `${Math.floor(roundData.timeLimit / 60).toString().padStart(2, '0')}:${(roundData.timeLimit % 60).toString().padStart(2, '0')}`;
            
            document.getElementById('char-limit').textContent = '100'; // Default limit
            
            // Load the image
            const gameImage = document.getElementById('game-image');
            if (gameImage && roundData.imagePath) {
                gameImage.src = roundData.imagePath;
            }
            
            // Update room info
            const roomInfo = document.querySelector('.room-info');
            if (roomInfo) {
                roomInfo.innerHTML = `
                    <span class="room-code">Room: ${roundData.code}</span>
                    <button class="action-btn" onclick="leaveRoom()">Leave</button>
                    <button class="action-btn" onclick="shareRoom()">Share</button>
                    <span class="round-info">Round 1/3</span>
                `;
            }
            
            // Calculate remaining time
            const elapsed = Math.floor((Date.now() - roundData.createdAt) / 1000);
            timeRemaining = Math.max(0, roundData.timeLimit - elapsed);
            
            // Initialize timer display
            updateTimer();
            
        } else {
            showError('Failed to load round data: ' + (response.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading round data:', error);
        showError('Failed to load round data. Please refresh the page.');
    }
}

async function checkSubmissionStatus() {
    try {
        // Check if round has results (means it's finished)
        const response = await getJson(`/api/rounds/${roundId}/results`);
        if (response.success && response.submissions) {
            const playerSubmission = response.submissions.find(s => s.playerName === currentPlayer.name);
            if (playerSubmission) {
                submitted = true;
                // Disable input and show freeze screen
                document.getElementById('prompt-input').disabled = true;
                showFreezeScreen();
            }
        }
    } catch (error) {
        console.error('Error checking submission status:', error);
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimer();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            handleTimeUp();
        }
    }, 1000);
}

function updateTimer() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    document.getElementById('timer-display').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color when time is running low
    if (timeRemaining <= 10) {
        document.getElementById('timer-display').style.color = '#e74c3c';
    } else if (timeRemaining <= 30) {
        document.getElementById('timer-display').style.color = '#f39c12';
    } else {
        document.getElementById('timer-display').style.color = '#e74c3c';
    }
}

async function handleTimeUp() {
    if (!submitted) {
        // Auto-submit if player hasn't submitted yet
        const promptText = document.getElementById('prompt-input').value.trim();
        if (promptText) {
            await submitPromptInternal(promptText);
        }
    }
    
    // Show freeze screen
    showFreezeScreen();
}

async function submitPromptInternal(promptText) {
    if (submitted) return;
    
    try {
        // Disable submit button
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }
        
        // Use WebSocket to submit prompt
        if (window.socketClient && window.socketClient.connected) {
            window.socketClient.submitPrompt(roundId, promptText);
            submitted = true;
            document.getElementById('prompt-input').disabled = true;
            showFreezeScreen();
        } else {
            // Fallback to REST API
            const response = await postJson(`/api/rounds/${roundId}/submit`, {
                playerName: currentPlayer.name,
                promptText: promptText
            });
            
            if (response.success) {
                submitted = true;
                document.getElementById('prompt-input').disabled = true;
                showFreezeScreen();
            } else {
                showError('Failed to submit prompt: ' + (response.error || 'Unknown error'));
                
                // Re-enable submit button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Prompt';
                }
            }
        }
    } catch (error) {
        console.error('Error submitting prompt:', error);
        showError('Failed to submit prompt. Please try again.');
        
        // Re-enable submit button
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Prompt';
        }
    }
}

function showFreezeScreen() {
    // Navigate to freeze screen
    window.location.href = `freeze.html?roundId=${roundId}`;
}

// Global functions for inline onclick handlers
window.updateCharCount = function() {
    const input = document.getElementById('prompt-input');
    const count = input.value.length;
    const limit = parseInt(document.getElementById('char-limit').textContent);
    
    document.getElementById('char-count').textContent = count;
    
    // Change color if approaching limit
    if (count > limit * 0.8) {
        document.getElementById('char-count').style.color = '#e74c3c';
    } else {
        document.getElementById('char-count').style.color = '#666';
    }
    
    // Auto-submit when character limit reached
    if (count >= limit) {
        const promptText = input.value.trim();
        if (promptText) {
            submitPromptInternal(promptText);
        }
    }
};

// Add submit button functionality
window.submitPrompt = async function() {
    const promptText = document.getElementById('prompt-input').value.trim();
    if (!promptText) {
        alert('Please enter a prompt before submitting');
        return;
    }
    
    if (submitted) {
        alert('You have already submitted a prompt');
        return;
    }
    
    await submitPromptInternal(promptText);
};

document.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter' && event.ctrlKey && !submitted) {
        const promptText = document.getElementById('prompt-input').value.trim();
        if (promptText) {
            await submitPromptInternal(promptText);
        }
    }
});

window.leaveRoom = function() {
    if (confirm('Are you sure you want to leave the game?')) {
        // Clear game data
        localStorage.removeItem('currentGame');
        localStorage.removeItem('currentPlayer');
        window.location.href = 'index.html';
    }
};

window.shareRoom = function() {
    const roomCode = roundData ? roundData.code : 'UNKNOWN';
    const shareText = `Join my Prompt Battle game! Room code: ${roomCode}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Prompt Battle',
            text: shareText
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Room info copied to clipboard!');
        });
    }
};

// Utility functions
function showError(message) {
    alert('Error: ' + message);
}
