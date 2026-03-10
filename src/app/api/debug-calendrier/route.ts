import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const JOURNEES_DATABASE_ID = "22c2b5dd-fdb8-80b1-8837-000baed680f9";

/**
 * Debug endpoint: fetch 1 journée and return all property names + types.
 * GET /api/debug-calendrier
 */
export async function GET() {
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

    return NextResponse.json({
      pageId: page.id,
      propertyNames: Object.keys(page.properties),
      properties: props,
    });
  } catch (err) {
    console.error("Debug calendrier error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
