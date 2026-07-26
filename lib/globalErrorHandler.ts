type Listener = (error: Error) => void;

let listener: Listener | null = null;

export function setGlobalErrorListener(fn: Listener | null) {
  listener = fn;
}

const globalScope = globalThis as unknown as {
  ErrorUtils?: {
    getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
    setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
  };
};

if (globalScope.ErrorUtils) {
  const originalHandler = globalScope.ErrorUtils.getGlobalHandler();
  globalScope.ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (listener) {
      listener(error);
    } else {
      originalHandler(error, isFatal);
    }
  });
}
