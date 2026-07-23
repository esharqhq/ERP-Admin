/**
 * Trigger a client-side CSV download. Cells are quote-escaped and the file is
 * prefixed with a UTF-8 BOM so Excel detects the encoding. CRLF line endings.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const escape = (value: string | number | null | undefined): string => {
    const raw = value == null ? "" : String(value);
    // Neutralize spreadsheet formula injection for TEXT cells only. Numeric
    // values (e.g. a negative coordinate like -51.5) keep their leading sign.
    const s =
      typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [headers, ...rows]
    .map((cols) => cols.map(escape).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
