import url from "node:url";

Deno.test("ximport", () => {
    console.log(new URL(import.meta.url));
    console.log(url.fileURLToPath(import.meta.url));
});