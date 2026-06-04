import assert from "node:assert/strict";

import {
    buildBingoAdvanceRangePages,
    buildBingoAdvanceRanges,
    mergeBingoRows,
} from "../src/components/bingoHelpers.ts";

assert.deepEqual(buildBingoAdvanceRanges([1990, 2010], false), [
    [1990, 2010],
]);
assert.deepEqual(buildBingoAdvanceRanges([1990, 2010], true), [
    [1676, 1696],
    [1990, 2010],
    [2304, 2324],
]);
assert.deepEqual(buildBingoAdvanceRanges([10, 20], true), [
    [10, 20],
    [324, 334],
]);
assert.deepEqual(buildBingoAdvanceRangePages([1990, 2010], true), [
    { label: "-314", range: [1676, 1696] },
    { label: "0", range: [1990, 2010] },
    { label: "+314", range: [2304, 2324] },
]);
assert.deepEqual(buildBingoAdvanceRangePages([10, 20], true), [
    { label: "0", range: [10, 20] },
    { label: "+314", range: [324, 334] },
]);

assert.deepEqual(
    mergeBingoRows(
        [
            { initialSeed: 0x1000, advances: 100 },
            { initialSeed: 0x1000, advances: 101 },
        ],
        [
            { initialSeed: 0x1000, advances: 200 },
            { initialSeed: 0x2000, advances: 200 },
        ]
    ),
    [
        [
            { initialSeed: 0x1000, advances: 100 },
            { initialSeed: 0x1000, advances: 101 },
            { initialSeed: 0x1000, advances: 200 },
        ],
        [{ initialSeed: 0x2000, advances: 200 }],
    ]
);
