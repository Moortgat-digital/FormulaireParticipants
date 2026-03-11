import { NextResponse } from "next/server";
import type { CsmWebhookPayload } from "@/types/csm";

const WEBHOOK_URL = process.env.CSM_WEBHOOK_URL;

export async function POST(request: Request) {
  if (!WEBHOOK_URL) {
    return NextResponse.json(
      { error: "L'URL du webhook n'est pas configurée (CSM_WEBHOOK_URL)." },
      { status: 500 }
    );
  }

  try {
    const body: CsmWebhookPayload = await request.json();

    if (!body.formationId || !body.demandes?.length) {
      return NextResponse.json(
        { error: "Payload invalide : formationId et demandes requis." },
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
      console.error("Webhook error:", webhookResponse.status, text);
      return NextResponse.json(
        { error: `Le webhook a répondu avec le statut ${webhookResponse.status}.` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${body.demandes.length} demande(s) envoyée(s) avec succès.`,
    });
  } catch (err) {
    console.error("Erreur API csm/webhook:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi au webhook." },
      { status: 500 }
    );
  }
}
