// @ts-check

import assert from "assert";
import test from "node:test";

import { parseHex, formatHex } from "./rgba-color.js";

test("parseHex", async (ctx) => {
  await ctx.test("#rgb", () => {
    assert.deepStrictEqual(parseHex("#fed"), [0xff, 0xee, 0xdd, 0xff]);
  });
  await ctx.test("#rrggbb", () => {
    assert.deepStrictEqual(parseHex("#fffefd"), [0xff, 0xfe, 0xfd, 0xff]);
  });
  await ctx.test("#rgba", () => {
    assert.deepStrictEqual(parseHex("#fedc"), [0xff, 0xee, 0xdd, 0xcc]);
  });
  await ctx.test("#rrggbbaa", () => {
    assert.deepStrictEqual(parseHex("#fffefdfc"), [0xff, 0xfe, 0xfd, 0xfc]);
  });
  await ctx.test("invalid", () => {
    assert.deepStrictEqual(parseHex("foobar"), null);
  });
});

test("formatHex", () => {
  assert.deepStrictEqual(formatHex([0xff, 0xfe, 0xfd, 0xfc]), "#fffefdfc");
});
