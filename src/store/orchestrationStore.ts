import { create } from "zustand";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export type AgentId = "vision" | "scripting" | "audio" | "render";
export type AgentStatus = "idle" | "running" | "done" | "error";

/** "cinematic" = original mode; "memory" = personal/memorial mode */
export type VideoMode = "cinematic" | "memory";
export type VoiceGender = "male" | "female";

export interface AgentState {
  id: AgentId;
  label: string;
  icon: string;
  status: AgentStatus;
  log: string;
  output?: string;
}

export interface MediaItem {
  id: string;
  /** Object URL (blob:…) created from the user's File */
  url: string;
  /** Original filename */
  name: string;
  type: "photo" | "video";
  selected: boolean;
  /** File size in bytes */
  size: number;
}

export type FlowStep = "select" | "configure" | "orchestrate" | "preview";

export interface OrchestrationConfig {
  narrativeTheme: string;
  voicePersona: string;
  voiceGender: VoiceGender;
  primaryVision: string;
  videoMode: VideoMode;
  /** Whether to play TTS narration in the preview player (cannot be baked into video) */
  includeVoice: boolean;
}

/* ------------------------------------------------------------------ */
/*  Initial agent pipeline                                              */
/* ------------------------------------------------------------------ */
const INITIAL_AGENTS: AgentState[] = [
  { id: "vision",    label: "Vision Agent",    icon: "👁",  status: "idle", log: "Awaiting media input…" },
  { id: "scripting", label: "Scripting Agent", icon: "✍️", status: "idle", log: "Awaiting vision analysis…" },
  { id: "audio",     label: "Audio Agent",     icon: "🎵",  status: "idle", log: "Awaiting script generation…" },
  { id: "render",    label: "Render Agent",    icon: "🎬",  status: "idle", log: "Awaiting audio synthesis…" },
];

/* ------------------------------------------------------------------ */
/*  Store interface                                                      */
/* ------------------------------------------------------------------ */
interface OrchestrationStore {
  /* Navigation */
  step: FlowStep;
  setStep: (step: FlowStep) => void;

  /* Media — user-uploaded files (empty until user uploads) */
  mediaItems: MediaItem[];
  addMediaItems: (items: MediaItem[]) => void;
  removeMediaItem: (id: string) => void;
  toggleMediaItem: (id: string) => void;
  clearMediaItems: () => void;
  selectedCount: number;

  /* Config */
  config: OrchestrationConfig;
  setConfig: (patch: Partial<OrchestrationConfig>) => void;

  /* Agents */
  agents: AgentState[];
  setAgentStatus: (id: AgentId, status: AgentStatus, log?: string, output?: string) => void;
  resetAgents: () => void;

  /* Groq-generated script */
  generatedScript: string;
  setGeneratedScript: (script: string) => void;

  /* Canvas-generated video URL (blob: URL) */
  generatedVideoUrl: string | null;
  setGeneratedVideoUrl: (url: string | null) => void;

  /* Render progress (0–100) */
  renderProgress: number;
  setRenderProgress: (p: number) => void;

  /* Error */
  orchestrationError: string | null;
  setOrchestrationError: (err: string | null) => void;

  /* Guards against duplicate orchestration runs (survives component remounts) */
  orchestrationStarted: boolean;
  setOrchestrationStarted: (v: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Store implementation                                                 */
/* ------------------------------------------------------------------ */
export const useOrchestrationStore = create<OrchestrationStore>((set) => ({
  /* Navigation */
  step: "select",
  setStep: (step) => set({ step }),

  /* Media — starts empty; populated via file uploads */
  mediaItems: [],
  addMediaItems: (newItems) =>
    set((s) => ({
      mediaItems: [...s.mediaItems, ...newItems],
      selectedCount: s.selectedCount + newItems.filter((i) => i.selected).length,
    })),
  removeMediaItem: (id) =>
    set((s) => {
      const removed = s.mediaItems.find((m) => m.id === id);
      // Revoke object URL to free memory
      if (removed) URL.revokeObjectURL(removed.url);
      const next = s.mediaItems.filter((m) => m.id !== id);
      return {
        mediaItems: next,
        selectedCount: next.filter((m) => m.selected).length,
      };
    }),
  toggleMediaItem: (id) =>
    set((s) => {
      const next = s.mediaItems.map((m) =>
        m.id === id ? { ...m, selected: !m.selected } : m
      );
      return { mediaItems: next, selectedCount: next.filter((m) => m.selected).length };
    }),
  clearMediaItems: () =>
    set((s) => {
      s.mediaItems.forEach((m) => URL.revokeObjectURL(m.url));
      return { mediaItems: [], selectedCount: 0 };
    }),
  selectedCount: 0,

  /* Config */
  config: {
    narrativeTheme: "Travel",
    voicePersona: "Cinematic",
    voiceGender: "female",
    primaryVision: "",
    videoMode: "cinematic",
    includeVoice: true,
  },
  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  /* Agents */
  agents: INITIAL_AGENTS,
  setAgentStatus: (id, status, log, output) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id ? { ...a, status, log: log ?? a.log, output: output ?? a.output } : a
      ),
    })),
  resetAgents: () => set({ agents: INITIAL_AGENTS, orchestrationStarted: false }),

  /* Script */
  generatedScript: "",
  setGeneratedScript: (script) => set({ generatedScript: script }),

  /* Generated video */
  generatedVideoUrl: null,
  setGeneratedVideoUrl: (url) => set({ generatedVideoUrl: url }),

  /* Render progress */
  renderProgress: 0,
  setRenderProgress: (p) => set({ renderProgress: p }),

  /* Error */
  orchestrationError: null,
  setOrchestrationError: (err) => set({ orchestrationError: err }),

  /* Orchestration run guard */
  orchestrationStarted: false,
  setOrchestrationStarted: (v) => set({ orchestrationStarted: v }),
}));
