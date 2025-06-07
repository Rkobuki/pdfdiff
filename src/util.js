// @ts-check

/**
 * @param {string} hex
 */
export const parseHex = (hex) =>
  /^#([0-9a-fA-F]{6})$/.test(hex)
    ? [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
        255,
      ]
    : /^#([0-9a-fA-F]{8})$/.test(hex)
      ? [
          parseInt(hex.slice(1, 3), 16),
          parseInt(hex.slice(3, 5), 16),
          parseInt(hex.slice(5, 7), 16),
          parseInt(hex.slice(7, 9), 16),
        ]
      : null;

/**
 * @param {[number, number, number, number]} rgba
 */
export const formatHex = ([r, g, b, a]) =>
  "#" +
  [r, g, b, a]
    .map((v) => {
      const hex = v.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");
