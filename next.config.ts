import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude ffmpeg packages from Turbopack bundling (they use dynamic require)
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "fluent-ffmpeg", "bcryptjs"],

  // Allow large file uploads (WAV files can be 100MB+)
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },

  // Allow images from CloudFront CDN and S3.
  // unoptimized: true bypasses the /_next/image proxy, which fails on
  // iOS Safari / Capacitor WebView when fetching remote CDN images.
  // Since artwork is already optimized and cached by CloudFront, the
  // Next.js image optimizer adds overhead without benefit.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "hymnotic-media.s3.us-west-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },

  // Headers for API CORS and streaming support
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
