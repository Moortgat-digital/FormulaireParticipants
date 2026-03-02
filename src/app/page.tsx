import ParticipantForm from "@/components/ParticipantForm";
import { getPageTitle, getGroupsByFormation } from "@/lib/notion";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  const recordId = typeof params.recordId === "string" ? params.recordId : "";
  const submittedBy = typeof params.submitted_by === "string"
    ? params.submitted_by
    : "";

  if (!recordId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-red-800">
            Lien invalide
          </p>
          <p className="mt-1 text-xs text-red-600">
            Le paramètre <code>recordId</code> est requis dans l&apos;URL.
          </p>
        </div>
      </div>
    );
  }

  const [formationName, groups] = await Promise.all([
    getPageTitle(recordId),
    getGroupsByFormation(recordId),
  ]);

  return (
    <main className="min-h-screen">
      <ParticipantForm
        formationName={formationName || "Formation"}
        groups={groups}
        submittedBy={submittedBy}
      />
    </main>
  );
}
