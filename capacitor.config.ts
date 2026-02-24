import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hymnotic.app",
  appName: "HYMNZ",
  webDir: "public",

  server: {
    // TODO: Replace with your Vercel production URL after deploying
    url: "https://hymnotic.vercel.app",
    allowNavigation: [
      "hymnotic.vercel.app",
      "*.vercel.app",
      "*.cloudfront.net",
      "hymnotic-media.s3.us-west-2.amazonaws.com",
    ],
  },

  ios: {
    // Use HTTPS scheme so the web view loads the Vercel URL as same-origin
    // (avoids CORS issues vs the default capacitor:// scheme)
    scheme: "https",
    allowsLinkPreview: false,
  },
};

export default config;
