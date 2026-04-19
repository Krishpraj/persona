import { describe, expect, it } from "vitest";
import { parseSkillSource } from "@/lib/skills";

describe("parseSkillSource", () => {
  it("returns the whole body as instructions when there's no frontmatter", () => {
    const parsed = parseSkillSource("# Just a heading\n\nSome steps.");
    expect(parsed.name).toBeUndefined();
    expect(parsed.description).toBeUndefined();
    expect(parsed.instructions).toBe("# Just a heading\n\nSome steps.");
  });

  it("parses name and description out of YAML frontmatter", () => {
    const src = [
      "---",
      "name: Tax answer format",
      "description: Use when the user asks about taxes.",
      "---",
      "",
      "Step one.",
      "Step two.",
    ].join("\n");
    const parsed = parseSkillSource(src);
    expect(parsed.name).toBe("Tax answer format");
    expect(parsed.description).toBe("Use when the user asks about taxes.");
    expect(parsed.instructions).toBe("Step one.\nStep two.");
  });

  it("strips surrounding quotes from frontmatter values", () => {
    const src = '---\nname: "Quoted Name"\ndescription: \'Quoted Desc\'\n---\nBody';
    const parsed = parseSkillSource(src);
    expect(parsed.name).toBe("Quoted Name");
    expect(parsed.description).toBe("Quoted Desc");
  });

  it("tolerates Windows line endings", () => {
    const src = "---\r\nname: Win\r\n---\r\nbody\r\n";
    const parsed = parseSkillSource(src);
    expect(parsed.name).toBe("Win");
    expect(parsed.instructions).toBe("body");
  });

  it("ignores malformed lines in frontmatter instead of crashing", () => {
    const src = "---\nnot valid yaml here\nname: ok\n---\nbody";
    const parsed = parseSkillSource(src);
    expect(parsed.name).toBe("ok");
    expect(parsed.instructions).toBe("body");
  });
});
