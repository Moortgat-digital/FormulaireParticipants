import { NextResponse } from "next/server";

const WEBHOOK_URL = process.env.CSM_UNSUB_WEBHOOK_URL;

export async function POST(request: Request) {
  if (!WEBHOOK_URL) {
    return NextResponse.json(
      { error: "L'URL du webhook n'est pas configurée (CSM_UNSUB_WEBHOOK_URL)." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    if (!body.participant?.id || !body.participant?.email) {
      return NextResponse.json(
        { error: "Payload invalide : participant requis." },
        { status: 400 }
      );
    }

    if (!body.toutes && (!body.journees || body.journees.length === 0)) {
      return NextResponse.json(
        { error: "Payload invalide : journées requises si désinscription ciblée." },
        { status: 400 }
      );
    }

    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!webhookResponse.ok) {
      const text = await webhookResponse.text();
      console.error("Webhook unsub error:", webhookResponse.status, text);
      return NextResponse.json(
        { error: `Le webhook a répondu avec le statut ${webhookResponse.status}.` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: body.toutes
        ? "Désinscription de toutes les journées effectuée."
        : `Désinscription de ${body.journees.length} journée(s) effectuée.`,
    });
  } catch (err) {
    console.error("Erreur API csm/webhook-unsub:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi au webhook." },
      { status: 500 }
    );
  }
}
