// Uses the real WASM search and the same item predictions as the result table.
import assert from "node:assert/strict";
import { createServer } from "vite";
import createModule from "../src/tenLines/generated/index-combined.js";

const wasm = await createModule();
const server = await createServer({
    appType: "custom",
    configFile: false,
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
});

try {
    const items = await server.ssrLoadModule("/src/utils/frlgHeldItems.ts");
    const seeds = [0x70f5, 0x70fe, 0x9234].map((initialSeed, index) => ({
        initialSeed, seedTime: 100 + index, settings: "test",
    }));
    function search({
        game = 8, category = 0, location, pokemon = 52, method = 5,
        range = [4000, 6500], offsets = [166, 167], itemFilter = -1,
        shiny = 255, trainerId = 0, secretId = 0, limit = 0,
        baseline = false, searchSeeds = seeds,
    } = {}) {
        const rows = [];
        const status = [];
        const callbacks = [
            (batch) => {
                assert(batch.length <= 100, "Cross-thread batches must stay bounded");
                rows.push(...batch);
            },
            (value) => status.push(value),
        ];
        const args = [
            searchSeeds, range, [0, 0], 0, game, trainerId, secretId,
            category, location, pokemon, method, 255, 255, -1, 255,
            Array.from({ length: 6 }, () => [0, 31]), shiny, limit,
        ];
        if (baseline) {
            wasm.check_seeds_wild_limited(...args, ...callbacks);
        } else {
            const slots = items.getFrlgHeldItemSlots(pokemon);
            wasm.check_seeds_wild_held_items(
                ...args, offsets, slots.common, slots.rare, itemFilter,
                ...callbacks,
            );
        }
        assert.deepEqual(status, [true, false]);
        return rows;
    }

    const tracks = [
        [170], [170, 171], [169, 170, 171],
        [169, 170, 171, 172], [169, 170, 171, 172, 173],
        [168, 169, 170, 171, 172],
    ];
    for (const game of [8, 16]) {
        for (const { category, locationId, pokemon } of [
            { category: 0, locationId: 91, pokemon: 52 },
            { category: 0, locationId: 20, pokemon: 113 },
            { category: 8, locationId: 20, pokemon: 148 },
        ]) {
            const location = wasm.get_wild_locations(game, category).indexOf(locationId);
            assert(location >= 0);
            for (const method of [5, 7, 8]) {
                const options = { game, category, location, pokemon, method };
                const baseline = search({ ...options, baseline: true });
                assert(baseline.length > 0);
                const rare = items.getFrlgHeldItemSlots(pokemon).rare;
                for (const offsets of tracks) {
                    for (const itemFilter of [-2, -1, rare]) {
                        const expected = baseline.filter((row) => items.matchesFrlgHeldItemSearchFilter(
                            items.predictFrlgHeldItemAtOffsets({
                                species: row.species, iv2EndSeed: row.iv2EndSeed, offsets,
                            }), itemFilter,
                        ));
                        assert.deepEqual(search({ ...options, offsets, itemFilter }), expected);
                        assert.deepEqual(
                            search({ ...options, offsets, itemFilter, limit: 1 }),
                            expected.slice(0, 1),
                            "The cap must count only rows passing every held-item track",
                        );
                    }
                }
                // Guarantee an actual shiny row instead of depending on chance.
                const trainerId = (baseline[0].pid >>> 16) ^ (baseline[0].pid & 0xffff);
                for (const shiny of [0, 1]) {
                    const shinyBaseline = search({ ...options, trainerId, shiny, baseline: true });
                    const offsets = [170];
                    const expected = shinyBaseline.filter((row) => items.matchesFrlgHeldItemSearchFilter(
                        items.predictFrlgHeldItemAtOffsets({
                            species: row.species, iv2EndSeed: row.iv2EndSeed, offsets,
                        }), -1,
                    ));
                    assert.deepEqual(search({ ...options, trainerId, shiny, offsets }), expected);
                }
            }
        }
    }

    const location = wasm.get_wild_locations(8, 0).indexOf(91);
    const options = { location, range: [1000, 10000] };
    const baseline = search({ ...options, baseline: true });
    const matches = search(options);
    assert(matches.length > 0);
    assert(matches[0].advances > baseline[0].advances,
        "The first rejected row must not stop a limited held-item search");
    assert.deepEqual(search({ ...options, limit: 1 }), matches.slice(0, 1));
    assert(baseline.length > 1000);
    assert.deepEqual(
        search({ ...options, itemFilter: -2, limit: 1000 }),
        baseline.slice(0, 1000),
        "The WASM cap remains exactly 1000 across chunk boundaries",
    );
    // Common/rare species must also preserve the distinction between a
    // specific common item and any held item, including a missing rare slot.
    for (const pokemon of [20, 46, 86]) {
        const locations = wasm.get_wild_locations(8, 0);
        const location = locations.findIndex((_id, index) =>
            wasm.get_area_species(8, 0, index).includes(pokemon));
        assert(location >= 0);
        const baseline = search({ location, pokemon, baseline: true });
        const slots = items.getFrlgHeldItemSlots(pokemon);
        for (const itemFilter of [-1, slots.common, slots.rare]) {
            const offsets = [166, 167];
            const expected = baseline.filter((row) => items.matchesFrlgHeldItemSearchFilter(
                items.predictFrlgHeldItemAtOffsets({
                    species: row.species, iv2EndSeed: row.iv2EndSeed, offsets,
                }), itemFilter,
            ));
            assert.deepEqual(search({ location, pokemon, offsets, itemFilter }), expected);
        }
    }
    console.log("Held-item frame range: FR/LG, grass/fishing, H1/H2/H4, all Offset tracks, shiny intersection and post-filter limits passed.");
} finally {
    await server.close();
}
