# Prompt Battle WebGame - Enhanced Version

A real-time multiplayer web game where players compete to write the most accurate prompts for AI-generated images.

## 🚀 New Features

### Real-time Multiplayer
- **WebSocket Support**: Instant communication between players
- **Live Updates**: See players join/leave in real-time
- **Synchronized Game State**: All players see the same game progression
- **Automatic Reconnection**: Handles connection drops gracefully

### Enhanced Game Flow
- **Complete 7-Screen Flow**: Lobby → Host/Guest → Round → Freeze → Results → Final
- **Real-time Scoring**: Instant score calculation and display
- **Live Leaderboard**: Updates as players submit prompts
- **Smooth Transitions**: Seamless navigation between game phases

### Improved UI/UX
- **Clean, Modern Design**: Professional-looking interface
- **Loading States**: Visual feedback during operations
- **Error Handling**: Comprehensive error messages
- **Responsive Design**: Works on desktop and mobile

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

## 🛠️ Technical Improvements

### Backend Enhancements
- **WebSocket Server**: Real-time communication using Socket.IO
- **Enhanced Database**: Improved SQLite integration
- **Better Error Handling**: Comprehensive error management
- **Game State Management**: In-memory room state tracking

### Frontend Enhancements
- **Socket Client**: WebSocket integration for real-time updates
- **Modular JavaScript**: Clean, maintainable code structure
- **Fallback Support**: REST API fallback when WebSocket unavailable
- **State Management**: Proper game state persistence

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prompt-battle-webgame
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Start the enhanced server**
   ```bash
   # Windows
   start_enhanced.bat
   
   # Linux/Mac
   ./start_enhanced.sh
   
   # Or manually
   npm run dev
   ```

4. **Open the game**
   - Navigate to `http://localhost:3000`
   - Create a room or join with a room code

## 📁 Project Structure

```
prompt-battle-webgame/
├── backend/
│   ├── server_enhanced.js      # Enhanced server with WebSocket
│   ├── server.js               # Original REST API server
│   ├── db.js                   # Database management
│   ├── scoring.js              # Scoring algorithm
│   └── package.json            # Dependencies
├── frontend/
│   ├── index.html              # Main lobby
│   ├── host.html               # Host party menu
│   ├── guest.html              # Guest party menu
│   ├── round.html              # In-game round
│   ├── freeze.html             # Waiting for results
│   ├── results.html            # Round results
│   ├── final.html              # Final results
│   ├── css/
│   │   └── styles.css          # Enhanced styling
│   └── js/
│       ├── socket-client.js    # WebSocket client
│       ├── api.js              # REST API utilities
│       ├── lobby.js            # Lobby functionality
│       ├── host.js             # Host functionality
│       ├── guest.js            # Guest functionality
│       ├── round.js            # Round functionality
│       ├── freeze.js           # Freeze screen
│       ├── results.js          # Results display
│       └── final.js            # Final results
├── docs/                       # Documentation
└── README_ENHANCED.md          # This file
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

### Game Settings
- **Rounds**: 1-5 rounds per game
- **Time Limit**: 30-120 seconds per round
- **Character Limit**: 50-400 characters per prompt
- **Max Players**: 2-8 players per room

## 🎯 Game Flow

1. **Lobby** → Players create or join rooms
2. **Host/Guest** → Room management and player list
3. **Round** → Image display and prompt writing
4. **Freeze** → Waiting for all submissions
5. **Results** → Score display and analysis
6. **Final** → Game completion and rankings

## 🔌 API Endpoints

### REST API (Fallback)
- `POST /api/rooms` - Create room
- `GET /api/rooms/:code` - Get room details
- `POST /api/rooms/:code/join` - Join room
- `GET /api/rounds/:id/results` - Get round results

### WebSocket Events
- `join-room` - Join a game room
- `leave-room` - Leave current room
- `start-game` - Start a new game
- `submit-prompt` - Submit a prompt
- `player-joined` - Player joined notification
- `player-left` - Player left notification
- `round-started` - Round started notification
- `round-ended` - Round ended notification

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

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up reverse proxy with nginx
4. Configure SSL certificates

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Performance

### Optimizations
- **Efficient Polling**: 2-second intervals for fallback
- **Memory Management**: Automatic room cleanup
- **Database Indexing**: Optimized queries
- **Client-side Caching**: Reduced server requests

### Scalability
- **Horizontal Scaling**: Multiple server instances
- **Load Balancing**: Distribute WebSocket connections
- **Database Clustering**: Multiple database instances
- **CDN Integration**: Static asset delivery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎉 Acknowledgments

- Original game concept and design
- Socket.IO for real-time communication
- SQLite for lightweight database
- Express.js for robust server framework

---

**Ready to play?** Start the enhanced server and enjoy real-time multiplayer Prompt Battle! 🎮
