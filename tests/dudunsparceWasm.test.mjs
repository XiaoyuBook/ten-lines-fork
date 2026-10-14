import assert from "node:assert/strict";
import createModule from "../src/tenLines/generated/index-combined.js";

const wasm = await createModule();
function search({ game, location, pokemon = 206, method, ivs, threeSegment = false,
    trainerId = 0, secretId = 0, shiny = 255, nature = -1, legacy = false }) {
    const rows = [];
    const status = [];
    const args = [
        game, trainerId, secretId, 0, location, pokemon, method,
        255, shiny, nature, 255, -1, ivs.map((iv) => [iv, iv]),
    ];
    const callbacks = [(batch) => rows.push(...batch), (value) => status.push(value)];
    if (legacy) {
        wasm.search_seeds_wild(...args, ...callbacks);
    } else {
        wasm.search_seeds_wild_filtered(...args, threeSegment, ...callbacks);
    }
    assert.deepEqual(status, [true, false]);
    return rows;
}

for (const game of [8, 16]) {
    const locations = wasm.get_wild_locations(game, 0);
    const location = locations.findIndex((_id, index) =>
        wasm.get_area_species(game, 0, index).includes(206));
    assert(location >= 0);
    for (const method of [5, 7, 8]) {
        const candidates = [];
        wasm.check_seeds_wild_limited(
            [{ initialSeed: 0x70f5, seedTime: 0, settings: "test" }],
            [0, 2000], [0, 0], 0, game, 0, 0, 0, location, 206,
            method, 255, 255, -1, 255, Array.from({ length: 6 }, () => [0, 31]),
            255, 0, (batch) => candidates.push(...batch), () => {},
        );
        const rare = candidates.find((row) => row.pid % 100 === 0);
        const ordinary = candidates.find((row) => row.pid % 100 !== 0);
        assert(rare && ordinary);
        for (const candidate of [rare, ordinary]) {
            for (const searchMethod of [method, 11]) {
                const options = { game, location, method: searchMethod, ivs: candidate.ivs };
                const baseline = search({ ...options, legacy: true });
                assert(baseline.some((row) => row.pid === candidate.pid));
                assert.deepEqual(search(options), baseline, "Disabled filtering must preserve legacy searches");
                const expected = baseline.filter((row) => row.pid % 100 === 0);
                assert.deepEqual(search({ ...options, threeSegment: true }), expected);
                assert(expected.every((row) => row.nature === 0 && row.ability === 0));
            }
        }
        const trainerId = (rare.pid >>> 16) ^ (rare.pid & 0xffff);
        const options = { game, location, method, ivs: rare.ivs, trainerId, shiny: 3 };
        const shinyBaseline = search({ ...options, legacy: true });
        assert(shinyBaseline.some((row) => row.pid === rare.pid && row.shiny !== 0));
        assert.deepEqual(
            search({ ...options, threeSegment: true }),
            shinyBaseline.filter((row) => row.pid % 100 === 0),
            "Three-segment filtering must intersect, not replace, shininess/IV filters",
        );
        assert.deepEqual(search({ ...options, nature: 1, threeSegment: true }), [],
            "Explicit incompatible Nature filters must not be silently overwritten");
    }
    const route5 = locations.indexOf(91);
    const options = { game, location: route5, pokemon: 52, method: 5, ivs: [9, 23, 8, 8, 17, 8] };
    assert.deepEqual(search({ ...options, threeSegment: true }), search({ ...options, legacy: true }),
        "A stale Dunsparce flag must not filter another species");
}
console.log("Three-Segment Dudunsparce WASM: FR/LG, H1/H2/H4/combined, legacy parity, shiny/IV/Nature intersection and other-species isolation passed.");
