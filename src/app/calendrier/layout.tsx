import type { Metadata } from "next";
import "./globals-calendrier.css";

export const metadata: Metadata = {
  title: "Calendrier des formations",
  description: "Vue calendrier des journées de formation",
  robots: { index: false, follow: false },
};

const FONT_STACK =
  '"Avenir Next LT Pro", "Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif';

export default function CalendrierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ fontFamily: FONT_STACK }}
      className="bg-cal-blanc text-cal-bleu"
    >
      {children}
    </div>
  );
}
