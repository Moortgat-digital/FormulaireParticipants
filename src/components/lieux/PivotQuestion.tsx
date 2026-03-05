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
    <div className="rounded-lg border border-lieux-gris-clair/80 bg-white px-4 py-3">
      <p className="mb-2 text-base font-semibold text-lieux-bleu">
        Le lieu est-il identique pour tous les groupes ?
      </p>
      <div className="flex gap-2">
        {OPTIONS.map(({ value, label, description }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`flex flex-1 items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors ${
              strategy === value
                ? "border-lieux-bleu bg-lieux-bleu/5"
                : "border-lieux-gris-clair bg-white hover:border-lieux-action"
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                strategy === value ? "border-lieux-bleu" : "border-lieux-gris-clair"
              }`}
            >
              {strategy === value && (
                <span className="h-2 w-2 rounded-full bg-lieux-bleu" />
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
