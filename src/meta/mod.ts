import { inspect } from "node:util";

export class PropInfo<T extends object> {
    public accessorstatus?: {
        canget?: boolean;
        canset?: boolean;
    };
    public opts: IPropOpts<T> | undefined;

    constructor(opts?: IPropOpts<T>) {
        this.opts = opts;
    }

    get readable(): boolean {
        if (!this.accessorstatus) return true;
        return this.accessorstatus.canget ?? false;
    }

    get writable(): boolean {
        if (!this.accessorstatus) return true;
        return this.accessorstatus.canset ?? false;
    }

    get designtype(): TypeValue | undefined {
        const type = this.opts?.designtype;
        if (!type) return undefined;
        if (typeof type === "function" || type instanceof ContainerType) return type;
        return undefined;
    }
}

export class MethodInfo<T extends object> {
    public opts: IMethodOpts<T> | undefined;

    constructor(opts?: IMethodOpts<T>) {
        this.opts = opts;
    }

    get paramtypes(): TypeValue[] | undefined {
        return this.opts?.paramtypes;
    }

    get returntype(): TypeValue | undefined {
        return this.opts?.returntype;
    }
}

export type PropsMetaMap<T extends object> = Map<string, PropInfo<T>>;
export type MethodsMetaMap<T extends object> = Map<string, MethodInfo<T>>;
export type ReadonlyPropsMetaMap<T extends object> = ReadonlyMap<string, PropInfo<T>>;
export type ReadonlyMethodsMetaMap<T extends object> = ReadonlyMap<string, MethodInfo<T>>;

export class Meta<C extends object, P extends object, M extends object> {
    target: Function;
    #register: Register<C, P, M>;
    #chain: Function[];
    #props: PropsMetaMap<P> | null | undefined;
    #methods: MethodsMetaMap<M> | null | undefined;

    constructor(
        register: Register<C, P, M>,
        cls: Function,
    ) {
        this.#register = register;
        this.target = cls;
        this.#chain = [];

        let cursor = this.target;
        while (cursor && cursor !== Function.prototype) {
            this.#chain.push(cursor);
            cursor = Object.getPrototypeOf(cursor);
        }
        this.#chain = this.#chain.reverse();
    }

    private scope(cls: Function): Scope<C, P, M> | undefined {
        const metas = Object.getOwnPropertyDescriptor(cls, Symbol.metadata)?.value;
        if (!metas) return undefined;
        return this.#register[AllScopeKey].get(metas);
    }

    cls(): C | undefined {
        return this.scope(this.target)?.clses.get(this.target);
    }

    props(opts?: { readable?: boolean; writable?: boolean; }): ReadonlyPropsMetaMap<P> | null {
        if (this.#props === undefined) {
            const props: PropsMetaMap<P> = new Map;

            for (const cls of this.#chain) {
                const scope = this.scope(cls);
                if (!scope) continue;
                for (const [k, v] of scope.props) {
                    props.set(k, v);
                }
            }
            this.#props = props.size ? props : null;
        }

        if (this.#props == null) return null;

        if (opts && (opts.readable != null || opts.writable != null)) {
            const newprops = new Map();
            for (const [k, v] of this.#props) {
                if (opts.readable != null && Boolean(v.readable) !== opts.readable) continue;
                if (opts.writable != null && Boolean(v.writable) !== opts.writable) continue;
                newprops.set(k, v);
            }
            if (newprops.size < 1) return null;
            return newprops;
        }
        return this.#props
    }

    methods(): ReadonlyMethodsMetaMap<M> | null {
        if (this.#methods === undefined) {
            const methods: MethodsMetaMap<M> = new Map;

            for (const cls of this.#chain) {
                const scope = this.scope(cls);
                if (!scope) continue;
                for (const [k, v] of scope.methods) {
                    methods.set(k, v);
                }
            }
            this.#methods = methods.size ? methods : null;
        }
        return this.#methods;
    }

    prop(name: string): PropInfo<P> | undefined {
        return this.props()?.get(name);
    }
}

export function metainfo<C extends object, P extends object, M extends object>(
    register: Register<C, P, M>,
    cls: Function,
): Meta<C, P, M> {
    return register.meta(cls);
}

export type IPropOpts<T extends object> = T & {
    designtype?: TypeValue;
};

export type IMethodOpts<T extends object> = T & {
    paramtypes?: TypeValue[];
    returntype?: TypeValue;
    wrap?: <F extends Function>(f: F) => F;
};

interface Scope<C extends object, P extends object, M extends object> {
    clses: Map<Function, C | undefined>;
    props: PropsMetaMap<P>;
    methods: MethodsMetaMap<M>;
}

const AllScopeKey = Symbol("AllScope");

export class Register<
    C extends object,
    P extends object,
    M extends object,
> {
    public readonly name: symbol;
    #all: Function[] = [];
    readonly #metas: Map<Function, Meta<C, P, M>> = new Map();
    [AllScopeKey] = new Map<DecoratorMetadataObject, Scope<any, any, any>>();

    constructor(name: symbol) {
        this.name = name;
        Object.defineProperty(this, "prop", { get: () => this._prop });
        applywithtypes(this);
    }

    public get AllClses(): ReadonlyArray<Function> {
        return this.#all;
    }

    private scope(ctx: DecoratorContext): Scope<C, P, M> {
        const sobj: Scope<C, P, M> = this[AllScopeKey].get(ctx.metadata) || {
            clses: new Map,
            props: new Map,
            methods: new Map,
        };
        this[AllScopeKey].set(ctx.metadata, sobj);
        return sobj;
    }

    cls(opts?: C) {
        return (target: Function, ctx: ClassDecoratorContext) => {
            this.scope(ctx).clses.set(target, opts);
            this.#all.push(target);
        };
    }

    private _prop(opts?: IPropOpts<P>) {
        return (_target: any, ctx: ClassGetterDecoratorContext | ClassSetterDecoratorContext | ClassFieldDecoratorContext | ClassAccessorDecoratorContext) => {
            if (typeof ctx.name == "symbol") {
                throw new Error("decorator can not be used on a symbol");
            }

            const props = this.scope(ctx).props;
            const prop: PropInfo<P> = props.get(ctx.name) || new PropInfo(opts);
            prop.opts = { ...prop.opts, ...opts } as IPropOpts<P>;

            switch (ctx.kind) {
                case "accessor": {
                    prop.accessorstatus = { canget: true, canset: true };
                    break;
                }
                case "getter": {
                    if (!prop.accessorstatus) prop.accessorstatus = {};
                    prop.accessorstatus.canget = true;
                    break;
                }
                case "setter": {
                    if (!prop.accessorstatus) prop.accessorstatus = {};
                    prop.accessorstatus.canset = true;
                    break;
                }
                case "field": {
                    break;
                }
            }

            props.set(ctx.name, prop);
        };
    }

    method(opts?: IMethodOpts<M>, cb?: (target: Function, ctx: ClassMethodDecoratorContext, info: MethodInfo<M>) => any) {
        return (target: Function, ctx: ClassMethodDecoratorContext) => {
            if (typeof ctx.name == "symbol") {
                throw new Error("decorator can not be used on a symbol");
            }

            const info = new MethodInfo(opts);
            if (cb) cb(target, ctx, info);

            const methods = this.scope(ctx).methods;
            methods.set(ctx.name, info);

            if (opts?.wrap) {
                const wrapped = opts.wrap(target);
                return function (this: any, ...args: any[]) {
                    return wrapped.apply(this, args);
                };
            }
        };
    }

    meta(cls: Function): Meta<C, P, M> {
        const ins = this.#metas.get(cls) || new Meta(this, cls);
        this.#metas.set(cls, ins);
        return ins;
    }
}


export class ContainerType {
    public readonly eletype: TypeValue;

    constructor(v: TypeValue) {
        this.eletype = v;
    }

    toString() {
        return `[${Object.getPrototypeOf(this).constructor.name} of ${inspect(this.eletype)}]`;
    }
}

export type TypeValue = ContainerType | Function;

export class ArrayType extends ContainerType { }

export class SetType extends ContainerType { }

export class MapType extends ContainerType {
    public readonly keytype: TypeValue;

    constructor(
        k: TypeValue,
        v: TypeValue,
    ) {
        super(v);
        this.keytype = k;
    }
}

export const containers = {
    array: (v: TypeValue) => new ArrayType(v),
    set: (v: TypeValue) => new SetType(v),
    map: (k: TypeValue, v: TypeValue) => new MapType(k, v),
};

type PropDecorator = (target: any, ctx: ClassGetterDecoratorContext | ClassSetterDecoratorContext | ClassFieldDecoratorContext | ClassAccessorDecoratorContext) => void;

interface IRegPropMethod<T extends object> {
    (opts?: IPropOpts<T>): PropDecorator;
    number(opts?: T): PropDecorator;
    string(opts?: T): PropDecorator;
    boolean(opts?: T): PropDecorator;

    numbers(opts?: T): PropDecorator;
    strings(opts?: T): PropDecorator;
    booleans(opts?: T): PropDecorator;
}

interface IWithType {
    key: keyof IRegPropMethod<{}> & string;
    type: TypeValue;
}

const WithTypes: IWithType[] = [
    {
        key: "number",
        type: Number,
    },
    {
        key: "string",
        type: String,
    },
    {
        key: "boolean",
        type: Boolean,
    },
    {
        key: "numbers",
        type: containers.array(Number),
    },
    {
        key: "strings",
        type: containers.array(String),
    },
    {
        key: "booleans",
        type: containers.array(Boolean),
    },
];

function applywithtypes<T extends {}>(reg: Register<any, T, any>) {
    for (const element of WithTypes) {
        // deno-lint-ignore no-inner-declarations
        function wrapper(opts?: T) {
            return reg.prop({ designtype: element.type, ...opts } as any);
        }
        Object.defineProperty(
            reg.prop,
            element.key,
            { value: wrapper.bind(reg), enumerable: false, writable: false, configurable: false }
        );
    }
}

export interface Register<
    C extends object,
    P extends object,
    M extends object,
> {
    prop: IRegPropMethod<P>;
}

export type IntKind = "int16" | "int32" | "int64" | "uint16" | "uint32" | "uint64" | "bigint";
