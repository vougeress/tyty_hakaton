import { describe, expect, it } from "vitest";
import { validateCustomIdeaInput } from "./custom-candidate";

describe("validateCustomIdeaInput", () => {
  it("accepts and normalizes an HTTPS URL", () => {
    expect(validateCustomIdeaInput("  Прогулка  ", "https://example.com/path")).toEqual({
      title: "Прогулка",
      url: "https://example.com/path"
    });
  });

  it.each(["http://example.com", "javascript:alert(1)", "not-a-url"])("rejects unsafe URL %s", (url) => {
    expect(() => validateCustomIdeaInput("Прогулка", url)).toThrow();
  });
});
