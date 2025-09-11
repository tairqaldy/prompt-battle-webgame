# Prompt Battle WebGame MVP

A web-based game where players compete to write prompts that match AI-generated images.

## Getting Started

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

That's it! The server will automatically create the SQLite database and serve the frontend.

## Project Structure

- `backend/` - Node.js Express server with SQLite database
- `frontend/` - Plain HTML, CSS, and JavaScript frontend
- `docs/` - Project documentation

## Tech Stack

- **Frontend:** Plain HTML5, CSS3, Vanilla JavaScript (ES modules)
- **Backend:** Node.js 18+, Express.js, better-sqlite3
- **Database:** SQLite (local file)
- **No frameworks, no build tools, no complexity**

## Development

- `npm start` - Run production server
- `npm run dev` - Run development server with auto-reload