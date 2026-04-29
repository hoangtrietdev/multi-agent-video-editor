"use client";
import { useOrchestrationStore } from "@/store/orchestrationStore";
import { motion } from "framer-motion";

const NARRATIVE_THEMES = ["Travel", "Action", "Comedy", "Romance", "Documentary", "Fashion"];
const VOICE_PERSONAS = ["Cinematic", "Energetic", "Calm & Smooth", "Inspirational", "Playful"];

export default function ConfigForm() {
  const config        = useOrchestrationStore((s) => s.config);
  const setConfig     = useOrchestrationStore((s) => s.setConfig);
  const selectedCount = useOrchestrationStore((s) => s.selectedCount);
  const setStep       = useOrchestrationStore((s) => s.setStep);
  const resetAgents   = useOrchestrationStore((s) => s.resetAgents);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.primaryVision.trim()) return;
    resetAgents();
    setStep("orchestrate");
  };

  const isValid = config.primaryVision.trim().length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* Header */}
      <div>
        <h2 className="text-display" style={{ margin: 0, marginBottom: "6px" }}>
          Configure
        </h2>
        <p className="text-body-sm" style={{ color: "var(--color-slate-400)", margin: 0 }}>
          {selectedCount} media item{selectedCount > 1 ? "s" : ""} selected · Set your creative direction
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Narrative Theme */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label htmlFor="narrativeTheme" className="text-label" style={{ color: "var(--color-slate-400)" }}>
            Narrative Theme
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {NARRATIVE_THEMES.map((theme) => {
              const active = config.narrativeTheme === theme;
              return (
                <button
                  key={theme}
                  type="button"
                  id={`theme-${theme.toLowerCase()}`}
                  onClick={() => setConfig({ narrativeTheme: theme })}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: `1px solid ${active ? "var(--color-indigo)" : "var(--color-slate-800)"}`,
                    background: active ? "rgba(99,102,241,0.15)" : "var(--color-slate-900)",
                    color: active ? "var(--color-indigo-400)" : "var(--color-slate-400)",
                    fontSize: "14px",
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: active ? "0 0 12px rgba(99,102,241,0.25)" : "none",
                  }}
                >
                  {theme}
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice Persona */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label htmlFor="voicePersona" className="text-label" style={{ color: "var(--color-slate-400)" }}>
            Voice Persona
          </label>
          <select
            id="voicePersona"
            className="input"
            value={config.voicePersona}
            onChange={(e) => setConfig({ voicePersona: e.target.value })}
          >
            {VOICE_PERSONAS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Primary Vision */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label htmlFor="primaryVision" className="text-label" style={{ color: "var(--color-slate-400)" }}>
            Primary Vision *
          </label>
          <textarea
            id="primaryVision"
            className="textarea"
            rows={4}
            placeholder="Describe your creative vision… e.g. 'A cinematic travel montage through Southeast Asia at golden hour, evoking wanderlust and freedom'"
            value={config.primaryVision}
            onChange={(e) => setConfig({ primaryVision: e.target.value })}
            maxLength={500}
          />
          <p className="text-mono" style={{ color: "var(--color-slate-600)", textAlign: "right" }}>
            {config.primaryVision.length}/500
          </p>
        </div>

        {/* Info card */}
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "20px" }}>⚡</span>
          <div>
            <p className="text-body-sm" style={{ margin: 0, fontWeight: 600, color: "var(--color-indigo-400)" }}>
              Groq-Powered Scripting
            </p>
            <p className="text-body-sm" style={{ margin: "4px 0 0", color: "var(--color-slate-400)" }}>
              Your vision will be processed by llama-3.3-70b-versatile for near-instant script generation.
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          id="btn-visualize-flow"
          type="submit"
          className="btn-primary"
          disabled={!isValid}
          style={{
            opacity: isValid ? 1 : 0.5,
            cursor: isValid ? "pointer" : "not-allowed",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Visualize Flow
        </button>
      </form>
    </motion.section>
  );
}
