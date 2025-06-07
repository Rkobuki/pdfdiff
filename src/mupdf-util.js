// @ts-check

import * as jimp from "jimp";
/**
 * @typedef {jimp.JimpInstance} JimpInstance
 */
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

/**
 * @overload
 * @param {[JimpInstance, JimpInstance] | [JimpInstance, null] | [null, JimpInstance]} images
 * @returns {[JimpInstance, JimpInstance]}
 *
 * @overload
 * @param {[JimpInstance, JimpInstance, JimpInstance] | [JimpInstance, JimpInstance, null] | [JimpInstance, null, JimpInstance] | [JimpInstance, null, null] | [null, JimpInstance, JimpInstance] | [null, JimpInstance, null] | [null, null, JimpInstance]} images
 * @returns {[JimpInstance, JimpInstance, JimpInstance]}
 *
 * @param {(JimpInstance | null)[]} images
 * @returns {JimpInstance[]}
 */
export function fillWithEmpty(images) {
  return images.map((img) =>
    img !== null
      ? img
      : new jimp.Jimp({
          width: 1,
          height: 1,
          color: jimp.rgbaToInt(0, 0, 0, 0),
        }),
  );
}

/**
 * @param {JimpInstance} img
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @typedef {"resize" | "top-left" | "top-center" | "top-right" | "middle-left" | "middle-center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right"} AlignStrategy
 * @param {AlignStrategy} align
 */
function alignImage(img, targetWidth, targetHeight, align) {
  if (align === "resize") {
    return img.clone().resize({ w: targetWidth, h: targetHeight });
  } else {
    const newImg = new jimp.Jimp({
      width: targetWidth,
      height: targetHeight,
      color: jimp.rgbaToInt(0, 0, 0, 0),
    });
    const x = align.includes("center")
      ? Math.floor((targetWidth - img.width) / 2)
      : align.includes("right")
        ? targetWidth - img.width
        : 0;
    const y = align.includes("middle")
      ? Math.floor((targetHeight - img.height) / 2)
      : align.includes("bottom")
        ? targetHeight - img.height
        : 0;
    newImg.composite(img, x, y);
    return newImg;
  }
}

/**
 * @overload
 * @param {[JimpInstance, JimpInstance]} images
 * @param {AlignStrategy} align
 * @returns {[JimpInstance, JimpInstance]}
 *
 * @overload
 * @param {[JimpInstance, JimpInstance, JimpInstance]} images
 * @param {AlignStrategy} align
 * @returns {[JimpInstance, JimpInstance, JimpInstance]}
 *
 * @param {JimpInstance[]} images
 * @param {AlignStrategy} align
 * @returns {JimpInstance[]}
 */
export function alignSize(images, align) {
  if (images.length === 0) {
    return [];
  }
  const largerWidth = Math.max(...images.map((img) => img.width));
  const largerHeight = Math.max(...images.map((img) => img.height));
  // @ts-expect-error
  return images.map((img) =>
    img.width === largerWidth && img.height === largerHeight
      ? img
      : alignImage(img, largerWidth, largerHeight, align),
  );
}
