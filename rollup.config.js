import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import alias from "@rollup/plugin-alias";
import copy from "rollup-plugin-copy";
import path from "path";

const plugins = [
  nodeResolve(),
  commonjs(),
  copy({
    targets: [
      {
        src: "node_modules/mupdf/dist/mupdf-wasm.wasm",
        dest: "dist",
      },
      {
        src: "src/index.html",
        dest: "dist",
      },
      {
        src: "src/browser.js",
        dest: "dist",
      },
      {
        src: "src/style.css",
        dest: "dist",
      },
    ],
  }),
];

export default [
  {
    input: "src/index.js",
    output: {
      file: "dist/index.js",
      format: "es",
      sourcemap: true,
    },
    plugins: [
      alias({
        entries: [
          {
            find: "jimp",
            replacement: path.resolve(
              "node_modules/jimp/dist/browser/index.js",
            ),
          },
          {
            find: "web-worker",
            replacement: path.resolve(
              "node_modules/web-worker/dist/browser/index.cjs",
            ),
          },
        ],
      }),
      ...plugins,
    ],
  },
  {
    input: "src/worker.js",
    output: {
      file: "dist/worker.js",
      format: "es",
      sourcemap: true,
    },
    plugins: [
      alias({
        entries: [
          {
            find: "jimp",
            replacement: path.resolve(
              "node_modules/jimp/dist/browser/index.js",
            ),
          },
        ],
      }),
      ...plugins,
    ],
  },
];
