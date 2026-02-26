import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

interface ParticipantData {
  nom: string;
  prenom: string;
  email: string;
  entreprise: string;
}

export async function createParticipantPage(
  participant: ParticipantData,
  groupId: string,
  submittedBy: string
) {
  // Build properties, conditionally including "Soumis par"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {
    Nom: {
      title: [{ text: { content: participant.nom } }],
    },
    Prénom: {
      rich_text: [{ text: { content: participant.prenom } }],
    },
    "E-mail": {
      email: participant.email,
    },
    Entreprise: {
      rich_text: [{ text: { content: participant.entreprise } }],
    },
    Groupe: {
      relation: [{ id: groupId }],
    },
    "Date de soumission": {
      date: { start: new Date().toISOString().split("T")[0] },
    },
  };

  if (submittedBy) {
    properties["Soumis par"] = { email: submittedBy };
  }

  return notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
  });
}
