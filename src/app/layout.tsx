import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leadsfinder - find local businesses that need your help",
  description: "Search Google Maps by keyword and location, pull contact details, and rank every business by how good a prospect it is.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F2F4F1" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
