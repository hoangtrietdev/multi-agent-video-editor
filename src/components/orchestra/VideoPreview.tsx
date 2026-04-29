"use client";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useOrchestrationStore } from "@/store/orchestrationStore";

export default function VideoPreview() {
  const generatedScript   = useOrchestrationStore((s) => s.generatedScript);
  const generatedVideoUrl = useOrchestrationStore((s) => s.generatedVideoUrl);
  const config            = useOrchestrationStore((s) => s.config);
  const setStep           = useOrchestrationStore((s) => s.setStep);
  const resetAgents       = useOrchestrationStore((s) => s.resetAgents);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying]     = useState(false);
  const [shareMsg, setShareMsg]   = useState("");
  const [downloadReady, setDownloadReady] = useState(false);

  // Auto-load the generated video
  useEffect(() => {
    if (generatedVideoUrl && videoRef.current) {
      videoRef.current.load();
      setDownloadReady(true);
    }
  }, [generatedVideoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setPlaying((p) => !p);
  };

  const handleRefine = () => {
    resetAgents();
    setStep("configure");
  };

  const handleExport = () => {
    setShareMsg("🎉 Shared to TikTok! (mock)");
    setTimeout(() => setShareMsg(""), 3000);
  };

  const handleDownload = () => {
    if (!generatedVideoUrl) return;
    const a = document.createElement("a");
    a.href     = generatedVideoUrl;
    a.download = `orchestra-ai-${Date.now()}.webm`;
    a.click();
  };

  // Parse script for overlay text
  let scriptData: Record<string, string> = {};
  try {
    scriptData = JSON.parse(generatedScript);
  } catch {
    /* raw text */
  }

  const isVideoBlob = generatedVideoUrl?.startsWith("blob:");

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}
    >
      {/* Header */}
      <div>
        <h2 className="text-display" style={{ margin: 0, marginBottom: "6px" }}>Preview</h2>
        <p className="text-body-sm" style={{ color: "var(--color-slate-400)", margin: 0 }}>
          {scriptData.title ?? config.narrativeTheme} · {config.voicePersona}
        </p>
      </div>

      {/* Success badge */}
      {isVideoBlob && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 14px",
            background: "rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.25)",
            borderRadius: "10px",
          }}
        >
          <span style={{ fontSize: "18px" }}>✅</span>
          <div>
            <p className="text-body-sm" style={{ margin: 0, fontWeight: 600, color: "var(--color-cyan)" }}>
              Video generated from your uploads
            </p>
            <p className="text-mono" style={{ margin: 0, color: "var(--color-slate-400)" }}>
              Canvas render · WebM · 🎵 Mood audio · 💬 Captions
            </p>
          </div>
        </motion.div>
      )}

      {/* 9:16 video player */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "280px",
          margin: "0 auto",
          aspectRatio: "9/16",
          borderRadius: "20px",
          overflow: "hidden",
          border: "1px solid var(--color-slate-800)",
          boxShadow: "0 0 40px rgba(99,102,241,0.2), 0 0 80px rgba(99,102,241,0.08)",
          background: "#020617",
        }}
      >
        {generatedVideoUrl ? (
          <video
            ref={videoRef}
            id="preview-video"
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src={generatedVideoUrl} />
          </video>
        ) : (
          /* Loading state */
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <div className="animate-spin-slow" style={{ fontSize: "40px" }}>🎬</div>
            <p className="text-body-sm" style={{ color: "var(--color-slate-400)", margin: 0 }}>
              Preparing preview…
            </p>
          </div>
        )}

        {/* SVG overlay gradients */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          viewBox="0 0 280 498"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#020617" stopOpacity="0.65" />
              <stop offset="30%" stopColor="#020617" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="botGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#020617" stopOpacity="0" />
              <stop offset="65%" stopColor="#020617" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <rect width="280" height="200" fill="url(#topGrad)" />
          <rect y="298" width="280" height="200" fill="url(#botGrad)" />
        </svg>

        {/* Hook overlay */}
        {scriptData.hook && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "12px",
              right: "12px",
              fontWeight: 700,
              fontSize: "13px",
              color: "white",
              textShadow: "0 2px 8px rgba(0,0,0,0.9)",
              lineHeight: "1.4",
            }}
          >
            {scriptData.hook}
          </div>
        )}

        {/* CTA overlay */}
        {scriptData.cta && (
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "12px",
              right: "12px",
              fontWeight: 700,
              fontSize: "15px",
              color: "white",
              textShadow: "0 2px 8px rgba(0,0,0,0.9)",
            }}
          >
            {scriptData.cta}
          </div>
        )}

        {/* AI badge */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "rgba(99,102,241,0.85)",
            backdropFilter: "blur(8px)",
            borderRadius: "8px",
            padding: "3px 8px",
            fontSize: "10px",
            fontWeight: 700,
            color: "white",
            letterSpacing: "0.05em",
          }}
        >
          AI GEN
        </div>

        {/* Play/Pause pill */}
        {generatedVideoUrl && (
          <button
            id="btn-play-pause"
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
            style={{
              position: "absolute",
              left: "50%",
              bottom: "60px",
              transform: "translateX(-50%)",
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "28px",
              padding: "10px 24px",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            {playing ? "Pause" : "Play Preview"}
          </button>
        )}
      </div>

      {/* Share message */}
      {shareMsg && (
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", color: "var(--color-cyan)", fontWeight: 600, margin: 0 }}
        >
          {shareMsg}
        </motion.p>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Download (only if we generated a real blob) */}
        {downloadReady && isVideoBlob && (
          <button
            id="btn-download-video"
            className="btn-primary"
            onClick={handleDownload}
            style={{ background: "linear-gradient(135deg, #6366F1 0%, #22D3EE 100%)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Video (.webm)
          </button>
        )}

        <button id="btn-export-tiktok" className="btn-primary" onClick={handleExport}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Export to TikTok
        </button>

        <button id="btn-refine-flow" className="btn-ghost" onClick={handleRefine}>
          ← Refine in Flow
        </button>

        <button
          id="btn-start-over"
          className="btn-ghost"
          onClick={() => setStep("select")}
          style={{ borderColor: "transparent", color: "var(--color-slate-600)" }}
        >
          Start Over
        </button>
      </div>

      {/* Script card */}
      {generatedScript && (
        <div className="card">
          <p className="text-label" style={{ color: "var(--color-slate-400)", margin: "0 0 8px" }}>
            Generated Script
          </p>
          <pre
            className="text-mono"
            style={{ color: "var(--color-slate-400)", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "200px", overflowY: "auto", margin: 0 }}
          >
            {generatedScript}
          </pre>
        </div>
      )}
    </motion.section>
  );
}
