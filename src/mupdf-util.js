// @ts-check

import * as jimp from "jimp";
import * as mupdf from "mupdf";

import { matIs8U4C } from "./cv-util.js";
/**
 * @typedef {import("./cv-util.js").Mat8U4C} Mat8U4C
 */

/**
 * @param {Uint8Array} buffer
 * @returns {[mupdf.Document, number]}
 */
export function openDocument(buffer) {
  const doc = mupdf.PDFDocument.openDocument(buffer, "application/pdf");
  const pagesCount = doc.countPages();
  return [doc, pagesCount];
}

/**
 * @param {mupdf.Page} page
 * @param {number} dpi
 * @param {boolean} [alpha]
 *
 * NOTE: Jimpを経由するため、alphaは出力されるMatの形式には影響しないはず。
 *
 * ```
 * assert.equal(pageToMat(page, 150, true).type(), cv.CV_8UC4);
 * assert.equal(pageToMat(page, 150, false).type(), cv.CV_8UC4);
 * ```
 */
async function pageToMat(page, dpi, alpha = true) {
  // https://mupdfjs.readthedocs.io/en/latest/how-to-guide/migration/index.html#from-andytango-mupdf-js
  const zoom = dpi / 72;
  const pixmap = page.toPixmap(
    [zoom, 0, 0, zoom, 0, 0],
    mupdf.ColorSpace.DeviceRGB,
    alpha
  );
  const dataUrl =
    "data:image/png;base64," + btoa(String.fromCharCode(...pixmap.asPNG()));
  const jimpImage = await jimp.Jimp.read(dataUrl);
  const mat = cv.matFromImageData(jimpImage.bitmap);
  if (!matIs8U4C(mat)) {
    throw new Error("Assertion failed: matIs8U4C(mat)");
  }
  return mat;
}

/**
 * @param {mupdf.Document} doc
 * @param {number} page
 * @param {number} dpi
 */
async function loadPageIfExists(doc, page, dpi) {
  if (page >= doc.countPages()) {
    return null;
  }
  return pageToMat(doc.loadPage(page), dpi);
}

/**
 * @param {(Mat8U4C | null)[]} pair
 * @returns {pair is [Mat8U4C, Mat8U4C] | [Mat8U4C, null] | [null, Mat8U4C]}
 */
function atLeastOneHasPage(pair) {
  return pair.length === 2 && (pair[0] !== null || pair[1] !== null);
}

/**
 * @param {[Mat8U4C, Mat8U4C] | [Mat8U4C, null] | [null, Mat8U4C]} pair
 */
function fillBlankWithTransparentMat(pair) {
  return pair[0] !== null && pair[1] !== null
    ? pair
    : (() => {
        const [idx, img] = pair[0] === null ? [1, pair[1]] : [0, pair[0]];
        const transparentMat = new cv.Mat(
          img.rows,
          img.cols,
          cv.CV_8UC4,
          new cv.Scalar(0, 0, 0, 0)
        );
        if (!matIs8U4C(transparentMat)) {
          throw new Error("Assertion failed: matIs8U4C(transparentMat)");
        }
        return /** @type {[Mat8U4C, Mat8U4C]} */ (
          idx === 0 ? [img, transparentMat] : [transparentMat, img]
        );
      })();
}

/**
 * @param {mupdf.Document} aDoc
 * @param {mupdf.Document} bDoc
 * @param {number} page
 * @param {number} dpi
 */
export async function loadPageImages(aDoc, bDoc, page, dpi) {
  const pairContainingNull = [
    await loadPageIfExists(aDoc, page, dpi),
    await loadPageIfExists(bDoc, page, dpi),
  ];
  if (!atLeastOneHasPage(pairContainingNull)) {
    throw new Error(`Page: ${page} is out of index in both documents`);
  }
  return fillBlankWithTransparentMat(pairContainingNull);
}

