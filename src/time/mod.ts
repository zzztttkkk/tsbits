
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
}
