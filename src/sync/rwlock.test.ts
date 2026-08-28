import { range } from "../utils/range.ts";
import { sleep } from "../utils/sleep.ts";
import { RwLock } from "./rwlock.ts";

Deno.test("rwlock w", async () => {
    const lock = new RwLock();
    let c = 100;

    await Promise.all(
        Array.from(range(100)).map(async () => {
            using _ = await lock.acquirew();
            if (c > 50) {
                await sleep(1);
                c--;
            }
        })
    );

    console.log(c);
});

Deno.test("rwlock rw", async () => {
    const lock = new RwLock();
    let c = 100;

    async function w() {
        using _ = await lock.acquirew();
        if (c > 50) {
            await sleep(3);
            c--;
        }
    }

    async function r(idx: number) {
        using _ = await lock.acquirer();

        const before = c;
        await sleep(1);
        const after = c;
        if (before !== after) {
            throw new Error(`R${idx} before ${before} after ${after}`);
        }
    }

    await Promise.all(
        Array.from(range(100)).map(async (idx) => {
            if (idx % 3 === 0) {
                await w();
                return;
            }
            await r(idx);
        })
    );

    console.log(c);
});