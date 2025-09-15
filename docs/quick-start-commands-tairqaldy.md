# Quick Start Commands - tairqaldy

## 🚀 Fast Project Startup Commands

### Local Development Only
```powershell
# Start game server
cd backend && node server.js

# Access: http://localhost:3000
```

### Local + ngrok (Public Access)
```powershell
# Terminal 1 - Start server
cd backend && node server.js

# Terminal 2 - Start ngrok tunnel
..\ngrok.exe http 3000

# Share the ngrok URL with others!
```

### One-Line Commands
```powershell
# Start server only
cd backend; node server.js

# Start ngrok only (server must be running)
.\ngrok.exe http 3000

# Kill all Node processes (if stuck)
taskkill /f /im node.exe
```

## 📋 Essential URLs
- **Local:** http://localhost:3000
- **Network:** http://YOUR_IP:3000 (find IP with `ipconfig`)
- **Public:** https://abc123.ngrok-free.app (from ngrok output)
- **ngrok Dashboard:** http://localhost:4040

## ⚡ Troubleshooting
```powershell
# Port in use?
netstat -ano | findstr :3000

# Kill process on port 3000
taskkill /pid [PID_NUMBER] /f

# Restart everything
taskkill /f /im node.exe; cd backend; node server.js
```

---
*Use the `start-game.bat` script for even faster startup!*
