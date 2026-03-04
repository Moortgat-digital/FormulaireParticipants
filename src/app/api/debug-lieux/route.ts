import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const GROUPS_DATABASE_ID = "2292b5dd-fdb8-81c3-a1a9-000b30c94de1";
const JOURNEES_DATABASE_ID = "22c2b5dd-fdb8-80b1-8837-000baed680f9";

export async function GET(request: NextRequest) {
  const formationId = request.nextUrl.searchParams.get("formationId") || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Record<string, any> = { formationId };

  // Step 1: Retrieve formation page
  if (formationId) {
    try {
      const page = await notion.pages.retrieve({ page_id: formationId });
      results.formationPage = {
        ok: true,
        id: page.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        properties: "properties" in page ? Object.keys(page.properties) : [],
      };
    } catch (err) {
      results.formationPage = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Step 2: Query groups with formation filter
  try {
    const response = await notion.dataSources.query({
      data_source_id: GROUPS_DATABASE_ID,
      filter: {
        property: "📚 Formation",
        relation: { contains: formationId },
      },
    });
    results.groupsQuery = {
      ok: true,
      count: response.results.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      groups: response.results.map((r: any) => ({
        id: r.id,
        properties: r.properties ? Object.keys(r.properties) : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: r.properties ? Object.values(r.properties).find((p: any) => p.type === "title") : null,
      })),
    };
  } catch (err) {
    results.groupsQuery = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Step 3: Query groups WITHOUT filter (to see if any exist)
  try {
    const response = await notion.dataSources.query({
      data_source_id: GROUPS_DATABASE_ID,
      page_size: 5,
    });
    results.allGroupsSample = {
      ok: true,
      count: response.results.length,
      hasMore: response.has_more,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sample: response.results.slice(0, 3).map((r: any) => ({
        id: r.id,
        properties: r.properties ? Object.keys(r.properties) : [],
      })),
    };
  } catch (err) {
    results.allGroupsSample = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Step 4: Check journées database access
  try {
    const response = await notion.dataSources.query({
      data_source_id: JOURNEES_DATABASE_ID,
      page_size: 3,
    });
    results.journeesAccess = {
      ok: true,
      count: response.results.length,
      hasMore: response.has_more,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sampleProps: response.results[0] && "properties" in response.results[0]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? Object.keys((response.results[0] as any).properties)
        : [],
    };
  } catch (err) {
    results.journeesAccess = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return NextResponse.json(results, { status: 200 });
}
