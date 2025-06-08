// @ts-check

/*
 * Copyright (C) 2025  Koutaro Mukai
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
