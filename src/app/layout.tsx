import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegistration } from "@/components/layout/ServiceWorkerRegistration";
import { NativeBootstrap } from "@/components/layout/NativeBootstrap";


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
  title: "HYMNZ",
  description: "Spiritual music for the soul",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HYMNZ",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  other: process.env.NEXT_PUBLIC_IOS_APP_ID
    ? { "apple-itunes-app": `app-id=${process.env.NEXT_PUBLIC_IOS_APP_ID}` }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#141A24",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        <ServiceWorkerRegistration />
        <NativeBootstrap />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
