"use client";

import type { Participant } from "@/types/participant";

interface ParticipantRowProps {
  participant: Participant;
  index: number;
  onChange: (index: number, field: keyof Participant, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  errors: Partial<Record<keyof Participant, string>> | null;
}

export default function ParticipantRow({
  participant,
  index,
  onChange,
  onRemove,
  canRemove,
  errors,
}: ParticipantRowProps) {
  const fields: { key: keyof Participant; label: string; type: string; placeholder: string }[] = [
    { key: "nom", label: "Nom", type: "text", placeholder: "Dupont" },
    { key: "prenom", label: "Prénom", type: "text", placeholder: "Jean" },
    { key: "email", label: "E-mail", type: "email", placeholder: "jean.dupont@exemple.com" },
    { key: "entreprise", label: "Entreprise", type: "text", placeholder: "Société SA" },
  ];

  return (
    <div className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">
          Participant {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            aria-label={`Supprimer le participant ${index + 1}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map(({ key, label, type, placeholder }) => (
          <div key={key}>
            <label
              htmlFor={`${key}-${participant.id}`}
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              {label}
            </label>
            <input
              id={`${key}-${participant.id}`}
              type={type}
              value={participant[key]}
              onChange={(e) => onChange(index, key, e.target.value)}
              placeholder={placeholder}
              className={`w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors?.[key]
                  ? "border-red-300 bg-red-50 focus:ring-red-500"
                  : "border-gray-300 bg-white hover:border-gray-400"
              }`}
            />
            {errors?.[key] && (
              <p className="mt-1 text-xs text-red-600">{errors[key]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
