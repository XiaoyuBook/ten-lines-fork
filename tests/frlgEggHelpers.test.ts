import assert from "node:assert/strict";

import {
    EGG_GENDER_OPTIONS,
    FRLG_EGG_METHODS,
    buildSeedSettingKey,
    filterFrlgEggGameOptions,
    formatInheritanceSlot,
    isCompatibleEggParentPair,
    isFrlgEggGame,
} from "../src/components/frlgEggHelpers.ts";

assert.equal(isFrlgEggGame("fr"), true);
assert.equal(isFrlgEggGame("fr_jpn_1_0"), true);
assert.equal(isFrlgEggGame("lg_mgba"), true);
assert.equal(isFrlgEggGame("e_painting"), false);
assert.equal(isFrlgEggGame("r_painting"), false);

assert.deepEqual(
    filterFrlgEggGameOptions([
        { value: "fr", label: "FireRed" },
        { value: "e_painting", label: "Emerald painting" },
        { value: "lg_mgba", label: "LeafGreen mGBA" },
        { value: "r_painting", label: "Ruby painting" },
    ]),
    [
        { value: "fr", label: "FireRed" },
        { value: "lg_mgba", label: "LeafGreen mGBA" },
    ]
);

assert.equal(buildSeedSettingKey("mono", "a", "a"), "mono_a_a");
assert.equal(buildSeedSettingKey("stereo", "h", "start"), "stereo_h_start");

assert.equal(isCompatibleEggParentPair(0, 1), true);
assert.equal(isCompatibleEggParentPair(1, 0), true);
assert.equal(isCompatibleEggParentPair(3, 1), true);
assert.equal(isCompatibleEggParentPair(1, 3), true);
assert.equal(isCompatibleEggParentPair(0, 3), true);
assert.equal(isCompatibleEggParentPair(3, 0), true);
assert.equal(isCompatibleEggParentPair(2, 3), true);
assert.equal(isCompatibleEggParentPair(3, 2), true);
assert.equal(isCompatibleEggParentPair(0, 0), false);
assert.equal(isCompatibleEggParentPair(1, 1), false);
assert.equal(isCompatibleEggParentPair(2, 2), false);

assert.deepEqual(
    FRLG_EGG_METHODS.map((option: { value: number }) => option.value),
    [11, 12, 13, 14]
);
assert.deepEqual(FRLG_EGG_METHODS, [
    { value: 11, labelKey: "options.rsfrlgBred" },
    { value: 12, labelKey: "options.rsfrlgBredSplit" },
    { value: 13, labelKey: "options.rsfrlgBredAlternate" },
    { value: 14, labelKey: "options.rsfrlgBredMixed" },
]);
assert.deepEqual(
    EGG_GENDER_OPTIONS.map((option: { value: number }) => option.value),
    [0, 1, 2, 3]
);
assert.deepEqual(EGG_GENDER_OPTIONS, [
    { value: 0, labelKey: "options.male" },
    { value: 1, labelKey: "options.female" },
    { value: 2, labelKey: "options.genderless" },
    { value: 3, labelKey: "options.ditto" },
]);

assert.equal(formatInheritanceSlot(0), "");
assert.equal(formatInheritanceSlot(1), "A");
assert.equal(formatInheritanceSlot(2), "B");
