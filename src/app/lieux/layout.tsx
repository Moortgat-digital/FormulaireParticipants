import type { Metadata } from "next";
import "./globals-lieux.css";

export const metadata: Metadata = {
  title: "Lieux de formation",
  description: "Formulaire de saisie des lieux de formation",
  robots: { index: false, follow: false },
};

const FONT_STACK =
  '"Avenir Next LT Pro", "Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif';

export default function LieuxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ fontFamily: FONT_STACK }} className="min-h-screen bg-lieux-blanc text-lieux-bleu">
      {children}
    </div>
  );
}
