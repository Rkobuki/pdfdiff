// @ts-check

import * as mupdf from "mupdf";
import { from } from "ix/asynciterable";
import { map } from "ix/asynciterable/operators";
import { range as rangeSync, reduce as reduceSync } from "ix/iterable";
import * as jimp from "jimp";
/**
 * @typedef {jimp.JimpInstance} JimpInstance
 */

import { zipLongest, productSync, enumerate } from "./iterable-helper.js";
import {
  alignSize,
  pageToImage,
  fillWithEmpty,
  loadPages,
} from "./mupdf-util.js";

export { enumerate };

const DEFAULT_DPI = 150;
const DEFAULT_ALPHA = true;
const DEFAULT_ALIGN = "resize";
/**
 * @typedef {{ red: number; green: number; blue: number; }} RGBColor
 * @typedef {{ addition: Readonly<RGBColor>; deletion: Readonly<RGBColor>; modification: Readonly<RGBColor>; }} Pallet
 */
/** @type {Readonly<Pallet>} */
const DEFAULT_PALLET = Object.freeze({
  addition: Object.freeze({ red: 0x4c, green: 0xae, blue: 0x4f }),
  deletion: Object.freeze({ red: 0xff, green: 0x57, blue: 0x24 }),
  modification: Object.freeze({ red: 0xff, green: 0xc1, blue: 0x05 }),
});

/**
 * @param {JimpInstance} a
 * @param {JimpInstance} b
 * @param {JimpInstance} mask
 * @param {Pallet} pallet
 */
function drawDifference(a, b, mask, pallet) {
  if (
    a.width !== b.width ||
    b.width !== mask.width ||
    a.height !== b.height ||
    b.height !== mask.height
  ) {
    throw new Error("Assertion failed: pages are different sizes");
  }

  const addColor = jimp.rgbaToInt(
    pallet.addition.red,
    pallet.addition.green,
    pallet.addition.blue,
    255,
  );
  const delColor = jimp.rgbaToInt(
    pallet.deletion.red,
    pallet.deletion.green,
    pallet.deletion.blue,
    255,
  );
  const modColor = jimp.rgbaToInt(
    pallet.modification.red,
    pallet.modification.green,
    pallet.modification.blue,
    255,
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

/**
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {[JimpInstance, number][]} layers
 */
function composeLayers(canvasWidth, canvasHeight, layers) {
  return layers.reduce(
    (acc, [image, opacity]) =>
      acc.composite(image, 0, 0, {
        mode: jimp.BlendMode.SRC_OVER,
        opacitySource: opacity,
      }),
    new jimp.Jimp({
      width: canvasWidth,
      height: canvasHeight,
      color: jimp.rgbaToInt(0, 0, 0, 0),
    }),
  );
}

/**
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @param {Object} [options]
 * @param {number} [options.dpi]
 * @param {boolean} [options.alpha]
 * @param {Uint8Array} [options.mask]
 * @param {import("./mupdf-util.js").AlignStrategy} [options.align]
 * @param {Partial<Readonly<Pallet>>} [options.pallet]
 * @returns {AsyncIterable<{a: JimpInstance, b: JimpInstance, diff: JimpInstance, addition: [number, number][], deletion: [number, number][], modification: [number, number][]}>}
 */
export function visualizeDifferences(a, b, options) {
  const dpi = options?.dpi ?? DEFAULT_DPI;
  const alpha = options?.alpha ?? DEFAULT_ALPHA;
  const align = options?.align ?? DEFAULT_ALIGN;
  const pallet = {
    ...DEFAULT_PALLET,
    ...options?.pallet,
  };
  const pageToImageFn = (/** @type {mupdf.Page} */ page) =>
    pageToImage(page, dpi, alpha);
  const alignSizeFn = (
    /** @type {[JimpInstance, JimpInstance, JimpInstance]} */ images,
  ) => alignSize(images, align);
  const pdfA = mupdf.PDFDocument.openDocument(a, "application/pdf");
  const pdfB = mupdf.PDFDocument.openDocument(b, "application/pdf");
  const pdfMask =
    typeof options?.mask !== "undefined"
      ? mupdf.PDFDocument.openDocument(options.mask, "application/pdf")
      : new mupdf.PDFDocument();
  return from(
    zipLongest(
      from(loadPages(pdfA)).pipe(map(pageToImageFn)),
      from(loadPages(pdfB)).pipe(map(pageToImageFn)),
      from(loadPages(pdfMask)).pipe(map(pageToImageFn)),
    ),
  ).pipe(
    map(fillWithEmpty),
    map(alignSizeFn),
    map(([a, b, mask]) => ({
      a,
      b,
      ...drawDifference(a, b, mask, pallet),
    })),
    map(({ a, b, diff, addition, deletion, modification }) => ({
      a,
      b,
      diff: composeLayers(a.width, a.height, [
        [a, 0.2],
        [b, 0.2],
        [diff, 1],
      ]),
      addition,
      deletion,
      modification,
    })),
  );
}
