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

import * as jimp from "jimp";
/** @typedef {jimp.JimpInstance} JimpInstance */
import { from } from "ix/asynciterable";
import { map, flatMap } from "ix/asynciterable/operators";
import * as mupdf from "mupdf";
import Worker from "web-worker";

/** @typedef {import("./diff.js").Pallet} Pallet */
import { fillWithEmpty, isValidAlignStrategy } from "./image.js";
/** @typedef {import("./image.js").AlignStrategy} AlignStrategy */
import { zipLongest, withIndex } from "./iterable.js";
import { loadPages, pageToImage } from "./pdf.js";
import { parseHex, formatHex } from "./rgba-color.js";
/** @typedef {import("./rgba-color.js").RGBAColor} RGBAColor */

export { withIndex, isValidAlignStrategy, parseHex, formatHex };

/**
 * @typedef {{ dpi: number; alpha: boolean; mask?: Uint8Array; align: AlignStrategy; pallet: Partial<Readonly<Pallet>> }} VisualizeDifferencesOptions
 * @satisfies {Readonly<VisualizeDifferencesOptions>}
 */
export const defaultOptions = Object.freeze({
  dpi: 150,
  alpha: true,
  mask: undefined,
  align: "resize",
  pallet: Object.freeze({
    addition: Object.freeze(
      /** @type {RGBAColor} */ ([0x4c, 0xae, 0x4f, 0xff]),
    ),
    deletion: Object.freeze(
      /** @type {RGBAColor} */ ([0xff, 0x57, 0x24, 0xff]),
    ),
    modification: Object.freeze(
      /** @type {RGBAColor} */ ([0xff, 0xc1, 0x05, 0xff]),
    ),
  }),
});

/**
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @param {Partial<VisualizeDifferencesOptions>} [options]
 * @typedef {{ a: JimpInstance, b: JimpInstance, diff: JimpInstance, addition: [number, number][], deletion: [number, number][], modification: [number, number][] }} VisualizeDifferencesResult
 * @returns {AsyncIterable<VisualizeDifferencesResult>}
 */
export function visualizeDifferences(a, b, options) {
  /** @satisfies {VisualizeDifferencesOptions} */
  const mergedOptions = {
    dpi: options?.dpi ?? defaultOptions.dpi,
    alpha: options?.alpha ?? defaultOptions.alpha,
    mask: options?.mask ?? defaultOptions.mask,
    align: options?.align ?? defaultOptions.align,
    pallet: {
      addition: options?.pallet?.addition ?? defaultOptions.pallet.addition,
      deletion: options?.pallet?.deletion ?? defaultOptions.pallet.deletion,
      modification:
        options?.pallet?.modification ?? defaultOptions.pallet.modification,
    },
  };
  const pageToImageFn = (/** @type {mupdf.Page} */ page) =>
    pageToImage(page, mergedOptions.dpi, mergedOptions.alpha);

  const pdfA = mupdf.PDFDocument.openDocument(a, "application/pdf");
  const pdfB = mupdf.PDFDocument.openDocument(b, "application/pdf");
  const pdfMask =
    typeof mergedOptions.mask !== "undefined"
      ? mupdf.PDFDocument.openDocument(mergedOptions.mask, "application/pdf")
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
      // NOTE: getBufferはcopyなので、Workerに移譲した後もa, bを使用して問題ない
      // https://github.com/jimp-dev/jimp/blob/b6b0e418a5f1259211a133b20cddb4f4e5c25679/packages/core/src/index.ts#L444
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
            worker.postMessage(
              {
                bufA,
                bufB,
                bufMask,
                pallet: mergedOptions.pallet,
                align: mergedOptions.align,
              },
              [bufA, bufB, bufMask],
            );
          })
        );
      const diff = await jimp.Jimp.fromBuffer(bufDiff);
      return { a, b, diff, addition, deletion, modification };
    }, navigator.hardwareConcurrency),
  );
}
