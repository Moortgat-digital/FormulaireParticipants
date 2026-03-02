import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  notionVersion: "2022-06-28",
});

const GROUPS_DATABASE_ID = "2292b5ddfdb8809392d8d23fceb24d9a";

export async function GET(request: NextRequest) {
  const formationId = request.nextUrl.searchParams.get("formationId") || "";

  try {
    // Step 1: List properties of the Groups database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (await notion.databases.retrieve({
      database_id: GROUPS_DATABASE_ID,
    })) as any;

    const propertyNames = db.properties ? Object.keys(db.properties) : [];
    const propertyDetails = db.properties
      ? Object.entries(db.properties).map(([name, prop]: [string, any]) => ({
          name,
          type: prop.type,
        }))
      : [];

    // Step 2: Query without filter
    const allResults = await notion.dataSources.query({
      data_source_id: GROUPS_DATABASE_ID,
      page_size: 5,
    });

    // Step 3: Query with filter if formationId provided
    let filteredResults = null;
    let filterError = null;
    if (formationId) {
      try {
        filteredResults = await notion.dataSources.query({
          data_source_id: GROUPS_DATABASE_ID,
          filter: {
            property: "📚 Formation",
            relation: {
              contains: formationId,
            },
          },
        });
      } catch (err) {
        filterError = err instanceof Error ? err.message : String(err);
      }
    }

    return NextResponse.json({
      formationId,
      propertyNames,
      propertyDetails,
      allResultsCount: allResults.results.length,
      allResultsFirstPage: allResults.results.slice(0, 2).map((r) => ({
        id: r.id,
        hasProperties: "properties" in r,
      })),
      filteredResultsCount: filteredResults?.results.length ?? null,
      filterError,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        formationId,
      },
      { status: 500 }
    );
  }
}
