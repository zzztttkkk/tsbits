type Constructor<T = object> = new (...args: any[]) => T;
export type AnyConstructor = Constructor;
type Mixin = (base: AnyConstructor) => AnyConstructor;

type UnionToIntersection<U> =
    [U] extends [never] ? unknown
    : (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

type SafeInstance<C extends AnyConstructor> =
    C extends any
    ? [InstanceType<C>] extends [never] ? unknown : InstanceType<C>
    : never;

type StaticsOf<C extends AnyConstructor> = C extends any ? Pick<C, keyof C> : never;
type MixedStatics<T extends AnyConstructor, M extends Mixin[]> =
    StaticsOf<T> & UnionToIntersection<StaticsOf<ReturnType<M[number]>>>;

type MixedInstance<T extends AnyConstructor, M extends Mixin[]> =
    InstanceType<T> & UnionToIntersection<SafeInstance<ReturnType<M[number]>>>;

type MixedClass<T extends AnyConstructor, M extends Mixin[]> = {
    new(...args: ConstructorParameters<T>): MixedInstance<T, M>;
} & MixedStatics<T, M>;


const mixinkey = Symbol("[[mixin]]");
const HasInstanceOverrides = new Set<Function>();

export function mixin<T extends AnyConstructor, M extends Mixin[]>(base: T, ...mixins: M): MixedClass<T, M> {
    const mixinset = new Set(Array.from((base as any)[mixinkey] ?? new Set<Function>()));
    const basename = base.name;

    let vcls: any = base;
    for (const mw of mixins) {
        mixinset.add(mw);
        vcls = mw(vcls);
    }

    for (const fnc of mixins) {
        if (HasInstanceOverrides.has(fnc)) {
            continue;
        }
        Object.defineProperty(
            fnc,
            Symbol.hasInstance, {
            value: function (v: object) {
                return isinstanceof(v, fnc);
            },
            writable: false,
            enumerable: false,
            configurable: true,
        });
        HasInstanceOverrides.add(fnc);
    }

    Object.defineProperty(
        vcls,
        mixinkey,
        {
            value: mixinset,
            writable: false,
            enumerable: false,
            configurable: true,
        }
    );

    Object.defineProperty(
        vcls,
        "name",
        {
            value: basename,
            writable: false,
            enumerable: false,
            configurable: true,
        }
    );
    return vcls;
}

function isinstanceof(v: object, cls: Function): boolean {
    if (v == null) return false;
    const ctor = Object.getPrototypeOf(v)?.constructor;
    if (!ctor) return false;
    const ms = ctor[mixinkey] as Set<Function> | undefined;
    if (!ms) return false;
    return ms.has(cls);
}