import Head from "next/head";

export default function TermsOfUse() {
  return (
    <>
      <Head>
        <title>Terms of Use | Orchestra AI</title>
      </Head>
      <div style={{ padding: "24px", color: "var(--color-slate-300)" }}>
        <h1 style={{ color: "var(--color-slate-50)", fontSize: "24px", marginBottom: "16px" }}>Terms of Use</h1>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>1. Acceptance of Terms</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          By accessing and using Orchestra AI, you agree to be bound by these Terms of Use and all applicable laws and regulations.
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>2. Use License</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          Permission is granted to temporarily use this application for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>3. User Content</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          You retain all your ownership rights in your User Content. By submitting content to Orchestra AI, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and distribute your content in connection with the service.
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>4. Disclaimer</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          The materials on Orchestra AI are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability.
        </p>
      </div>
    </>
  );
}
