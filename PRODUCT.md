# Orchestra AI - Product Requirements & Overview

## 1. Product Vision
Orchestra AI is a next-generation, on-device AI creative platform. It empowers users to transform their personal media collections (photos and videos) into highly stylized **Cinematic Videos** or professional-grade **Comic Books**. 

Our core philosophy is **Eco-Friendly / Privacy-First AI**. By deliberately shifting heavy media rendering, image filtering, and vision processing directly to the client's device (browser), we eliminate the need for expensive cloud-GPU infrastructure, protect user privacy (media never leaves the device), and significantly reduce the carbon footprint associated with generative AI.

## 2. Target Audience
- **Content Creators & Storytellers:** Looking for rapid, zero-cost ways to turn daily photos into engaging narratives.
- **Privacy-Conscious Users:** Users who want AI enhancements without uploading personal family photos to third-party servers.
- **Mobile Users:** Designed as a responsive, mobile-first WebApp that feels like a native application.

## 3. Core Features & User Flow

### A. Dual Creation Modes
Users can toggle between two distinct applications within the platform:
1. **Video Creator:** Merges media into an `.mp4`/`.webm` video with Ken Burns pan/zoom effects, smooth crossfades, and an AI-narrated voiceover track.
2. **Comic Creator:** Converts real photos into an illustrated comic book, featuring custom UI themes (Anime, Manga, Western Comic) and direct, client-side PDF export via a slideshow interface.

### B. The Orchestration Pipeline
When a user clicks "Generate", they are guided through a visual "Agentic Workflow" showing exactly what the AI is doing:
- **Vision Agent (TensorFlow.js):** Runs locally to assess image quality, detect faces (`BlazeFace`), identify semantic subjects (`MobileNet`), and remove identical duplicate photos using perceptual hashing.
- **Scripting Agent (Groq LLM):** The only cloud component. It uses Groq's ultra-fast API to write the story, dialogue, or voiceover script based on the user's prompt and the number of valid images.
- **Layout / Audio Agent:** Arranges the Comic panels into a grid layout, or synthesizes Text-to-Speech (TTS) audio for the Video mode.
- **Transform / Render Agent:** Applies complex WebGL/SVG shader filters (for Comic illustrations) or processes the HTML5 Canvas recording (for Video generation).

### C. Media Configuration & Upload
- **Smart Uploader:** Allows drag-and-drop or multi-selection.
- **Strict Validations:** Prevents video uploads when in Comic Mode, enforces a 30MB total browser memory budget to prevent crashing, and auto-compresses large images on the fly.
- **Creative Controls:** Users can set a Narrative Theme (Action, Sci-Fi, Slice of Life, Comedy) which dictates both the LLM's writing style and the specific SVG visual filters applied to their photos.

## 4. Technical Architecture

### Frontend Stack
- **Framework:** Next.js (Pages Router) + React + TypeScript.
- **Styling:** CSS Modules, inline dynamic variables, and `framer-motion` for high-fidelity micro-interactions.
- **State Management:** Zustand (`orchestrationStore.ts`) for managing global application state across the multi-step wizard.

### AI & Processing Stack
- **Client-Side Vision:** `@tensorflow/tfjs`, `@tensorflow-models/blazeface`, `@tensorflow-models/mobilenet`.
- **Client-Side Rendering:** 
  - **Video:** HTML5 `<canvas>` rendering loop captured by the `MediaRecorder` API.
  - **Comic PDF:** Complex `<feColorMatrix>` / `<feConvolveMatrix>` SVG filters baked into canvas contexts, then captured via `html2canvas` and packed into a `jspdf` document.
- **Cloud LLM:** Groq API (e.g., `llama3-70b-8192` or `mixtral-8x7b`) for sub-second script generation.

## 5. Success Metrics
- **Performance:** App launch to "Generation Complete" in under 30 seconds for a 10-page comic.
- **Privacy:** 100% of user media remains on the client device.
- **Engagement:** High completion rates on the "Export PDF" or "Download Video" actions.