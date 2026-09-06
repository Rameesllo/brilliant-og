import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brilliant Event",
  description: "Brilliant Catering & Events Management",
  icons: {
    icon: "/brilliant-event-logo.svg",
    shortcut: "/brilliant-event-logo.svg",
    apple: "/brilliant-event-logo.svg",
  },
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
