/**
 * WebSocket client for real-time multiplayer functionality
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomCode = null;
    this.playerId = null;
    this.eventHandlers = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io();
        
        this.socket.on('connect', () => {
          this.connected = true;
          console.log('Connected to server');
          resolve();
        });

        this.socket.on('disconnect', () => {
          this.connected = false;
          console.log('Disconnected from server');
        });

        this.socket.on('error', (error) => {
          console.error('Socket error:', error);
          this.emit('error', error);
        });

        this.socket.on('player-joined', (data) => {
          this.emit('player-joined', data);
        });

        this.socket.on('player-left', (data) => {
          this.emit('player-left', data);
        });

        this.socket.on('round-started', (data) => {
          this.emit('round-started', data);
        });

        this.socket.on('round-ended', (data) => {
          this.emit('round-ended', data);
        });

        this.socket.on('prompt-submitted', (data) => {
          this.emit('prompt-submitted', data);
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  joinRoom(roomCode, playerName) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('join-room', { roomCode, playerName }, (response) => {
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          this.roomCode = roomCode;
          this.playerId = response.player.id;
          resolve(response);
        }
      });
    });
  }

  leaveRoom() {
    if (this.connected && this.roomCode) {
      this.socket.emit('leave-room');
      this.roomCode = null;
      this.playerId = null;
    }
  }

  startGame() {
    if (this.connected && this.roomCode) {
      this.socket.emit('start-game', { roomCode: this.roomCode });
    }
  }

  submitPrompt(roundId, promptText) {
    if (this.connected) {
      this.socket.emit('submit-prompt', { roundId, promptText });
    }
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
}

// Create global instance
window.socketClient = new SocketClient();

// Auto-connect when page loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.socketClient.connect();
    console.log('Socket client connected');
  } catch (error) {
    console.error('Failed to connect socket client:', error);
  }
});
