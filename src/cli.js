#!/usr/bin/env node
// @ts-check

import fs from "node:fs";
import path from "node:path";
import util from "node:util";

import {
  alignStrategyValues,
  DEFAULT_ALIGN,
  DEFAULT_DPI,
  DEFAULT_PALLET,
  enumerate,
  formatHex,
  parseHex,
  visualizeDifferences,
} from "./index.js";

const {
  positionals,
  values: {
    dpi: dpi_,
    alpha,
    mask: mask_,
    align,
    addition: addition_,
    deletion: deletion_,
    modification: modification_,
    help,
  },
} = util.parseArgs({
  allowPositionals: true,
  options: {
    dpi: { type: "string", default: DEFAULT_DPI.toString(10) },
    alpha: { type: "boolean" },
    mask: { type: "string" },
    align: { type: "string", default: DEFAULT_ALIGN },
    addition: { type: "string", default: formatHex(DEFAULT_PALLET.addition) },
    deletion: { type: "string", default: formatHex(DEFAULT_PALLET.deletion) },
    modification: {
      type: "string",
      default: formatHex(DEFAULT_PALLET.modification),
    },
    help: { type: "boolean", short: "h" },
  },
});

if (help) {
  console.log(`USAGE:
    pdfdiff <A> <B> <OUTDIR> [OPTIONS]

OPTIONS:
    --dpi <DPI>
    --alpha
    --mask <PATH>
    --align <"resize"
             | "top-left" | "top-center" | "top-right"
             | "middle-left" | "middle-center" | "middle-right"
             | "bottom-left" | "bottom-center" | "bottom-right">
    --addition <HEX>
    --deletion <HEX>
    --modification <HEX>
    -h, --help
`);
  process.exit(0);
}
if (positionals.length !== 3) {
  throw new Error("Expected 3 positional arguments: <A> <B> <OUTDIR>");
}
const [pdfA, pdfB] = positionals
  .slice(0, 2)
  .map((s) => new Uint8Array(fs.readFileSync(path.resolve(s))));
const outDir = path.resolve(positionals[2]);

const dpi = parseInt(dpi_, 10);
if (Number.isNaN(dpi)) {
  throw new Error("Invalid DPI value");
}
const pdfMask =
  typeof mask_ !== "undefined"
    ? new Uint8Array(fs.readFileSync(path.resolve(mask_)))
    : undefined;
// @ts-expect-error
if (!alignStrategyValues.includes(align)) {
  throw new Error(`Invalid alignment strategy`);
}
const addition = parseHex(addition_);
const deletion = parseHex(deletion_);
const modification = parseHex(modification_);
if (addition === null || deletion === null || modification === null) {
  throw new Error("Invalid color format");
}

fs.mkdirSync(outDir, { recursive: true });
for await (const [
  i,
  { a, b, diff, addition, deletion, modification },
] of enumerate(
  visualizeDifferences(pdfA, pdfB, {
    dpi,
    alpha,
    mask: pdfMask,
    // @ts-ignore
    align,
  }),
  1,
)) {
  console.log(
    `Page ${i}, Addition: ${addition.length}, Deletion: ${deletion.length}, Modification: ${modification.length}`,
  );
  const dir = path.join(outDir, i.toString(10));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "a.png"),
    new Uint8Array(await a.getBuffer("image/png")),
  );
  fs.writeFileSync(
    path.join(dir, "b.png"),
    new Uint8Array(await b.getBuffer("image/png")),
  );
  fs.writeFileSync(
    path.join(dir, "diff.png"),
    new Uint8Array(await diff.getBuffer("image/png")),
  );
}
