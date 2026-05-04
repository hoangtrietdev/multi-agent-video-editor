import Head from "next/head";

export default function CookiePolicy() {
  return (
    <>
      <Head>
        <title>Cookie Policy | Orchestra AI</title>
      </Head>
      <div style={{ padding: "24px", color: "var(--color-slate-300)" }}>
        <h1 style={{ color: "var(--color-slate-50)", fontSize: "24px", marginBottom: "16px" }}>Cookie Policy</h1>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>What Are Cookies</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide a better user experience.
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>How We Use Cookies</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          We use cookies and similar tracking technologies to track the activity on our service and hold certain information. We use them to remember your preferences, understand how you interact with our app, and improve the application.
        </p>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>Types of Cookies We Use</h2>
        <ul style={{ paddingLeft: "20px", marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          <li style={{ marginBottom: "8px" }}><strong>Essential Cookies:</strong> Required for the operation of the application.</li>
          <li style={{ marginBottom: "8px" }}><strong>Preference Cookies:</strong> Used to remember your settings and preferences.</li>
          <li style={{ marginBottom: "8px" }}><strong>Analytics Cookies:</strong> Help us understand how visitors interact with the app.</li>
        </ul>
        <h2 style={{ color: "var(--color-slate-50)", fontSize: "18px", marginTop: "24px", marginBottom: "12px" }}>Managing Cookies</h2>
        <p style={{ marginBottom: "12px", fontSize: "14px", lineHeight: "1.6" }}>
          You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.
        </p>
      </div>
    </>
  );
}
