import Head from "next/head";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | Orchestra AI</title>
      </Head>
      <div style={{ padding: "24px", color: "var(--color-slate-300)" }}>
        <h1 style={{ color: "var(--color-slate-50)", fontSize: "24px", marginBottom: "16px" }}>Privacy Policy</h1>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>1. Information We Collect</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          We collect information you provide directly to us, such as when you create an account, submit content (images, audio, text) for video generation, or communicate with us.
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>2. How We Use Your Information</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          We use the information we collect to provide, maintain, and improve our services, including to generate videos based on your inputs and preferences.
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>3. Data Storage and Security</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          We implement reasonable security measures to protect your personal information. Video processing occurs locally on your device where possible, reducing the need to store your sensitive media files on our servers.
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>4. Third-Party Services</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          We may use third-party AI services to assist in processing prompts and generating media. These services are bound by their own privacy policies.
        </p>
      </div>
    </>
  );
}
