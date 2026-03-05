"use client";

interface StatusBadgeProps {
  prefilled: boolean;
  dirty?: boolean;
}

export default function StatusBadge({ prefilled, dirty }: StatusBadgeProps) {
  if (prefilled && !dirty) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-lieux-vert-light px-2 py-0.5 text-xs font-medium text-lieux-vert border border-lieux-vert/20">
        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Déjà renseigné
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-lieux-jaune-light px-2 py-0.5 text-xs font-medium text-lieux-jaune-text border border-lieux-jaune-text/20">
      À compléter
    </span>
  );
}
