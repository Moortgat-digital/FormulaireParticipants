import { NextResponse } from "next/server";
import { patchJournee, patchGroupLieu } from "@/lib/notion-lieux";
import type { SavePayload, SaveResponse, SaveResult } from "@/types/lieux";

export async function PATCH(request: Request) {
  try {
    const body: SavePayload = await request.json();

    if (!body.formationId || !Array.isArray(body.journees) || body.journees.length === 0) {
      return NextResponse.json<SaveResponse>(
        {
          success: false,
          message: "Payload invalide.",
          results: [],
          patchedCount: 0,
          failedCount: 0,
        },
        { status: 400 }
      );
    }

    const results: SaveResult[] = [];

    // Patch journées sequentially (Notion rate limit: 3 req/s)
    for (const j of body.journees) {
      try {
        await patchJournee(j.journeeId, j.lieu);
        results.push({ journeeId: j.journeeId, success: true });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("Erreur PATCH journée:", j.journeeId, err);
        results.push({ journeeId: j.journeeId, success: false, error: errMsg });
      }

      if (body.journees.length > 2) {
        await new Promise((r) => setTimeout(r, 350));
      }
    }

    // Patch group lieu labels
    if (Array.isArray(body.groups)) {
      for (const g of body.groups) {
        try {
          await patchGroupLieu(g.groupId, g.lieuLabel);
        } catch (err) {
          console.error("Erreur PATCH groupe lieu:", g.groupId, err);
        }

        if (body.groups.length > 2) {
          await new Promise((r) => setTimeout(r, 350));
        }
      }
    }

    const patchedCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json<SaveResponse>(
      {
        success: failedCount === 0,
        message:
          failedCount === 0
            ? `${patchedCount} journée${patchedCount > 1 ? "s" : ""} mise${patchedCount > 1 ? "s" : ""} à jour avec succès.`
            : `${patchedCount} réussie${patchedCount > 1 ? "s" : ""}, ${failedCount} échouée${failedCount > 1 ? "s" : ""}.`,
        results,
        patchedCount,
        failedCount,
      },
      { status: failedCount === 0 ? 200 : 207 }
    );
  } catch (err) {
    console.error("Erreur API lieux:", err);
    return NextResponse.json<SaveResponse>(
      {
        success: false,
        message: "Erreur serveur inattendue.",
        results: [],
        patchedCount: 0,
        failedCount: 0,
      },
      { status: 500 }
    );
  }
}
