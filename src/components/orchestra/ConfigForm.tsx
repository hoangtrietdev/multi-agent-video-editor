"use client";
import { useOrchestrationStore, VideoMode } from "@/store/orchestrationStore";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────────────────── */
/*  Constants                                                  */
/* ─────────────────────────────────────────────────────────── */

const CINEMATIC_THEMES = ["Travel", "Action", "Comedy", "Documentary", "Fashion", "Romance"];
const MEMORY_OCCASIONS = ["Anniversary", "Birthday", "Wedding", "New Year", "Christmas", "Family"];

const CINEMATIC_PERSONAS = ["Cinematic", "Energetic", "Calm & Smooth", "Inspirational", "Playful"];
const MEMORY_PERSONAS    = ["Warm & Loving", "Emotional", "Gentle", "Joyful", "Nostalgic"];

/* ─────────────────────────────────────────────────────────── */
/*  Mode Toggle                                                */
/* ─────────────────────────────────────────────────────────── */
function ModeToggle({ mode, onChange }: { mode: VideoMode; onChange: (m: VideoMode) => void }) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--color-slate-900)",
        border: "1px solid var(--color-slate-800)",
        borderRadius: "12px",
        padding: "4px",
        gap: "4px",
      }}
    >
      {(["cinematic", "memory"] as VideoMode[]).map((m) => {
        const active = mode === m;
        const isMemory = m === "memory";
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            style={{
              flex: 1,
              height: "38px",
              borderRadius: "9px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.25s ease",
              background: active
                ? isMemory
                  ? "linear-gradient(135deg, rgba(251,113,133,0.25) 0%, rgba(251,113,133,0.12) 100%)"
                  : "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0.12) 100%)"
                : "transparent",
              color: active
                ? isMemory ? "var(--color-rose-400)" : "var(--color-indigo-400)"
                : "var(--color-slate-600)",
              boxShadow: active
                ? isMemory
                  ? "0 0 12px rgba(251,113,133,0.15)"
                  : "0 0 12px rgba(99,102,241,0.2)"
                : "none",
            }}
          >
            <span style={{ fontSize: "15px" }}>{isMemory ? "💝" : "🎬"}</span>
            {isMemory ? "Memory" : "Cinematic"}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Voice Gender Toggle                                        */
/* ─────────────────────────────────────────────────────────── */
function VoiceGenderToggle({
  gender,
  onChange,
}: {
  gender: "male" | "female";
  onChange: (g: "male" | "female") => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--color-slate-900)",
        border: "1px solid var(--color-slate-800)",
        borderRadius: "10px",
        padding: "3px",
        gap: "3px",
        width: "100%",
      }}
    >
      {(["female", "male"] as const).map((g) => {
        const active = gender === g;
        return (
          <button
            key={g}
            type="button"
            onClick={() => onChange(g)}
            style={{
              flex: 1,
              height: "34px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              transition: "all 0.2s ease",
              background: active ? "rgba(99,102,241,0.2)" : "transparent",
              color: active ? "var(--color-indigo-400)" : "var(--color-slate-600)",
            }}
          >
            <span>{g === "female" ? "♀" : "♂"}</span>
            {g === "female" ? "Female" : "Male"}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Pill chip row                                              */
/* ─────────────────────────────────────────────────────────── */
function PillRow({
  options,
  value,
  onChange,
  accentColor = "var(--color-indigo)",
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  accentColor?: string;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: "5px 13px",
              borderRadius: "20px",
              border: `1px solid ${active ? accentColor : "var(--color-slate-800)"}`,
              background: active ? `${accentColor}22` : "var(--color-slate-900)",
              color: active ? accentColor : "var(--color-slate-500)",
              fontSize: "12px",
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Main ConfigForm                                            */
/* ─────────────────────────────────────────────────────────── */
export default function ConfigForm() {
  const config        = useOrchestrationStore((s) => s.config);
  const setConfig     = useOrchestrationStore((s) => s.setConfig);
  const selectedCount = useOrchestrationStore((s) => s.selectedCount);
  const setStep       = useOrchestrationStore((s) => s.setStep);
  const resetAgents   = useOrchestrationStore((s) => s.resetAgents);

  const isMemory = config.videoMode === "memory";
  const themes   = isMemory ? MEMORY_OCCASIONS : CINEMATIC_THEMES;
  const personas = isMemory ? MEMORY_PERSONAS   : CINEMATIC_PERSONAS;
  const accentColor = isMemory ? "var(--color-rose)" : "var(--color-indigo)";

  /* Reset theme/persona when switching modes */
  const handleModeChange = (m: VideoMode) => {
    const defaultTheme   = m === "memory" ? "Anniversary" : "Travel";
    const defaultPersona = m === "memory" ? "Warm & Loving" : "Cinematic";
    setConfig({ videoMode: m, narrativeTheme: defaultTheme, voicePersona: defaultPersona });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.primaryVision.trim()) return;
    resetAgents();
    setStep("orchestrate");
  };

  const isValid = config.primaryVision.trim().length > 0;

  const placeholder = isMemory
    ? "e.g. An anniversary video for my girlfriend — cozy, lovely and full of memories 💕"
    : "e.g. A cinematic travel montage through Southeast Asia at golden hour…";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        height: "100%",
      }}
    >
      {/* Header */}
      <div>
        <h2 className="text-display" style={{ margin: 0, marginBottom: "3px" }}>
          {isMemory ? "💝 Memory Mode" : "🎬 Configure"}
        </h2>
        <p className="text-body-sm" style={{ color: "var(--color-slate-400)", margin: 0 }}>
          {selectedCount} file{selectedCount > 1 ? "s" : ""} selected
          {isMemory ? " · Creating something special ✨" : " · Set your creative direction"}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Mode toggle */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label className="text-label" style={{ color: "var(--color-slate-400)" }}>Mode</label>
          <ModeToggle mode={config.videoMode} onChange={handleModeChange} />
        </div>

        {/* Theme / Occasion */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label className="text-label" style={{ color: "var(--color-slate-400)" }}>
            {isMemory ? "Occasion" : "Theme"}
          </label>
          <PillRow
            options={themes}
            value={config.narrativeTheme}
            onChange={(v) => setConfig({ narrativeTheme: v })}
            accentColor={accentColor}
          />
        </div>

        {/* Voice persona + gender */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label className="text-label" style={{ color: "var(--color-slate-400)" }}>
            Voice Style & Gender
          </label>

          {/* Persona pills */}
          <PillRow
            options={personas}
            value={config.voicePersona}
            onChange={(v) => setConfig({ voicePersona: v })}
            accentColor={accentColor}
          />

          {/* Gender toggle */}
          <VoiceGenderToggle
            gender={config.voiceGender}
            onChange={(g) => setConfig({ voiceGender: g })}
          />

          {/* Voice narration toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", background: "var(--color-slate-900)",
            border: "1px solid var(--color-slate-800)", borderRadius: "10px" }}>
            <div>
              <p className="text-body-sm" style={{ margin: 0, fontWeight: 600, color: "var(--color-slate-200)" }}>
                🎙 Voice Narration
              </p>
              <p className="text-mono" style={{ margin: "1px 0 0", color: "var(--color-slate-500)" }}>
                {config.includeVoice ? "Plays in preview · 🎵 music baked in video" : "Music only in video"}
              </p>
            </div>
            <button
              type="button"
              id="btn-toggle-voice"
              onClick={() => setConfig({ includeVoice: !config.includeVoice })}
              aria-label="Toggle voice narration"
              style={{
                width: "44px", height: "26px", borderRadius: "13px", border: "none",
                background: config.includeVoice ? accentColor : "var(--color-slate-700)",
                position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: "3px",
                left: config.includeVoice ? "21px" : "3px",
                width: "20px", height: "20px", borderRadius: "50%",
                background: "white", transition: "left 0.2s", display: "block",
              }} />
            </button>
          </div>

          {/* Eco Mode toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", background: "var(--color-slate-900)",
            border: "1px solid var(--color-slate-800)", borderRadius: "10px" }}>
            <div>
              <p className="text-body-sm" style={{ margin: 0, fontWeight: 600, color: "var(--color-emerald-400)" }}>
                🌱 Eco Mode
              </p>
              <p className="text-mono" style={{ margin: "1px 0 0", color: "var(--color-slate-500)" }}>
                {config.ecoMode ? "Saves battery · Faster render (720p 15fps)" : "Standard render (1080p 30fps)"}
              </p>
            </div>
            <button
              type="button"
              id="btn-toggle-eco"
              onClick={() => setConfig({ ecoMode: !config.ecoMode })}
              aria-label="Toggle eco mode"
              style={{
                width: "44px", height: "26px", borderRadius: "13px", border: "none",
                background: config.ecoMode ? "var(--color-emerald-500)" : "var(--color-slate-700)",
                position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: "3px",
                left: config.ecoMode ? "21px" : "3px",
                width: "20px", height: "20px", borderRadius: "50%",
                background: "white", transition: "left 0.2s", display: "block",
              }} />
            </button>
          </div>
        </div>

        {/* Vision prompt */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="primaryVision" className="text-label" style={{ color: "var(--color-slate-400)" }}>
              Your Vision *
            </label>
            <span className="text-mono" style={{ color: "var(--color-slate-600)" }}>
              {config.primaryVision.length}/400
            </span>
          </div>
          <textarea
            id="primaryVision"
            className="textarea"
            rows={3}
            placeholder={placeholder}
            value={config.primaryVision}
            onChange={(e) => setConfig({ primaryVision: e.target.value })}
            maxLength={400}
          />
        </div>

        {/* Memory mode warm tip */}
        <AnimatePresence>
          {isMemory && (
            <motion.div
              key="memory-tip"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  background: "rgba(251,113,133,0.07)",
                  border: "1px solid rgba(251,113,133,0.2)",
                  borderRadius: "10px",
                }}
              >
                <span className="animate-heart" style={{ fontSize: "18px", flexShrink: 0 }}>💕</span>
                <div>
                  <p className="text-body-sm" style={{ margin: 0, fontWeight: 600, color: "var(--color-rose-400)" }}>
                    Memory Mode
                  </p>
                  <p className="text-body-sm" style={{ margin: "2px 0 0", color: "var(--color-slate-400)" }}>
                    The AI will write a warm, personal script filled with love — perfect for someone special.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <button
          id="btn-visualize-flow"
          type="submit"
          className="btn-primary"
          disabled={!isValid}
          style={{
            opacity: isValid ? 1 : 0.45,
            cursor: isValid ? "pointer" : "not-allowed",
            background: isMemory
              ? "linear-gradient(135deg, #FB7185 0%, #6366F1 100%)"
              : undefined,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {isMemory ? "Create My Memory Video" : "Generate Video"}
        </button>
      </form>
    </motion.section>
  );
}
