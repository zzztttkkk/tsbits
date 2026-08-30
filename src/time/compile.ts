// dayjs
export const REGEX_FORMAT =
    /\[([^\]]+)]|YYYY|YY|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g;

export enum Kind {
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

export function compile(layout: string): (string | Kind)[] {
    const parts = [] as (string | Kind)[];
    let cur = 0;
    for (const match of layout.matchAll(REGEX_FORMAT)) {
        const index = match.index!;
        if (index > cur) {
            const text = layout.slice(cur, index);
            parts.push(text);
        }
        cur = index + match[0].length;
        if (match[0][0] === "[") {
            const text = match[1]!;
            parts.push(text);
            continue;
        }
        parts.push(Kind[match[0] as "MM"]);
    }
    if (cur < layout.length) {
        const text = layout.slice(cur);
        parts.push(text);
    }
    return parts;
}