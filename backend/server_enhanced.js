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
const gameRooms = new Map(); // roomCode -> { players: [], gameState: 'waiting'|'playing'|'finished', currentRound: null }
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
          settings: {
            rounds: 3,
            timeLimit: 60,
            maxPlayers: 8,
            characterLimit: 100
          }
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
    
    // For MVP, use placeholder image and prompt
    const roundId = generateRoundId();
    const imagePath = '/api/placeholder/mountain-scene';
    const sourcePrompt = 'A person climbing mountains with a vehicle on a winding path';
    const timeLimit = roomState.settings.timeLimit;
    
    // Create round in database
    await dbManager.createRound(roundId, roomCode, imagePath, sourcePrompt, timeLimit);
    
    roomState.currentRound = {
      id: roundId,
      imagePath: imagePath,
      timeLimit: timeLimit,
      startTime: Date.now()
    };

    // Notify all players
    io.to(roomCode).emit('round-started', {
      roundId: roundId,
      imagePath: imagePath,
      timeLimit: timeLimit,
      players: roomState.players
    });

    // Set timer to end round
    setTimeout(async () => {
      await endRound(roomCode, roundId);
    }, timeLimit * 1000);

    console.log(`[${new Date().toISOString()}] Round ${roundId} started in room ${roomCode}`);

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

    // Notify all players with results
    io.to(roomCode).emit('round-ended', {
      roundId: roundId,
      sourcePrompt: round.sourcePrompt,
      results: results,
      stats: scoring.getScoringStats(results)
    });

    roomState.gameState = 'waiting';
    roomState.currentRound = null;

    console.log(`[${new Date().toISOString()}] Round ${roundId} ended in room ${roomCode}`);

  } catch (error) {
    console.error('Error ending round:', error);
  }
}

// API Routes (keeping existing REST API for compatibility)
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Placeholder image endpoint
app.get('/api/placeholder/mountain-scene', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                margin: 0;
                padding: 20px;
                background: linear-gradient(to bottom, #87CEEB 0%, #87CEEB 30%, #90EE90 30%, #90EE90 100%);
                font-family: Arial, sans-serif;
            }
            .mountain-scene {
                width: 100%;
                max-width: 600px;
                height: 400px;
                margin: 0 auto;
                position: relative;
                background: linear-gradient(to bottom, #87CEEB 0%, #87CEEB 40%, #90EE90 40%, #90EE90 100%);
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            .mountain {
                position: absolute;
                bottom: 40%;
                width: 0;
                height: 0;
            }
            .mountain-1 {
                left: 10%;
                border-left: 80px solid transparent;
                border-right: 80px solid transparent;
                border-bottom: 120px solid #8B4513;
            }
            .mountain-2 {
                left: 25%;
                border-left: 60px solid transparent;
                border-right: 60px solid transparent;
                border-bottom: 100px solid #A0522D;
            }
            .mountain-3 {
                left: 40%;
                border-left: 100px solid transparent;
                border-right: 100px solid transparent;
                border-bottom: 140px solid #8B4513;
            }
            .mountain-4 {
                left: 60%;
                border-left: 70px solid transparent;
                border-right: 70px solid transparent;
                border-bottom: 110px solid #A0522D;
            }
            .mountain-5 {
                left: 75%;
                border-left: 90px solid transparent;
                border-right: 90px solid transparent;
                border-bottom: 130px solid #8B4513;
            }
            .path {
                position: absolute;
                bottom: 20%;
                left: 20%;
                width: 60%;
                height: 8px;
                background: #654321;
                border-radius: 4px;
            }
            .vehicle {
                position: absolute;
                bottom: 22%;
                left: 30%;
                width: 20px;
                height: 12px;
                background: #FF0000;
                border-radius: 2px;
            }
            .person {
                position: absolute;
                bottom: 24%;
                left: 45%;
                width: 8px;
                height: 16px;
                background: #000000;
                border-radius: 1px;
            }
            .person::after {
                content: '';
                position: absolute;
                top: -4px;
                left: -2px;
                width: 12px;
                height: 8px;
                background: #FFE4B5;
                border-radius: 50%;
            }
            .sun {
                position: absolute;
                top: 10%;
                right: 15%;
                width: 40px;
                height: 40px;
                background: #FFD700;
                border-radius: 50%;
            }
            .cloud {
                position: absolute;
                top: 15%;
                left: 10%;
                width: 60px;
                height: 20px;
                background: white;
                border-radius: 20px;
            }
            .cloud::before {
                content: '';
                position: absolute;
                top: -10px;
                left: 10px;
                width: 30px;
                height: 30px;
                background: white;
                border-radius: 50%;
            }
            .cloud::after {
                content: '';
                position: absolute;
                top: -5px;
                right: 10px;
                width: 25px;
                height: 25px;
                background: white;
                border-radius: 50%;
            }
        </style>
    </head>
    <body>
        <div class="mountain-scene">
            <div class="sun"></div>
            <div class="cloud"></div>
            <div class="mountain mountain-1"></div>
            <div class="mountain mountain-2"></div>
            <div class="mountain mountain-3"></div>
            <div class="mountain mountain-4"></div>
            <div class="mountain mountain-5"></div>
            <div class="path"></div>
            <div class="vehicle"></div>
            <div class="person"></div>
        </div>
    </body>
    </html>
  `);
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
    
    server.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] Prompt Battle WebGame server running on http://localhost:${PORT}`);
      console.log(`[${new Date().toISOString()}] WebSocket server enabled for real-time multiplayer`);
      console.log(`[${new Date().toISOString()}] Frontend served from: ${frontendPath}`);
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, error);
    process.exit(1);
  }
}

startServer();
