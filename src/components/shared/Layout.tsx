import Head from "next/head";
import { ReactNode } from "react";
import TopAppBar from "@/components/shared/TopAppBar";
import BottomNavBar from "@/components/shared/BottomNavBar";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({
  children,
  title = "Orchestra AI",
  description = "AI-powered automated video production studio",
}: LayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#6366F1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Orchestra AI" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Head>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          background: "var(--color-slate-950)",
          maxWidth: "480px",
          margin: "0 auto",
          position: "relative",
        }}
      >
        {/* Top App Bar */}
        <TopAppBar title={title === "Orchestra AI" ? "Orchestra AI" : title} />

        {/* Main content — scrollable, padded above TopBar and below BottomBar */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            paddingTop: "64px",
            paddingBottom: "80px",
          }}
        >
          {children}
        </main>

        {/* Bottom Nav Bar */}
        <BottomNavBar />
      </div>
    </>
  );
}
