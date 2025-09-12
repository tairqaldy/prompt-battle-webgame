const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.initialized = false;
    // Don't call init() in constructor - let server call it explicitly
  }

  async init() {
    if (this.initialized) {
      return;
    }
    
    try {
      // Create database file in the backend directory
      const dbPath = path.join(__dirname, 'prompt_battle.db');
      this.db = new sqlite3.Database(dbPath);
      
      // Run migrations
      await this.runMigrations();
      
      this.initialized = true;
      console.log(`[${new Date().toISOString()}] Database initialized at: ${dbPath}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Database initialization failed:`, error);
      throw error;
    }
  }

  runMigrations() {
    return new Promise((resolve, reject) => {
      const migrations = [
        // Create rooms table
        `CREATE TABLE IF NOT EXISTS rooms (
          code TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL
        )`,
        
        // Create players table
        `CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL,
          name TEXT NOT NULL
        )`,
        
        // Create rounds table
        `CREATE TABLE IF NOT EXISTS rounds (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL,
          imagePath TEXT NOT NULL,
          sourcePrompt TEXT NOT NULL,
          timeLimit INTEGER NOT NULL,
          createdAt INTEGER NOT NULL,
          closedAt INTEGER
        )`,
        
        // Create submissions table
        `CREATE TABLE IF NOT EXISTS submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          roundId TEXT NOT NULL,
          playerName TEXT NOT NULL,
          promptText TEXT NOT NULL,
          createdAt INTEGER NOT NULL
        )`,
        
        // Create results table
        `CREATE TABLE IF NOT EXISTS results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          roundId TEXT NOT NULL,
          playerName TEXT NOT NULL,
          promptText TEXT NOT NULL,
          score INTEGER NOT NULL,
          matched TEXT,
          missed TEXT
        )`
      ];

      let completed = 0;
      const total = migrations.length;

      if (total === 0) {
        resolve();
        return;
      }

      migrations.forEach(sql => {
        this.db.run(sql, (error) => {
          if (error) {
            console.error(`[${new Date().toISOString()}] Migration failed:`, sql, error);
            reject(error);
            return;
          }
          
          completed++;
          if (completed === total) {
            console.log(`[${new Date().toISOString()}] Database migrations completed`);
            resolve();
          }
        });
      });
    });
  }

  getDb() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Room Management Helpers
  createRoom(code, settings = {}) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO rooms (code, createdAt) VALUES (?, ?)`,
        [code, Date.now()],
        function(err) {
          if (err) reject(err);
          else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
        }
      );
    });
  }

  getRoom(code) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM rooms WHERE code = ?',
        [code],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  deleteRoom(code) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM rooms WHERE code = ?',
        [code],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  // Player Management Helpers
  addPlayer(roomCode, playerName) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO players (code, name) VALUES (?, ?)`,
        [roomCode, playerName],
        function(err) {
          if (err) reject(err);
          else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
        }
      );
    });
  }

  getRoomPlayers(roomCode) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM players WHERE code = ?',
        [roomCode],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  removePlayer(playerId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM players WHERE id = ?',
        [playerId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  // Game Management Helpers
  createRound(roundId, roomCode, imagePath, sourcePrompt, timeLimit) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO rounds (id, code, imagePath, sourcePrompt, timeLimit, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [roundId, roomCode, imagePath, sourcePrompt, timeLimit, Date.now()],
        function(err) {
          if (err) reject(err);
          else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
        }
      );
    });
  }

  getRound(roundId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM rounds WHERE id = ?',
        [roundId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  closeRound(roundId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE rounds SET closedAt = ? WHERE id = ?',
        [Date.now(), roundId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  // Submission Helpers
  submitPrompt(roundId, playerName, promptText) {
    return new Promise((resolve, reject) => {
      const self = this; // Store reference to this
      
      // First try to update existing submission
      this.db.run(
        `UPDATE submissions SET promptText = ?, createdAt = ? WHERE roundId = ? AND playerName = ?`,
        [promptText, Date.now(), roundId, playerName],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // If no rows were updated, insert new submission
          if (this.changes === 0) {
            self.db.run(
              `INSERT INTO submissions (roundId, playerName, promptText, createdAt) VALUES (?, ?, ?, ?)`,
              [roundId, playerName, promptText, Date.now()],
              function(err) {
                if (err) reject(err);
                else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
              }
            );
          } else {
            resolve({ lastInsertRowid: this.lastID, changes: this.changes });
          }
        }
      );
    });
  }

  getRoundSubmissions(roundId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM submissions WHERE roundId = ?',
        [roundId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  removeSubmission(roundId, playerName) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM submissions WHERE roundId = ? AND playerName = ?',
        [roundId, playerName],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  // Results Helpers
  saveResult(roundId, playerName, promptText, score, matched, missed) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO results (roundId, playerName, promptText, score, matched, missed) VALUES (?, ?, ?, ?, ?, ?)`,
        [roundId, playerName, promptText, score, matched, missed],
        function(err) {
          if (err) reject(err);
          else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
        }
      );
    });
  }

  getRoundResults(roundId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM results WHERE roundId = ? ORDER BY score DESC',
        [roundId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getRoomResults(roomCode) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT r.*, p.name as playerName, SUM(r.score) as totalScore
         FROM results r
         JOIN rounds rd ON r.roundId = rd.id
         WHERE rd.code = ?
         GROUP BY r.playerName
         ORDER BY totalScore DESC`,
        [roomCode],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log(`[${new Date().toISOString()}] Database connection closed`);
    }
  }
}

// Export singleton instance
const dbManager = new DatabaseManager();
module.exports = dbManager;
