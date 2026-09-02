import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { BottomSheetModal } from "@/components/BottomSheetModal";

describe("BottomSheetModal", () => {
  it("renders nothing when not visible, and the sheet when visible", async () => {
    const { toJSON, rerender } = await render(
      <BottomSheetModal visible={false} onClose={jest.fn()}>
        <Text>content</Text>
      </BottomSheetModal>
    );
    expect(toJSON()).toBeNull();

    await rerender(
      <BottomSheetModal visible onClose={jest.fn()}>
        <Text>content</Text>
      </BottomSheetModal>
    );
    expect(toJSON()).not.toBeNull();
  });

  it("renders the children inside the sheet", async () => {
    const { getByText } = await render(
      <BottomSheetModal visible onClose={jest.fn()}>
        <Text>Hello sheet</Text>
      </BottomSheetModal>
    );
    expect(getByText("Hello sheet")).toBeTruthy();
  });

  it("calls onClose when the backdrop is pressed", async () => {
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <BottomSheetModal visible onClose={onClose}>
        <Text>content</Text>
      </BottomSheetModal>
    );
    fireEvent.press(getByTestId("bottomSheetBackdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the footer outside the scrollable content only when provided", async () => {
    const { getByText, queryByText, rerender } = await render(
      <BottomSheetModal visible onClose={jest.fn()} footer={<Text>Save</Text>}>
        <Text>content</Text>
      </BottomSheetModal>
    );
    expect(getByText("Save")).toBeTruthy();

    await rerender(
      <BottomSheetModal visible onClose={jest.fn()}>
        <Text>content</Text>
      </BottomSheetModal>
    );
    expect(queryByText("Save")).toBeNull();
  });
});
