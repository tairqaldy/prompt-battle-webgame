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

function validatePromptText(text) {
  return text && typeof text === 'string' && text.trim().length >= 1 && text.trim().length <= 400;
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

  socket.on('start-game', async (data) => {
    try {
      const { roomCode } = data;
      
      if (!gameRooms.has(roomCode)) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const roomState = gameRooms.get(roomCode);
      
      if (roomState.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start game' });
        return;
      }

      if (roomState.gameState !== 'waiting') {
        socket.emit('error', { message: 'Game already in progress' });
        return;
      }

      // Initialize game
      roomState.gameStarted = true;
      roomState.roundCount = 0;
      roomState.scores = {};
      
      // Initialize scores for all players
      roomState.players.forEach(player => {
        roomState.scores[player.name] = 0;
      });

      // Start first round
      await startRound(roomCode);

    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  socket.on('submit-prompt', async (data) => {
    try {
      const { roundId, promptText } = data;
      
      if (!socket.playerId || !validatePromptText(promptText)) {
        socket.emit('error', { message: 'Invalid prompt' });
        return;
      }

      // Get player info
      const player = await getPlayerById(socket.playerId);
      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      // Submit prompt to database
      await dbManager.submitPrompt(roundId, player.name, promptText.trim());

      // Notify all players in room
      const roomCode = socket.roomCode;
      if (roomCode) {
        io.to(roomCode).emit('prompt-submitted', {
          playerName: player.name,
          roundId: roundId
        });
        
        // Check if all players have submitted
        const roomState = gameRooms.get(roomCode);
        if (roomState && roomState.currentRound && roomState.currentRound.id === roundId) {
          const allSubmissions = await dbManager.getRoundSubmissions(roundId);
          const playerCount = roomState.players.length;
          
          console.log(`[${new Date().toISOString()}] Round ${roundId}: ${allSubmissions.length}/${playerCount} players submitted`);
          
          // If all players have submitted, end the round early
          if (allSubmissions.length >= playerCount) {
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
    
    console.log('Multiplayer image path:', imagePath);
    
    // Create round in database
    await dbManager.createRound(roundId, roomCode, imagePath, sourcePrompt, timeLimit);
    
    roomState.currentRound = {
      id: roundId,
      imagePath: imagePath,
      timeLimit: timeLimit,
      startTime: Date.now(),
      roundNumber: roomState.roundCount
    };

    // Notify all players
    io.to(roomCode).emit('round-started', {
      roundId: roundId,
      imagePath: imagePath,
      timeLimit: timeLimit,
      players: roomState.players,
      roundNumber: roomState.roundCount,
      totalRounds: roomState.totalRounds,
      currentScores: roomState.scores
    });

    // Set timer to end round
    setTimeout(async () => {
      await endRound(roomCode, roundId);
    }, timeLimit * 1000);

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

    // Close the round
    await dbManager.closeRound(roundId);

    // Get all submissions
    const submissions = await dbManager.getRoundSubmissions(roundId);
    const round = await dbManager.getRound(roundId);

    // Calculate scores for all submissions
    const results = [];
    for (const submission of submissions) {
      const scoringResult = scoring.scoreAttempt(round.sourcePrompt, submission.promptText);
      
      // Update cumulative scores
      if (roomState.scores[submission.playerName] !== undefined) {
        roomState.scores[submission.playerName] += scoringResult.score;
      }
      
      await dbManager.saveResult(
        roundId,
        submission.playerName,
        submission.promptText,
        scoringResult.score,
        scoringResult.matched.join(', '),
        scoringResult.missed.join(', ')
      );

      results.push({
        playerName: submission.playerName,
        promptText: submission.promptText,
        score: scoringResult.score,
        matched: scoringResult.matched,
        missed: scoringResult.missed,
        explanation: scoringResult.explanation
      });
    }

    // Sort results by score
    results.sort((a, b) => b.score - a.score);

    // Check if game is complete
    const isGameComplete = roomState.roundCount >= roomState.totalRounds;
    
    if (isGameComplete) {
      roomState.gameState = 'finished';
      
      // Calculate final rankings
      const finalRankings = Object.entries(roomState.scores)
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score);
      
      // Notify all players with final results
      io.to(roomCode).emit('game-completed', {
        roundId: roundId,
        sourcePrompt: round.sourcePrompt,
        results: results,
        finalRankings: finalRankings,
        stats: scoring.getScoringStats(results),
        roundNumber: roomState.roundCount,
        totalRounds: roomState.totalRounds
      });
    } else {
      // Notify all players with round results
    io.to(roomCode).emit('round-ended', {
      roundId: roundId,
      sourcePrompt: round.sourcePrompt,
      results: results,
        stats: scoring.getScoringStats(results),
        roundNumber: roomState.roundCount,
        totalRounds: roomState.totalRounds,
        currentScores: roomState.scores
    });
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
let datasetLoaded = false;

async function loadDataset() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.join(__dirname, 'dataset/custom_prompts_df.csv'))
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        dataset = results;
        datasetLoaded = true;
        console.log(`[${new Date().toISOString()}] Loaded ${dataset.length} dataset entries`);
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
  const imagePath = path.join(__dirname, 'dataset/images/0', filename);
  
  console.log(`[${new Date().toISOString()}] Serving image: ${filename}`);
  console.log(`[${new Date().toISOString()}] Image path: ${imagePath}`);
  console.log(`[${new Date().toISOString()}] File exists: ${fs.existsSync(imagePath)}`);
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`[${new Date().toISOString()}] Image not found: ${imagePath}`);
    return res.status(404).json({ error: 'Image not found', filename, imagePath });
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
      score: result.score,
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
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, error);
    process.exit(1);
  }
}

startServer();
