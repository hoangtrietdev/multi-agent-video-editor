import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Silence the Turbopack/webpack config conflict from next-pwa in dev.
  turbopack: {},
  // Allow local-network IPs to receive HMR (hot-module-reload) events.
  // Add any other LAN IPs your dev machine exposes here.
  allowedDevOrigins: ["10.20.3.72"],
  // Allow picsum.photos for placeholder media thumbnails
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default withPWA(nextConfig);
