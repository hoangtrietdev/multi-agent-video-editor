"use client";
import { useOrchestrationStore } from "@/store/orchestrationStore";

export default function TopAppBar({ title }: { title?: string }) {
  const step = useOrchestrationStore((s) => s.step);

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
        {/* Logo mark */}
        <div style={{ position: "absolute", left: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #6366F1 0%, #22D3EE 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}
          >
            🎼
          </div>
        </div>

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

        {/* Right badge — step indicator */}
        <div
          style={{
            position: "absolute",
            right: 0,
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "20px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--color-indigo-400)",
            letterSpacing: "0.05em",
          }}
        >
          {stepLabel[step]}
        </div>
      </div>
    </header>
  );
}
