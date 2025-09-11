/**
 * In-Game Round page functionality
 */

import { getJson, postJson } from './api.js';

let timerInterval;
let timeRemaining = 60; // seconds

// Initialize round page
document.addEventListener('DOMContentLoaded', () => {
    console.log('In-Game Round page loaded');
    
    // Initialize character counter
    updateCharCount();
    
    // Start timer
    startTimer();
});

function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        document.getElementById('timer-display').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            // Timer ended - submit prompt or show freeze screen
            alert('Time\'s up!');
        }
    }, 1000);
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
};

window.leaveRoom = function() {
    if (confirm('Are you sure you want to leave the game?')) {
        window.location.href = 'index.html';
    }
};

window.shareRoom = function() {
    const roomCode = document.querySelector('.room-code').textContent;
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
