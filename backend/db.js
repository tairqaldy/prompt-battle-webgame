const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    try {
      // Create database file in the backend directory
      const dbPath = path.join(__dirname, 'prompt_battle.db');
      this.db = new sqlite3.Database(dbPath);
      
      // Run migrations
      this.runMigrations();
      
      console.log(`[${new Date().toISOString()}] Database initialized at: ${dbPath}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Database initialization failed:`, error);
      throw error;
    }
  }

  runMigrations() {
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

    migrations.forEach(sql => {
      this.db.run(sql, (error) => {
        if (error) {
          console.error(`[${new Date().toISOString()}] Migration failed:`, sql, error);
          throw error;
        }
        
        completed++;
        if (completed === total) {
          console.log(`[${new Date().toISOString()}] Database migrations completed`);
        }
      });
    });
  }

  getDb() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
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
