import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Read the SIGNALING_SERVER_URL from env or default to current origin
    const serverUrl = (import.meta as any).env?.VITE_SIGNALING_SERVER_URL || window.location.origin;
    console.log(`[SocketService] Connecting to signaling backend: ${serverUrl}`);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: {
        token
      }
    });

    this.socket.on('connect', () => {
      console.log(`[SocketService] Socket connection opened successfully: ${this.socket?.id}`);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Socket connection error:', error);
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      console.log('[SocketService] Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[SocketService] Cannot emit event "${event}". Socket is disconnected.`);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
