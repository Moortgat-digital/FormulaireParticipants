import { NextRequest, NextResponse } from "next/server";
import { getDemandesByFormation } from "@/lib/notion-csm";

export async function GET(request: NextRequest) {
  const formationId = request.nextUrl.searchParams.get("formationId");

  if (!formationId) {
    return NextResponse.json(
      { error: "Le paramètre formationId est requis." },
      { status: 400 }
    );
  }

  try {
    const demandes = await getDemandesByFormation(formationId);
    return NextResponse.json({ demandes });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Erreur API csm:", message, stack);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandes.", detail: message },
      { status: 500 }
    );
  }
}
