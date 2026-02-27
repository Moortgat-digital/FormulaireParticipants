import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  notionVersion: "2022-06-28",
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

interface ParticipantData {
  nom: string;
  prenom: string;
  email: string;
  entreprise: string;
}

export async function getPageTitle(pageId: string): Promise<string> {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    if ("properties" in page) {
      for (const prop of Object.values(page.properties)) {
        if (prop.type === "title" && prop.title.length > 0) {
          return prop.title.map((t) => t.plain_text).join("");
        }
      }
    }
    return "";
  } catch {
    return "";
  }
}

export async function createParticipantPage(
  participant: ParticipantData,
  groupId: string,
  submittedBy: string
) {
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
    "📂 Groupe": {
      relation: [{ id: groupId }],
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
