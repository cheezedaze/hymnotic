import type { Metadata, Viewport } from "next";
import fs from "fs";
import path from "path";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hymnotic",
  description: "Spiritual music for the soul",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hymnotic",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141A24",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // #region agent log
  try {
    const dir = path.join(process.cwd(), ".cursor");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(
      path.join(dir, "debug.log"),
      JSON.stringify({
        location: "layout.tsx:render",
        message: "RootLayout server render",
        data: {},
        timestamp: Date.now(),
        hypothesisId: "H0",
      }) + "\n"
    );
  } catch (_) {}
  // #endregion
  return (
    <html lang="en">
      <head>
        {/* #region agent log - runs before React, confirms HTML delivered */}
        <script
          dangerouslySetInnerHTML={{
            __html: `fetch("/api/debug-log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:"layout:inline-script",message:"HTML parsed, script ran",data:{},timestamp:Date.now(),hypothesisId:"H0a"})}).catch(function(){});`,
          }}
        />
        {/* #endregion */}
      </head>
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
