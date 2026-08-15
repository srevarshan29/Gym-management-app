/** Escape a cell for RFC 4180-style CSV. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvHeaderLine(headers: string[]): string {
  return `\uFEFF${headers.map(escapeCsvCell).join(",")}`;
}

export function csvDataLine(row: (string | number)[]): string {
  return `\r\n${row.map(escapeCsvCell).join(",")}`;
}

export function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
  return csvHeaderLine(headers) + rows.map((row) => csvDataLine(row)).join("");
}

