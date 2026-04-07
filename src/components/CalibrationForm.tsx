import { useEffect, useMemo, useState } from "react";

import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    createFilterOptions,
    Dialog,
    DialogContent,
    FormControlLabel,
    MenuItem,
    TextField,
} from "@mui/material";

import fetchTenLines, {
    COMBINED_WILD_METHOD,
    fetchSeedData,
    fixGameConsole,
    frameToMS,
    hexSeed,
    SEED_IDENTIFIER_TO_GAME,
    STATIC_2,
    STATIC_4,
} from "../tenLines";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import { proxy } from "comlink";
import CalibrationTable from "./CalibrationTable";
import {
    type ExtendedGeneratorState,
    type ExtendedWildGeneratorState,
    type FRLGContiguousSeedEntry,
} from "../tenLines/generated";
import React from "react";
import {
    getAllGameOptions,
    getConsoleOptions,
    useI18n,
} from "../i18n";
import IvEntry from "./IvEntry";
import IvCalculator from "./IvCalculator";
import StaticEncounterSelector from "./StaticEncounterSelector";
import { useSearchParams } from "react-router-dom";
import WildEncounterSelector from "./WildEncounterSelector";
import { fetchBingo, getBingoActive, useBingoBoard } from "./BingoPage";

export interface CalibrationFormState {
    seedLeewayString: string;
    shininess: number;
    nature: number;
    gender: number;
    ivRangeStrings: [string, string][];
    ivCalculatorText: string;
    staticCategory: number;
    staticPokemon: number;
    wildCategory: number;
    wildLocation: number;
    wildPokemon: number;
    wildLead: number;
    shouldFilterPokemon: boolean;
    method: number;
}

export interface CalibrationURLState {
    game: string;
    sound: string;
    buttonMode: string;
    button: string;
    heldButton: string;
    gameConsole: string;
    targetInitialSeed: string;
    advancesMin: string;
    advancesMax: string;
    ttvAdvancesMin: string;
    ttvAdvancesMax: string;
    offset: string;
    overworldFrames: string;
    trainerID: string;
    secretID: string;
    teachyTVMode: string;
}

function useCalibrationURLState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const game = searchParams.get("game") || "r_painting";
    const sound = searchParams.get("sound") || "mono";
    const buttonMode = searchParams.get("buttonMode") || "a";
    const button = searchParams.get("button") || "a";
    const heldButton = searchParams.get("heldButton") || "none";
    const gameConsole = fixGameConsole(game, searchParams.get("gameConsole") || "GBA");
    const advancesMin = searchParams.get("advancesMin") || "0";
    const advancesMax = searchParams.get("advancesMax") || "100";
    const ttvAdvancesMin = searchParams.get("ttvAdvancesMin") || "0";
    const ttvAdvancesMax = searchParams.get("ttvAdvancesMax") || "100";
    const offset = searchParams.get("offset") || "0";
    const overworldFrames = gameConsole.startsWith("NX") ? searchParams.get("overworldFrames") || "600" : "0";
    const trainerID = searchParams.get("trainerID") || "0";
    const secretID = searchParams.get("secretID") || "0";
    const teachyTVMode = !gameConsole.startsWith("NX") ? searchParams.get("teachyTVMode") || "false" : "false";
    const targetSeedValue =
        parseInt(searchParams.get("targetInitialSeed") || "DEAD", 16) ?? 0xdead;
    const setCalibrationURLState = (state: Partial<CalibrationURLState>) => {
        setSearchParams((prev) => {
            for (const [key, value] of Object.entries(state)) {
                prev.set(key, value);
            }
            return prev;
        });
    };
    return {
        game,
        sound,
        buttonMode,
        button,
        heldButton,
        gameConsole,
        targetSeedValue,
        advancesMin,
        advancesMax,
        ttvAdvancesMin,
        ttvAdvancesMax,
        offset,
        overworldFrames,
        trainerID,
        secretID,
        teachyTVMode,
        setCalibrationURLState,
    };
}

export default function CalibrationForm({
    sx,
    hidden,
}: {
    sx?: any;
    hidden?: boolean;
}) {
    const { t, resources } = useI18n();
    const [calibrationFormState, setCalibrationFormState] =
        useState<CalibrationFormState>({
            seedLeewayString: "20",
            shininess: 255,
            nature: -1,
            gender: 255,
            ivRangeStrings: [
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
                ["0", "31"],
            ],
            ivCalculatorText: "",
            staticCategory: 0,
            staticPokemon: 0,
            wildCategory: 0,
            wildLocation: 0,
            wildPokemon: 0,
            wildLead: 255,
            shouldFilterPokemon: false,
            method: 1,
        });
    const {
        game,
        sound,
        buttonMode,
        button,
        heldButton,
        gameConsole,
        targetSeedValue,
        advancesMin,
        advancesMax,
        ttvAdvancesMin,
        ttvAdvancesMax,
        offset,
        overworldFrames,
        trainerID,
        secretID,
        teachyTVMode,
        setCalibrationURLState,
    } = useCalibrationURLState();

    const [_bingoBoard, setBingoBoard, _bingoCounters, setBingoCounters] =
        useBingoBoard();

    const bingoActive = getBingoActive();

    const isStatic = calibrationFormState.method <= STATIC_4;
    const isFRLG = game.startsWith("fr") || game.startsWith("lg");
    const isFRLGE = isFRLG || game.startsWith("e_");
    const isSwitch = game.endsWith("nx");

    const [rows, setRows] = useState<
        ExtendedGeneratorState[] | ExtendedWildGeneratorState[]
    >([]);
    const [searching, setSearching] = useState(false);

    const [seedLeewayIsValid, setSeedLeewayIsValid] = useState(true);
    const seedLeeway = seedLeewayIsValid
        ? parseInt(calibrationFormState.seedLeewayString, 10)
        : 0;
    const [advancesRangeIsValid, setAdvancesRangeIsValid] = useState(true);
    const advancesRange = advancesRangeIsValid
        ? [parseInt(advancesMin, 10), parseInt(advancesMax, 10)]
        : [0, 0];
    const isTeachyTVMode = teachyTVMode === "true" && isFRLG;
    const [ttvAdvancesRangeIsValid, setTTVAdvancesRangeIsValid] =
        useState(true);
    const ttvAdvancesRange = !isTeachyTVMode
        ? [0, 0]
        : ttvAdvancesRangeIsValid
            ? [parseInt(ttvAdvancesMin, 10), parseInt(ttvAdvancesMax, 10)]
            : [0, 0];
    const [ivRangesAreValid, setIvRangesAreValid] = useState(true);
    const [offsetIsValid, setOffsetIsValid] = useState(true);
    const [overworldFramesIsValid, setOverworldFramesIsValid] = useState(true);
    const ivRanges =
        calibrationFormState.nature == -1
            ? [
                [0, 31],
                [0, 31],
                [0, 31],
                [0, 31],
                [0, 31],
                [0, 31],
            ]
            : ivRangesAreValid
                ? calibrationFormState.ivRangeStrings.map((range) => [
                    parseInt(range[0], 10),
                    parseInt(range[1], 10),
                ])
                : [];

    const [trainerIDIsValid, setTrainerIDIsValid] = useState(true);
    const [secretIDIsValid, setSecretIDIsValid] = useState(true);

    const [seedList, setSeedList] = useState<FRLGContiguousSeedEntry[]>([]);
    const [seedDialogOpen, setSeedDialogOpen] = useState(false);

    const isNotSubmittable =
        searching ||
        seedList.length === 0 ||
        !trainerIDIsValid ||
        !secretIDIsValid ||
        !seedLeewayIsValid ||
        !advancesRangeIsValid ||
        (isTeachyTVMode && !ttvAdvancesRangeIsValid) ||
        !ivRangesAreValid ||
        !offsetIsValid ||
        !overworldFramesIsValid;

    useEffect(() => {
        const fetchSeedList = async () => {
            if (!isFRLG) {
                setSeedList(
                    [...Array(0x10000).keys()].map((seed) => ({
                        initialSeed: seed,
                        seedTime: seed * 16,
                    }))
                );
                return;
            }
            const seedData = await fetchSeedData(game);
            const tenLines = await fetchTenLines();
            const seedList = await tenLines.get_contiguous_seed_list(
                seedData,
                `${sound}_${buttonMode}_${button}`,
                game,
                heldButton
            );
            setSeedList(seedList);
            if (
                seedList.findIndex(
                    (seed: FRLGContiguousSeedEntry) =>
                        seed.initialSeed === targetSeedValue
                ) == -1
            ) {
                setCalibrationURLState({
                    targetInitialSeed: hexSeed(
                        seedList.length > 0
                            ? seedList[Math.min(51, seedList.length - 1)]
                                .initialSeed
                            : 0xdead,
                        16
                    ),
                });
            }
        };
        fetchSeedList();
    }, [game, sound, buttonMode, button, heldButton]);

    const targetSeedIndex = useMemo(
        () =>
            seedList.findIndex((seed) => seed.initialSeed === targetSeedValue),
        [seedList, targetSeedValue]
    );

    const targetSeed: FRLGContiguousSeedEntry =
        targetSeedIndex === -1
            ? { initialSeed: 0xdead, seedTime: 0 }
            : seedList[targetSeedIndex];

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        runSearch();
    };

    const runSearch = () => {
        if (isNotSubmittable) {
            setRows([]);
            return;
        }
        const searchSeeds = seedList.slice(
            Math.max(0, targetSeedIndex - seedLeeway),
            Math.min(seedList.length, targetSeedIndex + seedLeeway + 1)
        );
        const submit = async () => {
            const tenLines = await fetchTenLines();
            setRows([]);
            setSearching(true);
            if (isStatic) {
                await tenLines.check_seeds_static(
                    searchSeeds,
                    advancesRange,
                    ttvAdvancesRange,
                    parseInt(offset),
                    SEED_IDENTIFIER_TO_GAME[game],
                    parseInt(trainerID),
                    parseInt(secretID),
                    calibrationFormState.staticCategory,
                    calibrationFormState.staticPokemon,
                    calibrationFormState.method,
                    calibrationFormState.shininess,
                    calibrationFormState.nature,
                    calibrationFormState.gender,
                    ivRanges,
                    proxy((results: ExtendedGeneratorState[]) => {
                        setRows((rows) => {
                            if (rows.length > 1000 || results.length === 0) {
                                return rows;
                            }
                            return [...rows, ...results];
                        });
                    }),
                    proxy(setSearching)
                );
            } else {
                await tenLines.check_seeds_wild(
                    searchSeeds,
                    advancesRange,
                    ttvAdvancesRange,
                    parseInt(offset),
                    SEED_IDENTIFIER_TO_GAME[game],
                    parseInt(trainerID),
                    parseInt(secretID),
                    calibrationFormState.wildCategory,
                    calibrationFormState.wildLocation,
                    !calibrationFormState.shouldFilterPokemon
                        ? -1
                        : calibrationFormState.wildPokemon,
                    calibrationFormState.method,
                    calibrationFormState.wildLead,
                    calibrationFormState.shininess,
                    calibrationFormState.nature,
                    calibrationFormState.gender,
                    ivRanges,
                    proxy((results: ExtendedWildGeneratorState[]) => {
                        setRows((rows) => {
                            if (rows.length > 1000 || results.length === 0) {
                                return rows;
                            }
                            return [...rows, ...results];
                        });
                    }),
                    proxy(setSearching)
                );
            }
        };
        submit();
    };

    const targetSeedFilterOptions = createFilterOptions({
        limit: 100,
        // don't match based on ms
        stringify: (option: FRLGContiguousSeedEntry) =>
            `${hexSeed(option.initialSeed, 16)}`,
    });

    if (calibrationFormState.staticCategory == 3 && !isFRLG) {
        calibrationFormState.staticCategory = 0;
        setCalibrationFormState(calibrationFormState);
    }
    if (calibrationFormState.staticCategory == 6 && !isFRLGE) {
        calibrationFormState.staticCategory = 0;
        setCalibrationFormState(calibrationFormState);
    }
    if (calibrationFormState.staticCategory == 8 && isFRLG) {
        calibrationFormState.staticCategory = 0;
        setCalibrationFormState(calibrationFormState);
    }

    useEffect(() => {
        if (hidden) {
            return;
        }
        runSearch();
    }, [
        hidden,
        seedList,
        targetSeedIndex,
        seedLeeway,
        advancesMin,
        advancesMax,
        ttvAdvancesMin,
        ttvAdvancesMax,
        offset,
        game,
        trainerID,
        secretID,
        calibrationFormState.staticCategory,
        calibrationFormState.staticPokemon,
        calibrationFormState.wildCategory,
        calibrationFormState.wildLocation,
        calibrationFormState.wildPokemon,
        calibrationFormState.wildLead,
        calibrationFormState.shouldFilterPokemon,
        calibrationFormState.method,
        calibrationFormState.shininess,
        calibrationFormState.nature,
        calibrationFormState.gender,
        calibrationFormState.seedLeewayString,
        calibrationFormState.ivRangeStrings,
        calibrationFormState.ivCalculatorText,
        teachyTVMode,
        overworldFrames,
        seedLeewayIsValid,
        advancesRangeIsValid,
        ttvAdvancesRangeIsValid,
        ivRangesAreValid,
        offsetIsValid,
        overworldFramesIsValid,
        trainerIDIsValid,
        secretIDIsValid,
    ]);

    if (hidden) {
        return null;
    }

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ sx }}>
            <TextField
                label={t("labels.game")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) =>
                    setCalibrationURLState({
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
            {isFRLG && (
                <React.Fragment>
                    <TextField
                        label={t("labels.sound")}
                        margin="normal"
                        style={{ textAlign: "left" }}
                        onChange={(event) =>
                            setCalibrationURLState({
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
                    <TextField
                        label={t("labels.buttonMode")}
                        margin="normal"
                        style={{ textAlign: "left" }}
                        onChange={(event) =>
                            setCalibrationURLState({
                                buttonMode: event.target.value,
                            })
                        }
                        value={buttonMode}
                        select
                        fullWidth
                    >
                        <MenuItem value="a">L=A</MenuItem>
                        <MenuItem value="h">{t("options.help")}</MenuItem>
                        <MenuItem value="r">LR</MenuItem>
                    </TextField>
                    <TextField
                        label={t("labels.seedButton")}
                        margin="normal"
                        style={{ textAlign: "left" }}
                        onChange={(event) =>
                            setCalibrationURLState({
                                button: event.target.value,
                            })
                        }
                        value={button}
                        select
                        fullWidth
                    >
                        <MenuItem value="a">A</MenuItem>
                        <MenuItem value="start">Start</MenuItem>
                        <MenuItem value="l">L (L=A)</MenuItem>
                    </TextField>
                    <TextField
                        label={t("labels.extraButton")}
                        margin="normal"
                        style={{ textAlign: "left" }}
                        onChange={(event) =>
                            setCalibrationURLState({
                                heldButton: event.target.value,
                            })
                        }
                        value={heldButton}
                        select
                        fullWidth
                    >
                        <MenuItem value="none">{t("common.none")}</MenuItem>
                        <MenuItem value="startup_select">
                            {t("options.startupSelect")}
                        </MenuItem>
                        <MenuItem value="startup_a">{t("options.startupA")}</MenuItem>
                        <MenuItem value="blackout_r">{t("options.blackoutR")}</MenuItem>
                        <MenuItem value="blackout_a">{t("options.blackoutA")}</MenuItem>
                        <MenuItem value="blackout_l">{t("options.blackoutL")}</MenuItem>
                        <MenuItem value="blackout_al">{t("options.blackoutAL")}</MenuItem>
                    </TextField>
                </React.Fragment>
            )}

            <TextField
                label={t("labels.console")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) =>
                    setCalibrationURLState({
                        gameConsole: event.target.value,
                    })
                }
                value={gameConsole}
                select
                fullWidth
            >
                {getConsoleOptions(t, isSwitch).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
            <Autocomplete
                options={seedList}
                value={targetSeed}
                onChange={(_event, newValue) => {
                    setCalibrationURLState({
                        targetInitialSeed: hexSeed(newValue.initialSeed, 16),
                    });
                }}
                getOptionLabel={(item_) => {
                    const item = item_ as FRLGContiguousSeedEntry;
                    return `${hexSeed(item.initialSeed, 16)} (${frameToMS(
                        item.seedTime / 16,
                        gameConsole
                    )}ms)`;
                }}
                filterOptions={targetSeedFilterOptions}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={t("labels.targetSeed")}
                        margin="normal"
                        error={seedList.length === 0}
                        helperText={
                            seedList.length === 0
                                ? t("messages.noKnownSeeds")
                                : undefined
                        }
                    />
                )}
                disablePortal
                disableClearable
                selectOnFocus
                fullWidth
            />
            <Box sx={{ flexDirection: "row", display: "flex" }}>
                <NumericalInput
                    label={t("labels.seedLeeway")}
                    margin="normal"
                    onChange={(_event, value) => {
                        setCalibrationFormState((data) => ({
                            ...data,
                            seedLeewayString: value.value,
                        }));
                        setSeedLeewayIsValid(value.isValid);
                    }}
                    value={calibrationFormState.seedLeewayString}
                    minimumValue={0}
                    maximumValue={10000}
                    isHex={false}
                    name="seedLeeway"
                />
                <Button
                    sx={{ my: 2 }}
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => {
                        setSeedDialogOpen(true);
                    }}
                >
                    {t("common.showSeeds")}
                </Button>
                <Dialog
                    open={seedDialogOpen}
                    onClose={() => {
                        setSeedDialogOpen(false);
                    }}
                >
                    <DialogContent sx={{ minWidth: 150, textAlign: "center" }}>
                        <Box>
                            {seedList
                                .slice(
                                    Math.max(targetSeedIndex - seedLeeway, 0),
                                    Math.min(
                                        targetSeedIndex + seedLeeway + 1,
                                        seedList.length
                                    )
                                )
                                .map((seed, i) => (
                                    <div key={i}>
                                        {hexSeed(seed.initialSeed, 16)}
                                    </div>
                                ))}
                        </Box>
                    </DialogContent>
                </Dialog>
            </Box>
            <RangeInput
                label={isTeachyTVMode ? t("labels.finalAPressFrame") : t("labels.advances")}
                name="advancesRange"
                onChange={(_event, value) => {
                    setCalibrationURLState({
                        advancesMin: value.value[0],
                        advancesMax: value.value[1],
                    });
                    setAdvancesRangeIsValid(value.isValid);
                }}
                value={[advancesMin, advancesMax]}
                minimumValue={0}
                maximumValue={4294967295}
            />
            <NumericalInput
                label={t("labels.offset")}
                name="offset"
                minimumValue={0}
                maximumValue={4294967295}
                onChange={(_, value) => {
                    setCalibrationURLState({
                        offset: value.value,
                    });
                    setOffsetIsValid(value.isValid);
                }}
                value={offset}
            ></NumericalInput>
            {isTeachyTVMode && (
                <RangeInput
                    label={t("labels.teachyTvAdvances")}
                    name="ttvRange"
                    onChange={(_event, value) => {
                        setCalibrationURLState({
                            ttvAdvancesMin: value.value[0],
                            ttvAdvancesMax: value.value[1],
                        });
                        setTTVAdvancesRangeIsValid(value.isValid);
                    }}
                    value={[ttvAdvancesMin, ttvAdvancesMax]}
                    minimumValue={0}
                    maximumValue={4294967295}
                />
            )}
            {isSwitch && (<NumericalInput
                label={t("labels.requiredOverworldFrames")}
                name="overworldFrames"
                minimumValue={0}
                maximumValue={4294967295}
                onChange={(_, value) => {
                    setCalibrationURLState({
                        overworldFrames: value.value,
                    });
                    setOverworldFramesIsValid(value.isValid);
                }}
                value={overworldFrames}
            ></NumericalInput>)}
            {isFRLG && !isSwitch && (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={isTeachyTVMode}
                            onChange={(e) => {
                                setCalibrationURLState({
                                    teachyTVMode: e.target.checked.toString(),
                                });
                            }}
                        />
                    }
                    label={t("labels.teachyTvMode")}
                />
            )}
            <Box sx={{ flexDirection: "row", display: "flex" }}>
                <NumericalInput
                    label={t("labels.trainerId")}
                    margin="normal"
                    onChange={(_event, value) => {
                        setCalibrationURLState({ trainerID: value.value });
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
                        setCalibrationURLState({ secretID: value.value });
                        setSecretIDIsValid(value.isValid);
                    }}
                    value={secretID}
                    minimumValue={0}
                    maximumValue={65535}
                    isHex={false}
                    name="secretID"
                />
            </Box>
            <TextField
                label={t("labels.method")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setCalibrationFormState((data) => ({
                        ...data,
                        method: parseInt(event.target.value),
                    }));
                }}
                value={calibrationFormState.method}
                select
                fullWidth
            >
                {Object.entries(resources.methods)
                    .filter(([value, _name]) => parseInt(value) != STATIC_2)
                    .map(([value, name], index) => (
                        <MenuItem key={index} value={parseInt(value)}>
                            {name}
                        </MenuItem>
                    ))}
            </TextField>
            {isStatic && (
                <StaticEncounterSelector
                    staticCategory={calibrationFormState.staticCategory}
                    staticPokemon={calibrationFormState.staticPokemon}
                    game={SEED_IDENTIFIER_TO_GAME[game]}
                    onChange={(staticCategory, staticPokemon) => {
                        setCalibrationFormState((data) => ({
                            ...data,
                            staticCategory,
                            staticPokemon,
                        }));
                    }}
                />
            )}
            {!isStatic && (
                <WildEncounterSelector
                    wildCategory={calibrationFormState.wildCategory}
                    wildLocation={calibrationFormState.wildLocation}
                    wildPokemon={calibrationFormState.wildPokemon}
                    wildLead={calibrationFormState.wildLead}
                    shouldFilterPokemon={
                        calibrationFormState.shouldFilterPokemon
                    }
                    game={SEED_IDENTIFIER_TO_GAME[game]}
                    onChange={(
                        wildCategory,
                        wildLocation,
                        wildPokemon,
                        wildLead,
                        shouldFilterPokemon
                    ) => {
                        setCalibrationFormState((data) => ({
                            ...data,
                            wildCategory,
                            wildLocation,
                            wildPokemon,
                            wildLead,
                            shouldFilterPokemon,
                        }));
                    }}
                />
            )}
            <TextField
                label={t("labels.shininess")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setCalibrationFormState((data) => ({
                        ...data,
                        shininess: parseInt(event.target.value),
                    }));
                }}
                value={calibrationFormState.shininess}
                select
                fullWidth
            >
                <MenuItem value="255">{t("common.any")}</MenuItem>
                <MenuItem value="1">{t("options.star")}</MenuItem>
                <MenuItem value="2">{t("options.square")}</MenuItem>
                <MenuItem value="3">{t("options.starSquare")}</MenuItem>
            </TextField>
            <TextField
                label={t("labels.nature")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setCalibrationFormState((data) => ({
                        ...data,
                        nature: parseInt(event.target.value),
                    }));
                }}
                value={calibrationFormState.nature}
                helperText={t("messages.requiredForIvCalculation")}
                select
                fullWidth
            >
                <MenuItem value="-1">{t("common.any")}</MenuItem>
                {resources.natures.map((nature, index) => (
                    <MenuItem key={index} value={index}>
                        {nature}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                label={t("labels.gender")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setCalibrationFormState((data) => ({
                        ...data,
                        gender: parseInt(event.target.value),
                    }));
                }}
                value={calibrationFormState.gender}
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
            {calibrationFormState.nature !== -1 ? (
                <React.Fragment>
                    <IvCalculator
                        onChange={(_event, value) => {
                            setCalibrationFormState((data) => ({
                                ...data,
                                ivCalculatorText: value.value,
                            }));
                            if (value.isValid) {
                                setCalibrationFormState((data) => ({
                                    ...data,
                                    ivRangeStrings: value.calculatedValue.map(
                                        (ivRange) => [
                                            ivRange.min.toString(),
                                            ivRange.max.toString(),
                                        ]
                                    ),
                                }));
                            }
                        }}
                        calculateIVs={async (parsedLines) => {
                            const tenLines = await fetchTenLines();
                            if (isStatic) {
                                return await tenLines.calc_ivs_static(
                                    calibrationFormState.staticCategory,
                                    calibrationFormState.staticPokemon,
                                    parsedLines,
                                    calibrationFormState.nature
                                );
                            }
                            return await tenLines.calc_ivs_generic(
                                calibrationFormState.wildPokemon & 0x7ff,
                                calibrationFormState.wildPokemon >> 11,
                                parsedLines,
                                calibrationFormState.nature
                            );
                        }}
                        value={calibrationFormState.ivCalculatorText}
                    />
                    <IvEntry
                        onChange={(_event, value) => {
                            setIvRangesAreValid(value.isValid);
                            setCalibrationFormState((data) => ({
                                ...data,
                                ivRangeStrings: value.value,
                            }));
                        }}
                        value={calibrationFormState.ivRangeStrings}
                    />
                </React.Fragment>
            ) : (
                <span>{t("messages.ivCalculationDisabled")}</span>
            )}
            {bingoActive && (
                <Button
                    variant="contained"
                    color="primary"
                    type="button"
                    onClick={() => {
                        if (isNotSubmittable) return;
                        const searchSeeds = seedList.slice(
                            Math.max(0, targetSeedIndex - seedLeeway),
                            Math.min(
                                seedList.length,
                                targetSeedIndex + seedLeeway + 1
                            )
                        );
                        fetchBingo(
                            searchSeeds,
                            advancesRange,
                            offset,
                            isStatic,
                            trainerID,
                            secretID,
                            game,
                            calibrationFormState,
                            setBingoBoard,
                            setBingoCounters
                        );
                    }}
                    fullWidth
                    sx={{ my: 0.5 }}
                >
                    Bingo
                </Button>
            )}
            <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={isNotSubmittable}
                sx={{ my: 0.5 }}
                fullWidth
            >
                {searching ? t("common.searching") : t("common.submit")}
            </Button>
            <CalibrationTable
                rows={rows}
                target={targetSeed}
                gameConsole={gameConsole}
                isStatic={isStatic}
                isTeachyTVMode={isTeachyTVMode}
                isSwitch={isSwitch}
                overworldFrames={overworldFramesIsValid ? parseInt(overworldFrames) : 0}
                isMultiMethod={
                    calibrationFormState.method == COMBINED_WILD_METHOD
                }
            />
        </Box>
    );
}
