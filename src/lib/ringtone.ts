let globalAudioCtx: AudioContext | null = null;
let ringtoneInterval: any = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  return globalAudioCtx;
}

export function unlockAudioEngine() {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(e => console.warn("Context resume failed:", e));
    }
    
    // Play an extremely brief, completely silent base64 wave to register successful user media play gesture
    const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
    silentAudio.volume = 0.01;
    silentAudio.play().then(() => {
      console.log("[Ringtone Engine] Autoplay system unblocked successfully.");
    }).catch(err => {
      console.warn("[Ringtone Engine] Silent autoplay unblock was passive:", err);
    });
  } catch (e) {
    console.warn("Manual audio unblock error:", e);
  }
}

export function playIncomingCallRingtone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    if (ringtoneInterval) {
      clearInterval(ringtoneInterval);
    }
    
    const playBeep = () => {
      try {
        if (!ctx) return;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        
        const now = ctx.currentTime;
        
        // Beautiful dual frequency ringing sound (440Hz + 480Hz) layered inside a repeating double pulse
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.frequency.setValueAtTime(440, now);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.frequency.setValueAtTime(480, now);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        // Define pulsed pattern:
        // Pulse 1: 0.0s to 0.4s
        gain1.gain.setValueAtTime(0, now);
        gain2.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain2.gain.linearRampToValueAtTime(0.08, now + 0.05);
        
        gain1.gain.setValueAtTime(0.12, now + 0.4);
        gain2.gain.setValueAtTime(0.08, now + 0.4);
        gain1.gain.linearRampToValueAtTime(0, now + 0.45);
        gain2.gain.linearRampToValueAtTime(0, now + 0.45);
        
        // Pulse 2: 0.6s to 1.0s
        gain1.gain.setValueAtTime(0, now + 0.6);
        gain2.gain.setValueAtTime(0, now + 0.6);
        gain1.gain.linearRampToValueAtTime(0.12, now + 0.65);
        gain2.gain.linearRampToValueAtTime(0.08, now + 0.65);
        
        gain1.gain.setValueAtTime(0.12, now + 1.0);
        gain2.gain.setValueAtTime(0.08, now + 1.0);
        gain1.gain.linearRampToValueAtTime(0, now + 1.05);
        gain2.gain.linearRampToValueAtTime(0, now + 1.05);
        
        osc1.start(now);
        osc2.start(now);
        
        osc1.stop(now + 1.25);
        osc2.stop(now + 1.25);
      } catch (err) {
        console.warn("Ringtone oscillation loop failed:", err);
      }
    };
    
    playBeep();
    ringtoneInterval = setInterval(playBeep, 2500);
  } catch (error) {
    console.warn("Failed starting call ringtone:", error);
  }
}

export function stopIncomingCallRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}
