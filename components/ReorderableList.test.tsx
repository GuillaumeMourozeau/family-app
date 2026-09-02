// The drag gesture itself runs through PanResponder's low-level touch
// responder system (raw onResponderMove/touch-history math), which isn't
// practically simulable through fireEvent — so this covers the two things
// that are cleanly testable without reimplementing RN's gesture internals:
// initial row layout, and syncing an updated `data` prop back into the
// list while nothing is being dragged.
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { ReorderableList } from "@/components/ReorderableList";

type Item = { id: string; name: string };

const ITEMS: Item[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Bravo" },
  { id: "c", name: "Charlie" },
];

describe("ReorderableList", () => {
  it("renders one row per item, stacked rowHeight apart, in the given order", async () => {
    const { getByText, toJSON } = await render(
      <ReorderableList data={ITEMS} keyExtractor={(item: Item) => item.id} renderRow={(item: Item) => <Text>{item.name}</Text>} rowHeight={50} />
    );

    expect(getByText("Alpha")).toBeTruthy();
    expect(getByText("Bravo")).toBeTruthy();
    expect(getByText("Charlie")).toBeTruthy();

    const json = toJSON() as any;
    expect(json.props.style.height).toBe(150); // 3 rows * rowHeight
    expect(json.children.map((row: any) => row.props.style.top)).toEqual([0, 50, 100]);
  });

  it("reflects an updated data prop once nothing is being dragged", async () => {
    const { getByText, queryByText, rerender } = await render(
      <ReorderableList data={ITEMS} keyExtractor={(item: Item) => item.id} renderRow={(item: Item) => <Text>{item.name}</Text>} />
    );
    expect(getByText("Alpha")).toBeTruthy();

    const updated: Item[] = [{ id: "d", name: "Delta" }];
    await rerender(
      <ReorderableList data={updated} keyExtractor={(item: Item) => item.id} renderRow={(item: Item) => <Text>{item.name}</Text>} />
    );

    expect(queryByText("Alpha")).toBeNull();
    expect(queryByText("Bravo")).toBeNull();
    expect(getByText("Delta")).toBeTruthy();
  });
});
