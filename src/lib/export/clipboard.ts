export async function copyTableToClipboard(
  headers: string[],
  rows: (string | number | null)[][]
): Promise<boolean> {
  const headerLine = headers.join("\t");
  const dataLines = rows.map((row) =>
    row.map((cell) => (cell == null ? "" : String(cell))).join("\t")
  );
  const tsv = [headerLine, ...dataLines].join("\n");

  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch {
    return false;
  }
}
