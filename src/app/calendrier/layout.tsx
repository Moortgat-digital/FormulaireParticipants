import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals-calendrier.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Calendrier des formations",
  description: "Vue calendrier des journées de formation",
  robots: { index: false, follow: false },
};

export default function CalendrierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} bg-cal-blanc text-cal-bleu`}>
      {children}
    </div>
  );
}
