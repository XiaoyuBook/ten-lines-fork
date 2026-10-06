// Build WASM first, then run: node tests/frlgEggPickupGap.test.mjs
import assert from "node:assert/strict";
import createModule from "../src/tenLines/generated/index-combined.js";

const wasm = await createModule();
const seed = { initialSeed: 0x1234, seedTime: 100, settings: "test" };
const gap = (row) => row.pickupAdvances - row.heldAdvances;

function search({
    game = 8,
    method = 12,
    held = [1000, 1020],
    pickup = [2799, 2825],
    heldOffset = 0,
    pickupOffset = 0,
    minimumGap = -1,
    maxResults = 0,
    targetPid = -1,
} = {}) {
    const rows = [];
    const searching = [];
    wasm.check_seeds_frlg_egg(
        [seed], [seed], held, pickup, heldOffset, pickupOffset,
        game, 0, 0, method, 70,
        [Array(6).fill(31), Array(6).fill(31)], [0, 1], 1,
        255, -1, 255, 255, -1, Array.from({ length: 6 }, () => [0, 31]),
        maxResults, "test", "test", targetPid, minimumGap, true,
        (batch) => rows.push(...batch),
        () => {},
        (value) => searching.push(value),
    );
    assert.deepEqual(searching, [true, false]);
    return rows;
}

for (const game of [8, 16]) {
    for (const method of [11, 12, 13, 14]) {
        const options = { game, method };
        const baseline = search(options);
        assert(baseline.some((row) => gap(row) < 1800));
        assert(baseline.some((row) => gap(row) === 1800));
        assert(baseline.some((row) => gap(row) > 1800));

        const expected = baseline.filter((row) => gap(row) >= 1800);
        assert.deepEqual(search({ ...options, minimumGap: 1800 }), expected);
        assert.deepEqual(
            search({ ...options, minimumGap: 1800, maxResults: 1 }),
            expected.slice(0, 1),
            "Rejected rows must not consume the result limit",
        );
        assert.deepEqual(search({ ...options, minimumGap: 4294967295 }), []);

        const withOffsets = { ...options, heldOffset: 100, pickupOffset: 250 };
        assert.deepEqual(
            search({ ...withOffsets, minimumGap: 1800 }),
            search(withOffsets).filter((row) => gap(row) >= 1800),
            "The gap uses the displayed advances, not the generation/pickup offsets",
        );

        const boundary = expected.find((row) => gap(row) === 1800);
        const exact = {
            ...options,
            held: [boundary.heldAdvances, boundary.heldAdvances],
            pickup: [boundary.pickupAdvances, boundary.pickupAdvances],
        };
        assert.equal(search({ ...exact, minimumGap: 1800 }).length, 1);
        assert.equal(search({ ...exact, minimumGap: 1801 }).length, 0);

        const reversed = { ...options, held: [2800, 2820], pickup: [1000, 1020] };
        const earlierPickups = search(reversed);
        assert(earlierPickups.length > 0);
        assert(earlierPickups.every((row) => gap(row) < 0));
        assert.deepEqual(search({ ...reversed, minimumGap: 0 }), []);
        assert.deepEqual(search({ ...reversed, minimumGap: 1800 }), []);
        assert(
            search({ ...reversed, targetPid: earlierPickups[0].pid }).length > 0,
            "PID calibration must still allow independently restarted pickup runs",
        );
    }
}

console.log("Egg pickup gap: FireRed/LeafGreen, all four methods, boundaries, result cap and calibration passed.");
