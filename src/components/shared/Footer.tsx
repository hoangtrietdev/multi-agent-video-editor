import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{
      padding: "32px 20px 24px",
      marginTop: "auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
      fontSize: "12px",
      color: "var(--color-slate-400)",
      background: "transparent",
    }}>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/terms" style={{ color: "var(--color-slate-400)", textDecoration: "underline", textUnderlineOffset: "4px" }}>Terms of Use</Link>
        <Link href="/privacy" style={{ color: "var(--color-slate-400)", textDecoration: "underline", textUnderlineOffset: "4px" }}>Privacy Policy</Link>
        <Link href="/cookie-policy" style={{ color: "var(--color-slate-400)", textDecoration: "underline", textUnderlineOffset: "4px" }}>Cookie Policy</Link>
      </div>
      <div style={{ opacity: 0.6 }}>&copy; {new Date().getFullYear()} Orchestra AI. All rights reserved.</div>
    </footer>
  );
}
