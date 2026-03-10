import { Client } from "@notionhq/client";
import type { CalendrierJournee } from "@/types/calendrier";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const JOURNEES_DATABASE_ID = "22c2b5dd-fdb8-80b1-8837-000baed680f9";
const ANIMATEURS_DATABASE_ID = "25c2b5dd-fdb8-8014-92fb-effebff0cd49";

// ---- helpers ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function prop(page: any, name: string) {
  return page.properties?.[name];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTitle(page: any, name: string): string {
  const p = prop(page, name);
  if (p?.type === "title")
    return p.title.map((t: { plain_text: string }) => t.plain_text).join("");
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSelect(page: any, name: string): string {
  const p = prop(page, name);
  return p?.type === "select" ? (p.select?.name ?? "") : "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDate(page: any, name: string): string {
  const p = prop(page, name);
  if (p?.type !== "date" || !p.date) return "";
  return p.date.start ?? "";
}

/**
 * Extract text from a rollup of type "array" (show_original).
 * Handles title, rich_text, and people items inside the array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRollupText(page: any, name: string): string {
  const p = prop(page, name);
  if (p?.type !== "rollup" || p.rollup?.type !== "array") return "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arr = p.rollup.array as any[];
  return arr
    .map((item) => {
      if (item.type === "title" && item.title)
        return item.title.map((t: { plain_text: string }) => t.plain_text).join("");
      if (item.type === "rich_text" && item.rich_text)
        return item.rich_text.map((t: { plain_text: string }) => t.plain_text).join("");
      if (item.type === "people" && item.people)
        return item.people.map((u: { name?: string }) => u.name ?? "").filter(Boolean).join(", ");
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

/**
 * Extract animateur trying multiple fallback properties.
 * Skips empty values to try the next property.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAnimateur(page: any): string {
  // 1. "Aff./Animateur" rollup
  const aff = extractRollupText(page, "Aff./Animateur");
  if (aff) return aff;

  // 2. "Affichage/Animateur" rollup
  const affichage = extractRollupText(page, "Affichage/Animateur");
  if (affichage) return affichage;

  // 3. "aff./Nom complet Anim" formula
  const formula = prop(page, "aff./Nom complet Anim");
  if (formula?.type === "formula" && formula.formula?.type === "string" && formula.formula.string) {
    return formula.formula.string;
  }

  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasNonEmptyRelation(page: any, name: string): boolean {
  const p = prop(page, name);
  if (!p) return false;
  if (p.type === "relation") return p.relation?.length > 0;
  return false;
}

// ---- animateur lookup by email ----

async function findAnimateurIdByEmail(email: string): Promise<string | null> {
  // Use raw REST API — dataSources.query doesn't work for this database
  const resp = await fetch(
    `https://api.notion.com/v1/databases/${ANIMATEURS_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: { property: "E-mail", email: { equals: email } },
        page_size: 1,
      }),
    }
  );
  if (!resp.ok) {
    console.error("findAnimateurIdByEmail error:", resp.status, await resp.text());
    return null;
  }
  const data = await resp.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0].id;
}

// ---- main query ----

export async function getCalendrierJournees(
  startDate: string,
  endDate: string,
  animateurEmail?: string
): Promise<CalendrierJournee[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [
    { property: "📂 Session", relation: { is_not_empty: true } },
    { property: "📚 Formation", relation: { is_not_empty: true } },
    { property: "Début", date: { on_or_after: startDate } },
    { property: "Début", date: { on_or_before: endDate } },
  ];

  if (animateurEmail) {
    const animateurPageId = await findAnimateurIdByEmail(animateurEmail);
    if (!animateurPageId) {
      // No animateur found with this email — return empty
      return [];
    }
    conditions.push({
      property: "🧑‍🏫 Animateur",
      relation: { contains: animateurPageId },
    });
  }

  const filter = { and: conditions };

  // Paginate through all results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allResults: any[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      data_source_id: JOURNEES_DATABASE_ID,
      filter,
      sorts: [{ property: "Début", direction: "ascending" }],
    };
    if (startCursor) params.start_cursor = startCursor;

    const response = await notion.dataSources.query(params);
    allResults.push(
      ...response.results.filter(
        (p): p is Extract<typeof p, { properties: unknown }> => "properties" in p
      )
    );
    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  // Extract data directly from rollups — no batch-fetch needed
  return allResults.map((page) => {
    // "Code" is the title field, e.g. "TR01 - ASSEOIR SA LEGITIMITE - 69311"
    // Extract just the code prefix (before first " - ")
    const fullCode = extractTitle(page, "Code");
    const code = fullCode.split(" - ")[0] || fullCode;

    // Use rollups for formation and group names (already computed by Notion)
    const formationNom = extractRollupText(page, "Affichage/Formation");
    const groupeNom = extractRollupText(page, "Affichage/Groupe");
    const animateur = extractAnimateur(page);

    const dateDebutStr = extractDate(page, "Début");
    let date = "";
    let heure = "";
    if (dateDebutStr) {
      if (dateDebutStr.includes("T")) {
        date = dateDebutStr.slice(0, 10);
        heure = dateDebutStr.slice(11, 16);
      } else {
        date = dateDebutStr;
      }
    }

    const dateFinStr = extractDate(page, "Fin");
    let heureFin = "";
    if (dateFinStr && dateFinStr.includes("T")) {
      heureFin = dateFinStr.slice(11, 16);
    }

    return {
      id: page.id,
      code,
      formationNom,
      groupeNom,
      animateur,
      date,
      heure,
      heureFin,
      etat: extractSelect(page, "État"),
      hasEvaluations: hasNonEmptyRelation(page, "✒️ Evaluations à chaud"),
    };
  });
}
