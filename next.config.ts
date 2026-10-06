import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only "N" badge: keep it off the bottom-left, where the admin sidebar's Setup Guide sits.
  devIndicators: { position: "bottom-right" },
  experimental: {
    serverActions: {
      // Brand images are capped at 2 MB (lib/validations/brand.ts); leave headroom for the other form fields.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
