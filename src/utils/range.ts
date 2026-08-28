export function* range(v: number, opts?: { step?: number; start?: number }): Generator<number> {
    const step = opts?.step ?? 1;
    const start = opts?.start ?? 0;
    if (step <= 0) throw new Error(`invalid step: ${step}`);
    for (let i = start; i < v; i += step) {
        yield i;
    }
}
