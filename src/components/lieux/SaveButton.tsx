"use client";

interface SaveButtonProps {
  saving: boolean;
  hasPrefilledData: boolean;
  onClick: () => void;
  progress?: { current: number; total: number };
}

export default function SaveButton({
  saving,
  hasPrefilledData,
  onClick,
  progress,
}: SaveButtonProps) {
  return (
    <div className="space-y-2">
      {/* Progress during save */}
      {saving && progress && progress.total > 0 && (
        <div className="overflow-hidden rounded-full bg-lieux-gris-clair">
          <div
            className="h-1.5 rounded-full bg-lieux-action transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={saving}
        className="w-full rounded-md bg-lieux-cta px-5 py-3 text-base font-bold text-white transition-colors hover:bg-lieux-cta-hover focus:outline-none focus:ring-2 focus:ring-lieux-cta focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Enregistrement en cours...
          </span>
        ) : hasPrefilledData ? (
          "Mettre à jour les lieux"
        ) : (
          "Enregistrer les lieux"
        )}
      </button>
    </div>
  );
}
