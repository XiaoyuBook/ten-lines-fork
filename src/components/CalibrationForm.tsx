import { proxy } from "comlink";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    createFilterOptions,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    MenuItem,
    Paper,
    Snackbar,
    TextField,
    Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";

import useLocalStorage from "../hooks/useLocalStorage";
import {
    getAllGameOptions,
    getConsoleOptions,
    useI18n,
} from "../i18n";
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
import type {
    ExtendedGeneratorState,
    ExtendedWildGeneratorState,
    FRLGContiguousSeedEntry,
} from "../tenLines/generated";
import { fetchBingo, getBingoActive, useBingoBoard } from "./BingoPage";
import CalibrationComparePanel, {
    type CalibrationCompareColumn,
    type CalibrationCompareEntry,
    type CalibrationCompareRow,
    type CalibrationCompareSettings,
    type CalibrationResultRow,
    DEFAULT_COMPARE_COLUMNS,
} from "./CalibrationComparePanel";
import CalibrationTable from "./CalibrationTable";
import CalibrationDynamicToolPanel from "./CalibrationDynamicToolPanel";
import IvCalculator from "./IvCalculator";
import IvEntry from "./IvEntry";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import StaticEncounterSelector from "./StaticEncounterSelector";
import WildEncounterSelector from "./WildEncounterSelector";
import { filterNatureOptions } from "../utils/natureSearch";

const CALIBRATION_COMPARE_COLUMN_OPTIONS: CalibrationCompareColumn[] = [
    "seed",
    "advances",
    "pid",
    "shiny",
    "nature",
    "ability",
    "ivs",
    "hidden",
    "power",
    "gender",
];

const DEFAULT_COMPARE_SETTINGS: CalibrationCompareSettings = {
    enabled: true,
    position: "right",
    compareMode: "target",
    visibleColumns: DEFAULT_COMPARE_COLUMNS,
    calculatorEnabled: false,
    autoAddTarget: true,
};

const FLOATING_COMPARE_DEFAULT_SIZE = {
    width: 420,
    height: 620,
};

const FLOATING_COMPARE_MIN_WIDTH = 360;
const FLOATING_COMPARE_DEFAULT_POSITION = {
    x: 24,
    y: 88,
};

export const COMPARE_TARGET_STORAGE_KEY = "calibration-compare-target";
export const SEARCHER_COMPARE_TARGET_KEY = "searcher-compare-target";

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

function createCompareEntry(row: CalibrationCompareRow): CalibrationCompareEntry {
    return {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        row,
    };
}

export function createStoredCompareEntry(
    row: CalibrationCompareRow
): CalibrationCompareEntry {
    return createCompareEntry(row);
}

function useCalibrationURLState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const game = searchParams.get("game") || "r_painting";
    const sound = searchParams.get("sound") || "mono";
    const buttonMode = searchParams.get("buttonMode") || "a";
    const button = searchParams.get("button") || "a";
    const heldButton = searchParams.get("heldButton") || "none";
    const gameConsole = fixGameConsole(
        game,
        searchParams.get("gameConsole") || "GBA"
    );
    const advancesMin = searchParams.get("advancesMin") || "0";
    const advancesMax = searchParams.get("advancesMax") || "100";
    const ttvAdvancesMin = searchParams.get("ttvAdvancesMin") || "0";
    const ttvAdvancesMax = searchParams.get("ttvAdvancesMax") || "100";
    const offset = searchParams.get("offset") || "0";
    const overworldFrames = gameConsole.startsWith("NX")
        ? searchParams.get("overworldFrames") || "600"
        : "0";
    const trainerID = searchParams.get("trainerID") || "0";
    const secretID = searchParams.get("secretID") || "0";
    const teachyTVMode = !gameConsole.startsWith("NX")
        ? searchParams.get("teachyTVMode") || "false"
        : "false";
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
    sx?: Record<string, unknown>;
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

    const [, setBingoBoard, , setBingoCounters] = useBingoBoard();

    const bingoActive = getBingoActive();

    const isStatic = calibrationFormState.method <= STATIC_4;
    const isFRLG = game.startsWith("fr") || game.startsWith("lg");
    const isFRLGE = isFRLG || game.startsWith("e_");
    const isSwitch = game.endsWith("nx");

    const [rows, setRows] = useState<
        ExtendedGeneratorState[] | ExtendedWildGeneratorState[]
    >([]);
    const [searching, setSearching] = useState(false);
    const [storedCompareSettings, setCompareSettings] =
        useLocalStorage<CalibrationCompareSettings>(
            "calibration-compare-settings",
            DEFAULT_COMPARE_SETTINGS
        );
    const compareSettings: CalibrationCompareSettings = {
        ...DEFAULT_COMPARE_SETTINGS,
        ...storedCompareSettings,
    };
    const [compareTarget, setCompareTarget] =
        useLocalStorage<CalibrationCompareEntry | null>(
            COMPARE_TARGET_STORAGE_KEY,
            null
        );
    const [compareHistory, setCompareHistory] = useLocalStorage<
        CalibrationCompareEntry[]
    >("calibration-compare-history", []);
    const [compareSettingsOpen, setCompareSettingsOpen] = useState(false);
    const [compareFeedback, setCompareFeedback] = useState("");
    const [compareFloating, setCompareFloating] = useState(false);
    const [compareFloatingPosition, setCompareFloatingPosition] = useState(
        FLOATING_COMPARE_DEFAULT_POSITION
    );
    const [compareFloatingSize, setCompareFloatingSize] = useState(
        FLOATING_COMPARE_DEFAULT_SIZE
    );
    const compareFloatingFrameRef = useRef<{
        mode: "drag" | "resize-right" | "resize-bottom" | "resize-corner";
        pointerX: number;
        pointerY: number;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
    } | null>(null);

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
            const nextSeedList = await tenLines.get_contiguous_seed_list(
                seedData,
                `${sound}_${buttonMode}_${button}`,
                game,
                heldButton
            );
            setSeedList(nextSeedList);
            if (
                nextSeedList.findIndex(
                    (seed: FRLGContiguousSeedEntry) =>
                        seed.initialSeed === targetSeedValue
                ) == -1
            ) {
                setCalibrationURLState({
                    targetInitialSeed: hexSeed(
                        nextSeedList.length > 0
                            ? nextSeedList[Math.min(51, nextSeedList.length - 1)]
                                  .initialSeed
                            : 0xdead,
                        16
                    ),
                });
            }
        };
        void fetchSeedList();
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
    const orderedVisibleColumns = CALIBRATION_COMPARE_COLUMN_OPTIONS.filter(
        (column) => compareSettings.visibleColumns.includes(column)
    );
    const compareFloatingMinHeight = compareSettings.calculatorEnabled
        ? 520
        : 400;

    const clampFloatingPosition = useCallback((
        x: number,
        y: number,
        width: number,
        height: number
    ) => ({
        x: Math.min(
            Math.max(12, x),
            Math.max(12, window.innerWidth - width - 12)
        ),
        y: Math.min(
            Math.max(12, y),
            Math.max(12, window.innerHeight - height - 12)
        ),
    }), []);

    const clampFloatingSize = useCallback((width: number, height: number) => ({
        width: Math.min(
            Math.max(FLOATING_COMPARE_MIN_WIDTH, width),
            Math.max(FLOATING_COMPARE_MIN_WIDTH, window.innerWidth - 24)
        ),
        height: Math.min(
            Math.max(compareFloatingMinHeight, height),
            Math.max(compareFloatingMinHeight, window.innerHeight - 24)
        ),
    }), [compareFloatingMinHeight]);

    const addCompareTarget = (row: CalibrationCompareRow) => {
        setCompareTarget(createCompareEntry(row));
        setCompareFeedback(t("compare.addedTarget"));
    };

    const addCompareHistory = (row: CalibrationResultRow) => {
        setCompareHistory((history: CalibrationCompareEntry[]) => [
            ...history,
            createCompareEntry(row),
        ]);
        setCompareFeedback(t("compare.addedHistory"));
    };

    const handleQuickAdd = (
        row: CalibrationResultRow,
        destination: "target" | "history"
    ) => {
        if (destination === "target") {
            addCompareTarget(row);
            return;
        }
        addCompareHistory(row);
    };

    const deleteCompareTarget = () => {
        setCompareTarget(null);
    };

    const clearCompareEntries = () => {
        setCompareTarget(null);
        setCompareHistory([]);
    };

    useEffect(() => {
        if (!compareFloating) {
            return undefined;
        }

        const handlePointerMove = (event: MouseEvent) => {
            const frame = compareFloatingFrameRef.current;
            if (!frame) {
                return;
            }

            if (frame.mode === "drag") {
                const nextPosition = clampFloatingPosition(
                    frame.startX + (event.clientX - frame.pointerX),
                    frame.startY + (event.clientY - frame.pointerY),
                    compareFloatingSize.width,
                    compareFloatingSize.height
                );
                setCompareFloatingPosition(nextPosition);
                return;
            }

            const nextWidth =
                frame.mode === "resize-bottom"
                    ? frame.startWidth
                    : frame.startWidth + (event.clientX - frame.pointerX);
            const nextHeight =
                frame.mode === "resize-right"
                    ? frame.startHeight
                    : frame.startHeight + (event.clientY - frame.pointerY);
            const clampedSize = clampFloatingSize(nextWidth, nextHeight);

            setCompareFloatingSize(clampedSize);
            setCompareFloatingPosition((current) =>
                clampFloatingPosition(
                    current.x,
                    current.y,
                    clampedSize.width,
                    clampedSize.height
                )
            );
        };

        const handlePointerUp = () => {
            compareFloatingFrameRef.current = null;
        };

        window.addEventListener("mousemove", handlePointerMove);
        window.addEventListener("mouseup", handlePointerUp);

        return () => {
            window.removeEventListener("mousemove", handlePointerMove);
            window.removeEventListener("mouseup", handlePointerUp);
        };
    }, [
        clampFloatingPosition,
        clampFloatingSize,
        compareFloating,
        compareFloatingMinHeight,
        compareFloatingSize.height,
        compareFloatingSize.width,
    ]);

    useEffect(() => {
        if (!compareFloating) {
            return undefined;
        }

        const handleResize = () => {
            setCompareFloatingSize((current) =>
                clampFloatingSize(current.width, current.height)
            );
            setCompareFloatingPosition((current) =>
                clampFloatingPosition(
                    current.x,
                    current.y,
                    compareFloatingSize.width,
                    compareFloatingSize.height
                )
            );
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [
        clampFloatingPosition,
        clampFloatingSize,
        compareFloating,
        compareFloatingMinHeight,
        compareFloatingSize.height,
        compareFloatingSize.width,
    ]);

    useEffect(() => {
        if (!compareFloating) {
            return;
        }
        setCompareFloatingSize((current) =>
            clampFloatingSize(current.width, current.height)
        );
    }, [clampFloatingSize, compareFloating, compareFloatingMinHeight]);

    const startCompareFloatingDrag = (
        event: React.MouseEvent<HTMLDivElement>
    ) => {
        if (!compareFloating || event.button !== 0) {
            return;
        }
        const target = event.target as HTMLElement;
        if (target.closest("button")) {
            return;
        }
        event.preventDefault();
        compareFloatingFrameRef.current = {
            mode: "drag",
            pointerX: event.clientX,
            pointerY: event.clientY,
            startX: compareFloatingPosition.x,
            startY: compareFloatingPosition.y,
            startWidth: compareFloatingSize.width,
            startHeight: compareFloatingSize.height,
        };
    };

    const startCompareFloatingResize = (
        mode: "resize-right" | "resize-bottom" | "resize-corner"
    ) => (event: React.MouseEvent<HTMLDivElement>) => {
        if (!compareFloating || event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        compareFloatingFrameRef.current = {
            mode,
            pointerX: event.clientX,
            pointerY: event.clientY,
            startX: compareFloatingPosition.x,
            startY: compareFloatingPosition.y,
            startWidth: compareFloatingSize.width,
            startHeight: compareFloatingSize.height,
        };
    };

    const toggleCompareFloating = () => {
        setCompareFloating((current) => {
            const next = !current;
            if (next) {
                const clampedSize = clampFloatingSize(
                    compareFloatingSize.width,
                    compareFloatingSize.height
                );
                setCompareFloatingSize(clampedSize);
                setCompareFloatingPosition((position) =>
                    clampFloatingPosition(
                        position.x,
                        position.y,
                        clampedSize.width,
                        clampedSize.height
                    )
                );
            } else {
                compareFloatingFrameRef.current = null;
            }
            return next;
        });
    };

    const toggleCompareColumn = (column: CalibrationCompareColumn) => {
        setCompareSettings((current: CalibrationCompareSettings) => {
            const exists = current.visibleColumns.includes(column);
            const nextVisibleColumns = exists
                ? current.visibleColumns.filter(
                      (item: CalibrationCompareColumn) => item !== column
                  )
                : [...current.visibleColumns, column];

            return {
                ...current,
                visibleColumns:
                    nextVisibleColumns.length > 0
                        ? nextVisibleColumns
                        : current.visibleColumns,
            };
        });
    };

    useEffect(() => {
        if (
            !compareSettings.autoAddTarget ||
            compareTarget ||
            rows.length === 0
        ) {
            return;
        }
        setCompareTarget(createCompareEntry(rows[0]));
    }, [
        compareSettings.autoAddTarget,
        compareTarget,
        rows,
        setCompareTarget,
    ]);

    useEffect(() => {
        let nextStaticCategory = calibrationFormState.staticCategory;

        if (nextStaticCategory === 3 && !isFRLG) {
            nextStaticCategory = 0;
        }
        if (nextStaticCategory === 6 && !isFRLGE) {
            nextStaticCategory = 0;
        }
        if (nextStaticCategory === 8 && isFRLG) {
            nextStaticCategory = 0;
        }

        if (nextStaticCategory !== calibrationFormState.staticCategory) {
            setCalibrationFormState((current) => ({
                ...current,
                staticCategory: nextStaticCategory,
            }));
        }
    }, [calibrationFormState.staticCategory, isFRLG, isFRLGE]);

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
                        setRows((currentRows) => {
                            if (
                                currentRows.length > 1000 ||
                                results.length === 0
                            ) {
                                return currentRows;
                            }
                            return [...currentRows, ...results];
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
                        setRows((currentRows) => {
                            if (
                                currentRows.length > 1000 ||
                                results.length === 0
                            ) {
                                return currentRows;
                            }
                            return [...currentRows, ...results];
                        });
                    }),
                    proxy(setSearching)
                );
            }
        };
        void submit();
    };

    const targetSeedFilterOptions = createFilterOptions({
        limit: 100,
        stringify: (option: FRLGContiguousSeedEntry) =>
            `${hexSeed(option.initialSeed, 16)}`,
    });

    if (hidden) {
        return null;
    }

    const comparePanel = (
        <CalibrationComparePanel
            targetEntry={compareTarget}
            historyEntries={compareHistory}
            settings={{
                ...compareSettings,
                visibleColumns: orderedVisibleColumns,
            }}
            floating={compareFloating}
            gameConsole={gameConsole}
            onDeleteTarget={deleteCompareTarget}
            onDeleteHistoryEntry={(id) => {
                setCompareHistory((history: CalibrationCompareEntry[]) =>
                    history.filter(
                        (entry: CalibrationCompareEntry) => entry.id !== id
                    )
                );
            }}
            onClearAll={clearCompareEntries}
            onOpenSettings={() => setCompareSettingsOpen(true)}
            onToggleFloating={toggleCompareFloating}
            onHeaderMouseDown={startCompareFloatingDrag}
        />
    );

    const dynamicToolPanel = <CalibrationDynamicToolPanel />;

    return (
        <Box
            sx={{
                ...sx,
                width: "100%",
                position: "relative",
                overflow: "visible",
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    display: "grid",
                    gap: 2,
                    alignItems: "start",
                    gridTemplateColumns: {
                        xs: "1fr",
                        lg: compareSettings.enabled
                            ? "minmax(260px, 1fr) minmax(720px, 2fr) minmax(260px, 1fr)"
                            : "minmax(280px, 340px) minmax(0, 1fr)",
                    },
                }}
            >
                <Box
                    sx={{
                        order: { xs: 1, lg: 1 },
                        position: { lg: "sticky" },
                        top: { lg: 16 },
                        alignSelf: "start",
                        minWidth: 0,
                    }}
                >
                    {dynamicToolPanel}
                </Box>

                {compareSettings.enabled && compareFloating && (
                    <Box
                        sx={{
                            position: "fixed",
                            top: compareFloatingPosition.y,
                            left: compareFloatingPosition.x,
                            width: compareFloatingSize.width,
                            height: compareFloatingSize.height,
                            minWidth: FLOATING_COMPARE_MIN_WIDTH,
                            minHeight: compareFloatingMinHeight,
                            maxWidth: "calc(100vw - 24px)",
                            maxHeight: "calc(100vh - 24px)",
                            overflow: "hidden",
                            zIndex: 1400,
                            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
                        }}
                    >
                        {comparePanel}
                        <Box
                            onMouseDown={startCompareFloatingResize("resize-right")}
                            sx={{
                                position: "absolute",
                                top: 0,
                                right: 0,
                                width: 10,
                                height: "100%",
                                cursor: "ew-resize",
                                zIndex: 2,
                            }}
                        />
                        <Box
                            onMouseDown={startCompareFloatingResize("resize-bottom")}
                            sx={{
                                position: "absolute",
                                left: 0,
                                bottom: 0,
                                width: "100%",
                                height: 10,
                                cursor: "ns-resize",
                                zIndex: 2,
                            }}
                        />
                        <Box
                            onMouseDown={startCompareFloatingResize("resize-corner")}
                            sx={{
                                position: "absolute",
                                right: 0,
                                bottom: 0,
                                width: 18,
                                height: 18,
                                cursor: "nwse-resize",
                                zIndex: 3,
                                "&::after": {
                                    content: '""',
                                    position: "absolute",
                                    right: 4,
                                    bottom: 4,
                                    width: 8,
                                    height: 8,
                                    borderRight: "2px solid rgba(255,255,255,0.45)",
                                    borderBottom: "2px solid rgba(255,255,255,0.45)",
                                },
                            }}
                        />
                    </Box>
                )}

                <Paper
                    variant="outlined"
                    sx={{
                        order: { xs: 2, lg: 2 },
                        width: "100%",
                        minWidth: 0,
                        minInlineSize: { lg: 720 },
                        borderRadius: 4,
                        p: { xs: 1.5, sm: 2.5 },
                        background:
                            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
                    }}
                >
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            label={t("labels.game")}
                            margin="normal"
                            style={{ textAlign: "left" }}
                            onChange={(event) =>
                                setCalibrationURLState({ game: event.target.value })
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
                                    <MenuItem value="start">{t("options.start")}</MenuItem>
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
                                    <MenuItem value="startup_a">
                                        {t("options.startupA")}
                                    </MenuItem>
                                    <MenuItem value="blackout_r">
                                        {t("options.blackoutR")}
                                    </MenuItem>
                                    <MenuItem value="blackout_a">
                                        {t("options.blackoutA")}
                                    </MenuItem>
                                    <MenuItem value="blackout_l">
                                        {t("options.blackoutL")}
                                    </MenuItem>
                                    <MenuItem value="blackout_al">
                                        {t("options.blackoutAL")}
                                    </MenuItem>
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
                                    targetInitialSeed: hexSeed(
                                        newValue.initialSeed,
                                        16
                                    ),
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
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                            }}
                        >
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
                                sx={{ my: 2, minWidth: 110 }}
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
                                <DialogContent
                                    sx={{ minWidth: 150, textAlign: "center" }}
                                >
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
                            label={
                                isTeachyTVMode
                                    ? t("labels.finalAPressFrame")
                                    : t("labels.advances")
                            }
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
                                setCalibrationURLState({ offset: value.value });
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
                        {isSwitch && (
                            <NumericalInput
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
                            ></NumericalInput>
                        )}
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
                                .filter(([value]) => parseInt(value) != STATIC_2)
                                .map(([value, name], index) => (
                                    <MenuItem key={index} value={parseInt(value)}>
                                        {name}
                                    </MenuItem>
                                ))}
                        </TextField>
                        {isStatic ? (
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
                        ) : (
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
                        <Autocomplete
                            options={[-1, ...resources.natures.map((_nature, index) => index)]}
                            value={calibrationFormState.nature}
                            onChange={(_event, value) => {
                                setCalibrationFormState((data) => ({
                                    ...data,
                                    nature: value ?? -1,
                                }));
                            }}
                            filterOptions={filterNatureOptions}
                            getOptionLabel={(option) =>
                                option === -1
                                    ? t("common.any")
                                    : resources.natures[option]
                            }
                            isOptionEqualToValue={(option, value) =>
                                option === value
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={t("labels.nature")}
                                    margin="normal"
                                    style={{ textAlign: "left" }}
                                    helperText={t(
                                        "messages.requiredForIvCalculation"
                                    )}
                                    placeholder={
                                        calibrationFormState.nature === -1
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
                    </Box>

                    <Box
                        sx={{
                            mt: 2,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        <Box sx={{ textAlign: "left" }}>
                            <Typography variant="h6">
                                {t("compare.resultsTitle")}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t("labels.resultCount")}: {rows.length}
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            onClick={() => setCompareSettingsOpen(true)}
                        >
                            {t("compare.settings")}
                        </Button>
                    </Box>

                    <Box sx={{ mt: 1.5 }}>
                        <CalibrationTable
                            rows={rows}
                            target={targetSeed}
                            gameConsole={gameConsole}
                            isStatic={isStatic}
                            isTeachyTVMode={isTeachyTVMode}
                            isMultiMethod={
                                calibrationFormState.method == COMBINED_WILD_METHOD
                            }
                            hasTarget={Boolean(compareTarget)}
                            onAdd={handleQuickAdd}
                        />
                    </Box>
                </Paper>

                {compareSettings.enabled && !compareFloating && (
                    <Box
                        sx={{
                            order: { xs: 3, lg: 3 },
                            position: { lg: "sticky" },
                            top: { lg: 16 },
                            alignSelf: "start",
                            minWidth: 0,
                        }}
                    >
                        {comparePanel}
                    </Box>
                )}
            </Box>

            <Dialog
                open={compareSettingsOpen}
                onClose={() => setCompareSettingsOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>{t("compare.settings")}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: "grid", gap: 2.5 }}>
                        <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {t("compare.display")}
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={compareSettings.enabled}
                                        onChange={(event) =>
                                            setCompareSettings((current: CalibrationCompareSettings) => ({
                                                ...current,
                                                enabled: event.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label={t("compare.enable")}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={compareSettings.calculatorEnabled}
                                        onChange={(event) =>
                                            setCompareSettings((current: CalibrationCompareSettings) => ({
                                                ...current,
                                                calculatorEnabled:
                                                    event.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label={t("compare.enableCalculator")}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={compareSettings.autoAddTarget}
                                        onChange={(event) =>
                                            setCompareSettings((current: CalibrationCompareSettings) => ({
                                                ...current,
                                                autoAddTarget:
                                                    event.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label={t("compare.autoAddTarget")}
                            />
                            <TextField
                                label={t("compare.position")}
                                margin="normal"
                                value={compareSettings.position}
                                onChange={(event) =>
                                    setCompareSettings((current: CalibrationCompareSettings) => ({
                                        ...current,
                                        position: event.target.value as
                                            CalibrationCompareSettings["position"],
                                    }))
                                }
                                select
                                fullWidth
                            >
                                <MenuItem value="left">
                                    {t("compare.positionLeft")}
                                </MenuItem>
                                <MenuItem value="right">
                                    {t("compare.positionRight")}
                                </MenuItem>
                            </TextField>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {t("compare.compareMode")}
                            </Typography>
                            <TextField
                                value={compareSettings.compareMode}
                                onChange={(event) =>
                                    setCompareSettings((current: CalibrationCompareSettings) => ({
                                        ...current,
                                        compareMode: event.target.value as
                                            CalibrationCompareSettings["compareMode"],
                                    }))
                                }
                                select
                                fullWidth
                            >
                                <MenuItem value="target">
                                    {t("compare.modeTarget")}
                                </MenuItem>
                                <MenuItem value="previous">
                                    {t("compare.modePrevious")}
                                </MenuItem>
                            </TextField>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {t("compare.visibleColumns")}
                            </Typography>
                            <FormGroup>
                                {CALIBRATION_COMPARE_COLUMN_OPTIONS.map((column) => (
                                    <FormControlLabel
                                        key={column}
                                        control={
                                            <Checkbox
                                                checked={orderedVisibleColumns.includes(
                                                    column
                                                )}
                                                onChange={() =>
                                                    toggleCompareColumn(column)
                                                }
                                            />
                                        }
                                        label={t(`table.${column}`)}
                                    />
                                ))}
                            </FormGroup>
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompareSettingsOpen(false)}>
                        {t("common.close")}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={Boolean(compareFeedback)}
                autoHideDuration={1800}
                onClose={() => setCompareFeedback("")}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity="success"
                    variant="filled"
                    onClose={() => setCompareFeedback("")}
                    sx={{ width: "100%" }}
                >
                    {compareFeedback}
                </Alert>
            </Snackbar>
        </Box>
    );
}
