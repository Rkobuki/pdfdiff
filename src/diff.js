// @ts-check

import * as jimp from "jimp";
/** @typedef {jimp.JimpInstance} JimpInstance */
import { range as rangeSync, reduce as reduceSync } from "ix/iterable";

import { productSync } from "./iterable.js";
/** @typedef {import("./rgba-color.js").RGBAColor} RGBAColor */

/** @typedef {{ addition: Readonly<RGBAColor>; deletion: Readonly<RGBAColor>; modification: Readonly<RGBAColor> }} Pallet */

/**
 * @param {JimpInstance} a
 * @param {JimpInstance} b
 * @param {JimpInstance} mask
 * @param {Pallet} pallet
 */
export function drawDifference(a, b, mask, pallet) {
  if (
    a.width !== b.width ||
    b.width !== mask.width ||
    a.height !== b.height ||
    b.height !== mask.height
  ) {
    throw new Error("Assertion failed: pages are different sizes");
  }

  const addColor = jimp.rgbaToInt(
    pallet.addition[0],
    pallet.addition[1],
    pallet.addition[2],
    pallet.addition[3],
  );
  const delColor = jimp.rgbaToInt(
    pallet.deletion[0],
    pallet.deletion[1],
    pallet.deletion[2],
    pallet.deletion[3],
  );
  const modColor = jimp.rgbaToInt(
    pallet.modification[0],
    pallet.modification[1],
    pallet.modification[2],
    pallet.modification[3],
  );

  return reduceSync(
    productSync(rangeSync(0, a.width), rangeSync(0, a.height)),
    {
      callback: ({ addition, deletion, modification, diff }, [x, y]) => {
        const intA = a.getPixelColor(x, y);
        const intB = b.getPixelColor(x, y);
        const colorA = jimp.intToRGBA(intA);
        const colorB = jimp.intToRGBA(intB);
        const masked = jimp.intToRGBA(mask.getPixelColor(x, y)).a !== 0;
        if (masked || intA === intB || (colorA.a === 0 && colorB.a === 0)) {
          return { addition, deletion, modification, diff };
        }
        const [target, color] =
          colorA.a === 0 && colorB.a !== 0
            ? [addition, addColor]
            : colorA.a !== 0 && colorB.a === 0
              ? [deletion, delColor]
              : [modification, modColor];
        target.push([x, y]);
        diff.setPixelColor(color, x, y);
        return { addition, deletion, modification, diff };
      },
      seed: {
        addition: /** @type {[number, number][]} */ ([]),
        deletion: /** @type {[number, number][]} */ ([]),
        modification: /** @type {[number, number][]} */ ([]),
        diff: new jimp.Jimp({
          width: a.width,
          height: a.height,
          color: jimp.rgbaToInt(0, 0, 0, 0),
        }),
      },
    },
  );
}
