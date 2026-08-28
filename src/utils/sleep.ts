export function sleep(ms: number, opts?: { signal?: AbortSignal; onabort?: "reject" | "resolve" }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const signal = opts?.signal;
        const abort_action = opts?.onabort === "resolve" ? () => resolve() : () => reject(new Error("aborted"));

        const onAbort = () => {
            cleanup();
            abort_action();
        };

        function cleanup() {
            clearTimeout(th);
            signal?.removeEventListener("abort", onAbort);
        }

        if (signal?.aborted) {
            abort_action();
            return;
        }
        const th = setTimeout(
            () => {
                cleanup();
                resolve();
            },
            ms
        );
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}