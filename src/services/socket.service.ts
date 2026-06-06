import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private queue: { event: string; data: any }[] = [];

  connect(token?: string): Socket {
    // If socket exists and is already connected, simply update token if provided and return
    if (this.socket) {
      if (token) {
        console.log('[SocketService] Updating Firebase ID Token on existing socket instance');
        this.socket.auth = { ...this.socket.auth, token };
      }
      if (this.socket.disconnected) {
        console.log('[SocketService] Socket client present but offline, reconnecting...');
        this.socket.connect();
      }
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

    console.log(`[SocketService] Initializing connection to signaling backend: ${serverUrl}`);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      auth: {
        token
      }
    });

    this.queue = [];

    this.socket.on('connect', () => {
      console.log(`[SocketService] Socket connection opened successfully with SID: ${this.socket?.id}`);
      this.flushQueue();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Socket handshake transport/authorization breakdown:', error);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`[SocketService] Reconnection attempt #${attempt} underway...`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[SocketService] Socket reconnection exhausted maximum retries. Link failed.');
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    this.queue = [];
    if (this.socket) {
      console.log('[SocketService] Cleaning up listeners and disconnecting socket connection...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  safeEmit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[SocketService] Socket offline. Queuing event "${event}" to dispatch on connection recovery...`);
      const bufferableEvents = ['state-change', 'speaking', 'mute', 'unmute', 'deafen', 'undeafen', 'hand-raised', 'leave-room'];
      if (bufferableEvents.includes(event)) {
        // Debounce subsequent updates of the same event type to keep dispatch minimal
        this.queue = this.queue.filter(q => q.event !== event);
        this.queue.push({ event, data });
      }
    }
  }

  flushQueue() {
    if (!this.socket || !this.socket.connected || this.queue.length === 0) return;
    console.log(`[SocketService] Transmitting ${this.queue.length} buffered changes to matching channel descriptors...`);
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
