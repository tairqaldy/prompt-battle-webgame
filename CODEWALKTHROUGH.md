# CODEWALKTHROUGH.md

## Overview

This document explains the Prompt Battle WebGame codebase at the **statement level**, grouped where appropriate, and shows how files call each other at runtime. It also highlights non-obvious decisions and guardrails (timers, scoring, validation).

---

## backend/server.js — HTTP, WebSocket, rooms & rounds

### Imports & singletons

1–6. `require('express')`, `http`, `socket.io`, `path` import core server libs; local modules `./db` (SQLite wrapper) and `./scoring` (scoring engine). These two encapsulate all persistence and prompt-similarity logic, keeping the server thin.&#x20;
8–16. Create `app`, back it with a raw `http` server, then wrap with `socket.io`, enabling CORS for all origins to simplify LAN/testing.&#x20;
18\. `PORT` resolves from env or defaults to `3000`.&#x20;

### Global middleware

21–22. Parse JSON bodies; 23–24. parse URL-encoded forms — required for simple REST endpoints used by the frontend to create rooms/kick players.&#x20;
27–36. Dev CORS headers for all methods/headers. The early `OPTIONS` return avoids preflight delays.&#x20;
39–43. Simple access log with ISO timestamp for traceability during playtests.&#x20;

### Static frontend

46–48. Compute `frontendPath` (`../frontend`) and serve it. This powers the single-page UI (index.html, css, client js).&#x20;

### In-memory game state (per room)

51–52. `gameRooms: Map` tracks room runtime (players, state, rounds, scores). `playerSockets: Map` maps DB player IDs → live sockets to target emits reliably. Server trusts DB for existence and uses memory for fast, transient state.&#x20;

### Helpers

55–62. `generateRoomCode()` makes a 6-char alnum room code; 64–66. `generateRoundId()` composes a unique ID with timestamp + random; 68–70. `validateRoomCode()` regex-checks `A–Z0–9{6}`; 72–74. `validatePlayerName()` enforces 1–20 chars; 76–78. `validatePromptText()` enforces 1–N chars (N from room settings). These validation gates protect DB and UX.&#x20;

### Socket lifecycle

81. `io.on('connection'…` logs the session; all game I/O flows through here.&#x20;

#### join-room

84–146. Validates inputs, checks room existence in DB (`dbManager.getRoom`), enforces unique player name and capacity (≤8), adds the player (`dbManager.addPlayer`), creates a per-room runtime if needed, stores `playerSockets` mapping, joins the socket.io room, and broadcasts both `player-joined` (to room) and `join-room-success` (to the new client). Host is implicitly the first `players[0]`.&#x20;

#### leave-room

148–182. Removes the player from DB and memory, cleans up empty rooms, emits `player-left` to others, drops socket mappings, and leaves the socket.io room. Prevents “ghosts” on disconnect/leave.&#x20;

#### get-final-results

184–200. Host-only UX affordance: returns cached `finalResults` when available; otherwise errors. Used after last-round screen before showing finals.&#x20;

#### start-game

202–258. Guards: room exists, ≥2 players, not already playing. Accepts host settings (rounds, timeLimit, characterLimit), resets state (`scores`, `roundCount`, etc.), initializes every player’s score to `0`, emits `game-started` with a clean scoreboard, then calls `startRound(roomCode)`. This is the authoritative reset point.&#x20;

#### next-round

260–279. Only if `gameState === 'waiting'` (post-results), calls `startRound(roomCode)` to continue. Prevents overlapping rounds.&#x20;

#### room-settings-changed

281–318. Only host may change live settings; updates runtime settings, emits `room-settings-updated` so clients re-render limits and dropdowns.&#x20;

#### submit-prompt (truncated in snippet, behavior inferred from client & DB)

Starts at 320+. Performs player validation, enforces character limit from room settings, inserts submission into DB (`dbManager.submitPrompt`), and emits `prompt-submitted` (used for UI to mark submitted players). Later, unsubmit support emits `prompt-unsubmitted`. At round end, server aggregates submissions, calls **scoring** module per player, persists `results`, updates cumulative scores, emits `round-ended`, and after last round emits `game-completed`. (Submit, scoring, and emits are corroborated by the client handlers in `game.js`.)

> **Note**: The file also defines an internal `startRound(roomCode)` utility (seen through calls). It selects an image+prompt, creates a `rounds` row via DB, sets timers, emits `round-started` (with difficulty metadata), and schedules a hard stop to compute scores. (Client expects `round-started`, `round-ended`, `game-completed`.)

---

## backend/scoring.js — deterministic scoring

### Normalization & tokenization

1–15. `normalizeText(text)` lowercases, strips punctuation to spaces, collapses whitespace — avoids spurious mismatches.&#x20;
18–26. `extractWords(text)` splits normalized text and returns **unique** tokens (Set) to compute unbiased overlaps.&#x20;

### Overlap analysis

29–55. `calculateWordOverlap(original, attempt)` produces `{ matched, missed, extra, originalCount, attemptCount, matchedCount }` to feed downstream scoring.&#x20;

### Semantic score

58–130. `calculateSemanticScore(original, attempt)` computes the core 0–100 score:

* Base: % of original words matched (×60).
* Penalty: small penalty for **extra** words (≤15 total).
* Length bonus: +5/+10 when lengths are similar.
* Short-circuit: exact/substring matches → 90–100.&#x20;

131–197. Adds **semantic category bonuses** using curated keyword sets (people, actions, objects, art styles, colors, settings, time/weather). For categories present in both original and attempt, adds up to +10 per category. This rescues near-misses where synonyms differ but concept overlap remains.&#x20;

199–226. **Word-order bonus**: detects consecutive word runs and adds up to +15, rewarding phrase fidelity without requiring an exact copy. (Helps with prompts that have important modifier ordering.)&#x20;

> The server calls this per submission, then applies difficulty multipliers and bonuses before emitting results. (See server’s round end path.)&#x20;

---

## backend/db.js — SQLite data access

### Construction & init

1–6. Import sqlite3 and path; class holds `db` and `initialized` flags to decouple instantiation from `init()`.&#x20;
8–26. `init()` opens DB file `prompt_battle.db` alongside code and runs migrations once. Logs success/failure.&#x20;

### Schema/migrations (run once)

28–95. Creates tables:

* **rooms**(code PK, createdAt)
* **players**(id PK, code FK, name)
* **rounds**(id PK, code FK, imagePath, sourcePrompt, timeLimit, createdAt, closedAt)
* **submissions**(id PK, roundId FK, playerName, promptText, createdAt)
* **results**(id PK, roundId FK, playerName, promptText, score, matched, missed)
  Executes each SQL; logs completion.&#x20;

### Room helpers

103–120. `createRoom(code, settings)` inserts; returns `{ lastInsertRowid, changes }`.
122–136. `getRoom(code)` fetches one; 138–152. `deleteRoom(code)` deletes.&#x20;

### Player helpers

156–171. `addPlayer(roomCode, playerName)`; 173–187. `getRoomPlayers(roomCode)`; 189–203. `removePlayer(playerId)`. These back the join/leave handlers.&#x20;

### Round & submission helpers

207–222. `createRound(roundId, code, imagePath, sourcePrompt, timeLimit)`; 224–238. `getRound(roundId)`; 240+ `closeRound(roundId)` (truncated). Remaining methods (implied) include `submitPrompt`, `getRoundSubmissions`, and `saveResult`. These are used in the submit/scoring paths.&#x20;

---

## backend/package.json — runtime & scripts

All standard: name/version, `main: server.js`, scripts `start` and `dev` (nodemon), deps `express`, `sqlite3`, `socket.io`, `csv-parser`, node ≥18. This matches server code imports.&#x20;

---

## frontend/index.html — screens and UI anchors

### Head

1–9. HTML5 doc, viewport, title, and link to `css/styles.css` (monochrome theme).&#x20;

### Lobby screen (`#lobby-screen`)

11–44. Title + subtitle; main menu buttons bound to global functions (`startDailyChallenge`, `showCreateRoom`, etc.). Two *form sections* (create/join) are initially hidden; they collect player name and optional room code. `Players Online` placeholder is available for future use.&#x20;

### Room screen (`#room-screen`)

46–89. Displays room code, players list, host/guest panels. Host panel exposes three **settings** selects (rounds, time per round, character limit), a **copy code** button, **Start Game** and **Leave Room**. Guest panel shows “Waiting for Host”. These map to functions in `game.js`.&#x20;

### Game screen (`#game-screen`)

91–163+. Header with **timer**, room/round indicators, and a **difficulty pill** (updated live). Body has **image**, **prompt textarea** with live character count, actions (**Submit / Unsubmit**), and a **live leaderboard** panel. Footer includes **Leave** and **Report Bug**. Hooks match `game.js` methods (submit, unsumbit, etc.).&#x20;

> Results and Final screens follow (truncated in snippet) showing per-round breakdown and final rankings that the server emits.&#x20;

---

## frontend/game.js — SPA controller & Socket.IO client

### Class & state

1–24. `PromptBattleGame` encapsulates the whole SPA: holds `socket`, connection flag, current screen, room/player info, current round, timers; also a **Daily Challenge** stub for solo play. Calls `init()`.&#x20;

### init & connect

26–45. `init()` connects sockets, registers DOM listeners, shows lobby.
47–115. `connectSocket()` creates `io()` client and subscribes to server events:

* connection lifecycle → update flags
* `error` → toast
* `player-joined` / `player-left` → update roster
* `join-room-success` → enter room screen
* `round-started` → store difficulty & start round UI
* `round-ended` → clear timers, show results
* `game-started` → reset final results cache and show fresh scores
* `game-completed` → stash finals (host later requests)
* `final-results` → render final standings
* `prompt-submitted` / `prompt-unsubmitted` → mark status
* `room-settings-updated` → immediately apply UI limits
  A 5s timeout rejects if the socket cannot connect cleanly.&#x20;

### DOM listeners

117–151. Enter-to-submit shortcuts for forms and **Ctrl+Enter** to submit a prompt quickly.&#x20;

### Screen router

153–165. `showScreen(name)` toggles `.screen.active`. All UI transitions go through this single point.&#x20;

### Lobby helpers

167–197. Toggle create/join panels.
199–236. **createRoom()** calls `POST /api/rooms` (host creates) then `joinRoomSocket` as **host**; on success shows “created” toast. (REST path is implemented server-side.)&#x20;
238–269. **joinRoom()** validates code/name then calls `joinRoomSocket`.&#x20;
271–310. **joinRoomSocket()** sets one-shot listeners for success/error, emits `join-room`, and times out after 5s — a robust handshake.&#x20;

### Room view

312–344. **updateRoomDisplay()** populates codes and toggles host/guest panels, then calls `updatePlayersList()`.&#x20;
346–379. **updateRoomSettings()** reads selects → caches `roomSettings`, applies them locally, and notifies server via `room-settings-changed`.
381–414. **applyRoomSettings()** updates labels and `maxLength` attributes for prompt inputs, and syncs dropdowns on guest clients.&#x20;
416–439. **copyRoomCode()** supports Clipboard API with a fallback textarea trick.&#x20;
441–454. **leaveGame()**: emits `leave-room`, resets state, returns to lobby.
456–466. **reportBug()**: placeholder alert.
468–487. **updatePlayersList()**: renders roster and host-only “kick” buttons.&#x20;
489–517. **startGame()**: requires ≥2 players, reads current settings, emits `start-game`. Server responds with `game-started` then `round-started`.&#x20;
519–540. **kickPlayer(id)**: calls `DELETE /api/rooms/:code/players/:id`; on 200, updates roster locally.&#x20;
542–551. **leaveRoom()** mirrors leaveGame for pre-start state.&#x20;

### Round UI

553–640+. **startRound(roundData)** swaps to game screen, shows a placeholder “loading image” panel, then sets the round image, difficulty badges, resets submission state, and starts an authoritative **timer**. On `round-ended`, it clears the interval to prevent ghost timers. (All the timer cleanup paths call `clearCurrentTimer()`.)&#x20;

> Additional methods (not fully visible in the snippet) include `submitPrompt()`, `unsumbitPrompt()`, `updateCharCount()`, `updateGameLeaderboard()`, `showResults()`, `updateFinalResults()`, `clearCurrentTimer()`, and helpers for difficulty display. All are wired by the event handlers above.&#x20;

---

## frontend/styles.css — monochrome UI, background art, and layout

1–9. Imports Geist fonts and defines a monochrome palette via CSS variables for consistent theming.&#x20;
15–36. Global resets and **body** background: a subtle gray overlay atop `/main-menu-background.png` (your generated Fontys R10 art), fixed to the viewport.&#x20;
38–76. Container and screen fade-in animation (used by `showScreen`).
78–128. Typography & subtitle styling.
130–153. **Main menu buttons** with hover elevation.
155–203. Forms and inputs with focus ring color.
205–256. Button variants (primary/secondary/success/danger/info) used across views.
258–392. **Room & game layouts**: cards with consistent borders/shadows; roster items; room settings grid; sticky game header with timer; difficulty badges (`difficulty-easy|medium|hard`) used by `game.js`.

> The rest of the file styles the image container, prompt area, leaderboard, results/final screens, and utility classes (omitted here for brevity).&#x20;

---

## tools/difficulty\_analyzer.js — offline difficulty tagging

1–23. Defines `DifficultyAnalyzer` with factor thresholds and weights for five signals (word count, complexity keywords, named entities, art styles, abstract concepts).&#x20;
49–122. `analyzePrompt(prompt)` scores each factor, computes a weighted sum, then maps to **easy/medium/hard** with post-heuristics (promotions when multiple complex factors present). It returns the assigned difficulty plus factor breakdown for UI hints.&#x20;
124–174+. Helper analyzers for complexity keywords, art styles, abstract concepts, and a rough **named entity** counter for capitalized tokens. Intended for a pre-processing script to curate the dataset and to surface difficulty info during play.&#x20;

---

## backend/start-game.bat — convenience launcher (Windows)

A small BAT script to start the backend locally; handy when sharing via ngrok. (File content not shown here, but referenced in repo root.)

---

## Call-graph & event flow

### High-level sequence (multiplayer)

1. **Host creates a room**

   * Frontend → `POST /api/rooms` → server creates DB row and returns code.&#x20;
   * Client emits `join-room` with `{ roomCode, playerName }` → server validates & persists → emits `player-joined` to room and `join-room-success` to the caller.

2. **Players join**

   * Same `join-room` flow; roster renders via `player-joined`.

3. **Host sets settings**

   * Client emits `room-settings-changed` → server verifies host → updates room runtime → emits `room-settings-updated` to everyone, which `game.js` applies immediately.

4. **Start game**

   * Host emits `start-game` → server resets state, initializes scores, emits `game-started`, then calls `startRound()`, which emits `round-started(image, difficulty, timeLimit)`. Client calls `startRound()` UI and starts a timer.

5. **Players submit**

   * Client emits `submit-prompt(roundId, promptText)` → server validates (length/name/room) → DB insert → emits `prompt-submitted(playerName)`. Client marks that player as “submitted”.

6. **Round ends**

   * Server closes submissions on timeout, fetches all entries, calls `scoring.calculateSemanticScore()` per player, persists results, updates cumulative `scores`, and emits `round-ended({ perPlayerBreakdown, newTotals })`. Client shows results and live leaderboard.

7. **Next rounds / final**

   * Host triggers `next-round` (or auto-advance) until `roundCount === totalRounds`. Server emits `game-completed(finalRankings)`; host can request `get-final-results` for the dedicated Final screen.

### REST surface used by the client

* `POST /api/rooms` → create room (host flow).&#x20;
* `DELETE /api/rooms/:code/players/:id` → kick player (host only).&#x20;
  *(Other endpoints exist server-side for rounds/submissions/results; the websocket covers most of the realtime loop.)*

---

## Notes & guardrails

* **Timer cleanup**: client calls `clearCurrentTimer()` on `round-ended` and `game-completed` to prevent “ghost timers” when screens change.&#x20;
* **Character limits**: sourced from room settings and enforced both client-side (`maxlength`) and server-side (`validatePromptText`).
* **Name collisions & capacity**: rejected on the server before admitting the player to the socket room.&#x20;
* **Explainable scoring**: overlap/missed/extra arrays enable per-word feedback in the results screen (which can show matched/missed tokens and reasoning).&#x20;

---

## Future tidy-ups/ideas

* Extract `startRound` and `endRound` into a small `gameEngine.js` to keep `server.js` slim.
* Add persistence for `finalResults` to allow late reconnection.
* Consider synonym lists (WordNet-like) or lightweight embeddings for better semantics, keeping determinism.
* Add unit tests for `scoring.js` categories and penalties.