import { Kind, compile } from "./compile.ts";
import { kind2fmt } from "./layout.fmt.ts";

export interface ILayoutOptions {
    MONTH_SHORT?: [string, string, string, string, string, string, string, string, string, string, string, string];
    MONTH_LONG?: [string, string, string, string, string, string, string, string, string, string, string, string];
    WEEKDAY_SHORT?: [string, string, string, string, string, string, string];
    WEEKDAY_LONG?: [string, string, string, string, string, string, string];
    MERIDIEM?: {
        AM: string;
        PM: string;
        am: string;
        pm: string;
    };
    tz?: string;
}

export type TimeValue =
    | Temporal.Instant
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime;

export type KindFmtFn = (tv: Temporal.PlainDateTime, raw: TimeValue, opts?: ILayoutOptions) => string;

export class Layout {
    private parts!: (string | Kind)[];
    private opts?: ILayoutOptions;
    private _fmter?: (tv: TimeValue, opts?: ILayoutOptions) => string;

    constructor(layout: string, opts?: ILayoutOptions) {
        this.opts = opts;
        this.parts = compile(layout);
    }

    private makeformatter() {
        const fns = [] as KindFmtFn[];
        for (const ele of this.parts) {
            if (typeof ele === "string") {
                fns.push(() => ele);
                continue;
            }
            fns.push(kind2fmt(ele));
        }
        return (tv: TimeValue, opts?: ILayoutOptions): string => {
            opts = { ...this.opts, ...opts };
            const pdt = topdt(tv, opts);
            const result = [] as string[];
            for (const fn of fns) {
                result.push(fn(pdt, tv, opts));
            }
            return result.join("");
        }
    }

    get formatter() {
        if (this._fmter == null) {
            this._fmter = this.makeformatter()
        }
        return this._fmter!;
    }

    fmt(tv: TimeValue, opts?: ILayoutOptions): string {
        return this.formatter(tv, opts);
    }
}

function topdt(time: TimeValue, opts?: ILayoutOptions): Temporal.PlainDateTime {
    if (time instanceof Temporal.PlainDateTime) {
        return time;
    }
    if (time instanceof Temporal.Instant) {
        return time.toZonedDateTimeISO(opts?.tz ?? Temporal.Now.timeZoneId()).toPlainDateTime();
    }
    if (time instanceof Temporal.ZonedDateTime) {
        return time.toPlainDateTime();
    }
    return time.toPlainDateTime();
}

