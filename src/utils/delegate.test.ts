import { Delegate } from "./delegate.ts";

Deno.test("Delegate", () => {
    const Sum = Delegate<(...args: number[]) => number>(import.meta, "sum");

    class X {
        static add(...args: number[]): number {
            return args.reduce((s, a) => s + a, 0);
        }
    }

    Sum.inject(X.add.bind(X));

    console.log(Sum.invoke(1, 3));
});