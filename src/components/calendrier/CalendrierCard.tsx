"use client";

import type { CalendrierJournee } from "@/types/calendrier";

// Map code prefixes to colors for visual distinction
function codeColor(code: string): { bg: string; text: string } {
  const prefix = code.replace(/\d+/g, "").toUpperCase();
  switch (prefix) {
    case "TR":
      return { bg: "bg-blue-100", text: "text-blue-800" };
    case "CO":
      return { bg: "bg-purple-100", text: "text-purple-800" };
    case "WS":
      return { bg: "bg-amber-100", text: "text-amber-800" };
    case "SE":
      return { bg: "bg-teal-100", text: "text-teal-800" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-700" };
  }
}

function etatBadge(etat: string) {
  switch (etat) {
    case "En cours":
      return { bg: "bg-green-100 text-green-800 border-green-300", label: "En cours" };
    case "Clôturée":
      return { bg: "bg-amber-100 text-amber-800 border-amber-300", label: "Clôturée" };
    case "Programmée":
      return { bg: "bg-sky-100 text-sky-800 border-sky-300", label: "Programmée" };
    default:
      if (!etat) return null;
      return { bg: "bg-gray-100 text-gray-600 border-gray-300", label: etat };
  }
}

const PANOORAMA_BASE = "https://panoorama.moortgat.com/journee?recordId=";

interface Props {
  journee: CalendrierJournee;
  compact: boolean;
}

export default function CalendrierCard({ journee, compact }: Props) {
  const cc = codeColor(journee.code);
  const badge = etatBadge(journee.etat);
  const panooramaUrl = `${PANOORAMA_BASE}${journee.id}`;

  // ── Compact card (month view) ──
  if (compact) {
    return (
      <div className="relative group rounded bg-white border border-cal-gris-clair px-1.5 py-1 hover:shadow-sm transition-shadow cursor-default">
        <div className="flex items-center gap-1">
          <span
            className={`text-[10px] font-bold px-1 rounded ${cc.bg} ${cc.text}`}
          >
            {journee.code}
          </span>
          {journee.heure && (
            <span className="text-[10px] text-cal-gris">
              {journee.heure}{journee.heureFin ? ` – ${journee.heureFin}` : ""}
            </span>
          )}
          {journee.hasEvaluations && (
            <span className="ml-auto text-[10px]" title="Évaluations à chaud remplies">
              ✒️✅
            </span>
          )}
        </div>
        <div className="text-[10px] leading-tight truncate mt-0.5 text-cal-bleu font-medium">
          {journee.formationNom}
        </div>
        {/* Hover popover with ouvrir link */}
        <a
          href={panooramaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden group-hover:inline-block absolute top-0 right-0 mt-[-4px] mr-[-4px] text-[9px] bg-cal-action text-white rounded px-1 py-0.5 no-underline hover:bg-cal-bleu transition-colors z-10"
        >
          Ouvrir
        </a>
      </div>
    );
  }

  // ── Full card (week view) ──
  return (
    <div className="relative group rounded-lg bg-white border border-cal-gris-clair p-2.5 hover:shadow-md transition-shadow cursor-default">
      {/* Top row: code + time + evaluations */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded ${cc.bg} ${cc.text}`}
          >
            {journee.code}
          </span>
          {journee.heure && (
            <span className="text-xs text-cal-gris">
              {journee.heure}{journee.heureFin ? ` – ${journee.heureFin}` : ""}
            </span>
          )}
        </div>
        {journee.hasEvaluations && (
          <span className="text-xs" title="Évaluations à chaud remplies">
            ✒️✅
          </span>
        )}
      </div>

      {/* Formation name */}
      <div className="text-sm font-semibold leading-tight text-cal-bleu mb-1">
        {journee.formationNom}
      </div>

      {/* Groupe */}
      {journee.groupeNom && (
        <div className="text-xs text-cal-gris mb-1 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 opacity-50">
            <path d="M2 2h12v12H2z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {journee.groupeNom}
        </div>
      )}

      {/* Animateur */}
      {journee.animateur && (
        <div className="text-xs text-cal-gris mb-1.5 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 opacity-50">
            <circle cx="8" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span className="italic">animée par {journee.animateur}</span>
        </div>
      )}

      {/* Status badge */}
      {badge && (
        <span
          className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border ${badge.bg}`}
        >
          {badge.label}
        </span>
      )}

      {/* Ouvrir button */}
      <a
        href={panooramaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 text-[10px] font-medium bg-cal-action text-white rounded px-2 py-0.5 no-underline opacity-0 group-hover:opacity-100 hover:bg-cal-bleu transition-all"
      >
        Ouvrir ↗
      </a>
    </div>
  );
}
