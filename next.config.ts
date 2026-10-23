import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only "N" badge: keep it off the bottom-left, where the admin sidebar's Setup Guide sits.
  devIndicators: { position: "bottom-right" },
  experimental: {
    serverActions: {
      // Product saves carry up to 10 MB of images (lib/validations/product.ts PRODUCT_LIMITS.uploadBytes,
      // each image ≤ 1 MB); leave headroom for the other form fields. Every action still checks its own limits.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
