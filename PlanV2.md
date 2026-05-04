# Orchestra AI — Architecture & Research Plan

## 1. The Core Product Insight

> **Most people have hundreds of unused photos.** Orchestra AI transforms them into shareable videos in under 60 seconds — no editing skills needed.

This is the "photo reuse" problem: the average smartphone user has **4,000–6,000 photos** but shares fewer than 5%. Orchestra AI is the activation layer between the archive and social sharing.

---

## 2. AI Model Allocation Plan

### Philosophy: "Respond Fast, Think Deep"

Run a **lightweight model first** for instant UX feedback, then a **powerful model** for quality content — in parallel when possible.

```
User uploads photos
        │
        ▼
┌───────────────────────────────────────────┐
│  ON-DEVICE  (browser / WebAssembly)       │  ~50–200ms, zero cost
│  • EXIF extraction (date, GPS, camera)    │
│  • Face presence detection (MediaPipe)    │
│  • Scene tag (MobileNet, TF.js)           │
│  • Image quality score (blur, exposure)   │
│  • k-means cluster by date/location       │
└────────────────┬──────────────────────────┘
                 │  Metadata JSON only (not raw images)
                 ▼
┌───────────────────────────────────────────┐
│  FAST TIER — Groq LPU                     │  ~0.5–1.5s
│  • Script draft: llama-3.3-70b-versatile  │  ← already in use
│  • Mood/theme suggestion                  │
│  • Caption generation                     │
│  → Show draft to user immediately         │
└────────────────┬──────────────────────────┘
                 │  async, in background
                 ▼
┌───────────────────────────────────────────┐
│  QUALITY TIER — Groq 70B / GPT-4o         │  ~2–5s
│  • Richer narrative rewrite               │
│  • Emotional arc (hook→body→cta)          │
│  • Memory Mode: personal tone             │
│  → Replace draft when ready               │
└────────────────┬──────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────────┐
│  RENDER TIER — Client-side                │  Real-time, parallel with quality tier
│  • TTS: macOS `say` / ElevenLabs          │
│  • Music: OfflineAudioContext             │
│  • Video: Canvas + MediaRecorder          │
└───────────────────────────────────────────┘
```

---

## 3. Current State vs Target State

| Step | Current (MVP) | Target (V2) |
|---|---|---|
| Vision analysis | None | MediaPipe on-device |
| Script generation | Groq llama-3.1-8b | 8B → 70B cascade |
| TTS | macOS `say` (local only) | ElevenLabs (cloud) |
| Music | Web Audio API synthesis | Licensed AI music (Suno API) |
| Video render | Canvas + MediaRecorder | Same (already good) |
| Orchestration | Sequential | Parallel (quality + render concurrent) |

---

## 4. Should You Change from Groq?

**Short answer: No — improve the prompt, not the model.**

Groq's LPU hardware is already 5–10× faster than GPU-based services for the same model size. The current script quality issue is a **prompt engineering problem**, not a model capacity problem.

### Recommended changes for better MVP content:

```typescript
// Current system prompt (likely too generic)
"Generate a video script with hook, body, and CTA."

// Improved — structured, persona-aware, emotional arc
`You are a ${mode === 'memory' ? 'heartfelt storyteller' : 'cinematic director'}.
Write a video script for ${imageCount} photos about: "${vision}".

STRUCTURE:
- hook: 1 punchy sentence that hooks attention in 3 seconds (max 12 words)
- body: ${imageCount - 2} vivid scene descriptions, each 8–10 words, 
  starting with a strong visual verb (gleaming, rushing, laughing...)
- cta: 1 warm call to action (max 10 words)
- title: 4-word video title
- mood: single word (joyful/bittersweet/epic/tender/nostalgic)

TONE: ${isMemory ? 'warm, intimate, deeply human — write as if reading to the person' : 'cinematic, aspirational, present tense'}
Output ONLY valid JSON.`
```

### If you want a cascade (for quality improvement):

```
Groq 8B  → instant draft shown to user  (< 1s)
     ↓ async
Groq 70B → improved version swaps in    (< 3s)
```

Cost: Groq 70B is ~$0.0008/1K tokens — still extremely cheap.

---

## 5. Performance Metrics to Measure

These are the numbers you need for the paper:

### 5.1 Pipeline Latency Breakdown

| Phase | Target | How to measure |
|---|---|---|
| Image upload + compression | < 500ms | `performance.now()` around upload handler |
| Script generation (Groq) | < 1.5s | TTFT + completion time from API |
| TTS fetch (`/api/tts`) | < 3s | `performance.now()` in `fetchTTSAudio` |
| Music offline render | < 0.5s | `OfflineAudioContext.startRendering()` timing |
| Audio mix | < 200ms | Same |
| Video render | = audio duration | Real-time (1:1 with canvas loop) |
| **Total time to playable video** | **< 15s** | From "Generate" click to `<video>` play |

### 5.2 Photo Reuse Coefficient (PRC)

```
PRC = (videos_created_from_existing_photos) / (total_photos_in_library)

Example: User has 500 photos → creates 3 videos using 15 photos each
PRC = 45 / 500 = 0.09  (9% reuse rate per session)

Lifetime PRC (after 10 sessions) = 30%  (target)
```

**Why this matters for the paper**: PRC is your core value proposition metric. It shows Orchestra AI converts passive photo archives into active content. Compare against:
- Manual video editing: PRC ≈ 1–3% (too time-consuming)
- Story/Reels apps: PRC ≈ 5–8%  
- Orchestra AI target: PRC ≈ 15–30% per month

### 5.3 Content Quality Metrics

| Metric | Measurement method |
|---|---|
| Script engagement score | Human eval: 1–5 on emotion, clarity, hook strength |
| Video completion rate | Track via `video.ontimeupdate` → did user watch to end? |
| Share rate | navigator.share() success / total saves |
| Mode preference | Memory Mode vs Cinematic selection ratio |

---

## 6. Competitor Analysis & Market Comparison

To position Orchestra AI effectively in the market (and for the research paper), we must compare it against existing paradigms across three key axes: **Time to Generation**, **Content Quality**, and **AI Utilization**.

### 6.1 Feature & Performance Matrix

| Product / Platform | Primary Focus | Time to Generate | Content Quality & Narrative | AI Utilization Focus | Performance (Client vs Cloud) |
|---|---|---|---|---|---|
| **Google Photos / Apple Memories** | Passive Archive | Instant (Pre-computed) | Low (Algorithmic slideshows, no custom narration, generic music) | Face recognition, simple clustering | 100% On-device / Background |
| **CapCut AI / TikTok AutoCut** | Active Editing | 1–3 mins (High friction) | Medium/High (Trendy transitions, but lacks deep emotional storytelling) | Beat-syncing, auto-captions | Hybrid (Heavy client-side editing + Cloud assets) |
| **Runway Gen-2 / Sora / Pika** | Generative AI | 2–5+ mins | High (Generates pixels from scratch, hallucinates, no personal connection) | Heavy Diffusion Models (Text-to-Video) | 100% Cloud (Extremely expensive & slow) |
| **Orchestra AI (Current MVP)** | **Photo Re-activation** | **< 15 seconds** | **High** (Dynamic Ken Burns, personalized Groq LPU script, macOS TTS) | **Narrative Intelligence** (Fast LLM Scripting + TTS) | **Hybrid** (Cloud LLM + 100% Client-side video render) |
| **Orchestra AI (Final V2)** | **Photo Re-activation** | **< 10 seconds** | **Studio Grade** (ElevenLabs/Bark TTS, MediaPipe vision-driven pacing) | **Multi-Agent Orchestration** (Vision + Script + Audio in parallel) | **Optimized Hybrid** (WebAssembly/WebGPU Render + Cloud Agents) |

### 6.2 Orchestra AI: MVP vs. Final (V2) Evolution

| Metric | Current MVP | Final V2 Target |
|---|---|---|
| **Audio Quality** | Standard macOS local TTS (`say`), basic tone | ElevenLabs / PlayHT cloud TTS with deep emotional prosody |
| **Visual Analysis** | Simple metadata / EXIF | MediaPipe/Gemini Nano on-device visual analysis (facial expressions) |
| **Render Speed** | Sequential (Script → Audio → Render): ~15s | Parallel Orchestration (Audio generating while rendering): < 10s |
| **Visual Effects** | Standard cross-fade + Ken Burns | Beat-synced transitions driven by audio waveform analysis |
| **Scalability** | Relies on local Mac environment for TTS | Fully dockerized/cloud-ready audio pipeline |

---

## 7. Research Paper Structure

### Proposed Title
**"Orchestra AI: A Multi-Agent Pipeline for Personalized Video Generation from Personal Photo Archives"**

### Abstract Points
- Problem: The "Digital Hoarding" phenomenon. Research indicates the average user stores ~2,795 photos, yet 75% to 80% of these photos are never viewed again, and over 50% of users do nothing with the media they capture.
- Solution: End-to-end AI pipeline generating narrative videos in < 15s
- Architecture: On-device metadata analysis → LPU-accelerated script generation → offline audio synthesis → canvas rendering
- Results: PRC of X%, generation latency of Ys, user satisfaction of Z/5

### Sections

```
1. Introduction
   - The "dead photo" problem and "Digital Hoarding":
     * The average smartphone user stores around 2,795 photos in their camera roll [1].
     * Studies show 75% to 80% of photos taken on mobile phones are never looked at again after capture [2, 3].
     * 54% of users report feeling overwhelmed by the sheer volume of their photos, resulting in 50% of people doing absolutely nothing with the media they capture [2].
     * Selfies are particularly ignored, with up to 87% never re-examined [4].
     * References: [1] Affenstunde 2023; [2] Mixbook Survey 2022; [3] Reddit discussions/User Surveys; [4] Iceni Magazine.
   - Why existing tools fail (too slow, too complex, too generic)
   - Orchestra AI's 3 design principles:
     a. Speed-first (< 15s end-to-end)
     b. Narrative intelligence (emotional arc, not just slideshow)
     c. On-device privacy (no photo upload to servers)

2. Related Work
   - Google Photos Memories: reactive, no narration, no download
   - CapCut AI: powerful but requires active editing
   - Runway, Pika: text-to-video, not photo-to-video
   - Our gap: fully automatic, narrative-first, mobile-native

3. System Architecture  ← diagram here
   - On-device tier (browser APIs)
   - Fast inference tier (Groq LPU)
   - Render tier (Canvas + Web Audio)

4. Technical Implementation
   4.1 Media Processing Pipeline (compression, selection)
   4.2 Multi-Agent Orchestration (Vision → Script → Audio → Render)
   4.3 Audio Synthesis (OfflineAudioContext, TTS via macOS say)
   4.4 Video Rendering (Ken Burns, cross-fade, caption overlay)

5. Evaluation
   5.1 Latency benchmarks (Table: phase-by-phase breakdown)
   5.2 Photo Reuse Coefficient (user study, N=X)
   5.3 Content quality (blind evaluation vs baseline: no-AI slideshow)
   5.4 User satisfaction survey

6. Discussion
   - Current limitations (macOS-only TTS, no cloud rendering)
   - V2 roadmap (ElevenLabs TTS, Suno music, GPT-4o Vision)
   - Privacy by design (photos never leave device)

7. Conclusion
```

---

## 8. V2 Roadmap (Priority Order)

| Priority | Feature | Impact | Effort |
|---|---|---|---|
| 🔴 High | ElevenLabs TTS (cloud) | Voice quality 10× better, works on any platform | Medium |
| 🔴 High | Prompt upgrade (70B cascade) | Content quality dramatically better | Low |
| 🟡 Med | MediaPipe face detection | Smart photo selection, Memory Mode UX | High |
| 🟡 Med | GPT-4o Vision (photo analysis) | Understands photo content, not just metadata | Medium |
| 🟢 Low | Suno/Udio music API | Real music instead of synthesized tones | Medium |
| 🟢 Low | Cloud render (FFmpeg server) | Faster render for long videos | High |

---

## 9. Quick Win: Upgrade the Prompt Right Now

The single highest-ROI change for MVP quality is improving the Groq system prompt in `/api/orchestrate.ts`. No model change needed — same speed, 3× better output.

> See `src/pages/api/orchestrate.ts` — update `CINEMATIC_SYSTEM` and `MEMORY_SYSTEM` prompts with the structured template from Section 4 above.
