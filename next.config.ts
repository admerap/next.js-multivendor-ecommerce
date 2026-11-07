import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only "N" badge: keep it off the bottom-left, where the admin sidebar's Setup Guide sits.
  devIndicators: { position: "bottom-right" },
  // Don't print Server Action arguments in the terminal: they include passwords (sign in, change password) and
  // other form data.
  logging: { serverFunctions: false },
  // The customer area moved from /account/* to /dashboard/* — old links (bookmarks, emails) keep working.
  async redirects() {
    return [
      { source: "/account", destination: "/dashboard", permanent: true },
      { source: "/account/:path*", destination: "/dashboard/:path*", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      // Product saves carry up to 10 MB of images (lib/validations/product.ts PRODUCT_LIMITS.uploadBytes,
      // each image ≤ 1 MB); leave headroom for the other form fields. Every action still checks its own limits.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
