"use client";

import type { FillStrategy } from "@/types/lieux";

interface PivotQuestionProps {
  strategy: FillStrategy;
  onChange: (strategy: FillStrategy) => void;
}

const OPTIONS: { value: FillStrategy; label: string; description: string }[] = [
  {
    value: "all-same",
    label: "Oui",
    description: "Un seul lieu pour toute la formation",
  },
  {
    value: "per-group",
    label: "Non",
    description: "Les lieux varient selon les groupes",
  },
];

export default function PivotQuestion({ strategy, onChange }: PivotQuestionProps) {
  return (
    <div className="rounded-lg border border-lieux-gris-clair bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-bold text-lieux-bleu">
        Le lieu est-il identique pour tous les groupes ?
      </p>
      <div className="flex gap-3">
        {OPTIONS.map(({ value, label, description }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`flex flex-1 items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
              strategy === value
                ? "border-lieux-bleu bg-lieux-bleu/5"
                : "border-lieux-gris-clair bg-white hover:border-lieux-action"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                strategy === value ? "border-lieux-bleu" : "border-lieux-gris-clair"
              }`}
            >
              {strategy === value && (
                <span className="h-2.5 w-2.5 rounded-full bg-lieux-bleu" />
              )}
            </span>
            <div>
              <p className={`text-sm font-semibold ${strategy === value ? "text-lieux-bleu" : "text-lieux-gris"}`}>
                {label}
              </p>
              <p className="text-xs text-lieux-gris">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
