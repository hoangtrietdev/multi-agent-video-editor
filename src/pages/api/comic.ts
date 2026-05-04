import type { NextApiRequest, NextApiResponse } from "next";
import Groq from "groq-sdk";

interface ComicRequest {
  prompt: string;
  mediaCount: number;
}

const COMIC_SYSTEM = `You are a professional comic book writer and layout designer.
Your task is to create a comic book script based on the user's prompt.
You have a specific number of photos available to use as panels.
CRITICAL RULES:
1. Maximum 10 pages.
2. Each page can have between 1 to 4 panels.
3. The total number of panels across all pages MUST NOT exceed the provided mediaCount.
4. Each panel MUST have a unique, sequential "panelIndex" starting from 0 up to (mediaCount - 1).
5. Add dramatic or funny captions, and speech bubbles for the characters.

Return ONLY a valid JSON object matching this structure (no markdown, no backticks, no explanations):
{
  "title": "Epic Comic Title",
  "pages": [
    {
      "pageNumber": 1,
      "panels": [
        {
          "panelIndex": 0,
          "caption": "Meanwhile, in the city...",
          "speechBubble": "I have to save them!",
          "layoutStyle": "full-page"
        }
      ]
    }
  ]
}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, mediaCount } = req.body as ComicRequest;

  if (!prompt || mediaCount < 1) {
    return res.status(400).json({ error: "Missing prompt or media items." });
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "GROQ_API_KEY not configured" });
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: COMIC_SYSTEM },
        { role: "user", content: `Prompt: "${prompt}"\nTotal available photos: ${mediaCount}` },
      ],
      temperature: 0.75,
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const cleaned = jsonMatch ? jsonMatch[0] : raw;

    return res.status(200).json(JSON.parse(cleaned));
  } catch (err: any) {
    console.error("[api/comic]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
