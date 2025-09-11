# Testing Guide - Prompt Battle WebGame

## 🚀 How to Test the Current Implementation

### Step 1: Start the Server
```bash
cd backend
node server.js
```

You should see:
```
[2025-09-11T19:45:49.193Z] Database migrations completed
[2025-09-11T19:45:49.202Z] Prompt Battle WebGame server running on http://localhost:3000
[2025-09-11T19:45:49.203Z] Frontend served from: C:\Users\tairc\Desktop\prompt-battle-webgame\prompt-battle-webgame\frontend
```

### Step 2: Open the Frontend
Open your browser and go to: **http://localhost:3000**

You should see the Main Lobby page.

### Step 3: Test Party Creation
1. Click **"Create Party"** button
2. Enter a player name when prompted
3. You should be redirected to the Host Party page with a party code

### Step 4: Test Party Joining
1. Go back to the lobby (http://localhost:3000)
2. Click **"Join Party"**
3. Enter the party code from step 3
4. Enter a different player name
5. You should be redirected to the Guest Party page

### Step 5: Test Game Flow
1. From the Host Party page, click **"Start Game"**
2. You should be redirected to the Round page
3. Try entering a prompt and submitting it
4. Check if the scoring works

---

## 🔍 What to Check

### ✅ Database is Working
- The server creates `prompt_battle.db` file
- All database operations are logged
- Data persists between server restarts

### ✅ Party Logic Should Work
- Room creation generates unique 6-character codes
- Players can join rooms with party codes
- Host can see all players in real-time
- Host can kick players
- Host can start the game

### ✅ Game Logic Should Work
- Timer counts down from 60 seconds
- Character counter updates as you type
- Prompt submission works
- Scoring algorithm calculates scores
- Results are displayed

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to connect to server"
**Solution**: Make sure the server is running on port 3000

### Issue: "Party code not found"
**Solution**: Check that the party code is exactly 6 characters and uppercase

### Issue: "Player name already taken"
**Solution**: Use a different player name

### Issue: Frontend not loading
**Solution**: Check browser console for JavaScript errors

---

## 📊 Testing Checklist

### Backend Testing
- [ ] Server starts successfully
- [ ] Database creates tables
- [ ] API endpoints respond correctly
- [ ] Data persists in database

### Frontend Testing
- [ ] Main lobby loads
- [ ] Party creation works
- [ ] Party joining works
- [ ] Host page shows players
- [ ] Game starts successfully
- [ ] Prompt submission works
- [ ] Results display correctly

### Integration Testing
- [ ] Complete game flow works
- [ ] Real-time updates work
- [ ] Error handling works
- [ ] Data persistence works

---

## 🎯 Dataset Decision

**Current Implementation**: Uses placeholder data
- **Image**: Mountain scene placeholder
- **Source Prompt**: "A person climbing mountains with a vehicle on a winding path"
- **Benefits**: Consistent, predictable testing

**For MVP**: No need to download the Kaggle dataset yet
- The placeholder approach allows full testing
- Dataset integration can be added later
- Focus on game logic first

---

## 📝 Report Issues

If you find any problems:

1. **Check browser console** for JavaScript errors
2. **Check server console** for backend errors
3. **Note the exact steps** that caused the issue
4. **Update the debugging document** with your findings

---

*Happy Testing! 🎮*
