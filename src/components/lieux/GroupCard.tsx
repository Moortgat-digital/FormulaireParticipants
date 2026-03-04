"use client";

import type {
  GroupeSession,
  GroupFormState,
  GroupStrategy,
  LieuData,
  JourneeStrategy,
  FieldErrors,
} from "@/types/lieux";
import LieuFields from "./LieuFields";
import JourneeRow from "./JourneeRow";

interface GroupCardProps {
  group: GroupeSession;
  groupState: GroupFormState;
  allGroups: { id: string; nom: string }[];
  onGroupStrategyChange: (groupId: string, strategy: GroupStrategy) => void;
  onJourneeStrategyToggle: (groupId: string, strategy: "all-same" | "per-journee") => void;
  onGroupFieldChange: (groupId: string, field: keyof LieuData, value: string) => void;
  onJourneeStrategyChange: (groupId: string, journeeId: string, strategy: JourneeStrategy) => void;
  onJourneeFieldChange: (groupId: string, journeeId: string, field: keyof LieuData, value: string) => void;
  groupErrors?: FieldErrors;
  journeeErrors?: Record<string, FieldErrors>;
}

function formatDateRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    if (!iso) return "?";
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };
  return `du ${fmt(start)} au ${fmt(end)}`;
}

export default function GroupCard({
  group,
  groupState,
  allGroups,
  onGroupStrategyChange,
  onJourneeStrategyToggle,
  onGroupFieldChange,
  onJourneeStrategyChange,
  onJourneeFieldChange,
  groupErrors,
  journeeErrors,
}: GroupCardProps) {
  const isSameAsOther = groupState.strategy.startsWith("same-as:");
  const otherGroups = allGroups.filter((g) => g.id !== group.id);

  return (
    <div className="overflow-hidden rounded-lg border border-lieux-gris-clair bg-white shadow-sm">
      {/* Header with left accent border */}
      <div className="border-l-4 border-l-lieux-bleu bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-lieux-bleu">{group.nom}</h3>
            <p className="text-xs text-lieux-gris">
              {formatDateRange(group.dateDebut, group.dateFin)}
            </p>
          </div>

          {/* "Same as other group" dropdown */}
          {otherGroups.length > 0 && (
            <div className="shrink-0">
              <select
                value={isSameAsOther ? groupState.strategy : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  onGroupStrategyChange(group.id, val ? (val as GroupStrategy) : "custom");
                }}
                className="rounded-md border border-lieux-gris-clair bg-white px-2 py-1.5 text-xs text-lieux-gris transition-colors hover:border-lieux-action focus:outline-none focus:ring-2 focus:ring-lieux-action"
              >
                <option value="">Saisie personnalisée</option>
                {otherGroups.map((og) => (
                  <option key={og.id} value={`same-as:${og.id}`}>
                    Même lieu que {og.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {group.journees.length === 0 ? (
          <p className="text-sm italic text-lieux-gris">
            Aucune journée programmée pour ce groupe
          </p>
        ) : isSameAsOther ? (
          <div className="flex items-center gap-2 rounded-lg bg-lieux-action/5 border border-lieux-action/20 px-4 py-3">
            <svg className="h-4 w-4 text-lieux-action" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-sm text-lieux-action">
              Utilise le même lieu que{" "}
              <strong>
                {allGroups.find((g) => `same-as:${g.id}` === groupState.strategy)?.nom ?? "autre groupe"}
              </strong>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sub-question: same lieu for all journées? */}
            <div>
              <p className="mb-2 text-sm font-semibold text-lieux-bleu-light">
                Le lieu varie-t-il au sein de ce groupe ?
              </p>
              <div className="flex gap-3">
                {([
                  { value: "all-same" as const, label: "Non — même lieu pour toutes les journées" },
                  { value: "per-journee" as const, label: "Oui — les lieux varient" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onJourneeStrategyToggle(group.id, value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      groupState.journeeStrategy === value
                        ? "border-lieux-bleu bg-lieux-bleu/5 font-medium text-lieux-bleu"
                        : "border-lieux-gris-clair text-lieux-gris hover:border-lieux-action"
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
                        groupState.journeeStrategy === value ? "border-lieux-bleu" : "border-lieux-gris-clair"
                      }`}
                    >
                      {groupState.journeeStrategy === value && (
                        <span className="h-1.5 w-1.5 rounded-full bg-lieux-bleu" />
                      )}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* All-same: single LieuFields for the group */}
            {groupState.journeeStrategy === "all-same" && (
              <LieuFields
                lieuData={groupState.lieuData}
                onChange={(field, value) => onGroupFieldChange(group.id, field, value)}
                id={`group-${group.id}`}
                errors={groupErrors}
              />
            )}

            {/* Per-journee: individual JourneeRows */}
            {groupState.journeeStrategy === "per-journee" && (
              <div className="space-y-3">
                {group.journees.map((journee, idx) => {
                  const jState = groupState.journees.find(
                    (j) => j.journeeId === journee.id
                  );
                  if (!jState) return null;
                  return (
                    <JourneeRow
                      key={journee.id}
                      journee={journee}
                      journeeState={jState}
                      index={idx}
                      isFirst={idx === 0}
                      groupId={group.id}
                      onStrategyChange={(jId, strategy) =>
                        onJourneeStrategyChange(group.id, jId, strategy)
                      }
                      onFieldChange={(jId, field, value) =>
                        onJourneeFieldChange(group.id, jId, field, value)
                      }
                      errors={journeeErrors?.[journee.id]}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
