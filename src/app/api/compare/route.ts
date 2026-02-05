import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getComparisonData } from "@/lib/queries/compare";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companiesParam = searchParams.get("companies");

  if (!companiesParam) {
    return NextResponse.json(
      { error: "Missing companies parameter" },
      { status: 400 }
    );
  }

  const tickers = companiesParam.split(",").slice(0, 5);

  try {
    const supabase = await createClient();
    const data = await getComparisonData(supabase, tickers);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Compare API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}
