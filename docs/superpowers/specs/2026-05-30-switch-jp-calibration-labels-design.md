# Switch JP Calibration Labels Design

## Goal

When the calibration page is set to Switch Japanese FireRed (`fr_jpn_nx`) or Switch Japanese LeafGreen (`lg_jpn_nx`), show Chinese labels with the corresponding Japanese in-game text in parentheses for sound, button mode, seed button, extra button, and nature.

## Scope

This applies only to the calibration page. Other pages keep their current localized resource labels.

The underlying values must not change. The calibration logic still receives values such as `mono`, `h`, `a`, `startup_select`, and nature indexes.

## Reference

The user-provided video confirms the Japanese in-game option values:

- Sound uses `モノラル` and `ステレオ`.
- Button mode uses `ヘルプ`, `LR`, and `かたて`.
- The options UI uses Japanese kana text, so the web page should act as a reference bridge for users who cannot read Japanese.

Existing PokeFinder Japanese nature resources provide the nature kana list. The calibration labels should use Chinese nature names plus those kana values, for example `勤奋（がんばりや）`, without English nature names.

## Behavior

For `fr_jpn_nx` and `lg_jpn_nx` on the calibration page:

- Sound:
  - `mono`: `单声道（モノラル）`
  - `stereo`: `立体声（ステレオ）`
- Button mode:
  - `a`: `L=A（かたて）`
  - `h`: `帮助（ヘルプ）`
  - `r`: `LR（LR）`
- Seed button:
  - `a`: `A（A）`
  - `start`: `Start（スタート）`
  - `l`: `L（L）`
- Extra button:
  - `none`: `无（なし）`
  - `startup_select`: `启动时 Select（セレクト）`
  - `startup_a`: `启动时 A（A）`
  - `blackout_r`: `黑屏后 R（R）`
  - `blackout_a`: `黑屏后 A（A）`
  - `blackout_l`: `黑屏后 L（L）`
  - `blackout_al`: `黑屏后 A+L（A+L）`
- Nature:
  - Use Chinese raw nature text plus the Japanese kana nature text.
  - Example: `勤奋（がんばりや）`.
  - Do not include English in this Switch Japanese calibration display.

For all other games, existing labels remain unchanged.

## Architecture

Add a small pure helper module for Switch Japanese calibration display labels. The calibration form decides whether the current game is a Switch Japanese FRLG game and uses the helper only for those labels.

The helper owns static Japanese label mappings and imports the existing Chinese and Japanese nature resources from `i18n.tsx`. This keeps UI rendering simple and makes the label behavior easy to test without rendering React.

## Testing

Add a small Node-executable TypeScript test script under `.codex-local/tests`. The test verifies:

- `isSwitchJapaneseFRLGGame` detects `fr_jpn_nx` and `lg_jpn_nx`.
- Sound, button mode, seed button, and extra button labels match the confirmed Japanese in-game text.
- Nature labels use Chinese plus Japanese kana and do not contain English.
- Non-Switch-Japanese games are not detected.

Run TypeScript build after implementation with `npm.cmd exec -- tsc -b`.
