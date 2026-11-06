/**
 * Collects calls made within `delayMs` into one `load(keys)` call.
 * Gmail renders a list of 50 rows at once; this turns 50 lookups into one request.
 */
export function createBatcher<K, V>(load: (keys: K[]) => Promise<V[]>, delayMs: number): (key: K) => Promise<V> {
  let pending: Array<{ key: K; resolve: (value: V) => void; reject: (error: unknown) => void }> = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = async () => {
    const batch = pending;
    pending = [];
    timer = undefined;
    try {
      const values = await load(batch.map((p) => p.key));
      batch.forEach((p, i) => p.resolve(values[i] as V));
    } catch (error) {
      batch.forEach((p) => p.reject(error));
    }
  };

  return (key) =>
    new Promise<V>((resolve, reject) => {
      pending.push({ key, resolve, reject });
      timer ??= setTimeout(run, delayMs);
    });
}
