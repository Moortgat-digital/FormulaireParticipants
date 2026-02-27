import ParticipantForm from "@/components/ParticipantForm";
import { getPageTitle } from "@/lib/notion";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  const groupId = typeof params.group_id === "string" ? params.group_id : "";
  const submittedBy = typeof params.submitted_by === "string"
    ? params.submitted_by
    : "";

  if (!groupId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-red-800">
            Lien invalide
          </p>
          <p className="mt-1 text-xs text-red-600">
            Le paramètre <code>group_id</code> est requis dans l&apos;URL.
          </p>
        </div>
      </div>
    );
  }

  // Use group_name from URL if provided, otherwise fetch from Notion
  let groupName = typeof params.group_name === "string"
    ? decodeURIComponent(params.group_name)
    : "";

  if (!groupName) {
    groupName = await getPageTitle(groupId);
  }

  return (
    <main className="min-h-screen bg-gray-50 py-6">
      <ParticipantForm
        groupId={groupId}
        groupName={groupName || "Groupe"}
        submittedBy={submittedBy}
      />
    </main>
  );
}
