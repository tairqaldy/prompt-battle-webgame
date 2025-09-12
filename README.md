# Prompt Battle WebGame

A real-time multiplayer web game where players compete to write the most accurate prompts for AI-generated images.

## 🎯 Current Status: MVP COMPLETE ✅

**Development Stage**: Production Ready  
**Last Updated**: September 12, 2025  
**Sprint**: 2 Complete - Core Gameplay & Host Controls

### ✅ What's Working
- **Complete Multiplayer Experience** - Create/join rooms, real-time gameplay
- **100,000+ Dataset Integration** - Images and prompts from Stable Diffusion
- **Host Control System** - Host manages game flow and final results
- **Accurate Scoring System** - Semantic similarity with detailed feedback
- **Real-time Leaderboards** - Live updates during gameplay
- **Round Management** - Automatic progression and game completion
- **Error Handling** - Robust error management and user feedback

### 🚀 Ready for Production
The game is fully functional and ready for deployment with all core features implemented.

## 🎮 How to Play

1. **Create or Join a Room**
   - Host creates a room and shares the 6-character code
   - Players join using the room code

2. **Write Prompts**
   - View the AI-generated image
   - Write a prompt describing what you see
   - Character limit enforced (50-400 characters)

3. **Compete and Score**
   - Submit your prompt before time runs out
   - Get scored on accuracy against the original prompt
   - See real-time leaderboard updates

4. **View Results**
   - See detailed score breakdown
   - Compare your prompt with others
   - View the original prompt used to generate the image

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prompt-battle-webgame
   ```

2. **Download the dataset**
   - Download the dataset from [Kaggle](https://www.kaggle.com/datasets/rturley/stable-diffusion-100k-custom-prompts-and-images/data)
   - Extract the CSV file to `backend/dataset/custom_prompts_df.csv`
   - Extract the images folder to `backend/dataset/images/` (preserving the numbered subdirectories 0, 1, 2, etc.)
   - The dataset contains 100,000+ image-prompt pairs organized in numbered folders

3. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Start the game**
   ```bash
   # Windows
   start.bat
   
   # Linux/Mac
   ./start.sh
   
   # Or manually
   cd backend
   node server.js
   ```

5. **Open the game**
   - Navigate to `http://localhost:3000`
   - Create a room or join with a room code

## 📁 Project Structure

```
prompt-battle-webgame/
├── backend/
│   ├── server.js              # Main server with WebSocket + REST API
│   ├── db.js                  # Database management
│   ├── scoring.js             # Scoring algorithm
│   ├── package.json           # Dependencies
│   └── dataset/               # Dataset files (download separately)
│       ├── custom_prompts_df.csv  # 100k+ image-prompt pairs
│       └── images/            # Image files organized in numbered folders
│           ├── 0/             # Images 0-999
│           ├── 1/             # Images 1000-1999
│           ├── 2/             # Images 2000-2999
│           └── ...            # More numbered folders
├── frontend/
│   ├── index.html             # Single-page application
│   ├── test-images.html       # Image loading test page
│   ├── css/
│   │   └── styles.css         # Modern, responsive styling
│   └── js/
│       └── game.js            # Unified game logic
├── docs/                      # Documentation and sprint reports
├── start.bat                  # Windows startup script
├── start.sh                   # Linux/Mac startup script
└── README.md                  # This file
```

## 🎯 Features

### Real-time Multiplayer
- **WebSocket Support** - Instant communication between players
- **Live Updates** - See players join/leave in real-time
- **Synchronized Game State** - All players see the same progression
- **Automatic Reconnection** - Handles connection drops gracefully

### Game Flow
- **Lobby** - Create/join rooms with 6-character codes
- **Room Management** - Host controls, player list, settings
- **Active Gameplay** - Live timer, prompt writing, character limits
- **Results Display** - Detailed scoring and analysis
- **Final Rankings** - Game completion and winner announcement

### Scoring System
- **Deterministic Scoring** - Fair, explainable algorithm
- **Word Matching** - Compares player prompts with original
- **Semantic Analysis** - Considers meaning, not just exact words
- **Real-time Calculation** - Instant score updates

## 🛠️ Technical Details

### Backend
- **Express.js** - Web server framework
- **Socket.IO** - Real-time WebSocket communication
- **SQLite3** - Lightweight database
- **Node.js** - JavaScript runtime

### Frontend
- **Single Page Application** - Smooth, seamless experience
- **Vanilla JavaScript** - No frameworks, pure JS
- **Modern CSS** - Responsive, gradient design
- **WebSocket Client** - Real-time updates

### Game State Management
- **In-memory Rooms** - Fast, real-time updates
- **Database Persistence** - Game history and results
- **Player Management** - Join/leave, host controls
- **Round Progression** - Automated game flow

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### Game Settings
- **Rounds** - 3, 5, or 10 rounds per game
- **Time Limit** - 60, 90, or 120 seconds per round
- **Character Limit** - 50-400 characters per prompt
- **Max Players** - 2-8 players per room

## 🎮 Game Screens

### 1. Lobby
- Create new room or join existing
- Enter player name and room settings
- See online player count

### 2. Room
- **Host View** - Manage players, start game, kick players
- **Guest View** - Wait for host, see player list
- Real-time player updates

### 3. Game
- Display AI-generated image
- Live countdown timer
- Prompt input with character counter
- Real-time leaderboard

### 4. Results
- Your performance and score
- Prompt comparison with original
- Round leaderboard
- Next round or final results

### 5. Final
- Winner announcement
- Final rankings
- Play again or return to lobby

## 🚀 Development

### Adding New Features
1. **Frontend** - Modify `frontend/js/game.js` and `frontend/index.html`
2. **Backend** - Add endpoints to `backend/server.js`
3. **Database** - Update schema in `backend/db.js`
4. **Styling** - Update `frontend/css/styles.css`

### File Structure
- **Single Page App** - All functionality in one HTML file
- **Unified JavaScript** - One game class handles everything
- **Modern CSS** - Responsive, gradient design
- **Clean Backend** - WebSocket + REST API in one server

## 📊 Performance

### Optimizations
- **Single Page** - No page reloads, faster navigation
- **WebSocket** - Real-time updates without polling
- **Efficient DOM** - Minimal reflows and repaints
- **Memory Management** - Proper cleanup and garbage collection

### Scalability
- **Horizontal Scaling** - Multiple server instances
- **Load Balancing** - Distribute WebSocket connections
- **Database Clustering** - Multiple database instances
- **CDN Integration** - Static asset delivery

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if server is running
   - Verify port 3000 is available
   - Try refreshing the page

2. **Players Not Seeing Updates**
   - Ensure WebSocket connection is established
   - Check browser console for errors
   - Try rejoining the room

3. **Database Errors**
   - Check if `prompt_battle.db` exists
   - Verify database permissions
   - Restart the server

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🗺️ Development Roadmap

### ✅ Sprint 1 (Completed)
- Basic game structure and UI
- Single player daily challenge
- Initial multiplayer framework

### ✅ Sprint 2 (Completed) - Current
- Complete dataset integration (100k+ images)
- Host control system
- Accurate scoring and leaderboards
- Round management and game flow
- Error handling and stability

### 🚀 Sprint 3 (Planned)
- Enhanced UI/UX design
- Sound design and audio feedback
- Final results screen with "Play Again"
- Mobile responsiveness improvements

### 🔮 Future Enhancements
- Tournament system
- Player statistics and history
- Custom game modes
- Hosting and deployment
- Local network multiplayer

## 📊 Dataset Information

The game uses a dataset of 100,000+ AI-generated images with their corresponding prompts. The dataset is not included in the repository due to its large size (several GB).

### Dataset Details
- **Source**: [Kaggle - Stable Diffusion 100k Custom Prompts and Images](https://www.kaggle.com/datasets/rturley/stable-diffusion-100k-custom-prompts-and-images/data)
- **Size**: 100,000+ image-prompt pairs
- **Format**: PNG images + CSV with prompts
- **Location**: `backend/dataset/` (excluded from git)

### Why Excluded from Git?
- **Large File Size**: Images total several GB
- **Git Performance**: Large files slow down git operations
- **Storage Limits**: Git repositories have size limits
- **Download Once**: Users only need to download once

## 🎉 Ready to Play!

The game is fully functional with the complete dataset integration. All 100,000+ images and prompts are ready to use!

**Current Status:** Complete, working game with full dataset support! 🚀

---

*Built with ❤️ for multiplayer AI prompt competitions*