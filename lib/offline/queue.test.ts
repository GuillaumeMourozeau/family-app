// Integration test of the real queue.ts + network.ts pair (no mocking of
// either) against the mocked AsyncStorage and NetInfo. Both modules keep
// module-level singleton state, so each test gets a fresh instance of both
// via jest.resetModules() + a re-require, and connectivity is driven by
// invoking the NetInfo listener the same way the real native module would.

type NetworkModule = typeof import("@/lib/offline/network");
type QueueModule = typeof import("@/lib/offline/queue");

let network: NetworkModule;
let queue: QueueModule;
let netInfoListener: (state: { isConnected: boolean; isInternetReachable: boolean }) => void;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setOnline(online: boolean) {
  network.isOnline(); // ensures the NetInfo subscription exists before the event fires
  netInfoListener({ isConnected: online, isInternetReachable: online });
}

// initOfflineSync's handlers are typed as (payload: unknown) => Promise<void>
// since queue.ts's replay engine is a generic dispatch table — this narrows
// the payload shape for these tests without fighting that generic type.
function namedPayloadHandler(fn: (name: string) => void | Promise<void>) {
  return async (payload: unknown) => {
    await fn((payload as { name: string }).name);
  };
}

beforeEach(() => {
  jest.resetModules();
  const NetInfo = require("@react-native-community/netinfo");
  NetInfo.addEventListener.mockImplementation((cb: typeof netInfoListener) => {
    netInfoListener = cb;
    return jest.fn();
  });
  network = require("@/lib/offline/network");
  queue = require("@/lib/offline/queue");
});

describe("offline mutation queue", () => {
  it("enqueues a mutation without replaying it while offline", async () => {
    setOnline(false);
    const handler = jest.fn().mockResolvedValue(undefined);
    queue.initOfflineSync({ "todos:add": handler });

    let count = 0;
    queue.onQueueChange((n: number) => {
      count = n;
    });
    await queue.enqueueMutation("todos:add", { name: "milk" });

    expect(handler).not.toHaveBeenCalled();
    expect(count).toBe(1);
  });

  it("replays queued mutations in FIFO order once connectivity returns", async () => {
    setOnline(false);
    const order: string[] = [];
    queue.initOfflineSync({
      "todos:add": namedPayloadHandler((name) => {
        order.push(name);
      }),
    });
    await queue.enqueueMutation("todos:add", { name: "first" });
    await queue.enqueueMutation("todos:add", { name: "second" });
    expect(order).toEqual([]);

    setOnline(true);
    await flush();

    expect(order).toEqual(["first", "second"]);
  });

  it("stops replaying and leaves the rest of the queue intact on the first failure", async () => {
    setOnline(false);
    const order: string[] = [];
    let failFirst = true;
    queue.initOfflineSync({
      "todos:add": namedPayloadHandler((name) => {
        if (name === "first" && failFirst) throw new Error("still offline");
        order.push(name);
      }),
    });
    await queue.enqueueMutation("todos:add", { name: "first" });
    await queue.enqueueMutation("todos:add", { name: "second" });

    setOnline(true);
    await flush();
    expect(order).toEqual([]); // first failed, so second was never attempted

    failFirst = false;
    setOnline(false);
    setOnline(true); // a later reconnect retries from the front of the queue
    await flush();

    expect(order).toEqual(["first", "second"]);
  });

  it("drops a mutation with an unknown kind rather than blocking the queue behind it", async () => {
    setOnline(false);
    const order: string[] = [];
    queue.initOfflineSync({
      "todos:add": namedPayloadHandler((name) => {
        order.push(name);
      }),
    });
    await queue.enqueueMutation("todos:legacyKind", { name: "ghost" });
    await queue.enqueueMutation("todos:add", { name: "real" });

    setOnline(true);
    await flush();

    expect(order).toEqual(["real"]);
  });

  it("replays a mutation left over from a previous session as soon as sync is initialized", async () => {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.setItem(
      "offlineMutationQueue",
      JSON.stringify([{ id: "x", kind: "todos:add", payload: { name: "leftover" }, createdAt: 1 }])
    );

    const order: string[] = [];
    queue.initOfflineSync({
      "todos:add": namedPayloadHandler((name) => {
        order.push(name);
      }),
    });
    await flush();

    expect(order).toEqual(["leftover"]);
  });
});
