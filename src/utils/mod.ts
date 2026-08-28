import { Delegate } from "./delegate.ts";
import { List } from "./list.ts";
import { LRUMap } from "./lru.ts";
import { range } from "./range.ts";
import { collect, Counter, reportor } from "./reportor.ts";
import { sleep } from "./sleep.ts";
import "./process.ts";

export default {
    Delegate,
    List,
    LRUMap,
    range,
    sleep,
    reportor: {
        collect,
        reportor,
        Counter
    }
};