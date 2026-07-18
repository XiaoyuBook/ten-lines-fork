import {
    Alert,
    Box,
    Button,
    MenuItem,
    TextField,
    Typography,
    type SxProps,
    type Theme,
} from "@mui/material";
import { proxy } from "comlink";
import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "../i18n";
import fetchTenLines, {
    Game,
    WILD_1,
} from "../tenLines";
import type {
    ExtendedWildGeneratorState,
    FRLGContiguousSeedEntry,
} from "../tenLines/generated";
import {
    FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
    FRLG_HELD_SEARCH_MODE_ALL_METHODS,
    FRLG_HELD_SEARCH_MODE_H1_STABLE,
    HELD_ITEM_FILTER_ANY,
    HELD_ITEM_FILTER_ANY_ITEM,
    getFrlgHeldItemName,
    getFrlgHeldItemProbabilities,
    getFrlgHeldItemSlots,
    getFrlgHeldOffsetProfile,
    getFrlgHeldSearchOffsets,
    matchesFrlgHeldItemSearchFilter,
    predictFrlgHeldItemAtOffsets,
    type FrlgHeldSearchMode,
} from "../utils/frlgHeldItems";
import FrlgHeldEncounterSelector, {
    type FrlgHeldEncounterSelection,
} from "./FrlgHeldEncounterSelector";
import { FrlgHeldItemNotice } from "./FrlgHeldItemDisplay";
import FrlgHeldItemResultsTable from "./FrlgHeldItemResultsTable";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";

const ENCOUNTER_CATEGORY = 0;
const RESULT_LIMIT = 1000;
const MAX_ADVANCES_PER_SEARCH = 100_000;
const DEFAULT_ADVANCE_RANGE: [string, string] = ["0", "10000"];
const UNFILTERED_IV_RANGES: [number, number][] = Array.from(
    { length: 6 },
    () => [0, 31] as [number, number]
);
const SEARCH_MODE_OPTIONS: FrlgHeldSearchMode[] = [
    FRLG_HELD_SEARCH_MODE_H1_STABLE,
    FRLG_HELD_SEARCH_MODE_ALL_METHODS,
];

function resultKey(row: ExtendedWildGeneratorState) {
    return `${row.initialSeed}:${row.advances}:${row.method}:${row.pid}:${row.encounterSlot}`;
}

export default function FrlgHeldItemSearcherPage({
    sx,
    hidden = false,
}: {
    sx?: SxProps<Theme>;
    hidden?: boolean;
}) {
    const { locale, t } = useI18n();
    const [initialSeed, setInitialSeed] = useState("DEAD");
    const [initialSeedIsValid, setInitialSeedIsValid] = useState(true);
    const [advanceRangeStrings, setAdvanceRangeStrings] = useState(
        DEFAULT_ADVANCE_RANGE
    );
    const [advanceRangeIsValid, setAdvanceRangeIsValid] = useState(true);
    const [searchMode, setSearchMode] = useState<FrlgHeldSearchMode>(
        FRLG_HELD_SEARCH_MODE_H1_STABLE
    );
    const [selection, setSelection] =
        useState<FrlgHeldEncounterSelection>();
    const [standardOffset, setStandardOffset] = useState("0");
    const [standardOffsetIsValid, setStandardOffsetIsValid] = useState(true);
    const [heldItemFilter, setHeldItemFilter] = useState(
        HELD_ITEM_FILTER_ANY_ITEM
    );
    const [rows, setRows] = useState<ExtendedWildGeneratorState[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState<string>();
    const requestIdRef = useRef(0);

    const advanceRange: [number, number] = [
        parseInt(advanceRangeStrings[0], 10),
        parseInt(advanceRangeStrings[1], 10),
    ];
    const advanceCount = advanceRangeIsValid
        ? advanceRange[1] - advanceRange[0] + 1
        : 0;
    const advanceSearchSpaceTooLarge =
        advanceCount > MAX_ADVANCES_PER_SEARCH;
    const advanceSignature = advanceRangeStrings.join(":");

    const presetProfile = useMemo(
        () =>
            selection
                ? getFrlgHeldOffsetProfile(
                      FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT,
                      Game.FireRed,
                      ENCOUNTER_CATEGORY,
                      selection.locationId,
                      WILD_1
                  )
                : undefined,
        [selection]
    );
    const standardOffsetValue = parseInt(standardOffset, 10);
    const searchOffsets = getFrlgHeldSearchOffsets(
        standardOffsetValue,
        searchMode
    );
    const hasUsableOffset =
        standardOffsetIsValid && searchOffsets.length > 0;
    const slots = selection
        ? getFrlgHeldItemSlots(selection.speciesForm & 0x7ff)
        : undefined;
    const itemOptions = useMemo(
        () =>
            slots
                ? getFrlgHeldItemProbabilities(slots).filter(
                      ({ itemId }) => itemId !== 0
                  )
                : [],
        [slots]
    );

    useEffect(() => {
        requestIdRef.current += 1;
        setRows([]);
        setHasSearched(false);
        setSearchError(undefined);
        setSearching(false);
    }, [
        hidden,
        searchMode,
        selection,
        heldItemFilter,
        initialSeed,
        advanceSignature,
        standardOffset,
    ]);

    useEffect(() => {
        setStandardOffset(String(presetProfile?.baseOffset ?? 0));
        setStandardOffsetIsValid(true);
    }, [presetProfile, selection?.locationId]);

    useEffect(() => {
        const validItemIds = new Set(itemOptions.map(({ itemId }) => itemId));
        if (
            heldItemFilter !== HELD_ITEM_FILTER_ANY &&
            heldItemFilter !== HELD_ITEM_FILTER_ANY_ITEM &&
            !validItemIds.has(heldItemFilter)
        ) {
            setHeldItemFilter(HELD_ITEM_FILTER_ANY_ITEM);
        }
    }, [heldItemFilter, itemOptions]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (
            hidden ||
            searching ||
            !selection ||
            !initialSeedIsValid ||
            !advanceRangeIsValid ||
            advanceSearchSpaceTooLarge ||
            !hasUsableOffset
        ) {
            return;
        }

        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        setRows([]);
        setSearching(true);
        setHasSearched(true);
        setSearchError(undefined);

        const search = async () => {
            try {
                const tenLines = await fetchTenLines();
                const seeds: FRLGContiguousSeedEntry[] = [
                    {
                        initialSeed: parseInt(initialSeed, 16),
                        seedTime: 0,
                        settings: "",
                    },
                ];
                await tenLines.check_seeds_wild(
                    seeds,
                    advanceRange,
                    [0, 0],
                    0,
                    Game.FireRed,
                    0,
                    0,
                    ENCOUNTER_CATEGORY,
                    selection.locationIndex,
                    selection.speciesForm,
                    WILD_1,
                    255,
                    255,
                    -1,
                    255,
                    UNFILTERED_IV_RANGES,
                    proxy((results: ExtendedWildGeneratorState[]) => {
                        if (requestIdRef.current !== requestId) {
                            return;
                        }

                        const matchingRows = results.filter((row) => {
                            const prediction = predictFrlgHeldItemAtOffsets({
                                species: row.species,
                                iv2EndSeed: row.iv2EndSeed,
                                offsets: searchOffsets,
                            });
                            return matchesFrlgHeldItemSearchFilter(
                                prediction,
                                heldItemFilter
                            );
                        });

                        setRows((currentRows) => {
                            const merged = new Map(
                                currentRows.map((row) => [resultKey(row), row])
                            );
                            for (const row of matchingRows) {
                                if (merged.size >= RESULT_LIMIT) {
                                    break;
                                }
                                merged.set(resultKey(row), row);
                            }
                            return [...merged.values()].sort(
                                (left, right) =>
                                    left.advances - right.advances ||
                                    left.method - right.method
                            );
                        });
                    }),
                    proxy(() => {})
                );
            } catch (error) {
                if (requestIdRef.current === requestId) {
                    console.error("FRLG held-item search failed", error);
                    setSearchError(
                        error instanceof Error ? error.message : String(error)
                    );
                }
            } finally {
                if (requestIdRef.current === requestId) {
                    setSearching(false);
                }
            }
        };

        void search();
    };

    if (hidden) {
        return null;
    }

    return (
        <Box component="form" onSubmit={handleSubmit} sx={sx}>
            <Typography variant="h5" component="h1" sx={{ mt: 2 }}>
                {t("heldItems.pageTitle")}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
                {t("heldItems.pageDescription")}
            </Typography>
            <Alert severity="info" sx={{ my: 1, textAlign: "left" }}>
                {t("heldItems.separatePageNotice")}
            </Alert>
            <Alert severity="info" sx={{ my: 1, textAlign: "left" }}>
                {t("heldItems.seedAndAdvanceInstruction")}
            </Alert>

            <NumericalInput
                label={t("table.initialSeed")}
                name="heldInitialSeed"
                minimumValue={0}
                maximumValue={0xffff}
                isHex
                value={initialSeed}
                disabled={searching}
                onChange={(_event, value) => {
                    setInitialSeed(value.value.toUpperCase());
                    setInitialSeedIsValid(value.isValid);
                }}
            />
            <RangeInput
                label={t("labels.advances")}
                name="heldAdvanceRange"
                minimumValue={0}
                maximumValue={0xffffffff}
                value={advanceRangeStrings}
                disabled={searching}
                onChange={(_event, value) => {
                    setAdvanceRangeStrings(value.value);
                    setAdvanceRangeIsValid(value.isValid);
                }}
            />
            {advanceSearchSpaceTooLarge && (
                <Alert severity="warning" sx={{ my: 1 }}>
                    {t("heldItems.advanceSearchTooLarge", {
                        count: advanceCount.toLocaleString(),
                        limit: MAX_ADVANCES_PER_SEARCH.toLocaleString(),
                    })}
                </Alert>
            )}

            <TextField
                label={t("heldItems.searchMode")}
                margin="normal"
                value={searchMode}
                onChange={(event) =>
                    setSearchMode(event.target.value as FrlgHeldSearchMode)
                }
                select
                fullWidth
                disabled={searching}
            >
                {SEARCH_MODE_OPTIONS.map((modeOption) => (
                    <MenuItem key={modeOption} value={modeOption}>
                        {t(
                            modeOption === FRLG_HELD_SEARCH_MODE_H1_STABLE
                                ? "heldItems.searchModeH1Stable"
                                : "heldItems.searchModeAllMethods"
                        )}
                    </MenuItem>
                ))}
            </TextField>
            <Alert severity="info" sx={{ my: 1, textAlign: "left" }}>
                {t(
                    searchMode === FRLG_HELD_SEARCH_MODE_H1_STABLE
                        ? "heldItems.searchModeH1StableHelp"
                        : "heldItems.searchModeAllMethodsHelp"
                )}
            </Alert>

            <FrlgHeldEncounterSelector
                active={!hidden && !searching}
                value={selection}
                onChange={setSelection}
            />

            <NumericalInput
                label={t("heldItems.standardOffset")}
                name="heldStandardOffset"
                minimumValue={0}
                maximumValue={0xffffffff}
                value={standardOffset}
                disabled={searching}
                onChange={(_event, value) => {
                    setStandardOffset(value.value);
                    setStandardOffsetIsValid(value.isValid);
                }}
            />
            <Alert
                severity={presetProfile ? "info" : "warning"}
                sx={{ my: 1, textAlign: "left" }}
            >
                {presetProfile
                    ? t("heldItems.offsetPresetAvailable", {
                          offset: String(presetProfile.baseOffset),
                          offsets: searchOffsets
                              .map((offset) => `+${offset}`)
                              .join(" / "),
                      })
                    : t("heldItems.offsetPresetUnknown")}
            </Alert>

            {selection && (
                <FrlgHeldItemNotice
                    profileSet={
                        FRLG_HELD_PROFILE_FIRE_RED_ENGLISH_SWEET_SCENT
                    }
                    game={Game.FireRed}
                    encounterCategory={ENCOUNTER_CATEGORY}
                    location={selection.locationId}
                    method={WILD_1}
                    species={selection.speciesForm}
                />
            )}

            <TextField
                label={t("heldItems.filter")}
                margin="normal"
                value={heldItemFilter}
                onChange={(event) =>
                    setHeldItemFilter(Number(event.target.value))
                }
                select
                fullWidth
                disabled={searching || !selection || !hasUsableOffset}
                helperText={
                    selection && !hasUsableOffset
                        ? t("heldItems.offsetRequired")
                        : undefined
                }
            >
                <MenuItem value={HELD_ITEM_FILTER_ANY}>
                    {t("heldItems.filterAny")}
                </MenuItem>
                <MenuItem value={HELD_ITEM_FILTER_ANY_ITEM}>
                    {t("heldItems.filterAnyItem")}
                </MenuItem>
                {itemOptions.map(({ itemId, percent }) => (
                    <MenuItem key={itemId} value={itemId}>
                        {getFrlgHeldItemName(locale, itemId)} ({percent}%)
                    </MenuItem>
                ))}
            </TextField>

            <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ my: 2 }}
                disabled={
                    searching ||
                    !selection ||
                    !initialSeedIsValid ||
                    !advanceRangeIsValid ||
                    advanceSearchSpaceTooLarge ||
                    !hasUsableOffset
                }
            >
                {searching ? t("common.searching") : t("common.submit")}
            </Button>

            {searchError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {t("heldItems.searchFailed", { error: searchError })}
                </Alert>
            )}
            {hasSearched && !searching && rows.length === 0 && !searchError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {t("heldItems.noResults")}
                </Alert>
            )}
            {rows.length > 0 && selection && (
                <>
                    <Typography sx={{ mb: 1 }}>
                        {t("heldItems.resultCount", {
                            count: String(rows.length),
                            limit: String(RESULT_LIMIT),
                        })}
                    </Typography>
                    <FrlgHeldItemResultsTable
                        rows={rows}
                        standardOffset={standardOffsetValue}
                        searchMode={searchMode}
                    />
                </>
            )}
        </Box>
    );
}
