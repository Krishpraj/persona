// Parse a Claude-style skill file: optional YAML frontmatter at the top with
// `name:` and `description:`, then the markdown body is the instructions.
//
// Example:
//   ---
//   name: Tax answer format
//   description: Use when the user asks about tax rules. Cite source docs.
//   ---
//
//   Follow these steps:
//   1. Search the tax docs.
//   2. Quote the relevant paragraph verbatim.
//   ...

export type ParsedSkill = {
  name?: string;
  description?: string;
  instructions: string;
};

const FRONTMATTER_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/;

export function parseSkillSource(src: string): ParsedSkill {
  const match = src.match(FRONTMATTER_RE);
  if (!match) {
    return { instructions: src.trim() };
  }
  const fm = match[1];
  const body = src.slice(match[0].length).trim();
  const meta: Record<string, string> = {};
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    let val = m[2].trim();
    // strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }
  return {
    name: meta.name || undefined,
    description: meta.description || undefined,
    instructions: body,
  };
}
