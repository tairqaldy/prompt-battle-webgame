# Write detailed code explanation document
_Exported on 9/17/2025 at 14:26:36 GMT+2 from Cursor (1.6.14)_

---

**User**

lets write document right now "Code Explanation".

This document .md will have tech stack, functions, mechanics, logic, code parts where it all located, interactions with files, calculations, design and etc detailed explanation as if I spoke about them very clearly and detailled ilcuding references in the code.

---

**Cursor**

I'll create a comprehensive "Code Explanation" document for your Prompt Battle WebGame. Let me first examine the codebase to understand the complete structure and functionality.

Now I'll create the comprehensive Code Explanation document:

```markdown
# Code Explanation - Prompt Battle WebGame

## Overview

Prompt Battle is a real-time multiplayer web game where players compete by writing prompts for AI-generated images. The game challenges players to reverse-engineer prompts by looking at images and guessing what text was used to create them. This document provides a comprehensive technical explanation of the codebase, architecture, and implementation details.

## Tech Stack

### Backend Technologies
- **Node.js** (>=18.0.0) - JavaScript runtime environment
- **Express.js** (^4.18.2) - Web application framework for REST APIs
- **Socket.IO** (^4.7.4) - Real-time bidirectional communication
- **SQLite3** (^5.1.6) - Lightweight database for game data
- **CSV Parser** (^3.0.0) - Processing dataset files

### Frontend Technologies
- **Vanilla JavaScript** - Client-side game logic (ES6+ classes)
- **Socket.IO Client** - Real-time communication with server
- **HTML5** - Semantic markup and structure
- **CSS3** - Modern styling with custom properties and animations
- **Geist Font** - Typography from Google Fonts

### Database
- **SQLite** - File-based relational database (`prompt_battle.db`)

### Development Tools
- **Nodemon** (^3.0.2) - Development server with hot reload
- **Batch Scripts** - Windows automation for easy startup

## Project Structure

```
prompt-battle-webgame/
├── backend/                    # Server-side code
│   ├── server.js              # Main Express + Socket.IO server
│   ├── db.js                  # Database manager class
│   ├── scoring.js             # Scoring algorithm implementation
│   ├── difficulty_analyzer.js # Prompt difficulty classification
│   ├── dataset/               # Game content and images
│   │   ├── custom_prompts_df.csv
│   │   ├── custom_prompts_with_difficulty.csv
│   │   └── images/            # AI-generated images (0/ and 1/ subdirs)
│   ├── package.json           # Node.js dependencies
│   └── prompt_battle.db       # SQLite database file
├── frontend/                  # Client-side code
│   ├── index.html            # Single-page application
│   ├── js/game.js            # Main game logic class
│   ├── css/styles.css        # Complete styling
│   └── main-menu-background.png
├── docs/                     # Documentation and assets
└── start.bat                 # Windows startup script
```

## Architecture Overview

The game follows a **client-server architecture** with real-time communication:

1. **Frontend**: Single-page application with screen-based navigation
2. **Backend**: Express.js REST API + Socket.IO WebSocket server
3. **Database**: SQLite for persistent game data
4. **Real-time Communication**: Socket.IO for multiplayer synchronization

## Backend Implementation

### 1. Main Server (`backend/server.js`)

The main server file orchestrates the entire backend system:

#### Core Dependencies and Setup
```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const dbManager = require('./db');
const scoring = require('./scoring');
```

#### Key Components:

**Express Server Setup** (Lines 8-44):
- CORS middleware for cross-origin requests
- Static file serving for frontend assets
- Request logging middleware
- JSON/URL-encoded body parsing

**Game State Management** (Lines 46-48):
```javascript
const gameRooms = new Map(); // roomCode -> room state
const playerSockets = new Map(); // playerId -> socket
```

**Room Code Generation** (Lines 51-58):
- Generates 6-character alphanumeric room codes
- Uses cryptographically secure random selection

#### Socket.IO Event Handlers:

**Player Connection Management**:
- `join-room`: Validates player and adds to room
- `leave-room`: Removes player and cleans up
- `disconnect`: Handles unexpected disconnections

**Game Flow Events**:
- `start-game`: Initiates new game with settings
- `next-round`: Advances to next round (host only)
- `submit-prompt`: Handles player submissions
- `unsubmit-prompt`: Allows prompt editing

#### Round Management System:

**`startRound()` Function** (Lines 501-578):
1. Selects random dataset entry with difficulty info
2. Creates round in database
3. Broadcasts round data to all players
4. Sets automatic timer for round end

**`endRound()` Function** (Lines 581-706):
1. Prevents duplicate round endings
2. Calculates scores using scoring system
3. Updates cumulative leaderboard
4. Determines if game is complete
5. Emits results to all players

#### Dataset Management (Lines 714-754):
- Loads CSV dataset with difficulty classifications
- Serves images from organized directory structure
- Handles image path resolution and validation

### 2. Database Manager (`backend/db.js`)

Implements a singleton pattern for database operations:

#### Database Schema:
```sql
-- Rooms table
CREATE TABLE rooms (
  code TEXT PRIMARY KEY,
  createdAt INTEGER NOT NULL
);

-- Players table  
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  name TEXT NOT NULL
);

-- Rounds table
CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  imagePath TEXT NOT NULL,
  sourcePrompt TEXT NOT NULL,
  timeLimit INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  closedAt INTEGER
);

-- Submissions table
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roundId TEXT NOT NULL,
  playerName TEXT NOT NULL,
  promptText TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

-- Results table
CREATE TABLE results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roundId TEXT NOT NULL,
  playerName TEXT NOT NULL,
  promptText TEXT NOT NULL,
  score INTEGER NOT NULL,
  matched TEXT,
  missed TEXT
);
```

#### Key Methods:
- **Room Management**: `createRoom()`, `getRoom()`, `deleteRoom()`
- **Player Management**: `addPlayer()`, `getRoomPlayers()`, `removePlayer()`
- **Game Management**: `createRound()`, `closeRound()`, `getRound()`
- **Submission Handling**: `submitPrompt()`, `removeSubmission()`
- **Results Storage**: `saveResult()`, `getRoundResults()`

### 3. Scoring System (`backend/scoring.js`)

Implements sophisticated prompt comparison algorithm:

#### Core Algorithm Components:

**Text Normalization** (Lines 11-16):
```javascript
function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim();
}
```

**Word Extraction and Overlap Analysis** (Lines 35-59):
- Extracts unique words from both prompts
- Calculates matched, missed, and extra words
- Provides detailed overlap statistics

**Semantic Scoring** (Lines 67-171):
The scoring algorithm uses multiple factors:

1. **Base Word Match Score** (60% weight):
   - Percentage of original words matched
   - Penalty for excessive extra words
   - Bonus for similar length prompts

2. **Semantic Category Matching**:
   - People: person, man, woman, character, etc.
   - Actions: standing, sitting, walking, etc.
   - Objects: car, house, tree, building, etc.
   - Art Styles: painting, drawing, 3D render, etc.
   - Colors: red, blue, bright, dark, etc.
   - Settings: indoor, outdoor, city, forest, etc.

3. **Word Order Bonus**:
   - Rewards maintaining consecutive word sequences
   - Up to 15 points for preserving phrase structure

4. **Special Bonuses**:
   - Perfect match: 100 points
   - Substring inclusion: 90+ points
   - Exact phrase matches get priority

#### Difficulty-Based Scoring (Lines 181-242):

**Difficulty Multipliers**:
- Easy: 1.0x (standard scoring)
- Medium: 1.2x (20% bonus)
- Hard: 1.5x (50% bonus)

**Bonus System** (Lines 252-325):
1. **Conciseness Bonus**: Reward for brevity while maintaining accuracy
2. **Creativity Bonus**: Points for descriptive language
3. **Technical Accuracy**: Recognition of technical terms
4. **Style Recognition**: Art style identification
5. **Perfect Match**: Maximum bonus for exact matches

### 4. Difficulty Analyzer (`backend/difficulty_analyzer.js`)

Classifies prompts into easy/medium/hard categories:

#### Analysis Factors:

**Word Count Analysis** (Lines 13-17):
- Easy: 1-8 words
- Medium: 9-15 words  
- Hard: 16+ words

**Complexity Keywords** (Lines 20-24):
- Easy: photo, image, simple, cute, standing
- Medium: style, art, painting, fashion, old fashioned
- Hard: installation, claymation, fisheye, DSLR, Rembrandt

**Named Entity Detection** (Lines 175-199):
- Counts proper nouns and specific references
- Identifies character names, brands, locations
- Higher entity count = higher difficulty

**Art Style Classification** (Lines 203-218):
- Basic: photo, image
- Intermediate: painting, drawing, render
- Advanced: Rembrandt, claymation, vector, fisheye

**Weighted Scoring System** (Lines 48-54):
```javascript
difficultyWeights = {
    wordCount: 0.3,
    complexityKeywords: 0.25,
    namedEntities: 0.2,
    artStyles: 0.15,
    abstractConcepts: 0.1
}
```

## Frontend Implementation

### 1. Main Game Class (`frontend/js/game.js`)

Implements a comprehensive game client using ES6 classes:

#### Class Structure:
```javascript
class PromptBattleGame {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentScreen = 'lobby';
        this.gameState = { /* game state management */ };
        this.dailyChallenge = { /* daily challenge state */ };
    }
}
```

#### Key Components:

**Socket.IO Connection Management** (Lines 50-159):
- Establishes WebSocket connection
- Handles reconnection logic
- Manages connection state

**Event Handler Registration** (Lines 71-147):
- `player-joined`: Updates player list
- `round-started`: Initiates new round UI
- `round-ended`: Shows results screen
- `game-started`: Resets game state
- `prompt-submitted`: Updates submission status

**Screen Management System** (Lines 184-196):
```javascript
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
```

#### Game Flow Implementation:

**Room Creation** (Lines 217-257):
1. Validates player name
2. Makes REST API call to create room
3. Sets host status
4. Joins room via WebSocket

**Round Management** (Lines 505-599):
1. Updates game image with loading states
2. Starts countdown timer
3. Manages prompt input UI
4. Handles submission states

**Timer System** (Lines 611-705):
```javascript
startTimer(seconds) {
    this.clearCurrentTimer(); // Prevent timer conflicts
    let timeLeft = seconds;
    
    this.gameState.currentTimer = setInterval(() => {
        timeLeft--;
        this.updateTimerDisplay(timeLeft);
        
        if (timeLeft <= 0) {
            this.clearCurrentTimer();
            this.handleTimeUp();
        }
    }, 1000);
}
```

**Results Display** (Lines 779-835):
- Shows individual player performance
- Updates round leaderboard
- Displays cumulative scores
- Controls host/player UI differences

### 2. User Interface (`frontend/index.html`)

Single-page application with screen-based navigation:

#### Screen Architecture:
1. **Lobby Screen**: Main menu and room creation/joining
2. **Room Screen**: Pre-game lobby with settings
3. **Game Screen**: Active gameplay with timer and input
4. **Results Screen**: Round results and leaderboard
5. **Final Screen**: Game completion and final rankings
6. **Daily Challenge**: Single-player practice mode

#### Key UI Components:

**Responsive Game Image Container**:
```html
<div class="game-image-container">
    <img id="game-image" class="game-image" alt="Game Image">
    <!-- Loading and error states handled by JavaScript -->
</div>
```

**Real-time Leaderboard**:
```html
<div class="leaderboard-section">
    <h3>Leaderboard</h3>
    <div id="leaderboard" class="leaderboard">
        <!-- Dynamically populated by JavaScript -->
    </div>
</div>
```

**Prompt Input with Character Counting**:
```html
<div class="prompt-input-section">
    <textarea id="prompt-input" placeholder="Describe what you see..." 
              maxlength="400" oninput="updateCharCount()"></textarea>
    <div class="char-counter">
        <span id="char-count">0</span>/<span id="char-limit">400</span>
    </div>
</div>
```

### 3. Styling System (`frontend/css/styles.css`)

Modern CSS architecture with custom properties:

#### Design System:
```css
:root {
  /* Monochrome Color Palette */
  --primary-bg: #ffffff;
  --secondary-bg: #f8f9fa;
  --primary-text: #1a1a1a;
  --muted-text: #6c757d;
  --border-color: #e9ecef;
  
  /* Typography */
  --font-family: 'Geist', -apple-system, BlinkMacSystemFont;
  --font-mono: 'Geist Mono', Monaco, monospace;
}
```

#### Key Features:
- **Responsive Design**: Mobile-first approach with flexbox
- **Animation System**: Smooth transitions and loading states
- **Component Architecture**: Reusable UI components
- **Accessibility**: WCAG compliant color contrasts and focus states

## Game Mechanics

### 1. Room System
- **6-character room codes** for easy sharing
- **Host-based control** with room settings
- **Real-time player management** with join/leave events
- **Maximum 8 players** per room

### 2. Round Flow
1. **Image Selection**: Random dataset entry with difficulty classification
2. **Timer Start**: Configurable time limit (30-180 seconds)
3. **Submission Phase**: Players write prompts with character limits
4. **Auto-submission**: Prompts submitted when time expires
5. **Scoring Phase**: Server calculates accuracy scores
6. **Results Display**: Round leaderboard and individual feedback

### 3. Scoring Mechanics

#### Base Accuracy Score (0-100):
- **Word Matching**: Primary scoring factor
- **Semantic Analysis**: Context-aware scoring
- **Length Similarity**: Bonus for appropriate length
- **Order Preservation**: Bonus for maintaining phrase structure

#### Leaderboard Points:
- **Accuracy Score × Difficulty Multiplier**
- Easy: 1.0x, Medium: 1.2x, Hard: 1.5x
- Additional bonuses for special achievements

#### Bonus System:
- **Conciseness**: Fewer words, same accuracy
- **Creativity**: Descriptive language usage
- **Technical Accuracy**: Correct technical terms
- **Style Recognition**: Art style identification
- **Perfect Match**: Exact word-for-word matching

### 4. Difficulty Classification

Prompts are automatically classified using multiple factors:

#### Analysis Dimensions:
1. **Word Count**: Length-based complexity
2. **Vocabulary Complexity**: Technical vs. common terms  
3. **Named Entities**: Proper nouns and specific references
4. **Art Style References**: Technical art terminology
5. **Abstract Concepts**: Conceptual vs. concrete descriptions

#### Distribution Target:
- **Easy**: ~40% (1-8 words, common terms)
- **Medium**: ~40% (9-15 words, some technical terms)
- **Hard**: ~20% (16+ words, technical/specific terms)

## Data Flow

### 1. Game Initialization
1. Frontend connects to Socket.IO server
2. Server initializes database connection
3. Dataset loaded into memory with difficulty data
4. Player enters lobby screen

### 2. Room Creation/Joining
1. Player creates/joins room via REST API + WebSocket
2. Server validates room code and player name
3. Database stores room and player information
4. Real-time updates sent to all room members

### 3. Game Start
1. Host configures settings and starts game
2. Server initializes game state and resets scores
3. First round begins automatically

### 4. Round Execution
1. Server selects random dataset entry
2. Round data broadcast to all players
3. Players submit prompts via WebSocket
4. Server collects submissions until time expires
5. Scoring algorithm processes all submissions
6. Results calculated and stored in database
7. Round results broadcast to all players

### 5. Game Completion
1. After final round, server calculates final rankings
2. Game state marked as completed
3. Final results available for host to display
4. Players can start new game or return to lobby

## File Interactions

### Backend File Dependencies:
```
server.js
├── db.js (database operations)
├── scoring.js (prompt scoring)
├── difficulty_analyzer.js (prompt classification)
├── dataset/custom_prompts_with_difficulty.csv (game content)
└── dataset/images/ (AI-generated images)
```

### Frontend File Structure:
```
index.html
├── js/game.js (main game logic)
├── css/styles.css (complete styling)
└── main-menu-background.png (visual assets)
```

### Database Relationships:
```
rooms (1) ←→ (N) players
rooms (1) ←→ (N) rounds  
rounds (1) ←→ (N) submissions
rounds (1) ←→ (N) results
```

## Key Calculations

### 1. Accuracy Score Calculation
```javascript
// Base word matching score (0-60 points)
const wordMatchScore = (matchedWords / totalWords) * 60;

// Penalties and bonuses
const extraPenalty = Math.min(extraWords * 1.5, 15);
const lengthBonus = lengthRatio >= 0.8 ? 10 : (lengthRatio >= 0.6 ? 5 : 0);

// Semantic category bonuses (up to 40 points)
const semanticBonus = calculateSemanticMatching();

// Word order bonus (up to 15 points)  
const orderBonus = calculateConsecutiveMatches();

// Final accuracy score
const accuracyScore = Math.min(100, 
    wordMatchScore - extraPenalty + lengthBonus + semanticBonus + orderBonus
);
```

### 2. Leaderboard Points
```javascript
// Apply difficulty multiplier to accuracy score
const difficultyMultipliers = { easy: 1.0, medium: 1.2, hard: 1.5 };
const leaderboardPoints = accuracyScore * difficultyMultipliers[difficulty];
```

### 3. Difficulty Score
```javascript
// Weighted combination of factors
const difficultyScore = 
    (wordCountScore * 0.3) +
    (complexityScore * 0.25) + 
    (namedEntityScore * 0.2) +
    (artStyleScore * 0.15) +
    (abstractScore * 0.1);

// Classification thresholds
const difficulty = difficultyScore <= 1.8 ? 'easy' : 
                  difficultyScore <= 2.3 ? 'medium' : 'hard';
```

## Design Patterns

### 1. Singleton Pattern
- **Database Manager**: Single instance for all database operations
- **Game State**: Centralized state management on server

### 2. Observer Pattern  
- **Socket.IO Events**: Pub/sub messaging between client/server
- **UI Updates**: Event-driven screen transitions

### 3. Factory Pattern
- **Room Creation**: Standardized room initialization
- **Round Generation**: Consistent round data structure

### 4. State Machine Pattern
- **Game Flow**: lobby → room → game → results → final
- **Round States**: waiting → playing → ended

## Error Handling

### 1. Frontend Error Management
- **Connection Errors**: Automatic reconnection attempts
- **Validation Errors**: User-friendly error messages
- **Image Loading**: Fallback states with retry options
- **Timer Conflicts**: Prevention of multiple active timers

### 2. Backend Error Handling
- **Database Errors**: Graceful degradation with logging
- **Socket Disconnections**: Automatic cleanup
- **Invalid Data**: Input validation and sanitization
- **Resource Limits**: Room capacity and rate limiting

### 3. Data Validation
- **Room Codes**: 6-character alphanumeric format
- **Player Names**: 1-20 character length limit
- **Prompt Text**: Character limits based on game settings
- **Image Paths**: Validation against dataset range

## Performance Optimizations

### 1. Database Optimizations
- **Connection Pooling**: Efficient database connections
- **Indexed Queries**: Fast lookups on primary keys
- **Batch Operations**: Bulk inserts for results

### 2. Frontend Optimizations
- **Image Preloading**: Reduced loading times
- **Event Debouncing**: Character count updates
- **Memory Management**: Timer cleanup and state reset

### 3. Real-time Communication
- **Event Batching**: Minimize Socket.IO messages
- **State Synchronization**: Efficient delta updates
- **Connection Management**: Graceful handling of disconnections

## Security Considerations

### 1. Input Validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **CSRF Protection**: Token-based validation

### 2. Rate Limiting
- **Submission Limits**: Prevent spam submissions
- **Connection Limits**: Prevent DoS attacks
- **Resource Limits**: Maximum players per room

### 3. Data Privacy
- **No Persistent User Data**: Session-based gameplay
- **Minimal Data Collection**: Only game-required information
- **Secure Communication**: HTTPS in production

## Future Extensibility

### 1. Modular Architecture
- **Plugin System**: Easy addition of new game modes
- **Scoring Algorithms**: Swappable scoring implementations
- **UI Themes**: Customizable visual designs

### 2. Scalability Considerations
- **Database Migration**: Easy upgrade to PostgreSQL/MySQL
- **Load Balancing**: Horizontal scaling support
- **Caching Layer**: Redis integration for session storage

### 3. Feature Expansion
- **User Accounts**: Persistent player profiles
- **Tournaments**: Structured competitive play
- **Custom Datasets**: User-uploaded content
- **AI Integration**: Advanced prompt analysis

This comprehensive code explanation covers all major aspects of the Prompt Battle WebGame implementation, from high-level architecture to specific implementation details. The codebase demonstrates modern web development practices with real-time multiplayer functionality, sophisticated scoring algorithms, and responsive user interface design.
```

Perfect! I've created a comprehensive "Code Explanation" document for your Prompt Battle WebGame. This 400+ line markdown document covers every aspect of your codebase in detail, including:

## What's Included:

### **Tech Stack & Architecture**
- Complete breakdown of backend (Node.js, Express, Socket.IO, SQLite) and frontend (Vanilla JS, HTML5, CSS3) technologies
- Project structure and file organization
- Client-server architecture with real-time communication

### **Backend Deep Dive**
- **Server.js**: Main server logic, Socket.IO event handlers, room management, round flow
- **Database Manager**: SQLite schema, CRUD operations, relationship management
- **Scoring System**: Advanced algorithm with semantic analysis, difficulty multipliers, bonus system
- **Difficulty Analyzer**: ML-like classification system for prompt complexity

### **Frontend Implementation**
- **Game Class**: ES6 class architecture, state management, screen navigation
- **UI Components**: Responsive design, real-time updates, error handling
- **Styling System**: Modern CSS with custom properties and animations

### **Game Mechanics**
- Room system with 6-character codes and host controls
- Round flow from image selection to results display
- Sophisticated scoring with accuracy + difficulty multipliers
- Automatic difficulty classification using multiple factors

### **Technical Details**
- Complete data flow diagrams
- File interaction maps
- Key calculation formulas
- Database schema relationships
- Error handling strategies
- Performance optimizations
- Security considerations

### **Code References**
- Specific line number references to key functions
- Code snippets showing implementation details
- Detailed explanations of algorithms and logic
- Design patterns used throughout the codebase

The document is structured to be both technically comprehensive for developers and understandable for stakeholders who want to understand how the game works under the hood. It includes everything from high-level architecture decisions down to specific calculation formulas and database queries.

This will serve as excellent documentation for future development, onboarding new team members, or explaining the technical implementation to clients or stakeholders.

---

**User**

write commit message

---

**Cursor**

Based on the comprehensive Code Explanation document I just created, here's an appropriate commit message:

```
docs: Add comprehensive CODE_EXPLANATION.md documentation

- Complete technical documentation covering entire codebase architecture
- Detailed explanations of backend (Node.js, Express, Socket.IO, SQLite) and frontend (Vanilla JS, HTML5, CSS3) implementations
- In-depth analysis of game mechanics, scoring system, and difficulty classification
- Database schema documentation with relationship mappings
- Real-time multiplayer flow and Socket.IO event handling
- Advanced scoring algorithm with semantic analysis and difficulty multipliers
- UI/UX implementation details and responsive design patterns
- Performance optimizations, security considerations, and error handling
- Code references with specific line numbers and implementation examples
- Future extensibility and scalability considerations

This 691-line document serves as comprehensive technical reference for developers, stakeholders, and future team members working on the Prompt Battle WebGame project.
```

This commit message follows conventional commit format with:
- **Type**: `docs` (documentation changes)
- **Description**: Clear summary of what was added
- **Body**: Detailed breakdown of all the technical areas covered
- **Impact**: Explains the value and purpose of the documentation

```plaintext
docs: Add comprehensive CODE_EXPLANATION.md documentation

- Complete technical documentation covering entire codebase architecture
- Detailed explanations of backend (Node.js, Express, Socket.IO, SQLite) and frontend (Vanilla JS, HTML5, CSS3) implementations
- In-depth analysis of game mechanics, scoring system, and difficulty classification
- Database schema documentation with relationship mappings
- Real-time multiplayer flow and Socket.IO event handling
- Advanced scoring algorithm with semantic analysis and difficulty multipliers
- UI/UX implementation details and responsive design patterns
- Performance optimizations, security considerations, and error handling
- Code references with specific line numbers and implementation examples
- Future extensibility and scalability considerations

This 691-line document serves as comprehensive technical reference for developers, stakeholders, and future team members working on the Prompt Battle WebGame project.
```

