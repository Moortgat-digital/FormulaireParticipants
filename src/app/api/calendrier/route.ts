import { NextRequest, NextResponse } from "next/server";
import { getCalendrierJournees } from "@/lib/notion-calendrier";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "Les paramètres 'start' et 'end' sont requis (format YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  try {
    const journees = await getCalendrierJournees(start, end);
    return NextResponse.json({ journees });
  } catch (err) {
    console.error("Calendrier API error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des journées." },
      { status: 500 }
    );
  }
}
