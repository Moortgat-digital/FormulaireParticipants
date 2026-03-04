"use client";

interface ProgressBarProps {
  groupsCompleted: number;
  groupsTotal: number;
  journeesCompleted: number;
  journeesTotal: number;
}

export default function ProgressBar({
  groupsCompleted,
  groupsTotal,
  journeesCompleted,
  journeesTotal,
}: ProgressBarProps) {
  const groupsPct = groupsTotal > 0 ? (groupsCompleted / groupsTotal) * 100 : 0;
  const journeesPct = journeesTotal > 0 ? (journeesCompleted / journeesTotal) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
      {/* Groups progress */}
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-lieux-bleu">Groupes</span>
          <span className="text-lieux-gris">
            {groupsCompleted}/{groupsTotal}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-lieux-gris-clair/60">
          <div
            className="h-full rounded-full bg-lieux-action transition-all duration-500"
            style={{ width: `${groupsPct}%` }}
          />
        </div>
      </div>

      {/* Journees progress */}
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-lieux-bleu">Journées</span>
          <span className="text-lieux-gris">
            {journeesCompleted}/{journeesTotal}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-lieux-gris-clair/60">
          <div
            className="h-full rounded-full bg-lieux-action transition-all duration-500"
            style={{ width: `${journeesPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
