import assert from "node:assert/strict";

import { createServer } from "vite";

type MessageListener = (event: {
    data: { error?: string; ready: boolean };
}) => void;

class FakeWorker {
    static instanceCount = 0;

    private readonly listeners = new Map<string, MessageListener>();

    constructor() {
        FakeWorker.instanceCount += 1;
        setTimeout(() => {
            this.listeners.get("message")?.({ data: { ready: true } });
        }, 0);
    }

    addEventListener(type: string, listener: MessageListener) {
        this.listeners.set(type, listener);
    }

    postMessage() {}
}

class FailingWorker {
    static instanceCount = 0;

    private readonly listeners = new Map<string, MessageListener>();

    constructor() {
        FailingWorker.instanceCount += 1;
        setTimeout(() => {
            this.listeners.get("message")?.({
                data: {
                    error: "WASM initialization failed",
                    ready: false,
                },
            });
        }, 0);
    }

    addEventListener(type: string, listener: MessageListener) {
        this.listeners.set(type, listener);
    }

    postMessage() {}
}

async function loadTenLinesWith(worker: typeof FakeWorker) {
    Object.defineProperty(globalThis, "Worker", {
        configurable: true,
        value: worker,
    });

    const server = await createServer({
        appType: "custom",
        server: { middlewareMode: true },
    });
    const module = await server.ssrLoadModule("/src/tenLines/index.ts");
    return { fetchTenLines: module.default, server };
}

const success = await loadTenLinesWith(FakeWorker);
try {
    const [first, second] = await Promise.all([
        success.fetchTenLines(),
        success.fetchTenLines(),
    ]);

    assert.equal(FakeWorker.instanceCount, 1);
    assert.equal(first, second);
} finally {
    await success.server.close();
}

const failure = await loadTenLinesWith(FailingWorker);
try {
    const getOutcome = () =>
        Promise.race([
            failure.fetchTenLines().then(
                () => "resolved",
                (error: Error) => `rejected:${error.message}`
            ),
            new Promise<string>((resolve) => {
                setTimeout(() => resolve("timeout"), 50);
            }),
        ]);

    assert.equal(
        await getOutcome(),
        "rejected:WASM initialization failed"
    );
    assert.equal(
        await getOutcome(),
        "rejected:WASM initialization failed"
    );
    assert.equal(FailingWorker.instanceCount, 2);
} finally {
    await failure.server.close();
}
