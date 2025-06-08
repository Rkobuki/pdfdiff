// @ts-check

import assert from "assert";
import test from "node:test";

import { withIndex, productSync, zipLongest } from "./iterable.js";

test("withIndex", async () => {
  assert.deepStrictEqual(
    await Array.fromAsync(
      withIndex(
        (async function* () {
          yield "a";
          yield "b";
        })(),
        0,
      ),
    ),
    [
      [0, "a"],
      [1, "b"],
    ],
  );
});

test("zipLongest", async () => {
  assert.deepStrictEqual(
    await Array.fromAsync(
      zipLongest(
        (async function* () {
          yield 0;
          yield 1;
          yield 2;
        })(),
        (async function* () {
          yield "a";
          yield "b";
        })(),
      ),
    ),
    [
      [0, "a"],
      [1, "b"],
      [2, null],
    ],
  );
});

test("productSync", () => {
  assert.deepStrictEqual(
    JSON.stringify(
      Array.from(
        productSync(
          (function* () {
            yield 0;
            yield 1;
            yield 2;
          })(),
          (function* () {
            yield "a";
            yield "b";
          })(),
        ),
      ),
    ),
    JSON.stringify([
      [0, "a"],
      [0, "b"],
      [1, "a"],
      [1, "b"],
      [2, "a"],
      [2, "b"],
    ]),
  );
});
