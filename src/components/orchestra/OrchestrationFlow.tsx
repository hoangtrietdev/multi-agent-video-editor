"use client";
import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrchestrationStore, AgentState, AgentStatus } from "@/store/orchestrationStore";
import { generateVideoFromImages, buildCaptions } from "@/lib/videoGenerator";
import { startAudioSynth } from "@/lib/audioSynth";

/* ------------------------------------------------------------------ */
/*  Status colours / labels                                             */
/* ------------------------------------------------------------------ */
const STATUS_COLOR: Record<AgentStatus, string> = {
  idle:    "var(--color-slate-700)",
  running: "var(--color-indigo)",
  done:    "var(--color-cyan)",
  error:   "#EF4444",
};
const STATUS_LABEL: Record<AgentStatus, string> = {
  idle:    "Waiting",
  running: "Processing…",
  done:    "Complete",
  error:   "Error",
};

/* ------------------------------------------------------------------ */
/*  Agent node                                                          */
/* ------------------------------------------------------------------ */
function AgentNode({ agent, isLast }: { agent: AgentState; isLast: boolean }) {
  const color     = STATUS_COLOR[agent.status];
  const isRunning = agent.status === "running";
  const isDone    = agent.status === "done";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px", width: "100%" }}>
        {/* Icon bubble */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {isRunning && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ position: "absolute", inset: "-8px", borderRadius: "50%", background: "rgba(99,102,241,0.3)" }}
            />
          )}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: isRunning
                ? "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)"
                : isDone ? "rgba(34,211,238,0.12)" : "var(--color-slate-900)",
              border: `2px solid ${color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              boxShadow: isRunning
                ? "0 0 20px rgba(99,102,241,0.5)"
                : isDone ? "0 0 12px rgba(34,211,238,0.3)" : "none",
              transition: "all 0.4s ease",
            }}
          >
            {agent.icon}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className="text-body-sm" style={{ fontWeight: 600, color: "var(--color-slate-50)" }}>
              {agent.label}
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "20px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                background: isRunning ? "rgba(99,102,241,0.15)" : isDone ? "rgba(34,211,238,0.12)" : "rgba(148,163,184,0.08)",
                color,
                border: `1px solid ${color}30`,
              }}
            >
              {isRunning ? (
                <span style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                  {[0, 200, 400].map((_, i) => (
                    <span
                      key={i}
                      className={i === 0 ? "animate-dot" : i === 1 ? "animate-dot animation-delay-200" : "animate-dot animation-delay-400"}
                      style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor", display: "inline-block" }}
                    />
                  ))}
                </span>
              ) : STATUS_LABEL[agent.status]}
            </span>
          </div>
          <p className="text-mono" style={{ color: "var(--color-slate-400)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {agent.log}
          </p>
        </div>
      </div>

      {/* Expandable output */}
      <AnimatePresence>
        {isDone && agent.output && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ width: "100%", paddingLeft: "72px", marginTop: "8px" }}
          >
            <div style={{ background: "var(--color-slate-900)", border: "1px solid var(--color-slate-800)", borderRadius: "8px", padding: "10px", maxHeight: "100px", overflowY: "auto" }}>
              <pre className="text-mono" style={{ color: "var(--color-cyan-400)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {agent.output}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connector line */}
      {!isLast && (
        <div
          style={{
            width: "2px", height: "28px", marginTop: "8px", marginBottom: "8px",
            background: isDone ? "linear-gradient(to bottom, var(--color-cyan), var(--color-indigo))" : "var(--color-slate-800)",
            borderRadius: "2px", transition: "background 0.5s ease",
            alignSelf: "flex-start", marginLeft: "27px",
          }}
        />
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */
export default function OrchestrationFlow() {
  const agents              = useOrchestrationStore((s) => s.agents);
  const config              = useOrchestrationStore((s) => s.config);
  const mediaItems          = useOrchestrationStore((s) => s.mediaItems);
  const setAgentStatus      = useOrchestrationStore((s) => s.setAgentStatus);
  const setGeneratedScript  = useOrchestrationStore((s) => s.setGeneratedScript);
  const setOrchestrationError = useOrchestrationStore((s) => s.setOrchestrationError);
  const setGeneratedVideoUrl  = useOrchestrationStore((s) => s.setGeneratedVideoUrl);
  const setRenderProgress     = useOrchestrationStore((s) => s.setRenderProgress);
  const orchestrationError    = useOrchestrationStore((s) => s.orchestrationError);
  const generatedScript       = useOrchestrationStore((s) => s.generatedScript);
  const renderProgress        = useOrchestrationStore((s) => s.renderProgress);
  const setStep               = useOrchestrationStore((s) => s.setStep);
  const orchestrationStarted  = useOrchestrationStore((s) => s.orchestrationStarted);
  const setOrchestrationStarted = useOrchestrationStore((s) => s.setOrchestrationStarted);

  const selectedItems = mediaItems.filter((m) => m.selected);
  const selectedCount = selectedItems.length;

  // No useRef needed — the store-level flag survives component remounts.

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const runOrchestration = useCallback(async () => {
    if (orchestrationStarted) return;
    setOrchestrationStarted(true);

    try {
      /* ── Vision Agent ── */
      setAgentStatus("vision", "running", `Analyzing ${selectedCount} uploaded file${selectedCount > 1 ? "s" : ""}…`);
      await sleep(1500);
      const photoCount = selectedItems.filter((m) => m.type === "photo").length;
      const videoCount = selectedItems.filter((m) => m.type === "video").length;
      setAgentStatus(
        "vision", "done",
        `Found ${photoCount} photo${photoCount !== 1 ? "s" : ""} & ${videoCount} video${videoCount !== 1 ? "s" : ""}`
      );

      /* ── Scripting Agent — Groq LLM call ── */
      setAgentStatus("scripting", "running", "Generating narrative with Groq LLM…");
      try {
        const resp = await fetch("/api/orchestrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            narrativeTheme: config.narrativeTheme,
            voicePersona: config.voicePersona,
            primaryVision: config.primaryVision,
            mediaCount: selectedCount,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error ?? "API error");
        setGeneratedScript(data.script);
        setAgentStatus("scripting", "done", "Script generated ✓", data.script);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "LLM unavailable";
        const mockScript = JSON.stringify({
          title: `${config.narrativeTheme} Masterpiece`,
          hook: "In a world where every frame tells a story…",
          body: "Scene 1: Establishing wide shot. Scene 2: Intimate close-up. Scene 3: Dynamic motion.",
          cta: "Follow for more.",
          voiceNotes: `${config.voicePersona} tone, 1.0× speed.`,
        }, null, 2);
        setGeneratedScript(mockScript);
        setAgentStatus("scripting", "done", `⚠️ ${msg} — using mock`, mockScript);
      }

      /* ── Audio Agent — mood-matched generative synth ── */
      setAgentStatus("audio", "running", `Synthesising ${config.voicePersona} music bed…`);
      // Start synthesis immediately so it warms up during render
      let audioHandle: ReturnType<typeof startAudioSynth> | null = null;
      try {
        audioHandle = startAudioSynth(config.voicePersona, config.narrativeTheme);
        setAgentStatus("audio", "done",
          `🎵 ${config.voicePersona} · ${config.narrativeTheme} music bed ready ✓`);
      } catch {
        setAgentStatus("audio", "done", "⚠️ Audio synth unavailable — silent mode");
      }

      /* ── Render Agent — real canvas video generation ── */
      setAgentStatus("render", "running", "Compositing frames with captions…");
      setRenderProgress(0);

      const imageUrls = selectedItems
        .filter((m) => m.type === "photo")
        .map((m) => m.url);

      // If only videos were uploaded, skip canvas generation and use first video
      if (imageUrls.length === 0) {
        await sleep(1500);
        const firstVideo = selectedItems.find((m) => m.type === "video");
        if (firstVideo) setGeneratedVideoUrl(firstVideo.url);
        audioHandle?.stop();
        setAgentStatus("render", "done", "Video track composited ✓");
      } else {
        // Parse captions from the generated script
        const captions = buildCaptions(
          useOrchestrationStore.getState().generatedScript,
          imageUrls.length
        );
        try {
          const msPerImage = Math.min(3000, Math.max(1500, 8000 / imageUrls.length));
          const videoUrl = await generateVideoFromImages(
            imageUrls,
            (progress) => {
              const pct = Math.round((progress.frame / progress.total) * 100);
              setRenderProgress(pct);
              setAgentStatus("render", "running", progress.label);
            },
            msPerImage,
            1080,
            1920,
            captions,
            audioHandle?.track,
          );
          audioHandle?.stop();
          setGeneratedVideoUrl(videoUrl);
          setRenderProgress(100);
          setAgentStatus(
            "render", "done",
            `${imageUrls.length}-frame video · ${captions.length} captions · 🎵 audio ✓`
          );
        } catch (renderErr: unknown) {
          audioHandle?.stop();
          const msg = renderErr instanceof Error ? renderErr.message : "Render failed";
          setGeneratedVideoUrl(imageUrls[0]);
          setAgentStatus("render", "done", `⚠️ ${msg} — static preview used`);
        }
      }

      /* Navigate to preview */
      await sleep(500);
      setStep("preview");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Orchestration failed";
      setOrchestrationError(message);
    }
  }, [config, orchestrationStarted, setOrchestrationStarted, selectedCount, selectedItems, setAgentStatus, setGeneratedScript, setOrchestrationError, setGeneratedVideoUrl, setRenderProgress, setStep]);

  useEffect(() => {
    runOrchestration();
  }, [runOrchestration]);

  const doneCount = agents.filter((a) => a.status === "done").length;
  const allDone   = doneCount === agents.length;

  return (
    <section style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 className="text-display" style={{ margin: 0, marginBottom: "6px" }}>Agent Flow</h2>
        <p className="text-body-sm" style={{ color: "var(--color-slate-400)", margin: 0 }}>
          {allDone ? "All agents completed · Navigating to preview…" : "AI agents are orchestrating your video…"}
        </p>
      </div>

      {/* Pipeline */}
      <div style={{ background: "var(--color-slate-900)", border: "1px solid var(--color-slate-800)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column" }}>
        {agents.map((agent, idx) => (
          <AgentNode key={agent.id} agent={agent} isLast={idx === agents.length - 1} />
        ))}
      </div>

      {/* Error banner */}
      {orchestrationError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", color: "#FCA5A5", fontSize: "13px" }}
        >
          ⚠️ {orchestrationError}
        </motion.div>
      )}

      {/* Progress bar */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "12px 16px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: "12px" }}>
        <div style={{ flex: 1, height: "4px", background: "var(--color-slate-800)", borderRadius: "2px", overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${(doneCount / agents.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            style={{ height: "100%", background: "linear-gradient(to right, #6366F1, #22D3EE)", borderRadius: "2px" }}
          />
        </div>
        <span className="text-mono" style={{ color: "var(--color-indigo-400)", flexShrink: 0 }}>
          {doneCount}/{agents.length}
        </span>
      </div>

      {/* Render sub-progress */}
      {agents.find((a) => a.id === "render")?.status === "running" && renderProgress > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ padding: "12px 16px", background: "var(--color-slate-900)", border: "1px solid var(--color-slate-800)", borderRadius: "12px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span className="text-body-sm" style={{ color: "var(--color-slate-400)" }}>Video rendering</span>
            <span className="text-mono" style={{ color: "var(--color-cyan)" }}>{renderProgress}%</span>
          </div>
          <div style={{ height: "6px", background: "var(--color-slate-800)", borderRadius: "3px", overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${renderProgress}%` }}
              style={{ height: "100%", background: "linear-gradient(to right, #6366F1, #22D3EE)", borderRadius: "3px" }}
            />
          </div>
        </motion.div>
      )}

      {/* Script preview */}
      {generatedScript && (
        <div className="card">
          <p className="text-label" style={{ color: "var(--color-slate-400)", margin: "0 0 8px" }}>Script Output</p>
          <pre className="text-mono" style={{ color: "var(--color-cyan-400)", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "160px", overflowY: "auto", margin: 0 }}>
            {generatedScript}
          </pre>
        </div>
      )}
    </section>
  );
}
