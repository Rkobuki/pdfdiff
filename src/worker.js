// @ts-check
import * as jimp from "jimp";
/**
 * @typedef {jimp.JimpInstance} JimpInstance
 */

import { composeLayers, drawDifference } from "./lib.js";

addEventListener("message", async (e) => {
  const { bufA, bufB, bufMask, pallet } =
    /** @type {{bufA: ArrayBuffer, bufB: ArrayBuffer, bufMask: ArrayBuffer, pallet: import("./index.js").Pallet}} */ (
      e.data
    );
  const a = /** @type {JimpInstance} */ (await jimp.Jimp.fromBuffer(bufA));
  const b = /** @type {JimpInstance} */ (await jimp.Jimp.fromBuffer(bufB));
  const mask = /** @type {JimpInstance} */ (
    await jimp.Jimp.fromBuffer(bufMask)
  );
  const {
    diff: diffLayer,
    addition,
    deletion,
    modification,
  } = drawDifference(a, b, mask, pallet);
  const diff = composeLayers(a.width, a.height, [
    [a, 0.2],
    [b, 0.2],
    [diffLayer, 1],
  ]);
  const bufDiff = new Uint8Array(await diff.getBuffer(jimp.JimpMime.png))
    .buffer;
  postMessage(
    {
      bufDiff,
      addition,
      deletion,
      modification,
    },
    [bufDiff],
  );
});
