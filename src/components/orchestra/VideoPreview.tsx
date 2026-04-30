"use client";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence }      from "framer-motion";
import { useOrchestrationStore }        from "@/store/orchestrationStore";

const IS_IOS =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/* ── Save to device / Photos ── */
async function saveToGallery(
  url: string,
  filename: string,
  mimeType: string,
  onFallback: (u: string, n: string) => void,
) {
  if (typeof navigator !== "undefined" && navigator.canShare) {
    try {
      const blob = await fetch(url).then((r) => r.blob());
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Video" });
        return;
      }
    } catch { /* fall through */ }
  }
  onFallback(url, filename);
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function VideoPreview() {
  const generatedScript   = useOrchestrationStore((s) => s.generatedScript);
  const generatedVideoUrl = useOrchestrationStore((s) => s.generatedVideoUrl);
  const config            = useOrchestrationStore((s) => s.config);
  const setStep           = useOrchestrationStore((s) => s.setStep);
  const resetAgents       = useOrchestrationStore((s) => s.resetAgents);

  const videoRef = useRef<HTMLVideoElement>(null);

  const [playing,       setPlaying]       = useState(false);
  const [muted,         setMuted]         = useState(false);
  const [shareMsg,      setShareMsg]      = useState("");
  const [downloadReady, setDownloadReady] = useState(false);
  const [saving,        setSaving]        = useState(false);

  const isMemory   = config.videoMode === "memory";
  const hasVoice   = config.includeVoice;
  const accentGrad = isMemory
    ? "linear-gradient(135deg,#FB7185 0%,#6366F1 100%)"
    : "linear-gradient(135deg,#6366F1 0%,#22D3EE 100%)";

  /* Auto-load video when URL is ready */
  useEffect(() => {
    if (generatedVideoUrl && videoRef.current) {
      videoRef.current.load();
      setDownloadReady(true);
    }
  }, [generatedVideoUrl]);

  /* Keep DOM muted attribute synced */
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  /* ── Play / Pause ── */
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); }
    else         { videoRef.current.play().catch(() => {}); }
    setPlaying((p) => !p);
  };

  /* ── Mute / Unmute ── (controls the baked audio track in the video) ── */
  const toggleMute = () => setMuted((m) => !m);

  /* ── Save to device ── */
  const handleSave = async () => {
    if (!generatedVideoUrl) return;
    setSaving(true);
    try {
      const ext  = IS_IOS ? "mp4" : "webm";
      const mime = IS_IOS ? "video/mp4" : "video/webm";
      const name = `${isMemory ? "memory" : "video"}-${Date.now()}.${ext}`;
      await saveToGallery(generatedVideoUrl, name, mime, (url, n) => {
        const a = document.createElement("a");
        a.href = url; a.download = n; a.click();
      });
      setShareMsg(IS_IOS
        ? "📸 Tap 'Save Video' in the share sheet → Photos"
        : "✅ Download started!");
    } catch {
      setShareMsg("⚠️ Tap Save or try again");
    } finally {
      setSaving(false);
      setTimeout(() => setShareMsg(""), 6000);
    }
  };

  /* Parse script overlay text */
  let scriptData: Record<string, string> = {};
  try { scriptData = JSON.parse(generatedScript); } catch { /* raw text */ }

  const isBlob = generatedVideoUrl?.startsWith("blob:");

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className="text-display" style={{ margin: 0 }}>
            {isMemory ? "💝 Your Memory" : "Preview"}
          </h2>
          <p className="text-body-sm" style={{ color: "var(--color-slate-400)", margin: "2px 0 0" }}>
            {scriptData.title ?? config.narrativeTheme}
            {" · "}{config.voicePersona}
            {" · "}{config.voiceGender === "female" ? "♀" : "♂"}
            {" · "}🎵{hasVoice ? " + 🎙" : ""}
          </p>
        </div>

        {isBlob && (
          <div style={{
            padding: "4px 10px",
            background: "rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.2)",
            borderRadius: "20px",
            fontSize: "11px", fontWeight: 600,
            color: "var(--color-cyan)", flexShrink: 0,
          }}>
            ✅ {IS_IOS ? "MP4" : "WebM"}
          </div>
        )}
      </div>

      {/* ── 9:16 video player ── */}
      <div style={{
        position: "relative", width: "100%", maxWidth: "220px",
        margin: "0 auto", aspectRatio: "9/16",
        borderRadius: "18px", overflow: "hidden",
        border: "1px solid var(--color-slate-800)",
        boxShadow: isMemory
          ? "0 0 30px rgba(251,113,133,0.25)"
          : "0 0 30px rgba(99,102,241,0.2)",
        background: "#020617", flexShrink: 0,
      }}>
        {generatedVideoUrl ? (
          <video
            ref={videoRef}
            id="preview-video"
            loop playsInline
            muted={muted}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src={generatedVideoUrl} type={IS_IOS ? "video/mp4" : "video/webm"} />
            <source src={generatedVideoUrl} />
          </video>
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "10px",
          }}>
            <div style={{ fontSize: "32px" }}>{isMemory ? "💝" : "🎬"}</div>
            <p className="text-body-sm" style={{ color: "var(--color-slate-400)", margin: 0 }}>
              Preparing preview…
            </p>
          </div>
        )}

        {/* Cinematic gradients */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          viewBox="0 0 220 391" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pvtg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#020617" stopOpacity="0.65" />
              <stop offset="30%" stopColor="#020617" stopOpacity="0"    />
            </linearGradient>
            <linearGradient id="pvbg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#020617" stopOpacity="0"    />
              <stop offset="65%" stopColor="#020617" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <rect width="220" height="156" fill="url(#pvtg)" />
          <rect y="235" width="220" height="156" fill="url(#pvbg)" />
        </svg>

        {/* Hook caption overlay */}
        {scriptData.hook && (
          <div style={{
            position: "absolute", top: "12px", left: "10px", right: "10px",
            fontWeight: 700, fontSize: "11px", color: "white",
            textShadow: "0 2px 8px rgba(0,0,0,0.9)", lineHeight: "1.4",
          }}>
            {scriptData.hook}
          </div>
        )}

        {/* CTA caption overlay */}
        {scriptData.cta && (
          <div style={{
            position: "absolute", bottom: "48px", left: "10px", right: "10px",
            fontWeight: 700, fontSize: "12px", color: "white",
            textShadow: "0 2px 8px rgba(0,0,0,0.9)",
          }}>
            {scriptData.cta}
          </div>
        )}

        {/* Mode badge */}
        <div style={{
          position: "absolute", top: "10px", right: "10px",
          background: isMemory ? "rgba(251,113,133,0.8)" : "rgba(99,102,241,0.85)",
          backdropFilter: "blur(8px)", borderRadius: "6px",
          padding: "2px 6px", fontSize: "9px", fontWeight: 700,
          color: "white", letterSpacing: "0.05em",
        }}>
          {isMemory ? "💝 MEMORY" : "AI GEN"}
        </div>

        {/* Audio badge — baked music + voice indicator */}
        <div style={{
          position: "absolute", bottom: "50px", right: "8px",
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
          borderRadius: "6px", padding: "2px 6px",
          fontSize: "9px", color: "rgba(255,255,255,0.7)",
        }}>
          🎵{hasVoice ? " + 🎙" : ""}
        </div>

        {/* Playback controls */}
        {generatedVideoUrl && (
          <div style={{
            position: "absolute", left: "50%", bottom: "10px",
            transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            {/* Play / Pause */}
            <button
              id="btn-play-pause"
              aria-label={playing ? "Pause" : "Play"}
              onClick={togglePlay}
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "24px", padding: "8px 18px",
                color: "white", fontSize: "12px", fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center",
                gap: "6px", whiteSpace: "nowrap",
              }}
            >
              {playing
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
              {playing ? "Pause" : "Play"}
            </button>

            {/* Mute / Unmute — controls baked audio in the video file */}
            <button
              id="btn-mute"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={toggleMute}
              style={{
                background: muted ? "rgba(255,255,255,0.10)" : "rgba(34,211,238,0.25)",
                backdropFilter: "blur(12px)",
                border: `1px solid ${muted ? "rgba(255,255,255,0.15)" : "rgba(34,211,238,0.5)"}`,
                borderRadius: "50%", width: "36px", height: "36px",
                color: "white", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.2s",
              }}
            >
              {muted
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
          </div>
        )}
      </div>

      {/* Audio info note */}
      <div style={{
        padding: "7px 12px",
        background: "rgba(99,102,241,0.05)",
        border: "1px solid rgba(99,102,241,0.12)",
        borderRadius: "10px",
      }}>
        <p className="text-mono" style={{ margin: 0, color: "var(--color-slate-500)", textAlign: "center" }}>
          {hasVoice
            ? `🎵 Music + 🎙 ${config.voiceGender === "female" ? "♀" : "♂"} ${config.voicePersona} voice — baked into video`
            : "🎵 Background music — baked into video"}
        </p>
      </div>

      {/* Share message */}
      <AnimatePresence>
        {shareMsg && (
          <motion.p
            key="sm"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: "center", color: "var(--color-cyan)",
              fontWeight: 600, margin: 0, fontSize: "12px",
              padding: "8px 12px",
              background: "rgba(34,211,238,0.06)",
              border: "1px solid rgba(34,211,238,0.2)",
              borderRadius: "10px",
            }}
          >
            {shareMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {downloadReady && isBlob && (
          <button
            id="btn-save-to-device"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ background: accentGrad, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {IS_IOS ? "Save to Photos 📸" : "Save to Device 💾"}
              </>
            )}
          </button>
        )}

        <button
          id="btn-refine"
          className="btn-ghost"
          onClick={() => { resetAgents(); setStep("configure"); }}
        >
          ← Refine
        </button>

        <button
          id="btn-start-over"
          className="btn-ghost"
          onClick={() => setStep("select")}
          style={{ borderColor: "transparent", color: "var(--color-slate-600)", fontSize: "12px", height: "36px" }}
        >
          Start Over
        </button>
      </div>
    </motion.section>
  );
}
