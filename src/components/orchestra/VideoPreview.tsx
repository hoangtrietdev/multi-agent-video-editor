"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useOrchestrationStore } from "@/store/orchestrationStore";

/* Detect iOS once at module level */
const IS_IOS =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/* ------------------------------------------------------------------ */
/*  Voice Persona → Web Speech API settings                            */
/* ------------------------------------------------------------------ */
interface VoiceConfig { rate: number; pitch: number; volume: number; }

const PERSONA_VOICE: Record<string, VoiceConfig> = {
  "Cinematic":     { rate: 0.82, pitch: 0.75, volume: 0.85 },  // deep, slow, dramatic
  "Energetic":     { rate: 1.30, pitch: 1.15, volume: 1.00 },  // fast, punchy
  "Calm & Smooth": { rate: 0.72, pitch: 0.88, volume: 0.80 },  // slow, relaxed
  "Inspirational": { rate: 1.00, pitch: 1.05, volume: 0.90 },  // confident, clear
  "Playful":       { rate: 1.15, pitch: 1.25, volume: 0.90 },  // light, fun
};

/** Extract the narration text from the generated script JSON. */
function buildNarration(scriptJson: string): string {
  try {
    const d: Record<string, string> = JSON.parse(scriptJson);
    return [d.hook, d.body, d.cta].filter(Boolean).join(". ");
  } catch {
    return scriptJson.slice(0, 400); // raw fallback
  }
}

export default function VideoPreview() {
  const generatedScript   = useOrchestrationStore((s) => s.generatedScript);
  const generatedVideoUrl = useOrchestrationStore((s) => s.generatedVideoUrl);
  const config            = useOrchestrationStore((s) => s.config);
  const setStep           = useOrchestrationStore((s) => s.setStep);
  const resetAgents       = useOrchestrationStore((s) => s.resetAgents);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const utterRef  = useRef<SpeechSynthesisUtterance | null>(null);

  const [playing, setPlaying]             = useState(false);
  const [muted,   setMuted]               = useState(true);
  const [shareMsg, setShareMsg]           = useState("");
  const [downloadReady, setDownloadReady] = useState(false);
  const [voiceActive, setVoiceActive]     = useState(false);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Voice persona narration — video-position-aware                     */
  /* ------------------------------------------------------------------ */

  /**
   * Start narration at a given playback position.
   *
   * @param seekRatio  0 = start of script, 0.5 = midpoint, etc.
   *   Matches video.currentTime / video.duration so voice stays in sync
   *   with the image timeline after mute/unmute.
   */
  const startNarration = useCallback((seekRatio = 0) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const fullText = buildNarration(generatedScript);
    if (!fullText) return;

    /* ── Seek to the right position in the script ── */
    let text = fullText;
    if (seekRatio > 0.03) {                        // >3% in — don't bother seeking for tiny offsets
      const approxChar = Math.floor(seekRatio * fullText.length);

      // Walk backwards from approxChar to find the start of the nearest sentence
      // (period / ! / ? followed by a space, or start of a parenthesised clause).
      const sentenceBreak = /[.!?]\s+/g;
      let lastBreak = 0;
      let m: RegExpExecArray | null;
      while ((m = sentenceBreak.exec(fullText)) !== null) {
        if (m.index >= approxChar) break;          // overshot — use lastBreak
        lastBreak = m.index + m[0].length;         // char AFTER the punctuation + space
      }
      text = fullText.slice(lastBreak);
    }

    const utter  = new SpeechSynthesisUtterance(text);
    const vCfg   = PERSONA_VOICE[config.voicePersona] ?? PERSONA_VOICE["Cinematic"];
    utter.rate   = vCfg.rate;
    utter.pitch  = vCfg.pitch;
    utter.volume = vCfg.volume;
    utter.lang   = "en-US";

    utter.onstart = () => setVoiceActive(true);
    utter.onend   = () => setVoiceActive(false);
    utter.onerror = () => setVoiceActive(false);

    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [generatedScript, config.voicePersona]);

  const stopNarration = useCallback(() => {
    window.speechSynthesis?.cancel();
    setVoiceActive(false);
  }, []);

  // Auto-load the generated video
  useEffect(() => {
    if (generatedVideoUrl && videoRef.current) {
      videoRef.current.load();
      setDownloadReady(true);
    }
  }, [generatedVideoUrl]);

  // Keep the DOM video element in sync with muted state
  // Sync video element muted attribute whenever the muted state changes
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  /**
   * Play / Pause
   * Always starts narration from the very beginning when pressing Play
   * (video just started from 0, so seekRatio = 0).
   */
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      stopNarration();
    } else {
      videoRef.current.play().catch(() => {});
      if (!muted) startNarration(0);              // fresh start — in sync with video at t=0
    }
    setPlaying((p) => !p);
  };

  /**
   * Mute / Unmute
   * Controls BOTH the video's baked-in music track AND the voice narration.
   * - Muting   → stop narration immediately.
   * - Unmuting → resume narration from the SAME position the video is at.
   *   We compute seekRatio = currentTime / duration and pass it to
   *   startNarration so it slices the text to the matching sentence.
   */
  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (nextMuted) {
      stopNarration();
    } else if (playing && videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      const ratio = duration > 0 ? currentTime / duration : 0;
      startNarration(ratio);                     // seek to matching script position
    }
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <p className="text-body-sm" style={{ color: "var(--color-slate-400)", margin: 0 }}>
            {scriptData.title ?? config.narrativeTheme} · {config.voicePersona}
          </p>
          {/* Voice-active pill */}
          {voiceActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "2px 10px",
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.35)",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--color-indigo-400)",
              }}
            >
              {/* Animated waveform dots */}
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.span
                  key={i}
                  animate={{ scaleY: [1, 2.5, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay }}
                  style={{
                    display: "inline-block",
                    width: "3px",
                    height: "10px",
                    background: "var(--color-indigo-400)",
                    borderRadius: "2px",
                    transformOrigin: "center",
                  }}
                />
              ))}
              {config.voicePersona} voice
            </motion.div>
          )}
        </div>
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
