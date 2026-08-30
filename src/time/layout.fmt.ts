import { Kind } from "./compile.ts";
import { MONTH_LONG, MONTH_SHORT, WEEKDAY_LONG, WEEKDAY_MIN, WEEKDAY_SHORT } from "./consts.ts";
import type { ILayoutOptions, KindFmtFn, TimeValue } from "./layout.ts";

function getOffset(kind: Kind.Z | Kind.ZZ, time: TimeValue, opts?: ILayoutOptions): string {
    if (time instanceof Temporal.ZonedDateTime) {
        return kind === Kind.Z ? time.offset : time.offset.replace(":", "");
    }
    if (time instanceof Temporal.Instant) {
        const offset = time.toZonedDateTimeISO(opts?.TZ ?? Temporal.Now.timeZoneId()).offset
        return kind === Kind.Z ? offset : offset.replace(":", "");
    }
    throw new Error(`Z/ZZ can not apply for PlainDate/PlainDateTime`);
}

export function kind2fmt(kind: Kind): KindFmtFn {
    switch (kind) {
        case Kind.YYYY: {
            return tv => `${tv.year}`.padStart(4, "0");
        }
        case Kind.YY: {
            return tv => `${tv.year % 100}`.padStart(2, "0");
        }
        case Kind.M: {
            return tv => `${tv.month}`;
        }
        case Kind.MM: {
            return tv => `${tv.month}`.padStart(2, "0");
        }
        case Kind.MMM: {
            return (tv, _, opts) => (opts?.MONTH_SHORT ?? MONTH_SHORT)[tv.month - 1];
        }
        case Kind.MMMM: {
            return (tv, _, opts) => (opts?.MONTH_LONG ?? MONTH_LONG)[tv.month - 1];
        }
        case Kind.D: {
            return tv => `${tv.day}`;
        }
        case Kind.DD: {
            return tv => `${tv.day}`.padStart(2, "0");
        }
        case Kind.d: {
            return tv => `${tv.dayOfWeek % 7}`;
        }
        case Kind.dd: {
            return (tv, _, opts) => (opts?.WEEKDAY_MIN ?? WEEKDAY_MIN)[tv.dayOfWeek % 7];
        }
        case Kind.ddd: {
            return (tv, _, opts) => (opts?.WEEKDAY_SHORT ?? WEEKDAY_SHORT)[tv.dayOfWeek % 7];
        }
        case Kind.dddd: {
            return (tv, _, opts) => (opts?.WEEKDAY_LONG ?? WEEKDAY_LONG)[tv.dayOfWeek % 7];
        }
        case Kind.H: {
            return tv => `${tv.hour}`;
        }
        case Kind.HH: {
            return tv => `${tv.hour}`.padStart(2, "0");
        }
        case Kind.h: {
            return tv => `${tv.hour % 12 || 12}`;
        }
        case Kind.hh: {
            return tv => `${tv.hour % 12 || 12}`.padStart(2, "0");
        }
        case Kind.a: {
            return (tv, _, opts) => tv.hour < 12 ? (opts?.MERIDIEM?.am ?? "am") : (opts?.MERIDIEM?.pm ?? "pm");
        }
        case Kind.A: {
            return (tv, _, opts) => tv.hour < 12 ? (opts?.MERIDIEM?.AM ?? "AM") : (opts?.MERIDIEM?.PM ?? "PM");
        }
        case Kind.m: {
            return tv => `${tv.minute}`;
        }
        case Kind.mm: {
            return tv => `${tv.minute}`.padStart(2, "0");
        }
        case Kind.s: {
            return tv => `${tv.second}`;
        }
        case Kind.ss: {
            return tv => `${tv.second}`.padStart(2, "0");
        }
        case Kind.SSS: {
            return tv => `${tv.millisecond}`.padStart(3, "0");
        }
        case Kind.Z: {
            return (_, raw, opts) => getOffset(Kind.Z, raw, opts);
        }
        case Kind.ZZ: {
            return (_, raw, opts) => getOffset(Kind.ZZ, raw, opts);
        }
    }
}