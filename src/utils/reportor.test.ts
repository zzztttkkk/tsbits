import { Counter } from "./reportor.ts";

Deno.test("Counter", () => {
    enum X {
        A,
        B,
        C = 40,
    }

    const counter = new Counter(X);

    counter.incr(X.A);

    console.log(counter.toJSON());
});