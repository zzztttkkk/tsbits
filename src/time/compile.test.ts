import { compile } from "./compile.ts";

Deno.test("compile", () => {
    console.log(compile("YYYY-MM"))
});