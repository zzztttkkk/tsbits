let flag = false;

type Action = () => void | Promise<void>;

const actions = [] as { act: Action, order: number }[];

function BeforeShutdownAction(action: Action, order?: number): boolean {
    if (flag) return false;
    actions.push({ act: action, order: order ?? 0 });
    return true;
}

async function exec() {
    if (flag) return;
    flag = true;

    actions.sort((a, b) => a.order - b.order);

    const fas = [] as Action[];
    const sas = [] as Action[];
    const tas = [] as Action[];
    const las = [] as Action[];

    for (const action of actions) {
        if (action.order <= Order.First) {
            fas.push(action.act);
            continue;
        }
        if (action.order <= Order.Second) {
            sas.push(action.act);
            continue;
        }
        if (action.order <= Order.Third) {
            tas.push(action.act);
            continue;
        }
        las.push(action.act);
    }

    const frs = await Promise.allSettled(fas.map((a) => Promise.resolve(a())));
    const srs = await Promise.allSettled(sas.map((a) => Promise.resolve(a())));
    const trs = await Promise.allSettled(tas.map((a) => Promise.resolve(a())));
    const lrs = await Promise.allSettled(las.map((a) => Promise.resolve(a())));

    for (const element of [...frs, ...srs, ...trs, ...lrs]) {
        if (element.status == "rejected") {
            process.exit(1);
        }
    }
    process.exit(0);
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as Deno.Signal[]) {
    Deno.addSignalListener(sig, exec);
}

enum Order {
    First = 0,
    Second = 500,
    Third = 1000,
    Last = 9999,
}

Object.defineProperty(process, "BeforeShutdownAction", {
    value: BeforeShutdownAction,
    writable: false,
    configurable: false,
    enumerable: false,
});

Object.defineProperty(process, "Order", {
    value: Order,
    writable: false,
    configurable: false,
    enumerable: false,
});

Object.defineProperty(process, "dying", {
    configurable: false,
    enumerable: false,
    get() {
        return flag;
    },
});

declare global {
    namespace NodeJS {
        interface Process {
            dying: boolean;

            Order: typeof Order;

            BeforeShutdownAction: (action: Action, order?: Order | number) => boolean;
        }
    }
}