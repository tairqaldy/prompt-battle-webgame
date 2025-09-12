# Quick Start Guide - Sprint 2

## 🚀 **Getting Started**

### **1. Start the Server**
```bash
cd backend
node server.js
```

### **2. Open the Game**
- Main game: `http://localhost:3000`
- Image test: `http://localhost:3000/test-images.html`

## 🎮 **Testing the Game**

### **Daily Challenge Test**
1. Click "Daily Challenge" button
2. Image should load (if not, check console for errors)
3. Type a prompt describing the image
4. Click "Submit Prompt"
5. See detailed scoring feedback with tips

### **Multiplayer Test**
1. Click "Create Room"
2. Enter your name
3. Customize settings (rounds, time, character limit)
4. Copy the room code
5. Click "Start Game"
6. Image should load properly
7. Submit prompts - round ends when all players submit
8. See live leaderboards and detailed scoring

## 🔧 **Troubleshooting**

### **Images Not Loading**
- Check browser console for errors
- Verify server is running on port 3000
- Test image loading at `/test-images.html`
- Check if image files exist in `backend/dataset/images/0/`

### **Scoring Not Working**
- Check browser console for API errors
- Verify scoring endpoint is responding
- Test with simple prompts first

### **Multiplayer Issues**
- Ensure WebSocket connection is established
- Check room code is correct
- Verify all players are in the same room

## 📊 **Expected Behavior**

### **Image Loading**
- Images should load within 2-3 seconds
- Loading indicator shows while loading
- Error message with retry button if loading fails

### **Scoring**
- Scores range from 0-100%
- Detailed feedback shows matched/missed words
- Tips provided for low scores

### **Multiplayer**
- Rounds end when all players submit
- Live leaderboard updates during game
- Final results show winner and rankings

## 🎯 **Success Criteria**

- [x] Images display correctly in both modes
- [x] Rounds end properly when all players submit
- [x] Scoring system provides accurate feedback
- [x] Host controls work with room code display
- [x] Complete game flow functions end-to-end

---

**Status**: ✅ All features working correctly  
**Last Updated**: September 12, 2025
