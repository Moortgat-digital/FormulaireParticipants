import { Client } from "@notionhq/client";
import type { DemandeInscription } from "@/types/csm";
import type { GroupParticipant } from "@/types/participant";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASE_ID = process.env.NOTION_DEMANDES_DB_ID || process.env.NOTION_DATABASE_ID!;

function extractPlainText(prop: unknown): string {
  const p = prop as { type: string; title?: { plain_text: string }[]; rich_text?: { plain_text: string }[]; email?: string | null; select?: { name: string } | null };
  if (p.type === "title" && p.title) return p.title.map((t) => t.plain_text).join("");
  if (p.type === "rich_text" && p.rich_text) return p.rich_text.map((t) => t.plain_text).join("");
  if (p.type === "email") return p.email ?? "";
  if (p.type === "select") return p.select?.name ?? "";
  return "";
}

function extractRelation(prop: unknown): { id: string }[] {
  const p = prop as { type: string; relation?: { id: string }[] };
  if (p.type === "relation" && p.relation) return p.relation;
  return [];
}

export async function getDemandesByFormation(formationId: string): Promise<DemandeInscription[]> {
  const results: DemandeInscription[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: DATABASE_ID,
      filter: {
        property: "📚 Formation",
        relation: { contains: formationId },
      },
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const page of response.results) {
      if (!("properties" in page)) continue;
      const props = page.properties as Record<string, unknown>;

      const groupeRelation = extractRelation(props["📂 Groupe"]);

      results.push({
        id: page.id,
        nom: extractPlainText(props["Nom"]),
        prenom: extractPlainText(props["Prénom"]),
        email: extractPlainText(props["E-mail"]),
        entreprise: extractPlainText(props["Entreprise"]),
        groupeId: groupeRelation[0]?.id ?? "",
        groupeNom: "", // will be enriched below
        statut: extractPlainText(props["Statut"]),
        soumisPar: extractPlainText(props["Soumis par"]),
        createdTime: (page as { created_time?: string }).created_time ?? "",
      });
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  // Enrich group names
  const uniqueGroupIds = [...new Set(results.map((r) => r.groupeId).filter(Boolean))];
  const groupNames = new Map<string, string>();

  for (const gid of uniqueGroupIds) {
    try {
      const page = await notion.pages.retrieve({ page_id: gid });
      if ("properties" in page) {
        for (const prop of Object.values(page.properties)) {
          if ((prop as { type: string }).type === "title") {
            const titles = (prop as { title: { plain_text: string }[] }).title;
            if (titles.length > 0) {
              groupNames.set(gid, titles.map((t) => t.plain_text).join(""));
            }
            break;
          }
        }
      }
    } catch {
      // skip
    }
    // Rate limit
    if (uniqueGroupIds.length > 3) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  for (const d of results) {
    d.groupeNom = groupNames.get(d.groupeId) ?? "";
  }

  return results;
}

// Demandes/inscriptions d'un seul groupe (prénom/nom/email/statut), sans
// enrichissement des noms de groupe — léger, pour l'avancement côté formulaire.
export async function getDemandesByGroup(groupId: string): Promise<GroupParticipant[]> {
  const results: GroupParticipant[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: DATABASE_ID,
      filter: {
        property: "📂 Groupe",
        relation: { contains: groupId },
      },
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const page of response.results) {
      if (!("properties" in page)) continue;
      const props = page.properties as Record<string, unknown>;
      results.push({
        id: page.id,
        prenom: extractPlainText(props["Prénom"]),
        nom: extractPlainText(props["Nom"]),
        email: extractPlainText(props["E-mail"]),
        statut: extractPlainText(props["Statut"]),
      });
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return results;
}

export async function updateDemande(
  pageId: string,
  fields: { nom?: string; prenom?: string; email?: string; entreprise?: string }
) {
  // Garde-fou : on ne modifie jamais une inscription déjà validée (statut
  // susceptible d'avoir déclenché des automatisations n8n en aval). Protège
  // contre un instantané périmé côté formulaire.
  const current = await notion.pages.retrieve({ page_id: pageId });
  if ("properties" in current) {
    const statut = extractPlainText((current.properties as Record<string, unknown>)["Statut"]);
    if (statut === "Inscrit(e)") {
      throw new Error(
        "Cette demande a été validée entre-temps. Modification impossible : gérez-la dans le CSM."
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {};

  if (fields.nom !== undefined) {
    properties["Nom"] = { title: [{ text: { content: fields.nom } }] };
  }
  if (fields.prenom !== undefined) {
    properties["Prénom"] = { rich_text: [{ text: { content: fields.prenom } }] };
  }
  if (fields.email !== undefined) {
    properties["E-mail"] = { email: fields.email };
  }
  if (fields.entreprise !== undefined) {
    properties["Entreprise"] = { rich_text: [{ text: { content: fields.entreprise } }] };
  }

  await notion.pages.update({ page_id: pageId, properties });
}

export async function deleteDemande(pageId: string): Promise<void> {
  // Garde-fou : on ne supprime jamais une inscription déjà validée.
  const page = await notion.pages.retrieve({ page_id: pageId });
  if ("properties" in page) {
    const statut = extractPlainText((page.properties as Record<string, unknown>)["Statut"]);
    if (statut === "Inscrit(e)") {
      throw new Error(
        "Impossible de supprimer une inscription validée. Utilisez la désinscription."
      );
    }
  }

  // Archive la page (suppression douce, restaurable dans Notion).
  await notion.pages.update({ page_id: pageId, archived: true });
}
