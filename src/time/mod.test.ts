import { Time } from "./mod.ts";

Deno.test("time", () => {
    const fmt = Time.fmt("YYYY-MM-DD HH:mm:ss.SSS ZZ");

    console.log(fmt(Time.now()));
});