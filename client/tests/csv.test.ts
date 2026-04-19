import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("returns an empty row set for empty input", () => {
    // Known behaviour: empty input produces a single empty column header, no
    // rows. We assert this explicitly so future changes are intentional.
    expect(parseCsv("")).toEqual({ columns: [""], rows: [] });
  });

  it("parses a simple header + rows", () => {
    const out = parseCsv("name,age\nAda,36\nLinus,54");
    expect(out.columns).toEqual(["name", "age"]);
    expect(out.rows).toEqual([
      { name: "Ada", age: "36" },
      { name: "Linus", age: "54" },
    ]);
  });

  it("skips blank lines", () => {
    const out = parseCsv("a,b\n1,2\n\n3,4\n");
    expect(out.rows).toHaveLength(2);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    // Note: this minimal parser splits on newlines before tokenising, so a
    // quoted field that spans multiple lines is not supported. Kept single
    // line here; the multi-line case is asserted separately below.
    const out = parseCsv('title,body\n"hello, world","he said ""hi"""');
    expect(out.rows).toEqual([
      { title: "hello, world", body: 'he said "hi"' },
    ]);
  });

  it("does not span quoted fields across lines (documented limitation)", () => {
    const src = 'title,body\n"hello","line one\nline two"';
    const out = parseCsv(src);
    // Proves the parser splits on the embedded \n — if it ever gains
    // multi-line quote support, this test will need updating.
    expect(out.rows.length).toBeGreaterThan(1);
  });

  it("fills missing cells with empty string", () => {
    const out = parseCsv("a,b,c\n1,2");
    expect(out.rows[0]).toEqual({ a: "1", b: "2", c: "" });
  });
});

describe("toCsv", () => {
  it("round-trips simple data", () => {
    const round = parseCsv(
      toCsv(["name", "age"], [{ name: "Ada", age: "36" }])
    );
    expect(round.columns).toEqual(["name", "age"]);
    expect(round.rows).toEqual([{ name: "Ada", age: "36" }]);
  });

  it("quotes cells that contain commas or quotes", () => {
    const csv = toCsv(["x"], [{ x: 'a,b "c"' }]);
    expect(csv).toContain('"a,b ""c"""');
  });

  it("emits a header-only line when rows is empty", () => {
    expect(toCsv(["a", "b"], [])).toBe("a,b\n");
  });
});
