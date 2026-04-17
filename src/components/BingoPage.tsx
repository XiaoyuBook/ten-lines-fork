import { Box, Button } from "@mui/material";
import { useState } from "react";
import type {
    ExtendedGeneratorState,
    ExtendedWildGeneratorState,
    FRLGContiguousSeedEntry,
} from "../tenLines/generated";
import fetchTenLines, { hexSeed, SEED_IDENTIFIER_TO_GAME } from "../tenLines";
import { useI18n } from "../i18n";
import type { CalibrationFormState } from "./CalibrationForm";
import { createStoredCompareEntry } from "./CalibrationForm";
import { proxy } from "comlink";
import useLocalStorage from "../hooks/useLocalStorage";
import type { CalibrationCompareEntry } from "./CalibrationComparePanel";

export function useBingoBoard() {
    const [bingoBoard, setBingoBoard] = useLocalStorage("bingo-board", []);
    const [counters, setCounters] = useLocalStorage("bingo-counters", []);
    return [bingoBoard, setBingoBoard, counters, setCounters] as const;
}

export function getBingoActive() {
    return true;
}

export async function fetchBingo(
    searchSeeds: FRLGContiguousSeedEntry[],
    advancesRange: number[],
    offset: string,
    isStatic: boolean,
    trainerID: string,
    secretID: string,
    game: string,
    calibrationFormState: CalibrationFormState,
    setBingoBoard: React.Dispatch<
        React.SetStateAction<
            | ExtendedGeneratorState[][]
            | ExtendedWildGeneratorState[][]
            | undefined
        >
    >,
    setBingoCounters: React.Dispatch<
        React.SetStateAction<number[][] | undefined>
    >
) {
    const tenLines = await fetchTenLines();
    const bingo_board: ExtendedGeneratorState[][] = [];
    const bingo_counters: number[][] = [];
    setBingoBoard(bingo_board);
    setBingoCounters(bingo_counters);
    const doneCallback = () => {};
    const resultCallback = (results: ExtendedGeneratorState[]) => {
        setBingoBoard((last_bingo_board) => {
            const new_bingo_board = [...(last_bingo_board ?? [])];
            new_bingo_board.push(results);
            return new_bingo_board;
        });
        setBingoCounters((last_bingo_counters) => {
            const new_bingo_counters = [...(last_bingo_counters ?? [])];
            new_bingo_counters.push(results.map(() => 0));
            return new_bingo_counters;
        });
    };
    if (isStatic) {
        await tenLines.check_seeds_static(
            searchSeeds,
            advancesRange,
            [0, 0],
            parseInt(offset),
            SEED_IDENTIFIER_TO_GAME[game],
            parseInt(trainerID),
            parseInt(secretID),
            calibrationFormState.staticCategory,
            calibrationFormState.staticPokemon,
            calibrationFormState.method,
            255,
            -1,
            -1,
            [
                [0, 31],
                [0, 31],
                [0, 31],
                [0, 31],
                [0, 31],
                [0, 31],
            ],
            proxy(resultCallback),
            proxy(doneCallback)
        );
    } else {
        await tenLines.check_seeds_wild(
            searchSeeds,
            advancesRange,
            [0, 0],
            parseInt(offset),
            SEED_IDENTIFIER_TO_GAME[game],
            parseInt(trainerID),
            parseInt(secretID),
            calibrationFormState.wildCategory,
            calibrationFormState.wildLocation,
            -1,
            -1,
            calibrationFormState.method,
            calibrationFormState.wildLead,
            255,
            -1,
            [
                [0, 31],
                [0, 31],
                [0, 31],
                [0, 31],
                [0, 31],
                [0, 31],
            ],
            proxy(resultCallback),
            proxy(doneCallback)
        );
    }
}

function SpriteImage({
    species,
    form = 0,
    gender = 0,
    shiny = false,
}: {
    species: number;
    form?: number;
    gender?: number;
    shiny?: boolean;
}) {
    const [url, setUrl] = useState(
        `https://github.com/lincoln-lm/g5-sprites/blob/master/sprites/${
            shiny ? "s" : ""
        }${gender == 1 ? "f" : ""}${species.toString().padStart(3, "0")}${
            form ? "-" + form : ""
        }.gif?raw=true`
    );
    return (
        <Box
            component="img"
            src={url}
            sx={{
                imageRendering: "pixelated",
            }}
            onError={() =>
                setUrl(
                    `https://github.com/lincoln-lm/g5-sprites/blob/master/sprites/${
                        shiny ? "s" : ""
                    }${species.toString().padStart(3, "0")}${
                        form ? "-" + form : ""
                    }.gif?raw=true`
                )
            }
        />
    );
}

export default function BingoPage({
    sx,
    hidden,
}: {
    sx?: any;
    hidden?: boolean;
}) {
    const { resources } = useI18n();
    const [bingoBoard, _setBingoBoard, counters, setCounters] = useBingoBoard();
    const [, setCompareHistory] = useLocalStorage<CalibrationCompareEntry[]>(
        "calibration-compare-history",
        []
    );

    const width = bingoBoard[0]?.length ?? 0;
    const height = bingoBoard.length;

    const getGenderBadgeSx = (gender: number) => {
        if (gender === 0) {
            return {
                color: "#dff1ff",
                backgroundColor: "rgba(77, 171, 247, 0.22)",
                border: "1px solid rgba(77, 171, 247, 0.55)",
                boxShadow: "0 0 0 1px rgba(77, 171, 247, 0.1)",
            };
        }
        if (gender === 1) {
            return {
                color: "#ffe4ef",
                backgroundColor: "rgba(255, 107, 154, 0.2)",
                border: "1px solid rgba(255, 107, 154, 0.5)",
                boxShadow: "0 0 0 1px rgba(255, 107, 154, 0.1)",
            };
        }
        return {
            color: "rgba(255, 255, 255, 0.75)",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.06)",
        };
    };

    const getCardSx = (shiny: boolean, marked: boolean) => {
        if (!shiny) {
            return {};
        }
        if (marked) {
            return {
                color: "#2f2100",
                background:
                    "linear-gradient(180deg, #f4dd8c 0%, #d9c56a 100%)",
                boxShadow:
                    "inset 0 0 0 1px rgba(120, 92, 12, 0.28), 0 8px 16px rgba(120, 92, 12, 0.12)",
                "&:hover": {
                    background:
                        "linear-gradient(180deg, #f6e39d 0%, #decb74 100%)",
                },
            };
        }
        return {
            color: "#2f2100",
            background:
                "linear-gradient(180deg, #ffe89c 0%, #f0c44e 100%)",
            boxShadow:
                "inset 0 0 0 1px rgba(130, 96, 8, 0.3), 0 8px 18px rgba(184, 134, 11, 0.16)",
            "&:hover": {
                background:
                    "linear-gradient(180deg, #ffedaa 0%, #f3cc60 100%)",
            },
        };
    };

    if (hidden) return null;
    return (
        <Box
            display="grid"
            gridTemplateColumns={`repeat(${width + 1}, 1fr)`}
            gap={2}
            my={2}
            sx={sx}
        >
            {Array.from({ length: (width + 1) * (height + 1) }, (_, i) => {
                const [x, y] = [i % (width + 1), Math.floor(i / (width + 1))];
                if (y == 0 && x == 0) return <Box key={i}></Box>;
                if (y == 0)
                    return (
                        <Box
                            key={i}
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            {bingoBoard?.[0]?.[x - 1]?.advances}
                        </Box>
                    );
                if (x == 0)
                    return (
                        <Box
                            key={i}
                            sx={{
                                display: "flex",
                                justifyContent: "right",
                                alignItems: "center",
                            }}
                        >
                            {hexSeed(
                                bingoBoard?.[y - 1]?.[0]?.initialSeed ?? 0,
                                16
                            )}
                        </Box>
                    );
                const entry = bingoBoard?.[y - 1]?.[x - 1];
                const counter = counters?.[y - 1]?.[x - 1];
                if (!entry) return null;
                if (counter === undefined) return null;
                return (
                    <Box
                        key={i}
                        sx={{
                            aspectRatio: "1 / 1",
                            width: "100%",
                        }}
                    >
                        <Button
                            variant="contained"
                            color={counter > 0 ? "success" : "secondary"}
                            fullWidth
                            sx={{
                                height: "100%",
                                position: "relative",
                                px: 1.5,
                                py: 1.25,
                                ...getCardSx(entry.shiny !== 0, counter > 0),
                            }}
                            style={{ display: "block", lineHeight: 1 }}
                            onClick={() => {
                                const newCounters = [...(counters ?? [])];
                                const nextCounter = counter + 1;
                                newCounters[y - 1][x - 1] = nextCounter;
                                setCounters(newCounters);
                                setCompareHistory(
                                    (history: CalibrationCompareEntry[]) => [
                                        ...history,
                                        createStoredCompareEntry(entry),
                                    ]
                                );
                            }}
                            onMouseDown={(e) => {
                                if (e.button === 1) {
                                    e.preventDefault();
                                    const newCounters = [...(counters ?? [])];
                                    newCounters[y - 1][x - 1] = counter - 1;
                                    if (newCounters[y - 1][x - 1] < 0)
                                        newCounters[y - 1][x - 1] = 0;
                                    setCounters(newCounters);
                                }
                            }}
                        >
                            <Box
                                component="span"
                                sx={{
                                    position: "absolute",
                                    top: 10,
                                    left: 10,
                                    minWidth: 28,
                                    height: 28,
                                    px: 1,
                                    borderRadius: "999px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.15rem",
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    ...getGenderBadgeSx(entry.gender),
                                }}
                            >
                                {resources.genders[entry.gender]}
                            </Box>
                            <SpriteImage
                                species={entry.species}
                                form={entry.form}
                                gender={entry.gender}
                                shiny={entry.shiny !== 0}
                            />
                            <br />
                            <span>
                                {resources.natures[entry.nature]}
                            </span>
                            <br />
                            <span>{entry.stats.join("/")}</span>
                        </Button>
                        <span>{counters[y - 1][x - 1]}</span>
                    </Box>
                );
            })}
        </Box>
    );
}
