// @ts-check

import * as jimp from "jimp";
/** @typedef {jimp.JimpInstance} JimpInstance */

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

/** @type {["resize", "top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right"]} */
const alignStrategyValues = [
  "resize",
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];
/**
 * @typedef {typeof alignStrategyValues[number]} AlignStrategy
 */

/**
 * @param {string} str
 * @returns {str is AlignStrategy}
 */
export const isValidAlignStrategy = (str) =>
  /** @type {string[]} */ (alignStrategyValues).includes(str);

/**
 * @param {JimpInstance} img
 * @param {number} targetWidth
 * @param {number} targetHeight
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

/**
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {[JimpInstance, number][]} layers
 */
export function composeLayers(canvasWidth, canvasHeight, layers) {
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
