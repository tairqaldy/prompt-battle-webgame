const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const dbManager = require('./db');
const scoring = require('./scoring');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Serve static files from frontend directory
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Game state management
const gameRooms = new Map(); // roomCode -> { players: [], gameState: 'waiting'|'playing'|'finished', currentRound: null, gameSettings: {}, roundCount: 0, totalRounds: 3, scores: {} }
const playerSockets = new Map(); // playerId -> socket

// Utility functions
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateRoundId() {
  return `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function validateRoomCode(code) {
  return /^[A-Z0-9]{6}$/.test(code);
}

function validatePlayerName(name) {
  return name && typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 20;
}

function validatePromptText(text, characterLimit = 400) {
  return text && typeof text === 'string' && text.trim().length >= 1 && text.trim().length <= characterLimit;
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Player connected: ${socket.id}`);

  socket.on('join-room', async (data) => {
    try {
      const { roomCode, playerName } = data;
      
      if (!validateRoomCode(roomCode) || !validatePlayerName(playerName)) {
        socket.emit('error', { message: 'Invalid room code or player name' });
        return;
      }

      // Check if room exists in database
      const room = await dbManager.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Get current players from database
      const players = await dbManager.getRoomPlayers(roomCode);
      
      // Check if player name is already taken
      const nameExists = players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
      if (nameExists) {
        socket.emit('error', { message: 'Player name already taken' });
        return;
      }

      // Check room capacity
      if (players.length >= 8) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      // Add player to database
      const result = await dbManager.addPlayer(roomCode, playerName.trim());
      const player = {
        id: result.lastInsertRowid,
        name: playerName.trim(),
        code: roomCode,
        socketId: socket.id
      };

      // Store player socket mapping
      playerSockets.set(player.id, socket);
      socket.playerId = player.id;
      socket.roomCode = roomCode;

      // Initialize room in memory if not exists
      if (!gameRooms.has(roomCode)) {
        gameRooms.set(roomCode, {
          players: [],
          gameState: 'waiting',
          currentRound: null,
          gameSettings: {
            rounds: 3,
            timeLimit: 60,
            maxPlayers: 8,
            characterLimit: 100
          },
          roundCount: 0,
          totalRounds: 3,
          scores: {},
          gameStarted: false
        });
      }

      const roomState = gameRooms.get(roomCode);
      roomState.players.push(player);

      // Join socket room
      socket.join(roomCode);

      // Notify all players in room
      io.to(roomCode).emit('player-joined', {
        player: player,
        players: roomState.players,
        gameState: roomState.gameState
      });

      // Send response to the joining player
      socket.emit('join-room-success', {
        player: player,
        players: roomState.players,
        gameState: roomState.gameState
      });

      console.log(`[${new Date().toISOString()}] Player ${playerName} joined room ${roomCode}`);

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('leave-room', async () => {
    try {
      if (!socket.playerId || !socket.roomCode) return;

      const roomCode = socket.roomCode;
      const playerId = socket.playerId;

      // Remove player from database
      await dbManager.removePlayer(playerId);

      // Remove from memory
      if (gameRooms.has(roomCode)) {
        const roomState = gameRooms.get(roomCode);
        roomState.players = roomState.players.filter(p => p.id !== playerId);
        
        // If no players left, clean up room
        if (roomState.players.length === 0) {
          gameRooms.delete(roomCode);
        } else {
          // Notify remaining players
          io.to(roomCode).emit('player-left', {
            playerId: playerId,
            players: roomState.players
          });
        }
      }

      // Remove socket mapping
      playerSockets.delete(playerId);
      socket.leave(roomCode);

      console.log(`[${new Date().toISOString()}] Player ${playerId} left room ${roomCode}`);

    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  socket.on('get-final-results', async (data) => {
    console.log('Host requesting final results for room:', data.roomCode);
    
    const roomState = gameRooms.get(data.roomCode);
    if (!roomState) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (!roomState.finalResults) {
      socket.emit('error', { message: 'Final results not available yet' });
      return;
    }
    
    // Send final results to the requesting host
    socket.emit('final-results', roomState.finalResults);
  });

  socket.on('start-game', async (data) => {
    try {
      const { roomCode, settings } = data;
      
      if (!gameRooms.has(roomCode)) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const roomState = gameRooms.get(roomCode);
      
      if (roomState.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start game' });
        return;
      }

      if (roomState.gameState === 'playing') {
        socket.emit('error', { message: 'Game already in progress' });
        return;
      }

      // Update room settings with host's configuration
      if (settings) {
        roomState.gameSettings = {
          rounds: settings.rounds || 3,
          timeLimit: settings.timeLimit || 60,
          maxPlayers: 8,
          characterLimit: settings.characterLimit || 100
        };
        roomState.totalRounds = settings.rounds || 3;
        console.log(`[${new Date().toISOString()}] Game settings updated for room ${roomCode}:`, roomState.gameSettings);
      }

      // Initialize game - reset everything for a fresh start
      roomState.gameStarted = true;
      roomState.gameState = 'playing';
      roomState.roundCount = 0;
      roomState.scores = {};
      roomState.currentRound = null;
      
      // Initialize scores for all players
      roomState.players.forEach(player => {
        roomState.scores[player.name] = 0;
      });
      
      console.log(`[${new Date().toISOString()}] Starting new game in room ${roomCode} - scores reset for all players`);

      // Notify all players that a new game has started with reset scores
      io.to(roomCode).emit('game-started', {
        gameSettings: roomState.gameSettings,
        players: roomState.players,
        scores: roomState.scores
      });

      // Start first round
      await startRound(roomCode);

    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  socket.on('next-round', async (data) => {
    try {
      const { roomCode } = data;
      
      if (!gameRooms.has(roomCode)) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const roomState = gameRooms.get(roomCode);
      
      if (roomState.gameState !== 'waiting') {
        socket.emit('error', { message: 'Game not in waiting state' });
        return;
      }

      // Start the next round
      await startRound(roomCode);

    } catch (error) {
      console.error('Error starting next round:', error);
      socket.emit('error', { message: 'Failed to start next round' });
    }
  });

  socket.on('room-settings-changed', async (data) => {
    try {
      const { roomCode, settings } = data;
      
      if (!gameRooms.has(roomCode)) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const roomState = gameRooms.get(roomCode);
      
      // Only allow host to change settings
      const player = await getPlayerById(socket.playerId);
      if (!player || roomState.players[0]?.id !== player.id) {
        socket.emit('error', { message: 'Only host can change room settings' });
        return;
      }

      // Update room settings
      if (settings) {
        roomState.gameSettings = {
          rounds: settings.rounds || roomState.gameSettings.rounds || 3,
          timeLimit: settings.timeLimit || roomState.gameSettings.timeLimit || 60,
          maxPlayers: 8,
          characterLimit: settings.characterLimit || roomState.gameSettings.characterLimit || 100
        };
        roomState.totalRounds = settings.rounds || roomState.totalRounds || 3;
        
        console.log(`[${new Date().toISOString()}] Room settings changed for ${roomCode}:`, roomState.gameSettings);
        
        // Notify all players about settings change
        io.to(roomCode).emit('room-settings-updated', {
          settings: roomState.gameSettings
        });
      }

    } catch (error) {
      console.error('Error updating room settings:', error);
      socket.emit('error', { message: 'Failed to update room settings' });
    }
  });

  socket.on('submit-prompt', async (data) => {
    try {
      const { roundId, promptText } = data;
      
      if (!socket.playerId) {
        socket.emit('error', { message: 'Invalid player' });
        return;
      }

      // Get player info
      const player = await getPlayerById(socket.playerId);
      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      // Get room character limit
      const roomCode = socket.roomCode;
      const roomState = gameRooms.get(roomCode);
      const characterLimit = roomState?.gameSettings?.characterLimit || 400;
      
      if (!validatePromptText(promptText, characterLimit)) {
        socket.emit('error', { message: `Invalid prompt. Must be 1-${characterLimit} characters.` });
        return;
      }

      // Submit prompt to database
      await dbManager.submitPrompt(roundId, player.name, promptText.trim());

      // Notify all players in room
      if (roomCode) {
        io.to(roomCode).emit('prompt-submitted', {
          playerName: player.name,
          roundId: roundId
        });
        
        // Check if all players have submitted (count unique players, not total submissions)
        const roomState = gameRooms.get(roomCode);
        if (roomState && roomState.currentRound && roomState.currentRound.id === roundId) {
          const allSubmissions = await dbManager.getRoundSubmissions(roundId);
          const uniquePlayers = new Set(allSubmissions.map(sub => sub.playerName));
          const playerCount = roomState.players.length;
          
          console.log(`[${new Date().toISOString()}] Round ${roundId}: ${uniquePlayers.size}/${playerCount} unique players submitted`);
          console.log(`[${new Date().toISOString()}] Submissions:`, allSubmissions.map(s => s.playerName));
          console.log(`[${new Date().toISOString()}] Players in room:`, roomState.players.map(p => p.name));
          
          // If all players have submitted, end the round early
          if (uniquePlayers.size >= playerCount) {
            console.log(`[${new Date().toISOString()}] All players submitted, ending round early`);
            await endRound(roomCode, roundId);
            return;
          }
        }
      }

      console.log(`[${new Date().toISOString()}] Player ${player.name} submitted prompt for round ${roundId}`);

    } catch (error) {
      console.error('Error submitting prompt:', error);
      socket.emit('error', { message: 'Failed to submit prompt' });
    }
  });

  socket.on('unsubmit-prompt', async (data) => {
    try {
      const { roundId } = data;
      
      if (!socket.playerId) {
        socket.emit('error', { message: 'Invalid player' });
        return;
      }

      // Get player info
      const player = await getPlayerById(socket.playerId);
      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      // Remove submission from database
      await dbManager.removeSubmission(roundId, player.name);

      // Notify all players in room
      const roomCode = socket.roomCode;
      if (roomCode) {
        io.to(roomCode).emit('prompt-unsubmitted', {
          playerName: player.name,
          roundId: roundId
        });
      }

      console.log(`[${new Date().toISOString()}] Player ${player.name} unsubmitted prompt for round ${roundId}`);

    } catch (error) {
      console.error('Error unsubmitting prompt:', error);
      socket.emit('error', { message: 'Failed to unsubmit prompt' });
    }
  });

  socket.on('disconnect', async () => {
    try {
      if (socket.playerId && socket.roomCode) {
        await dbManager.removePlayer(socket.playerId);
        
        const roomCode = socket.roomCode;
        if (gameRooms.has(roomCode)) {
          const roomState = gameRooms.get(roomCode);
          roomState.players = roomState.players.filter(p => p.id !== socket.playerId);
          
          if (roomState.players.length === 0) {
            gameRooms.delete(roomCode);
          } else {
            io.to(roomCode).emit('player-left', {
              playerId: socket.playerId,
              players: roomState.players
            });
          }
        }
        
        playerSockets.delete(socket.playerId);
      }
      
      console.log(`[${new Date().toISOString()}] Player disconnected: ${socket.id}`);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Helper function to get player by ID
async function getPlayerById(playerId) {
  const db = dbManager.getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Start a new round
async function startRound(roomCode) {
  try {
    const roomState = gameRooms.get(roomCode);
    if (!roomState) return;

    // Safety check: ensure no active round is running
    if (roomState.gameState === 'playing' && roomState.currentRound && !roomState.currentRound.ended) {
      console.log(`[${new Date().toISOString()}] Round already in progress for room ${roomCode}, clearing previous round`);
      await endRound(roomCode, roomState.currentRound.id);
    }

    roomState.gameState = 'playing';
    roomState.roundCount++;
    
    // Get random dataset entry
    const datasetEntry = getRandomDatasetEntry();
    console.log('Multiplayer round entry:', datasetEntry);
    
    const roundId = generateRoundId();
    const filename = path.basename(datasetEntry.image_file);
    const imagePath = `/api/images/${filename}`;
    const sourcePrompt = datasetEntry.prompt;
    const timeLimit = roomState.gameSettings.timeLimit;
    
    // Extract difficulty information from dataset entry
    const difficulty = datasetEntry.difficulty || 'medium';
    const difficultyData = {
      difficultyScore: parseFloat(datasetEntry.difficulty_score) || 2.0,
      wordCount: parseInt(datasetEntry.word_count) || sourcePrompt.split(/\s+/).length,
      namedEntities: parseInt(datasetEntry.named_entities) || 0,
      hasComplexKeywords: datasetEntry.has_complex_keywords === 'true',
      hasArtStyle: datasetEntry.has_art_style === 'true',
      hasAbstractConcepts: datasetEntry.has_abstract_concepts === 'true',
      isVerbose: datasetEntry.is_verbose === 'true'
    };
    
    console.log(`Multiplayer round - Difficulty: ${difficulty}, Image: ${imagePath}`);
    
    // Create round in database
    await dbManager.createRound(roundId, roomCode, imagePath, sourcePrompt, timeLimit);
    
    roomState.currentRound = {
      id: roundId,
      imagePath: imagePath,
      timeLimit: timeLimit,
      startTime: Date.now(),
      roundNumber: roomState.roundCount,
      difficulty: difficulty,
      difficultyData: difficultyData
    };

    // Notify all players
    io.to(roomCode).emit('round-started', {
      roundId: roundId,
      imagePath: imagePath,
      timeLimit: timeLimit,
      players: roomState.players,
      roundNumber: roomState.roundCount,
      totalRounds: roomState.totalRounds,
      currentScores: roomState.scores,
      difficulty: difficulty,
      difficultyData: difficultyData
    });

    // Set timer to end round
    const timerId = setTimeout(async () => {
      await endRound(roomCode, roundId);
    }, timeLimit * 1000);
    
    // Store timer ID in room state so we can clear it if round ends early
    roomState.currentRound.timerId = timerId;

    console.log(`[${new Date().toISOString()}] Round ${roomState.roundCount}/${roomState.totalRounds} started in room ${roomCode}`);

  } catch (error) {
    console.error('Error starting round:', error);
  }
}

// End a round and calculate results
async function endRound(roomCode, roundId) {
  try {
    const roomState = gameRooms.get(roomCode);
    if (!roomState) return;
    
    // Check if round has already ended
    if (roomState.currentRound && roomState.currentRound.ended) {
      console.log(`[${new Date().toISOString()}] Round ${roundId} already ended, skipping`);
      return;
    }
    
    // Mark round as ended
    if (roomState.currentRound) {
      roomState.currentRound.ended = true;
      
      // Clear the timer if it exists
      if (roomState.currentRound.timerId) {
        clearTimeout(roomState.currentRound.timerId);
        console.log(`[${new Date().toISOString()}] Cleared timer for round ${roundId}`);
      }
    }

    // Close the round
    await dbManager.closeRound(roundId);

    // Get all submissions
    const submissions = await dbManager.getRoundSubmissions(roundId);
    const round = await dbManager.getRound(roundId);

    // Calculate scores for all submissions
    const results = [];
    console.log(`[${new Date().toISOString()}] Processing ${submissions.length} submissions for round ${roundId}`);
    
    for (const submission of submissions) {
      console.log(`[${new Date().toISOString()}] Scoring submission from ${submission.playerName}: "${submission.promptText}"`);
      
      // Get difficulty information for this round
      const difficultyInfo = round.difficulty || 'medium';
      const difficultyData = round.difficultyData || {};
      
      const scoringResult = scoring.scoreAttempt(round.sourcePrompt, submission.promptText, difficultyInfo, difficultyData);
      console.log(`[${new Date().toISOString()}] Accuracy: ${scoringResult.accuracyScore}, Leaderboard Points: ${scoringResult.leaderboardPoints} (${difficultyInfo} difficulty, ${scoringResult.bonuses?.length || 0} bonuses)`);
      
      // Update cumulative scores using leaderboard points (accuracy * difficulty multiplier)
      if (roomState.scores[submission.playerName] !== undefined) {
        roomState.scores[submission.playerName] += scoringResult.leaderboardPoints;
      } else {
        roomState.scores[submission.playerName] = scoringResult.leaderboardPoints;
      }
      
      await dbManager.saveResult(
        roundId,
        submission.playerName,
        submission.promptText,
        scoringResult.leaderboardPoints,
        scoringResult.matched.join(', '),
        scoringResult.missed.join(', ')
      );

      results.push({
        playerName: submission.playerName,
        promptText: submission.promptText,
        accuracyScore: scoringResult.accuracyScore,
        leaderboardPoints: scoringResult.leaderboardPoints,
        difficulty: scoringResult.difficulty,
        difficultyMultiplier: scoringResult.difficultyMultiplier,
        matched: scoringResult.matched,
        missed: scoringResult.missed,
        explanation: scoringResult.explanation
      });
    }

    // Sort results by leaderboard points
    results.sort((a, b) => b.leaderboardPoints - a.leaderboardPoints);
    
    console.log(`[${new Date().toISOString()}] Round results:`, results.map(r => `${r.playerName}: ${r.leaderboardPoints} (${r.accuracyScore} accuracy)`));
    console.log(`[${new Date().toISOString()}] Current scores:`, roomState.scores);

    // Check if game is complete
    const isGameComplete = roomState.roundCount >= roomState.totalRounds;
    
    console.log(`[${new Date().toISOString()}] Game completion check: roundCount=${roomState.roundCount}, totalRounds=${roomState.totalRounds}, isComplete=${isGameComplete}`);
    
    // Always emit round-ended first to show round results
    io.to(roomCode).emit('round-ended', {
      roundId: roundId,
      sourcePrompt: round.sourcePrompt,
      results: results,
      stats: scoring.getScoringStats(results),
      roundNumber: roomState.roundCount,
      totalRounds: roomState.totalRounds,
      currentScores: roomState.scores,
      isLastRound: isGameComplete
    });
    
    if (isGameComplete) {
      roomState.gameState = 'finished';
      
      // Calculate final rankings
      const finalRankings = Object.entries(roomState.scores)
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score);
      
      // Store final results data for later use (host will choose when to show them)
      roomState.finalResults = {
        roundId: roundId,
        sourcePrompt: round.sourcePrompt,
        results: results,
        finalRankings: finalRankings,
        stats: scoring.getScoringStats(results),
        roundNumber: roomState.roundCount,
        totalRounds: roomState.totalRounds
      };
      
      console.log(`[${new Date().toISOString()}] Game completed, final results stored for host to view`);
    }

    roomState.gameState = isGameComplete ? 'finished' : 'waiting';
    roomState.currentRound = null;

    console.log(`[${new Date().toISOString()}] Round ${roomState.roundCount}/${roomState.totalRounds} ended in room ${roomCode}`);

  } catch (error) {
    console.error('Error ending round:', error);
  }
}

// API Routes (keeping existing REST API for compatibility)
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Dataset management
const fs = require('fs');
const csv = require('csv-parser');

// Load dataset
let dataset = [];
let datasetWithDifficulty = [];
let datasetLoaded = false;

async function loadDataset() {
  return new Promise((resolve, reject) => {
    const results = [];
    
    // Try to load dataset with difficulty information first
    const difficultyPath = path.join(__dirname, 'dataset/custom_prompts_with_difficulty.csv');
    const originalPath = path.join(__dirname, 'dataset/custom_prompts_df.csv');
    
    const filePath = fs.existsSync(difficultyPath) ? difficultyPath : originalPath;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        dataset = results;
        datasetWithDifficulty = results;
        datasetLoaded = true;
        console.log(`[${new Date().toISOString()}] Loaded ${dataset.length} dataset entries${filePath === difficultyPath ? ' with difficulty information' : ''}`);
        resolve();
      })
      .on('error', reject);
  });
}

// Get random dataset entry
function getRandomDatasetEntry() {
  if (!datasetLoaded || dataset.length === 0) {
    throw new Error('Dataset not loaded');
  }
  const randomIndex = Math.floor(Math.random() * dataset.length);
  return dataset[randomIndex];
}

// Image serving endpoint
app.get('/api/images/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Extract the number from filename (e.g., custom_1998_0.png -> 1998)
  const match = filename.match(/custom_(\d+)_0\.png/);
  if (!match) {
    console.error(`[${new Date().toISOString()}] Invalid filename format: ${filename}`);
    return res.status(400).json({ error: 'Invalid filename format' });
  }
  
  const imageNumber = parseInt(match[1]);
  
  // Validate image number is within our dataset range (0-1998)
  if (imageNumber < 0 || imageNumber > 1998) {
    console.error(`[${new Date().toISOString()}] Image number ${imageNumber} is out of valid range (0-1998)`);
    return res.status(404).json({ error: 'Image not found - out of dataset range', filename, validRange: '0-1998' });
  }
  
  const subdirectory = Math.floor(imageNumber / 1000); // Group by thousands (0-999 -> 0, 1000-1998 -> 1)
  const imagePath = path.join(__dirname, 'dataset/images', subdirectory.toString(), filename);
  
  console.log(`[${new Date().toISOString()}] Serving image: ${filename}`);
  console.log(`[${new Date().toISOString()}] Image number: ${imageNumber}, Subdirectory: ${subdirectory}`);
  console.log(`[${new Date().toISOString()}] Image path: ${imagePath}`);
  console.log(`[${new Date().toISOString()}] File exists: ${fs.existsSync(imagePath)}`);
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`[${new Date().toISOString()}] Image not found: ${imagePath}`);
    return res.status(404).json({ error: 'Image not found', filename, imagePath, subdirectory });
  }
  
  // Set appropriate headers
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Stream the image
  const stream = fs.createReadStream(imagePath);
  stream.pipe(res);
  
  stream.on('error', (err) => {
    console.error('Error streaming image:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error serving image', details: err.message });
    }
  });
  
  stream.on('end', () => {
    console.log(`[${new Date().toISOString()}] Successfully served image: ${filename}`);
  });
});

// Daily challenge endpoint
app.get('/api/daily-challenge', (req, res) => {
  try {
    if (!datasetLoaded) {
      return res.status(503).json({ error: 'Dataset not loaded yet' });
    }
    
    const entry = getRandomDatasetEntry();
    console.log('Daily challenge entry:', entry);
    
    // Extract just the filename from the full path
    const filename = path.basename(entry.image_file);
    const imagePath = `/api/images/${filename}`;
    
    console.log('Generated image path:', imagePath);
    
    res.json({
      success: true,
      imagePath: imagePath,
      sourcePrompt: entry.prompt,
      challengeId: `daily_${new Date().toISOString().split('T')[0]}`
    });
  } catch (error) {
    console.error('Error getting daily challenge:', error);
    res.status(500).json({ error: 'Failed to get daily challenge' });
  }
});

// Score prompt endpoint
app.post('/api/score-prompt', (req, res) => {
  try {
    const { original, attempt } = req.body;
    
    if (!original || !attempt) {
      return res.status(400).json({ error: 'Both original and attempt prompts are required' });
    }
    
    const result = scoring.scoreAttempt(original, attempt);
    
    res.json({
      success: true,
      accuracyScore: result.accuracyScore,
      leaderboardPoints: result.leaderboardPoints,
      difficulty: result.difficulty,
      difficultyMultiplier: result.difficultyMultiplier,
      matched: result.matched,
      missed: result.missed,
      explanation: result.explanation,
      details: result.details
    });
  } catch (error) {
    console.error('Error scoring prompt:', error);
    res.status(500).json({ error: 'Failed to score prompt' });
  }
});

// Room Management Routes
app.post('/api/rooms', async (req, res) => {
  try {
    const { settings = {} } = req.body;
    const code = generateRoomCode();
    
    // Check if room code already exists
    const existingRoom = await dbManager.getRoom(code);
    if (existingRoom) {
      return res.status(409).json({ error: 'Room code already exists, please try again' });
    }
    
    await dbManager.createRoom(code, settings);
    
    res.json({
      success: true,
      room: {
        code: code,
        createdAt: Date.now(),
        settings: settings
      }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.get('/api/rooms/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!validateRoomCode(code)) {
      return res.status(400).json({ error: 'Invalid room code format' });
    }
    
    const room = await dbManager.getRoom(code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const players = await dbManager.getRoomPlayers(code);
    
    res.json({
      success: true,
      room: {
        ...room,
        players: players
      }
    });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Catch-all route for frontend routing (SPA behavior)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
    return;
  }
  
  // Serve index.html for all other routes (frontend routing)
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error:`, err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Shutting down server...`);
  dbManager.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Shutting down server...`);
  dbManager.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
  dbManager.close();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
  dbManager.close();
  process.exit(1);
});

// Initialize database and start server
async function startServer() {
  try {
    // Wait for database initialization
    await dbManager.init();
    
    // Load dataset
    await loadDataset();
    
    server.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] Prompt Battle WebGame server running on http://localhost:${PORT}`);
      console.log(`[${new Date().toISOString()}] WebSocket server enabled for real-time multiplayer`);
      console.log(`[${new Date().toISOString()}] Frontend served from: ${frontendPath}`);
      console.log(`[${new Date().toISOString()}] Dataset loaded with ${dataset.length} entries`);
    });
    
    server.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] Server error:`, error);
      if (error.code === 'EADDRINUSE') {
        console.error(`[${new Date().toISOString()}] Port ${PORT} is already in use`);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, error);
    process.exit(1);
  }
}

startServer();
