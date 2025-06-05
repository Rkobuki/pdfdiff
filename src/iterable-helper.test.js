// @ts-check

import assert from "assert";
import test from "node:test";

import { zipLongest } from "./iterable-helper.js";

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
