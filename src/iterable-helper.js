// @ts-check

/**
 * @template T0, T1
 * @overload
 * @param {AsyncIterable<T0>} iter0
 * @param {AsyncIterable<T1>} iter1
 * @returns {AsyncGenerator<[T0, T1] | [T0, null] | [null, T1]>}
 *
 * @template T0, T1, T2
 * @overload
 * @param {AsyncIterable<T0>} iter0
 * @param {AsyncIterable<T1>} iter1
 * @param {AsyncIterable<T2>} iter2
 * @returns {AsyncGenerator<[T0, T1, T2] | [T0, T1, null] | [T0, null, T2] | [T0, null, null] | [null, T1, T2] | [null, T1, null] | [null, null, T2]>}
 *
 * @template T
 * @param {AsyncIterable<T>[]} iters
 * @returns {AsyncGenerator<(T | null)[]>}
 */
export async function* zipLongest(...iters) {
  const iterators = iters.map((iter) => iter[Symbol.asyncIterator]());
  while (true) {
    const results = await Promise.all(iterators.map((it) => it.next()));
    if (results.every((r) => r.done)) break;
    yield results.map((r) => (r.done ? null : r.value));
  }
}
