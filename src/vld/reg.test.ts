import { assert, assertEquals } from "@std/assert";
import { containers } from "../meta/mod.ts";
import { reg, schema, vld } from "./reg.ts";

function ok(label: string, x: unknown) {
    const e = vld(x);
    assert(e === null, `${label}: expected valid, got ${e?.message}`);
}

function bad(label: string, x: unknown, needle?: string) {
    const e = vld(x);
    assert(e instanceof Error, `${label}: expected invalid, got valid`);
    if (needle) {
        assert(
            e.message.includes(needle),
            `${label}: expected message containing "${needle}", got ${e.message}`,
        );
    }
}

Deno.test("nullable & required field", () => {
    class User {
        @reg.prop.string()
        name!: string;
        @reg.prop.string({ nullable: true })
        nick?: string;
    }

    bad("missing required", new User(), "missing required field, name");
    ok("with name", { name: "alice" } as unknown as User);
    ok("nullable absent", Object.assign(new User(), { name: "bob" }));
});

Deno.test("int min/max/enum/kind", () => {
    class Score {
        @reg.prop.number({ int: { min: 0, max: 100 } })
        v!: number;
    }
    ok("mid", Object.assign(new Score(), { v: 50 }));
    bad("too low", Object.assign(new Score(), { v: -1 }), "less than min");
    bad("too high", Object.assign(new Score(), { v: 101 }), "greater than max");
    bad("float", Object.assign(new Score(), { v: 1.5 }), "not an integer");
    bad("not number", Object.assign(new Score(), { v: "50" as unknown as number }), "not an integer");

    class U16 {
        @reg.prop.number({ int: { kind: "uint16" } })
        v!: number;
    }
    ok("max", Object.assign(new U16(), { v: 65535 }));
    bad("neg", Object.assign(new U16(), { v: -1 }), "out of range");
    bad("over", Object.assign(new U16(), { v: 65536 }), "out of range");

    class BigKind {
        @reg.prop.number({ int: { kind: "bigint" } })
        v!: bigint;
    }
    ok("bigint ok", Object.assign(new BigKind(), { v: 99n }));
    bad("bigint as number", Object.assign(new BigKind(), { v: 99 as unknown as bigint }), "expect bigint");

    class IntEnum {
        @reg.prop.number({ int: { enum: { 1: "a", 2: "b" } } })
        v!: number;
    }
    ok("enum in", Object.assign(new IntEnum(), { v: 1 }));
    bad("enum out", Object.assign(new IntEnum(), { v: 3 }), "not in enum");
});

Deno.test("string size/enum/pattern", () => {
    class Name {
        @reg.prop.string({ string: { size: [2, 4], pattern: /^[a-z]+$/ } })
        v!: string;
    }
    ok("ok", Object.assign(new Name(), { v: "ab" }));
    bad("too short", Object.assign(new Name(), { v: "a" }), "less than min");
    bad("too long", Object.assign(new Name(), { v: "abcde" }), "greater than max");
    bad("pattern", Object.assign(new Name(), { v: "ab1" }), "not match pattern");
    bad("not string", Object.assign(new Name(), { v: 123 as unknown as string }), "not a string");

    class StrEnum {
        @reg.prop.string({ string: { enum: { x: 1, y: 2 } } })
        v!: string;
    }
    ok("in", Object.assign(new StrEnum(), { v: "x" }));
    bad("out", Object.assign(new StrEnum(), { v: "z" }), "not in enum");
});

Deno.test("boolean", () => {
    class Flag {
        @reg.prop.boolean()
        b!: boolean;
    }
    ok("true", Object.assign(new Flag(), { b: true }));
    bad("not bool", Object.assign(new Flag(), { b: 1 as unknown as boolean }), "not a boolean");
});

Deno.test("container array/set/map", () => {
    class Tags {
        @reg.prop.numbers({ container: { size: [1, 3], mapele: { int: { min: 0 } } } })
        list!: number[];
    }
    ok("ok", Object.assign(new Tags(), { list: [1, 2] }));
    bad("empty", Object.assign(new Tags(), { list: [] }), "less than min");
    bad("too many", Object.assign(new Tags(), { list: [1, 2, 3, 4] }), "greater than max");
    bad("bad elem", Object.assign(new Tags(), { list: [1, -2] }), "less than min");

    class TagSet {
        @reg.prop({ designtype: containers.set(Number), container: { mapele: { int: { min: 0 } } } })
        s!: Set<number>;
    }
    ok("set ok", Object.assign(new TagSet(), { s: new Set([1, 2]) }));
    bad("set bad elem", Object.assign(new TagSet(), { s: new Set([1, -1]) }), "less than min");
    bad("not set", Object.assign(new TagSet(), { s: [1] as unknown as Set<number> }), "not a set");

    class KV {
        @reg.prop({ designtype: containers.map(Number, String), container: { size: [1, 2] } })
        m!: Map<number, string>;
    }
    ok("map ok", Object.assign(new KV(), { m: new Map([[1, "a"]]) }));
    bad("map empty", Object.assign(new KV(), { m: new Map() }), "less than min");
    bad("not map", Object.assign(new KV(), { m: {} as unknown as Map<number, string> }), "not a map");
});

Deno.test("nested object", () => {
    class Inner {
        @reg.prop.number({ int: { min: 0 } })
        x!: number;
    }
    class Outer {
        @reg.prop({ designtype: Inner })
        inner!: Inner;
    }
    ok("nested ok", Object.assign(new Outer(), { inner: Object.assign(new Inner(), { x: 5 }) }));
    bad("nested bad", Object.assign(new Outer(), { inner: Object.assign(new Inner(), { x: -1 }) }), "x:");
    bad("missing inner", new Outer(), "missing required field, inner");
});

Deno.test("custom vld fn", () => {
    class Answer {
        @reg.prop.number({ vld: (v) => v === 42 ? null : new Error("not 42") })
        a!: number;
    }
    ok("ok", Object.assign(new Answer(), { a: 42 }));
    bad("bad", Object.assign(new Answer(), { a: 7 }), "not 42");
});

Deno.test("undecorated & bad input", () => {
    class Plain { x = 1; }
    ok("plain", new Plain());
    bad("non-object", 123, "not object");
    bad("null", null, "null");
});

Deno.test("schema", () => {
    class User {
        @reg.prop.string()
        name!: string;
        @reg.prop.string({ nullable: true })
        nick?: string;
    }
    assertEquals(schema(User), {
        type: "object",
        properties: {
            name: { type: "string" },
            nick: { type: ["string", "null"] },
        },
        required: ["name"],
    });
    // instance resolves to the same schema as the class
    assertEquals(schema(new User()), schema(User));

    class Score {
        @reg.prop.number({ int: { min: 0, max: 100 } })
        v!: number;
    }
    assertEquals(schema(Score), {
        type: "object",
        properties: { v: { type: "integer", minimum: 0, maximum: 100 } },
        required: ["v"],
    });

    class U16 {
        @reg.prop.number({ int: { kind: "uint16", max: 10 } })
        v!: number;
    }
    // kind range intersected with explicit max
    assertEquals(schema(U16), {
        type: "object",
        properties: { v: { type: "integer", minimum: 0, maximum: 10 } },
        required: ["v"],
    });

    class Name {
        @reg.prop.string({ string: { size: [2, 4], pattern: /^[a-z]+$/ } })
        v!: string;
    }
    assertEquals(schema(Name), {
        type: "object",
        properties: { v: { type: "string", minLength: 2, maxLength: 4, pattern: "^[a-z]+$" } },
        required: ["v"],
    });

    class Tags {
        @reg.prop.numbers({ container: { size: [1, 3], mapele: { int: { min: 0 } } } })
        list!: number[];
    }
    assertEquals(schema(Tags), {
        type: "object",
        properties: {
            list: { type: "array", items: { type: "integer", minimum: 0 }, minItems: 1, maxItems: 3 },
        },
        required: ["list"],
    });

    class KV {
        @reg.prop({ designtype: containers.map(Number, String), container: { size: [1, 2] } })
        m!: Map<number, string>;
    }
    assertEquals(schema(KV), {
        type: "object",
        properties: {
            m: { type: "object", additionalProperties: { type: "string" }, minProperties: 1, maxProperties: 2 },
        },
        required: ["m"],
    });

    class Inner {
        @reg.prop.number({ int: { min: 0 } })
        x!: number;
    }
    class Outer {
        @reg.prop({ designtype: Inner, nullable: true })
        inner?: Inner;
    }
    assertEquals(schema(Outer), {
        type: "object",
        properties: {
            inner: {
                type: ["object", "null"],
                properties: { x: { type: "integer", minimum: 0 } },
                required: ["x"],
            },
        },
    });

    class Plain { x = 1; }
    assertEquals(schema(Plain), { type: "object" });
});
