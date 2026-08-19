import { describe, expect, it } from "vitest";
import { ideasSelectionKey, readIdeasSelection, writeIdeasSelection } from "./selection-storage";

describe("ideas selection storage", () => {
  it("round-trips stable, unique candidate ids", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    };
    writeIdeasSelection(storage, "gap-1", ["two", "one", "two"]);
    expect(readIdeasSelection(storage, "gap-1")).toEqual(["one", "two"]);
    expect(values.has(ideasSelectionKey("gap-1"))).toBe(true);
  });

  it("treats malformed values as an empty selection", () => {
    expect(readIdeasSelection({ getItem: () => "not-json" }, "gap-1")).toEqual([]);
  });
});
