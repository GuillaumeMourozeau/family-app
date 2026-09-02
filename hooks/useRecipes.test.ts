// Same boundary-mocking approach as useTodos.test.ts: only Supabase,
// useProfile and NetInfo are mocked — lib/offline/mutate.ts, queue.ts and
// network.ts run for real. Recipes are the one hook here that write to two
// tables per mutation (recipes + recipe_ingredients), which is the part
// worth covering that useTodos's single-table case doesn't exercise.
import { act, renderHook, waitFor } from "@testing-library/react-native";
import NetInfo from "@react-native-community/netinfo";
import { useRecipes } from "@/hooks/useRecipes";
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

function mockFrom() {
  const recipesInsert = jest.fn().mockResolvedValue({ error: null });
  const ingredientsInsert = jest.fn().mockResolvedValue({ error: null });
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === "recipes") {
      return {
        select: jest.fn(() => ({ order: jest.fn().mockResolvedValue({ data: [], error: null }) })),
        insert: recipesInsert,
      };
    }
    return {
      select: jest.fn(() => ({ in: jest.fn(() => ({ order: jest.fn().mockResolvedValue({ data: [], error: null }) })) })),
      insert: ingredientsInsert,
    };
  });
  return { recipesInsert, ingredientsInsert };
}

describe("useRecipes offline behavior", () => {
  it("inserts the recipe and its ingredients directly through Supabase while online", async () => {
    const { recipesInsert, ingredientsInsert } = mockFrom();

    const { result } = await renderHook(() => useRecipes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addRecipe("Pancakes", null, [], [{ quantity: "2 cups", name: "Flour" }]);
    });

    expect(recipesInsert).toHaveBeenCalledWith(expect.objectContaining({ name: "Pancakes", family_id: "family-1", created_by: "profile-1" }));
    expect(ingredientsInsert).toHaveBeenCalledWith([expect.objectContaining({ quantity: "2 cups", name: "Flour", sort_order: 0 })]);
    expect(result.current.recipes.some((r) => r.name === "Pancakes")).toBe(true);
  });

  it("adds the recipe optimistically and queues it instead of calling Supabase while offline", async () => {
    const { recipesInsert, ingredientsInsert } = mockFrom();

    await act(() => netInfoListener({ isConnected: false, isInternetReachable: false }));

    const { result } = await renderHook(() => useRecipes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let returned;
    await act(async () => {
      returned = await result.current.addRecipe("Soup", null, [], [{ quantity: "1", name: "Onion" }]);
    });

    expect(recipesInsert).not.toHaveBeenCalled();
    expect(ingredientsInsert).not.toHaveBeenCalled();
    expect(result.current.recipes.some((r) => r.name === "Soup")).toBe(true);
    expect((returned as any).recipe.ingredients).toEqual([expect.objectContaining({ name: "Onion" })]);

    await act(() => netInfoListener({ isConnected: true, isInternetReachable: true }));
  });
});
