import * as path from "node:path";
import * as url from "node:url";

class DelegateCls<T extends (...args: any[]) => any> {
    private readonly name: string;
    private val: T | undefined = undefined;

    constructor(meta: ImportMeta, name: string) {
        const __dirname = path.dirname(url.fileURLToPath(meta.url));
        this.name = `${__dirname.replaceAll(path.sep, "/")}#${name}`;
    }

    invoke(..._args: Parameters<T>): ReturnType<T> {
        throw new Error(`[Delegate ${this.name}] not settled`);
    }

    private _invoke(...args: Parameters<T>): ReturnType<T> {
        return this.val!(...args);
    }

    inject(fnc: T) {
        if (this.val !== undefined) {
            throw new Error(`[Delegate ${this.name}] already settled`);
        }
        this.val = fnc;
        this.invoke = this._invoke;
    }
}

export function Delegate<T extends (...args: any[]) => any>(meta: ImportMeta, name: string) {
    return new DelegateCls<T>(meta, name);
}
