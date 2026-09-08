import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brilliant Event",
  description: "Brilliant Catering & Events Management",
  manifest: "/manifest.webmanifest",
  applicationName: "Brilliant Event",
  appleWebApp: {
    capable: true,
    title: "Brilliant Event",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/brilliant-event-logo.svg",
    shortcut: "/brilliant-event-logo.svg",
    apple: "/brilliant-event-logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-white text-[#111827] antialiased">
        {children}
      </body>
    </html>
  );
}
