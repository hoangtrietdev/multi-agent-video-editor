import type { NextApiRequest, NextApiResponse } from "next";
import Groq from "groq-sdk";

interface OrchestrateRequest {
  narrativeTheme: string;
  voicePersona: string;
  voiceGender: string;
  primaryVision: string;
  mediaCount: number;
  videoMode: "cinematic" | "memory";
}

interface OrchestrateResponse {
  script: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  System prompts                                                       */
/* ------------------------------------------------------------------ */

const CINEMATIC_SYSTEM = `You are a voiceover scriptwriter for short-form cinematic videos.
Write a natural, flowing narration script that will be spoken aloud by a voice actor over a photo slideshow.

CRITICAL RULES:
- NEVER use "Scene 1", "Scene 2", "Scene 3" or any scene labels — this is a voiceover, not a screenplay
- Write as continuous, spoken language — sentences that flow naturally when read aloud
- Each sentence in the body should paint one vivid visual moment (as if describing what's on screen)
- No bullet points, no numbered lists, no markdown
- Short punchy sentences work best for voiceover — max 15 words per sentence
- The hook grabs attention instantly. The body tells the story. The CTA inspires action.

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "title": "4-word video title",
  "hook": "One punchy sentence that grabs attention in 3 seconds. Max 12 words.",
  "body": "2 to 4 natural sentences of flowing narration. Each sentence describes one visual moment vividly. Write as if the voice is guiding the viewer through the images. Sentences separated by spaces, no labels.",
  "cta": "One warm closing sentence that inspires action or reflection. Max 12 words.",
  "voiceNotes": "One sentence describing the tone and pacing."
}`;

const MEMORY_SYSTEM = `You are a heartfelt voiceover writer for personal memory videos.
Write intimate, emotional narration that will be spoken aloud — as if a close friend is speaking directly to the person being celebrated.

CRITICAL RULES:
- NEVER use "Scene 1", "Scene 2", "Scene 3" or any scene labels
- Write as continuous, naturally-spoken sentences — warm, human, never robotic
- Use "you" and "we" to make it feel personal and direct
- Short, tender sentences that feel like real speech — max 15 words each
- Each sentence in the body should evoke one specific emotion or memory moment
- No marketing language, no clichés like "a journey", "cherish forever", "memories to last"
- Sound like a real human speaking softly, not an AI reading a template

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "title": "Tender 3-4 word title",
  "hook": "One line that immediately touches the heart. Speak directly to the person. Max 12 words.",
  "body": "3 to 5 short, tender sentences of flowing narration. Each one paints a real emotional moment — something specific, not generic. Write as if whispering to someone you love. Sentences separated by spaces, no labels.",
  "cta": "One closing sentence of love, gratitude or celebration. Personal and direct. Max 12 words.",
  "voiceNotes": "Gentle, slow, with pauses. Speak as if reading a letter."
}`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrchestrateResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ script: "", error: "Method not allowed" });
  }

  const { narrativeTheme, voicePersona, voiceGender, primaryVision, mediaCount, videoMode } =
    req.body as OrchestrateRequest;

  if (!primaryVision) {
    return res.status(400).json({ script: "", error: "primaryVision is required" });
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ script: "", error: "GROQ_API_KEY not configured — add it to .env.local" });
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const isMemory     = videoMode === "memory";
    const systemPrompt = isMemory ? MEMORY_SYSTEM : CINEMATIC_SYSTEM;

    const userContent = isMemory
      ? `Occasion: ${narrativeTheme}
Voice Style: ${voicePersona} (${voiceGender} voice)
User's message: "${primaryVision}"
Number of photos: ${mediaCount}

Write a narration that sounds like a real person speaking — warm, specific, human. No scene numbers.`
      : `Vision: "${primaryVision}"
Theme: ${narrativeTheme}
Voice Persona: ${voicePersona} (${voiceGender} voice)
Number of photos/clips: ${mediaCount}

Write a natural voiceover narration. No scene numbers or labels — just flowing sentences.`;

    const completion = await groq.chat.completions.create({
      model:    "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userContent  },
      ],
      temperature: isMemory ? 0.88 : 0.72,
      max_tokens:  700,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Extract JSON even if model wraps it in ```json``` fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const cleaned   = jsonMatch ? jsonMatch[0] : raw;

    let script: string;
    try {
      const parsed = JSON.parse(cleaned);
      script = JSON.stringify(parsed);
    } catch {
      script = raw;
    }

    return res.status(200).json({ script });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[orchestrate]", message);
    return res.status(500).json({ script: "", error: message });
  }
}
