"use client";

import type { SaveResult } from "@/types/lieux";

interface ErrorBannerProps {
  results: SaveResult[];
  onRetry: () => void;
}

export default function ErrorBanner({ results, onRetry }: ErrorBannerProps) {
  const failures = results.filter((r) => !r.success);
  if (failures.length === 0) return null;

  return (
    <div className="rounded-md border border-lieux-cta/30 bg-lieux-cta/5 px-4 py-3">
      <div className="flex items-start gap-2">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-lieux-cta"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="text-base font-semibold text-lieux-cta">
            {failures.length} journée{failures.length > 1 ? "s" : ""} en erreur
          </p>
          <ul className="mt-1 space-y-0.5">
            {failures.map((f) => (
              <li key={f.journeeId} className="text-sm text-lieux-cta/80">
                {f.journeeId.slice(0, 8)}... : {f.error || "Erreur inconnue"}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-md border border-lieux-cta/30 bg-white px-3 py-1.5 text-sm font-semibold text-lieux-cta transition-colors hover:bg-lieux-cta/5"
          >
            Réessayer les journées en erreur
          </button>
        </div>
      </div>
    </div>
  );
}
