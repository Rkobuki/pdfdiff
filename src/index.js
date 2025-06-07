// @ts-check

import * as mupdf from "mupdf";
import { from } from "ix/asynciterable";
import { map, flatMap } from "ix/asynciterable/operators";
import * as jimp from "jimp";
/**
 * @typedef {jimp.JimpInstance} JimpInstance
 */
import Worker from "web-worker";

import { zipLongest, enumerate } from "./iterable-helper.js";
import { pageToImage, fillWithEmpty, loadPages } from "./mupdf-util.js";
import { alignStrategyValues } from "./mupdf-util.js";
/**
 * @typedef {import("./mupdf-util.js").AlignStrategy} AlignStrategy
 */
import { parseHex, formatHex } from "./util.js";

export { enumerate, alignStrategyValues, parseHex, formatHex };

export const DEFAULT_DPI = 150;
export const DEFAULT_ALPHA = true;
export const DEFAULT_ALIGN = "resize";
/**
 * @typedef {{ red: number; green: number; blue: number; }} RGBColor
 * @typedef {{ addition: Readonly<RGBColor>; deletion: Readonly<RGBColor>; modification: Readonly<RGBColor>; }} Pallet
 */
/** @type {Readonly<Pallet>} */
export const DEFAULT_PALLET = Object.freeze({
  addition: Object.freeze({ red: 0x4c, green: 0xae, blue: 0x4f }),
  deletion: Object.freeze({ red: 0xff, green: 0x57, blue: 0x24 }),
  modification: Object.freeze({ red: 0xff, green: 0xc1, blue: 0x05 }),
});

/**
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @param {Object} [options]
 * @param {number} [options.dpi]
 * @param {boolean} [options.alpha]
 * @param {Uint8Array} [options.mask]
 * @param {import("./mupdf-util.js").AlignStrategy} [options.align]
 * @param {Partial<Readonly<Pallet>>} [options.pallet]
 * @typedef {{ a: JimpInstance, b: JimpInstance, diff: JimpInstance, addition: [number, number][], deletion: [number, number][], modification: [number, number][] }} VisualizeDifferencesResult
 * @returns {AsyncIterable<VisualizeDifferencesResult>}
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
    flatMap(async ([a, b, mask]) => {
      const cloneA = a.clone();
      const cloneB = b.clone();
      const bufA = new Uint8Array(await a.getBuffer(jimp.JimpMime.png)).buffer;
      const bufB = new Uint8Array(await b.getBuffer(jimp.JimpMime.png)).buffer;
      const bufMask = new Uint8Array(await mask.getBuffer(jimp.JimpMime.png))
        .buffer;
      const { bufDiff, addition, deletion, modification } =
        await /** @type {Promise<{ bufDiff: ArrayBuffer } & Pick<VisualizeDifferencesResult, "addition" | "deletion" | "modification">>} */ (
          new Promise((resolve) => {
            const url = new URL("./worker.js", import.meta.url);
            const worker = new Worker(url, { type: "module" });
            worker.addEventListener("message", (e) => {
              resolve(e.data);
              worker.terminate();
            });
            worker.postMessage({ bufA, bufB, bufMask, pallet, align }, [
              bufA,
              bufB,
              bufMask,
            ]);
          })
        );
      const diff = await jimp.Jimp.fromBuffer(bufDiff);
      return { a: cloneA, b: cloneB, diff, addition, deletion, modification };
    }, navigator.hardwareConcurrency),
  );
}
