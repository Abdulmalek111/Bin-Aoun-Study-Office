import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Read the SIGNALING_SERVER_URL from env or default to current origin
    const envUrl = (import.meta as any).env?.VITE_SIGNALING_SERVER_URL;
    let serverUrl = envUrl;
    
    if (!serverUrl) {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
      const isSandboxContainer = hostname.endsWith('.run.app');
      
      if (isLocal || isSandboxContainer) {
        serverUrl = window.location.origin;
      } else {
        // Fallback to the dedicated full-stack Cloud Run environment for socket signaling
        serverUrl = 'https://ais-pre-roeohboghpyrq4ykcwdvql-347858127241.europe-west2.run.app';
      }
    }

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

    this.queue = [];

    this.socket.on('connect', () => {
      console.log(`[SocketService] Socket connection opened successfully: ${this.socket?.id}`);
      this.flushQueue();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Socket connection error:', error);
    });

    return this.socket;
  }

  private queue: { event: string; data: any }[] = [];

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    this.queue = [];
    if (this.socket) {
      console.log('[SocketService] Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  safeEmit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[SocketService] Socket is disconnected. Queuing event "${event}"`);
      const nonSignalEvents = ['state-change', 'speaking', 'mute', 'unmute', 'deafen', 'undeafen', 'hand-raised'];
      if (nonSignalEvents.includes(event)) {
        this.queue = this.queue.filter(q => q.event !== event);
        this.queue.push({ event, data });
      }
    }
  }

  flushQueue() {
    if (!this.socket || !this.socket.connected || this.queue.length === 0) return;
    console.log(`[SocketService] Flushing ${this.queue.length} buffered events on reconnect...`);
    const toFlush = [...this.queue];
    this.queue = [];
    toFlush.forEach(item => {
      this.socket?.emit(item.event, item.data);
    });
  }

  emit(event: string, data: any) {
    this.safeEmit(event, data);
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
