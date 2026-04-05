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
- Reachable-advance prefiltering in Searcher
- Offline-friendly generated FRLG seed cache
- Self-hostable Vite build output

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
