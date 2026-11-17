class ChatSoundFx {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('wm_muted_v1') === '1';
    } catch {
      this.muted = false;
    }
  }

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('wm_muted_v1', this.muted ? '1' : '0');
    } catch {
      // ignore
    }
    return this.muted;
  }

  private ping(f1: number, f2: number, dur: number, vol = 0.06): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(f2, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  matched(): void {
    this.ping(523, 659, 0.12, 0.07);
    setTimeout(() => this.ping(659, 880, 0.18, 0.07), 100);
  }

  incoming(): void {
    this.ping(740, 880, 0.09, 0.05);
  }

  sent(): void {
    this.ping(480, 600, 0.06, 0.04);
  }
}

export const chatSound = new ChatSoundFx();
