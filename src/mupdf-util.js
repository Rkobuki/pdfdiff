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
  const pixmap = page.toPixmap(
    [zoom, 0, 0, zoom, 0, 0],
    mupdf.ColorSpace.DeviceRGB,
    alpha,
  );
  const dataUrl =
    "data:image/png;base64," + btoa(String.fromCharCode(...pixmap.asPNG()));
  return await jimp.Jimp.read(dataUrl);
}

/**
 * @param {[JimpInstance, JimpInstance] | [JimpInstance, null] | [null, JimpInstance]} pair
 */
export function fillWithEmpty(pair) {
  return pair[0] !== null && pair[1] !== null
    ? pair
    : (() => {
        const [index, image] = pair[0] === null ? [1, pair[1]] : [0, pair[0]];
        /** @satisfies {JimpInstance} */
        const empty = new jimp.Jimp({
          width: image.width,
          height: image.height,
          color: jimp.rgbaToInt(0, 0, 0, 0),
        });
        return /** @type {[JimpInstance, JimpInstance]} */ (
          index === 0 ? [image, empty] : [empty, image]
        );
      })();
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
 * @param {[JimpInstance, JimpInstance]} param0
 * @param {AlignStrategy} align
 * @returns {[JimpInstance, JimpInstance]}
 */
export function alignSize([img1, img2], align) {
  const { width: width1, height: height1 } = img1;
  const { width: width2, height: height2 } = img2;
  if (width1 === width2 && height1 === height2) {
    return [img1, img2];
  }
  const largerHeight = Math.max(height1, height2);
  const largerWidth = Math.max(width1, width2);
  const ret1 = alignImage(img1, largerWidth, largerHeight, align);
  const ret2 = alignImage(img2, largerWidth, largerHeight, align);
  // @ts-expect-error
  return [ret1, ret2];
}
