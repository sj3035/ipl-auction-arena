/**
 * Auction sound effects using Web Audio API
 * No external files needed — all synthesized
 */

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.3) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

/** Short "click" for a bid placed */
export function playBidSound() {
  playTone(880, 0.1, "square", 0.15);
  setTimeout(() => playTone(1100, 0.08, "square", 0.12), 60);
}

/** Gavel hit — sold! */
export function playSoldSound() {
  playTone(440, 0.15, "triangle", 0.3);
  setTimeout(() => playTone(660, 0.12, "triangle", 0.25), 100);
  setTimeout(() => playTone(880, 0.3, "triangle", 0.35), 200);
}

/** Descending tone — unsold / skipped */
export function playUnsoldSound() {
  playTone(500, 0.15, "sawtooth", 0.12);
  setTimeout(() => playTone(350, 0.2, "sawtooth", 0.1), 120);
}

/** Dramatic fanfare for marquee player appearance */
export function playMarqueeSound() {
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, "triangle", 0.2), i * 120);
  });
}

/** Warning beep for timer ≤ 5s */
export function playTimerWarning() {
  playTone(1200, 0.08, "square", 0.1);
}

/** New player announced */
export function playNewPlayerSound() {
  playTone(660, 0.1, "sine", 0.15);
  setTimeout(() => playTone(880, 0.12, "sine", 0.15), 80);
}
