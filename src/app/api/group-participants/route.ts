import { NextRequest, NextResponse } from "next/server";
import { getDemandesByGroup } from "@/lib/notion-csm";

export async function GET(request: NextRequest) {
  const groupId = request.nextUrl.searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json(
      { error: "Le paramètre groupId est requis." },
      { status: 400 }
    );
  }

  try {
    const participants = await getDemandesByGroup(groupId);
    return NextResponse.json({ participants });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erreur API group-participants:", message);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des participants.", detail: message },
      { status: 500 }
    );
  }
}
