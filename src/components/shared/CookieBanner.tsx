"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "calc(var(--bottombar-total) + 16px)",
      left: "50%",
      transform: "translateX(-50%)",
      width: "calc(100% - 32px)",
      maxWidth: "448px",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(99, 102, 241, 0.2)",
      borderRadius: "16px",
      padding: "16px",
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
    }}>
      <p style={{ fontSize: "13px", color: "var(--color-slate-300)", margin: 0, lineHeight: 1.5 }}>
        We use cookies to improve your experience and for analytics. By continuing to use this site, you agree to our{" "}
        <Link href="/cookie-policy" style={{ color: "var(--color-indigo-400)", textDecoration: "underline", textUnderlineOffset: "2px" }}>Cookie Policy</Link>.
      </p>
      <button 
        onClick={handleAccept}
        style={{
          backgroundColor: "var(--color-indigo-500)",
          color: "white",
          border: "none",
          padding: "10px 16px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          alignSelf: "flex-end",
          transition: "background-color 0.2s"
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--color-indigo-400)"}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "var(--color-indigo-500)"}
      >
        Got it
      </button>
    </div>
  );
}
