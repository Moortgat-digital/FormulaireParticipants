"use client";

import type { Journee, JourneeFormState, LieuData, JourneeStrategy, FieldErrors } from "@/types/lieux";
import LieuFields from "./LieuFields";
import StatusBadge from "./StatusBadge";

interface JourneeRowProps {
  journee: Journee;
  journeeState: JourneeFormState;
  index: number;
  isFirst: boolean;
  groupId: string;
  onStrategyChange: (journeeId: string, strategy: JourneeStrategy) => void;
  onFieldChange: (journeeId: string, field: keyof LieuData, value: string) => void;
  errors?: FieldErrors;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  if (!iso || !iso.includes("T")) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function JourneeRow({
  journee,
  journeeState,
  index,
  isFirst,
  groupId,
  onStrategyChange,
  onFieldChange,
  errors,
}: JourneeRowProps) {
  const isSameAsPrevious = journeeState.strategy === "same-as-previous";
  const isDistanciel = journee.mode === "Distanciel";

  const dateLabel = formatDate(journee.dateDebut);
  const timeStart = formatTime(journee.dateDebut);
  const timeEnd = formatTime(journee.dateFin);
  const timeRange = timeStart && timeEnd ? `${timeStart} à ${timeEnd}` : "";

  return (
    <div className="rounded-md border border-lieux-gris-clair/80 bg-lieux-blanc p-3">
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-lieux-bleu">
            {journee.code || `Journée ${index + 1}`}
            {journee.nom && (
              <span className="ml-1.5 font-normal text-lieux-gris">— {journee.nom}</span>
            )}
            {journee.mode && (
              <span className="ml-1.5 rounded bg-lieux-gris-clair/40 px-1.5 py-0.5 text-xs font-normal text-lieux-gris">
                {journee.mode}
              </span>
            )}
          </p>
          <p className="text-xs text-lieux-gris">
            {dateLabel}
            {timeRange && <span className="ml-1">— {timeRange}</span>}
          </p>
        </div>
        <StatusBadge prefilled={journeeState.prefilled} dirty={journeeState.dirty} />
      </div>

      {/* Distanciel: no address needed */}
      {isDistanciel ? (
        <div className="flex items-center gap-2 rounded-md bg-lieux-action/5 border border-lieux-action/15 px-3 py-2">
          <svg className="h-4 w-4 text-lieux-action" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-lieux-action">
            Visioconférence — aucune adresse requise
          </p>
        </div>
      ) : (
        <>
          {/* "Same as previous" checkbox */}
          {!isFirst && (
            <label className="mb-2 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isSameAsPrevious}
                onChange={(e) =>
                  onStrategyChange(
                    journee.id,
                    e.target.checked ? "same-as-previous" : "custom"
                  )
                }
                className="h-4 w-4 rounded border-lieux-gris-clair text-lieux-bleu focus:ring-lieux-action"
              />
              <span className="text-base text-lieux-gris">
                Même lieu que la journée précédente
              </span>
            </label>
          )}

          {/* Lieu fields (hidden if same-as-previous) */}
          {!isSameAsPrevious && (
            <LieuFields
              lieuData={journeeState.lieuData}
              onChange={(field, value) => onFieldChange(journee.id, field, value)}
              id={`${groupId}-${journee.id}`}
              errors={errors}
            />
          )}
        </>
      )}
    </div>
  );
}
