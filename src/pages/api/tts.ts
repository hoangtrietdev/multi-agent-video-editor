/**
 * /api/tts — Server-side TTS using macOS `say` (high quality, zero cost)
 * with Google Translate proxy as fallback.
 *
 * Gender is correctly preserved:
 *   - We list actually-installed voices with `say -v ?` before choosing one.
 *   - If the persona-specific voice isn't installed, we fall back to
 *     Samantha (F) / Alex (M) which are always present on macOS.
 *   - Google Translate TTS is used last-resort if `say` is unavailable
 *     (non-macOS deployment). NOTE: Google TTS doesn't support voice gender
 *     selection, so audio quality/gender may differ in that fallback.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { exec }                                 from "child_process";
import { tmpdir }                               from "os";
import { join }                                 from "path";
import { readFile, unlink, writeFile }          from "fs/promises";
import { promisify }                            from "util";

const execAsync = promisify(exec);

/* ── Persona + gender → preferred macOS voice ── */
const MAC_VOICE: Record<string, { male: string; female: string }> = {
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

/** Ordered preference lists — first available wins. Always-installed at top. */
const FEMALE_PREF = ["Samantha", "Victoria", "Ava", "Karen", "Tessa", "Moira"];
const MALE_PREF   = ["Alex", "Daniel", "Tom", "Fred", "Ralph", "Rishi"];

let cachedVoices: Set<string> | null = null;

/** Returns the set of voice names installed on this machine (lowercased). */
async function installedVoices(): Promise<Set<string>> {
  if (cachedVoices) return cachedVoices;
  try {
    const { stdout } = await execAsync("say -v ?");
    const voices = new Set<string>();
    for (const line of stdout.split("\n")) {
      const m = line.match(/^(\S+)/);
      if (m) voices.add(m[1].toLowerCase());
    }
    cachedVoices = voices;
    return voices;
  } catch {
    // `say` not available — return empty set
    return new Set();
  }
}

/**
 * Pick the best available macOS voice for the given persona + gender.
 * Falls back through the preference list until we find an installed one.
 */
async function chooseMacVoice(persona: string, gender: "male" | "female"): Promise<string | null> {
  const available = await installedVoices();
  if (available.size === 0) return null; // `say` not present

  // 1. Try persona-specific preferred voice
  const map       = MAC_VOICE[persona] ?? MAC_VOICE["Cinematic"];
  const preferred = gender === "female" ? map.female : map.male;
  if (available.has(preferred.toLowerCase())) return preferred;

  // 2. Walk the ordered preference list for this gender
  const list = gender === "female" ? FEMALE_PREF : MALE_PREF;
  for (const v of list) {
    if (available.has(v.toLowerCase())) return v;
  }

  return null; // no suitable voice found
}

/** Synthesise with `say -f textFile` → AIFF, convert to WAV via afconvert.
 *
 * IMPORTANT: We write the text to a temp file and use `say -f` instead of
 * passing text as a shell argument. This avoids ALL shell-escaping issues:
 *   - Single quotes (it's, I'm, you'll) → fatal inside bash single-quoted strings
 *   - Dollar signs, backticks, backslashes → all would be misinterpreted
 * Previously these caused `say` to fail silently, falling through to Google
 * TTS which always returns a female voice — the gender bug reported by user.
 */
async function sayTTS(text: string, voiceName: string): Promise<Buffer | null> {
  const stamp    = Date.now();
  const textFile = join(tmpdir(), `tts-text-${stamp}.txt`);
  const aiff     = join(tmpdir(), `tts-${stamp}.aiff`);
  const wav      = join(tmpdir(), `tts-${stamp}.wav`);

  try {
    // Write FULL text to file — say -f has no practical length limit
    await writeFile(textFile, text, "utf8");
    await execAsync(`say -v '${voiceName}' -o '${aiff}' -f '${textFile}'`);
    // LEI16 = Little-Endian 16-bit PCM WAV — universally browser-decodable
    await execAsync(`afconvert -f WAVE -d LEI16@22050 '${aiff}' '${wav}'`);
    return await readFile(wav);
  } catch (e) {
    console.warn("[tts/api] say failed:", (e as Error).message);
    return null;
  } finally {
    for (const f of [textFile, aiff, wav]) unlink(f).catch(() => {});
  }
}

/** Fetch from Google Translate TTS server-side — 200 char limit per request. */
async function googleTTS(text: string): Promise<Buffer | null> {
  // Google Translate TTS has ~200 char limit per call — send first segment only
  const q   = encodeURIComponent(text.slice(0, 200));
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${q}&tl=en&client=tw-ob&ttsspeed=0.88`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":          "audio/mpeg, audio/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer":         "https://translate.google.com/",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) { console.warn("[tts/api] Google TTS:", res.status); return null; }
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.warn("[tts/api] Google TTS failed:", (e as Error).message);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Handler                                                             */
/* ------------------------------------------------------------------ */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") { res.status(405).end("Method Not Allowed"); return; }

  const text    = (req.query.text    as string | undefined) ?? "";
  const persona = (req.query.persona as string | undefined) ?? "Cinematic";
  const gender  = ((req.query.gender as string | undefined) === "male" ? "male" : "female") as "male" | "female";

  if (!text.trim()) { res.status(400).json({ error: "text required" }); return; }

  /* ── Strategy 1: macOS `say` ── */
  const voiceName = await chooseMacVoice(persona, gender);
  if (voiceName) {
    const buf = await sayTTS(text, voiceName);
    if (buf) {
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", buf.length);
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("X-Voice", voiceName); // useful for debugging
      res.status(200).send(buf);
      return;
    }
  }

  /* ── Strategy 2: Google Translate TTS proxy ── */
  const mp3 = await googleTTS(text);
  if (mp3) {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", mp3.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(mp3);
    return;
  }

  /* ── Strategy 3: silent — client falls back to music-only ── */
  res.status(204).end();
}
