import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hymnz.app",
  appName: "HYMNZ",
  webDir: "android-webdir",

  server: {
    // TODO: Replace with your Vercel production URL after deploying
    url: "https://www.hymnz.com",
    allowNavigation: [
      "hymnz.com",
      "*.hymnz.com",
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

  android: {
    allowMixedContent: false,
  },
};

export default config;
