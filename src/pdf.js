// @ts-check

import * as jimp from "jimp";
/** @typedef {jimp.JimpInstance} JimpInstance */
import * as mupdf from "mupdf";

/**
 * @param {mupdf.Document} pdf
 */
export function* loadPages(pdf) {
  for (let i = 0; i < pdf.countPages(); i++) {
    yield pdf.loadPage(i);
  }
}

/**
 * @param {mupdf.Page} page
 * @param {number} dpi
 * @param {boolean} alpha
 */
export async function pageToImage(page, dpi, alpha) {
  // https://mupdfjs.readthedocs.io/en/latest/how-to-guide/migration/index.html#from-andytango-mupdf-js
  const zoom = dpi / 72;
  return await jimp.Jimp.fromBuffer(
    new Uint8Array(
      page
        .toPixmap([zoom, 0, 0, zoom, 0, 0], mupdf.ColorSpace.DeviceRGB, alpha)
        .asPNG(),
    ).buffer,
  );
}
