# Prompt Battle WebGame - MVP Documentation

## Game Overview

Prompt Battle WebGame is a competitive web game where players join private rooms, view AI-generated images, and write prompts under strict character limits to match the hidden original prompt used to generate the image.

## Seven Screen Flow

### 1. Main Lobby (`index.html`)
- Entry point for all players
- Options to "Host Party" or "Join Party"
- Links to Host Party Menu and Guest Party Menu

### 2. Host Party Menu (`host.html`)
- Create new game rooms
- Generate room codes for players to join
- Configure game settings (rounds, time limits)
- Start the game

### 3. Guest Party Menu (`guest.html`)
- Enter room code to join existing games
- Enter player name
- Join waiting room

### 4. In-Game Round Screen (`round.html`)
- Display AI-generated image
- Show countdown timer
- Text input for player prompt (character limit enforced)
- Submit button (disabled when time runs out)

### 5. Freeze Screen (`freeze.html`)
- Displayed after round timer ends
- Show "Calculating scores..." message
- Brief pause before showing results

### 6. Results Screen (`results.html`)
- Display all player prompts
- Show similarity scores against original prompt
- Highlight matched and missed words
- Show original prompt after all players have seen results

### 7. Final Results Screen (`final.html`)
- Game completion summary
- Final rankings
- Option to play again or return to lobby

## Upcoming API Endpoints

The following endpoints will be implemented in future iterations:

### Room Management
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:code` - Get room details
- `POST /api/rooms/:code/join` - Join room

### Game Management
- `POST /api/rooms/:code/start` - Start game
- `GET /api/rooms/:code/rounds/:id` - Get round details
- `POST /api/rounds/:id/submit` - Submit prompt

### Results
- `GET /api/rounds/:id/results` - Get round results
- `GET /api/rooms/:code/final-results` - Get final game results

## Database Schema

The SQLite database includes the following tables:

- **rooms** - Game room information
- **players** - Player information and room associations
- **rounds** - Individual game rounds with images and prompts
- **submissions** - Player prompt submissions
- **results** - Calculated similarity scores and analysis

## Technical Notes

- All scoring is deterministic and explainable
- No external API dependencies for MVP
- Uses curated subset of Kaggle dataset
- Character limits enforced on frontend and backend
- Real-time updates via polling (no WebSockets for MVP)
