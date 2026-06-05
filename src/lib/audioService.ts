// Custom synthesised audio cues using Web Audio API for responsive, high-performance sound notification alerts, without depending on external file requests or suffering sandboxed frame issues.
class AudioService {
  public static getVolume(): number {
    const vol = localStorage.getItem('bin_aoun_sound_volume');
    return vol !== null ? parseFloat(vol) : 0.5;
  }

  public static setVolume(val: number) {
    localStorage.setItem('bin_aoun_sound_volume', val.toString());
  }

  public static isSoundEnabled(key: string): boolean {
    const val = localStorage.getItem(key);
    return val !== 'false'; // default to true if null
  }

  public static setSoundEnabled(key: string, enabled: boolean) {
    localStorage.setItem(key, enabled ? 'true' : 'false');
  }

  private static getAudioContext(): AudioContext | null {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    return new AudioCtx();
  }

  public static playMessageSound() {
    if (!this.isSoundEnabled('bin_aoun_sound_alerts_enabled')) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const volume = this.getVolume();
      const destination = ctx.destination;

      // Note E6 then A6 (a pleasant electronic messaging sound)
      const playNote = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume * 0.15, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(time);
        osc.stop(time + duration);
      };

      const now = ctx.currentTime;
      playNote(now, 1046.50, 0.22); // C6
      playNote(now + 0.07, 1318.51, 0.35); // E6
    } catch (e) {
      console.warn("Audio Context playback failed or sandboxed: ", e);
    }
  }

  public static playExamStartSound() {
    if (!this.isSoundEnabled('bin_aoun_sound_exam_enabled')) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const volume = this.getVolume();
      const destination = ctx.destination;

      // Ascending C5 -> E5 -> G5 chime for educational exam launch!
      const playNote = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume * 0.20, time + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(time);
        osc.stop(time + duration);
      };

      const now = ctx.currentTime;
      playNote(now, 523.25, 0.32);      // C5
      playNote(now + 0.12, 659.25, 0.32); // E5
      playNote(now + 0.24, 783.99, 0.45); // G5
    } catch (e) {
      console.warn("Audio Context playback failed or sandboxed: ", e);
    }
  }
}

export default AudioService;
