// @ts-check
import * as jimp from "jimp";
/** @typedef {jimp.JimpInstance} JimpInstance */

import { drawDifference } from "./diff.js";
import { alignSize, composeLayers } from "./image.js";

addEventListener("message", async (e) => {
  const { bufA, bufB, bufMask, pallet, align } =
    /** @type {{bufA: ArrayBuffer, bufB: ArrayBuffer, bufMask: ArrayBuffer, pallet: import("./diff.js").Pallet, align: import("./image.js").AlignStrategy}} */ (
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
