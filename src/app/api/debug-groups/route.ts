import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const GROUPS_DATABASE_ID = "2292b5ddfdb8809392d8d23fceb24d9a";

export async function GET(request: NextRequest) {
  const formationId = request.nextUrl.searchParams.get("formationId") || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Record<string, any> = { formationId, hardcodedId: GROUPS_DATABASE_ID };

  // Step 0: Search for databases accessible to this integration
  try {
    const search = await notion.search({
      filter: { value: "data_source", property: "object" },
      page_size: 20,
    });
    results.searchDatabases = {
      ok: true,
      count: search.results.length,
      databases: search.results.map((r) => ({
        id: r.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: "title" in r ? (r as any).title?.map((t: any) => t.plain_text).join("") : "?",
      })),
    };
  } catch (err) {
    results.searchDatabases = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Step 1: Try dataSources.retrieve with hardcoded ID
  try {
    const ds = await notion.dataSources.retrieve({
      data_source_id: GROUPS_DATABASE_ID,
    });
    results.dataSourceRetrieve = { ok: true, id: ds.id };
  } catch (err) {
    results.dataSourceRetrieve = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return NextResponse.json(results);
}
