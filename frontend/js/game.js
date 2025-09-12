/**
 * Prompt Battle WebGame - Unified Game Logic
 * Single-page application with all game functionality
 */

class PromptBattleGame {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentScreen = 'lobby';
        this.gameState = {
            roomCode: null,
            playerId: null,
            playerName: null,
            isHost: false,
            players: [],
            currentRound: null,
            roundData: null,
            results: null
        };
        
        this.dailyChallenge = {
            active: false,
            challengeId: null,
            imagePath: null,
            sourcePrompt: null,
            timeLimit: 60,
            timer: null,
            attempts: 0,
            bestScore: 0
        };
        
        this.init();
    }

    async init() {
        console.log('Initializing Prompt Battle Game...');
        
        // Connect to WebSocket
        await this.connectSocket();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Show lobby screen
        this.showScreen('lobby');
    }

    async connectSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io();
                
                this.socket.on('connect', () => {
                    this.connected = true;
                    console.log('Connected to server');
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    this.connected = false;
                    console.log('Disconnected from server');
                });

                this.socket.on('error', (error) => {
                    console.error('Socket error:', error);
                    this.showError(error.message || 'Connection error');
                });

                this.socket.on('player-joined', (data) => {
                    console.log('Player joined:', data);
                    this.gameState.players = data.players;
                    this.updatePlayersList();
                });

                this.socket.on('join-room-success', (data) => {
                    console.log('Join room success:', data);
                    this.gameState.players = data.players;
                    this.updateRoomDisplay();
                    this.showScreen('room');
                });

                this.socket.on('player-left', (data) => {
                    console.log('Player left:', data);
                    this.gameState.players = data.players;
                    this.updatePlayersList();
                });

                this.socket.on('round-started', (data) => {
                    console.log('Round started:', data);
                    this.gameState.currentRound = data;
                    this.startRound(data);
                });

                this.socket.on('round-ended', (data) => {
                    console.log('Round ended:', data);
                    this.showResults(data);
                });

                this.socket.on('game-completed', (data) => {
                    console.log('Game completed:', data);
                    console.log('Final rankings:', data.finalRankings);
                    this.showFinalResults(data);
                });

                this.socket.on('prompt-submitted', (data) => {
                    console.log('Prompt submitted by:', data.playerName);
                    this.updateSubmissionStatus(data.playerName);
                });

                this.socket.on('prompt-unsubmitted', (data) => {
                    console.log('Prompt unsubmitted by:', data.playerName);
                    this.updateSubmissionStatus(data.playerName, false);
                });

                // Timeout after 5 seconds
                setTimeout(() => {
                    if (!this.connected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 5000);

            } catch (error) {
                reject(error);
            }
        });
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('create-player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createRoom();
        });
        
        document.getElementById('join-room-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        
        document.getElementById('join-player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        // Prompt input
        document.getElementById('prompt-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.submitPrompt();
            }
        });
    }

    // Screen Management
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenName + '-screen');
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
    }

    // Lobby Functions
    showCreateRoom() {
        document.getElementById('create-room-section').style.display = 'block';
        document.getElementById('join-room-section').style.display = 'none';
    }

    hideCreateRoom() {
        document.getElementById('create-room-section').style.display = 'none';
    }

    showJoinRoom() {
        document.getElementById('join-room-section').style.display = 'block';
        document.getElementById('create-room-section').style.display = 'none';
    }

    hideJoinRoom() {
        document.getElementById('join-room-section').style.display = 'none';
    }

    async createRoom() {
        const playerName = document.getElementById('create-player-name').value.trim();
        const rounds = document.getElementById('rounds-setting').value;
        const timeLimit = document.getElementById('time-setting').value;
        
        if (!playerName) {
            this.showError('Please enter your name');
            return;
        }

        try {
            this.showLoading('Creating room...');
            
            // Create room via API
            const response = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: { rounds: parseInt(rounds), timeLimit: parseInt(timeLimit) }
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Set host status before joining
                this.gameState.isHost = true;
                this.gameState.roomCode = data.room.code;
                this.gameState.playerName = playerName;
                
                // Join room via WebSocket
                await this.joinRoomSocket(data.room.code, playerName, true);
                this.showSuccess(`Room ${data.room.code} created successfully!`);
            } else {
                this.showError('Failed to create room: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error creating room:', error);
            this.showError('Failed to create room. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async joinRoom() {
        const roomCode = document.getElementById('join-room-code').value.trim().toUpperCase();
        const playerName = document.getElementById('join-player-name').value.trim();
        
        if (!roomCode || roomCode.length !== 6) {
            this.showError('Please enter a valid 6-character room code');
            return;
        }
        
        if (!playerName) {
            this.showError('Please enter your name');
            return;
        }

        try {
            this.showLoading('Joining room...');
            await this.joinRoomSocket(roomCode, playerName, false);
            this.showSuccess(`Joined room ${roomCode} successfully!`);
        } catch (error) {
            console.error('Error joining room:', error);
            this.showError('Failed to join room. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async joinRoomSocket(roomCode, playerName, isHost) {
        return new Promise((resolve, reject) => {
            // Set up one-time listener for join success
            const successHandler = (data) => {
                this.gameState.roomCode = roomCode;
                this.gameState.playerId = data.player.id;
                this.gameState.playerName = playerName;
                this.gameState.isHost = isHost;
                this.gameState.players = data.players;
                this.socket.off('join-room-success', successHandler);
                this.socket.off('error', errorHandler);
                resolve();
            };
            
            const errorHandler = (error) => {
                this.socket.off('join-room-success', successHandler);
                this.socket.off('error', errorHandler);
                reject(new Error(error.message || 'Failed to join room'));
            };
            
            this.socket.on('join-room-success', successHandler);
            this.socket.on('error', errorHandler);
            
            // Emit join room request
            this.socket.emit('join-room', { roomCode, playerName });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                this.socket.off('join-room-success', successHandler);
                this.socket.off('error', errorHandler);
                reject(new Error('Join room timeout'));
            }, 5000);
        });
    }

    // Room Functions
    updateRoomDisplay() {
        document.getElementById('room-code-display').textContent = this.gameState.roomCode;
        document.getElementById('game-room-code').textContent = this.gameState.roomCode;
        document.getElementById('room-code-copy').textContent = this.gameState.roomCode;
        
        console.log('Updating room display - isHost:', this.gameState.isHost);
        console.log('Room code:', this.gameState.roomCode);
        
        if (this.gameState.isHost) {
            document.getElementById('host-actions').style.display = 'block';
            document.getElementById('guest-actions').style.display = 'none';
            console.log('Showing host actions');
        } else {
            document.getElementById('host-actions').style.display = 'none';
            document.getElementById('guest-actions').style.display = 'block';
            console.log('Showing guest actions');
        }
        
        this.updatePlayersList();
    }

    updateRoomSettings() {
        if (!this.gameState.isHost) return;
        
        const rounds = parseInt(document.getElementById('rounds-setting-room').value);
        const timeLimit = parseInt(document.getElementById('time-setting-room').value);
        const charLimit = parseInt(document.getElementById('char-limit-setting-room').value);
        
        // Update character limit in game
        document.getElementById('char-limit').textContent = charLimit;
        document.getElementById('daily-char-limit').textContent = charLimit;
        
        // Store settings for when game starts
        this.gameState.roomSettings = {
            rounds: rounds,
            timeLimit: timeLimit,
            charLimit: charLimit
        };
        
        console.log('Room settings updated:', this.gameState.roomSettings);
    }

    copyRoomCode() {
        if (this.gameState.roomCode) {
            navigator.clipboard.writeText(this.gameState.roomCode).then(() => {
                this.showSuccess('Room code copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = this.gameState.roomCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showSuccess('Room code copied to clipboard!');
            });
        }
    }

    leaveGame() {
        if (confirm('Are you sure you want to leave the game? Your progress will be lost.')) {
            this.socket.emit('leave-room');
            this.resetGameState();
            this.showScreen('lobby');
            this.showSuccess('Left the game');
        }
    }

    reportBug() {
        // For now, just show a placeholder message
        alert('Bug Report\n\nThank you for reporting a bug! This feature is coming soon.\n\nFor now, please describe the issue in detail and we\'ll work on fixing it.');
    }

    updatePlayersList() {
        const playersList = document.getElementById('players-list');
        const playerCount = document.getElementById('player-count-room');
        
        playersList.innerHTML = '';
        playerCount.textContent = this.gameState.players.length;
        
        this.gameState.players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.innerHTML = `
                <span class="player-name">${player.name}</span>
                ${this.gameState.isHost ? `<button class="kick-btn" onclick="game.kickPlayer(${player.id})">✕</button>` : ''}
            `;
            playersList.appendChild(playerItem);
        });
    }

    async startGame() {
        if (this.gameState.players.length < 2) {
            this.showError('Need at least 2 players to start the game');
            return;
        }

        try {
            this.showLoading('Starting game...');
            this.socket.emit('start-game', { roomCode: this.gameState.roomCode });
        } catch (error) {
            console.error('Error starting game:', error);
            this.showError('Failed to start game. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async kickPlayer(playerId) {
        if (confirm('Are you sure you want to kick this player?')) {
            try {
                const response = await fetch(`/api/rooms/${this.gameState.roomCode}/players/${playerId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
                    this.updatePlayersList();
                } else {
                    this.showError('Failed to kick player');
                }
            } catch (error) {
                console.error('Error kicking player:', error);
                this.showError('Failed to kick player');
            }
        }
    }

    leaveRoom() {
        if (confirm('Are you sure you want to leave the room?')) {
            this.socket.emit('leave-room');
            this.resetGameState();
            this.showScreen('lobby');
        }
    }

    // Game Functions
    startRound(roundData) {
        console.log('Starting multiplayer round with image:', roundData.imagePath);
        
        this.gameState.roundData = roundData;
        this.gameState.submitted = false;
        this.gameState.currentPrompt = '';
        this.showScreen('game');
        
        // Update UI
        const imageElement = document.getElementById('game-image');
        const imageContainer = imageElement.parentNode;
        
        // Clear any existing error messages
        const existingError = imageContainer.querySelector('.image-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Show loading state
        imageElement.style.display = 'none';
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'image-loading';
        loadingDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: #f8f9fa;
            color: #666;
            font-size: 16px;
            text-align: center;
            border: 2px dashed #ddd;
            border-radius: 8px;
        `;
        loadingDiv.innerHTML = `
            <div>
                <div style="font-size: 48px; margin-bottom: 10px;">⏳</div>
                <div>Loading image...</div>
            </div>
        `;
        imageContainer.appendChild(loadingDiv);
        
        // Set up image loading
        imageElement.onload = () => {
            console.log('Multiplayer image loaded successfully:', roundData.imagePath);
            loadingDiv.remove();
            imageElement.style.display = 'block';
        };
        
        imageElement.onerror = () => {
            console.error('Failed to load multiplayer image:', roundData.imagePath);
            loadingDiv.remove();
            imageElement.style.display = 'none';
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'image-error';
            errorDiv.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: #f8f9fa;
                color: #666;
                font-size: 16px;
                text-align: center;
                border: 2px dashed #ddd;
                border-radius: 8px;
            `;
            errorDiv.innerHTML = `
                <div>
                    <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                    <div>Failed to load image</div>
                    <div style="font-size: 12px; margin-top: 5px;">Path: ${roundData.imagePath}</div>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                </div>
            `;
            imageContainer.appendChild(errorDiv);
        };
        
        // Set the image source
        imageElement.src = roundData.imagePath;
        imageElement.alt = 'Game Image';
        
        document.getElementById('current-round').textContent = roundData.roundNumber || 1;
        document.getElementById('total-rounds').textContent = roundData.totalRounds || 3;
        
        // Update leaderboard with current scores
        this.updateGameLeaderboard(roundData.currentScores || {});
        
        // Start timer
        this.startTimer(roundData.timeLimit);
        
        // Reset prompt input and UI state
        this.resetPromptUI();
    }

    resetPromptUI() {
        document.getElementById('prompt-input').value = '';
        document.getElementById('prompt-input').disabled = false;
        document.getElementById('submit-btn').disabled = false;
        document.getElementById('submit-btn').textContent = 'Submit Prompt';
        document.getElementById('unsumbit-btn').style.display = 'none';
        this.gameState.submitted = false;
        this.updateCharCount();
    }

    startTimer(seconds) {
        let timeLeft = seconds;
        this.updateTimerDisplay(timeLeft);
        
        const timer = setInterval(() => {
            timeLeft--;
            this.updateTimerDisplay(timeLeft);
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.handleTimeUp();
            }
        }, 1000);
    }

    updateTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        document.getElementById('timer-display').textContent = 
            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        // Change color when time is running low
        const timerDisplay = document.getElementById('timer-display');
        if (seconds <= 10) {
            timerDisplay.style.color = '#e74c3c';
        } else if (seconds <= 30) {
            timerDisplay.style.color = '#f39c12';
        } else {
            timerDisplay.style.color = '#2c3e50';
        }
    }

    handleTimeUp() {
        const promptText = document.getElementById('prompt-input').value.trim();
        if (promptText) {
            this.submitPrompt();
        }
        document.getElementById('prompt-input').disabled = true;
        document.getElementById('submit-btn').disabled = true;
    }

    updateCharCount() {
        const input = document.getElementById('prompt-input');
        const count = input.value.length;
        const limit = parseInt(document.getElementById('char-limit').textContent);
        
        document.getElementById('char-count').textContent = count;
        
        if (count > limit * 0.8) {
            document.getElementById('char-count').style.color = '#e74c3c';
        } else {
            document.getElementById('char-count').style.color = '#666';
        }
        
        // Auto-submit when character limit reached
        if (count >= limit) {
            const promptText = input.value.trim();
            if (promptText) {
                this.submitPrompt();
            }
        }
    }

    submitPrompt() {
        const promptText = document.getElementById('prompt-input').value.trim();
        if (!promptText) {
            this.showError('Please enter a prompt before submitting');
            return;
        }

        // Store current prompt
        this.gameState.currentPrompt = promptText;
        this.gameState.submitted = true;

        try {
            this.socket.emit('submit-prompt', {
                roundId: this.gameState.currentRound.roundId,
                promptText: promptText
            });
            
            // Update UI to show submitted state
            document.getElementById('prompt-input').disabled = true;
            document.getElementById('submit-btn').disabled = true;
            document.getElementById('submit-btn').textContent = 'Submitted!';
            document.getElementById('unsumbit-btn').style.display = 'inline-block';
        } catch (error) {
            console.error('Error submitting prompt:', error);
            this.showError('Failed to submit prompt');
        }
    }

    unsumbitPrompt() {
        // Reset UI state
        document.getElementById('prompt-input').disabled = false;
        document.getElementById('submit-btn').disabled = false;
        document.getElementById('submit-btn').textContent = 'Submit Prompt';
        document.getElementById('unsumbit-btn').style.display = 'none';
        
        this.gameState.submitted = false;
        
        // Focus on input for editing
        document.getElementById('prompt-input').focus();
        
        // Emit unsubmit to server
        if (this.gameState.roundData && this.gameState.roundData.id) {
            this.socket.emit('unsubmit-prompt', {
                roundId: this.gameState.roundData.id
            });
        }
        
        console.log('Prompt unsubmitted, ready for editing');
    }

    showResults(data) {
        this.gameState.results = data;
        this.showScreen('results');
        
        // Update player performance
        const playerResult = data.results.find(r => r.playerName === this.gameState.playerName);
        if (playerResult) {
            document.getElementById('player-score').textContent = playerResult.score;
            document.getElementById('player-prompt').textContent = playerResult.promptText;
            document.getElementById('original-prompt').textContent = data.sourcePrompt;
            
            // Find player rank
            const sortedResults = [...data.results].sort((a, b) => b.score - a.score);
            const playerRank = sortedResults.findIndex(r => r.playerName === this.gameState.playerName) + 1;
            document.getElementById('player-rank').textContent = `${playerRank}${this.getOrdinalSuffix(playerRank)}`;
        }
        
        // Update leaderboard with current scores
        if (data.currentScores) {
            this.updateGameLeaderboard(data.currentScores);
        }
        
        // Update round leaderboard
        this.updateRoundLeaderboard(data.results);
        
        // Show appropriate buttons based on game state and host status
        const isLastRound = data.roundNumber >= data.totalRounds;
        
        if (this.gameState.isHost) {
            // Host controls
            document.getElementById('host-results-actions').style.display = 'block';
            document.getElementById('player-results-actions').style.display = 'none';
            
            if (isLastRound) {
                document.getElementById('game-complete-section').style.display = 'block';
                document.getElementById('next-round-section').style.display = 'none';
            } else {
                document.getElementById('next-round-section').style.display = 'block';
                document.getElementById('game-complete-section').style.display = 'none';
            }
        } else {
            // Player controls - only show waiting message
            document.getElementById('host-results-actions').style.display = 'none';
            document.getElementById('player-results-actions').style.display = 'block';
        }
    }

    updateRoundLeaderboard(results) {
        const leaderboard = document.getElementById('round-leaderboard');
        leaderboard.innerHTML = '';
        
        const sortedResults = [...results].sort((a, b) => b.score - a.score);
        
        sortedResults.forEach((result, index) => {
            const leaderboardItem = document.createElement('div');
            leaderboardItem.className = 'leaderboard-item';
            leaderboardItem.innerHTML = `
                <span class="rank">${index + 1}${this.getOrdinalSuffix(index + 1)}</span>
                <span class="player-name">${result.playerName}</span>
                <span class="score">${result.score}%</span>
            `;
            leaderboard.appendChild(leaderboardItem);
        });
    }

    updateGameLeaderboard(scores) {
        const leaderboard = document.getElementById('leaderboard');
        leaderboard.innerHTML = '';
        
        const sortedScores = Object.entries(scores)
            .map(([name, score]) => ({ name, score }))
            .sort((a, b) => b.score - a.score);
        
        sortedScores.forEach((player, index) => {
            const leaderboardItem = document.createElement('div');
            leaderboardItem.className = 'leaderboard-item';
            
            // Calculate points based on placement (1st = 10pts, 2nd = 8pts, etc.)
            const points = this.calculatePlacementPoints(index + 1, sortedScores.length);
            
            leaderboardItem.innerHTML = `
                <span class="rank">${index + 1}${this.getOrdinalSuffix(index + 1)}</span>
                <span class="player-name">${player.name}</span>
                <span class="score">${player.score}pts</span>
                <span class="points">+${points}</span>
            `;
            leaderboard.appendChild(leaderboardItem);
        });
    }

    calculatePlacementPoints(rank, totalPlayers) {
        // Points system: 1st = 10, 2nd = 8, 3rd = 6, 4th = 4, 5th+ = 2
        const points = [10, 8, 6, 4, 2];
        return points[Math.min(rank - 1, points.length - 1)];
    }

    showFinalResults(data) {
        this.gameState.results = data;
        this.showScreen('final');
        
        // Update winner info
        if (data.finalRankings && data.finalRankings.length > 0) {
            const winner = data.finalRankings[0];
            document.getElementById('winner-name').textContent = winner.name;
            document.getElementById('winner-score').textContent = winner.score;
        }
        
        // Update final leaderboard
        this.updateFinalLeaderboard(data.finalRankings || []);
    }

    updateFinalLeaderboard(rankings) {
        const leaderboard = document.getElementById('final-leaderboard');
        leaderboard.innerHTML = '';
        
        rankings.forEach((player, index) => {
            const leaderboardItem = document.createElement('div');
            leaderboardItem.className = 'leaderboard-item';
            leaderboardItem.innerHTML = `
                <span class="rank">${index + 1}${this.getOrdinalSuffix(index + 1)}</span>
                <span class="player-name">${player.name}</span>
                <span class="score">${player.score}</span>
            `;
            leaderboard.appendChild(leaderboardItem);
        });
    }

    nextRound() {
        if (!this.gameState.isHost) {
            this.showError('Only the host can start the next round');
            return;
        }
        
        this.socket.emit('next-round', { roomCode: this.gameState.roomCode });
    }

    viewFinalResults() {
        if (!this.gameState.isHost) {
            this.showError('Only the host can view final results');
            return;
        }
        
        this.showScreen('final');
        this.updateFinalResults();
    }

    updateFinalResults() {
        // This would be implemented with actual final results data
        document.getElementById('winner-name').textContent = this.gameState.playerName;
        document.getElementById('winner-score').textContent = '100';
    }

    playAgain() {
        if (this.gameState.isHost) {
            this.socket.emit('start-game', { roomCode: this.gameState.roomCode });
        } else {
            this.showError('Only the host can start a new game');
        }
    }

    returnToLobby() {
        this.resetGameState();
        this.showScreen('lobby');
    }

    // Daily Challenge Functions
    async startDailyChallenge() {
        try {
            this.showLoading('Loading daily challenge...');
            
            const response = await fetch('/api/daily-challenge');
            const data = await response.json();
            
            if (data.success) {
                this.dailyChallenge.active = true;
                this.dailyChallenge.challengeId = data.challengeId;
                this.dailyChallenge.imagePath = data.imagePath;
                this.dailyChallenge.sourcePrompt = data.sourcePrompt;
                
                this.showScreen('daily');
                this.startDailyRound();
            } else {
                this.showError('Failed to load daily challenge: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error starting daily challenge:', error);
            this.showError('Failed to start daily challenge. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    startDailyRound() {
        console.log('Starting daily round with image:', this.dailyChallenge.imagePath);
        
        // Update UI
        const imageElement = document.getElementById('daily-image');
        const imageContainer = imageElement.parentNode;
        
        // Clear any existing error messages
        const existingError = imageContainer.querySelector('.image-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Show loading state
        imageElement.style.display = 'none';
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'image-loading';
        loadingDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: #f8f9fa;
            color: #666;
            font-size: 16px;
            text-align: center;
            border: 2px dashed #ddd;
            border-radius: 8px;
        `;
        loadingDiv.innerHTML = `
            <div>
                <div style="font-size: 48px; margin-bottom: 10px;">⏳</div>
                <div>Loading image...</div>
            </div>
        `;
        imageContainer.appendChild(loadingDiv);
        
        // Set up image loading
        imageElement.onload = () => {
            console.log('Daily challenge image loaded successfully:', this.dailyChallenge.imagePath);
            loadingDiv.remove();
            imageElement.style.display = 'block';
        };
        
        imageElement.onerror = () => {
            console.error('Failed to load daily challenge image:', this.dailyChallenge.imagePath);
            loadingDiv.remove();
            imageElement.style.display = 'none';
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'image-error';
            errorDiv.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: #f8f9fa;
                color: #666;
                font-size: 16px;
                text-align: center;
                border: 2px dashed #ddd;
                border-radius: 8px;
            `;
            errorDiv.innerHTML = `
                <div>
                    <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                    <div>Failed to load image</div>
                    <div style="font-size: 12px; margin-top: 5px;">Path: ${this.dailyChallenge.imagePath}</div>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                </div>
            `;
            imageContainer.appendChild(errorDiv);
        };
        
        // Set the image source
        imageElement.src = this.dailyChallenge.imagePath;
        imageElement.alt = 'Challenge Image';
        
        document.getElementById('daily-challenge-id').textContent = this.dailyChallenge.challengeId;
        
        // Reset prompt input
        document.getElementById('daily-prompt-input').value = '';
        document.getElementById('daily-prompt-input').disabled = false;
        document.getElementById('daily-submit-btn').disabled = false;
        document.getElementById('daily-submit-btn').textContent = 'Submit Prompt';
        this.updateDailyCharCount();
        
        // Start timer
        this.startDailyTimer();
        
        // Load daily stats
        this.loadDailyStats();
    }

    startDailyTimer() {
        let timeLeft = this.dailyChallenge.timeLimit;
        this.updateDailyTimerDisplay(timeLeft);
        
        this.dailyChallenge.timer = setInterval(() => {
            timeLeft--;
            this.updateDailyTimerDisplay(timeLeft);
            
            if (timeLeft <= 0) {
                clearInterval(this.dailyChallenge.timer);
                this.handleDailyTimeUp();
            }
        }, 1000);
    }

    updateDailyTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        document.getElementById('daily-timer-display').textContent = 
            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        // Change color when time is running low
        const timerDisplay = document.getElementById('daily-timer-display');
        if (seconds <= 10) {
            timerDisplay.style.color = '#e74c3c';
        } else if (seconds <= 30) {
            timerDisplay.style.color = '#f39c12';
        } else {
            timerDisplay.style.color = '#2c3e50';
        }
    }

    handleDailyTimeUp() {
        const promptText = document.getElementById('daily-prompt-input').value.trim();
        if (promptText) {
            this.submitDailyPrompt();
        }
        document.getElementById('daily-prompt-input').disabled = true;
        document.getElementById('daily-submit-btn').disabled = true;
    }

    updateDailyCharCount() {
        const input = document.getElementById('daily-prompt-input');
        const count = input.value.length;
        const limit = parseInt(document.getElementById('daily-char-limit').textContent);
        
        document.getElementById('daily-char-count').textContent = count;
        
        if (count > limit * 0.8) {
            document.getElementById('daily-char-count').style.color = '#e74c3c';
        } else {
            document.getElementById('daily-char-count').style.color = '#666';
        }
        
        // Auto-submit when character limit reached
        if (count >= limit) {
            const promptText = input.value.trim();
            if (promptText) {
                this.submitDailyPrompt();
            }
        }
    }

    async submitDailyPrompt() {
        const promptText = document.getElementById('daily-prompt-input').value.trim();
        if (!promptText) {
            this.showError('Please enter a prompt before submitting');
            return;
        }

        try {
            // Clear timer
            if (this.dailyChallenge.timer) {
                clearInterval(this.dailyChallenge.timer);
            }
            
            // Disable input
            document.getElementById('daily-prompt-input').disabled = true;
            document.getElementById('daily-submit-btn').disabled = true;
            document.getElementById('daily-submit-btn').textContent = 'Submitting...';
            
            // Calculate score
            const response = await fetch('/api/score-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    original: this.dailyChallenge.sourcePrompt,
                    attempt: promptText
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.dailyChallenge.attempts++;
                if (result.score > this.dailyChallenge.bestScore) {
                    this.dailyChallenge.bestScore = result.score;
                }
                
                this.showDailyResults(result, promptText);
            } else {
                this.showError('Failed to score prompt: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error submitting daily prompt:', error);
            this.showError('Failed to submit prompt');
        }
    }

    showDailyResults(result, promptText) {
        this.showScreen('daily-results');
        
        // Update player performance
        document.getElementById('daily-player-score').textContent = result.score;
        document.getElementById('daily-accuracy').textContent = result.score + '%';
        document.getElementById('daily-player-prompt').textContent = promptText;
        document.getElementById('daily-original-prompt').textContent = this.dailyChallenge.sourcePrompt;
        
        // Add detailed scoring feedback
        this.showScoringFeedback(result);
        
        // Update daily stats
        this.loadDailyStats();
    }

    showScoringFeedback(result) {
        // Create or update scoring feedback section
        let feedbackDiv = document.getElementById('scoring-feedback');
        if (!feedbackDiv) {
            feedbackDiv = document.createElement('div');
            feedbackDiv.id = 'scoring-feedback';
            feedbackDiv.style.cssText = `
                margin-top: 1rem;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #667eea;
                white-space: pre-line;
                font-size: 0.9rem;
                line-height: 1.4;
            `;
            
            // Insert after the prompt comparison
            const promptComparison = document.querySelector('.prompt-comparison');
            if (promptComparison) {
                promptComparison.parentNode.insertBefore(feedbackDiv, promptComparison.nextSibling);
            }
        }
        
        feedbackDiv.innerHTML = `
            <h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">📊 Detailed Feedback</h4>
            <div>${result.explanation || 'No detailed feedback available.'}</div>
        `;
    }

    loadDailyStats() {
        document.getElementById('daily-best-score').textContent = this.dailyChallenge.bestScore || '-';
        document.getElementById('daily-attempts').textContent = this.dailyChallenge.attempts;
    }

    retryDailyChallenge() {
        this.dailyChallenge.active = false;
        this.startDailyChallenge();
    }

    // Utility Functions
    resetGameState() {
        this.gameState = {
            roomCode: null,
            playerId: null,
            playerName: null,
            isHost: false,
            players: [],
            currentRound: null,
            roundData: null,
            results: null
        };
    }

    getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
    }

    showError(message) {
        // Create a more user-friendly error display
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 300px;
            font-size: 14px;
        `;
        errorDiv.textContent = 'Error: ' + message;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 300px;
            font-size: 14px;
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    showLoading(message) {
        // Create a loading overlay
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-overlay';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            color: white;
            font-size: 18px;
        `;
        loadingDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <div>${message}</div>
            </div>
        `;
        
        // Add CSS animation
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loadingDiv);
    }

    hideLoading() {
        const loadingDiv = document.getElementById('loading-overlay');
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }
    }

    updateSubmissionStatus(playerName, submitted = true) {
        // Update UI to show submission status
        if (submitted) {
            console.log('Player submitted:', playerName);
        } else {
            console.log('Player unsubmitted:', playerName);
        }
    }
}

// Global functions for inline onclick handlers
window.startDailyChallenge = () => game.startDailyChallenge();
window.updateDailyCharCount = () => game.updateDailyCharCount();
window.submitDailyPrompt = () => game.submitDailyPrompt();
window.retryDailyChallenge = () => game.retryDailyChallenge();
window.showCreateRoom = () => game.showCreateRoom();
window.hideCreateRoom = () => game.hideCreateRoom();
window.showJoinRoom = () => game.showJoinRoom();
window.hideJoinRoom = () => game.hideJoinRoom();
window.createRoom = () => game.createRoom();
window.joinRoom = () => game.joinRoom();
window.startGame = () => game.startGame();
window.kickPlayer = (playerId) => game.kickPlayer(playerId);
window.leaveRoom = () => game.leaveRoom();
window.submitPrompt = () => game.submitPrompt();
window.unsumbitPrompt = () => game.unsumbitPrompt();
window.updateCharCount = () => game.updateCharCount();
window.nextRound = () => game.nextRound();
window.viewFinalResults = () => game.viewFinalResults();
window.playAgain = () => game.playAgain();
window.returnToLobby = () => game.returnToLobby();
window.updateRoomSettings = () => game.updateRoomSettings();
window.copyRoomCode = () => game.copyRoomCode();
window.leaveGame = () => game.leaveGame();
window.reportBug = () => game.reportBug();
window.showHowToPlay = () => {
    alert('How to Play:\n\n1. Try the Daily Challenge for solo practice\n2. Create or join a room for multiplayer\n3. Write prompts for AI-generated images\n4. Compete with other players\n5. Get scored on prompt accuracy');
};

// Initialize game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new PromptBattleGame();
});
