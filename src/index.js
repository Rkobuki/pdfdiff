// @ts-check

import * as mupdf from "mupdf";
import { from } from "ix/asynciterable";
import { map } from "ix/asynciterable/operators";
/**
 * @typedef {import("jimp").JimpInstance} JimpInstance
 */

import { zipLongest } from "./iterable-helper.js";
import {
  alignSize,
  pageToImage,
  fillWithEmpty,
  loadPages,
} from "./mupdf-util.js";

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
 * @param {Uint8Array} pdfBufferA
 * @param {Uint8Array} pdfBufferB
 * @param {Object} [options]
 * @param {number} [options.dpi]
 * @param {boolean} [options.alpha]
 * @param {import("./mupdf-util.js").AlignStrategy} [options.align]
 * @param {Partial<Readonly<Pallet>>} [options.pallet]
 * @returns {AsyncIterable<[JimpInstance, JimpInstance]>}
 */
export function visualizeDifferences(pdfBufferA, pdfBufferB, options) {
  const dpi = options?.dpi ?? DEFAULT_DPI;
  const alpha = options?.alpha ?? DEFAULT_ALPHA;
  const align = options?.align ?? DEFAULT_ALIGN;
  const pallet = {
    ...DEFAULT_PALLET,
    ...options?.pallet,
  };
  const pageToImageFn = (/** @type {mupdf.Page} */ page) =>
    pageToImage(page, dpi, alpha);
  const alignSizeFn = (/** @type {[JimpInstance, JimpInstance]} */ pair) =>
    alignSize(pair, align);

  const pdfA = mupdf.PDFDocument.openDocument(pdfBufferA, "application/pdf");
  const pdfB = mupdf.PDFDocument.openDocument(pdfBufferB, "application/pdf");
  return from(
    zipLongest(
      from(loadPages(pdfA)).pipe(map(pageToImageFn)),
      from(loadPages(pdfB)).pipe(map(pageToImageFn)),
    ),
  ).pipe(map(fillWithEmpty), map(alignSizeFn));
}
