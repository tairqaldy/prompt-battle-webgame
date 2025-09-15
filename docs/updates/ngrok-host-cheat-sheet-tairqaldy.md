# ngrok Host Cheat Sheet - tairqaldy

## Overview
This cheat sheet provides step-by-step instructions for making your locally hosted Prompt Battle WebGame accessible to anyone on the internet using ngrok. Perfect for sharing with friends, testing on different devices, or demonstrating the game remotely.

## What is ngrok?
ngrok creates a secure tunnel from your local server to the internet, giving you a public URL that anyone can access. It's perfect for:
- Sharing your game with friends remotely
- Testing on mobile devices
- Demonstrating your project to others
- Temporary public hosting without deploying to a server

## Prerequisites
- Your Prompt Battle WebGame running locally on port 3000
- Internet connection
- ngrok account (free)

## Step-by-Step Setup

### Step 1: Download and Setup ngrok

1. **Visit ngrok website:**
   - Go to https://ngrok.com/
   - Click "Sign up for free" or "Get started for free"

2. **Create account:**
   - Use your email (tairqaldy@gmail.com)
   - Verify your email address
   - Complete the signup process

3. **Download ngrok:**
   - Go to https://dashboard.ngrok.com/get-started/your-authtoken
   - Click "Download for Windows"
   - Extract the `ngrok.exe` file to your project folder:
     ```
     C:\Users\tairc\Desktop\project-1-webgame-prompt-battle\prompt-battle-webgame\prompt-battle-webgame\
     ```

4. **Authenticate ngrok:**
   ```powershell
   # In your project folder, run:
   .\ngrok.exe config add-authtoken YOUR_AUTHTOKEN
   ```
   - Replace `YOUR_AUTHTOKEN` with the token from your ngrok dashboard

### Step 2: Start Your Game Server

1. **Open PowerShell in your project folder:**
   ```powershell
   cd "C:\Users\tairc\Desktop\project-1-webgame-prompt-battle\prompt-battle-webgame\prompt-battle-webgame"
   ```

2. **Start the backend server:**
   ```powershell
   cd backend
   node server.js
   ```

3. **Verify it's running:**
   - You should see: `Prompt Battle WebGame server running on http://localhost:3000`
   - Test locally: Open http://localhost:3000 in your browser

### Step 3: Create Public Tunnel with ngrok

1. **Open a new PowerShell window** (keep the server running in the first one)

2. **Navigate to your project folder:**
   ```powershell
   cd "C:\Users\tairc\Desktop\project-1-webgame-prompt-battle\prompt-battle-webgame\prompt-battle-webgame"
   ```

3. **Start ngrok tunnel:**
   ```powershell
   .\ngrok.exe http 3000
   ```

4. **Copy your public URL:**
   - ngrok will display something like:
     ```
     Forwarding: https://abc123def.ngrok-free.app -> http://localhost:3000
     ```
   - Copy the `https://abc123def.ngrok-free.app` URL

### Step 4: Share and Test

1. **Share the URL:**
   - Send the ngrok URL to friends: `https://abc123def.ngrok-free.app`
   - They can access your game from anywhere in the world!

2. **Test on different devices:**
   - Open the URL on your phone
   - Test on a tablet or different computer
   - Verify multiplayer works across devices

## Important Notes

### ngrok Free Plan Limitations
- **Session Duration:** Tunnels expire after 2 hours of inactivity
- **Connection Limit:** Up to 20 connections per minute
- **Custom Domains:** Not available on free plan
- **HTTPS:** Always enabled (secure connections)

### When Tunnels Expire
- If ngrok tunnel stops working, simply restart it:
  ```powershell
  .\ngrok.exe http 3000
  ```
- You'll get a new URL each time (unless you upgrade to paid plan)

### Security Considerations
- **Temporary Use:** ngrok is great for testing and sharing, not permanent hosting
- **Public Access:** Anyone with your URL can access your game
- **Data Privacy:** Don't use for sensitive data or production systems

## Troubleshooting

### Common Issues

1. **"ngrok command not found"**
   - Make sure you're in the correct directory
   - Verify ngrok.exe is in your project folder
   - Use `.\ngrok.exe` instead of just `ngrok`

2. **"Tunnel failed to start"**
   - Check if port 3000 is already in use
   - Make sure your game server is running first
   - Try a different port: `.\ngrok.exe http 3001`

3. **"ngrok not authenticated"**
   - Run: `.\ngrok.exe config add-authtoken YOUR_AUTHTOKEN`
   - Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

4. **Game not loading on mobile**
   - Check if your server accepts external connections
   - Update server.js line 948 to: `server.listen(PORT, '0.0.0.0', () => {`

### Performance Tips
- **Stable Connection:** Use wired internet for better stability
- **Close Unused Tabs:** Keep only necessary browser tabs open
- **Monitor Usage:** Check ngrok dashboard for connection limits

## Quick Commands Reference

```powershell
# Start game server
cd backend && node server.js

# Start ngrok tunnel (in new terminal)
.\ngrok.exe http 3000

# Check ngrok status
.\ngrok.exe status

# Stop ngrok tunnel
Ctrl+C in the ngrok terminal

# View ngrok web interface
http://localhost:4040
```

## Example Session

```powershell
# Terminal 1 - Start server
PS C:\Users\tairc\Desktop\...\prompt-battle-webgame> cd backend
PS C:\Users\tairc\Desktop\...\prompt-battle-webgame\backend> node server.js
[2025-09-15T23:15:00.000Z] Prompt Battle WebGame server running on http://localhost:3000

# Terminal 2 - Start ngrok
PS C:\Users\tairc\Desktop\...\prompt-battle-webgame> .\ngrok.exe http 3000
Session Status: online
Account: tairqaldy@gmail.com (Plan: Free)
Forwarding: https://abc123def.ngrok-free.app -> http://localhost:3000
```

## Sharing Your Game

### With Friends
1. **Share the ngrok URL:** `https://abc123def.ngrok-free.app`
2. **Explain the game:** "It's a multiplayer AI prompt guessing game!"
3. **Create a room:** Host creates a room and shares the 6-character code
4. **Join and play:** Friends join using the room code

### For Demonstrations
1. **Prepare in advance:** Start server and ngrok before presentation
2. **Have backup:** Keep the ngrok URL ready to share
3. **Test first:** Verify everything works before showing others
4. **Explain features:** Highlight difficulty levels, scoring, and multiplayer aspects

## Alternative Hosting Options

If you want permanent hosting instead of ngrok:

1. **Heroku:** Free tier available, easy deployment
2. **Railway:** Modern platform, good free tier
3. **Vercel:** Great for frontend, can handle full-stack apps
4. **DigitalOcean:** More control, requires more setup

## Conclusion

ngrok is the perfect solution for quickly sharing your Prompt Battle WebGame with others. It's free, easy to use, and works immediately without any server setup. Perfect for testing, demonstrations, and sharing with friends!

Remember: Keep your game server running while using ngrok, and restart the tunnel if it expires. Happy gaming! 🎮
