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

      {/*
        Shell — fills the entire screen (100dvh) and never overflows.
        The <main> inside is the only scrollable region.
      */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          width: "100%",
          maxWidth: "480px",
          margin: "0 auto",
          position: "relative",
          overflow: "hidden",
          background: "var(--color-slate-950)",
        }}
      >
        {/* Fixed top bar */}
        <TopAppBar title="Orchestra AI" />

        {/* Content area — only this region scrolls */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            /* Offset by safe-area-aware header & footer totals */
            paddingTop: "var(--topbar-total)",
            paddingBottom: "var(--bottombar-total)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </main>

        {/* Fixed bottom nav */}
        <BottomNavBar />
      </div>
    </>
  );
}
