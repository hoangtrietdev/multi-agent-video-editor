# 🚀 Orchestra AI

Orchestra AI is a next-generation, on-device AI creative platform that empowers users to turn raw personal media (photos and videos) into fully realized **Cinematic Videos** or high-quality **Comic Books**. 

By shifting heavy AI inference, image filtering, and media rendering directly to the client's browser, Orchestra AI ensures **maximum user privacy**, **zero cloud storage costs**, and a highly **eco-friendly** approach to generative AI.

## 🌟 Key Features

### 1. Dual Creation Modes
* **🎬 Cinematic Video Generator:** Synthesizes uploaded media into a seamless `.mp4`/`.webm` video. It features dynamic Ken Burns (pan/zoom) effects, smooth crossfades, and AI-generated Text-to-Speech (TTS) voiceovers.
* **🗯 Comic Book Creator:** Transforms real photos into an illustrated, multi-page comic book. Features three distinct art styles (Anime, Manga, Western Comic) generated entirely via client-side SVG shaders. Exports directly to a high-resolution PDF.

### 2. Multi-Agent Orchestration Flow
Users interact with a transparent "Agentic Workflow" UI that visualizes how the AI collaborates:
* **👁 Vision Agent (TensorFlow.js):** Runs `BlazeFace` and `MobileNet` locally to detect faces, tag semantic subjects, score image quality, and deduplicate identical photos.
* **✍️ Scripting Agent (Groq LLM):** Uses the ultra-fast Groq API to generate creative narratives, dialogues, or voiceover scripts based on the user's prompt.
* **📐 Layout / Audio Agent:** Arranges comic panels dynamically or synthesizes Text-to-Speech audio.
* **🎨 Transform / Render Agent:** Applies complex WebGL/SVG shader filters or renders the final video file.

### 3. Privacy-First & Eco-Friendly
* **Zero Server Storage:** User photos and videos **never** leave the device. All media processing happens locally in the browser memory.
* **On-Device Rendering:** Video encoding uses the native `MediaRecorder` and HTML5 Canvas APIs. PDF generation uses `html2canvas` and `jspdf`.
* **Low Carbon Footprint:** By avoiding heavy cloud-GPU rendering clusters, Orchestra AI operates as a highly sustainable "Green AI" tool.

## 🛠 Technology Stack
* **Framework:** Next.js, React, TypeScript
* **State Management:** Zustand
* **Animations:** Framer Motion
* **Machine Learning:** TensorFlow.js (`@tensorflow/tfjs`, `blazeface`, `mobilenet`), Groq API (LLM)
* **Media Processing:** HTML5 Canvas, MediaRecorder, `jspdf`, `html2canvas`

## 🚀 Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
Create a `.env.local` file and add your Groq API key:
```env
GROQ_API_KEY=your_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to start creating!
