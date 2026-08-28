export class SingleFlight<Args extends unknown[], T> {
    private store: Map<string, Promise<T>>;
    private worker: (...args: Args) => Promise<T>;
    private key: (...args: Args) => string;

    constructor(
        worker: (...args: Args) => Promise<T>,
        key: (...args: Args) => string,
    ) {
        this.store = new Map();
        this.worker = worker;
        this.key = key;
    }

    exec(...args: Args): Promise<T> {
        const key = this.key(...args);
        let ps = this.store.get(key);
        if (!ps) {
            const { promise, resolve, reject } = Promise.withResolvers<T>();
            this.store.set(key, promise);
            ps = promise;
            try {
                this.worker(...args).then(resolve, reject).finally(() => this.store.delete(key));
            } catch (e) {
                this.store.delete(key);
                throw e;
            }
        }
        return ps;
    }
}