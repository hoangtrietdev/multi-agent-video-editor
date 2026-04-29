import type { NextApiRequest, NextApiResponse } from "next";
import Groq from "groq-sdk";

interface OrchestrateRequest {
  narrativeTheme: string;
  voicePersona: string;
  primaryVision: string;
  mediaCount: number;
}

interface OrchestrateResponse {
  script: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrchestrateResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ script: "", error: "Method not allowed" });
  }

  const { narrativeTheme, voicePersona, primaryVision, mediaCount } =
    req.body as OrchestrateRequest;

  if (!primaryVision) {
    return res.status(400).json({ script: "", error: "primaryVision is required" });
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ script: "", error: "GROQ_API_KEY not configured — add it to .env.local" });
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are the Scripting Agent in an AI video production pipeline.
Your job is to write a compelling SHORT-FORM video script (≤ 60 seconds) based on:
- The user's vision
- The selected narrative theme
- The voice persona style

Return ONLY the script in this exact JSON format (no markdown, no explanation):
{
  "title": "Short catchy title",
  "hook": "Opening line that grabs attention in 3 seconds",
  "body": "3-5 scene descriptions with on-screen text overlays",
  "cta": "Closing call-to-action",
  "voiceNotes": "Tone/pacing instructions for the Audio Agent"
}`,
        },
        {
          role: "user",
          content: `Vision: "${primaryVision}"
Theme: ${narrativeTheme}
Voice Persona: ${voicePersona}
Media clips/photos available: ${mediaCount}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Try to parse JSON; if it fails return raw text
    let script: string;
    try {
      const parsed = JSON.parse(raw);
      script = JSON.stringify(parsed, null, 2);
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
