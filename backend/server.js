const express = require('express');
const path = require('path');
const dbManager = require('./db');
const scoring = require('./scoring');

const app = express();
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

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Check if room has active round
app.get('/api/rooms/:code/active-round', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!validateRoomCode(code)) {
      return res.status(400).json({ error: 'Invalid room code format' });
    }
    
    const room = await dbManager.getRoom(code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Find active round for this room
    const db = dbManager.getDb();
    const activeRound = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM rounds WHERE code = ? AND closedAt IS NULL ORDER BY createdAt DESC LIMIT 1',
        [code],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    res.json({
      success: true,
      hasActiveRound: !!activeRound,
      roundId: activeRound ? activeRound.id : null
    });
  } catch (error) {
    console.error('Error checking active round:', error);
    res.status(500).json({ error: 'Failed to check active round' });
  }
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
    
    // Check if room code already exists (very unlikely but good practice)
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

app.post('/api/rooms/:code/join', async (req, res) => {
  try {
    const { code } = req.params;
    const { playerName } = req.body;
    
    if (!validateRoomCode(code)) {
      return res.status(400).json({ error: 'Invalid room code format' });
    }
    
    if (!validatePlayerName(playerName)) {
      return res.status(400).json({ error: 'Invalid player name' });
    }
    
    const room = await dbManager.getRoom(code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const players = await dbManager.getRoomPlayers(code);
    
    // Check if player name is already taken
    const nameExists = players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (nameExists) {
      return res.status(409).json({ error: 'Player name already taken' });
    }
    
    // Check room capacity (max 8 players)
    if (players.length >= 8) {
      return res.status(409).json({ error: 'Room is full' });
    }
    
    const result = await dbManager.addPlayer(code, playerName.trim());
    
    res.json({
      success: true,
      player: {
        id: result.lastInsertRowid,
        name: playerName.trim(),
        code: code
      }
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

app.get('/api/rooms/:code/players', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!validateRoomCode(code)) {
      return res.status(400).json({ error: 'Invalid room code format' });
    }
    
    const players = dbManager.getRoomPlayers(code);
    
    res.json({
      success: true,
      players: players
    });
  } catch (error) {
    console.error('Error getting players:', error);
    res.status(500).json({ error: 'Failed to get players' });
  }
});

app.delete('/api/rooms/:code/players/:playerId', async (req, res) => {
  try {
    const { code, playerId } = req.params;
    
    if (!validateRoomCode(code)) {
      return res.status(400).json({ error: 'Invalid room code format' });
    }
    
    const result = dbManager.removePlayer(playerId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({
      success: true,
      message: 'Player removed successfully'
    });
  } catch (error) {
    console.error('Error removing player:', error);
    res.status(500).json({ error: 'Failed to remove player' });
  }
});

// Game Management Routes
app.post('/api/rooms/:code/start', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!validateRoomCode(code)) {
      return res.status(400).json({ error: 'Invalid room code format' });
    }
    
    const room = dbManager.getRoom(code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const players = dbManager.getRoomPlayers(code);
    if (players.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to start game' });
    }
    
    // For MVP, we'll use a placeholder image and prompt
    const roundId = generateRoundId();
    const imagePath = '/api/placeholder/mountain-scene';
    const sourcePrompt = 'A person climbing mountains with a vehicle on a winding path';
    const timeLimit = 60; // 60 seconds
    
    dbManager.createRound(roundId, code, imagePath, sourcePrompt, timeLimit);
    
    res.json({
      success: true,
      game: {
        roundId: roundId,
        roomCode: code,
        imagePath: imagePath,
        timeLimit: timeLimit,
        players: players
      }
    });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

app.get('/api/rounds/:roundId', async (req, res) => {
  try {
    const { roundId } = req.params;
    
    const round = await dbManager.getRound(roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }
    
    // Don't expose the source prompt to players during active round
    const publicRound = {
      id: round.id,
      code: round.code,
      imagePath: round.imagePath,
      timeLimit: round.timeLimit,
      createdAt: round.createdAt,
      closedAt: round.closedAt,
      isActive: !round.closedAt
    };
    
    res.json({
      success: true,
      round: publicRound
    });
  } catch (error) {
    console.error('Error getting round:', error);
    res.status(500).json({ error: 'Failed to get round' });
  }
});

app.post('/api/rounds/:roundId/submit', async (req, res) => {
  try {
    const { roundId } = req.params;
    const { playerName, promptText } = req.body;
    
    if (!validatePlayerName(playerName)) {
      return res.status(400).json({ error: 'Invalid player name' });
    }
    
    if (!validatePromptText(promptText)) {
      return res.status(400).json({ error: 'Invalid prompt text' });
    }
    
    const round = dbManager.getRound(roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }
    
    if (round.closedAt) {
      return res.status(400).json({ error: 'Round has already ended' });
    }
    
    // Check if player already submitted
    const existingSubmissions = await dbManager.getRoundSubmissions(roundId);
    const alreadySubmitted = existingSubmissions.some(s => s.playerName === playerName);
    
    if (alreadySubmitted) {
      return res.status(409).json({ error: 'Player has already submitted a prompt' });
    }
    
    await dbManager.submitPrompt(roundId, playerName, promptText.trim());
    
    res.json({
      success: true,
      message: 'Prompt submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting prompt:', error);
    res.status(500).json({ error: 'Failed to submit prompt' });
  }
});

app.get('/api/rounds/:roundId/results', async (req, res) => {
  try {
    const { roundId } = req.params;
    
    const round = await dbManager.getRound(roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }
    
    const submissions = await dbManager.getRoundSubmissions(roundId);
    const results = await dbManager.getRoundResults(roundId);
    
    // If no results yet, calculate them
    if (results.length === 0 && submissions.length > 0) {
      // Close the round
      await dbManager.closeRound(roundId);
      
      // Calculate scores for all submissions
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
      }
      
      // Get updated results
      const updatedResults = await dbManager.getRoundResults(roundId);
      
      res.json({
        success: true,
        round: {
          ...round,
          sourcePrompt: round.sourcePrompt // Now reveal the original prompt
        },
        submissions: submissions,
        results: updatedResults,
        stats: scoring.getScoringStats(updatedResults)
      });
    } else {
      res.json({
        success: true,
        round: {
          ...round,
          sourcePrompt: round.sourcePrompt
        },
        submissions: submissions,
        results: results,
        stats: scoring.getScoringStats(results)
      });
    }
  } catch (error) {
    console.error('Error getting round results:', error);
    res.status(500).json({ error: 'Failed to get round results' });
  }
});

app.get('/api/rooms/:code/final-results', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!validateRoomCode(code)) {
      return res.status(400).json({ error: 'Invalid room code format' });
    }
    
    const room = await dbManager.getRoom(code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const finalResults = await dbManager.getRoomResults(code);
    
    res.json({
      success: true,
      room: room,
      finalResults: finalResults
    });
  } catch (error) {
    console.error('Error getting final results:', error);
    res.status(500).json({ error: 'Failed to get final results' });
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
    
    app.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] Prompt Battle WebGame server running on http://localhost:${PORT}`);
      console.log(`[${new Date().toISOString()}] Frontend served from: ${frontendPath}`);
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, error);
    process.exit(1);
  }
}

startServer();
