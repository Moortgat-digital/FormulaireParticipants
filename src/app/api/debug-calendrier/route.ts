import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const JOURNEES_DATABASE_ID = "22c2b5dd-fdb8-80b1-8837-000baed680f9";

const ANIMATEURS_DATABASE_ID = "25c2b5dd-fdb8-8014-92fb-effebff0cd49";

/**
 * Debug endpoint: fetch 1 journée and return all property names + types.
 * GET /api/debug-calendrier
 * GET /api/debug-calendrier?test_email=xxx — test animateur lookup by email
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const testEmail = url.searchParams.get("test_email");

  if (testEmail) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Record<string, any> = { email: testEmail };

    // 1. Try dataSources.query with Animateurs DB
    try {
      const r1 = await notion.dataSources.query({
        data_source_id: ANIMATEURS_DATABASE_ID,
        filter: { property: "E-mail", email: { equals: testEmail } },
        page_size: 1,
      });
      results.dataSources = { found: r1.results.length > 0, id: r1.results[0]?.id ?? null };
    } catch (err) {
      results.dataSourcesError = String(err);
    }

    // 2. Try raw HTTP call to /databases/{id}/query
    try {
      const resp = await fetch(`https://api.notion.com/v1/databases/${ANIMATEURS_DATABASE_ID}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: { property: "E-mail", email: { equals: testEmail } },
          page_size: 1,
        }),
      });
      const data = await resp.json();
      if (data.results) {
        results.rawApi = { found: data.results.length > 0, id: data.results[0]?.id ?? null };
      } else {
        results.rawApi = { error: data.message || JSON.stringify(data) };
      }
    } catch (err) {
      results.rawApiError = String(err);
    }

    return NextResponse.json(results);
  }
  try {
    const response = await notion.dataSources.query({
      data_source_id: JOURNEES_DATABASE_ID,
      filter: {
        and: [
          { property: "📂 Session", relation: { is_not_empty: true } },
          { property: "📚 Formation", relation: { is_not_empty: true } },
        ],
      },
      page_size: 1,
    });

    if (response.results.length === 0) {
      return NextResponse.json({ message: "No results" });
    }

    const page = response.results[0];
    if (!("properties" in page)) {
      return NextResponse.json({ message: "No properties on page" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props: Record<string, any> = {};
    for (const [name, value] of Object.entries(page.properties)) {
      const v = value as { type: string; [k: string]: unknown };
      props[name] = {
        type: v.type,
        // Include a preview of the value
        preview: JSON.stringify(v).slice(0, 300),
      };
    }

    // Extract relation page IDs from the first journée
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const relationIds: Record<string, string[]> = {};
    for (const [name, value] of Object.entries(page.properties)) {
      const v = value as { type: string; [k: string]: unknown };
      if (v.type === "relation") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rel = (v as any).relation as { id: string }[];
        relationIds[name] = rel?.map((r) => r.id) ?? [];
      }
    }

    // If we have an animateur relation ID, fetch the page to find the parent database ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let animateurInfo: any = null;
    const animIds = relationIds["🧑‍🏫 Animateur"] ?? [];
    if (animIds.length > 0) {
      try {
        const animPage = await notion.pages.retrieve({ page_id: animIds[0] });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parent = (animPage as any).parent;
        animateurInfo = {
          pageId: animIds[0],
          parentType: parent?.type,
          parentDatabaseId: parent?.database_id ?? parent?.data_source_id ?? null,
        };
      } catch (e) {
        animateurInfo = { error: String(e) };
      }
    }

    return NextResponse.json({
      pageId: page.id,
      propertyNames: Object.keys(page.properties),
      relationIds,
      animateurInfo,
    });
  } catch (err) {
    console.error("Debug calendrier error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
