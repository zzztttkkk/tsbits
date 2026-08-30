import { Layout } from "./layout.ts";
import { Time } from "./mod.ts";

Deno.test("time", () => {
    const layout = new Layout("YYYY-MM-DD HH:mm:ss.SSS");
    console.log(layout.fmt(Time.now()));
});