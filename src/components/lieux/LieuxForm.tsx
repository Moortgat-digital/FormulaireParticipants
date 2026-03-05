"use client";

import { useReducer, useCallback, useState, useMemo } from "react";
import type {
  GroupeSession,
  LieuxFormState,
  LieuxAction,
  LieuData,
  JourneePatchPayload,
  GroupPatchPayload,
  SavePayload,
  SaveResponse,
  SaveResult,
  FieldErrors,
} from "@/types/lieux";
import { EMPTY_LIEU } from "@/types/lieux";
import ProgressBar from "./ProgressBar";
import PivotQuestion from "./PivotQuestion";
import LieuFields from "./LieuFields";
import GroupCard from "./GroupCard";
import SaveButton from "./SaveButton";
import ErrorBanner from "./ErrorBanner";

// ---- Reducer ----

function lieuxReducer(state: LieuxFormState, action: LieuxAction): LieuxFormState {
  switch (action.type) {
    case "SET_FILL_STRATEGY":
      return { ...state, fillStrategy: action.strategy, saveResults: [] };

    case "SET_GLOBAL_LIEU":
      return {
        ...state,
        globalLieu: { ...state.globalLieu, [action.field]: action.value },
        saveResults: [],
      };

    case "SET_GROUP_STRATEGY":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.groupId === action.groupId ? { ...g, strategy: action.strategy } : g
        ),
        saveResults: [],
      };

    case "SET_GROUP_JOURNEE_STRATEGY":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.groupId === action.groupId
            ? { ...g, journeeStrategy: action.strategy }
            : g
        ),
        saveResults: [],
      };

    case "SET_GROUP_LIEU":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.groupId === action.groupId
            ? { ...g, lieuData: { ...g.lieuData, [action.field]: action.value } }
            : g
        ),
        saveResults: [],
      };

    case "SET_JOURNEE_STRATEGY":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.groupId === action.groupId
            ? {
                ...g,
                journees: g.journees.map((j) =>
                  j.journeeId === action.journeeId
                    ? { ...j, strategy: action.strategy }
                    : j
                ),
              }
            : g
        ),
        saveResults: [],
      };

    case "SET_JOURNEE_LIEU":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.groupId === action.groupId
            ? {
                ...g,
                journees: g.journees.map((j) =>
                  j.journeeId === action.journeeId
                    ? {
                        ...j,
                        lieuData: { ...j.lieuData, [action.field]: action.value },
                        dirty: true,
                      }
                    : j
                ),
              }
            : g
        ),
        saveResults: [],
      };

    case "SET_SAVING":
      return { ...state, saving: action.saving };

    case "SET_SAVE_RESULTS":
      return { ...state, saveResults: action.results };

    default:
      return state;
  }
}

function initializeState(
  formationId: string,
  formationNom: string,
  groups: GroupeSession[]
): LieuxFormState {
  return {
    formationId,
    formationNom,
    // Single group → go straight to per-group (shows GroupCard with sub-question)
    fillStrategy: groups.length <= 1 ? "per-group" : "all-same",
    globalLieu: { ...EMPTY_LIEU },
    groups: groups.map((g) => ({
      groupId: g.id,
      strategy: "custom",
      lieuData: { ...EMPTY_LIEU },
      journeeStrategy: "all-same",
      journees: g.journees.map((j) => ({
        journeeId: j.id,
        strategy: "custom",
        lieuData: j.prefilled
          ? {
              mode: j.mode || "",
              nom: j.lieu,
              adresse: j.adresse,
              ville: j.ville,
              codePostal: j.codePostal?.toString() || "",
              pays: j.pays || "France",
            }
          : { ...EMPTY_LIEU },
        prefilled: j.prefilled,
        dirty: false,
      })),
    })),
    saving: false,
    saveResults: [],
  };
}

// ---- Validation ----
// Mode is set by Notion (not the client), so we only validate address fields.

function validateLieu(lieu: LieuData): FieldErrors | null {
  const errs: FieldErrors = {};
  if (!lieu.adresse.trim()) errs.adresse = "Requis";
  if (!lieu.ville.trim()) errs.ville = "Requis";
  if (!lieu.codePostal.trim()) errs.codePostal = "Requis";
  return Object.keys(errs).length > 0 ? errs : null;
}

// ---- Resolve helpers ----

function resolveJourneeLieu(
  journees: { strategy: string; lieuData: LieuData }[],
  index: number
): LieuData {
  for (let i = index - 1; i >= 0; i--) {
    if (journees[i].strategy === "custom") {
      return journees[i].lieuData;
    }
  }
  return EMPTY_LIEU;
}

function buildPayload(state: LieuxFormState, groups: GroupeSession[]): SavePayload {
  const journees: JourneePatchPayload[] = [];
  const groupPatches: GroupPatchPayload[] = [];

  for (const gState of state.groups) {
    const group = groups.find((g) => g.id === gState.groupId);
    if (!group || group.journees.length === 0) continue;

    // Determine effective group lieu
    let effectiveGroupLieu: LieuData;
    if (state.fillStrategy === "all-same") {
      effectiveGroupLieu = state.globalLieu;
    } else if (gState.strategy.startsWith("same-as:")) {
      const sourceId = gState.strategy.replace("same-as:", "");
      const source = state.groups.find((g) => g.groupId === sourceId);
      effectiveGroupLieu = source?.lieuData ?? EMPTY_LIEU;
    } else {
      effectiveGroupLieu = gState.lieuData;
    }

    let hasMultipleLieux = false;
    const resolvedJournees: LieuData[] = [];

    for (let i = 0; i < gState.journees.length; i++) {
      const jState = gState.journees[i];
      const journeeData = group.journees[i];

      // Skip Distanciel journées — don't overwrite their data
      if (journeeData?.mode === "Distanciel") {
        resolvedJournees.push(EMPTY_LIEU);
        continue;
      }

      let effectiveLieu: LieuData;

      if (state.fillStrategy === "all-same" || gState.journeeStrategy === "all-same") {
        effectiveLieu = effectiveGroupLieu;
      } else if (jState.strategy === "same-as-previous" && i > 0) {
        effectiveLieu = resolveJourneeLieu(gState.journees, i);
      } else {
        effectiveLieu = jState.lieuData;
      }

      resolvedJournees.push(effectiveLieu);
      journees.push({ journeeId: jState.journeeId, lieu: effectiveLieu });
    }

    // Check if multiple distinct lieux
    if (gState.journeeStrategy === "per-journee") {
      const nonEmpty = resolvedJournees.filter((l) => l.nom);
      const uniqueNoms = new Set(nonEmpty.map((l) => l.nom));
      if (uniqueNoms.size > 1) hasMultipleLieux = true;
    }

    const firstNonEmpty = resolvedJournees.find((l) => l.nom) ?? resolvedJournees[0];
    const lieuLabel = hasMultipleLieux
      ? "Plusieurs lieux"
      : [firstNonEmpty.nom, firstNonEmpty.ville].filter(Boolean).join(" — ");

    groupPatches.push({ groupId: gState.groupId, lieuLabel });
  }

  return { formationId: state.formationId, journees, groups: groupPatches };
}

// ---- Progress computation ----

function computeProgress(state: LieuxFormState, groups: GroupeSession[]) {
  let journeesTotal = 0;
  let journeesCompleted = 0;
  const groupsTotal = groups.length;
  let groupsCompleted = 0;

  for (const gState of state.groups) {
    const group = groups.find((g) => g.id === gState.groupId);
    if (!group) continue;
    const jCount = group.journees.length;
    journeesTotal += jCount;

    let groupDone = jCount > 0;
    for (let i = 0; i < gState.journees.length; i++) {
      const journeeData = group.journees[i];

      // Distanciel journées are auto-complete (no address needed)
      if (journeeData?.mode === "Distanciel") {
        journeesCompleted++;
        continue;
      }

      const jState = gState.journees[i];
      let lieu: LieuData;

      if (state.fillStrategy === "all-same") {
        lieu = state.globalLieu;
      } else if (gState.strategy.startsWith("same-as:")) {
        const src = state.groups.find(
          (g) => g.groupId === gState.strategy.replace("same-as:", "")
        );
        lieu = src?.lieuData ?? EMPTY_LIEU;
      } else if (gState.journeeStrategy === "all-same") {
        lieu = gState.lieuData;
      } else if (jState.strategy === "same-as-previous" && i > 0) {
        lieu = resolveJourneeLieu(gState.journees, i);
      } else {
        lieu = jState.lieuData;
      }

      const isComplete = lieu.adresse.trim() !== "";
      if (isComplete) {
        journeesCompleted++;
      } else {
        groupDone = false;
      }
    }
    if (groupDone) groupsCompleted++;
  }

  return { groupsTotal, groupsCompleted, journeesTotal, journeesCompleted };
}

// ---- Component ----

interface LieuxFormProps {
  formationId: string;
  formationNom: string;
  groups: GroupeSession[];
}

export default function LieuxForm({
  formationId,
  formationNom,
  groups,
}: LieuxFormProps) {
  const [state, dispatch] = useReducer(
    lieuxReducer,
    { formationId, formationNom, groups },
    ({ formationId, formationNom, groups }) =>
      initializeState(formationId, formationNom, groups)
  );

  const [validationErrors, setValidationErrors] = useState<{
    global?: FieldErrors;
    groups: Record<string, FieldErrors>;
    journees: Record<string, Record<string, FieldErrors>>;
  }>({ groups: {}, journees: {} });

  const [successMessage, setSuccessMessage] = useState("");

  const singleGroup = groups.length === 1;
  const hasPrefilledData = groups.some((g) =>
    g.journees.some((j) => j.prefilled)
  );

  const progress = useMemo(() => computeProgress(state, groups), [state, groups]);

  // ---- Validation ----

  const validateAll = useCallback((): boolean => {
    const errs: typeof validationErrors = { groups: {}, journees: {} };
    let valid = true;

    if (state.fillStrategy === "all-same") {
      const e = validateLieu(state.globalLieu);
      if (e) {
        errs.global = e;
        valid = false;
      }
    } else {
      for (const gState of state.groups) {
        const group = groups.find((g) => g.id === gState.groupId);
        if (!group || group.journees.length === 0) continue;
        if (gState.strategy.startsWith("same-as:")) continue;

        // Check if ALL journées are Distanciel — skip validation
        const allDistanciel = group.journees.every((j) => j.mode === "Distanciel");
        if (allDistanciel) continue;

        if (gState.journeeStrategy === "all-same") {
          const e = validateLieu(gState.lieuData);
          if (e) {
            errs.groups[gState.groupId] = e;
            valid = false;
          }
        } else {
          for (let i = 0; i < gState.journees.length; i++) {
            const jState = gState.journees[i];
            const journeeData = group.journees[i];
            // Skip Distanciel and same-as-previous
            if (journeeData?.mode === "Distanciel") continue;
            if (jState.strategy === "same-as-previous") continue;
            const e = validateLieu(jState.lieuData);
            if (e) {
              if (!errs.journees[gState.groupId]) errs.journees[gState.groupId] = {};
              errs.journees[gState.groupId][jState.journeeId] = e;
              valid = false;
            }
          }
        }
      }
    }

    setValidationErrors(errs);
    return valid;
  }, [state, groups]);

  // ---- Save ----

  const handleSave = useCallback(async () => {
    setSuccessMessage("");
    if (!validateAll()) {
      const firstErr = document.querySelector("[data-error]");
      firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    dispatch({ type: "SET_SAVING", saving: true });
    dispatch({ type: "SET_SAVE_RESULTS", results: [] });

    try {
      const payload = buildPayload(state, groups);
      const res = await fetch("/api/lieux", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: SaveResponse = await res.json();
      dispatch({ type: "SET_SAVE_RESULTS", results: data.results });

      if (data.success) {
        setSuccessMessage(
          "Lieux enregistrés. Votre équipe Moortgat a bien reçu l'information."
        );
      }
    } catch {
      dispatch({
        type: "SET_SAVE_RESULTS",
        results: [{ journeeId: "global", success: false, error: "Erreur de connexion. Veuillez réessayer." }],
      });
    } finally {
      dispatch({ type: "SET_SAVING", saving: false });
    }
  }, [state, groups, validateAll]);

  // ---- Retry ----

  const handleRetry = useCallback(async () => {
    const failedIds = state.saveResults
      .filter((r) => !r.success)
      .map((r) => r.journeeId);

    if (failedIds.length === 0) return;

    dispatch({ type: "SET_SAVING", saving: true });

    try {
      const fullPayload = buildPayload(state, groups);
      const retryPayload: SavePayload = {
        formationId: state.formationId,
        journees: fullPayload.journees.filter((j) =>
          failedIds.includes(j.journeeId)
        ),
        groups: [],
      };

      const res = await fetch("/api/lieux", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retryPayload),
      });

      const data: SaveResponse = await res.json();

      const mergedResults = state.saveResults.map((prev) => {
        const retried = data.results.find((r) => r.journeeId === prev.journeeId);
        return retried ?? prev;
      });

      dispatch({ type: "SET_SAVE_RESULTS", results: mergedResults });

      if (mergedResults.every((r) => r.success)) {
        setSuccessMessage(
          "Lieux enregistrés. Votre équipe Moortgat a bien reçu l'information."
        );
      }
    } catch {
      // Keep existing results
    } finally {
      dispatch({ type: "SET_SAVING", saving: false });
    }
  }, [state, groups]);

  // ---- Empty state ----

  const allJournees = groups.flatMap((g) => g.journees);
  const totalJournees = allJournees.length;

  if (totalJournees === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4">
        <Header formationNom={formationNom} />
        <div className="mt-6 rounded-lg border border-lieux-gris-clair bg-white p-6 text-center">
          <p className="text-base text-lieux-gris">
            Aucun groupe trouvé pour cette formation.
          </p>
        </div>
      </div>
    );
  }

  // Check if ALL journées across all groups are Distanciel
  const allDistanciel = allJournees.every((j) => j.mode === "Distanciel");

  if (allDistanciel) {
    return (
      <div className="mx-auto max-w-5xl px-4">
        <Header formationNom={formationNom} />
        <div className="mt-6 rounded-lg border border-lieux-action/20 bg-lieux-action/5 p-6 text-center">
          <p className="text-base text-lieux-action">
            Toutes vos sessions sont en distanciel. Aucun lieu physique requis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      <Header formationNom={formationNom} />

      <div className="mt-3 space-y-3">
        {/* Progress */}
        <ProgressBar {...progress} />

        {/* Pivot question (skip if single group) */}
        {!singleGroup && (
          <PivotQuestion
            strategy={state.fillStrategy}
            onChange={(s) => dispatch({ type: "SET_FILL_STRATEGY", strategy: s })}
          />
        )}

        {/* Mode A: Global lieu (multi-group, user chose "all-same") */}
        {!singleGroup && state.fillStrategy === "all-same" && (
          <div className="rounded-lg border border-lieux-gris-clair/80 bg-white px-4 py-3">
            <p className="mb-0.5 text-base font-semibold text-lieux-bleu">
              Lieu unique pour toute la formation <small>(sera renseigné pour toutes les journées)</small>
            </p>
            <LieuFields
              lieuData={state.globalLieu}
              onChange={(field, value) =>
                dispatch({ type: "SET_GLOBAL_LIEU", field, value })
              }
              id="global"
              errors={validationErrors.global}
            />
          </div>
        )}

        {/* Mode B/C: Per-group (or single group) */}
        {(singleGroup || state.fillStrategy === "per-group") &&
          groups.map((group) => {
            const gState = state.groups.find((g) => g.groupId === group.id);
            if (!gState) return null;
            return (
              <GroupCard
                key={group.id}
                group={group}
                groupState={gState}
                allGroups={groups.map((g) => ({ id: g.id, nom: g.nom }))}
                onGroupStrategyChange={(gId, strategy) =>
                  dispatch({ type: "SET_GROUP_STRATEGY", groupId: gId, strategy })
                }
                onJourneeStrategyToggle={(gId, strategy) =>
                  dispatch({ type: "SET_GROUP_JOURNEE_STRATEGY", groupId: gId, strategy })
                }
                onGroupFieldChange={(gId, field, value) =>
                  dispatch({ type: "SET_GROUP_LIEU", groupId: gId, field, value })
                }
                onJourneeStrategyChange={(gId, jId, strategy) =>
                  dispatch({ type: "SET_JOURNEE_STRATEGY", groupId: gId, journeeId: jId, strategy })
                }
                onJourneeFieldChange={(gId, jId, field, value) =>
                  dispatch({ type: "SET_JOURNEE_LIEU", groupId: gId, journeeId: jId, field, value })
                }
                groupErrors={validationErrors.groups[group.id]}
                journeeErrors={validationErrors.journees[group.id]}
              />
            );
          })}

        {/* Success message */}
        {successMessage && (
          <div className="rounded-md border border-lieux-vert/30 bg-lieux-vert-light px-4 py-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-lieux-vert" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-base font-semibold text-lieux-vert">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error banner */}
        <ErrorBanner results={state.saveResults} onRetry={handleRetry} />

        {/* Save button */}
        <SaveButton
          saving={state.saving}
          hasPrefilledData={hasPrefilledData}
          onClick={handleSave}
        />
      </div>
    </div>
  );
}

// ---- Sub-components ----

function Header({ formationNom }: { formationNom: string }) {
  return (
    <div className="mb-1">
      <h2 className="text-xl font-semibold text-lieux-bleu">Renseignez les lieux de formation</h2>
      <p className="text-sm text-lieux-gris">{formationNom}</p>
    </div>
  );
}
