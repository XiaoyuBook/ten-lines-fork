# Switch JP Calibration Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Chinese labels with corresponding Japanese in-game text on the calibration page for Switch Japanese FireRed and LeafGreen.

**Architecture:** Add a focused pure label helper and wire it into `CalibrationForm.tsx`. Keep runtime values unchanged; only display labels change for `fr_jpn_nx` and `lg_jpn_nx`.

**Tech Stack:** React, TypeScript, MUI, Node 24 TypeScript execution for the focused helper test, existing `npm.cmd exec -- tsc -b` verification.

---

## File Structure

- Create: `tests/calibrationJapaneseLabels.test.ts`
  - Focused executable test for pure label helper behavior.
- Create: `src/components/calibrationJapaneseLabels.ts`
  - Switch Japanese FRLG game detection and display label helpers.
- Modify: `src/i18n.tsx`
  - Import Japanese nature resource and export parsed Japanese nature labels.
- Modify: `src/utils/natureSearch.ts`
  - Include Japanese nature kana in search aliases.
- Modify: `src/components/CalibrationForm.tsx`
  - Use helper labels only when the selected game is `fr_jpn_nx` or `lg_jpn_nx`.

## Task 1: Add Failing Label Helper Test

**Files:**
- Create: `tests/calibrationJapaneseLabels.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";

import {
    getSwitchJapaneseFRLGButtonModeLabel,
    getSwitchJapaneseFRLGExtraButtonLabel,
    getSwitchJapaneseFRLGNatureLabel,
    getSwitchJapaneseFRLGSeedButtonLabel,
    getSwitchJapaneseFRLGSoundLabel,
    isSwitchJapaneseFRLGGame,
} from "../../src/components/calibrationJapaneseLabels.ts";
import { ZH_NATURES_RAW } from "../../src/i18n.tsx";

assert.equal(isSwitchJapaneseFRLGGame("fr_jpn_nx"), true);
assert.equal(isSwitchJapaneseFRLGGame("lg_jpn_nx"), true);
assert.equal(isSwitchJapaneseFRLGGame("fr_nx"), false);

assert.equal(getSwitchJapaneseFRLGSoundLabel("mono"), "单声道（モノラル）");
assert.equal(getSwitchJapaneseFRLGSoundLabel("stereo"), "立体声（ステレオ）");

assert.equal(getSwitchJapaneseFRLGButtonModeLabel("a"), "L=A（かたて）");
assert.equal(getSwitchJapaneseFRLGButtonModeLabel("h"), "帮助（ヘルプ）");
assert.equal(getSwitchJapaneseFRLGButtonModeLabel("r"), "LR（LR）");

assert.equal(getSwitchJapaneseFRLGSeedButtonLabel("a"), "A（A）");
assert.equal(getSwitchJapaneseFRLGSeedButtonLabel("start"), "Start（スタート）");
assert.equal(getSwitchJapaneseFRLGSeedButtonLabel("l"), "L（L）");

assert.equal(getSwitchJapaneseFRLGExtraButtonLabel("none"), "无（なし）");
assert.equal(
    getSwitchJapaneseFRLGExtraButtonLabel("startup_select"),
    "启动时 Select（セレクト）"
);
assert.equal(getSwitchJapaneseFRLGExtraButtonLabel("blackout_al"), "黑屏后 A+L（A+L）");

assert.equal(getSwitchJapaneseFRLGNatureLabel(0), `${ZH_NATURES_RAW[0]}（がんばりや）`);
assert.equal(getSwitchJapaneseFRLGNatureLabel(1), `${ZH_NATURES_RAW[1]}（さみしがり）`);
assert.ok(!getSwitchJapaneseFRLGNatureLabel(0).includes("Hardy"));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/calibrationJapaneseLabels.test.ts`

Expected: FAIL because `src/components/calibrationJapaneseLabels.ts` does not exist yet.

## Task 2: Implement Label Helper

**Files:**
- Modify: `src/i18n.tsx`
- Create: `src/components/calibrationJapaneseLabels.ts`
- Modify: `src/utils/natureSearch.ts`

- [ ] **Step 1: Add Japanese nature resource export**

In `src/i18n.tsx`, import:

```ts
import natures_ja_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/ja/natures_ja.txt?raw";
```

Add:

```ts
export const JA_NATURES = parseList(natures_ja_txt);
```

- [ ] **Step 2: Create the helper**

Create `src/components/calibrationJapaneseLabels.ts`:

```ts
import { JA_NATURES, ZH_NATURES_RAW } from "../i18n";

const SWITCH_JAPANESE_FRLG_GAMES = new Set(["fr_jpn_nx", "lg_jpn_nx"]);

const SOUND_LABELS: Record<string, string> = {
    mono: "单声道（モノラル）",
    stereo: "立体声（ステレオ）",
};

const BUTTON_MODE_LABELS: Record<string, string> = {
    a: "L=A（かたて）",
    h: "帮助（ヘルプ）",
    r: "LR（LR）",
};

const SEED_BUTTON_LABELS: Record<string, string> = {
    a: "A（A）",
    start: "Start（スタート）",
    l: "L（L）",
};

const EXTRA_BUTTON_LABELS: Record<string, string> = {
    none: "无（なし）",
    startup_select: "启动时 Select（セレクト）",
    startup_a: "启动时 A（A）",
    blackout_r: "黑屏后 R（R）",
    blackout_a: "黑屏后 A（A）",
    blackout_l: "黑屏后 L（L）",
    blackout_al: "黑屏后 A+L（A+L）",
};

const getLabel = (labels: Record<string, string>, value: string) =>
    labels[value] ?? value;

export const isSwitchJapaneseFRLGGame = (game: string) =>
    SWITCH_JAPANESE_FRLG_GAMES.has(game);

export const getSwitchJapaneseFRLGSoundLabel = (value: string) =>
    getLabel(SOUND_LABELS, value);

export const getSwitchJapaneseFRLGButtonModeLabel = (value: string) =>
    getLabel(BUTTON_MODE_LABELS, value);

export const getSwitchJapaneseFRLGSeedButtonLabel = (value: string) =>
    getLabel(SEED_BUTTON_LABELS, value);

export const getSwitchJapaneseFRLGExtraButtonLabel = (value: string) =>
    getLabel(EXTRA_BUTTON_LABELS, value);

export const getSwitchJapaneseFRLGNatureLabel = (nature: number) => {
    const chinese = ZH_NATURES_RAW[nature];
    const japanese = JA_NATURES[nature];
    return japanese && chinese ? `${chinese}（${japanese}）` : chinese ?? "";
};
```

- [ ] **Step 3: Include Japanese nature aliases in search**

In `src/utils/natureSearch.ts`, import `JA_NATURES` and include `JA_NATURES[nature] ?? ""` in `getNatureSearchAliases`.

- [ ] **Step 4: Run focused test to verify it passes**

Run: `node tests/calibrationJapaneseLabels.test.ts`

Expected: PASS with exit code 0.

## Task 3: Wire Calibration Form Labels

**Files:**
- Modify: `src/components/CalibrationForm.tsx`

- [ ] **Step 1: Import helper functions**

Add imports from `./calibrationJapaneseLabels`:

```ts
import {
    getSwitchJapaneseFRLGButtonModeLabel,
    getSwitchJapaneseFRLGExtraButtonLabel,
    getSwitchJapaneseFRLGNatureLabel,
    getSwitchJapaneseFRLGSeedButtonLabel,
    getSwitchJapaneseFRLGSoundLabel,
    isSwitchJapaneseFRLGGame,
} from "./calibrationJapaneseLabels";
```

- [ ] **Step 2: Add derived display flag**

Near the other derived calibration values, add:

```ts
const usesSwitchJapaneseFRLGLabels = isSwitchJapaneseFRLGGame(game);
```

- [ ] **Step 3: Replace FRLG option display labels**

Use helper labels when `usesSwitchJapaneseFRLGLabels` is true:

```tsx
<MenuItem value="mono">
    {usesSwitchJapaneseFRLGLabels
        ? getSwitchJapaneseFRLGSoundLabel("mono")
        : t("common.mono")}
</MenuItem>
```

Repeat for stereo, button mode, seed button, and extra button options.

- [ ] **Step 4: Replace calibration nature display only**

Change the calibration page `Autocomplete` `getOptionLabel` to use:

```ts
usesSwitchJapaneseFRLGLabels
    ? getSwitchJapaneseFRLGNatureLabel(option)
    : resources.natures[option]
```

Leave `option === -1` as `t("common.any")`.

- [ ] **Step 5: Run focused test again**

Run: `node tests/calibrationJapaneseLabels.test.ts`

Expected: PASS with exit code 0.

## Task 4: Verify Build and Formatting

**Files:**
- Verify all changed files.

- [ ] **Step 1: Check TypeScript build**

Run: `npm.cmd exec -- tsc -b`

Expected: exit code 0.

- [ ] **Step 2: Check whitespace**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 3: Inspect diff**

Run: `git diff -- src/components/CalibrationForm.tsx src/components/calibrationJapaneseLabels.ts src/i18n.tsx src/utils/natureSearch.ts tests/calibrationJapaneseLabels.test.ts docs/superpowers/specs/2026-05-30-switch-jp-calibration-labels-design.md docs/superpowers/plans/2026-05-30-switch-jp-calibration-labels.md`

Expected: only the helper, calibration labels, nature exports/search aliases, tests, and docs changed.

## Self-Review

- Spec coverage: The tasks cover Switch Japanese FRLG detection, sound labels, button mode labels, seed button labels, extra button labels, nature labels, search aliases, calibration form wiring, TypeScript build, whitespace check, and diff review.
- Placeholder scan: No placeholder instructions remain.
- Type consistency: Helper function names are consistent between tests, implementation, and form imports.
