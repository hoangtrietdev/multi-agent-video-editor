"use client";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useOrchestrationStore } from "@/store/orchestrationStore";

/* Detect iOS once at module level */
const IS_IOS =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export default function VideoPreview() {
  const generatedScript   = useOrchestrationStore((s) => s.generatedScript);
  const generatedVideoUrl = useOrchestrationStore((s) => s.generatedVideoUrl);
  const config            = useOrchestrationStore((s) => s.config);
  const setStep           = useOrchestrationStore((s) => s.setStep);
  const resetAgents       = useOrchestrationStore((s) => s.resetAgents);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying]         = useState(false);
  const [muted,   setMuted]           = useState(true);   // start muted for iOS autoplay
  const [shareMsg, setShareMsg]       = useState("");
  const [downloadReady, setDownloadReady] = useState(false);

  // Auto-load the generated video
  useEffect(() => {
    if (generatedVideoUrl && videoRef.current) {
      videoRef.current.load();
      setDownloadReady(true);
    }
  }, [generatedVideoUrl]);

  // Keep the DOM video element in sync with muted state
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setPlaying((p) => !p);
  };

  const toggleMute = () => setMuted((m) => !m);

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
    const ext = IS_IOS ? "mp4" : "webm";
    const a = document.createElement("a");
    a.href     = generatedVideoUrl;
    a.download = `orchestra-ai-${Date.now()}.${ext}`;
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
  const fileFormat  = IS_IOS ? "MP4" : "WebM";

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
              Canvas render · {fileFormat} · 🎵 Mood audio · 💬 Captions
            </p>
          </div>
        </motion.div>
      )}

      {/* iOS warning — shown only on iPhone/iPad */}
      {IS_IOS && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "10px 14px",
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.25)",
            borderRadius: "10px",
          }}
        >
          <span style={{ fontSize: "16px", flexShrink: 0 }}>📱</span>
          <p className="text-mono" style={{ margin: 0, color: "rgba(251,191,36,0.9)", lineHeight: "1.5" }}>
            iOS uses MP4 format for recording &amp; playback. Tap <strong>▶</strong> then the 🔊 button to unmute.
          </p>
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
            muted          /* Required for iOS autoplay — controlled via JS .muted */
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src={generatedVideoUrl} type={IS_IOS ? "video/mp4" : "video/webm"} />
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

        {/* Play/Pause + Mute row */}
        {generatedVideoUrl && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "60px",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* Play/Pause pill */}
            <button
              id="btn-play-pause"
              aria-label={playing ? "Pause" : "Play"}
              onClick={togglePlay}
              style={{
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
              {playing ? "Pause" : "Play"}
            </button>

            {/* Mute toggle — always visible so users can unmute */}
            <button
              id="btn-mute-toggle"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={toggleMute}
              style={{
                background: muted ? "rgba(255,255,255,0.10)" : "rgba(34,211,238,0.25)",
                backdropFilter: "blur(12px)",
                border: `1px solid ${muted ? "rgba(255,255,255,0.15)" : "rgba(34,211,238,0.5)"}`,
                borderRadius: "50%",
                width: "42px",
                height: "42px",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              {muted ? (
                /* Muted icon */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                /* Unmuted icon */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
          </div>
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
            Download Video (.{IS_IOS ? "mp4" : "webm"})
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
