import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const GROUPS_DATABASE_ID = "2292b5ddfdb8809392d8d23fceb24d9a";

export async function GET(request: NextRequest) {
  const formationId = request.nextUrl.searchParams.get("formationId") || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Record<string, any> = { formationId };

  // Step 1: Try dataSources.retrieve
  try {
    const ds = await notion.dataSources.retrieve({
      data_source_id: GROUPS_DATABASE_ID,
    });
    results.dataSourceRetrieve = { ok: true, id: ds.id, type: ds.type };
  } catch (err) {
    results.dataSourceRetrieve = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Step 2: Try dataSources.query without filter
  try {
    const all = await notion.dataSources.query({
      data_source_id: GROUPS_DATABASE_ID,
      page_size: 3,
    });
    results.queryNoFilter = {
      ok: true,
      count: all.results.length,
      firstIds: all.results.slice(0, 2).map((r) => r.id),
    };
  } catch (err) {
    results.queryNoFilter = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Step 3: Try dataSources.query with filter
  if (formationId) {
    try {
      const filtered = await notion.dataSources.query({
        data_source_id: GROUPS_DATABASE_ID,
        filter: {
          property: "📚 Formation",
          relation: {
            contains: formationId,
          },
        },
      });
      results.queryWithFilter = {
        ok: true,
        count: filtered.results.length,
        firstIds: filtered.results.slice(0, 2).map((r) => r.id),
      };
    } catch (err) {
      results.queryWithFilter = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return NextResponse.json(results);
}
