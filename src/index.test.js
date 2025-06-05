// @ts-check

import fs from "node:fs";

import { visualizeDifferences } from "./index.js";

for await (const [pageA, pageB] of visualizeDifferences(
  new Uint8Array(fs.readFileSync("test/a.pdf")),
  new Uint8Array(fs.readFileSync("test/b.pdf")),
)) {
  console.log("page");
  fs.writeFileSync(
    "test/a_test.png",
    new Uint8Array(await pageA.getBuffer("image/png")),
  );
  fs.writeFileSync(
    "test/b_test.png",
    new Uint8Array(await pageB.getBuffer("image/png")),
  );
}
