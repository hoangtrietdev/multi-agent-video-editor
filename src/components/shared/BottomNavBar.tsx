"use client";
import { useOrchestrationStore, FlowStep } from "@/store/orchestrationStore";

interface NavItem {
  id: FlowStep;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const navItems: NavItem[] = [
  {
    id: "select",
    label: "Media",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366F1" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    id: "configure",
    label: "Config",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366F1" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: "orchestrate",
    label: "Flow",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366F1" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    id: "preview",
    label: "Preview",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366F1" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
      </svg>
    ),
  },
];

export default function BottomNavBar() {
  const step    = useOrchestrationStore((s) => s.step);
  const setStep = useOrchestrationStore((s) => s.setStep);

  return (
    <nav
      aria-label="Bottom navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "480px",
        /* Total height = visible nav + device bottom inset (home indicator) */
        height: "var(--bottombar-total)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",  /* buttons sit at top, safe-area at bottom */
        justifyContent: "space-around",
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(99, 102, 241, 0.10)",
        /* Bottom padding = home-indicator / gesture bar inset */
        paddingBottom: "var(--sab)",
      }}
    >
      {navItems.map((item) => {
        const active = step === item.id;
        return (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            onClick={() => setStep(item.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 20px",
              borderRadius: "12px",
              transition: "background 0.2s",
              position: "relative",
            }}
          >
            {/* Active indicator ring */}
            {active && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "12px",
                  background: "rgba(99,102,241,0.10)",
                }}
              />
            )}
            {item.icon(active)}
            <span
              style={{
                fontSize: "10px",
                fontWeight: active ? 700 : 500,
                color: active ? "var(--color-indigo)" : "var(--color-slate-400)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {item.label}
            </span>
            {/* Dot indicator */}
            {active && (
              <div
                style={{
                  position: "absolute",
                  top: "4px",
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "var(--color-indigo)",
                  boxShadow: "0 0 8px rgba(99,102,241,0.8)",
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
