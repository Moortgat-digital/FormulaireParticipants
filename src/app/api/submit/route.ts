import { NextResponse } from "next/server";
import { createParticipantPage } from "@/lib/notion";
import type { SubmitPayload, SubmitResponse } from "@/types/participant";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body: SubmitPayload = await request.json();

    // Validate payload
    if (!body.groupId || typeof body.groupId !== "string") {
      return NextResponse.json<SubmitResponse>(
        { success: false, message: "ID du groupe manquant." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.participants) || body.participants.length === 0) {
      return NextResponse.json<SubmitResponse>(
        { success: false, message: "Aucun participant fourni." },
        { status: 400 }
      );
    }

    // Validate each participant
    for (let i = 0; i < body.participants.length; i++) {
      const p = body.participants[i];
      if (!p.nom?.trim() || !p.prenom?.trim() || !p.email?.trim() || !p.entreprise?.trim()) {
        return NextResponse.json<SubmitResponse>(
          {
            success: false,
            message: `Participant ${i + 1} : tous les champs sont obligatoires.`,
          },
          { status: 400 }
        );
      }
      if (!EMAIL_REGEX.test(p.email)) {
        return NextResponse.json<SubmitResponse>(
          {
            success: false,
            message: `Participant ${i + 1} : adresse e-mail invalide.`,
          },
          { status: 400 }
        );
      }
    }

    // Create pages in Notion (sequential to respect rate limits)
    let created = 0;
    let failed = 0;
    let lastError = "";

    for (const participant of body.participants) {
      try {
        await createParticipantPage(participant, body.groupId, body.submittedBy);
        created++;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("Erreur Notion pour", participant.email, err);
        lastError = errMsg;
        failed++;
      }

      // Small delay to respect Notion API rate limits (3 req/s)
      if (body.participants.length > 3) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    if (failed === 0) {
      return NextResponse.json<SubmitResponse>({
        success: true,
        message: `${created} participant${created > 1 ? "s" : ""} inscrit${created > 1 ? "s" : ""} avec succès.`,
        created,
        failed,
      });
    }

    if (created === 0) {
      return NextResponse.json<SubmitResponse>(
        {
          success: false,
          message: `Erreur lors de l'inscription : ${lastError}`,
          created,
          failed,
        },
        { status: 500 }
      );
    }

    return NextResponse.json<SubmitResponse>(
      {
        success: false,
        message: `${created} sur ${body.participants.length} participants inscrits. Certains ont échoué.`,
        created,
        failed,
      },
      { status: 207 }
    );
  } catch (err) {
    console.error("Erreur API submit:", err);
    return NextResponse.json<SubmitResponse>(
      { success: false, message: "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
