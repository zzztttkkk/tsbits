import { inspect } from "node:util";
import { List } from "../utils/list.ts";
import { LockError } from "./lock.ts";

interface Waiter {
    aborted?: boolean;
    w: boolean;
    resolve: () => void;
}

class ReleaseHandle implements Disposable {
    #fn: () => void;

    constructor(v: () => void) {
        this.#fn = v;
    }

    [Symbol.dispose](): void { return this.#fn(); }
}

export class RwLock {
    private writing = false;
    private readings = 0;
    private readonly waiters: List<Waiter>;

    constructor() {
        this.waiters = new List();
    }

    [inspect.custom]() {
        return `[RwLock w: ${this.writing}, r: ${this.readings}, queue: ${this.waiters.size}]`;
    }

    private releasew() {
        if (!this.writing) throw new LockError("lock is not in writing");

        while (true) {
            if (this.waiters.empty()) {
                this.writing = false;
                return;
            }
            const top = this.waiters.peekl()!;
            if (top.aborted) {
                this.waiters.popl();
                continue;
            }

            if (top.w) {
                // because this loop can make multi reads once
                if (this.readings > 0) return;
                this.waiters.popl();
                this.writing = true;
                top.resolve();
                return;
            }
            this.waiters.popl();
            this.writing = false;
            this.readings++;
            top.resolve();
        }
    }

    private releaser() {
        if (this.readings < 1) throw new LockError("lock is not in reading");

        this.readings--;
        while (true) {
            if (this.waiters.empty()) {
                return;
            }
            const top = this.waiters.peekl()!;
            if (top.aborted) {
                this.waiters.popl();
                continue;
            }

            if (top.w) {
                if (this.readings < 1) {
                    this.writing = true;
                    this.waiters.popl().val.resolve();
                }
                return;
            }
            this.waiters.popl().val.resolve();
            this.readings++;
        }
    }

    acquirew(opts?: { signal?: AbortSignal }): Promise<ReleaseHandle> {
        if (opts?.signal?.aborted) {
            throw new LockError("acquire operation is aborted");
        }
        if (this.writing || this.readings) {
            const { resolve, promise, reject } = Promise.withResolvers<ReleaseHandle>();
            const w: Waiter = {
                resolve: () => resolve(new ReleaseHandle(this.releasew.bind(this))),
                w: true
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
            this.writing = true;
        }
        return Promise.resolve(new ReleaseHandle(this.releasew.bind(this)));
    }

    acquirer(opts?: { signal?: AbortSignal }): Promise<ReleaseHandle> {
        if (opts?.signal?.aborted) {
            throw new LockError("acquire operation is aborted");
        }
        if (this.writing || this.waiters.peekl()?.w) {
            const { resolve, promise, reject } = Promise.withResolvers<ReleaseHandle>();
            const w: Waiter = {
                resolve: () => resolve(new ReleaseHandle(this.releaser.bind(this))),
                w: false
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
            this.readings++;
        }
        return Promise.resolve(new ReleaseHandle(this.releaser.bind(this)));
    }
}