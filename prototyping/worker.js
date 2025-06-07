// @ts-check

import NodeHog from "nodehog";

addEventListener("message", async (e) => {
  /** @type {number} */
  const i = e.data;
  await new NodeHog("cpu", 5_000, 1, 1).start();
  postMessage(i * i);
});
