export async function promiseMap<T, U>(items: T[], mapper: (item: T) => Promise<U>, concurrency: number = Infinity): Promise<U[]> {
  if (!items || !mapper) {
    throw new Error("items array and action must be defined");
  }

  if (items.length <= concurrency) {
    return Promise.all(items.map((item) => mapper(item)));
  }

  const inProgress = new Set<Promise<U>>();
  const results: Promise<U>[] = [];
  for (const item of items) {
    if (inProgress.size >= concurrency) {
      await Promise.race(inProgress);
    }

    const itemPromise = mapper(item);
    inProgress.add(itemPromise);
    results.push(itemPromise);

    itemPromise.finally(() => inProgress.delete(itemPromise));
  }

  return Promise.all(results);
}
