# Development Startup Guide - Sprint 2

**Date**: September 11, 2025  
**Sprint**: 02 - Backend API Development & Game Logic Implementation  
**Status**: 🔄 IN PROGRESS - Core logic working, UI needs refinement

## 🚀 **Quick Start - Next Time You Open This Codebase**

### **1. Environment Setup**
```bash
# Navigate to project root
cd C:\Users\tairc\Desktop\prompt-battle-webgame\prompt-battle-webgame

# Start the server
cd backend
node server.js
```

### **2. Access the Application**
- **Frontend**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Placeholder Image**: http://localhost:3000/api/placeholder/mountain-scene

### **3. Current Working Status**
- ✅ **Server**: Running without errors
- ✅ **Database**: SQLite initialized with all tables
- ✅ **Core Logic**: Party creation, joining, game rounds work
- ✅ **API Endpoints**: All endpoints functional
- 🔄 **UI Issues**: Round page not showing for all players (HOST ONLY)
- 🔄 **Game Flow**: Partial - needs UI refinement

## 📊 **Current Development Status**

### **✅ What's Working**
1. **Party Management**:
   - Create party → Get party code
   - Join party with code
   - Real-time player list updates (2-second polling)
   - Host can start game

2. **Backend APIs**:
   - All endpoints functional
   - Database operations working
   - Prompt submission works
   - Scoring algorithm functional

3. **Database**:
   - SQLite database created
   - All tables initialized
   - Data persistence working

### **🔄 Known Issues (Need Fixing)**

1. **UI Round Display Issue**:
   - **Problem**: Only HOST sees the round page
   - **Impact**: Other players can't participate in game rounds
   - **Priority**: HIGH - Blocks multiplayer gameplay

2. **Game Flow Incomplete**:
   - Players can join but can't play together
   - Results page not properly connected
   - Freeze screen not implemented

3. **UI/UX Issues**:
   - Some pages not properly styled
   - Navigation between screens needs work
   - Error handling could be better

## 🛠 **Development Environment Details**

### **Project Structure**
```
prompt-battle-webgame/
├── backend/                 # Node.js Express server
│   ├── server.js           # Main server file (628 lines)
│   ├── db.js               # Database operations (316 lines)
│   ├── scoring.js          # Scoring algorithm (218 lines)
│   ├── package.json        # Dependencies
│   └── prompt_battle.db    # SQLite database
├── frontend/               # Static HTML/CSS/JS
│   ├── index.html          # Main lobby
│   ├── host.html           # Host party menu
│   ├── guest.html          # Guest party menu
│   ├── round.html          # Game round (ISSUE: Host only)
│   ├── freeze.html         # Freeze screen
│   ├── results.html        # Results page
│   ├── final.html          # Final results
│   ├── css/styles.css      # Styling
│   └── js/                 # JavaScript modules
└── docs/sprints/sprint-02/ # Documentation
```

### **Key Files to Know**
- **`backend/server.js`**: Main server with all API endpoints
- **`backend/db.js`**: Database operations (all async/await fixed)
- **`frontend/js/round.js`**: Game round logic (needs UI fixes)
- **`frontend/js/guest.js`**: Guest page logic
- **`frontend/js/host.js`**: Host page logic

## 🔧 **Technical Stack**

### **Backend**
- **Node.js**: v22.17.1
- **Express**: Web server framework
- **SQLite3**: Database (not better-sqlite3)
- **Async/Await**: All database operations use Promises

### **Frontend**
- **Vanilla JavaScript**: ES6 modules
- **HTML5**: Semantic markup
- **CSS3**: Custom styling
- **No Frameworks**: Plain JS as requested

### **Database Schema**
```sql
-- 5 main tables
rooms(code, createdAt)
players(id, code, name)
rounds(id, code, imagePath, sourcePrompt, timeLimit, createdAt, closedAt)
submissions(id, roundId, playerName, promptText, createdAt)
results(id, roundId, playerName, promptText, score, matched, missed)
```

## 🐛 **Known Bugs & Issues**

### **Critical Issues**
1. **Round Page Access**: Only host can access game rounds
   - **Location**: `frontend/js/round.js`
   - **Symptom**: Guest players can't join game rounds
   - **Impact**: Blocks multiplayer gameplay

2. **Navigation Flow**: Incomplete game flow
   - **Missing**: Proper round → freeze → results flow
   - **Impact**: Players get stuck in game rounds

### **Minor Issues**
1. **UI Styling**: Some pages need better styling
2. **Error Messages**: Could be more user-friendly
3. **Loading States**: Missing loading indicators

## 📝 **Development Notes**

### **Recent Fixes (Today)**
- ✅ Fixed all async/await syntax errors
- ✅ Fixed prompt submission bugs
- ✅ Fixed timer display (NaN → proper countdown)
- ✅ Fixed room info display (undefined → actual code)
- ✅ Fixed image display (mountain scene now shows)
- ✅ Fixed real-time player updates

### **Database Operations**
- All database functions return Promises
- Use `await` for all database calls
- Error handling implemented
- Data persists between server restarts

### **API Endpoints Working**
```
GET  /api/health
GET  /api/placeholder/mountain-scene
POST /api/rooms
GET  /api/rooms/:code
POST /api/rooms/:code/join
GET  /api/rooms/:code/players
POST /api/rooms/:code/start
GET  /api/rounds/:roundId
POST /api/rounds/:roundId/submit
GET  /api/rounds/:roundId/results
GET  /api/rooms/:code/final-results
```

## 🎯 **Next Development Priorities**

### **Immediate (High Priority)**
1. **Fix Round Page Access**: Make game rounds accessible to all players
2. **Complete Game Flow**: Ensure proper navigation between screens
3. **Test Multiplayer**: Verify 2+ players can play together

### **Short Term**
1. **UI Polish**: Improve styling and user experience
2. **Error Handling**: Better error messages and recovery
3. **Loading States**: Add loading indicators

### **Medium Term**
1. **Dataset Integration**: Replace placeholder with real images
2. **Multiple Rounds**: Implement multi-round games
3. **Final Results**: Complete final results screen

## 🧪 **Testing Strategy**

### **Manual Testing Steps**
1. Start server: `cd backend && node server.js`
2. Open browser: http://localhost:3000
3. Create party as host
4. Join party as guest (new tab)
5. Start game from host
6. **ISSUE**: Guest can't access round page
7. Test prompt submission (host only currently)
8. Check results page

### **Expected Behavior**
- Host creates party → gets code
- Guest joins party → sees host in player list
- Host starts game → both players go to round page
- Both players can submit prompts
- Results show for all players

### **Current Reality**
- Host creates party ✅
- Guest joins party ✅
- Host starts game ✅
- **Only host sees round page** ❌
- Guest gets stuck ❌

## 📚 **Documentation References**

### **Sprint 2 Documents**
- `CRITICAL-FIXES-IMPLEMENTED.md`: Technical fixes made
- `FINAL-TESTING-GUIDE.md`: Testing procedures
- `DEBUGGING-DEVELOPMENT.md`: Issues and solutions
- `DEVELOPMENT-STARTUP-GUIDE.md`: This document

### **Useful Commands**
```bash
# Start development server
cd backend && node server.js

# Check server health
curl http://localhost:3000/api/health

# View database (if needed)
# SQLite database: backend/prompt_battle.db

# Check logs
# Server logs appear in terminal where server is running
```

## 🚨 **Emergency Troubleshooting**

### **Server Won't Start**
1. Check if port 3000 is in use
2. Verify all dependencies installed: `npm install`
3. Check for syntax errors: `node -c server.js`

### **Database Issues**
1. Delete `backend/prompt_battle.db` to reset
2. Restart server to recreate tables

### **Frontend Issues**
1. Check browser console (F12)
2. Verify server is running
3. Check network tab for failed requests

## 📈 **Progress Tracking**

### **Sprint 2 Completion Status**
- **Backend Development**: 90% ✅
- **API Implementation**: 100% ✅
- **Database Integration**: 100% ✅
- **Core Game Logic**: 80% 🔄
- **UI Integration**: 60% 🔄
- **Multiplayer Flow**: 40% 🔄
- **Testing & Polish**: 30% 🔄

### **Overall Project Status**
- **MVP Foundation**: 70% Complete
- **Playable Game**: 60% Complete
- **Production Ready**: 30% Complete

---

**Last Updated**: September 11, 2025  
**Next Session Focus**: Fix round page access for all players, complete multiplayer game flow
