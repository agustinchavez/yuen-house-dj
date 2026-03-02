import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large file uploads (500MB audio files)
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
