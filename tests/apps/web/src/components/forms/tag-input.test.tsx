import { describe, it, expect } from "vitest";
import {
  normalizeTag,
  appendTags,
} from "../../../../../../apps/web/src/components/forms/tag-input";

describe("normalizeTag", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeTag("  natal  ")).toBe("natal");
  });

  it("lowercases the result", () => {
    expect(normalizeTag("CLIENT")).toBe("client");
  });

  it("trims then lowercases mixed-case input", () => {
    expect(normalizeTag("  Work  ")).toBe("work");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizeTag("   ")).toBe("");
  });

  it("leaves internal whitespace alone (non-issue for single-word tags)", () => {
    expect(normalizeTag("  Two Words  ")).toBe("two words");
  });
});

describe("appendTags — the Enter/paste commit path", () => {
  it("appends a single new tag", () => {
    expect(appendTags(["work"], ["client"])).toEqual(["work", "client"]);
  });

  it("normalizes (trim + lowercase) before appending", () => {
    expect(appendTags([], ["  Natal  "])).toEqual(["natal"]);
  });

  it("dedupes against existing tags", () => {
    expect(appendTags(["work"], ["WORK"])).toEqual(["work"]);
  });

  it("dedupes within the same paste batch", () => {
    expect(appendTags([], ["Work", "CLIENT", "client", "2024"])).toEqual([
      "work",
      "client",
      "2024",
    ]);
  });

  it("drops empty and whitespace-only candidates (e.g. trailing comma)", () => {
    expect(appendTags([], ["work", "", "   ", "client"])).toEqual([
      "work",
      "client",
    ]);
  });

  it("returns the existing array's values unchanged when nothing new sticks", () => {
    expect(appendTags(["a", "b"], ["A", "B", ""])).toEqual(["a", "b"]);
  });

  it("does not mutate the input array", () => {
    const input = ["work"];
    appendTags(input, ["client"]);
    expect(input).toEqual(["work"]);
  });

  it("handles the canonical paste example from the plan", () => {
    // "Work, CLIENT , client, 2024" splits on comma → appendTags applies
    // normalizeTag + dedupe.
    const pieces = "Work, CLIENT , client, 2024".split(",");
    expect(appendTags([], pieces)).toEqual(["work", "client", "2024"]);
  });
});
