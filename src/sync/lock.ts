import { inspect } from "node:util";
import { List } from "../utils/list.ts";

interface IWaiter {
    resolve: () => void;
    aborted?: boolean;
}

export class LockError extends Error {
    override name = "LockError";
};

export class Lock {
    private locked = false;
    private readonly waiters: List<IWaiter>;

    constructor() {
        this.waiters = new List();
    }

    acquire(opts?: { signal?: AbortSignal }): Promise<{ [Symbol.dispose]: () => void }> {
        if (opts?.signal?.aborted) {
            throw new LockError("acquire operation is aborted");
        }
        if (this.locked) {
            const { resolve, promise, reject } = Promise.withResolvers<{ [Symbol.dispose]: () => void }>();
            const w: IWaiter = {
                resolve: () => {
                    resolve({ [Symbol.dispose]: () => this.release() });
                }
            };
            opts?.signal?.addEventListener(
                "abort",
                () => {
                    w.aborted = true;
                    reject(new LockError("acquire operation is aborted"));
                },
                { once: true }
            );
            this.waiters.pushr(this.waiters.mknode(w));
            return promise;
        } else {
            this.locked = true;
        }
        return Promise.resolve({ [Symbol.dispose]: () => this.release() });
    }

    release() {
        if (!this.locked) throw new LockError("release lock is free");

        if (this.waiters.empty()) {
            this.locked = false;
            return;
        }

        while (!this.waiters.empty()) {
            const w = this.waiters.popl().val;
            if (w.aborted) continue;
            w.resolve();
            return;
        }

        this.locked = false;
    }

    [inspect.custom]() {
        return `[Lock locked: ${this.locked}, queue: ${this.waiters.size}]`;
    }

    async exec<T>(ps: (() => Promise<T>), opts?: { signal?: AbortSignal }): Promise<T> {
        using _ = await this.acquire(opts);
        return await ps();
    }
}
