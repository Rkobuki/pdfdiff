// @ts-check

import { range } from "ix/asynciterable";
import { flatMap } from "ix/asynciterable/operators";
import Worker from "web-worker";
import NodeHog from "nodehog";

const dateStr = () => new Date().toISOString();

console.log({ hardwareConcurrency: navigator.hardwareConcurrency });

for await (const pow2 of range(0, 10).pipe(
  flatMap(async (i) => {
    console.log(`${dateStr()} start:${i}`);
    // 処理を他CPUに分散する例
    return await /** @type {Promise<number>} */ (
      new Promise((resolve) => {
        const url = new URL("./worker.js", import.meta.url);
        const worker = new Worker(url, { type: "module" });
        worker.addEventListener("message", (e) => {
          resolve(e.data);
          worker.terminate();
        });
        worker.postMessage(i);
      })
    );

    // 処理が分散されない例
    // await new NodeHog("cpu", 5_000, 1, 1).start();
    // return i * i;
  }, navigator.hardwareConcurrency),
)) {
  console.log(`${dateStr()} result:${pow2}`);
}

/*
他CPUに分散された実行結果例：

{ hardwareConcurrency: 8 }
2025-06-07T07:44:28.633Z start:0
2025-06-07T07:44:28.636Z start:1
2025-06-07T07:44:28.636Z start:2
2025-06-07T07:44:28.638Z start:3
2025-06-07T07:44:28.638Z start:4
2025-06-07T07:44:28.639Z start:5
2025-06-07T07:44:28.640Z start:6
2025-06-07T07:44:28.640Z start:7

===========================================
> Starting new NodeHog [ pypq8 ].


===========================================
> Starting new NodeHog [ hbqos ].


===========================================
> Starting new NodeHog [ kmn4i ].


===========================================
> Starting new NodeHog [ q5b5w ].


===========================================
> Starting new NodeHog [ c3j87 ].


===========================================
> Starting new NodeHog [ 7zrgj ].


===========================================
> Starting new NodeHog [ r99a1 ].


===========================================
> Starting new NodeHog [ oh88p ].


[ pypq8 ] --> Stressing CPU...

[ pypq8 ] ----> 1 second of stress period complete.
[ pypq8 ] ----> 2 seconds of stress period complete.
[ pypq8 ] ----> 3 seconds of stress period complete.
[ pypq8 ] ----> 4 seconds of stress period complete.
[ pypq8 ] ----> 5 seconds of stress period complete.

[ pypq8 ] --> Relieving...

2025-06-07T07:44:33.703Z result:0
2025-06-07T07:44:33.703Z start:8

[ hbqos ] --> Stressing CPU...

[ hbqos ] ----> 1 second of stress period complete.
[ hbqos ] ----> 2 seconds of stress period complete.
[ hbqos ] ----> 3 seconds of stress period complete.
[ hbqos ] ----> 4 seconds of stress period complete.
[ hbqos ] ----> 5 seconds of stress period complete.

[ hbqos ] --> Relieving...

2025-06-07T07:44:33.705Z result:1
2025-06-07T07:44:33.706Z start:9

[ q5b5w ] --> Stressing CPU...

[ q5b5w ] ----> 1 second of stress period complete.
[ q5b5w ] ----> 2 seconds of stress period complete.
[ q5b5w ] ----> 3 seconds of stress period complete.
[ q5b5w ] ----> 4 seconds of stress period complete.
[ q5b5w ] ----> 5 seconds of stress period complete.

[ q5b5w ] --> Relieving...

2025-06-07T07:44:33.707Z result:9

[ kmn4i ] --> Stressing CPU...

[ kmn4i ] ----> 1 second of stress period complete.
[ kmn4i ] ----> 2 seconds of stress period complete.
[ kmn4i ] ----> 3 seconds of stress period complete.
[ kmn4i ] ----> 4 seconds of stress period complete.
[ kmn4i ] ----> 5 seconds of stress period complete.

[ kmn4i ] --> Relieving...

2025-06-07T07:44:33.708Z result:16

[ r99a1 ] --> Stressing CPU...

[ r99a1 ] ----> 1 second of stress period complete.
[ r99a1 ] ----> 2 seconds of stress period complete.
[ r99a1 ] ----> 3 seconds of stress period complete.
[ r99a1 ] ----> 4 seconds of stress period complete.
[ r99a1 ] ----> 5 seconds of stress period complete.

[ r99a1 ] --> Relieving...

2025-06-07T07:44:33.711Z result:4

[ c3j87 ] --> Stressing CPU...

[ c3j87 ] ----> 1 second of stress period complete.
[ c3j87 ] ----> 2 seconds of stress period complete.
[ c3j87 ] ----> 3 seconds of stress period complete.
[ c3j87 ] ----> 4 seconds of stress period complete.
[ c3j87 ] ----> 5 seconds of stress period complete.

[ c3j87 ] --> Relieving...

2025-06-07T07:44:33.711Z result:36

[ 7zrgj ] --> Stressing CPU...

[ 7zrgj ] ----> 1 second of stress period complete.
[ 7zrgj ] ----> 2 seconds of stress period complete.
[ 7zrgj ] ----> 3 seconds of stress period complete.
[ 7zrgj ] ----> 4 seconds of stress period complete.
[ 7zrgj ] ----> 5 seconds of stress period complete.

[ 7zrgj ] --> Relieving...

2025-06-07T07:44:33.712Z result:49

[ oh88p ] --> Stressing CPU...

[ oh88p ] ----> 1 second of stress period complete.
[ oh88p ] ----> 2 seconds of stress period complete.
[ oh88p ] ----> 3 seconds of stress period complete.
[ oh88p ] ----> 4 seconds of stress period complete.
[ oh88p ] ----> 5 seconds of stress period complete.

[ oh88p ] --> Relieving...

2025-06-07T07:44:33.721Z result:25

===========================================
> Starting new NodeHog [ p21ap ].


===========================================
> Starting new NodeHog [ 3yywg ].


[ p21ap ] --> Stressing CPU...

[ p21ap ] ----> 1 second of stress period complete.
[ p21ap ] ----> 2 seconds of stress period complete.
[ p21ap ] ----> 3 seconds of stress period complete.
[ p21ap ] ----> 4 seconds of stress period complete.
[ p21ap ] ----> 5 seconds of stress period complete.

[ p21ap ] --> Relieving...


> Killing NodeHog [ p21ap ].
-------------------------------------------

2025-06-07T07:44:38.755Z result:64

[ 3yywg ] --> Stressing CPU...

[ 3yywg ] ----> 1 second of stress period complete.
[ 3yywg ] ----> 2 seconds of stress period complete.
[ 3yywg ] ----> 3 seconds of stress period complete.
[ 3yywg ] ----> 4 seconds of stress period complete.
[ 3yywg ] ----> 5 seconds of stress period complete.

[ 3yywg ] --> Relieving...


> Killing NodeHog [ 3yywg ].
-------------------------------------------

2025-06-07T07:44:38.757Z result:81
*/
