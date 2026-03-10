import { Client } from "@notionhq/client";
import type { CalendrierJournee } from "@/types/calendrier";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const JOURNEES_DATABASE_ID = "22c2b5dd-fdb8-80b1-8837-000baed680f9";

// ---- helpers ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function prop(page: any, name: string) {
  return page.properties?.[name];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(page: any, name: string): string {
  const p = prop(page, name);
  if (!p) return "";
  if (p.type === "title")
    return p.title.map((t: { plain_text: string }) => t.plain_text).join("");
  if (p.type === "rich_text")
    return p.rich_text.map((t: { plain_text: string }) => t.plain_text).join("");
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRelationIds(page: any, name: string): string[] {
  const p = prop(page, name);
  if (p?.type !== "relation") return [];
  return p.relation.map((r: { id: string }) => r.id);
}

/**
 * Try to extract animateur from various property types.
 * Handles: people, relation, rollup, rich_text, formula.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAnimateur(page: any): string {
  // Try multiple possible property names
  const names = ["Aff./Animateur", "Animateur", "Aff. / Animateur"];
  for (const name of names) {
    const p = prop(page, name);
    if (!p) continue;

    if (p.type === "people" && p.people?.length > 0) {
      return p.people.map((u: { name?: string }) => u.name ?? "").filter(Boolean).join(", ");
    }
    if (p.type === "rich_text" && p.rich_text?.length > 0) {
      return p.rich_text.map((t: { plain_text: string }) => t.plain_text).join("");
    }
    if (p.type === "rollup" && p.rollup?.type === "array") {
      const arr = p.rollup.array as { type: string; title?: { plain_text: string }[]; rich_text?: { plain_text: string }[] }[];
      return arr
        .map((item) => {
          if (item.type === "title" && item.title) return item.title.map((t) => t.plain_text).join("");
          if (item.type === "rich_text" && item.rich_text) return item.rich_text.map((t) => t.plain_text).join("");
          return "";
        })
        .filter(Boolean)
        .join(", ");
    }
    if (p.type === "formula") {
      if (p.formula?.type === "string") return p.formula.string ?? "";
    }
    if (p.type === "relation" && p.relation?.length > 0) {
      // Will resolve later via batch fetch
      return `__rel__:${p.relation.map((r: { id: string }) => r.id).join(",")}`;
    }
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

// ---- page title fetcher (batch) ----

async function fetchPageTitles(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // Deduplicate
  const unique = [...new Set(ids)];

  // Fetch in parallel batches of 10 (respect rate limits)
  const BATCH = 10;
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((id) => notion.pages.retrieve({ page_id: id }))
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled" && "properties" in r.value) {
        const page = r.value;
        for (const p of Object.values(page.properties)) {
          const tp = p as { type: string; title?: { plain_text: string }[] };
          if (tp.type === "title" && tp.title && tp.title.length > 0) {
            map.set(batch[j], tp.title.map((t) => t.plain_text).join(""));
            break;
          }
        }
      }
    }
    // Small delay between batches to respect rate limits
    if (i + BATCH < unique.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return map;
}

// ---- main query ----

export async function getCalendrierJournees(
  startDate: string,
  endDate: string
): Promise<CalendrierJournee[]> {
  // Build compound filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {
    and: [
      { property: "📂 Session", relation: { is_not_empty: true } },
      { property: "📚 Formation", relation: { is_not_empty: true } },
      { property: "Début", date: { on_or_after: startDate } },
      { property: "Début", date: { on_or_before: endDate } },
    ],
  };

  // Paginate
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

  // Collect relation IDs to batch-fetch
  const formationIds = new Set<string>();
  const sessionIds = new Set<string>();
  const animateurRelIds = new Set<string>();

  const rawData = allResults.map((page) => {
    const fIds = extractRelationIds(page, "📚 Formation");
    const sIds = extractRelationIds(page, "📂 Session");
    fIds.forEach((id) => formationIds.add(id));
    sIds.forEach((id) => sessionIds.add(id));

    const animRaw = extractAnimateur(page);
    if (animRaw.startsWith("__rel__:")) {
      animRaw
        .replace("__rel__:", "")
        .split(",")
        .forEach((id) => animateurRelIds.add(id));
    }

    const dateStr = extractDate(page, "Début");
    let date = "";
    let heure = "";
    if (dateStr) {
      // Could be "2026-03-10" or "2026-03-10T09:00:00.000+01:00"
      if (dateStr.includes("T")) {
        date = dateStr.slice(0, 10);
        const timePart = dateStr.slice(11, 16); // "09:00"
        heure = timePart;
      } else {
        date = dateStr;
      }
    }

    return {
      id: page.id,
      code: extractText(page, "Code"),
      formationIds: fIds,
      sessionIds: sIds,
      animRaw,
      date,
      heure,
      etat: extractSelect(page, "État"),
      hasEvaluations: hasNonEmptyRelation(page, "✒️ Evaluations à chaud"),
    };
  });

  // Batch fetch titles
  const allRelIds = [...formationIds, ...sessionIds, ...animateurRelIds];
  const titleMap = await fetchPageTitles(allRelIds);

  // Build final result
  return rawData.map((r) => {
    const formationNom = r.formationIds.map((id) => titleMap.get(id) ?? "").filter(Boolean).join(", ");
    const groupeNom = r.sessionIds.map((id) => titleMap.get(id) ?? "").filter(Boolean).join(", ");

    let animateur = r.animRaw;
    if (animateur.startsWith("__rel__:")) {
      animateur = animateur
        .replace("__rel__:", "")
        .split(",")
        .map((id) => titleMap.get(id) ?? "")
        .filter(Boolean)
        .join(", ");
    }

    return {
      id: r.id,
      code: r.code,
      formationNom,
      groupeNom,
      animateur,
      date: r.date,
      heure: r.heure,
      etat: r.etat,
      hasEvaluations: r.hasEvaluations,
    };
  });
}
