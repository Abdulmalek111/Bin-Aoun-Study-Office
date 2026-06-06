import { socketService } from './socket.service';

export interface VoicePeerConnection {
  socketId: string;
  peerConnection: RTCPeerConnection;
  audioElement: HTMLAudioElement;
  stream: MediaStream;
}

class VoiceService {
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, VoicePeerConnection>();
  
  // Callback handlers to notify hooks/components of stream and status updates
  private onLocalStreamChange: ((stream: MediaStream | null) => void) | null = null;
  private onPeersChange: ((peersList: string[]) => void) | null = null;
  private onRemoteStreamReceived: ((socketId: string, stream: MediaStream) => void) | null = null;

  // ICE Servers (Google Public STUN Servers)
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  registerCallbacks(
    onLocalStream: (stream: MediaStream | null) => void,
    onRemoteStream: (socketId: string, stream: MediaStream) => void,
    onPeers: (peers: string[]) => void
  ) {
    this.onLocalStreamChange = onLocalStream;
    this.onRemoteStreamReceived = onRemoteStream;
    this.onPeersChange = onPeers;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Capture user mic with WebRTC ideal constraints (echoCancellation, noiseSuppression, autoGainControl)
  async startLocalMic(): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      console.log('[VoiceService] Requesting mic access with professional constraints...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false
      });

      this.localStream = stream;
      if (this.onLocalStreamChange) this.onLocalStreamChange(stream);
      return stream;
    } catch (err: any) {
      console.error('[VoiceService] Microphone access denied/error:', err);
      let localizedError = 'خطأ غير معروف في الميكروفون.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        localizedError = 'تم رفض إذن الوصول للميكروفون. يرجى السماح للمتصفح بالوصول ثم المحاولة مجدداً.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        localizedError = 'لم يتم العثور على جهاز التقاط صوت (ميكروفون) متصل.';
      }
      throw new Error(localizedError);
    }
  }

  stopLocalMic() {
    if (this.localStream) {
      console.log('[VoiceService] Stopping local microphone tracks...');
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
      if (this.onLocalStreamChange) this.onLocalStreamChange(null);
    }
  }

  // Sync state functions for local Mute/Deafen behavior
  setMuteState(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      console.log(`[VoiceService] Local mic track set description enabled: ${!muted}`);
    }
  }

  setDeafenState(deafened: boolean) {
    // If deafened, mute all remote audio elements in mesh stream array
    this.peerConnections.forEach(pc => {
      pc.audioElement.volume = deafened ? 0 : 1;
    });
    console.log(`[VoiceService] Audio volume deafened toggle: ${deafened}`);
  }

  // High-performance clean connections setup
  async initiateOffer(targetSocketId: string) {
    if (this.peerConnections.has(targetSocketId)) {
      this.closePeerConnection(targetSocketId);
    }

    console.log(`[VoiceService] Creating RTCPeerConnection for outgoing offer to: ${targetSocketId}`);
    const pc = new RTCPeerConnection(this.rtcConfig);
    
    // Create matching audio DOM element
    const audio = new Audio();
    audio.autoplay = true;

    // Track state
    const remoteStream = new MediaStream();
    
    const wrapper: VoicePeerConnection = {
      socketId: targetSocketId,
      peerConnection: pc,
      audioElement: audio,
      stream: remoteStream
    };

    this.peerConnections.set(targetSocketId, wrapper);

    // Attach local track
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Ice Candidate sequence
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('webrtc-ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // Track received event
    pc.ontrack = (event) => {
      console.log(`[VoiceService] Received audio track from remote peer socket: ${targetSocketId}`);
      event.streams[0].getAudioTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
      audio.srcObject = remoteStream;
      if (this.onRemoteStreamReceived) {
        this.onRemoteStreamReceived(targetSocketId, remoteStream);
      }
    };

    // ICE gathering state diagnostics
    pc.oniceconnectionstatechange = () => {
      console.log(`[VoiceService] Connection state with ${targetSocketId} is: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        this.closePeerConnection(targetSocketId);
      }
    };

    // Create SDP Offer
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);
      
      socketService.emit('webrtc-offer', {
        targetSocketId,
        offer
      });
    } catch (err) {
      console.error(`[VoiceService] Failed to create or set local SDP offer for ${targetSocketId}:`, err);
    }

    if (this.onPeersChange) {
      this.onPeersChange(Array.from(this.peerConnections.keys()));
    }
  }

  // Handle incoming SDP Offer
  async handleIncomingOffer(fromSocketId: string, offer: RTCSessionDescriptionInit) {
    if (this.peerConnections.has(fromSocketId)) {
      this.closePeerConnection(fromSocketId);
    }

    console.log(`[VoiceService] Handling incoming offer from peer: ${fromSocketId}`);
    const pc = new RTCPeerConnection(this.rtcConfig);
    
    const audio = new Audio();
    audio.autoplay = true;

    const remoteStream = new MediaStream();

    const wrapper: VoicePeerConnection = {
      socketId: fromSocketId,
      peerConnection: pc,
      audioElement: audio,
      stream: remoteStream
    };

    this.peerConnections.set(fromSocketId, wrapper);

    // Add local mic track
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Ice Candidate callbacks
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('webrtc-ice-candidate', {
          targetSocketId: fromSocketId,
          candidate: event.candidate
        });
      }
    };

    // Track stream handler
    pc.ontrack = (event) => {
      console.log(`[VoiceService] Incoming stream track from peer: ${fromSocketId}`);
      event.streams[0].getAudioTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
      audio.srcObject = remoteStream;
      if (this.onRemoteStreamReceived) {
        this.onRemoteStreamReceived(fromSocketId, remoteStream);
      }
    };

    // Ice state logging
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        this.closePeerConnection(fromSocketId);
      }
    };

    // Set remote description and send answer
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.emit('webrtc-answer', {
        targetSocketId: fromSocketId,
        answer
      });
    } catch (err) {
      console.error(`[VoiceService] Error setting SDP answer for original offer from ${fromSocketId}:`, err);
    }

    if (this.onPeersChange) {
      this.onPeersChange(Array.from(this.peerConnections.keys()));
    }
  }

  // Handle incoming SDP Answer
  async handleIncomingAnswer(fromSocketId: string, answer: RTCSessionDescriptionInit) {
    const wrapper = this.peerConnections.get(fromSocketId);
    if (wrapper) {
      console.log(`[VoiceService] Setting remote SDP answer on existing connection: ${fromSocketId}`);
      try {
        await wrapper.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error(`[VoiceService] WebRTC error setting remote answer for ${fromSocketId}:`, err);
      }
    }
  }

  // Handle incoming Ice Candidate
  async handleIncomingIceCandidate(fromSocketId: string, candidate: RTCIceCandidateInit) {
    const wrapper = this.peerConnections.get(fromSocketId);
    if (wrapper) {
      try {
        await wrapper.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(`[VoiceService] WebRTC error adding remote ICE candidate for ${fromSocketId}:`, err);
      }
    }
  }

  // Tear down peer connection
  closePeerConnection(socketId: string) {
    const wrapper = this.peerConnections.get(socketId);
    if (wrapper) {
      console.log(`[VoiceService] Closing peer WebRTC connection with socket: ${socketId}`);
      try {
        wrapper.peerConnection.close();
        wrapper.audioElement.pause();
        wrapper.audioElement.srcObject = null;
        wrapper.audioElement.remove();
      } catch (e) {
        // Safe bypass
      }
      this.peerConnections.delete(socketId);
      
      if (this.onPeersChange) {
        this.onPeersChange(Array.from(this.peerConnections.keys()));
      }
    }
  }

  // Deep teardown of all resources on leaving room
  reset() {
    console.log('[VoiceService] Deep resetting Voice Engine. Closing all active links...');
    
    // Close all peers
    Array.from(this.peerConnections.keys()).forEach(socketId => {
      this.closePeerConnection(socketId);
    });

    this.peerConnections.clear();
    this.stopLocalMic();

    if (this.onPeersChange) this.onPeersChange([]);
  }
}

export const voiceService = new VoiceService();
