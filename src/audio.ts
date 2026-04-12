import type { SoundDef, ThemeSounds } from './types';

/**
 * AudioManager plays sound events for the game. It supports two sound definitions:
 *   - { type: 'synth', freq, durationMs, wave, volume, slide } → Web Audio oscillator
 *   - { type: 'url',   src, volume }                            → HTMLAudioElement
 *
 * Browsers require a user gesture before audio can start. The manager lazily
 * constructs its AudioContext on the first play() call, so the first sound may
 * not fire (that's expected — any subsequent input will unlock audio).
 */
export type SoundEvent = keyof ThemeSounds;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sounds: ThemeSounds = {};
  private urlCache = new Map<string, HTMLAudioElement>();
  private muted = false;

  setSounds(sounds: ThemeSounds): void {
    this.sounds = sounds;
    this.urlCache.clear();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(event: SoundEvent): void {
    if (this.muted) return;
    const def = this.sounds[event];
    if (!def) return;

    if (def.type === 'synth') {
      this.playSynth(def);
    } else {
      this.playUrl(def);
    }
  }

  // ─── Synth playback ─────────────────────────────────────────────────────────

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor: typeof AudioContext | undefined =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playSynth(def: Extract<SoundDef, { type: 'synth' }>): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;

    // Resume if the context was suspended (browser autoplay policy).
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const dur = def.durationMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = def.wave ?? 'square';
    osc.frequency.setValueAtTime(def.freq, now);
    if (def.slide !== undefined) {
      osc.frequency.linearRampToValueAtTime(def.freq + def.slide, now + dur);
    }

    const vol = def.volume ?? 0.15;
    // Quick attack, linear decay — avoids clicks without needing envelopes.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.005);
    gain.gain.linearRampToValueAtTime(0, now + dur);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // ─── URL playback ───────────────────────────────────────────────────────────

  private playUrl(def: Extract<SoundDef, { type: 'url' }>): void {
    let audio = this.urlCache.get(def.src);
    if (!audio) {
      audio = new Audio(def.src);
      audio.preload = 'auto';
      this.urlCache.set(def.src, audio);
    }
    try {
      audio.currentTime = 0;
      audio.volume = def.volume ?? 1;
      void audio.play();
    } catch {
      /* ignore play failures (autoplay policy, decode errors) */
    }
  }
}
