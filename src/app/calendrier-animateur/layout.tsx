import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../calendrier/globals-calendrier.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mon calendrier animateur",
  description: "Calendrier des journées de formation - espace animateur",
  robots: { index: false, follow: false },
};

export default function CalendrierAnimateurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} text-cal-bleu overflow-hidden`}>
      {children}
    </div>
  );
}
