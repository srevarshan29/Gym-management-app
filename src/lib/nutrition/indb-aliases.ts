/**
 * Derive English / local / common-name search aliases from INDB recipe names.
 * Does not alter nutrition values — text-only helpers for catalog search.
 */
export function extractParentheticalAliases(foodName: string): string[] {
  const aliases: string[] = [];
  const re = /\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(foodName)) !== null) {
    const inner = match[1]?.trim();
    if (!inner) continue;
    for (const part of inner.split(/[/,]/)) {
      const trimmed = part.trim();
      if (trimmed.length >= 2) aliases.push(trimmed);
    }
  }
  return aliases;
}

export function extractSlashAliases(foodName: string): string[] {
  const aliases: string[] = [];
  const primary = foodName.split("(")[0]?.trim() ?? foodName;
  for (const part of primary.split("/")) {
    const trimmed = part.trim();
    if (trimmed.length >= 2 && trimmed !== primary) {
      aliases.push(trimmed);
    }
  }
  if (primary.includes("/")) {
    const first = primary.split("/")[0]?.trim();
    const second = primary.split("/")[1]?.trim();
    if (first && first.length >= 2) aliases.push(first);
    if (second && second.length >= 2) aliases.push(second);
  }
  return aliases;
}

export function buildIndbSearchAliases(
  foodName: string,
  extras: string[] = [],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };

  for (const alias of [
    ...extractParentheticalAliases(foodName),
    ...extractSlashAliases(foodName),
    ...extras,
  ]) {
    add(alias);
  }

  return out;
}
