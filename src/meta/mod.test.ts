import { metainfo, Register } from "./mod.ts";

Deno.test("withtype", () => {
    const reg = new Register<{}, { c: number }, {}>(Symbol("0.0"));

    class A {
        @reg.prop.number()
        c: number = 0;
    }

    console.log(metainfo(reg, A).prop("c")?.opts?.designtype === Number);
});