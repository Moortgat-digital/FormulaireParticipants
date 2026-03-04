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

  const dateLabel = formatDate(journee.dateDebut);
  const timeStart = formatTime(journee.dateDebut);
  const timeEnd = formatTime(journee.dateFin);
  const timeRange = timeStart && timeEnd ? `${timeStart} à ${timeEnd}` : "";

  return (
    <div className="rounded-lg border border-lieux-gris-clair bg-lieux-blanc p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-lieux-bleu">
            {journee.code || `Journée ${index + 1}`}
            {journee.nom && (
              <span className="ml-2 font-normal text-lieux-gris">— {journee.nom}</span>
            )}
          </p>
          <p className="text-xs text-lieux-gris">
            {dateLabel}
            {timeRange && <span className="ml-1">— {timeRange}</span>}
          </p>
        </div>
        <StatusBadge prefilled={journeeState.prefilled} dirty={journeeState.dirty} />
      </div>

      {/* "Same as previous" checkbox */}
      {!isFirst && (
        <label className="mb-3 flex cursor-pointer items-center gap-2">
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
          <span className="text-sm text-lieux-gris">
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
    </div>
  );
}
