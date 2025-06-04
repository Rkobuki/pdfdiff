// @ts-check

import cv from "@techstark/opencv-js";

import { matNormalizeTo8U4C, matToPNGBuffer } from "./cv-util.js";
/**
 * @typedef {import("./cv-util.js").Mat8U4C} Mat8U4C
 */
import { loadPageImages, openDocument } from "./mupdf-util.js";

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

const DEFAULT_DPI = 150;

/**
 * @param {import("./cv-util.js").Mat8U4C} mat
 * @returns {{mask: cv.Mat, channels: cv.MatVector, alpha: cv.Mat}}
 */
function createBinaryMask(mat) {
  const channels = new cv.MatVector();
  cv.split(mat, channels);
  const alpha = channels.get(3);
  const mask = new cv.Mat();
  cv.threshold(alpha, mask, 0, 255, cv.THRESH_BINARY);
  return { mask, channels, alpha };
}

/**
 * 追加/削除/変更部分を検出する
 * @param {cv.Mat} aMask A画像のマスク
 * @param {cv.Mat} bMask B画像のマスク
 * @param {import("./cv-util.js").Mat8U4C} aPage A画像
 * @param {import("./cv-util.js").Mat8U4C} bPage B画像
 * @returns {{additionMask: cv.Mat, deletionMask: cv.Mat, modificationMask: cv.Mat, commonMask: cv.Mat}} 検出されたマスク
 */
function detectDifferences(aMask, bMask, aPage, bPage) {
  const additionMask = new cv.Mat();
  cv.subtract(bMask, aMask, additionMask);

  const deletionMask = new cv.Mat();
  cv.subtract(aMask, bMask, deletionMask);

  // A ∩ B
  const commonMask = new cv.Mat();
  cv.bitwise_and(aMask, bMask, commonMask);

  // 変更された部分を検出
  const aTemp = new cv.Mat();
  const bTemp = new cv.Mat();
  const diffMask = new cv.Mat();
  const modificationMask = new cv.Mat();

  try {
    // 共通部分でマスクした元画像を作成
    cv.bitwise_and(aPage, aPage, aTemp, commonMask);
    cv.bitwise_and(bPage, bPage, bTemp, commonMask);

    // 差分を計算
    cv.absdiff(aTemp, bTemp, diffMask);

    // グレースケールに変換して二値化
    const diffGray = new cv.Mat();
    try {
      cv.cvtColor(diffMask, diffGray, cv.COLOR_RGBA2GRAY);
      cv.threshold(diffGray, modificationMask, 0, 255, cv.THRESH_BINARY);
    } finally {
      diffGray.delete();
    }

    return {
      additionMask,
      deletionMask,
      modificationMask,
      commonMask, // 後で削除するために返す
    };
  } catch (e) {
    additionMask.delete();
    deletionMask.delete();
    commonMask.delete();
    modificationMask.delete();
    throw e;
  } finally {
    aTemp.delete();
    bTemp.delete();
    diffMask.delete();
  }
}

/**
 * 検出された差分に色を付ける
 * @param {cv.Mat} additionMask 追加部分のマスク
 * @param {cv.Mat} deletionMask 削除部分のマスク
 * @param {cv.Mat} modificationMask 変更部分のマスク
 * @param {import("./cv-util.js").Mat8U4C} page 参照用の画像（サイズ取得用）
 * @param {Readonly<Pallet>} pallet 色パレット
 * @returns {{addition: cv.Mat, deletion: cv.Mat, modification: cv.Mat}} 色付けされた差分画像
 */
function createColoredMasks(
  additionMask,
  deletionMask,
  modificationMask,
  page,
  pallet
) {
  // 追加部分の色付け画像
  const additionColored = new cv.Mat(
    page.rows,
    page.cols,
    cv.CV_8UC4,
    new cv.Scalar(
      pallet.addition.blue,
      pallet.addition.green,
      pallet.addition.red,
      255
    )
  );
  const addition = new cv.Mat();
  cv.bitwise_and(additionColored, additionColored, addition, additionMask);

  // 削除部分の色付け画像
  const deletionColored = new cv.Mat(
    page.rows,
    page.cols,
    cv.CV_8UC4,
    new cv.Scalar(
      pallet.deletion.blue,
      pallet.deletion.green,
      pallet.deletion.red,
      255
    )
  );
  const deletion = new cv.Mat();
  cv.bitwise_and(deletionColored, deletionColored, deletion, deletionMask);

  // 変更部分の色付け画像
  const modificationColored = new cv.Mat(
    page.rows,
    page.cols,
    cv.CV_8UC4,
    new cv.Scalar(
      pallet.modification.blue,
      pallet.modification.green,
      pallet.modification.red,
      255
    )
  );
  const modification = new cv.Mat();
  cv.bitwise_and(
    modificationColored,
    modificationColored,
    modification,
    modificationMask
  );

  // 使用したMatを削除
  additionColored.delete();
  deletionColored.delete();
  modificationColored.delete();

  return { addition, deletion, modification };
}

/**
 * 元画像のアルファ値を下げる（20%）
 * @param {cv.MatVector} aChannels A画像のチャンネル
 * @param {cv.MatVector} bChannels B画像のチャンネル
 * @param {import("./cv-util.js").Mat8U4C} aPage A画像
 * @param {import("./cv-util.js").Mat8U4C} bPage B画像
 * @returns {{aAlpha20: cv.Mat, bAlpha20: cv.Mat}} アルファ値を下げた画像
 */
function createAlphaReducedImages(aChannels, bChannels, aPage, bPage) {
  const aAlpha20 = new cv.Mat();
  const bAlpha20 = new cv.Mat();

  // アルファチャンネルを20%に設定
  const aAlphaChannels = new cv.MatVector();
  const bAlphaChannels = new cv.MatVector();

  for (let c = 0; c < 3; c++) {
    aAlphaChannels.push_back(aChannels.get(c));
    bAlphaChannels.push_back(bChannels.get(c));
  }

  // アルファチャンネルを20%に設定
  const aAlphaChannel = new cv.Mat();
  const bAlphaChannel = new cv.Mat();

  try {
    cv.multiply(
      aChannels.get(3),
      new cv.Mat(aPage.rows, aPage.cols, cv.CV_8UC1, new cv.Scalar(0.2)),
      aAlphaChannel
    );
    cv.multiply(
      bChannels.get(3),
      new cv.Mat(bPage.rows, bPage.cols, cv.CV_8UC1, new cv.Scalar(0.2)),
      bAlphaChannel
    );

    aAlphaChannels.push_back(aAlphaChannel);
    bAlphaChannels.push_back(bAlphaChannel);

    cv.merge(aAlphaChannels, aAlpha20);
    cv.merge(bAlphaChannels, bAlpha20);
  } finally {
    aAlphaChannel.delete();
    bAlphaChannel.delete();
    aAlphaChannels.delete();
    bAlphaChannels.delete();
  }

  return { aAlpha20, bAlpha20 };
}

/**
 * 全ての画像を合成する
 * @param {cv.Mat} aAlpha20 アルファ値を下げたA画像
 * @param {cv.Mat} bAlpha20 アルファ値を下げたB画像
 * @param {cv.Mat} addition 追加部分の画像
 * @param {cv.Mat} deletion 削除部分の画像
 * @param {cv.Mat} modification 変更部分の画像
 * @returns {cv.Mat} 合成画像
 */
function mergeDifferences(
  aAlpha20,
  bAlpha20,
  addition,
  deletion,
  modification
) {
  const merged = new cv.Mat();
  cv.addWeighted(aAlpha20, 1.0, bAlpha20, 1.0, 0.0, merged);

  // 差分を合成
  cv.add(merged, addition, merged);
  cv.add(merged, deletion, merged);
  cv.add(merged, modification, merged);

  return merged;
}

/**
 * @param {cv.Mat} addition
 * @param {cv.Mat} deletion
 * @param {cv.Mat} modification
 * @param {cv.Mat} merged
 * @param {import("./cv-util.js").Mat8U4C} aPage
 * @param {import("./cv-util.js").Mat8U4C} bPage
 * @param {number} additionCount
 * @param {number} deletionCount
 * @param {number} modificationCount
 * @returns {Promise<Difference>}
 */
async function exportResults(
  addition,
  deletion,
  modification,
  merged,
  aPage,
  bPage,
  additionCount,
  deletionCount,
  modificationCount
) {
  const additionPNG = await matToPNGBuffer(matNormalizeTo8U4C(addition));
  const deletionPNG = await matToPNGBuffer(matNormalizeTo8U4C(deletion));
  const modificationPNG = await matToPNGBuffer(
    matNormalizeTo8U4C(modification)
  );
  const mergedPNG = await matToPNGBuffer(matNormalizeTo8U4C(merged));
  const aPNG = await matToPNGBuffer(matNormalizeTo8U4C(aPage));
  const bPNG = await matToPNGBuffer(matNormalizeTo8U4C(bPage));

  return {
    a: aPNG,
    b: bPNG,
    diff: {
      addition: {
        image: additionPNG,
        count: additionCount,
      },
      deletion: {
        image: deletionPNG,
        count: deletionCount,
      },
      modification: {
        image: modificationPNG,
        count: modificationCount,
      },
    },
    merged: mergedPNG,
  };
}

/**
 * @param {Uint8Array} a Input PDF (before)
 * @param {Uint8Array} b Input PDF (after)
 * @param {{ dpi?: number; pallet?: Partial<Pallet>; }} param2
 * @typedef {{
 *   a: Uint8Array;
 *   b: Uint8Array;
 *   diff: {
 *     addition: {
 *       image: Uint8Array;
 *       count: number;
 *     };
 *     deletion: {
 *       image: Uint8Array;
 *       count: number;
 *     };
 *     modification: {
 *       image: Uint8Array;
 *       count: number;
 *     };
 *   };
 *   merged: Uint8Array;
 * }} Difference
 * - a,b,merged: RGBA PNG image
 * - {addition,deletion,modification}.image: binary (1 bit per pixel) PNG image
 * @returns {Promise<Difference[]>}
 */
export async function visualizeDifferences(a, b, { dpi, pallet: palletInput }) {
  const result = [];

  const [aDoc, aCount] = openDocument(a);
  const [bDoc, bCount] = openDocument(b);
  const pagesCount = Math.max(aCount, bCount);

  dpi ??= DEFAULT_DPI;

  palletInput ??= { ...DEFAULT_PALLET };
  palletInput.addition ??= DEFAULT_PALLET.addition;
  palletInput.deletion ??= DEFAULT_PALLET.deletion;
  palletInput.modification ??= DEFAULT_PALLET.modification;
  const pallet = /** @type {Readonly<Pallet>} */ (palletInput);

  for (let i = 0; i < pagesCount; i++) {
    const [aPage, bPage] = await loadPageImages(aDoc, bDoc, i, dpi);

    try {
      const aResult = createBinaryMask(aPage);
      const bResult = createBinaryMask(bPage);

      try {
        const diffResult = detectDifferences(
          aResult.mask,
          bResult.mask,
          aPage,
          bPage
        );

        try {
          const coloredResult = createColoredMasks(
            diffResult.additionMask,
            diffResult.deletionMask,
            diffResult.modificationMask,
            aPage,
            pallet
          );

          try {
            const alphaResult = createAlphaReducedImages(
              aResult.channels,
              bResult.channels,
              aPage,
              bPage
            );

            try {
              const merged = mergeDifferences(
                alphaResult.aAlpha20,
                alphaResult.bAlpha20,
                coloredResult.addition,
                coloredResult.deletion,
                coloredResult.modification
              );

              try {
                result.push(
                  await exportResults(
                    coloredResult.addition,
                    coloredResult.deletion,
                    coloredResult.modification,
                    merged,
                    aPage,
                    bPage,
                    cv.countNonZero(diffResult.additionMask),
                    cv.countNonZero(diffResult.deletionMask),
                    cv.countNonZero(diffResult.modificationMask)
                  )
                );
              } finally {
                merged.delete();
              }
            } finally {
              alphaResult.aAlpha20.delete();
              alphaResult.bAlpha20.delete();
            }
          } finally {
            coloredResult.addition.delete();
            coloredResult.deletion.delete();
            coloredResult.modification.delete();
          }
        } finally {
          diffResult.additionMask.delete();
          diffResult.deletionMask.delete();
          diffResult.modificationMask.delete();
          diffResult.commonMask.delete();
        }
      } finally {
        aResult.mask.delete();
        bResult.mask.delete();
        aResult.alpha.delete();
        bResult.alpha.delete();
        aResult.channels.delete();
        bResult.channels.delete();
      }
    } finally {
      aPage.delete();
      bPage.delete();
    }
  }

  return result;
}
