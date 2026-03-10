import type { Metadata } from "next";
import "../calendrier/globals-calendrier.css";

export const metadata: Metadata = {
  title: "Mon calendrier animateur",
  description: "Calendrier des journées de formation - espace animateur",
  robots: { index: false, follow: false },
};

const FONT_STACK =
  '"Avenir Next LT Pro", "Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif';

export default function CalendrierAnimateurLayout({
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
