# API\_AND\_EVENTS.md

> Transport: **HTTP (REST)** for room management & admin actions; **Socket.IO** for realtime gameplay.
> Auth: none (MVP / LAN play). Rate-limits can be added at the reverse proxy if needed.

## Base URLs

* Local dev: `http://localhost:3000`
* Public (temporary): your ngrok tunnel, e.g. `https://<subdomain>.ngrok-free.app`

Content type: `application/json` unless noted.

---

## 1) REST API

### Create Room

`POST /api/rooms`

Create a new room and return its code. Host then joins via WebSocket.

**Request**

```json
{
  "hostName": "Tair",
  "rounds": 5,
  "timeLimitSec": 60,
  "characterLimit": 120
}
```

**Response 201**

```json
{
  "roomCode": "AB12CD",
  "settings": {
    "rounds": 5,
    "timeLimitSec": 60,
    "characterLimit": 120
  }
}
```

**Errors**

* `400` invalid body (e.g., name missing/too long)
* `500` server/database error

---

### Kick Player (host only)

`DELETE /api/rooms/:roomCode/players/:playerId`

Removes a player from DB and live room (if connected).

**Response 200**

```json
{ "ok": true, "kickedPlayerId": "p_93f1c7" }
```

**Errors**

* `403` not host / no permission
* `404` room or player not found

---

> **Note:** Most gameplay flows use WebSockets. Additional REST endpoints (such as `GET /api/rooms/:roomCode`) can be introduced for admin tools or monitoring, but are not required by the current client.

---

## 2) Socket.IO — Events & Contracts

### Connection

Client connects with the default `io()` initializer. No auth payload in MVP.

---

### Client → Server events

#### `join-room`

Join a room as a player (host or guest).

**Payload**

```json
{
  "roomCode": "AB12CD",
  "playerName": "Tair"
}
```

**Server emits on success**

* `join-room-success`
* `player-joined` (broadcast to others)

**Server emits on failure**

* `error` with a message string (invalid code, duplicate name, room full)

---

#### `leave-room`

Gracefully leave current room. Also auto-invoked on disconnect.

**Payload**

```json
{ "roomCode": "AB12CD" }
```

**Server emits**

* `player-left` (broadcast)

---

#### `room-settings-changed` (host only)

Update live settings before game start or between rounds.

**Payload**

```json
{
  "roomCode": "AB12CD",
  "settings": {
    "rounds": 5,
    "timeLimitSec": 60,
    "characterLimit": 120
  }
}
```

**Server emits**

* `room-settings-updated` (to all clients)

---

#### `start-game` (host only)

Start the match after players gathered.

**Payload**

```json
{
  "roomCode": "AB12CD",
  "settings": {
    "rounds": 5,
    "timeLimitSec": 60,
    "characterLimit": 120
  }
}
```

**Server emits (sequence)**

* `game-started` (initial zeroed scoreboard)
* `round-started` (first round payload, see below)

---

#### `submit-prompt`

Submit your attempt for the current round.

**Payload**

```json
{
  "roomCode": "AB12CD",
  "roundId": "r_1726731829123_7h",
  "promptText": "a retro 8-bit pixel art robot in a neon city at night"
}
```

**Server emits**

* `prompt-submitted` (broadcast with submitting player name)

**Notes**

* Character limit is enforced both client and server side.
* Resubmission may be blocked after the grace period (see server rules). If allowed, the latest valid submission counts.

---

#### `unsubmit-prompt` (optional UX)

Withdraw a submission before the round locks.

**Payload**

```json
{
  "roomCode": "AB12CD",
  "roundId": "r_1726731829123_7h"
}
```

**Server emits**

* `prompt-unsubmitted` (broadcast)

---

#### `next-round` (host only, when waiting on results)

Advance to the next round.

**Payload**

```json
{ "roomCode": "AB12CD" }
```

**Server emits**

* `round-started`

---

#### `get-final-results` (host → or anyone, after completion)

Return the computed final standings (cached).

**Payload**

```json
{ "roomCode": "AB12CD" }
```

**Server emits**

* `final-results`

---

### Server → Client events

#### `join-room-success`

Sent to the joining client only.

**Payload**

```json
{
  "roomCode": "AB12CD",
  "playerId": "p_93f1c7",
  "players": [
    { "id": "p_93f1c7", "name": "Tair" },
    { "id": "p_1a2b3c", "name": "Guest1" }
  ],
  "isHost": true,
  "settings": {
    "rounds": 5,
    "timeLimitSec": 60,
    "characterLimit": 120
  }
}
```

---

#### `player-joined`

Broadcast when any player joins.

**Payload**

```json
{
  "players": [
    { "id": "p_93f1c7", "name": "Tair" },
    { "id": "p_1a2b3c", "name": "Guest1" }
  ]
}
```

---

#### `player-left`

Broadcast when a player leaves or is disconnected.

**Payload**

```json
{
  "players": [
    { "id": "p_93f1c7", "name": "Tair" }
  ]
}
```

---

#### `room-settings-updated`

Live settings sync.

**Payload**

```json
{
  "settings": {
    "rounds": 5,
    "timeLimitSec": 60,
    "characterLimit": 120
  }
}
```

---

#### `game-started`

Start-of-match handshake (scores zeroed).

**Payload**

```json
{
  "scores": {
    "Tair": 0,
    "Guest1": 0
  },
  "roundIndex": 0,
  "totalRounds": 5
}
```

---

#### `round-started`

Server announces a new round.

**Payload**

```json
{
  "roundId": "r_1726731829123_7h",
  "roundIndex": 0,
  "totalRounds": 5,
  "image": {
    "url": "/assets/images/r_1726731829123.png",
    "alt": "AI generated scene"
  },
  "difficulty": "medium",
  "timeLimitSec": 60,
  "characterLimit": 120
}
```

**Client behavior**

* Switch to Game screen
* Start **single** countdown timer (cleared on `round-ended`)

---

#### `prompt-submitted`

A player submitted their attempt.

**Payload**

```json
{ "playerName": "Tair" }
```

---

#### `prompt-unsubmitted`

A player withdrew their attempt before lock.

**Payload**

```json
{ "playerName": "Tair" }
```

---

#### `round-ended`

Round is closed, server computed scores and updates totals.

**Payload**

```json
{
  "roundId": "r_1726731829123_7h",
  "perPlayer": [
    {
      "playerName": "Tair",
      "attempt": "a retro 8-bit pixel art robot...",
      "score": 78,
      "explain": {
        "matchedWords": ["retro","pixel","robot","city","night"],
        "missedWords": ["neon"],
        "extraWords": ["8-bit"],
        "categoryBonuses": ["art_style","setting","time"],
        "orderBonus": 10
      }
    },
    {
      "playerName": "Guest1",
      "attempt": "neon robot in cyberpunk city at night",
      "score": 84,
      "explain": { /* ... */ }
    }
  ],
  "totals": {
    "Tair": 78,
    "Guest1": 84
  }
}
```

**Client behavior**

* Clear the timer (avoid “ghost timers”)
* Show round results & updated leaderboard

---

#### `game-completed`

Match finished; a final ranking is available.

**Payload**

```json
{
  "final": [
    { "playerName": "Guest1", "total": 412, "rank": 1 },
    { "playerName": "Tair",   "total": 397, "rank": 2 }
  ]
}
```

---

#### `final-results`

Explicit response to `get-final-results` (same shape as above).

---

#### `error`

Generic operational error.

**Payload**

```json
{ "message": "Room not found or closed." }
```

---

## 3) State Machine (server-side, per room)

```
lobby
  ├─(start-game)→ playing
  │                 ├─(submit-prompt)* → submissions[…]
  │                 ├─(timeout or host-lock)→ scoring
  │                 └─(disconnects auto-handled)
  ├─ playing ──(round-ended)→ waiting
  ├─ waiting ──(next-round)→ playing
  └─ waiting ──(last round)→ completed
```

* **lobby**: players join/leave; host adjusts settings
* **playing**: one active round; submissions accepted until timeout
* **waiting**: results visible; can advance to next round
* **completed**: final rankings broadcast and cached

---

## 4) Validation Rules (server)

* **Room code**: `^[A-Z0-9]{6}$`
* **Player name**: 1–20 visible characters, unique per room
* **Prompt text**: 1–`characterLimit` chars
* **Capacity**: up to \~8 players per room (tunable)
* **Host-only**: `start-game`, `next-round`, `room-settings-changed`, kicking

---

## 5) Scoring Snapshot (for reference)

* Deterministic calculation combining:

  * Word overlap (matched/missed/extra)
  * Category bonuses (people/actions/objects/styles/colors/settings/time)
  * Length similarity bonus
  * Word-order bonus for consecutive runs
* Difficulty multiplier applied server-side
* Per-player explanation object returned in `round-ended`

---

## 6) Example Client Wiring (pseudo)

```js
const socket = io();

// join
socket.emit('join-room', { roomCode, playerName });

// listen
socket.on('round-started', (data) => startRoundUI(data));
socket.on('round-ended',   (data) => showResultsUI(data));
socket.on('game-completed',(data) => showFinalsUI(data));

// submit
function submit() {
  socket.emit('submit-prompt', { roomCode, roundId, promptText });
}
```

---

## 7) Error Handling & Retries

* All server errors use `error` with a human-readable `message`.
* Client should:

  * Show a toast/inline error
  * Disable re-submit after lock
  * Reconnect on transient socket disconnects and re-join room

---

## 8) Versioning

* API is **v0 (MVP)**; breaking changes will be noted in `CHANGELOG.md`.
* When auth lands, expect `io({ auth: { token }})` and room admin guards to change accordingly.