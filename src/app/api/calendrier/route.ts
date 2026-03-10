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
    const res = NextResponse.json({ journees });
    // Cache for 2 minutes to reduce Notion API calls on repeated loads
    res.headers.set("Cache-Control", "s-maxage=120, stale-while-revalidate=60");
    return res;
  } catch (err) {
    console.error("Calendrier API error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des journées." },
      { status: 500 }
    );
  }
}
