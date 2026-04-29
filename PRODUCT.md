# Project PRD: Orchestra AI (MVP)

## 1. Executive Summary
Orchestra AI is a mobile-first framework designed to automate short-form video production through multi-agent orchestration. This MVP focuses on validating the user interface and orchestration flow on Android, using high-speed LLM APIs to simulate complex agent logic.

## 2. Product Objectives
- **Validate UX:** Ensure users can intuitively manage complex AI workflows.
- **Visual Orchestration:** Prove the value of visualizing "hidden" AI processes to build user trust.
- **Rapid Prototyping:** Demonstrate an end-to-end flow from raw media to a preview-ready video within a 1-week development sprint.

## 3. Core Features (MVP)
### A. Asset Selection & Configuration
- **Media Picker:** Integration with modern Android photo picker for multi-selection.
- **Creative Directives:** High-level controls for Narrative Theme (Travel, Action, Comedy) and Voice Persona.
- **Global Prompting:** A main input field for the user's primary creative vision.

### B. Agent Flow Visualization
- **Pipeline View:** A visual representation of the agent sequence: 
  - *Vision Agent:* Extracts metadata from media.
  - *Scripting Agent:* Generates narrative copy.
  - *Audio Agent:* Handles TTS/Voice synthesis.
  - *Render Agent:* Mock synthesis of video/audio.
- **Granular Customization:** Ability to tap any node in the flow to view or edit specific agent prompts.

### C. Preview & Export
- **Review Player:** Playback of the generated draft.
- **Action Suite:** Direct export to social platforms (TikTok) or return to flow for refinement.

## 4. Technical Constraints (MVP)
- **Platform:** Android (Jetpack Compose).
- **Inference:** Direct calls to Groq/LLM APIs for near-instant text generation.
- **Mock Rendering:** Use template videos with dynamic overlays to simulate rendering without a heavy backend.

## 5. Design Guidelines (Reference: Orchestra AI Design System)
- **Theme:** Dark Mode (Slate/Indigo).
- **Primary Color:** Electric Indigo (#6366F1).
- **Typography:** Inter Sans-Serif.
- **Radius:** 12dp standard for containers.

## 6. Success Metrics
- Average time from app launch to "Generate Preview" < 2 minutes.
- User completion rate for the configuration flow > 80%.
- Positive feedback on the clarity of the Agent Flow visualization.