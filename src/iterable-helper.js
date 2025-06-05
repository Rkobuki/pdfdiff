// @ts-check

/**
 * @template TA, TB
 * @param {AsyncIterable<TA>} iterA
 * @param {AsyncIterable<TB>} iterB
 */
export async function* zipLongest(iterA, iterB) {
  const iteratorA = iterA[Symbol.asyncIterator]();
  const iteratorB = iterB[Symbol.asyncIterator]();
  while (true) {
    const [a, b] = await Promise.all([iteratorA.next(), iteratorB.next()]);
    if (a.done && b.done) break;
    yield /** @type {[TA, TB] | [TA, null] | [null, TB]} */ ([
      a.done ? null : a.value,
      b.done ? null : b.value,
    ]);
  }
}
