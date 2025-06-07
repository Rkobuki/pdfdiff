// @ts-check
import * as jimp from "jimp";
/**
 * @typedef {jimp.JimpInstance} JimpInstance
 */

import { composeLayers, drawDifference } from "./lib.js";
import { alignSize } from "./mupdf-util.js";

addEventListener("message", async (e) => {
  const { bufA, bufB, bufMask, pallet, align } =
    /** @type {{bufA: ArrayBuffer, bufB: ArrayBuffer, bufMask: ArrayBuffer, pallet: import("./index.js").Pallet, align: import("./mupdf-util.js").AlignStrategy}} */ (
      e.data
    );
  const [a, b, mask] = alignSize(
    [
      /** @type {JimpInstance} */ (await jimp.Jimp.fromBuffer(bufA)),
      /** @type {JimpInstance} */ (await jimp.Jimp.fromBuffer(bufB)),
      /** @type {JimpInstance} */ (await jimp.Jimp.fromBuffer(bufMask)),
    ],
    align,
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
