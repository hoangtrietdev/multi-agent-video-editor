"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrchestrationStore, ComicScript } from "@/store/orchestrationStore";
import { processMediaOnDevice } from "@/lib/visionAgent";

function ComicAgentRow({ agent, isLast }: { agent: any; isLast: boolean }) {
  const isDone = agent.status === "done";
  const isRunning = agent.status === "running";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {/* Icon / Status */}
        <div
          style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: isDone
              ? "rgba(16, 185, 129, 0.15)"
              : isRunning
                ? "rgba(245, 158, 11, 0.15)"
                : "rgba(15, 23, 42, 0.5)",
            border: `1px solid ${
              isDone ? "rgba(16, 185, 129, 0.3)" : isRunning ? "rgba(245, 158, 11, 0.4)" : "rgba(255,255,255,0.05)"
            }`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", position: "relative", zIndex: 2,
          }}
        >
          {isDone ? <span style={{ color: "var(--color-emerald-400)", fontSize: "20px" }}>✓</span> : <span>{agent.icon}</span>}
        </div>

        {/* Text */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, color: isDone || isRunning ? "var(--color-slate-100)" : "var(--color-slate-500)", fontSize: "15px" }}>
              {agent.label}
            </span>
            <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: isDone ? "rgba(16,185,129,0.15)" : isRunning ? "rgba(245,158,11,0.15)" : "transparent", color: isDone ? "var(--color-emerald-400)" : isRunning ? "var(--color-amber-400)" : "transparent" }}>
              {isDone ? "Done" : isRunning ? "Processing" : ""}
            </span>
          </div>
          <p className="text-mono" style={{ color: agent.status === "error" ? "var(--color-red)" : "var(--color-slate-400)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {agent.log}
          </p>
        </div>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div
          style={{
            width: "2px", height: "28px", marginTop: "8px", marginBottom: "8px",
            background: isDone ? "linear-gradient(to bottom, var(--color-emerald-400), var(--color-amber-400))" : "var(--color-slate-800)",
            borderRadius: "2px", transition: "background 0.5s ease",
            alignSelf: "flex-start", marginLeft: "17px",
          }}
        />
      )}
    </motion.div>
  );
}

export default function ComicOrchestrationFlow() {
  const mediaItems = useOrchestrationStore((s) => s.mediaItems);
  const selectedItems = mediaItems.filter((m) => m.selected);
  const config = useOrchestrationStore((s) => s.config);
  const setStep = useOrchestrationStore((s) => s.setStep);
  const setGeneratedComic = useOrchestrationStore((s) => s.setGeneratedComic);
  
  const orchestrationStarted = useOrchestrationStore((s) => s.orchestrationStarted);
  const setOrchestrationStarted = useOrchestrationStore((s) => s.setOrchestrationStarted);

  type AgentInfo = {
    id: string;
    label: string;
    icon: string;
    status: "idle" | "running" | "done" | "error";
    log: string;
  };

  const [agents, setAgents] = useState<AgentInfo[]>([
    { id: "content", label: "Scripting Agent", icon: "✍️", status: "idle", log: "Awaiting prompt..." },
    { id: "layout", label: "Layout Agent", icon: "📐", status: "idle", log: "Awaiting script..." },
    { id: "cartoon", label: "Transform Agent", icon: "🎨", status: "idle", log: "Awaiting layout..." },
  ]);
  const [error, setError] = useState<string | null>(null);

  const updateAgent = (id: string, status: "idle"|"running"|"done"|"error", log: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status, log } : a));
  };

  useEffect(() => {
    if (orchestrationStarted) return;
    setOrchestrationStarted(true);

    const run = async () => {
      updateAgent("content", "running", "Analyzing and filtering photos on device...");
      try {
        const finalMedia = await processMediaOnDevice(
          selectedItems,
          (msg) => updateAgent("content", "running", msg),
          15 // limit to 15 best photos for comic
        );

        updateAgent("content", "running", "Drafting story via Groq...");
        const res = await fetch("/api/comic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: config.comicPrompt || "A fun comic", mediaCount: finalMedia.length })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        const script = data as ComicScript;
        
        updateAgent("content", "done", `Script generated: ${script.title}`);
        
        updateAgent("layout", "running", "Arranging panels and text...");
        await new Promise(r => setTimeout(r, 1000));
        updateAgent("layout", "done", `Arranged ${script.pages.length} pages`);
        
        updateAgent("cartoon", "running", "Applying comic filters to images...");
        await new Promise(r => setTimeout(r, 1500));
        updateAgent("cartoon", "done", "Images processed");
        
        setGeneratedComic(script);
        setTimeout(() => setStep("preview"), 1000);
      } catch (err: any) {
        updateAgent("content", "error", err.message);
        setError(err.message);
      }
    };

    run();
  }, [orchestrationStarted, setOrchestrationStarted, config.comicPrompt, selectedItems.length, setGeneratedComic, setStep]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", height: "100%", paddingBottom: "100px" }}
    >
      <div>
        <h2 className="text-display" style={{ margin: 0, marginBottom: "3px" }}>
          Generating Comic
        </h2>
        <p className="text-body-sm" style={{ margin: 0, color: "var(--color-slate-400)" }}>
          Your AI agents are collaborating...
        </p>
      </div>

      {/* Visual pulse indicator */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <div style={{
          position: "relative",
          width: "120px",
          height: "160px",
          borderRadius: "12px",
          background: "var(--color-slate-900)",
          border: "1px solid var(--color-slate-800)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}>
          {/* Animated glow */}
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.1, 0.9] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            style={{
              position: "absolute", width: "100%", height: "100%",
              background: "radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(0,0,0,0) 70%)"
            }}
          />
          <span style={{ fontSize: "36px", zIndex: 1, filter: "drop-shadow(0 0 8px rgba(245,158,11,0.5))" }}>
            🗯
          </span>
        </div>
      </div>

      {/* Agent pipeline */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <AnimatePresence>
          {agents.map((a, i) => (
            <ComicAgentRow key={a.id} agent={a} isLast={i === agents.length - 1} />
          ))}
        </AnimatePresence>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", padding: "16px", borderRadius: "12px", color: "#FCA5A5", fontSize: "14px", marginTop: "16px" }}>
          <strong>Error:</strong> {error}
          <div style={{ marginTop: "12px" }}>
            <button onClick={() => { setOrchestrationStarted(false); setStep("configure"); }} style={{ padding: "8px 16px", background: "var(--color-slate-800)", color: "white", borderRadius: "8px", border: "none", cursor: "pointer" }}>Go back</button>
          </div>
        </div>
      )}
    </motion.section>
  );
}
