type Entry<T> = {
  promise: Promise<T>;
  expiresAt: number;
};

const inflight = new Map<string, Entry<unknown>>();

export function getCachedPromise<T>(key: string, factory: () => Promise<T>, ttlMs = 60_000): Promise<T> {
  const now = Date.now();
  const existing = inflight.get(key) as Entry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.promise;
  }

  const promise = factory()
    .catch((error) => {
      inflight.delete(key);
      throw error;
    })
    .finally(() => {
      const current = inflight.get(key);
      if (current && current.promise === promise && current.expiresAt <= Date.now()) {
        inflight.delete(key);
      }
    });

  inflight.set(key, {
    promise,
    expiresAt: now + ttlMs,
  });

  return promise;
}

export function clearCachedPromise(keyPrefix?: string) {
  if (!keyPrefix) {
    inflight.clear();
    return;
  }

  for (const key of inflight.keys()) {
    if (key.startsWith(keyPrefix)) inflight.delete(key);
  }
}
