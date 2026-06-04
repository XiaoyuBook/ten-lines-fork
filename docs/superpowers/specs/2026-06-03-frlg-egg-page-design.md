# FRLG Egg Page Design

## Goal

Add a dedicated Egg page to ten-lines for FireRed and LeafGreen egg RNG. The page extracts PokeFinder's Gen 3 RS/FRLG egg generation behavior and restricts both the held-egg seed and pickup seed to the existing FRLG seed library.

The first version supports only FireRed and LeafGreen seed-library workflows. Ruby, Sapphire, and Emerald egg workflows are out of scope.

## Existing Context

ten-lines already has the infrastructure needed for reachable FRLG seed handling:

- `src/tenLines/index.ts` maps game identifiers to generated seed binaries and fetches seed data.
- `src/wasm/src/initial_seed.hpp` parses FRLG seed binaries into keyed seed entries.
- `get_contiguous_seed_list(...)` exposes known reachable seed entries to the frontend.
- `src/wasm/src/calibration.cpp` already shows the pattern of iterating a frontend-provided seed list and generating PokeFinder results in WASM.
- `src/components/CalibrationForm.tsx` already provides UI patterns for sound, button mode, seed button, extra button, advances ranges, TeachyTV-related controls, and result batching.

PokeFinder's relevant egg logic lives in:

- `Core/Gen3/Generators/EggGenerator3.hpp`
- `Core/Gen3/Generators/EggGenerator3.cpp`
- `Core/Gen3/States/EggState3.hpp`
- `Core/Parents/Daycare.hpp`

The ten-lines submodule must include PokeFinderCore with Gen 3 egg generator sources available before implementation.

## User Experience

Add a new top-level tab named `Egg`. The Chinese locale should translate it through the existing i18n system.

The page contains four groups:

1. Game and profile settings
   - Game selector limited to FRLG seed-library entries.
   - Trainer ID.
   - Secret ID.
   - Compatibility: `20`, `50`, or `70`.
   - Method: `RSFRLGBred`, `RSFRLGBredSplit`, `RSFRLGBredAlternate`, or `RSFRLGBredMixed`.
   - Max results.

2. Held Seed settings
   - Sound.
   - Button Mode.
   - Seed Button.
   - Extra Button.
   - Held Advances range.
   - Held Offset.

3. Pickup Seed settings
   - Sound.
   - Button Mode.
   - Seed Button.
   - Extra Button.
   - Pickup Advances range.
   - Pickup Offset.

4. Egg and filter settings
   - Egg species.
   - Parent A IVs.
   - Parent A gender.
   - Parent B IVs.
   - Parent B gender.
   - Shininess filter.
   - Nature filter.
   - Gender filter.
   - Ability filter.
   - Hidden Power filter.
   - IV range filter.
   - Show inheritance toggle.

The result table shows:

- Held Seed.
- Held Settings.
- Held Seed Time.
- Pickup Seed.
- Pickup Settings.
- Pickup Seed Time.
- Held Advances.
- Pickup Advances.
- PID.
- Shiny.
- Nature.
- Ability.
- IVs.
- Hidden Power.
- Hidden Power power.
- Gender.
- Inheritance source when enabled.

## Data Model

The frontend will define an `EggFormState` for local form state and URL-backed settings for values that should be shareable. Existing helper components should be reused where practical:

- `NumericalInput`
- `RangeInput`
- `IvEntry`
- MUI `TextField` selectors
- existing i18n resource lists for nature, gender, abilities, types, and species

Parent data passed to WASM:

- `parentIVs`: two `std::array<u8, 6>` values.
- `parentGender`: two `u8` values using PokeFinder's convention: `0` male, `1` female, `2` genderless, `3` Ditto.
- Parent ability, item, nature, and Masuda are not exposed in the first FRLG version because PokeFinder hides those for Gen 3 RS/FRLG egg settings.
- `eggSpecies`: `u16`.

WASM result type:

`ExtendedEggGeneratorState` will wrap `EggState3` and expose:

- `heldInitialSeed`
- `heldSeedTime`
- `heldSettings`
- `pickupInitialSeed`
- `pickupSeedTime`
- `pickupSettings`
- `heldAdvances`
- `pickupAdvances`
- `pid`
- `nature`
- `ability`
- `abilityIndex`
- `gender`
- `ivs`
- `stats`
- `shiny`
- `hiddenPower`
- `hiddenPowerStrength`
- `inheritance`

## WASM Flow

Add `src/wasm/src/egg.cpp` and include it in `src/wasm/CMakeLists.txt`.

Expose:

```cpp
void check_seeds_frlg_egg(
    typed_array<FRLGContiguousSeedEntry> held_seeds,
    typed_array<FRLGContiguousSeedEntry> pickup_seeds,
    typed_range<u32> held_advances_range,
    typed_range<u32> pickup_advances_range,
    u32 held_offset,
    u32 pickup_offset,
    Game game,
    u16 trainer_id,
    u16 secret_id,
    Method method,
    u8 compatibility,
    typed_array<typed_array<u8>> parent_ivs,
    typed_array<u8> parent_genders,
    u16 egg_species,
    u8 shininess,
    int nature,
    u8 gender,
    u8 ability,
    int hidden_power,
    typed_array<typed_range<u8>> iv_ranges,
    u32 max_results,
    result_callback,
    searching_callback
)
```

The implementation builds:

- `Profile3("", game, trainer_id, secret_id, false)`
- `Daycare(...)`
- `StateFilter(...)`
- `EggGenerator3(...)`

For each held seed and pickup seed pair:

1. Create an `EggGenerator3` with held and pickup advance ranges and offsets.
2. Call `generate(heldSeed, pickupSeed)`.
3. Wrap returned `EggState3` rows with held/pickup seed metadata.
4. Send results in batches through the callback.
5. Stop once `max_results` is reached.

Both seed stages must come from the FRLG seed library. The search must not enumerate arbitrary seed values outside the library-provided seed lists.

## Frontend Flow

`EggForm.tsx`:

1. Load the selected FRLG seed bin with `fetchSeedData(game)`.
2. Get held seed entries with `get_contiguous_seed_list(seedData, heldSettingKey, game, heldExtraButton)`.
3. Get pickup seed entries with `get_contiguous_seed_list(seedData, pickupSettingKey, game, pickupExtraButton)`.
4. Validate parent compatibility using the same rules as PokeFinder:
   - Male/Female
   - Ditto/Female
   - Male/Ditto
   - Genderless/Ditto
5. Call `check_seeds_frlg_egg(...)`.
6. Append batched results until the max result count is reached or the search finishes.

`EggTable.tsx`:

- Format seeds with `hexSeed(seed, 16)`.
- Render seed times and settings similarly to `InitialSeedTable`.
- Render nature, ability, gender, type, and shiny values from i18n resources.
- Render inheritance as `A`, `B`, or blank per IV slot when the toggle is enabled.

## Error Handling

Show clear form-level errors for:

- Missing seed list for selected held settings.
- Missing seed list for selected pickup settings.
- Incompatible parents.
- Invalid numeric ranges.
- Max results reached.

If the seed bin fetch fails, reuse the existing `fetchSeedData` error behavior and surface a page-level message.

## Testing And Verification

Unit-level verification:

- Add C++/WASM-side smoke coverage where practical by comparing a small FRLG egg generation case against PokeFinder `EggGenerator3` expected behavior.
- Add TypeScript type coverage by updating generated declarations or local interfaces for `ExtendedEggGeneratorState`.

Manual verification:

- Run `npm run build-wasm`.
- Run `npm run lint`.
- Run `npm run build`.
- Start Vite and verify the Egg tab renders.
- Check that selected held and pickup settings with no seed entries show an empty/error state.
- Check that valid held and pickup seed settings return rows.
- Check that every row includes both held and pickup seed metadata and that neither seed comes from outside the selected library lists.

## Out Of Scope

- Ruby/Sapphire egg support.
- Emerald egg support.
- Standalone Qt GUI.
- Full PokeFinder profile manager.
- Parent item, parent nature, Masuda, and ability inheritance features not applicable to RS/FRLG in PokeFinder's Gen 3 egg UI.
