const inflight = new Map();

export function singleFlight(key, factory) {
  const existing = inflight.get(key);

  if (existing) {
    return existing;
  }

  const promise = Promise.resolve()
    .then(factory)
    .finally(() => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    });

  inflight.set(key, promise);

  return promise;
}
