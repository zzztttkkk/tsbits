import { assertEquals } from "@std/assert/equals";
import { range } from "../utils/range.ts";
import { sleep } from "../utils/sleep.ts";
import { Lock } from "./mod.ts";

Deno.test("lock sync", async () => {
    let c = 100;
    const lock = new Lock();

    const ps = [] as Promise<void>[];
    for (const _ of range(100)) {
        ps.push(
            (async () => {
                using _ = await lock.acquire();
                if (c > 50) {
                    await sleep(1);
                    c--;
                }
            })()
        );
    }

    await Promise.all(ps);

    assertEquals(c, 50);
});

Deno.test("lock async", async () => {
    let c = 100;

    const ps = [] as Promise<void>[];
    for (const _ of range(100)) {
        ps.push(
            (async () => {
                if (c > 50) {
                    await sleep(1);
                    c--;
                }
            })()
        );
    }

    await Promise.all(ps);
    assertEquals(c, 0);
    console.warn(`c: ${c}, which is not what we want`);
});

Deno.test("lock abort", async () => {
    const ctl = new AbortController();
    setTimeout(() => { ctl.abort(); }, 500);

    const lock = new Lock();

    const ps = [
        (async () => {
            using _ = await lock.acquire();
            await sleep(1000);
        })(),
        (async () => {
            using _ = await lock.acquire({ signal: ctl.signal });
        })(),
    ];
    const prs = await Promise.allSettled(ps);
    assertEquals(prs[1].status, "rejected");
    using _ = await lock.acquire();
});