import { byCategoryThenName } from "@/hooks/useGroceries";

// Also serves as a canary that hook files (which initialize the Supabase
// client at import time) load cleanly under Jest — see jest.setup.js.
describe("byCategoryThenName", () => {
  it("sorts by category order first", () => {
    const items = [
      { name: "Zucchini", category: "vegetables" },
      { name: "Apple", category: "fruits" },
    ];
    const sorted = [...items].sort(byCategoryThenName);
    expect(sorted.map((i) => i.name)).toEqual(["Apple", "Zucchini"]); // fruits before vegetables
  });

  it("sorts alphabetically within the same category", () => {
    const items = [
      { name: "Zucchini", category: "vegetables" },
      { name: "Carrot", category: "vegetables" },
      { name: "Apple", category: "vegetables" },
    ];
    const sorted = [...items].sort(byCategoryThenName);
    expect(sorted.map((i) => i.name)).toEqual(["Apple", "Carrot", "Zucchini"]);
  });

  it("treats an unknown category as sorting last", () => {
    const items = [
      { name: "Mystery item", category: "not-a-real-category" },
      { name: "Apple", category: "fruits" },
    ];
    const sorted = [...items].sort(byCategoryThenName);
    expect(sorted.map((i) => i.name)).toEqual(["Apple", "Mystery item"]);
  });
});
