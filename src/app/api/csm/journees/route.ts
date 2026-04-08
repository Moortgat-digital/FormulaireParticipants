import { NextRequest, NextResponse } from "next/server";
import { getJourneesByGroup } from "@/lib/notion-lieux";

export async function GET(request: NextRequest) {
  const groupeId = request.nextUrl.searchParams.get("groupeId");

  if (!groupeId) {
    return NextResponse.json(
      { error: "Le paramètre groupeId est requis." },
      { status: 400 }
    );
  }

  try {
    const journees = await getJourneesByGroup(groupeId);
    return NextResponse.json({ journees });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erreur API csm/journees:", message);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des journées.", detail: message },
      { status: 500 }
    );
  }
}
