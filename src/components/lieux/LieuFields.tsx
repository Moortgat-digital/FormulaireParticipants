"use client";

import type { LieuData, Mode, FieldErrors } from "@/types/lieux";

interface LieuFieldsProps {
  lieuData: LieuData;
  onChange: (field: keyof LieuData, value: string) => void;
  disabled?: boolean;
  errors?: FieldErrors;
  id?: string;
}

const MODES: { value: Mode; label: string }[] = [
  { value: "Présentiel", label: "Présentiel" },
  { value: "Distanciel", label: "Distanciel" },
  { value: "Hybride", label: "Hybride" },
];

export default function LieuFields({
  lieuData,
  onChange,
  disabled,
  errors,
  id = "lieu",
}: LieuFieldsProps) {
  const isDistanciel = lieuData.mode === "Distanciel";

  return (
    <div className="space-y-4">
      {/* Mode radio */}
      <div>
        <p className="mb-2 text-sm font-semibold text-lieux-bleu">
          Mode de la journée <span className="text-lieux-cta">*</span>
        </p>
        <div className="flex gap-4">
          {MODES.map(({ value, label }) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                lieuData.mode === value
                  ? "border-lieux-bleu bg-lieux-bleu/5 text-lieux-bleu font-medium"
                  : "border-lieux-gris-clair bg-white text-lieux-gris hover:border-lieux-action"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name={`${id}-mode`}
                value={value}
                checked={lieuData.mode === value}
                onChange={() => onChange("mode", value)}
                disabled={disabled}
                className="sr-only"
              />
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  lieuData.mode === value
                    ? "border-lieux-bleu"
                    : "border-lieux-gris-clair"
                }`}
              >
                {lieuData.mode === value && (
                  <span className="h-2 w-2 rounded-full bg-lieux-bleu" />
                )}
              </span>
              {label}
            </label>
          ))}
        </div>
        {errors?.mode && (
          <p className="mt-1 text-xs text-lieux-cta">{errors.mode}</p>
        )}
      </div>

      {/* Distanciel message */}
      {isDistanciel && (
        <div className="flex items-center gap-2 rounded-lg bg-lieux-action/5 border border-lieux-action/20 px-4 py-3">
          <svg className="h-5 w-5 text-lieux-action" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-lieux-action">
            Session en visioconférence — aucune adresse requise
          </p>
        </div>
      )}

      {/* Address fields (Présentiel / Hybride only) */}
      {!isDistanciel && lieuData.mode && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-nom`} className="mb-1 block text-sm font-medium text-lieux-gris">
              Nom du lieu <span className="text-lieux-cta">*</span>
            </label>
            <input
              id={`${id}-nom`}
              type="text"
              value={lieuData.nom}
              onChange={(e) => onChange("nom", e.target.value)}
              disabled={disabled}
              placeholder='ex. "Salle de conférence — Siège social"'
              className={`h-11 w-full rounded-md border px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-lieux-action ${
                errors?.nom ? "border-lieux-cta bg-red-50" : "border-lieux-gris-clair bg-white hover:border-lieux-action"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            />
            {errors?.nom && (
              <p className="mt-1 text-xs text-lieux-cta">{errors.nom}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor={`${id}-adresse`} className="mb-1 block text-sm font-medium text-lieux-gris">
              Adresse <span className="text-lieux-cta">*</span>
            </label>
            <input
              id={`${id}-adresse`}
              type="text"
              value={lieuData.adresse}
              onChange={(e) => onChange("adresse", e.target.value)}
              disabled={disabled}
              placeholder="123 rue de la Formation"
              className={`h-11 w-full rounded-md border px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-lieux-action ${
                errors?.adresse ? "border-lieux-cta bg-red-50" : "border-lieux-gris-clair bg-white hover:border-lieux-action"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            />
            {errors?.adresse && (
              <p className="mt-1 text-xs text-lieux-cta">{errors.adresse}</p>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-ville`} className="mb-1 block text-sm font-medium text-lieux-gris">
              Ville <span className="text-lieux-cta">*</span>
            </label>
            <input
              id={`${id}-ville`}
              type="text"
              value={lieuData.ville}
              onChange={(e) => onChange("ville", e.target.value)}
              disabled={disabled}
              placeholder="Paris"
              className={`h-11 w-full rounded-md border px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-lieux-action ${
                errors?.ville ? "border-lieux-cta bg-red-50" : "border-lieux-gris-clair bg-white hover:border-lieux-action"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            />
            {errors?.ville && (
              <p className="mt-1 text-xs text-lieux-cta">{errors.ville}</p>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-cp`} className="mb-1 block text-sm font-medium text-lieux-gris">
              Code postal <span className="text-lieux-cta">*</span>
            </label>
            <input
              id={`${id}-cp`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={lieuData.codePostal}
              onChange={(e) => onChange("codePostal", e.target.value.replace(/\D/g, ""))}
              disabled={disabled}
              placeholder="75001"
              className={`h-11 w-full rounded-md border px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-lieux-action ${
                errors?.codePostal ? "border-lieux-cta bg-red-50" : "border-lieux-gris-clair bg-white hover:border-lieux-action"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            />
            {errors?.codePostal && (
              <p className="mt-1 text-xs text-lieux-cta">{errors.codePostal}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor={`${id}-pays`} className="mb-1 block text-sm font-medium text-lieux-gris">
              Pays
            </label>
            <input
              id={`${id}-pays`}
              type="text"
              value={lieuData.pays}
              onChange={(e) => onChange("pays", e.target.value)}
              disabled={disabled}
              placeholder="France"
              className={`h-11 w-full rounded-md border border-lieux-gris-clair bg-white px-3 text-sm transition-colors hover:border-lieux-action focus:outline-none focus:ring-2 focus:ring-lieux-action ${
                disabled ? "cursor-not-allowed opacity-60" : ""
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
