import { sleep } from "../utils/sleep.ts";
import { AsyncFileAppender } from "./appender.fs.ts";
import "../utils/mod.ts";
import dayjs from "dayjs";

if (!import.meta.main) {
    throw new Error("not main");
}

console.log("start", process.pid);

const fa = new AsyncFileAppender(
    "./test.log",
    { rotation: "minutely", bufsize: 4096 }
);

let i = 0;
while (i < 1000) {
    i++;
    await sleep(100);
    await fa.append(Date.now(), `[${dayjs().format("YYYY-MM-DD HH:mm:ss.SSS")}] test log ${i}\n`);
}