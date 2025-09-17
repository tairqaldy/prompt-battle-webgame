# ngrok Reserved Domain Setup Guide

This guide will help you configure your Prompt Battle WebGame to always use the same ngrok domain: `abiotic-hypogynous-akilah.ngrok-free.app`

## Prerequisites

1. You have a reserved domain on ngrok: `abiotic-hypogynous-akilah.ngrok-free.app`
2. You have your ngrok authtoken ready
3. You have ngrok.exe in your project root

## Quick Setup (Recommended)

1. Run `start/start-game.bat`
2. Choose option `[5] Setup ngrok domain configuration`
3. Enter your reserved domain: `abiotic-hypogynous-akilah.ngrok-free.app`
4. Enter your ngrok authtoken
5. The script will create `ngrok.env` file automatically

## Manual Setup

If you prefer to set up manually:

1. **Create ngrok.env file** in your project root:
   ```
   # ngrok Configuration
   NGROK_AUTHTOKEN=your_actual_authtoken_here
   NGROK_DOMAIN=abiotic-hypogynous-akilah.ngrok-free.app
   ```

2. **Replace placeholders**:
   - Replace `your_actual_authtoken_here` with your real ngrok authtoken
   - The domain is already set to your reserved domain

## Usage

Once configured, your ngrok will always use the same domain:

### Option 1: Start Server + ngrok
- Run `start/start-game.bat`
- Choose `[2] Local + ngrok (public access)`
- Your game will be available at: `https://abiotic-hypogynous-akilah.ngrok-free.app`

### Option 2: ngrok Only (if server already running)
- Run `start/start-game.bat`
- Choose `[3] ngrok only (server already running)`
- Your game will be available at: `https://abiotic-hypogynous-akilah.ngrok-free.app`

## Security Features

✅ **ngrok.env is git-ignored** - Your authtoken won't be accidentally committed to GitHub
✅ **Template file provided** - `ngrok.env.example` shows the format without sensitive data
✅ **Error handling** - Script checks if configuration exists before starting

## Troubleshooting

### Error: "ngrok.env file not found!"
- Run option `[5] Setup ngrok domain configuration` in the start script
- Or manually create the `ngrok.env` file as shown above

### Error: "NGROK_DOMAIN not set in ngrok.env"
- Check that your `ngrok.env` file contains the `NGROK_DOMAIN=` line
- Make sure there are no extra spaces around the equals sign

### Domain not working
- Verify your reserved domain is active in ngrok dashboard
- Check that your authtoken is correct and has domain permissions
- Try running `ngrok.exe config add-authtoken YOUR_TOKEN` manually

## What Changed

The following files were updated to support reserved domains:

1. **start/start-game.bat** - Now reads domain from ngrok.env and uses `--domain` flag
2. **.gitignore** - Added `ngrok.env` to prevent accidental commits
3. **ngrok.env.example** - Template file for configuration

## Benefits

- ✅ Same URL every time you start the server
- ✅ No need to update links when restarting
- ✅ Professional, consistent domain for your game
- ✅ Secure configuration (not committed to git)
- ✅ Easy setup with guided script

Your game will now always be accessible at:
**https://abiotic-hypogynous-akilah.ngrok-free.app**
