// Representative hook-level test: only the true boundaries are mocked
// (Supabase client, useProfile, expo-router's useFocusEffect, NetInfo).
// lib/offline/mutate.ts, queue.ts and network.ts run for real, so this
// exercises the actual offline path a mutation takes, not a re-description
// of it.
import { act, renderHook, waitFor } from "@testing-library/react-native";
import NetInfo from "@react-native-community/netinfo";
import { useTodos } from "@/hooks/useTodos";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));
jest.mock("@/hooks/useProfile", () => ({ useProfile: jest.fn() }));
jest.mock("expo-router", () => ({ useFocusEffect: jest.fn() }));

const mockSupabase = supabase as unknown as { from: jest.Mock; channel: jest.Mock; removeChannel: jest.Mock };
const mockUseProfile = useProfile as jest.Mock;

let netInfoListener: (state: { isConnected: boolean; isInternetReachable: boolean }) => void = () => {};

beforeAll(() => {
  (NetInfo.addEventListener as jest.Mock).mockImplementation((cb: typeof netInfoListener) => {
    netInfoListener = cb;
    return jest.fn();
  });
});

beforeEach(() => {
  mockUseProfile.mockReturnValue({ profile: { id: "profile-1", family_id: "family-1" } });
  mockSupabase.channel.mockReturnValue({ on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis() });
});

function mockFromWithInsert(insert: jest.Mock) {
  mockSupabase.from.mockReturnValue({
    select: jest.fn(() => ({ order: jest.fn().mockResolvedValue({ data: [], error: null }) })),
    insert,
  });
}

describe("useTodos offline behavior", () => {
  it("inserts directly through Supabase while online", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockFromWithInsert(insert);

    const { result } = await renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTodo("Buy milk", null, "soon");
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Buy milk", family_id: "family-1", created_by: "profile-1" })
    );
    expect(result.current.todos.some((t) => t.title === "Buy milk")).toBe(true);
  });

  it("adds the todo optimistically and queues it instead of calling Supabase while offline", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockFromWithInsert(insert);

    await act(() => netInfoListener({ isConnected: false, isInternetReachable: false }));

    const { result } = await renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTodo("Buy bread", null, "soon");
    });

    expect(insert).not.toHaveBeenCalled();
    expect(result.current.todos.some((t) => t.title === "Buy bread")).toBe(true);

    await act(() => netInfoListener({ isConnected: true, isInternetReachable: true }));
  });
});
