import { withOfflineQueue } from "@/lib/offline/mutate";
import { isOnline } from "@/lib/offline/network";
import { enqueueMutation } from "@/lib/offline/queue";

jest.mock("@/lib/offline/network", () => ({ isOnline: jest.fn() }));
jest.mock("@/lib/offline/queue", () => ({ enqueueMutation: jest.fn() }));

const mockIsOnline = isOnline as jest.Mock;
const mockEnqueue = enqueueMutation as jest.Mock;

beforeEach(() => {
  mockIsOnline.mockReset();
  mockEnqueue.mockReset().mockResolvedValue(undefined);
});

describe("withOfflineQueue", () => {
  it("queues the mutation without attempting the network call while offline", async () => {
    mockIsOnline.mockReturnValue(false);
    const performOnline = jest.fn();

    await withOfflineQueue("todos:add", { title: "Buy milk" }, performOnline);

    expect(performOnline).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith("todos:add", { title: "Buy milk" });
  });

  it("performs the call directly when online, without queueing, on success", async () => {
    mockIsOnline.mockReturnValue(true);
    const performOnline = jest.fn().mockResolvedValue(undefined);

    await withOfflineQueue("todos:add", { title: "Buy milk" }, performOnline);

    expect(performOnline).toHaveBeenCalledTimes(1);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it("falls back to queueing when the online call throws", async () => {
    mockIsOnline.mockReturnValue(true);
    const performOnline = jest.fn().mockRejectedValue(new Error("request failed"));

    await withOfflineQueue("todos:add", { title: "Buy milk" }, performOnline);

    expect(performOnline).toHaveBeenCalledTimes(1);
    expect(mockEnqueue).toHaveBeenCalledWith("todos:add", { title: "Buy milk" });
  });
});
