import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Verdikt — Trustless AI Verdicts on Somnia",
  description: "Escrow disputes resolved by Somnia's consensus-validated on-chain AI, with real audit receipts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
