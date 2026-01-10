import type { Metadata } from "next";
import Link from "next/link";
import { Source_Sans_3, Unbounded } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import LogPanel from "./components/LogPanel";

const displayFont = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Candy Studio",
  description: "Multi-agent project runner inspired by KaibanJS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} antialiased`}>
        <div className="relative min-h-screen overflow-hidden">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="app-shell">
            <Sidebar />
            <div className="main-area">
              <header className="top-bar">
                <div className="top-title">
                  <span className="pulse-dot" />
                  Live Workspace
                </div>
                <div className="top-actions">
                  <Link className="top-link" href="/projects/new">
                    Projekt starten
                  </Link>
                  <a
                    className="top-link ghost"
                    href="https://docs.kaibanjs.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Docs
                  </a>
                </div>
              </header>
              <main className="content">{children}</main>
            </div>
          </div>
          <LogPanel />
        </div>
      </body>
    </html>
  );
}
