import { assertEquals } from "@std/assert/equals";
import { AnyConstructor, mixin } from "./mixin.ts";

function Jumpable(cls: AnyConstructor) {
    return class extends cls {
        public static jumpHeight = 100;

        jump() {
            return true;
        }
    }
}

function Duckable(cls: AnyConstructor) {
    return class extends cls {
        duck() {
            return true;
        }
    }
}

class Sprite {
    x = 0;
    y = 0;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

const MixinedSprite = mixin(Sprite, Jumpable, Duckable);

class AdvancedSprite extends MixinedSprite {
    constructor(x: number, y: number) {
        super(x, y);
    }
}

Deno.test("mixin", () => {
    const sprite = new MixinedSprite(1, 2);
    assertEquals(MixinedSprite.jumpHeight, 100);
    assertEquals(sprite.jump(), true);
    assertEquals(sprite.duck(), true);
    assertEquals(sprite instanceof Sprite, true);
    assertEquals(sprite instanceof MixinedSprite, true);
    assertEquals(sprite instanceof Jumpable, true);
    assertEquals(sprite instanceof Duckable, true);

    const adv = new AdvancedSprite(1, 2);
    assertEquals(adv instanceof Jumpable, true);
    assertEquals(adv instanceof Duckable, true);

    assertEquals((null as any) instanceof Jumpable, false);
});
