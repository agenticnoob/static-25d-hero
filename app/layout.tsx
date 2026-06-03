import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spatial — Agentic Infrastructure",
  description:
    "Spatial interfaces for agentic systems — a quiet control plane for observing, composing, and scaling AI workflows.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#05060A" />
        <link rel="icon" href="data:," />
      </head>
      <body className="bg-[#05060A] text-[#EDE9E3] antialiased overflow-hidden overscroll-none touch-manipulation">
        {children}
      </body>
    </html>
  );
}
