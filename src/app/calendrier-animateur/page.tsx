import CalendrierView from "@/components/calendrier/CalendrierView";
import IframeResizer from "@/components/calendrier/IframeResizer";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CalendrierAnimateurPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";

  if (!email) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-4">
        <div className="rounded-lg border border-cal-gris-clair bg-white px-6 py-4 text-center">
          <p className="text-base font-semibold text-cal-bleu">
            Aucun animateur identifié.
          </p>
          <p className="mt-1 text-sm text-cal-gris">
            Le paramètre <code>email</code> est requis dans l&apos;URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="px-3 py-4 w-full">
      <CalendrierView email={email} titre="Mon calendrier" />
      <IframeResizer />
    </main>
  );
}
