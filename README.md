[![](public/icon-180x180.png)](https://tenlines.skrxiaoyu.com)

## Ten Lines Fork

This repository is a personal fork of Lincoln-LM's **Ten Lines**, focused on practical FRLG target filtering and easier self-hosted deployment.

Original upstream project:
[Lincoln-LM/ten-lines](https://github.com/Lincoln-LM/ten-lines)

## What Changed

- Searcher now supports **reachable advance filtering**
- You can enter an **Allowed Advances** range directly in the Searcher tab
- Searcher results are automatically checked against Initial Seed reachability logic
- Results with no reachable Initial Seed route inside the allowed range are filtered out
- Searcher can display **Min Reachable Advances** for each remaining target
- The UI now supports **English / Chinese language switching**
- Core in-game naming resources can now render in **Chinese**, including species, natures, abilities, types, and locations
- Chinese UI terminology was cleaned up to better match common community naming and PokeWiki usage
- Calibration now includes a **target / history comparison panel** with quick-add workflow, column visibility controls, delta display, floating window mode, and an optional calculator
- Calibration search now runs **manually on submit**, avoiding repeated automatic reruns while users are still entering values
- Build flow supports **offline cached FRLG seed data**
- Vite base path is configurable so the site can be deployed cleanly on a custom domain or subdomain

## Why This Fork Exists

In the original workflow, a target found in the Searcher could still be useless in practice:

1. You find a desirable target seed in Searcher
2. You open it in Initial Seed
3. The reachable advances are far too large to be realistic

This fork reduces that problem by letting Searcher pre-filter targets using an allowed advance range, so obviously unreachable targets can be removed earlier.

## Main Features

- FRLG / RSE search tools
- Initial Seed lookup
- Calibration tools
- Calibration compare panel with target/history tracking, delta readouts, floating mode, and optional calculator
- Reachable-advance prefiltering in Searcher
- English / Chinese UI toggle
- Chinese naming resources for Gen 3 data shown in the interface
- Offline-friendly generated FRLG seed cache
- Self-hostable Vite build output

## Localization Notes

- The site now includes a built-in language toggle in the top navigation bar
- Language choice is stored locally in the browser and persists across reloads
- Chinese text is intended to follow established Pokémon community terminology where practical
- Imported game data names are sourced from bundled PokeFinder i18n resources, while UI copy is maintained in the web app layer
- In Chinese mode, natures are shown with their English counterpart in parentheses for easier cross-reference

## Calibration Notes

- Calibration results can be added directly into a compare panel as either a target or history entry
- History rows can compare against either the target or the previous history row for Seed and advance deltas
- Compare panel columns are configurable, and the panel can be docked or switched into a draggable floating window
- The floating compare panel includes an optional built-in calculator for quick frame and timing math
- Calibration searches now run only when you press submit, which helps avoid UI stalls while editing input values

## Building Locally

Requirements:

- `git`
- `node` / `npm`
- Python with `numpy` and `requests`
- Emscripten / `emsdk`
- `cmake`
- `ninja`

Typical setup:

```bash
git clone --recursive <your-fork-url>
cd ten-lines
npm install
python3 -m pip install --user numpy requests pytest
source ~/emsdk/emsdk_env.sh
npm run build
```

On Windows, use the equivalent Python and emsdk activation commands for your local environment.

## Offline Build Notes

This fork supports cached FRLG seed binaries in:

- `src/wasm/src/generated`
- `public/generated`

If those generated files already exist, the build can reuse them without re-downloading seed data from Google Sheets.

To force a refresh of FRLG seed cache during build:

```bash
TEN_LINES_REFRESH_FRLG_SEEDS=true npm run build
```

## Deployment

After building, deploy the contents of `dist/` to a static web root.

Example:

```bash
npm run build
rsync -av --delete dist/ /var/www/ten-lines/
```

For subdomain deployment, this fork defaults to root-path hosting and no longer requires a hardcoded `/ten-lines/` base path.

## Credit

- Original Ten Lines concept and implementation by Lincoln-LM and upstream contributors
- PokeFinderCore by [Admiral-Fish](https://github.com/Admiral-Fish/PokeFinder)
