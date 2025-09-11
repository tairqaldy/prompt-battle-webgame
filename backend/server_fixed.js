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
    
    const players = await dbManager.getRoomPlayers(code);
    
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
    
    const result = await dbManager.removePlayer(playerId);
    
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
    
    const room = await dbManager.getRoom(code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const players = await dbManager.getRoomPlayers(code);
    if (players.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to start game' });
    }
    
    // For MVP, we'll use a placeholder image and prompt
    const roundId = generateRoundId();
    const imagePath = '/placeholder/mountain-scene.jpg';
    const sourcePrompt = 'A person climbing mountains with a vehicle on a winding path';
    const timeLimit = 60; // 60 seconds
    
    await dbManager.createRound(roundId, code, imagePath, sourcePrompt, timeLimit);
    
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
    
    const round = await dbManager.getRound(roundId);
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
  } else {
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Server error:`, err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
dbManager.getDb(); // This will ensure the database is initialized and migrations run

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`);
});
