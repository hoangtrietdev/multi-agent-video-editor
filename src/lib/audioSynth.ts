/**
 * audioSynth.ts
 * -------------
 * Generates a mood-appropriate generative music bed using the Web Audio API.
 * No external audio files required — everything is synthesised in-browser.
 *
 * Returns a MediaStream track that can be added to a canvas-capture stream
 * before handing it to MediaRecorder.
 */

export type MoodPreset = "cinematic" | "energetic" | "calm" | "inspirational" | "playful";

interface MoodConfig {
  /** Base BPM for arpeggio / rhythm pulses */
  bpm: number;
  /** Root note Hz for chord root */
  rootHz: number;
  /** Chord intervals (semitones above root) */
  chordIntervals: number[];
  /** Arp pattern intervals cycling over chord */
  arpIntervals: number[];
  /** Oscillator waveform for melody */
  waveform: OscillatorType;
  /** Pad waveform */
  padWave: OscillatorType;
  /** Master gain (0-1) */
  gain: number;
  /** Reverb wet mix (0-1) */
  reverb: number;
  /** Low-pass filter cutoff Hz */
  lpfHz: number;
}

const MOODS: Record<MoodPreset, MoodConfig> = {
  cinematic: {
    bpm: 60, rootHz: 110, chordIntervals: [0, 7, 12, 19],
    arpIntervals: [0, 12, 7, 19], waveform: "sine", padWave: "triangle",
    gain: 0.55, reverb: 0.65, lpfHz: 3200,
  },
  energetic: {
    bpm: 128, rootHz: 130.81, chordIntervals: [0, 4, 7, 11],
    arpIntervals: [0, 4, 7, 12, 7, 4], waveform: "sawtooth", padWave: "square",
    gain: 0.50, reverb: 0.25, lpfHz: 8000,
  },
  calm: {
    bpm: 52, rootHz: 98, chordIntervals: [0, 5, 9, 14],
    arpIntervals: [0, 9, 5, 14], waveform: "sine", padWave: "sine",
    gain: 0.45, reverb: 0.80, lpfHz: 2000,
  },
  inspirational: {
    bpm: 80, rootHz: 123.47, chordIntervals: [0, 4, 7, 12],
    arpIntervals: [0, 7, 4, 12, 7, 0], waveform: "triangle", padWave: "triangle",
    gain: 0.52, reverb: 0.55, lpfHz: 4500,
  },
  playful: {
    bpm: 110, rootHz: 261.63, chordIntervals: [0, 4, 7, 9],
    arpIntervals: [0, 4, 9, 7, 12, 4], waveform: "triangle", padWave: "sine",
    gain: 0.48, reverb: 0.35, lpfHz: 6000,
  },
};

/** Convert voicePersona / narrativeTheme strings to a MoodPreset */
export function resolveMood(voicePersona: string, narrativeTheme: string): MoodPreset {
  const key = (voicePersona + " " + narrativeTheme).toLowerCase();
  if (key.includes("energetic") || key.includes("action"))       return "energetic";
  if (key.includes("calm") || key.includes("smooth") || key.includes("documentary")) return "calm";
  if (key.includes("inspir"))                                    return "inspirational";
  if (key.includes("playful") || key.includes("comedy"))         return "playful";
  return "cinematic"; // default: Travel, Fashion, Romance, Cinematic
}

/** Semitone ratio */
const st = (n: number) => Math.pow(2, n / 12);

/**
 * Create a convolver reverb from synthesised impulse (no audio files).
 */
function makeReverb(ctx: AudioContext, seconds = 2.5, decay = 2): ConvolverNode {
  const rate   = ctx.sampleRate;
  const length = rate * seconds;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  const node = ctx.createConvolver();
  node.buffer = impulse;
  return node;
}

export interface AudioSynthHandle {
  /** The audio track to inject into MediaRecorder */
  track: MediaStreamTrack;
  /** Call this to stop all synthesis and release resources */
  stop: () => void;
}

/**
 * Start synthesising a generative music bed.
 * Returns a MediaStreamAudioTrack + a stop() handle.
 */
export function startAudioSynth(
  voicePersona: string,
  narrativeTheme: string,
): AudioSynthHandle {
  const mood   = resolveMood(voicePersona, narrativeTheme);
  const cfg    = MOODS[mood];
  const ctx    = new AudioContext();

  /* ── Master chain ── */
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(cfg.gain, ctx.currentTime + 2); // fade-in

  const lpf = ctx.createBiquadFilter();
  lpf.type            = "lowpass";
  lpf.frequency.value = cfg.lpfHz;
  lpf.Q.value         = 0.8;

  /* ── Reverb ── */
  const reverb    = makeReverb(ctx, 3, 2.5);
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = cfg.reverb;
  const dryGain   = ctx.createGain();
  dryGain.gain.value = 1 - cfg.reverb * 0.5;

  /* Routing: masterGain → lpf → dry → destination
                               → reverb → reverbGain → destination */
  masterGain.connect(lpf);
  lpf.connect(dryGain);
  lpf.connect(reverb);
  reverb.connect(reverbGain);

  /* ── MediaStream destination (captures audio for MediaRecorder) ── */
  const dest = ctx.createMediaStreamDestination();
  dryGain.connect(dest);
  reverbGain.connect(dest);

  /* ── Pad chords (slow-attack sustained tones) ── */
  const padNodes: OscillatorNode[] = [];
  cfg.chordIntervals.forEach((semi, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = cfg.padWave;
    osc.frequency.value = cfg.rootHz * st(semi);
    // slight detune per voice for width
    osc.detune.value = (i % 2 === 0 ? 1 : -1) * (i * 3);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18 / cfg.chordIntervals.length, ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    padNodes.push(osc);
  });

  /* ── Arpeggio melody ── */
  const beatSec  = 60 / cfg.bpm;
  const arpPat   = cfg.arpIntervals;
  let   arpStep  = 0;
  let   nextBeat = ctx.currentTime + beatSec;

  const arpNodes: OscillatorNode[] = [];

  const scheduleArp = () => {
    const semi  = arpPat[arpStep % arpPat.length];
    const freq  = cfg.rootHz * 2 * st(semi); // one octave up from pad
    const osc   = ctx.createOscillator();
    const env   = ctx.createGain();

    osc.type            = cfg.waveform;
    osc.frequency.value = freq;
    osc.detune.value    = Math.random() * 4 - 2; // tiny humanise

    const t0  = nextBeat;
    const dur = beatSec * 0.45;

    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.22, t0 + 0.01);
    env.gain.setTargetAtTime(0, t0 + dur * 0.4, dur * 0.3);

    osc.connect(env);
    env.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.2);
    arpNodes.push(osc);

    arpStep++;
    nextBeat += beatSec;
  };

  // Schedule ahead via setInterval
  const intervalId = setInterval(() => {
    const lookahead = ctx.currentTime + 0.2;
    while (nextBeat < lookahead) scheduleArp();
    // Trim the reference array periodically (nodes self-stop)
    if (arpNodes.length > 32) arpNodes.splice(0, 16);
  }, 50);

  /* ── Soft bass pulse ── */
  const bassInterval = setInterval(() => {
    const osc  = ctx.createOscillator();
    const env  = ctx.createGain();
    osc.type            = "sine";
    osc.frequency.value = cfg.rootHz * 0.5; // sub octave
    env.gain.setValueAtTime(0.3, ctx.currentTime);
    env.gain.setTargetAtTime(0, ctx.currentTime + 0.12, 0.08);
    osc.connect(env);
    env.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }, (60 / cfg.bpm) * 1000);

  const track = dest.stream.getAudioTracks()[0];

  const stop = () => {
    clearInterval(intervalId);
    clearInterval(bassInterval);
    // Fade out master
    masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    setTimeout(() => {
      padNodes.forEach(o => { try { o.stop(); } catch { /* */ } });
      ctx.close();
    }, 1500);
  };

  return { track, stop };
}
