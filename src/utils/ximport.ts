import fs from "node:fs";
import { glob } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const AllImports = [] as string[];
const uniqueset = new Set<string>();

export async function globimport(globs: string[], cb?: () => void | Promise<void>) {
    if (!Reflect.has(globalThis, UseStaticImportsKey)) {
        const files = glob(globs);
        for await (const file of files) {
            if (file.endsWith(".ts")) {
                await ximport(`file://${path.resolve(file)}`);
            }
        }
    }
    if (cb) await cb();
}

export function ximport(uri: string) {
    uri = import.meta.resolve(uri);
    if (!Reflect.has(globalThis, UseStaticImportsKey)) {
        if (!uniqueset.has(uri)) {
            uniqueset.add(uri);
            AllImports.push(uri);
        }
    }
    return import(uri);
}

const UseStaticImportsKey = "___use_static_imports___";

export class XImport {
    static generatestatic(fp: string, mainmeta: ImportMeta) {
        if (Reflect.has(globalThis, UseStaticImportsKey)) return;
        if (!mainmeta.main) {
            throw new Error("meta.main is false");
        }
        const root = path.dirname(url.fileURLToPath(mainmeta.url));
        const tmp = [
            `Reflect.set(globalThis, "${UseStaticImportsKey}", true);`,
            ...AllImports.map(v => {
                const fp = url.fileURLToPath(new URL(v));
                const rel = path.relative(root, fp).replaceAll("\\", "/");
                return `await import("./${rel}");`
            })
        ];
        fs.writeFileSync(fp, tmp.join("\n"));
    }
}