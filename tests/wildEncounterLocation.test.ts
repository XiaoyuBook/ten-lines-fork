import assert from "node:assert/strict";

import { createServer } from "vite";

const server = await createServer({
    appType: "custom",
    server: { middlewareMode: true },
});

try {
    const {
        getWildLocationId,
        getWildLocationOptions,
        normalizeWildLocationIndex,
    } = await server.ssrLoadModule("/src/components/wildEncounterLocation.ts");

    const superRodLocations = [19, 20, 79, 120];

    assert.deepEqual(getWildLocationOptions(superRodLocations), [0, 1, 2, 3]);
    assert.equal(normalizeWildLocationIndex(superRodLocations, 1), 1);
    assert.equal(normalizeWildLocationIndex(superRodLocations, -1), 0);
    assert.equal(normalizeWildLocationIndex(superRodLocations, 4), 0);
    assert.equal(getWildLocationId(superRodLocations, 1), 20);
    assert.equal(getWildLocationId(superRodLocations, 2), 79);
} finally {
    await server.close();
}
