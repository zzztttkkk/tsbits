import { List } from "./list.ts";

Deno.test("List", () => {
    const list = new List<number>();

    list.pushr(list.mknode(1));
    list.pushr(list.mknode(2));

    for (const ele of list) {
        console.log(ele);
    }
});