import CsmForm from "@/components/csm/CsmForm";
import IframeResizer from "@/components/calendrier/IframeResizer";
import { getPageTitle } from "@/lib/notion";
import "./globals-csm.css";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CsmPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const recordId = typeof params.recordId === "string" ? params.recordId : "";

  if (!recordId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-csm-orange/30 bg-csm-orange-light px-6 py-4 text-center">
          <p className="text-base font-semibold text-csm-orange">
            Lien invalide
          </p>
          <p className="mt-1 text-sm text-csm-gris">
            Le paramètre <code>recordId</code> est requis dans l&apos;URL.
          </p>
        </div>
      </div>
    );
  }

  const formationNom = await getPageTitle(recordId);

  return (
    <main className="min-h-screen py-4">
      <IframeResizer />
      <CsmForm
        formationId={recordId}
        formationNom={formationNom || "Formation"}
      />
    </main>
  );
}
