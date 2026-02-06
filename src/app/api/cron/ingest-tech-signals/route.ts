import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanySubmissions, getFiling10KText } from "@/lib/edgar/submissions-client";
import { analyzeFilingText } from "@/lib/edgar/text-analyzer";

const BATCH_SIZE = 4;

export const maxDuration = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // Get companies that need tech signal analysis
    // Find companies without tech_adoption_signals or with oldest signals
    const { data: companies } = await supabase
      .from("companies")
      .select("id, ticker, name, cik")
      .order("updated_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (!companies || companies.length === 0) {
      return NextResponse.json({ message: "No companies to process" });
    }

    const results: { ticker: string; signalsCreated: number; errors: string[] }[] = [];

    for (const company of companies) {
      const companyResult = { ticker: company.ticker, signalsCreated: 0, errors: [] as string[] };

      try {
        // Get 10-K filings from submissions API
        const filings = await getCompanySubmissions(company.cik);

        // Check which fiscal years we already have
        const { data: existing } = await supabase
          .from("tech_adoption_signals")
          .select("fiscal_year")
          .eq("company_id", company.id);

        const existingYears = new Set((existing ?? []).map((e) => e.fiscal_year));

        // Process each filing (limit to recent 4 years)
        const recentFilings = filings.slice(0, 4);

        for (const filing of recentFilings) {
          // reportDate is the period-of-report end date (e.g., 2024-12-31 for FY2024)
          // All 41 companies are Dec 31 FYE, so reportDate year = fiscal year
          const fiscalYear = new Date(filing.reportDate).getFullYear();

          if (existingYears.has(fiscalYear)) continue;

          try {
            const text = await getFiling10KText(company.cik, filing.accessionNumber, filing.primaryDocument);
            const analysis = analyzeFilingText(text);

            // Get previous year's density for YoY change
            let yoyDensityChange: number | null = null;
            const { data: prevSignal } = await supabase
              .from("tech_adoption_signals")
              .select("tech_density_score")
              .eq("company_id", company.id)
              .eq("fiscal_year", fiscalYear - 1)
              .single();

            if (prevSignal) {
              yoyDensityChange = analysis.techDensityScore - prevSignal.tech_density_score;
            }

            await supabase
              .from("tech_adoption_signals")
              .upsert({
                company_id: company.id,
                fiscal_year: fiscalYear,
                filing_date: filing.filingDate,
                accession_number: filing.accessionNumber,
                total_word_count: analysis.totalWordCount,
                ai_mention_count: analysis.aiMentionCount,
                ml_mention_count: analysis.mlMentionCount,
                automation_mention_count: analysis.automationMentionCount,
                digital_transformation_mention_count: analysis.digitalTransformationMentionCount,
                insurtech_mention_count: analysis.insurtechMentionCount,
                total_tech_mentions: analysis.totalTechMentions,
                tech_density_score: analysis.techDensityScore,
                classification: analysis.classification,
                yoy_density_change: yoyDensityChange,
                keyword_snippets: analysis.keywordSnippets,
              }, {
                onConflict: "company_id,fiscal_year",
              });

            companyResult.signalsCreated++;
          } catch (e) {
            companyResult.errors.push(`FY${fiscalYear}: ${e instanceof Error ? e.message : "Unknown error"}`);
          }
        }
      } catch (e) {
        companyResult.errors.push(e instanceof Error ? e.message : "Unknown error");
      }

      results.push(companyResult);
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
