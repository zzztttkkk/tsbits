// dayjs
const REGEX_FORMAT =
    /\[([^\]]+)]|YYYY|YY|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g;

enum Kind {
    YYYY,
    YY,
    M,
    MM,
    MMM,
    MMMM,
    D,
    DD,
    d,
    dd,
    ddd,
    dddd,
    H,
    HH,
    h,
    hh,
    a,
    A,
    m,
    mm,
    s,
    ss,
    SSS,
    Z,
    ZZ
}

type TimeValue =
    | Temporal.Instant
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime;

type Formatter = (time: Temporal.PlainDateTime, raw: TimeValue) => string;

const MONTH_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_LONG = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_SHORT = [
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
];

const WEEKDAY_LONG = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
];

export interface IFmtOptions {
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

function pad2(v: number): string {
    return `${v}`.padStart(2, "0");
}

function pad3(v: number): string {
    return `${v}`.padStart(3, "0");
}

function getDateTime(time: TimeValue, opts?: IFmtOptions): Temporal.PlainDateTime {
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

function getOffset(kind: Kind.Z | Kind.ZZ, time: TimeValue, opts?: IFmtOptions): string {
    if (time instanceof Temporal.ZonedDateTime) {
        return kind === Kind.Z ? time.offset : time.offset.replace(":", "");
    }
    if (time instanceof Temporal.Instant) {
        const offset = time.toZonedDateTimeISO(opts?.tz ?? Temporal.Now.timeZoneId()).offset
        return kind === Kind.Z ? offset : offset.replace(":", "");
    }
    throw new Error(`Z/ZZ can not apply for PlainDate/PlainDateTime`);
}

export class Time {
    static unix(): number {
        return Math.floor(
            Temporal.Now.instant().epochMilliseconds / 1000,
        );
    }

    static unixms(): number {
        return Temporal.Now.instant().epochMilliseconds;
    }

    static unixns(): bigint {
        return Temporal.Now.instant().epochNanoseconds;
    }

    static now() {
        return Temporal.Now.instant();
    }

    static fmt(layout: string, opts?: IFmtOptions): (time: TimeValue) => string {
        const parts: Formatter[] = [];
        let cur = 0;
        for (const match of layout.matchAll(REGEX_FORMAT)) {
            const index = match.index!;
            if (index > cur) {
                const text = layout.slice(cur, index);
                parts.push(() => text);
            }
            cur = index + match[0].length;
            if (match[0][0] === "[") {
                const text = match[1]!;
                parts.push(() => text);
                continue;
            }
            parts.push(compile(tokenKind(match[0]), opts));
        }

        if (cur < layout.length) {
            const text = layout.slice(cur);
            parts.push(() => text);
        }

        return (time: TimeValue) => {
            const pdt = getDateTime(time, opts);
            let result = "";
            for (const part of parts) {
                result += part(pdt, time);
            }
            return result;
        };
    }
}

function tokenKind(token: string): Kind {
    return Kind[token as "MM"]
}

function compile(kind: Kind, opts?: IFmtOptions): Formatter {
    switch (kind) {
        case Kind.YYYY:
            return time => String(time.year);
        case Kind.YY:
            return time => pad2(time.year % 100);
        case Kind.M:
            return time => String(time.month);
        case Kind.MM:
            return time => pad2(time.month);
        case Kind.MMM:
            return time => (opts?.MONTH_SHORT ?? MONTH_SHORT)[time.month - 1];
        case Kind.MMMM:
            return time => (opts?.MONTH_LONG ?? MONTH_LONG)[time.month - 1];
        case Kind.D:
            return time => String(time.day);
        case Kind.DD:
            return time => pad2(time.day);
        case Kind.d:
            return time => String(time.dayOfWeek % 7);
        case Kind.dd:
            return time => (opts?.WEEKDAY_SHORT ?? WEEKDAY_SHORT)[time.dayOfWeek % 7].slice(0, 2);
        case Kind.ddd:
            return time => (opts?.WEEKDAY_SHORT ?? WEEKDAY_SHORT)[time.dayOfWeek % 7];
        case Kind.dddd:
            return time => (opts?.WEEKDAY_LONG ?? WEEKDAY_LONG)[time.dayOfWeek % 7];
        case Kind.H:
            return time => String(time.hour);
        case Kind.HH:
            return time => pad2(time.hour);
        case Kind.h: {
            return time => {
                const h = time.hour % 12 || 12;
                return String(h);
            };
        }
        case Kind.hh: {
            return time => {
                const h = time.hour % 12 || 12;
                return pad2(h);
            };
        }
        case Kind.a:
            return time => time.hour < 12 ? (opts?.MERIDIEM?.am ?? "am") : (opts?.MERIDIEM?.pm ?? "pm");
        case Kind.A:
            return time => time.hour < 12 ? (opts?.MERIDIEM?.AM ?? "AM") : (opts?.MERIDIEM?.PM ?? "PM");
        case Kind.m:
            return time => String(time.minute);
        case Kind.mm:
            return time => pad2(time.minute);
        case Kind.s:
            return time => String(time.second);
        case Kind.ss:
            return time => pad2(time.second);
        case Kind.SSS:
            return time => pad3(time.millisecond);
        case Kind.Z:
            return (_, raw) => getOffset(Kind.Z, raw, opts);
        case Kind.ZZ:
            return (_, raw) => getOffset(Kind.ZZ, raw, opts);
    }
}

