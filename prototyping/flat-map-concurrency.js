// @ts-check

import { range } from "ix/asynciterable";
import { flatMap } from "ix/asynciterable/operators";

import Worker from "web-worker";

const dateStr = () => new Date().toISOString();

console.log({ hardwareConcurrency: navigator.hardwareConcurrency });

for await (const pow2 of range(0, 10).pipe(
  flatMap(async (i) => {
    console.log(`${dateStr()} start:${i}`);

    const worker = new Worker("", { eval: true });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return i * i;
  }, navigator.hardwareConcurrency),
)) {
  console.log(`${dateStr()} result:${pow2}`);
}

/*
{ hardwareConcurrency: 8 }
2025-06-07T02:19:14.724Z start:0
2025-06-07T02:19:14.725Z start:1
2025-06-07T02:19:14.725Z start:2
2025-06-07T02:19:14.725Z start:3
2025-06-07T02:19:14.725Z start:4
2025-06-07T02:19:14.725Z start:5
2025-06-07T02:19:14.725Z start:6
2025-06-07T02:19:14.725Z start:7
2025-06-07T02:19:16.728Z result:0
2025-06-07T02:19:16.728Z start:8
2025-06-07T02:19:16.729Z result:1
2025-06-07T02:19:16.729Z start:9
2025-06-07T02:19:16.729Z result:4
2025-06-07T02:19:16.729Z result:9
2025-06-07T02:19:16.729Z result:16
2025-06-07T02:19:16.729Z result:25
2025-06-07T02:19:16.730Z result:36
2025-06-07T02:19:16.730Z result:49
2025-06-07T02:19:18.732Z result:64
2025-06-07T02:19:18.732Z result:81
*/
