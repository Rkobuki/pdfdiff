// @ts-check

import fs from "node:fs";

import { visualizeDifferences, enumerate } from "./index.js";

for await (const [
  i,
  { a, b, diff, addition, deletion, modification },
] of enumerate(
  visualizeDifferences(
    new Uint8Array(fs.readFileSync("test/a.pdf")),
    new Uint8Array(fs.readFileSync("test/b.pdf")),
    { dpi: 300, mask: new Uint8Array(fs.readFileSync("test/mask.pdf")) },
  ),
  1,
)) {
  console.log(
    `Page ${i}, Addition: ${addition.length}, Deletion: ${deletion.length}, Modification: ${modification.length}`,
  );
  fs.writeFileSync(
    "test/a_test.png",
    new Uint8Array(await a.getBuffer("image/png")),
  );
  fs.writeFileSync(
    "test/b_test.png",
    new Uint8Array(await b.getBuffer("image/png")),
  );
  fs.writeFileSync(
    "test/diff_test.png",
    new Uint8Array(await diff.getBuffer("image/png")),
  );
}
