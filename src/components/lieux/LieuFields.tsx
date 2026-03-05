"use client";

import type { LieuData, FieldErrors } from "@/types/lieux";

interface LieuFieldsProps {
  lieuData: LieuData;
  onChange: (field: keyof LieuData, value: string) => void;
  disabled?: boolean;
  errors?: FieldErrors;
  id?: string;
}

export default function LieuFields({
  lieuData,
  onChange,
  disabled,
  errors,
  id = "lieu",
}: LieuFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-nom`} className="mb-1 block text-base font-medium text-lieux-gris">
          Nom du lieu <span className="text-lieux-cta">*</span>
        </label>
        <input
          id={`${id}-nom`}
          type="text"
          value={lieuData.nom}
          onChange={(e) => onChange("nom", e.target.value)}
          disabled={disabled}
          placeholder='ex. "Salle de conférence — Siège social"'
          className={`h-10 w-full rounded-md border px-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-lieux-action ${
            errors?.nom ? "border-lieux-cta bg-lieux-cta/5" : "border-lieux-gris-clair bg-white hover:border-lieux-action"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        />
        {errors?.nom && (
          <p className="mt-1 text-sm text-lieux-cta">{errors.nom}</p>
        )}
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`${id}-adresse`} className="mb-1 block text-base font-medium text-lieux-gris">
          Adresse <span className="text-lieux-cta">*</span>
        </label>
        <input
          id={`${id}-adresse`}
          type="text"
          value={lieuData.adresse}
          onChange={(e) => onChange("adresse", e.target.value)}
          disabled={disabled}
          placeholder="123 rue de la Formation"
          className={`h-10 w-full rounded-md border px-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-lieux-action ${
            errors?.adresse ? "border-lieux-cta bg-lieux-cta/5" : "border-lieux-gris-clair bg-white hover:border-lieux-action"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        />
        {errors?.adresse && (
          <p className="mt-1 text-sm text-lieux-cta">{errors.adresse}</p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-ville`} className="mb-1 block text-base font-medium text-lieux-gris">
          Ville <span className="text-lieux-cta">*</span>
        </label>
        <input
          id={`${id}-ville`}
          type="text"
          value={lieuData.ville}
          onChange={(e) => onChange("ville", e.target.value)}
          disabled={disabled}
          placeholder="Paris"
          className={`h-10 w-full rounded-md border px-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-lieux-action ${
            errors?.ville ? "border-lieux-cta bg-lieux-cta/5" : "border-lieux-gris-clair bg-white hover:border-lieux-action"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        />
        {errors?.ville && (
          <p className="mt-1 text-sm text-lieux-cta">{errors.ville}</p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-cp`} className="mb-1 block text-base font-medium text-lieux-gris">
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
          className={`h-10 w-full rounded-md border px-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-lieux-action ${
            errors?.codePostal ? "border-lieux-cta bg-lieux-cta/5" : "border-lieux-gris-clair bg-white hover:border-lieux-action"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        />
        {errors?.codePostal && (
          <p className="mt-1 text-sm text-lieux-cta">{errors.codePostal}</p>
        )}
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`${id}-pays`} className="mb-1 block text-base font-medium text-lieux-gris">
          Pays
        </label>
        <input
          id={`${id}-pays`}
          type="text"
          value={lieuData.pays}
          onChange={(e) => onChange("pays", e.target.value)}
          disabled={disabled}
          placeholder="France"
          className={`h-10 w-full rounded-md border border-lieux-gris-clair bg-white px-3 text-base transition-colors hover:border-lieux-action focus:outline-none focus:ring-2 focus:ring-lieux-action ${
            disabled ? "cursor-not-allowed opacity-60" : ""
          }`}
        />
      </div>
    </div>
  );
}
