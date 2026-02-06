import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function main() {
  // Delete all GL (Globe Life) metrics since they were from D.R. Horton (wrong CIK)
  const { data: gl } = await sb.from("companies").select("id").eq("ticker", "GL").single();
  if (gl) {
    const { error: delErr } = await sb.from("financial_metrics").delete().eq("company_id", gl.id);
    console.log("Deleted GL (D.R. Horton) metrics:", delErr?.message || "OK");
    // Update CIK to correct Globe Life
    const { error } = await sb.from("companies").update({ cik: "0000320335" }).eq("ticker", "GL");
    console.log("Updated GL CIK to 0000320335:", error?.message || "OK");
  }
}

main().catch(console.error);
