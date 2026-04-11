import { startTransition, useMemo, useRef, useState } from "react";

import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    MenuItem,
    type SxProps,
    TextField,
    type Theme,
} from "@mui/material";

import fetchTenLines, {
    COMBINED_WILD_METHOD,
    fetchSeedData,
    resetTenLines,
    SEED_IDENTIFIER_TO_GAME,
    STATIC_2,
    STATIC_4,
} from "../tenLines";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import { proxy } from "comlink";
import {
    type ExtendedSearcherState,
    type ExtendedWildSearcherState,
} from "../tenLines/generated";
import React from "react";
import { flushSync } from "react-dom";
import { getAllGameOptions, useI18n } from "../i18n";
import IvEntry from "./IvEntry";
import StaticEncounterSelector from "./StaticEncounterSelector";
import { useSearchParams } from "react-router-dom";
import WildEncounterSelector from "./WildEncounterSelector";
import SearcherTable from "./SearcherTable";

export interface SearcherFormState {
    shininess: number;
    natures: number[];
    gender: number;
    hiddenPower: number;
    ivRangeStrings: [string, string][];
    staticCategory: number;
    staticPokemon: number;
    wildCategory: number;
    wildLocation: number;
    wildPokemon: number;
    wildLead: number;
    method: number;
}

export interface SearcherURLState {
    game: string;
    trainerID: string;
    secretID: string;
    reachableAdvancesFilter: string;
    sound: string;
    advancesMin: string;
    advancesMax: string;
}

function useSearcherURLState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const game = searchParams.get("game") || "r_painting";
    const trainerID = searchParams.get("trainerID") || "0";
    const secretID = searchParams.get("secretID") || "0";
    const sound = searchParams.get("sound") || "mono";
    const reachableAdvancesFilter =
        searchParams.get("reachableAdvancesFilter") ||
        (searchParams.has("advancesMin") || searchParams.has("advancesMax")
            ? "true"
            : "false");
    const advancesMin = searchParams.get("advancesMin") || "0";
    const advancesMax = searchParams.get("advancesMax") || "4294967295";
    const setSearcherURLState = (state: Partial<SearcherURLState>) => {
        setSearchParams((prev) => {
            for (const [key, value] of Object.entries(state)) {
                prev.set(key, value);
            }
            return prev;
        });
    };
    return {
        game,
        trainerID,
        secretID,
        sound,
        reachableAdvancesFilter,
        advancesMin,
        advancesMax,
        setSearcherURLState,
    };
}

type SearcherRowWithAdvances =
    | (ExtendedSearcherState & { reachableAdvances?: number })
    | (ExtendedWildSearcherState & { reachableAdvances?: number });

export default function CalibrationForm({
    sx,
    hidden,
}: {
    sx?: SxProps<Theme>;
    hidden?: boolean;
}) {
    const { t, resources } = useI18n();
    const [searcherFormState, setSearcherFormState] =
        useState<SearcherFormState>({
            shininess: 255,
            natures: [],
            gender: 255,
            hiddenPower: -1,
            ivRangeStrings: [
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
            ],
            staticCategory: 0,
            staticPokemon: 0,
            wildCategory: 0,
            wildLocation: 0,
            wildPokemon: 0,
            wildLead: 255,
            method: 1,
        });
    const {
        game,
        trainerID,
        secretID,
        sound,
        reachableAdvancesFilter,
        advancesMin,
        advancesMax,
        setSearcherURLState,
    } =
        useSearcherURLState();

    const [rows, setRows] = useState<SearcherRowWithAdvances[]>([]);
    const [searching, setSearching] = useState(false);
    const searchSessionRef = useRef(0);
    const finishSearchSession = (searchSession: number) => {
        if (searchSessionRef.current === searchSession) {
            searchSessionRef.current = 0;
            flushSync(() => {
                setSearching(false);
            });
        }
    };

    const [ivRangesAreValid, setIvRangesAreValid] = useState(true);
    const ivRanges = ivRangesAreValid
        ? searcherFormState.ivRangeStrings.map((range) => [
            parseInt(range[0], 10),
            parseInt(range[1], 10),
        ])
        : [];

    const [trainerIDIsValid, setTrainerIDIsValid] = useState(true);
    const [secretIDIsValid, setSecretIDIsValid] = useState(true);
    const [requiredAdvancesRangeIsValid, setRequiredAdvancesRangeIsValid] =
        useState(true);

    const isReachableAdvancesFilterEnabled =
        reachableAdvancesFilter === "true";
    const requiredAdvancesRange = useMemo(
        () =>
            requiredAdvancesRangeIsValid
                ? [parseInt(advancesMin, 10), parseInt(advancesMax, 10)]
                : [0, 0],
        [advancesMin, advancesMax, requiredAdvancesRangeIsValid]
    );

    const isNotSubmittable =
        searching ||
        !trainerIDIsValid ||
        !secretIDIsValid ||
        !ivRangesAreValid ||
        (isReachableAdvancesFilterEnabled && !requiredAdvancesRangeIsValid);

    const selectedNatureSet = useMemo(
        () => new Set(searcherFormState.natures),
        [searcherFormState.natures]
    );
    const visibleRows = useMemo(
        () =>
            searcherFormState.natures.length === 0
                ? rows
                : rows.filter((row) => selectedNatureSet.has(row.nature)),
        [rows, searcherFormState.natures, selectedNatureSet]
    );
    const submittedNatureFilters =
        searcherFormState.natures.length === 0
            ? [-1]
            : searcherFormState.natures;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isNotSubmittable) return;
        const submit = async () => {
            const searchSession = searchSessionRef.current + 1;
            searchSessionRef.current = searchSession;
            const isCurrentSearch = () =>
                searchSessionRef.current === searchSession;
            flushSync(() => {
                setRows([]);
                setSearching(true);
            });
            try {
                const tenLines = await fetchTenLines();
                if (!isCurrentSearch()) {
                    return;
                }
                const seedData = game.endsWith("painting")
                    ? new Uint8Array()
                    : await fetchSeedData(game);
                const filterResultsByRequiredAdvances = async <
                    T extends ExtendedSearcherState | ExtendedWildSearcherState,
                >(
                    results: T[]
                ) => {
                    if (!isReachableAdvancesFilterEnabled) {
                        return results as SearcherRowWithAdvances[];
                    }
                    const reachabilityResults =
                        await tenLines.filter_reachable_target_seeds_with_sound(
                            results.map((result) => result.seed),
                            requiredAdvancesRange,
                            game,
                            0,
                            isFRLG ? sound : "",
                            seedData
                        );
                    return results
                        .map((result, index) => ({
                            ...result,
                            reachableAdvances: reachabilityResults[index].reachable
                                ? reachabilityResults[index].advances
                                : undefined,
                        }))
                        .filter(
                            (_result, index) =>
                                reachabilityResults[index].reachable
                        ) as SearcherRowWithAdvances[];
                };
                const appendResults = (results: SearcherRowWithAdvances[]) => {
                    if (!isCurrentSearch()) {
                        return;
                    }
                    startTransition(() => {
                        setRows((rows) => {
                            if (rows.length > 1000 || results.length === 0) {
                                return rows;
                            }
                            return [...rows, ...results];
                        });
                    });
                };
                const searchingCallback = proxy(() => {});

                for (const natureFilter of submittedNatureFilters) {
                    if (!isCurrentSearch()) {
                        return;
                    }
                    if (isStatic) {
                        await tenLines.search_seeds_static(
                            SEED_IDENTIFIER_TO_GAME[game],
                            parseInt(trainerID),
                            parseInt(secretID),
                            searcherFormState.staticCategory,
                            searcherFormState.staticPokemon,
                            searcherFormState.method,
                            searcherFormState.shininess,
                            natureFilter,
                            searcherFormState.gender,
                            searcherFormState.hiddenPower,
                            ivRanges,
                            proxy(async (results: ExtendedSearcherState[]) => {
                                appendResults(
                                    await filterResultsByRequiredAdvances(results)
                                );
                            }),
                            searchingCallback
                        );
                    } else {
                        await tenLines.search_seeds_wild(
                            SEED_IDENTIFIER_TO_GAME[game],
                            parseInt(trainerID),
                            parseInt(secretID),
                            searcherFormState.wildCategory,
                            searcherFormState.wildLocation,
                            searcherFormState.wildPokemon,
                            searcherFormState.method,
                            searcherFormState.wildLead,
                            searcherFormState.shininess,
                            natureFilter,
                            searcherFormState.gender,
                            searcherFormState.hiddenPower,
                            ivRanges,
                            proxy(async (results: ExtendedWildSearcherState[]) => {
                                appendResults(
                                    await filterResultsByRequiredAdvances(results)
                                );
                            }),
                            searchingCallback
                        );
                    }
                }
            } catch {
                // Stopping a search terminates the worker and rejects the in-flight request.
            } finally {
                finishSearchSession(searchSession);
            }
        };
        submit().catch(() => {
            finishSearchSession(searchSessionRef.current);
        });
    };

    const handleStopSearch = () => {
        searchSessionRef.current = 0;
        flushSync(() => {
            setSearching(false);
        });
        setTimeout(() => {
            resetTenLines();
        }, 0);
    };

    const isStatic = searcherFormState.method <= STATIC_4;
    const isFRLG = game.startsWith("fr") || game.startsWith("lg");
    const isFRLGE = isFRLG || game.startsWith("e_");

    if (searcherFormState.staticCategory == 3 && !isFRLG) {
        searcherFormState.staticCategory = 0;
        setSearcherFormState(searcherFormState);
    }
    if (searcherFormState.staticCategory == 6 && !isFRLGE) {
        searcherFormState.staticCategory = 0;
        setSearcherFormState(searcherFormState);
    }
    if (searcherFormState.staticCategory == 8 && isFRLG) {
        searcherFormState.staticCategory = 0;
        setSearcherFormState(searcherFormState);
    }

    if (hidden) {
        return null;
    }

    return (
        <Box component="form" onSubmit={handleSubmit} sx={sx}>
            <TextField
                label={t("labels.game")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) =>
                    setSearcherURLState({
                        game: event.target.value,
                    })
                }
                value={game}
                select
                fullWidth
            >
                {getAllGameOptions(t).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
            <Box sx={{ flexDirection: "row", display: "flex" }}>
                <NumericalInput
                    label={t("labels.trainerId")}
                    margin="normal"
                    onChange={(_event, value) => {
                        setSearcherURLState({ trainerID: value.value });
                        setTrainerIDIsValid(value.isValid);
                    }}
                    value={trainerID}
                    minimumValue={0}
                    maximumValue={65535}
                    isHex={false}
                    name="trainerID"
                />
                <span
                    style={{
                        margin: "0 10px",
                        alignSelf: "center",
                    }}
                >
                    /
                </span>
                <NumericalInput
                    label={t("labels.secretId")}
                    margin="normal"
                    onChange={(_event, value) => {
                        setSearcherURLState({ secretID: value.value });
                        setSecretIDIsValid(value.isValid);
                    }}
                    value={secretID}
                    minimumValue={0}
                    maximumValue={65535}
                    isHex={false}
                    name="secretID"
                />
            </Box>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={isReachableAdvancesFilterEnabled}
                        onChange={(event) =>
                            setSearcherURLState({
                                reachableAdvancesFilter:
                                    event.target.checked.toString(),
                            })
                        }
                    />
                }
                label={t("messages.filterByReachableAdvances")}
            />
            {isReachableAdvancesFilterEnabled && isFRLG && (
                <TextField
                    label={t("labels.sound")}
                    margin="normal"
                    style={{ textAlign: "left" }}
                    onChange={(event) =>
                        setSearcherURLState({
                            sound: event.target.value,
                        })
                    }
                    value={sound}
                    select
                    fullWidth
                >
                    <MenuItem value="mono">{t("common.mono")}</MenuItem>
                    <MenuItem value="stereo">{t("common.stereo")}</MenuItem>
                </TextField>
            )}
            {isReachableAdvancesFilterEnabled && (
                <RangeInput
                    label={t("labels.allowedAdvances")}
                    name="requiredAdvances"
                    minimumValue={0}
                    maximumValue={4294967295}
                    value={[advancesMin, advancesMax]}
                    onChange={(_, value) => {
                        setSearcherURLState({
                            advancesMin: value.value[0],
                            advancesMax: value.value[1],
                        });
                        setRequiredAdvancesRangeIsValid(value.isValid);
                    }}
                />
            )}
            <TextField
                label={t("labels.method")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setSearcherFormState((data) => ({
                        ...data,
                        method: parseInt(event.target.value),
                    }));
                }}
                value={searcherFormState.method}
                select
                fullWidth
            >
                {Object.entries(resources.methods)
                    .filter(([value]) => parseInt(value) != STATIC_2)
                    .map(([value, name], index) => (
                        <MenuItem key={index} value={parseInt(value)}>
                            {name}
                        </MenuItem>
                    ))}
            </TextField>
            {isStatic && (
                <StaticEncounterSelector
                    staticCategory={searcherFormState.staticCategory}
                    staticPokemon={searcherFormState.staticPokemon}
                    game={SEED_IDENTIFIER_TO_GAME[game]}
                    onChange={(staticCategory, staticPokemon) => {
                        setSearcherFormState((data) => ({
                            ...data,
                            staticCategory,
                            staticPokemon,
                        }));
                    }}
                />
            )}
            {!isStatic && (
                <WildEncounterSelector
                    wildCategory={searcherFormState.wildCategory}
                    wildLocation={searcherFormState.wildLocation}
                    wildPokemon={searcherFormState.wildPokemon}
                    wildLead={searcherFormState.wildLead}
                    game={SEED_IDENTIFIER_TO_GAME[game]}
                    onChange={(
                        wildCategory,
                        wildLocation,
                        wildPokemon,
                        wildLead
                    ) => {
                        setSearcherFormState((data) => ({
                            ...data,
                            wildCategory,
                            wildLocation,
                            wildPokemon,
                            wildLead,
                        }));
                    }}
                    shouldFilterPokemon={true}
                    allowAnyPokemon
                    isSearcher
                />
            )}
            <TextField
                label={t("labels.shininess")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setSearcherFormState((data) => ({
                        ...data,
                        shininess: parseInt(event.target.value),
                    }));
                }}
                value={searcherFormState.shininess}
                select
                fullWidth
            >
                <MenuItem value="255">{t("common.any")}</MenuItem>
                <MenuItem value="1">{t("options.star")}</MenuItem>
                <MenuItem value="2">{t("options.square")}</MenuItem>
                <MenuItem value="3">{t("options.starSquare")}</MenuItem>
            </TextField>
            <Autocomplete
                multiple
                disableCloseOnSelect
                options={resources.natures.map((_nature, index) => index)}
                value={searcherFormState.natures}
                onChange={(_event, value) => {
                    setSearcherFormState((data) => ({
                        ...data,
                        natures: value,
                    }));
                }}
                getOptionLabel={(option) => resources.natures[option]}
                renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    const isSelected = selectedNatureSet.has(option);
                    return (
                        <Box
                            component="li"
                            key={key}
                            {...optionProps}
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                width: "100%",
                            }}
                        >
                            <span>{resources.natures[option]}</span>
                            <span
                                aria-hidden="true"
                                style={{
                                    visibility: isSelected ? "visible" : "hidden",
                                    fontWeight: 700,
                                }}
                            >
                                {"\u2713"}
                            </span>
                        </Box>
                    );
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={t("labels.nature")}
                        margin="normal"
                        style={{ textAlign: "left" }}
                        placeholder={
                            searcherFormState.natures.length === 0
                                ? t("common.any")
                                : undefined
                        }
                    />
                )}
                fullWidth
            />
            <TextField
                label={t("labels.gender")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setSearcherFormState((data) => ({
                        ...data,
                        gender: parseInt(event.target.value),
                    }));
                }}
                value={searcherFormState.gender}
                select
                fullWidth
            >
                <MenuItem value="255">{t("common.any")}</MenuItem>
                {resources.genders.slice(0, 2).map((gender, index) => (
                    <MenuItem key={index} value={index}>
                        {gender}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                label={t("labels.hiddenPower")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setSearcherFormState((data) => ({
                        ...data,
                        hiddenPower: parseInt(event.target.value),
                    }));
                }}
                value={searcherFormState.hiddenPower}
                select
                fullWidth
            >
                <MenuItem value="-1">{t("common.any")}</MenuItem>
                {resources.types.map((type, index) => (
                    <MenuItem key={index} value={index}>
                        {type}
                    </MenuItem>
                ))}
            </TextField>
            <IvEntry
                onChange={(_event, value) => {
                    setIvRangesAreValid(value.isValid);
                    setSearcherFormState((data) => ({
                        ...data,
                        ivRangeStrings: value.value,
                    }));
                }}
                value={searcherFormState.ivRangeStrings}
            />
            <Button
                variant="contained"
                color={searching ? "error" : "primary"}
                type={searching ? "button" : "submit"}
                onClick={searching ? handleStopSearch : undefined}
                disabled={!searching && isNotSubmittable}
                fullWidth
            >
                {searching ? t("common.stopSearch") : t("common.submit")}
            </Button>
            <SearcherTable
                rows={visibleRows}
                isStatic={isStatic}
                isMultiMethod={
                    searcherFormState.method === COMBINED_WILD_METHOD
                }
                showRequiredAdvances={isReachableAdvancesFilterEnabled}
            />
        </Box>
    );
}
