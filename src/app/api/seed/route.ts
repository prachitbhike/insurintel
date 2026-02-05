import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPANIES_SEED } from "@/lib/data/companies-seed";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results: { ticker: string; status: string }[] = [];

  for (const company of COMPANIES_SEED) {
    const { error } = await supabase.from("companies").upsert(
      {
        cik: company.cik,
        ticker: company.ticker,
        name: company.name,
        sector: company.sector,
        sub_sector: company.sub_sector,
        sic_code: company.sic_code,
        is_active: true,
      },
      { onConflict: "ticker" }
    );

    results.push({
      ticker: company.ticker,
      status: error ? `error: ${error.message}` : "ok",
    });
  }

  const successful = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status !== "ok");

  return NextResponse.json({
    message: `Seeded ${successful}/${results.length} companies`,
    failed,
  });
}
