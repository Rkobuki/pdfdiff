// @ts-check

import cv from "@techstark/opencv-js";
import * as jimp from "jimp";

const mat8U4CBrand = Symbol();
/**
 * @typedef {cv.Mat & { [mat8U4CBrand]: unknown; }} Mat8U4C
 */

/**
 * @param {cv.Mat} mat
 * @returns {mat is Mat8U4C}
 */
export function matIs8U4C(mat) {
  return mat.type() === cv.CV_8UC4;
}

/**
 * @param {cv.Mat} src
 * @param {boolean} bgr
 */
export function matNormalizeTo8U4C(src, bgr = true) {
  const ret = new cv.Mat();
  const float64 = new cv.Mat();
  const norm64 = new cv.Mat();
  const norm8u = new cv.Mat();
  try {
    src.convertTo(float64, cv.CV_64F);
    cv.normalize(float64, norm64, 0, 1, cv.NORM_MINMAX);
    norm64.convertTo(norm8u, cv.CV_8U, 255.0);

    const channels = src.channels();
    if (channels === 1) {
      cv.cvtColor(norm8u, ret, cv.COLOR_GRAY2RGBA);
    } else if (channels === 3) {
      const code = bgr ? cv.COLOR_BGR2RGBA : cv.COLOR_RGB2RGBA;
      cv.cvtColor(norm8u, ret, code);
    } else if (channels === 4) {
      norm8u.copyTo(ret);
    } else {
      throw new Error("Unsupported channel count: " + channels);
    }
    if (!matIs8U4C(ret)) {
      throw new Error("Assertion failed: matIs8U4C(ret)");
    }
    return ret;
  } finally {
    float64.delete();
    norm64.delete();
    norm8u.delete();
  }
}

/**
 * @param {Mat8U4C} mat
 */
export async function matToPNGBuffer(mat) {
  return await new jimp.Jimp({
    width: mat.cols,
    height: mat.rows,
    // @ts-expect-error
    data: mat.data,
  }).getBuffer(jimp.JimpMime.png);
}
