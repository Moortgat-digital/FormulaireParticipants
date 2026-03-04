import { Client } from "@notionhq/client";
import type { Formation, GroupeSession, Journee, Mode, LieuData } from "@/types/lieux";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const GROUPS_DATABASE_ID = "2292b5dd-fdb8-81c3-a1a9-000b30c94de1";
const JOURNEES_DATABASE_ID = "22c2b5dd-fdb8-80b1-8837-000baed680f9";

// ---- Property extraction helpers ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(page: any, propName: string): string {
  const prop = page.properties[propName];
  if (!prop) return "";
  if (prop.type === "title")
    return prop.title.map((t: { plain_text: string }) => t.plain_text).join("");
  if (prop.type === "rich_text")
    return prop.rich_text.map((t: { plain_text: string }) => t.plain_text).join("");
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSelect(page: any, propName: string): string {
  const prop = page.properties[propName];
  return prop?.type === "select" ? prop.select?.name ?? "" : "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDate(page: any, propName: string, part: "start" | "end" = "start"): string {
  const prop = page.properties[propName];
  if (prop?.type !== "date" || !prop.date) return "";
  return part === "end" ? prop.date.end ?? "" : prop.date.start ?? "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractNumber(page: any, propName: string): number | null {
  const prop = page.properties[propName];
  return prop?.type === "number" ? prop.number : null;
}

// ---- Read functions ----

export async function getFormation(formationId: string): Promise<Formation> {
  try {
    const page = await notion.pages.retrieve({ page_id: formationId });
    if ("properties" in page) {
      // Try "Intitulé" first (actual Notion field), fallback to title property
      const nom = extractText(page, "Intitulé") || extractText(page, "Nom") || extractText(page, "Sujet");
      return { id: formationId, nom };
    }
    return { id: formationId, nom: "" };
  } catch {
    return { id: formationId, nom: "" };
  }
}

export async function getGroupsByFormation(
  formationId: string
): Promise<GroupeSession[]> {
  try {
    const response = await notion.dataSources.query({
      data_source_id: GROUPS_DATABASE_ID,
      filter: {
        property: "📚 Formation",
        relation: { contains: formationId },
      },
      sorts: [{ property: "Début", direction: "ascending" }],
    });

    return response.results
      .filter(
        (page): page is Extract<typeof page, { properties: unknown }> =>
          "properties" in page
      )
      .map((page) => ({
        id: page.id,
        nom: extractText(page, "Nom"),
        lieu: extractText(page, "Lieu"),
        dateDebut: extractDate(page, "Début"),
        dateFin: extractDate(page, "Fin"),
        etat: extractSelect(page, "État"),
        journees: [],
      }))
      .filter((g) => g.nom !== "");
  } catch (err) {
    console.error("Error fetching groups for lieux:", err);
    return [];
  }
}

export async function getJourneesByGroup(groupId: string): Promise<Journee[]> {
  try {
    const response = await notion.dataSources.query({
      data_source_id: JOURNEES_DATABASE_ID,
      filter: {
        property: "📂 Session",
        relation: { contains: groupId },
      },
      sorts: [{ property: "Début", direction: "ascending" }],
    });

    return response.results
      .filter(
        (page): page is Extract<typeof page, { properties: unknown }> =>
          "properties" in page
      )
      .map((page) => {
        const lieu = extractText(page, "Lieu");
        const mode = extractSelect(page, "Mode") as Mode | "";
        return {
          id: page.id,
          code: extractText(page, "Code"),
          nom: extractText(page, "Nom"),
          dateDebut: extractDate(page, "Début"),
          dateDebutEnd: extractDate(page, "Début", "end"),
          dateFin: extractDate(page, "Fin"),
          mode,
          lieu,
          adresse: extractText(page, "Adresse"),
          ville: extractText(page, "Ville"),
          codePostal: extractNumber(page, "Code postal"),
          pays: extractText(page, "Pays"),
          statut: extractSelect(page, "Statut"),
          prefilled: lieu !== "" || mode !== "",
        };
      });
  } catch (err) {
    console.error("Error fetching journees:", err);
    return [];
  }
}

export async function getFullFormationData(formationId: string): Promise<{
  formation: Formation;
  groups: GroupeSession[];
}> {
  const [formation, groups] = await Promise.all([
    getFormation(formationId),
    getGroupsByFormation(formationId),
  ]);

  // Fetch journees for all groups in parallel
  const groupsWithJournees = await Promise.all(
    groups.map(async (group) => {
      const journees = await getJourneesByGroup(group.id);
      return { ...group, journees };
    })
  );

  return { formation, groups: groupsWithJournees };
}

// ---- Write functions ----

export async function patchJournee(journeeId: string, lieu: LieuData): Promise<void> {
  // Only write address fields + Statut. Mode is managed by Moortgat, not the client.
  await notion.pages.update({
    page_id: journeeId,
    properties: {
      Lieu: {
        rich_text: lieu.nom ? [{ text: { content: lieu.nom } }] : [],
      },
      Adresse: {
        rich_text: lieu.adresse ? [{ text: { content: lieu.adresse } }] : [],
      },
      Ville: {
        rich_text: lieu.ville ? [{ text: { content: lieu.ville } }] : [],
      },
      "Code postal": {
        number: lieu.codePostal ? parseInt(lieu.codePostal, 10) : null,
      },
      Pays: {
        rich_text: lieu.pays ? [{ text: { content: lieu.pays } }] : [],
      },
      Statut: { select: { name: "À synchroniser" } },
    },
  });
}

export async function patchGroupLieu(groupId: string, lieuLabel: string): Promise<void> {
  await notion.pages.update({
    page_id: groupId,
    properties: {
      Lieu: {
        rich_text: lieuLabel ? [{ text: { content: lieuLabel } }] : [],
      },
    },
  });
}
