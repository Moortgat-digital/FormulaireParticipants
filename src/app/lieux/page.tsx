import LieuxForm from "@/components/lieux/LieuxForm";
import { getFullFormationData } from "@/lib/notion-lieux";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LieuxPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const formationId =
    typeof params.formation_id === "string" ? params.formation_id : "";

  if (!formationId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-lieux-cta/30 bg-red-50 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-lieux-cta">
            Aucune formation associée à cette page.
          </p>
          <p className="mt-1 text-xs text-lieux-gris">
            Le paramètre <code>formation_id</code> est requis dans l&apos;URL.
          </p>
        </div>
      </div>
    );
  }

  const { formation, groups } = await getFullFormationData(formationId);

  return (
    <main className="min-h-screen py-6">
      <LieuxForm
        formationId={formationId}
        formationNom={formation.nom || "Formation"}
        groups={groups}
      />
    </main>
  );
}
