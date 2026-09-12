export function createAsyncOperationQueue() {
  let queue: Promise<void> = Promise.resolve();
  return function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.catch(() => undefined).then(operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
