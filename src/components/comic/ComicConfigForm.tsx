"use client";
import { useOrchestrationStore } from "@/store/orchestrationStore";
import { motion } from "framer-motion";

const COMIC_THEMES = ["Action", "Sci-Fi", "Comedy", "Fantasy", "Slice of Life"];

/* ─────────────────────────────────────────────────────────── */
/*  Pill chip row                                              */
/* ─────────────────────────────────────────────────────────── */
function PillRow({
  options,
  value,
  onChange,
  accentColor = "var(--color-amber-400)",
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

export default function ComicConfigForm() {
  const config = useOrchestrationStore((s) => s.config);
  const setConfig = useOrchestrationStore((s) => s.setConfig);
  const setStep = useOrchestrationStore((s) => s.setStep);
  const selectedCount = useOrchestrationStore((s) => s.selectedCount);
  const resetAgents = useOrchestrationStore((s) => s.resetAgents);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.comicPrompt.trim()) return;
    resetAgents();
    setStep("orchestrate");
  };

  const isValid = config.comicPrompt.trim().length > 0;

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
      <div>
        <h2 className="text-display" style={{ margin: 0, marginBottom: "3px", color: "var(--color-amber-400)" }}>
          🗯 Configure Comic
        </h2>
        <p className="text-body-sm" style={{ margin: 0, color: "var(--color-slate-400)" }}>
          {selectedCount} file{selectedCount > 1 ? "s" : ""} selected · Direct your comic agents
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* Theme */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label className="text-label" style={{ color: "var(--color-slate-400)" }}>
            Comic Theme
          </label>
          <PillRow
            options={COMIC_THEMES}
            value={config.narrativeTheme}
            onChange={(v) => setConfig({ narrativeTheme: v })}
            accentColor="var(--color-amber-400)"
          />
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
              {config.ecoMode ? "Saves battery · Faster simple rendering" : "Full resolution effects"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfig({ ecoMode: !config.ecoMode })}
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

        {/* Prompt */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="text-label" style={{ color: "var(--color-slate-400)" }}>
              Comic Story Prompt *
            </label>
            <span className="text-mono" style={{ color: "var(--color-slate-600)" }}>
              {config.comicPrompt.length}/400
            </span>
          </div>
          <textarea
            className="textarea"
            rows={3}
            value={config.comicPrompt}
            onChange={(e) => setConfig({ comicPrompt: e.target.value })}
            placeholder="e.g., An epic superhero adventure in the city..."
            maxLength={400}
            style={{ resize: "none" }}
          />
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={!isValid}
          style={{
            width: "100%", marginTop: "8px", padding: "14px",
            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            color: "white", fontWeight: 700, borderRadius: "12px",
            border: "none", cursor: isValid ? "pointer" : "not-allowed",
            opacity: isValid ? 1 : 0.45, boxShadow: isValid ? "0 4px 14px rgba(245,158,11,0.4)" : "none"
          }}
        >
          Start Comic Agents
        </button>
      </form>
    </motion.section>
  );
}

