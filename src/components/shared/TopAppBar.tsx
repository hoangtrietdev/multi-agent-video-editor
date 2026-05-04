"use client";
import Image from "next/image";
import { useRouter } from "next/router";
import { useOrchestrationStore } from "@/store/orchestrationStore";

export default function TopAppBar({ title }: { title?: string }) {
  const step = useOrchestrationStore((s) => s.step);
  const appMode = useOrchestrationStore((s) => s.appMode);
  const setAppMode = useOrchestrationStore((s) => s.setAppMode);
  const router = useRouter();
  const isHome = router.pathname === "/";

  const stepLabel: Record<typeof step, string> = {
    select: "Select Media",
    configure: "Configure",
    orchestrate: "Orchestrating",
    preview: "Preview",
  };

  return (
    <header
      aria-label="Top app bar"
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "480px",
        /* Total height = visible bar + device top inset (notch / Dynamic Island) */
        height: "var(--topbar-total)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",   /* push content below the safe-area zone */
        justifyContent: "center",
        /* paddingTop pushes content down below the notch/Dynamic Island */
        paddingTop: "var(--sat)",
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingBottom: "0",
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(99, 102, 241, 0.12)",
      }}
    >
      {/* Inner row — sits below the safe-area zone */}
      <div
        style={{
          width: "100%",
          height: "var(--topbar-h)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Logo mark or Back button */}
        {isHome ? (
          <div style={{ position: "absolute", left: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image src="/icon-192.svg" alt="Logo" width={32} height={32} priority />
            </div>
          </div>
        ) : (
          <div style={{ position: "absolute", left: 0, display: "flex", alignItems: "center" }}>
            <button
              onClick={() => router.push("/")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-slate-300)",
                cursor: "pointer",
                padding: "8px 8px 8px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              aria-label="Go back"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Centered title */}
        <h1
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-slate-50)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {title ?? stepLabel[step]}
        </h1>

        {/* Right mode toggle */}
        {isHome && (
          <button
            onClick={() => setAppMode(appMode === "video" ? "comic" : "video")}
            style={{
              position: "absolute",
              right: 0,
              background: appMode === "video" ? "rgba(99,102,241,0.12)" : "rgba(245,158,11,0.12)",
              border: `1px solid ${appMode === "video" ? "rgba(99,102,241,0.25)" : "rgba(245,158,11,0.25)"}`,
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "11px",
              fontWeight: 700,
              color: appMode === "video" ? "var(--color-indigo-400)" : "var(--color-amber-400)",
              letterSpacing: "0.05em",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {appMode === "video" ? "🎬 Video" : "🗯 Comic"}
          </button>
        )}
      </div>
    </header>
  );
}
