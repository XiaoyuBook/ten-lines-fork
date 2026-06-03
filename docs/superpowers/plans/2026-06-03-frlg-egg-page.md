# FRLG Egg Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated FireRed/LeafGreen Egg page that generates egg RNG results only from FRLG seed-library held and pickup seeds.

**Architecture:** Reuse ten-lines' existing React/Vite frontend, Comlink worker, generated FRLG seed binaries, and PokeFinderCore WASM build. Add a focused Egg page and a focused WASM binding that accepts two library-derived seed lists, builds PokeFinder `Daycare`, `Profile3`, and `StateFilter` objects, then calls `EggGenerator3` for held/pickup seed pairs.

**Tech Stack:** React 19, TypeScript, MUI, Vite, Comlink, Emscripten embind, CMake/Ninja, PokeFinderCore Gen 3 egg generator.

---

## File Structure

- Create: `tests/frlgEggHelpers.test.ts`
  - Focused executable test for pure frontend helper behavior.
- Create: `src/components/frlgEggHelpers.ts`
  - FRLG-only game filtering, egg methods, seed setting key construction, parent compatibility, and inheritance display helpers.
- Create: `src/components/EggParentSettings.tsx`
  - Reusable parent A/B IV and gender input panel.
- Create: `src/components/EggTable.tsx`
  - Result table for held/pickup seed metadata and generated egg state fields.
- Create: `src/components/EggForm.tsx`
  - Egg page form, seed list loading, validation, WASM call, and result collection.
- Modify: `src/App.tsx`
  - Add the Egg tab and render `EggForm`.
- Modify: `src/i18n.tsx`
  - Add Egg page labels, options, messages, and table headers in English and Chinese.
- Modify: `src/tenLines/generated.d.ts`
  - Add `ExtendedEggGeneratorState` and `check_seeds_frlg_egg`.
- Modify: `src/wasm/src/pokefinder_glue.hpp`
  - Add `ExtendedEggGeneratorState` C++ data wrapper.
- Modify: `src/wasm/src/pokefinder_glue.cpp`
  - Bind `ExtendedEggGeneratorState` fields to JavaScript.
- Create: `src/wasm/src/egg.cpp`
  - Add `check_seeds_frlg_egg(...)` WASM binding.
- Modify: `src/wasm/CMakeLists.txt`
  - Compile `src/egg.cpp`.

## Task 1: Prepare Implementation Workspace

**Files:**
- Verify: `src/wasm/lib/PokeFinder`
- Verify: `src/wasm/lib/PokeFinder/Source/Core/Gen3/Generators/EggGenerator3.hpp`
- Verify: `src/wasm/lib/PokeFinder/Source/Core/Gen3/Generators/EggGenerator3.cpp`

- [ ] **Step 1: Initialize the PokeFinder submodule**

Run from `C:\Users\axenx\Documents\frlg egg search\ten-lines-fork`:

```powershell
git submodule update --init --recursive
```

Expected: `src/wasm/lib/PokeFinder/Source/Core` exists.

- [ ] **Step 2: Verify the Gen 3 egg generator is available**

Run:

```powershell
Test-Path -LiteralPath 'src\wasm\lib\PokeFinder\Source\Core\Gen3\Generators\EggGenerator3.hpp'
Test-Path -LiteralPath 'src\wasm\lib\PokeFinder\Source\Core\Gen3\Generators\EggGenerator3.cpp'
```

Expected:

```text
True
True
```

- [ ] **Step 3: Install JavaScript dependencies if needed**

Run:

```powershell
if (-not (Test-Path -LiteralPath 'node_modules')) { npm.cmd install }
```

Expected: if dependencies are missing, `npm` installs from `package-lock.json`; otherwise no install runs.

## Task 2: Add Pure FRLG Egg Helpers

**Files:**
- Create: `tests/frlgEggHelpers.test.ts`
- Create: `src/components/frlgEggHelpers.ts`

- [ ] **Step 1: Write the failing helper test**

Create `tests/frlgEggHelpers.test.ts`:

```ts
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
        { value: "r_painting", label: "Ruby" },
        { value: "fr", label: "FireRed" },
        { value: "lg_nx", label: "Switch LeafGreen" },
    ]),
    [
        { value: "fr", label: "FireRed" },
        { value: "lg_nx", label: "Switch LeafGreen" },
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
    FRLG_EGG_METHODS.map((method) => method.value),
    [11, 12, 13, 14]
);
assert.deepEqual(
    EGG_GENDER_OPTIONS.map((gender) => gender.value),
    [0, 1, 2, 3]
);

assert.equal(formatInheritanceSlot(0), "");
assert.equal(formatInheritanceSlot(1), "A");
assert.equal(formatInheritanceSlot(2), "B");
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```powershell
node tests/frlgEggHelpers.test.ts
```

Expected: FAIL because `src/components/frlgEggHelpers.ts` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/components/frlgEggHelpers.ts`:

```ts
export type GameOption = {
    value: string;
    label: string;
};

export type EggMethodOption = {
    value: number;
    labelKey: string;
};

export type EggGenderOption = {
    value: number;
    labelKey: string;
};

export const FRLG_EGG_METHODS: EggMethodOption[] = [
    { value: 11, labelKey: "options.rsfrlgBred" },
    { value: 12, labelKey: "options.rsfrlgBredSplit" },
    { value: 13, labelKey: "options.rsfrlgBredAlternate" },
    { value: 14, labelKey: "options.rsfrlgBredMixed" },
];

export const EGG_GENDER_OPTIONS: EggGenderOption[] = [
    { value: 0, labelKey: "options.male" },
    { value: 1, labelKey: "options.female" },
    { value: 2, labelKey: "options.genderless" },
    { value: 3, labelKey: "options.ditto" },
];

export const isFrlgEggGame = (game: string) =>
    game.startsWith("fr") || game.startsWith("lg");

export const filterFrlgEggGameOptions = (options: GameOption[]) =>
    options.filter((option) => isFrlgEggGame(option.value));

export const buildSeedSettingKey = (
    sound: string,
    buttonMode: string,
    seedButton: string
) => `${sound}_${buttonMode}_${seedButton}`;

export const isCompatibleEggParentPair = (
    parentAGender: number,
    parentBGender: number
) => {
    if (parentAGender === 0 && parentBGender === 1) return true;
    if (parentAGender === 1 && parentBGender === 0) return true;
    if (parentAGender === 3 && parentBGender === 1) return true;
    if (parentAGender === 1 && parentBGender === 3) return true;
    if (parentAGender === 0 && parentBGender === 3) return true;
    if (parentAGender === 3 && parentBGender === 0) return true;
    if (parentAGender === 2 && parentBGender === 3) return true;
    if (parentAGender === 3 && parentBGender === 2) return true;
    return false;
};

export const formatInheritanceSlot = (value: number) => {
    if (value === 1) return "A";
    if (value === 2) return "B";
    return "";
};
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```powershell
node tests/frlgEggHelpers.test.ts
```

Expected: PASS with exit code 0.

- [ ] **Step 5: Commit the helper**

Run:

```powershell
git add tests/frlgEggHelpers.test.ts src/components/frlgEggHelpers.ts
git commit -m "feat: add frlg egg helpers"
```

Expected: commit succeeds.

## Task 3: Add Egg WASM Result Type And Binding

**Files:**
- Modify: `src/wasm/src/pokefinder_glue.hpp`
- Modify: `src/wasm/src/pokefinder_glue.cpp`
- Modify: `src/tenLines/generated.d.ts`

- [ ] **Step 1: Add the C++ result wrapper**

In `src/wasm/src/pokefinder_glue.hpp`, add includes:

```cpp
#include <Core/Gen3/States/EggState3.hpp>
#include <string>
```

Add this class after `ExtendedWildGeneratorState`:

```cpp
class ExtendedEggGeneratorState {
public:
    ExtendedEggGeneratorState(
        u16 held_initial_seed,
        u32 held_seed_time,
        std::string held_settings,
        u16 pickup_initial_seed,
        u32 pickup_seed_time,
        std::string pickup_settings,
        const EggState3& state)
        : heldInitialSeed(held_initial_seed)
        , heldSeedTime(held_seed_time)
        , heldSettings(std::move(held_settings))
        , pickupInitialSeed(pickup_initial_seed)
        , pickupSeedTime(pickup_seed_time)
        , pickupSettings(std::move(pickup_settings))
        , heldAdvances(state.getAdvances())
        , pickupAdvances(state.getPickupAdvances())
        , pid(state.getPID())
        , nature(state.getNature())
        , ability(state.getAbility())
        , abilityIndex(state.getAbilityIndex())
        , gender(state.getGender())
        , ivs(state.getIVs())
        , stats(state.getStats())
        , shiny(state.getShiny())
        , hiddenPower(state.getHiddenPower())
        , hiddenPowerStrength(state.getHiddenPowerStrength())
        , inheritance(state.getInheritance())
    {
    }

    u16 heldInitialSeed;
    u32 heldSeedTime;
    std::string heldSettings;
    u16 pickupInitialSeed;
    u32 pickupSeedTime;
    std::string pickupSettings;
    u32 heldAdvances;
    u32 pickupAdvances;
    u32 pid;
    u8 nature;
    u8 ability;
    u16 abilityIndex;
    u8 gender;
    std::array<u8, 6> ivs;
    std::array<u16, 6> stats;
    u8 shiny;
    u8 hiddenPower;
    u8 hiddenPowerStrength;
    std::array<u8, 6> inheritance;
};
```

- [ ] **Step 2: Bind the C++ result wrapper**

In `src/wasm/src/pokefinder_glue.cpp`, add this binding after `ExtendedWildGeneratorState`:

```cpp
    emscripten::value_immutable_unconstructable<ExtendedEggGeneratorState>("ExtendedEggGeneratorState")
        .field("heldInitialSeed", &ExtendedEggGeneratorState::heldInitialSeed)
        .field("heldSeedTime", &ExtendedEggGeneratorState::heldSeedTime)
        .field("heldSettings", &ExtendedEggGeneratorState::heldSettings)
        .field("pickupInitialSeed", &ExtendedEggGeneratorState::pickupInitialSeed)
        .field("pickupSeedTime", &ExtendedEggGeneratorState::pickupSeedTime)
        .field("pickupSettings", &ExtendedEggGeneratorState::pickupSettings)
        .field("heldAdvances", &ExtendedEggGeneratorState::heldAdvances)
        .field("pickupAdvances", &ExtendedEggGeneratorState::pickupAdvances)
        .field("pid", &ExtendedEggGeneratorState::pid)
        .field("nature", &ExtendedEggGeneratorState::nature)
        .field("ability", &ExtendedEggGeneratorState::ability)
        .field("abilityIndex", &ExtendedEggGeneratorState::abilityIndex)
        .field("gender", &ExtendedEggGeneratorState::gender)
        .field("ivs", &ExtendedEggGeneratorState::ivs)
        .field("stats", &ExtendedEggGeneratorState::stats)
        .field("shiny", &ExtendedEggGeneratorState::shiny)
        .field("hiddenPower", &ExtendedEggGeneratorState::hiddenPower)
        .field("hiddenPowerStrength", &ExtendedEggGeneratorState::hiddenPowerStrength)
        .field("inheritance", &ExtendedEggGeneratorState::inheritance);
```

- [ ] **Step 3: Add the TypeScript declaration**

In `src/tenLines/generated.d.ts`, add:

```ts
export interface ExtendedEggGeneratorState {
    heldInitialSeed: number;
    heldSeedTime: number;
    heldSettings: string;
    pickupInitialSeed: number;
    pickupSeedTime: number;
    pickupSettings: string;
    heldAdvances: number;
    pickupAdvances: number;
    pid: number;
    nature: number;
    ability: number;
    abilityIndex: number;
    gender: number;
    ivs: [number, number, number, number, number, number];
    stats: [number, number, number, number, number, number];
    shiny: number;
    hiddenPower: number;
    hiddenPowerStrength: number;
    inheritance: [number, number, number, number, number, number];
    [key: string]: any;
}
```

In `MainModule`, add:

```ts
    check_seeds_frlg_egg: (...args: any[]) => any;
```

- [ ] **Step 4: Run TypeScript build**

Run:

```powershell
npm.cmd exec -- tsc -b
```

Expected: exit code 0.

- [ ] **Step 5: Commit the result type**

Run:

```powershell
git add src/wasm/src/pokefinder_glue.hpp src/wasm/src/pokefinder_glue.cpp src/tenLines/generated.d.ts
git commit -m "feat: add frlg egg wasm result type"
```

Expected: commit succeeds.

## Task 4: Implement FRLG Egg WASM Search

**Files:**
- Create: `src/wasm/src/egg.cpp`
- Modify: `src/wasm/CMakeLists.txt`

- [ ] **Step 1: Create the WASM egg binding**

Create `src/wasm/src/egg.cpp`:

```cpp
#include "initial_seed.hpp"
#include "pokefinder_glue.hpp"
#include "util.hpp"
#include <Core/Enum/Game.hpp>
#include <Core/Enum/Method.hpp>
#include <Core/Gen3/Generators/EggGenerator3.hpp>
#include <Core/Gen3/Profile3.hpp>
#include <Core/Parents/Daycare.hpp>
#include <Core/Parents/Filters/StateFilter.hpp>
#include <array>
#include <emscripten.h>
#include <emscripten/bind.h>

namespace
{
    constexpr u32 RESULT_BATCH_SIZE = 100;

    std::array<u8, 6> build_iv_row(emscripten::typed_array<u8> row)
    {
        return {
            row[0],
            row[1],
            row[2],
            row[3],
            row[4],
            row[5],
        };
    }

    std::array<std::array<u8, 6>, 2> build_parent_ivs(emscripten::typed_array<emscripten::typed_array<u8>> parent_ivs)
    {
        return {
            build_iv_row(parent_ivs[0]),
            build_iv_row(parent_ivs[1]),
        };
    }

    StateFilter build_egg_filter(
        u8 shininess,
        int nature,
        u8 gender,
        u8 ability,
        int hidden_power,
        emscripten::typed_array<emscripten::typed_range<u8>> iv_ranges)
    {
        std::array<u8, 6> min_ivs = {
            iv_ranges[0].min(),
            iv_ranges[1].min(),
            iv_ranges[2].min(),
            iv_ranges[3].min(),
            iv_ranges[4].min(),
            iv_ranges[5].min(),
        };
        std::array<u8, 6> max_ivs = {
            iv_ranges[0].max(),
            iv_ranges[1].max(),
            iv_ranges[2].max(),
            iv_ranges[3].max(),
            iv_ranges[4].max(),
            iv_ranges[5].max(),
        };

        std::array<bool, 25> natures;
        natures.fill(true);
        if (nature != -1) {
            natures.fill(false);
            natures[nature] = true;
        }

        std::array<bool, 16> powers;
        powers.fill(true);
        if (hidden_power != -1) {
            powers.fill(false);
            powers[hidden_power] = true;
        }

        return StateFilter(gender, ability, shininess, 0, 255, 0, 255, false, min_ivs, max_ivs, natures, powers);
    }
}

void check_seeds_frlg_egg(
    emscripten::typed_array<FRLGContiguousSeedEntry> held_seeds,
    emscripten::typed_array<FRLGContiguousSeedEntry> pickup_seeds,
    emscripten::typed_range<u32> held_advances_range,
    emscripten::typed_range<u32> pickup_advances_range,
    u32 held_offset,
    u32 pickup_offset,
    Game game,
    u16 trainer_id,
    u16 secret_id,
    Method method,
    u8 compatibility,
    emscripten::typed_array<emscripten::typed_array<u8>> parent_ivs_input,
    emscripten::typed_array<u8> parent_genders_input,
    u16 egg_species,
    u8 shininess,
    int nature,
    u8 gender,
    u8 ability,
    int hidden_power,
    emscripten::typed_array<emscripten::typed_range<u8>> iv_ranges,
    u32 max_results,
    std::string held_settings,
    std::string pickup_settings,
    emscripten::callback<void(emscripten::typed_array<ExtendedEggGeneratorState>)> result_callback,
    emscripten::callback<void(bool)> searching_callback)
{
    searching_callback(true);

    std::array<std::array<u8, 6>, 2> parent_ivs = build_parent_ivs(parent_ivs_input);
    std::array<u8, 2> parent_ability = { 0, 0 };
    std::array<u8, 2> parent_gender = { parent_genders_input[0], parent_genders_input[1] };
    std::array<u8, 2> parent_item = { 0, 0 };
    std::array<u8, 2> parent_nature = { 0, 0 };

    Daycare daycare(parent_ivs, parent_ability, parent_gender, parent_item, parent_nature, egg_species, false);
    Profile3 profile("", game, trainer_id, secret_id, false);
    StateFilter filter = build_egg_filter(shininess, nature, gender, ability, hidden_power, iv_ranges);

    u32 held_initial_advances = held_advances_range.min();
    u32 held_max_advances = held_advances_range.max() - held_advances_range.min();
    u32 pickup_initial_advances = pickup_advances_range.min();
    u32 pickup_max_advances = pickup_advances_range.max() - pickup_advances_range.min();

    u32 result_count = 0;
    emscripten::typed_array<ExtendedEggGeneratorState> batch;

    for (int held_index = 0; held_index < held_seeds.size(); held_index++) {
        FRLGContiguousSeedEntry held_entry = held_seeds[held_index];

        for (int pickup_index = 0; pickup_index < pickup_seeds.size(); pickup_index++) {
            FRLGContiguousSeedEntry pickup_entry = pickup_seeds[pickup_index];

            EggGenerator3 generator(
                held_initial_advances,
                held_max_advances,
                held_offset,
                pickup_initial_advances,
                pickup_max_advances,
                pickup_offset,
                0,
                0,
                0,
                method,
                compatibility,
                daycare,
                profile,
                filter);

            auto states = generator.generate(held_entry.initialSeed, pickup_entry.initialSeed);
            for (const auto& state : states) {
                batch.push_back(ExtendedEggGeneratorState(
                    held_entry.initialSeed,
                    held_entry.seedTime,
                    held_settings,
                    pickup_entry.initialSeed,
                    pickup_entry.seedTime,
                    pickup_settings,
                    state));
                result_count++;

                if (batch.size() >= RESULT_BATCH_SIZE) {
                    result_callback(batch);
                    batch = emscripten::typed_array<ExtendedEggGeneratorState>();
                }

                if (max_results > 0 && result_count >= max_results) {
                    if (batch.size() > 0) {
                        result_callback(batch);
                    }
                    searching_callback(false);
                    return;
                }
            }
        }
    }

    if (batch.size() > 0) {
        result_callback(batch);
    }
    searching_callback(false);
}

EMSCRIPTEN_BINDINGS(egg)
{
    emscripten::smart_function("check_seeds_frlg_egg", &check_seeds_frlg_egg);
}
```

- [ ] **Step 2: Add egg.cpp to the WASM build**

In `src/wasm/CMakeLists.txt`, add `src/egg.cpp` to `add_executable(ten_lines ...)`:

```cmake
    src/egg.cpp
```

- [ ] **Step 3: Run the WASM build**

Run:

```powershell
npm.cmd run build-wasm
```

Expected: exit code 0 and `src/tenLines/generated/index.js` updates.

- [ ] **Step 4: Commit the WASM egg search**

Run:

```powershell
git add src/wasm/src/egg.cpp src/wasm/CMakeLists.txt src/tenLines/generated/index.d.ts src/tenLines/generated/index.js
git commit -m "feat: add frlg egg wasm search"
```

Expected: commit succeeds. If the generated files are ignored or unchanged, commit only the tracked files that changed.

## Task 5: Add Egg UI Translations

**Files:**
- Modify: `src/i18n.tsx`

- [ ] **Step 1: Add English translation keys**

In the English `tabs` block, add:

```ts
            egg: "Egg",
```

In the English `labels` block, add:

```ts
            heldSeedSettings: "Held Seed Settings",
            pickupSeedSettings: "Pickup Seed Settings",
            eggSettings: "Egg Settings",
            heldAdvances: "Held Advances",
            pickupAdvances: "Pickup Advances",
            heldOffset: "Held Offset",
            pickupOffset: "Pickup Offset",
            compatibility: "Compatibility",
            parentA: "Parent A",
            parentB: "Parent B",
            eggSpecies: "Egg Species",
            ability: "Ability",
```

In the English `options` block, add:

```ts
            rsfrlgBred: "RS/FRLG Bred",
            rsfrlgBredSplit: "RS/FRLG Bred Split",
            rsfrlgBredAlternate: "RS/FRLG Bred Alternate",
            rsfrlgBredMixed: "RS/FRLG Bred Mixed",
            male: "Male",
            female: "Female",
            genderless: "Genderless",
            ditto: "Ditto",
```

In the English `table` block, add:

```ts
            heldSeed: "Held Seed",
            heldSettings: "Held Settings",
            heldSeedTime: "Held Seed Time",
            pickupSeed: "Pickup Seed",
            pickupSettings: "Pickup Settings",
            pickupSeedTime: "Pickup Seed Time",
            heldAdvances: "Held Advances",
            pickupAdvances: "Pickup Advances",
            inheritance: "Inheritance",
```

In the English `messages` block, add:

```ts
            incompatibleEggParents: "The selected parent genders are not compatible for breeding.",
            noHeldEggSeeds: "No known held-egg seeds for the selected settings.",
            noPickupEggSeeds: "No known pickup seeds for the selected settings.",
            eggResultsCapHit: "Result limit reached. Narrow the seed settings or filters for more specific results.",
```

- [ ] **Step 2: Add Chinese translation keys**

In the Chinese `tabs` block, add:

```ts
            egg: "\u5b75\u5316",
```

In the Chinese `labels` block, add:

```ts
            heldSeedSettings: "\u6301\u6709\u86cb Seed \u8bbe\u7f6e",
            pickupSeedSettings: "\u9886\u86cb Seed \u8bbe\u7f6e",
            eggSettings: "\u5b75\u5316\u8bbe\u7f6e",
            heldAdvances: "\u6301\u6709\u86cb Advances",
            pickupAdvances: "\u9886\u86cb Advances",
            heldOffset: "\u6301\u6709\u86cb Offset",
            pickupOffset: "\u9886\u86cb Offset",
            compatibility: "\u4eb2\u5bc6\u5ea6",
            parentA: "\u7236\u6bcd A",
            parentB: "\u7236\u6bcd B",
            eggSpecies: "\u86cb\u79cd\u7c7b",
            ability: "\u7279\u6027",
```

In the Chinese `options` block, add:

```ts
            rsfrlgBred: "RS/FRLG \u5b75\u5316",
            rsfrlgBredSplit: "RS/FRLG \u5b75\u5316 Split",
            rsfrlgBredAlternate: "RS/FRLG \u5b75\u5316 Alternate",
            rsfrlgBredMixed: "RS/FRLG \u5b75\u5316 Mixed",
            male: "\u2642",
            female: "\u2640",
            genderless: "\u65e0\u6027\u522b",
            ditto: "\u767e\u53d8\u602a",
```

In the Chinese `table` block, add:

```ts
            heldSeed: "\u6301\u6709\u86cb Seed",
            heldSettings: "\u6301\u6709\u86cb\u8bbe\u7f6e",
            heldSeedTime: "\u6301\u6709\u86cb Seed \u65f6\u95f4",
            pickupSeed: "\u9886\u86cb Seed",
            pickupSettings: "\u9886\u86cb\u8bbe\u7f6e",
            pickupSeedTime: "\u9886\u86cb Seed \u65f6\u95f4",
            heldAdvances: "\u6301\u6709\u86cb Advances",
            pickupAdvances: "\u9886\u86cb Advances",
            inheritance: "\u9057\u4f20",
```

In the Chinese `messages` block, add:

```ts
            incompatibleEggParents: "\u6240\u9009\u7236\u6bcd\u6027\u522b\u65e0\u6cd5\u914d\u79cd\u3002",
            noHeldEggSeeds: "\u6240\u9009\u6301\u6709\u86cb\u8bbe\u7f6e\u4e0b\u6ca1\u6709\u5df2\u77e5 Seed\u3002",
            noPickupEggSeeds: "\u6240\u9009\u9886\u86cb\u8bbe\u7f6e\u4e0b\u6ca1\u6709\u5df2\u77e5 Seed\u3002",
            eggResultsCapHit: "\u7ed3\u679c\u5df2\u8fbe\u5230\u4e0a\u9650\u3002\u8bf7\u7f29\u5c0f Seed \u8bbe\u7f6e\u6216\u7b5b\u9009\u6761\u4ef6\u3002",
```

- [ ] **Step 3: Run TypeScript build**

Run:

```powershell
npm.cmd exec -- tsc -b
```

Expected: exit code 0.

- [ ] **Step 4: Commit translations**

Run:

```powershell
git add src/i18n.tsx
git commit -m "feat: add frlg egg translations"
```

Expected: commit succeeds.

## Task 6: Add Parent Settings Component

**Files:**
- Create: `src/components/EggParentSettings.tsx`

- [ ] **Step 1: Create the parent settings component**

Create `src/components/EggParentSettings.tsx`:

```tsx
import { Box, MenuItem, TextField, Typography } from "@mui/material";

import NumericalInput from "./NumericalInput";
import { EGG_GENDER_OPTIONS } from "./frlgEggHelpers";
import { useI18n } from "../i18n";

export type EggParentState = {
    ivs: [string, string, string, string, string, string];
    gender: string;
};

const STAT_KEYS = [
    "stats.hp",
    "stats.attack",
    "stats.defense",
    "stats.specialAttack",
    "stats.specialDefense",
    "stats.speed",
] as const;

export default function EggParentSettings({
    label,
    value,
    onChange,
    onValidityChange,
}: {
    label: string;
    value: EggParentState;
    onChange: (value: EggParentState) => void;
    onValidityChange: (isValid: boolean) => void;
}) {
    const { t } = useI18n();

    const setIv = (index: number, nextValue: string, isValid: boolean) => {
        const nextIvs = [...value.ivs] as EggParentState["ivs"];
        nextIvs[index] = nextValue;
        onChange({ ...value, ivs: nextIvs });
        onValidityChange(isValid && nextIvs.every((entry) => entry !== ""));
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6">{label}</Typography>
            <Box
                sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: {
                        xs: "1fr 1fr",
                        sm: "repeat(3, 1fr)",
                        md: "repeat(6, 1fr)",
                    },
                }}
            >
                {STAT_KEYS.map((statKey, index) => (
                    <NumericalInput
                        key={statKey}
                        label={t(statKey)}
                        name={`${label}-${statKey}`}
                        value={value.ivs[index]}
                        minimumValue={0}
                        maximumValue={31}
                        onChange={(_, next) => setIv(index, next.value, next.isValid)}
                    />
                ))}
            </Box>
            <TextField
                label={t("labels.gender")}
                margin="normal"
                value={value.gender}
                onChange={(event) =>
                    onChange({ ...value, gender: event.target.value })
                }
                select
                fullWidth
            >
                {EGG_GENDER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                    </MenuItem>
                ))}
            </TextField>
        </Box>
    );
}
```

- [ ] **Step 2: Run TypeScript build**

Run:

```powershell
npm.cmd exec -- tsc -b
```

Expected: exit code 0.

- [ ] **Step 3: Commit parent settings component**

Run:

```powershell
git add src/components/EggParentSettings.tsx
git commit -m "feat: add frlg egg parent settings"
```

Expected: commit succeeds.

## Task 7: Add Egg Result Table

**Files:**
- Create: `src/components/EggTable.tsx`

- [ ] **Step 1: Create the result table**

Create `src/components/EggTable.tsx`:

```tsx
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { memo } from "react";

import { useI18n } from "../i18n";
import { hexSeed } from "../tenLines";
import type { ExtendedEggGeneratorState } from "../tenLines/generated";
import { formatInheritanceSlot } from "./frlgEggHelpers";

const EggTable = memo(function EggTable({
    rows,
    showInheritance,
}: {
    rows: ExtendedEggGeneratorState[];
    showInheritance: boolean;
}) {
    const { t, resources } = useI18n();

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("table.heldSeed")}</TableCell>
                        <TableCell>{t("table.heldSettings")}</TableCell>
                        <TableCell>{t("table.heldSeedTime")}</TableCell>
                        <TableCell>{t("table.pickupSeed")}</TableCell>
                        <TableCell>{t("table.pickupSettings")}</TableCell>
                        <TableCell>{t("table.pickupSeedTime")}</TableCell>
                        <TableCell>{t("table.heldAdvances")}</TableCell>
                        <TableCell>{t("table.pickupAdvances")}</TableCell>
                        <TableCell>{t("table.pid")}</TableCell>
                        <TableCell>{t("table.shiny")}</TableCell>
                        <TableCell>{t("table.nature")}</TableCell>
                        <TableCell>{t("table.ability")}</TableCell>
                        <TableCell>{t("table.ivs")}</TableCell>
                        {showInheritance && (
                            <TableCell>{t("table.inheritance")}</TableCell>
                        )}
                        <TableCell>{t("table.hidden")}</TableCell>
                        <TableCell>{t("table.power")}</TableCell>
                        <TableCell>{t("table.gender")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => {
                        if (index === 1000) {
                            return (
                                <TableRow key="cap">
                                    <TableCell colSpan={showInheritance ? 17 : 16}>
                                        ...
                                    </TableCell>
                                </TableRow>
                            );
                        }
                        if (index > 1000) return null;

                        return (
                            <TableRow key={index}>
                                <TableCell>{hexSeed(row.heldInitialSeed, 16)}</TableCell>
                                <TableCell>{row.heldSettings}</TableCell>
                                <TableCell>{row.heldSeedTime}</TableCell>
                                <TableCell>{hexSeed(row.pickupInitialSeed, 16)}</TableCell>
                                <TableCell>{row.pickupSettings}</TableCell>
                                <TableCell>{row.pickupSeedTime}</TableCell>
                                <TableCell>{row.heldAdvances}</TableCell>
                                <TableCell>{row.pickupAdvances}</TableCell>
                                <TableCell>{hexSeed(row.pid, 32)}</TableCell>
                                <TableCell>{resources.shininess[row.shiny]}</TableCell>
                                <TableCell>{resources.natures[row.nature]}</TableCell>
                                <TableCell>
                                    {row.ability}: {resources.abilities[row.abilityIndex - 1]}
                                </TableCell>
                                <TableCell>{row.ivs.join("/")}</TableCell>
                                {showInheritance && (
                                    <TableCell>
                                        {row.inheritance.map(formatInheritanceSlot).join("/")}
                                    </TableCell>
                                )}
                                <TableCell>{resources.types[row.hiddenPower]}</TableCell>
                                <TableCell>{row.hiddenPowerStrength}</TableCell>
                                <TableCell>{resources.genders[row.gender]}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
});

export default EggTable;
```

- [ ] **Step 2: Run TypeScript build**

Run:

```powershell
npm.cmd exec -- tsc -b
```

Expected: exit code 0.

- [ ] **Step 3: Commit the table**

Run:

```powershell
git add src/components/EggTable.tsx
git commit -m "feat: add frlg egg result table"
```

Expected: commit succeeds.

## Task 8: Add Egg Form And Tab

**Files:**
- Create: `src/components/EggForm.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the Egg form**

Create `src/components/EggForm.tsx`. Use this structure:

```tsx
import { proxy } from "comlink";
import { useMemo, useState } from "react";
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    MenuItem,
    TextField,
    Typography,
    type SxProps,
    type Theme,
} from "@mui/material";

import { getAllGameOptions, getName, useI18n } from "../i18n";
import fetchTenLines, { fetchSeedData, SEED_IDENTIFIER_TO_GAME } from "../tenLines";
import type { ExtendedEggGeneratorState } from "../tenLines/generated";
import IvEntry from "./IvEntry";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import EggParentSettings, { type EggParentState } from "./EggParentSettings";
import EggTable from "./EggTable";
import {
    FRLG_EGG_METHODS,
    buildSeedSettingKey,
    filterFrlgEggGameOptions,
    isCompatibleEggParentPair,
} from "./frlgEggHelpers";

const DEFAULT_IV_RANGES: [string, string][] = [
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
];

const DEFAULT_PARENT: EggParentState = {
    ivs: ["0", "0", "0", "0", "0", "0"],
    gender: "0",
};

type SeedSettings = {
    sound: string;
    buttonMode: string;
    seedButton: string;
    extraButton: string;
};

const DEFAULT_SEED_SETTINGS: SeedSettings = {
    sound: "mono",
    buttonMode: "a",
    seedButton: "a",
    extraButton: "none",
};

const toIvArray = (parent: EggParentState) =>
    parent.ivs.map((value) => parseInt(value, 10));

export default function EggForm({
    sx,
    hidden,
}: {
    sx?: SxProps<Theme>;
    hidden?: boolean;
}) {
    const { t, resources } = useI18n();
    const [game, setGame] = useState("fr");
    const [trainerID, setTrainerID] = useState("0");
    const [secretID, setSecretID] = useState("0");
    const [method, setMethod] = useState("11");
    const [compatibility, setCompatibility] = useState("70");
    const [maxResults, setMaxResults] = useState("1000");
    const [eggSpecies, setEggSpecies] = useState("1");
    const [heldSettings, setHeldSettings] = useState(DEFAULT_SEED_SETTINGS);
    const [pickupSettings, setPickupSettings] = useState(DEFAULT_SEED_SETTINGS);
    const [heldAdvances, setHeldAdvances] = useState<[string, string]>(["0", "100"]);
    const [pickupAdvances, setPickupAdvances] = useState<[string, string]>(["0", "100"]);
    const [heldOffset, setHeldOffset] = useState("0");
    const [pickupOffset, setPickupOffset] = useState("0");
    const [parentA, setParentA] = useState<EggParentState>(DEFAULT_PARENT);
    const [parentB, setParentB] = useState<EggParentState>({
        ...DEFAULT_PARENT,
        gender: "1",
    });
    const [shininess, setShininess] = useState("255");
    const [nature, setNature] = useState("-1");
    const [gender, setGender] = useState("255");
    const [ability, setAbility] = useState("255");
    const [hiddenPower, setHiddenPower] = useState("-1");
    const [ivRanges, setIvRanges] = useState(DEFAULT_IV_RANGES);
    const [showInheritance, setShowInheritance] = useState(false);
    const [rows, setRows] = useState<ExtendedEggGeneratorState[]>([]);
    const [searching, setSearching] = useState(false);
    const [message, setMessage] = useState("");

    const gameOptions = useMemo(
        () => filterFrlgEggGameOptions(getAllGameOptions(t)),
        [t]
    );
    const parentPairIsCompatible = isCompatibleEggParentPair(
        parseInt(parentA.gender, 10),
        parseInt(parentB.gender, 10)
    );

    const runSearch = async () => {
        setMessage("");
        setRows([]);
        if (!parentPairIsCompatible) {
            setMessage(t("messages.incompatibleEggParents"));
            return;
        }

        setSearching(true);
        try {
            const tenLines = await fetchTenLines();
            const seedData = await fetchSeedData(game);
            const heldKey = buildSeedSettingKey(
                heldSettings.sound,
                heldSettings.buttonMode,
                heldSettings.seedButton
            );
            const pickupKey = buildSeedSettingKey(
                pickupSettings.sound,
                pickupSettings.buttonMode,
                pickupSettings.seedButton
            );
            const heldSeeds = await tenLines.get_contiguous_seed_list(
                seedData,
                heldKey,
                game,
                heldSettings.extraButton
            );
            const pickupSeeds = await tenLines.get_contiguous_seed_list(
                seedData,
                pickupKey,
                game,
                pickupSettings.extraButton
            );

            if (heldSeeds.length === 0) {
                setMessage(t("messages.noHeldEggSeeds"));
                return;
            }
            if (pickupSeeds.length === 0) {
                setMessage(t("messages.noPickupEggSeeds"));
                return;
            }

            await tenLines.check_seeds_frlg_egg(
                heldSeeds,
                pickupSeeds,
                heldAdvances.map((value) => parseInt(value, 10)),
                pickupAdvances.map((value) => parseInt(value, 10)),
                parseInt(heldOffset, 10),
                parseInt(pickupOffset, 10),
                SEED_IDENTIFIER_TO_GAME[game],
                parseInt(trainerID, 10),
                parseInt(secretID, 10),
                parseInt(method, 10),
                parseInt(compatibility, 10),
                [toIvArray(parentA), toIvArray(parentB)],
                [parseInt(parentA.gender, 10), parseInt(parentB.gender, 10)],
                parseInt(eggSpecies, 10),
                parseInt(shininess, 10),
                parseInt(nature, 10),
                parseInt(gender, 10),
                parseInt(ability, 10),
                parseInt(hiddenPower, 10),
                ivRanges.map((range) => range.map((value) => parseInt(value, 10))),
                parseInt(maxResults, 10),
                heldKey,
                pickupKey,
                proxy((batch: ExtendedEggGeneratorState[]) => {
                    setRows((currentRows) => [...currentRows, ...batch]);
                }),
                proxy((nextSearching: boolean) => setSearching(nextSearching))
            );
        } finally {
            setSearching(false);
        }
    };

    if (hidden) return null;

    return (
        <Box component="form" sx={sx} onSubmit={(event) => {
            event.preventDefault();
            void runSearch();
        }}>
            <TextField label={t("labels.game")} value={game} onChange={(event) => setGame(event.target.value)} select fullWidth margin="normal">
                {gameOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
            </TextField>
            <Box sx={{ display: "flex", gap: 1 }}>
                <NumericalInput label={t("labels.trainerId")} name="eggTrainerID" value={trainerID} minimumValue={0} maximumValue={65535} onChange={(_, value) => setTrainerID(value.value)} />
                <NumericalInput label={t("labels.secretId")} name="eggSecretID" value={secretID} minimumValue={0} maximumValue={65535} onChange={(_, value) => setSecretID(value.value)} />
            </Box>
            <TextField label={t("labels.method")} value={method} onChange={(event) => setMethod(event.target.value)} select fullWidth margin="normal">
                {FRLG_EGG_METHODS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{t(option.labelKey)}</MenuItem>
                ))}
            </TextField>
            <TextField label={t("labels.compatibility")} value={compatibility} onChange={(event) => setCompatibility(event.target.value)} select fullWidth margin="normal">
                <MenuItem value="20">20</MenuItem>
                <MenuItem value="50">50</MenuItem>
                <MenuItem value="70">70</MenuItem>
            </TextField>
            <NumericalInput label={t("labels.maxResults")} name="eggMaxResults" value={maxResults} minimumValue={1} maximumValue={10000} onChange={(_, value) => setMaxResults(value.value)} />

            <Typography variant="h6">{t("labels.heldSeedSettings")}</Typography>
            <SeedSettingsFields value={heldSettings} onChange={setHeldSettings} />
            <RangeInput label={t("labels.heldAdvances")} name="heldAdvances" value={heldAdvances} minimumValue={0} maximumValue={4294967295} onChange={(_, value) => setHeldAdvances(value.value as [string, string])} />
            <NumericalInput label={t("labels.heldOffset")} name="heldOffset" value={heldOffset} minimumValue={0} maximumValue={4294967295} onChange={(_, value) => setHeldOffset(value.value)} />

            <Typography variant="h6">{t("labels.pickupSeedSettings")}</Typography>
            <SeedSettingsFields value={pickupSettings} onChange={setPickupSettings} />
            <RangeInput label={t("labels.pickupAdvances")} name="pickupAdvances" value={pickupAdvances} minimumValue={0} maximumValue={4294967295} onChange={(_, value) => setPickupAdvances(value.value as [string, string])} />
            <NumericalInput label={t("labels.pickupOffset")} name="pickupOffset" value={pickupOffset} minimumValue={0} maximumValue={4294967295} onChange={(_, value) => setPickupOffset(value.value)} />

            <Typography variant="h6">{t("labels.eggSettings")}</Typography>
            <TextField label={t("labels.eggSpecies")} value={eggSpecies} onChange={(event) => setEggSpecies(event.target.value)} select fullWidth margin="normal">
                {resources.species.slice(1, 387).map((species, index) => (
                    <MenuItem key={index + 1} value={index + 1}>{getName(resources, index + 1)}</MenuItem>
                ))}
            </TextField>
            <EggParentSettings label={t("labels.parentA")} value={parentA} onChange={setParentA} onValidityChange={() => {}} />
            <EggParentSettings label={t("labels.parentB")} value={parentB} onChange={setParentB} onValidityChange={() => {}} />

            <TextField label={t("labels.shininess")} value={shininess} onChange={(event) => setShininess(event.target.value)} select fullWidth margin="normal">
                <MenuItem value="255">{t("common.any")}</MenuItem>
                <MenuItem value="1">{t("options.star")}</MenuItem>
                <MenuItem value="2">{t("options.square")}</MenuItem>
                <MenuItem value="3">{t("options.starSquare")}</MenuItem>
            </TextField>
            <TextField label={t("labels.nature")} value={nature} onChange={(event) => setNature(event.target.value)} select fullWidth margin="normal">
                <MenuItem value="-1">{t("common.any")}</MenuItem>
                {resources.natures.map((name, index) => <MenuItem key={index} value={index}>{name}</MenuItem>)}
            </TextField>
            <TextField label={t("labels.gender")} value={gender} onChange={(event) => setGender(event.target.value)} select fullWidth margin="normal">
                <MenuItem value="255">{t("common.any")}</MenuItem>
                <MenuItem value="0">{resources.genders[0]}</MenuItem>
                <MenuItem value="1">{resources.genders[1]}</MenuItem>
            </TextField>
            <TextField label={t("labels.ability")} value={ability} onChange={(event) => setAbility(event.target.value)} select fullWidth margin="normal">
                <MenuItem value="255">{t("common.any")}</MenuItem>
                <MenuItem value="0">0</MenuItem>
                <MenuItem value="1">1</MenuItem>
            </TextField>
            <TextField label={t("labels.hiddenPower")} value={hiddenPower} onChange={(event) => setHiddenPower(event.target.value)} select fullWidth margin="normal">
                <MenuItem value="-1">{t("common.any")}</MenuItem>
                {resources.types.map((type, index) => <MenuItem key={index} value={index}>{type}</MenuItem>)}
            </TextField>
            <IvEntry value={ivRanges} onChange={(_, value) => setIvRanges(value.value)} />
            <FormControlLabel control={<Checkbox checked={showInheritance} onChange={(event) => setShowInheritance(event.target.checked)} />} label={t("table.inheritance")} />

            {message && <Typography color="error">{message}</Typography>}
            <Button type="submit" variant="contained" disabled={searching} fullWidth>
                {searching ? t("common.searching") : t("common.submit")}
            </Button>
            {rows.length >= parseInt(maxResults, 10) && (
                <Typography>{t("messages.eggResultsCapHit")}</Typography>
            )}
            <EggTable rows={rows} showInheritance={showInheritance} />
        </Box>
    );
}

function SeedSettingsFields({
    value,
    onChange,
}: {
    value: SeedSettings;
    onChange: (value: SeedSettings) => void;
}) {
    const { t } = useI18n();

    return (
        <>
            <TextField label={t("labels.sound")} value={value.sound} onChange={(event) => onChange({ ...value, sound: event.target.value })} select fullWidth margin="normal">
                <MenuItem value="mono">{t("common.mono")}</MenuItem>
                <MenuItem value="stereo">{t("common.stereo")}</MenuItem>
            </TextField>
            <TextField label={t("labels.buttonMode")} value={value.buttonMode} onChange={(event) => onChange({ ...value, buttonMode: event.target.value })} select fullWidth margin="normal">
                <MenuItem value="a">A</MenuItem>
                <MenuItem value="h">{t("options.help")}</MenuItem>
                <MenuItem value="r">R</MenuItem>
            </TextField>
            <TextField label={t("labels.seedButton")} value={value.seedButton} onChange={(event) => onChange({ ...value, seedButton: event.target.value })} select fullWidth margin="normal">
                <MenuItem value="a">A</MenuItem>
                <MenuItem value="start">{t("options.start")}</MenuItem>
                <MenuItem value="l">L</MenuItem>
            </TextField>
            <TextField label={t("labels.extraButton")} value={value.extraButton} onChange={(event) => onChange({ ...value, extraButton: event.target.value })} select fullWidth margin="normal">
                <MenuItem value="none">{t("common.none")}</MenuItem>
                <MenuItem value="startup_select">{t("options.startupSelect")}</MenuItem>
                <MenuItem value="startup_a">{t("options.startupA")}</MenuItem>
                <MenuItem value="blackout_r">{t("options.blackoutR")}</MenuItem>
                <MenuItem value="blackout_a">{t("options.blackoutA")}</MenuItem>
                <MenuItem value="blackout_l">{t("options.blackoutL")}</MenuItem>
                <MenuItem value="blackout_al">{t("options.blackoutAL")}</MenuItem>
            </TextField>
        </>
    );
}
```

- [ ] **Step 2: Add the Egg tab**

In `src/App.tsx`, import:

```ts
import EggForm from "./components/EggForm";
```

In the `pages` array, add:

```tsx
        <EggForm
            key={5}
            sx={pageSx}
            hidden={currentPage != 5}
        />,
```

In the tabs list, add:

```tsx
                        <Tab label={t("tabs.egg")} value={5} />
```

- [ ] **Step 3: Run TypeScript build**

Run:

```powershell
npm.cmd exec -- tsc -b
```

Expected: exit code 0. If TypeScript reports a mismatch around `RangeInput` or `IvEntry` callback types, inspect the existing `SearcherForm.tsx` usage and adjust the cast to match that component's current value type exactly.

- [ ] **Step 4: Commit the Egg page**

Run:

```powershell
git add src/components/EggForm.tsx src/App.tsx
git commit -m "feat: add frlg egg page"
```

Expected: commit succeeds.

## Task 9: Verify Runtime Build And UI

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run helper test**

Run:

```powershell
node tests/frlgEggHelpers.test.ts
```

Expected: PASS with exit code 0.

- [ ] **Step 2: Run WASM build**

Run:

```powershell
npm.cmd run build-wasm
```

Expected: exit code 0.

- [ ] **Step 3: Run lint**

Run:

```powershell
npm.cmd run lint
```

Expected: exit code 0.

- [ ] **Step 4: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: exit code 0 and `dist/` is produced.

- [ ] **Step 5: Start local dev server**

Run:

```powershell
npm.cmd run dev
```

Expected: Vite prints a local URL.

- [ ] **Step 6: Browser smoke check**

Open the local URL and verify:

- The `Egg` tab is visible.
- Selecting a FireRed or LeafGreen seed-library version keeps the form usable.
- Incompatible parent genders show `messages.incompatibleEggParents`.
- Settings with no held seed rows show `messages.noHeldEggSeeds`.
- Settings with no pickup seed rows show `messages.noPickupEggSeeds`.
- Valid seed settings return rows with both held and pickup seed columns.
- The inheritance toggle adds and removes the inheritance column.

- [ ] **Step 7: Final diff check**

Run:

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` prints no output. `git status --short` only shows intentional generated files, if the final build updated them after the last commit.

## Self-Review

- Spec coverage: Tasks cover a dedicated Egg tab, FRLG-only game selection, two library-derived seed lists, held/pickup advances and offsets, parent IV/gender settings, compatibility, method, filters, inheritance display, WASM generation through `EggGenerator3`, batching, result cap, and manual verification.
- Placeholder scan: The plan contains no TODO, TBD, or open-ended implementation placeholders.
- Type consistency: `ExtendedEggGeneratorState`, `check_seeds_frlg_egg`, `FRLGContiguousSeedEntry`, `EggParentState`, `FRLG_EGG_METHODS`, and `formatInheritanceSlot` names are consistent across tasks.
