export type Cue = 'breaking' | 'deal' | 'news';

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null;
  context ??= new window.AudioContext();
  return context;
}

// Each cue is a few short synthesized tones: no audio files to load.
const CUES: Record<Cue, { frequency: number; at: number; length: number; type: OscillatorType }[]> = {
  breaking: [
    { frequency: 880, at: 0, length: 0.12, type: 'square' },
    { frequency: 660, at: 0.14, length: 0.12, type: 'square' },
    { frequency: 880, at: 0.28, length: 0.22, type: 'square' },
  ],
  deal: [
    { frequency: 523, at: 0, length: 0.14, type: 'triangle' },
    { frequency: 659, at: 0.12, length: 0.14, type: 'triangle' },
    { frequency: 784, at: 0.24, length: 0.34, type: 'triangle' },
  ],
  news: [{ frequency: 1200, at: 0, length: 0.08, type: 'sine' }],
};

export function playCue(cue: Cue) {
  const ctx = audio();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);
  const start = ctx.currentTime;
  for (const tone of CUES[cue]) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.value = tone.frequency;
    gain.gain.setValueAtTime(0.0001, start + tone.at);
    gain.gain.exponentialRampToValueAtTime(0.08, start + tone.at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.at + tone.length);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start + tone.at);
    oscillator.stop(start + tone.at + tone.length + 0.05);
  }
}
