/**
 * audioSynth.ts
 * -------------
 * Exports:
 *   renderMusicOffline  – pre-render generative music bed (OfflineAudioContext)
 *   fetchTTSAudio       – fetch persona voice via StreamElements free TTS API
 *   mixAudioOffline     – combine music + TTS into one AudioBuffer
 *   resolveVoice        – Web Speech API voice resolver (preview player only)
 */

/* ------------------------------------------------------------------ */
/*  Mood configs                                                        */
/* ------------------------------------------------------------------ */
export type MoodPreset =
  | "cinematic" | "energetic" | "calm"
  | "inspirational" | "playful" | "warm" | "nostalgic";

interface MoodConfig {
  bpm: number; rootHz: number;
  chordIntervals: number[]; arpIntervals: number[];
  waveform: OscillatorType; padWave: OscillatorType;
  gain: number; reverb: number; lpfHz: number;
}

const MOODS: Record<MoodPreset, MoodConfig> = {
  cinematic:     { bpm:60,  rootHz:110,    chordIntervals:[0,7,12,19],   arpIntervals:[0,12,7,19],      waveform:"sine",     padWave:"triangle", gain:0.38, reverb:0.65, lpfHz:3200 },
  energetic:     { bpm:128, rootHz:130.81, chordIntervals:[0,4,7,11],    arpIntervals:[0,4,7,12,7,4],   waveform:"sawtooth", padWave:"square",   gain:0.36, reverb:0.25, lpfHz:8000 },
  calm:          { bpm:52,  rootHz:98,     chordIntervals:[0,5,9,14],    arpIntervals:[0,9,5,14],       waveform:"sine",     padWave:"sine",     gain:0.33, reverb:0.80, lpfHz:2000 },
  inspirational: { bpm:80,  rootHz:123.47, chordIntervals:[0,4,7,12],    arpIntervals:[0,7,4,12,7,0],   waveform:"triangle", padWave:"triangle", gain:0.36, reverb:0.55, lpfHz:4500 },
  playful:       { bpm:110, rootHz:261.63, chordIntervals:[0,4,7,9],     arpIntervals:[0,4,9,7,12,4],   waveform:"triangle", padWave:"sine",     gain:0.35, reverb:0.35, lpfHz:6000 },
  warm:          { bpm:56,  rootHz:116.54, chordIntervals:[0,4,7,12,16], arpIntervals:[0,7,12,16,12,7], waveform:"sine",     padWave:"triangle", gain:0.30, reverb:0.75, lpfHz:2800 },
  nostalgic:     { bpm:58,  rootHz:110,    chordIntervals:[0,3,7,12],    arpIntervals:[0,12,7,3],       waveform:"sine",     padWave:"sine",     gain:0.32, reverb:0.82, lpfHz:2400 },
};

const st = (n: number) => Math.pow(2, n / 12);

export function resolveMood(voicePersona: string, narrativeTheme: string): MoodPreset {
  const k = (voicePersona + " " + narrativeTheme).toLowerCase();
  if (k.includes("energetic") || k.includes("action"))   return "energetic";
  if (k.includes("calm") || k.includes("smooth"))        return "calm";
  if (k.includes("inspir"))                              return "inspirational";
  if (k.includes("playful") || k.includes("comedy"))     return "playful";
  if (k.includes("warm") || k.includes("loving") || k.includes("gentle") ||
      k.includes("anniversary") || k.includes("birthday") ||
      k.includes("wedding") || k.includes("family") || k.includes("joyful")) return "warm";
  if (k.includes("nostalgic") || k.includes("emotional")) return "nostalgic";
  return "cinematic";
}

/* ------------------------------------------------------------------ */
/*  Offline music synthesis                                             */
/* ------------------------------------------------------------------ */

function makeReverbBuf(sr: number): AudioBuffer {
  const len = Math.ceil(sr * 2.8);
  const buf = new AudioBuffer({ numberOfChannels: 2, length: len, sampleRate: sr });
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  }
  return buf;
}

function scheduleMusicInContext(
  ctx: BaseAudioContext,
  output: AudioNode,
  cfg: MoodConfig,
  durSec: number,
  t0 = 0,
) {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.001, t0);
  master.gain.exponentialRampToValueAtTime(cfg.gain, t0 + 2.5);
  if (durSec > 3) {
    master.gain.setValueAtTime(cfg.gain, t0 + durSec - 1.5);
    master.gain.linearRampToValueAtTime(0, t0 + durSec);
  }

  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass"; lpf.frequency.value = cfg.lpfHz; lpf.Q.value = 0.8;

  const reverb = ctx.createConvolver();
  reverb.buffer = makeReverbBuf(ctx.sampleRate);
  const rvbG = ctx.createGain(); rvbG.gain.value = cfg.reverb;
  const dryG = ctx.createGain(); dryG.gain.value = 1 - cfg.reverb * 0.4;

  master.connect(lpf);
  lpf.connect(dryG); dryG.connect(output);
  lpf.connect(reverb); reverb.connect(rvbG); rvbG.connect(output);

  // Pads
  cfg.chordIntervals.forEach((semi, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = cfg.padWave; o.frequency.value = cfg.rootHz * st(semi);
    o.detune.value = (i % 2 === 0 ? 1 : -1) * (i * 3);
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(0.20 / cfg.chordIntervals.length, t0 + 1.5);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + durSec);
  });

  // Arp
  const bs = 60 / cfg.bpm;
  let step = 0, t = t0 + bs;
  while (t < t0 + durSec) {
    const semi = cfg.arpIntervals[step % cfg.arpIntervals.length];
    const o = ctx.createOscillator(), e = ctx.createGain();
    o.type = cfg.waveform; o.frequency.value = cfg.rootHz * 2 * st(semi);
    o.detune.value = Math.random() * 4 - 2;
    const dur = bs * 0.45;
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.22, t + 0.01);
    e.gain.setTargetAtTime(0, t + dur * 0.4, dur * 0.3);
    o.connect(e); e.connect(master); o.start(t); o.stop(t + dur + 0.2);
    step++; t += bs;
  }

  // Bass
  let bt = t0;
  while (bt < t0 + durSec) {
    const o = ctx.createOscillator(), e = ctx.createGain();
    o.type = "sine"; o.frequency.value = cfg.rootHz * 0.5;
    e.gain.setValueAtTime(0.28, bt); e.gain.setTargetAtTime(0, bt + 0.12, 0.08);
    o.connect(e); e.connect(master); o.start(bt); o.stop(bt + 0.4);
    bt += bs;
  }
}

/** Pre-render music bed to AudioBuffer (no user-gesture needed). */
export async function renderMusicOffline(
  voicePersona: string,
  narrativeTheme: string,
  durationSec: number,
): Promise<AudioBuffer> {
  const SR  = 44100;
  const cfg = MOODS[resolveMood(voicePersona, narrativeTheme)];
  const off = new OfflineAudioContext(2, Math.ceil(SR * (durationSec + 1)), SR);
  scheduleMusicInContext(off, off.destination, cfg, durationSec, 0);
  return off.startRendering();
}

/* ------------------------------------------------------------------ */
/*  StreamElements TTS — free, no API key, returns MP3                  */
/* ------------------------------------------------------------------ */

/** Persona + gender → macOS voice name (kept in sync with /api/tts) */
const SE_VOICE: Record<string, { male: string; female: string }> = {
  "Cinematic":     { male: "Daniel",   female: "Samantha" },
  "Energetic":     { male: "Tom",      female: "Karen"    },
  "Calm & Smooth": { male: "Alex",     female: "Ava"      },
  "Inspirational": { male: "Daniel",   female: "Samantha" },
  "Playful":       { male: "Tom",      female: "Tessa"    },
  "Warm & Loving": { male: "Alex",     female: "Samantha" },
  "Emotional":     { male: "Daniel",   female: "Samantha" },
  "Gentle":        { male: "Alex",     female: "Ava"      },
  "Joyful":        { male: "Tom",      female: "Karen"    },
  "Nostalgic":     { male: "Alex",     female: "Samantha" },
};

/**
 * Fetch TTS audio from our /api/tts Next.js route.
 * The server uses macOS `say` (high quality) or Google Translate TTS as fallback.
 * Returns ArrayBuffer or null if voice is unavailable.
 */
export async function fetchTTSAudio(
  text: string,
  voicePersona: string,
  voiceGender: "male" | "female",
): Promise<ArrayBuffer | null> {
  try {
    const params = new URLSearchParams({
      text:    text.trim(),   // NO truncation — full narration must be spoken for correct video duration
      persona: voicePersona,
      gender:  voiceGender,
    });
    const res = await fetch(`/api/tts?${params}`, {
      signal: AbortSignal.timeout(20_000),
    });
    // 204 = server chose silent fallback
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`/api/tts ${res.status}`);
    return await res.arrayBuffer();
  } catch (e) {
    console.warn("[TTS] fetch failed — video will have music only:", e);
    return null;
  }
}

/**
 * Mix music AudioBuffer + TTS AudioBuffer into one combined AudioBuffer.
 * Both are rendered offline — no user gesture needed.
 *
 * @param musicBuf     Pre-rendered music from renderMusicOffline()
 * @param ttsBuf       Decoded TTS audio (or null → music only)
 * @param durationSec  Target video duration
 */
export async function mixAudioOffline(
  musicBuf: AudioBuffer,
  ttsBuf: AudioBuffer | null,
  durationSec: number,
): Promise<AudioBuffer> {
  const SR      = 44100;
  const samples = Math.ceil(SR * durationSec);
  const mixCtx  = new OfflineAudioContext(2, samples, SR);

  // Music at reduced gain so voice can be heard clearly
  const musicSrc  = mixCtx.createBufferSource();
  musicSrc.buffer = musicBuf;
  const musicGain = mixCtx.createGain();
  // If TTS present → duck music to 35%; otherwise full volume
  musicGain.gain.value = ttsBuf ? 0.35 : 1.0;
  musicSrc.connect(musicGain);
  musicGain.connect(mixCtx.destination);
  musicSrc.start(0);

  if (ttsBuf) {
    const ttsSrc  = mixCtx.createBufferSource();
    ttsSrc.buffer = ttsBuf;
    const ttsGain = mixCtx.createGain();
    ttsGain.gain.value = 0.92;
    ttsSrc.connect(ttsGain);
    ttsGain.connect(mixCtx.destination);
    // Small delay so music fades in first
    ttsSrc.start(0.8);
  }

  return mixCtx.startRendering();
}

/* ------------------------------------------------------------------ */
/*  TTS voice resolver for preview player (Web Speech API)             */
/* ------------------------------------------------------------------ */
export function resolveVoice(gender: "male" | "female"): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const en     = voices.filter((v) => v.lang.startsWith("en"));
      if (en.length === 0) { resolve(null); return; }
      const female = ["samantha","ava","karen","moira","tessa","victoria","alice","nora","zira","kate"];
      const male   = ["daniel","tom","james","aaron","ralph","rishi","alex","david","mark"];
      const kw     = gender === "female" ? female : male;
      resolve(en.find((v) => kw.some((k) => v.name.toLowerCase().includes(k))) ?? en[0]);
    };
    if (window.speechSynthesis.getVoices().length > 0) { pick(); }
    else {
      window.speechSynthesis.addEventListener("voiceschanged", pick, { once: true });
      setTimeout(pick, 1500);
    }
  });
}
