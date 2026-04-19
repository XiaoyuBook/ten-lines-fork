import {
    Alert,
    Box,
    Button,
    ButtonGroup,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { memo, useMemo, useState } from "react";

import useLocalStorage from "../hooks/useLocalStorage";
import { useI18n } from "../i18n";

const RATE_1X1 = 0.06;
const RATE_2X2 = 0.12;
const REFRESH_MS = 16.66667;
const TV_STEP = 314;
const LONG_PRESS_BONUS = 88.8;
const PARITY_SHIFT_MS = 17;
const DEFAULT_BASE_TIME_TV = 34600;
const DEFAULT_BASE_TIME_NO_TV = 15100;
const DEFAULT_GOAL_WAIT = 5000;
const DEFAULT_TV_RATE = 18.71;
const DEFAULT_PARITY_TIME = 1520;
const MAX_HISTORY_ITEMS = 8;
const STORAGE_KEY = "calibration-dynamic-tool";

type DynamicToolMode = "tv" | "no-tv";

interface DynamicToolHistoryEntry {
    id: string;
    tv: string;
    wait: string;
    parity: string;
    mode: DynamicToolMode;
}

interface DynamicToolStoredState {
    targetAdv: string;
    actualHit: string;
    tvRate: string;
    parityTime: string;
    baseTimeTv: string;
    baseTimeNoTv: string;
    lastTv: string;
    lastWait: string;
    lastParity: string;
    currentTv: string;
    currentWait: string;
    currentParity: string;
    currentTotal: string;
    lockedTv: string;
    badTvSpot: string;
    useTv: DynamicToolMode;
    forceShift: boolean;
    history: DynamicToolHistoryEntry[];
}

const DEFAULT_STATE: DynamicToolStoredState = {
    targetAdv: "",
    actualHit: "",
    tvRate: DEFAULT_TV_RATE.toFixed(6),
    parityTime: DEFAULT_PARITY_TIME.toFixed(0),
    baseTimeTv: DEFAULT_BASE_TIME_TV.toFixed(0),
    baseTimeNoTv: DEFAULT_BASE_TIME_NO_TV.toFixed(0),
    lastTv: "",
    lastWait: "",
    lastParity: "",
    currentTv: "",
    currentWait: "",
    currentParity: "",
    currentTotal: "",
    lockedTv: "",
    badTvSpot: "",
    useTv: "tv",
    forceShift: false,
    history: [],
};

function normalizeState(value: unknown): DynamicToolStoredState {
    const current =
        value && typeof value === "object"
            ? (value as Partial<DynamicToolStoredState>)
            : {};

    const history = Array.isArray(current.history)
        ? current.history.map((entry) => {
              const nextEntry =
                  entry && typeof entry === "object"
                      ? (entry as Partial<DynamicToolHistoryEntry>)
                      : {};

              return {
                  id:
                      typeof nextEntry.id === "string" && nextEntry.id
                          ? nextEntry.id
                          : globalThis.crypto?.randomUUID?.() ??
                            `${Date.now()}-${Math.random()}`,
                  tv: typeof nextEntry.tv === "string" ? nextEntry.tv : "",
                  wait: typeof nextEntry.wait === "string" ? nextEntry.wait : "",
                  parity:
                      typeof nextEntry.parity === "string" ? nextEntry.parity : "",
                  mode:
                      nextEntry.mode === "no-tv"
                          ? ("no-tv" as DynamicToolMode)
                          : ("tv" as DynamicToolMode),
              };
          })
        : [];

    return {
        ...DEFAULT_STATE,
        ...current,
        parityTime:
            typeof current.parityTime === "string"
                ? current.parityTime
                : DEFAULT_STATE.parityTime,
        baseTimeTv:
            typeof current.baseTimeTv === "string"
                ? current.baseTimeTv
                : DEFAULT_STATE.baseTimeTv,
        baseTimeNoTv:
            typeof current.baseTimeNoTv === "string"
                ? current.baseTimeNoTv
                : DEFAULT_STATE.baseTimeNoTv,
        lastParity:
            typeof current.lastParity === "string" ? current.lastParity : "",
        currentParity:
            typeof current.currentParity === "string"
                ? current.currentParity
                : "",
        badTvSpot:
            typeof current.badTvSpot === "string" ? current.badTvSpot : "",
        useTv: current.useTv === "no-tv" ? "no-tv" : "tv",
        history,
    };
}

function parseNumber(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return NaN;
    }
    return Number(trimmed);
}

function getParityFrames(ms: number) {
    return ms * RATE_1X1 + LONG_PRESS_BONUS;
}

function isPerfectStable(ms: number) {
    const cycles = ms / REFRESH_MS;
    const fraction = cycles - Math.floor(cycles);
    return fraction >= 0.43 && fraction <= 0.57;
}

function findSafeTv(rawMs: number, badSpot: number) {
    const target = Math.round(rawMs);

    for (let i = 0; i < 50; i += 1) {
        const positive = target + i;
        if (isPerfectStable(positive) && Math.abs(positive - badSpot) > 4) {
            return positive;
        }

        const negative = target - i;
        if (isPerfectStable(negative) && Math.abs(negative - badSpot) > 4) {
            return negative;
        }
    }

    return target;
}

function createHistoryEntry(
    tv: string,
    wait: string,
    parity: string,
    mode: DynamicToolMode
): DynamicToolHistoryEntry {
    return {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        tv,
        wait,
        parity,
        mode,
    };
}

function ReadonlyValue({
    label,
    value,
    helperText,
}: {
    label: string;
    value: string;
    helperText?: string;
}) {
    return (
        <TextField
            label={label}
            value={value}
            helperText={helperText}
            InputProps={{ readOnly: true }}
            fullWidth
        />
    );
}

const CalibrationDynamicToolPanel = memo(function CalibrationDynamicToolPanel() {
    const { t } = useI18n();
    const [storedState, setState] = useLocalStorage<DynamicToolStoredState>(
        STORAGE_KEY,
        DEFAULT_STATE
    );
    const [feedback, setFeedback] = useState("");
    const [feedbackSeverity, setFeedbackSeverity] = useState<
        "success" | "warning"
    >("success");

    const state = useMemo(() => normalizeState(storedState), [storedState]);

    const currentTvRate = useMemo(() => {
        const parsed = parseNumber(state.tvRate);
        return Number.isNaN(parsed) ? DEFAULT_TV_RATE : parsed;
    }, [state.tvRate]);

    const currentBaseTime =
        state.useTv === "tv"
            ? state.baseTimeTv
            : state.baseTimeNoTv;

    const setField = (key: keyof DynamicToolStoredState, value: string) => {
        setState((current: DynamicToolStoredState) => ({
            ...normalizeState(current),
            [key]: value,
        }));
    };

    const appendHistory = (
        current: DynamicToolStoredState,
        tv: string,
        wait: string,
        parity: string
    ) =>
        [createHistoryEntry(tv, wait, parity, current.useTv), ...current.history].slice(
            0,
            MAX_HISTORY_ITEMS
        );

    const tvHistory = state.history.filter(
        (entry: DynamicToolHistoryEntry) => entry.mode === "tv"
    );
    const noTvHistory = state.history.filter(
        (entry: DynamicToolHistoryEntry) => entry.mode === "no-tv"
    );

    const handleCalculate = () => {
        const targetAdv = parseNumber(state.targetAdv);
        const parityTime = parseNumber(state.parityTime);
        const baseTimeTv = parseNumber(state.baseTimeTv);
        const baseTimeNoTv = parseNumber(state.baseTimeNoTv);

        if (
            Number.isNaN(targetAdv) ||
            Number.isNaN(parityTime) ||
            Number.isNaN(baseTimeTv) ||
            Number.isNaN(baseTimeNoTv)
        ) {
            setFeedbackSeverity("warning");
            setFeedback(t("dynamicTool.invalidCalculation"));
            return;
        }

        const parityFrames = getParityFrames(parityTime);

        if (state.useTv === "no-tv") {
            const baseFrames = baseTimeNoTv * RATE_2X2;
            const finalWait = Math.round((targetAdv - parityFrames - baseFrames) / RATE_2X2);

            setState((current: DynamicToolStoredState) => {
                const next = normalizeState(current);
                const nextCurrentTv = t("dynamicTool.notUsedShort");
                const nextCurrentWait = finalWait.toString();
                const nextCurrentParity = parityTime.toFixed(0);
                const nextCurrentTotal = (baseTimeNoTv + finalWait).toFixed(0);
                const hasPreviousCurrent =
                    next.currentWait.trim() !== "" || next.currentParity.trim() !== "";

                return {
                    ...next,
                    currentTv: nextCurrentTv,
                    currentWait: nextCurrentWait,
                    currentParity: nextCurrentParity,
                    currentTotal: nextCurrentTotal,
                    lastTv: hasPreviousCurrent
                        ? next.currentTv === t("dynamicTool.notUsedShort")
                            ? "0"
                            : next.currentTv
                        : next.lastTv,
                    lastWait: hasPreviousCurrent ? next.currentWait : next.lastWait,
                    lastParity: hasPreviousCurrent ? next.currentParity : next.lastParity,
                    history: appendHistory(
                        next,
                        "0",
                        nextCurrentWait,
                        nextCurrentParity
                    ),
                    forceShift: false,
                    badTvSpot: "",
                };
            });
            setFeedbackSeverity("success");
            setFeedback(t("dynamicTool.savedPreviousRound"));
            return;
        }

        const baseFrames = baseTimeTv * RATE_2X2;
        const parsedLockedTv = parseNumber(state.lockedTv);
        const lockedTv = Number.isNaN(parsedLockedTv) ? 0 : parsedLockedTv;
        const badTvSpot = parseNumber(state.badTvSpot);
        let finalTv = 0;
        let finalWait = 0;
        let needsShift = state.forceShift;

        if (lockedTv > 0 && !state.forceShift) {
            const remainNeeded =
                targetAdv - parityFrames - baseFrames - lockedTv * currentTvRate;
            finalWait = Math.round(remainNeeded / RATE_2X2);

            if (finalWait >= 1500 && finalWait <= 12000) {
                finalTv = lockedTv;
            } else {
                needsShift = true;
            }
        }

        if (lockedTv <= 0 || needsShift) {
            const rawTv =
                (targetAdv -
                    parityFrames -
                    baseFrames -
                    DEFAULT_GOAL_WAIT * RATE_2X2) /
                currentTvRate;
            finalTv = findSafeTv(rawTv, Number.isNaN(badTvSpot) ? 0 : badTvSpot);
            finalWait = Math.round(
                (targetAdv - parityFrames - baseFrames - finalTv * currentTvRate) /
                    RATE_2X2
            );
        }

        setState((current: DynamicToolStoredState) => {
            const next = normalizeState(current);
            const nextCurrentTv = finalTv.toString();
            const nextCurrentWait = finalWait.toString();
            const nextCurrentParity = parityTime.toFixed(0);
            const nextCurrentTotal = (baseTimeTv + finalTv + finalWait).toFixed(0);
            const hasPreviousCurrent =
                next.currentTv.trim() !== "" ||
                next.currentWait.trim() !== "" ||
                next.currentParity.trim() !== "";

            return {
                ...next,
                currentTv: nextCurrentTv,
                currentWait: nextCurrentWait,
                currentParity: nextCurrentParity,
                currentTotal: nextCurrentTotal,
                lastTv: hasPreviousCurrent ? next.currentTv : next.lastTv,
                lastWait: hasPreviousCurrent ? next.currentWait : next.lastWait,
                lastParity: hasPreviousCurrent ? next.currentParity : next.lastParity,
                lockedTv: nextCurrentTv,
                history: appendHistory(
                    next,
                    nextCurrentTv,
                    nextCurrentWait,
                    nextCurrentParity
                ),
                forceShift: false,
                badTvSpot: "",
            };
        });

        setFeedbackSeverity("success");
        setFeedback(
            lockedTv > 0 && !needsShift
                ? t("dynamicTool.savedPreviousRoundLocked")
                : t("dynamicTool.savedPreviousRound")
        );
    };

    const handleCorrectRate = () => {
        const targetAdv = parseNumber(state.targetAdv);
        const lastTv = parseNumber(state.lastTv);
        const lastWait = parseNumber(state.lastWait);
        const lastParity = parseNumber(state.lastParity);
        const baseTimeTv = parseNumber(state.baseTimeTv);
        const baseTimeNoTv = parseNumber(state.baseTimeNoTv);
        let actualHit = parseNumber(state.actualHit);

        if (
            [targetAdv, lastTv, lastWait, lastParity, actualHit, baseTimeTv, baseTimeNoTv].some((value) =>
                Number.isNaN(value)
            )
        ) {
            setFeedbackSeverity("warning");
            setFeedback(t("dynamicTool.invalidCorrection"));
            return;
        }

        const usingTvForCorrection = lastTv > 0;
        const baseTime = usingTvForCorrection
            ? baseTimeTv
            : baseTimeNoTv;

        let nextParityTime = parseNumber(state.parityTime);
        let nextForceShift = false;
        let nextBadTvSpot = "";
        let feedbackKey = "dynamicTool.rateUpdated";

        if (actualHit % 2 !== targetAdv % 2) {
            nextParityTime = lastParity + PARITY_SHIFT_MS;
            nextForceShift = true;
            feedbackKey = "dynamicTool.parityAdjusted";
        }

        const expected =
            getParityFrames(lastParity) +
            (baseTime + lastWait) * RATE_2X2 +
            lastTv * currentTvRate;
        const diff = actualHit - expected;

        if (usingTvForCorrection && Math.abs(diff) >= 214 && Math.abs(diff) <= 414) {
            actualHit = diff > 0 ? actualHit - TV_STEP : actualHit + TV_STEP;
            nextBadTvSpot = Math.round(lastTv).toString();
            nextForceShift = true;
            feedbackKey = "dynamicTool.detectedShift";
        } else {
            if (Math.abs(diff) > 800) {
                nextForceShift = true;
            }
            if (feedbackKey !== "dynamicTool.parityAdjusted") {
                feedbackKey = "dynamicTool.keepLockedTv";
            }
        }

        setState((current: DynamicToolStoredState) => {
            const next = normalizeState(current);
            return {
                ...next,
                tvRate: usingTvForCorrection
                    ? (
                          (actualHit -
                              (getParityFrames(nextParityTime) +
                                  (baseTime + lastWait) * RATE_2X2)) /
                          lastTv
                      ).toFixed(6)
                    : next.tvRate,
                parityTime: nextParityTime.toFixed(0),
                forceShift: nextForceShift,
                lockedTv: usingTvForCorrection
                    ? Math.round(lastTv).toString()
                    : next.lockedTv,
                badTvSpot: nextBadTvSpot,
            };
        });

        setFeedbackSeverity("success");
        setFeedback(
            usingTvForCorrection
                ? t(feedbackKey)
                : t("dynamicTool.noTvCorrectionRecorded")
        );
    };

    const handleReset = () => {
        setState(DEFAULT_STATE);
        setFeedbackSeverity("success");
        setFeedback(t("dynamicTool.clearedState"));
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                width: "100%",
                borderRadius: 4,
                p: 2,
                background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 1,
                    mb: 0.5,
                }}
            >
                <Typography variant="h6" sx={{ textAlign: "left" }}>
                    {t("dynamicTool.title")}
                </Typography>
                <Button size="small" variant="outlined" onClick={handleReset}>
                    {t("dynamicTool.clearAll")}
                </Button>
            </Box>
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "left", mb: 2 }}
            >
                {t("dynamicTool.subtitle")}
            </Typography>

            {feedback ? (
                <Alert severity={feedbackSeverity} sx={{ mb: 2 }}>
                    {feedback}
                </Alert>
            ) : null}

            <Paper variant="outlined" sx={{ p: 2, textAlign: "left", mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    {t("dynamicTool.modeSection")}
                </Typography>
                <ButtonGroup fullWidth>
                    <Button
                        variant={state.useTv === "tv" ? "contained" : "outlined"}
                        onClick={() => {
                            setState((current: DynamicToolStoredState) => ({
                                ...normalizeState(current),
                                useTv: "tv",
                            }));
                        }}
                    >
                        {t("dynamicTool.modeTv")}
                    </Button>
                    <Button
                        variant={state.useTv === "no-tv" ? "contained" : "outlined"}
                        onClick={() => {
                            setState((current: DynamicToolStoredState) => ({
                                ...normalizeState(current),
                                useTv: "no-tv",
                            }));
                        }}
                    >
                        {t("dynamicTool.modeNoTv")}
                    </Button>
                </ButtonGroup>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.25 }}
                >
                    {t("dynamicTool.currentRate")}: {currentTvRate.toFixed(6)}
                </Typography>
            </Paper>

            <Box sx={{ display: "grid", gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                        {t("dynamicTool.calculateSection")}
                    </Typography>
                    <Box sx={{ display: "grid", gap: 1.5 }}>
                        <TextField
                            label={t("dynamicTool.targetAdv")}
                            value={state.targetAdv}
                            onChange={(event) =>
                                setField("targetAdv", event.target.value)
                            }
                            fullWidth
                        />
                        <TextField
                            label={t("dynamicTool.baseTime")}
                            value={currentBaseTime}
                            onChange={(event) =>
                                setField(
                                    state.useTv === "tv"
                                        ? "baseTimeTv"
                                        : "baseTimeNoTv",
                                    event.target.value
                                )
                            }
                            helperText={
                                state.useTv === "tv"
                                    ? t("dynamicTool.baseTimeTvHint")
                                    : t("dynamicTool.baseTimeNoTvHint")
                            }
                        />
                        <TextField
                            label={t("dynamicTool.parityTime")}
                            value={state.parityTime}
                            onChange={(event) =>
                                setField("parityTime", event.target.value)
                            }
                            fullWidth
                        />
                        <Button variant="contained" onClick={handleCalculate}>
                            {t("dynamicTool.calculateAction")}
                        </Button>
                    </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                        {t("dynamicTool.currentResultSection")}
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(160px, 1fr))",
                            gap: 1.5,
                        }}
                    >
                        {state.useTv === "tv" ? (
                            <ReadonlyValue
                                label={t("dynamicTool.currentTvLabel")}
                                value={state.currentTv}
                            />
                        ) : null}
                        <ReadonlyValue
                            label={t("dynamicTool.currentWaitLabel")}
                            value={state.currentWait}
                        />
                        <ReadonlyValue
                            label={t("dynamicTool.currentParityLabel")}
                            value={state.currentParity}
                        />
                    </Box>
                    {state.currentTotal ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1.5 }}
                        >
                            {t("dynamicTool.physicalTotal")}: {state.currentTotal} ms
                        </Typography>
                    ) : null}
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                        {t("dynamicTool.lastRoundSection")}
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(160px, 1fr))",
                            gap: 1.5,
                        }}
                    >
                        <TextField
                            label={t("dynamicTool.lastTv")}
                            value={state.lastTv}
                            onChange={(event) =>
                                setField("lastTv", event.target.value)
                            }
                            helperText={t("dynamicTool.lastTvHint")}
                            fullWidth
                        />
                        <TextField
                            label={t("dynamicTool.lastWait")}
                            value={state.lastWait}
                            onChange={(event) =>
                                setField("lastWait", event.target.value)
                            }
                            helperText={t("dynamicTool.lastWaitHint")}
                            fullWidth
                        />
                        <TextField
                            label={t("dynamicTool.lastParity")}
                            value={state.lastParity}
                            onChange={(event) =>
                                setField("lastParity", event.target.value)
                            }
                            helperText={t("dynamicTool.lastParityHint")}
                            fullWidth
                        />
                    </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                        {t("dynamicTool.correctSection")}
                    </Typography>
                    <Box sx={{ display: "grid", gap: 1.5 }}>
                        <TextField
                            label={t("dynamicTool.actualHit")}
                            value={state.actualHit}
                            onChange={(event) =>
                                setField("actualHit", event.target.value)
                            }
                            fullWidth
                        />
                        <Button variant="contained" onClick={handleCorrectRate}>
                            {t("dynamicTool.correctAction")}
                        </Button>
                    </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                            gap: 1,
                            mb: 1.5,
                            flexWrap: "wrap",
                        }}
                    >
                        <Typography variant="subtitle2">
                            {t("dynamicTool.historySection")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {t("dynamicTool.historyUnit")}
                        </Typography>
                    </Box>
                    {state.history.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            {t("dynamicTool.emptyHistory")}
                        </Typography>
                    ) : (
                        <Box sx={{ display: "grid", gap: 2 }}>
                            {tvHistory.length > 0 ? (
                                <Box>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1 }}
                                    >
                                        {t("dynamicTool.modeTv")}
                                    </Typography>
                                    <Box
                                        sx={{
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            borderRadius: 2,
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "grid",
                                                gridTemplateColumns:
                                                    "72px minmax(88px, 1fr) minmax(88px, 1fr) minmax(88px, 1fr)",
                                                gap: 0,
                                                backgroundColor: "rgba(255,255,255,0.05)",
                                                borderBottom:
                                                    "1px solid rgba(255,255,255,0.08)",
                                            }}
                                        >
                                            <Box sx={{ px: 1.5, py: 1 }}>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {t("dynamicTool.historyRound")}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ px: 1.5, py: 1 }}>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {t("dynamicTool.historyTvShort")}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ px: 1.5, py: 1 }}>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {t("dynamicTool.historyWaitShort")}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ px: 1.5, py: 1 }}>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {t("dynamicTool.historyParityShort")}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {tvHistory.map(
                                            (
                                                entry: DynamicToolHistoryEntry,
                                                index: number
                                            ) => (
                                                <Box
                                                    key={entry.id}
                                                    sx={{
                                                        display: "grid",
                                                        gridTemplateColumns:
                                                            "72px minmax(88px, 1fr) minmax(88px, 1fr) minmax(88px, 1fr)",
                                                        gap: 0,
                                                        borderBottom:
                                                            index === tvHistory.length - 1
                                                                ? "none"
                                                                : "1px solid rgba(255,255,255,0.06)",
                                                        backgroundColor:
                                                            index % 2 === 0
                                                                ? "rgba(255,255,255,0.02)"
                                                                : "rgba(255,255,255,0.035)",
                                                    }}
                                                >
                                                    <Box sx={{ px: 1.5, py: 1.25 }}>
                                                        <Typography variant="body2">
                                                            #{tvHistory.length - index}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ px: 1.5, py: 1.25 }}>
                                                        <Typography variant="body2">
                                                            {entry.tv}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ px: 1.5, py: 1.25 }}>
                                                        <Typography variant="body2">
                                                            {entry.wait}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ px: 1.5, py: 1.25 }}>
                                                        <Typography variant="body2">
                                                            {entry.parity}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )
                                        )}
                                    </Box>
                                </Box>
                            ) : null}

                            {noTvHistory.length > 0 ? (
                                <Box>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1 }}
                                    >
                                        {t("dynamicTool.modeNoTv")}
                                    </Typography>
                                    <Box
                                        sx={{
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            borderRadius: 2,
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "grid",
                                                gridTemplateColumns:
                                                    "72px minmax(88px, 1fr) minmax(88px, 1fr)",
                                                gap: 0,
                                                backgroundColor: "rgba(255,255,255,0.05)",
                                                borderBottom:
                                                    "1px solid rgba(255,255,255,0.08)",
                                            }}
                                        >
                                            <Box sx={{ px: 1.5, py: 1 }}>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {t("dynamicTool.historyRound")}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ px: 1.5, py: 1 }}>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {t("dynamicTool.historyWaitShort")}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ px: 1.5, py: 1 }}>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {t("dynamicTool.historyParityShort")}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {noTvHistory.map(
                                            (
                                                entry: DynamicToolHistoryEntry,
                                                index: number
                                            ) => (
                                                <Box
                                                    key={entry.id}
                                                    sx={{
                                                        display: "grid",
                                                        gridTemplateColumns:
                                                            "72px minmax(88px, 1fr) minmax(88px, 1fr)",
                                                        gap: 0,
                                                        borderBottom:
                                                            index === noTvHistory.length - 1
                                                                ? "none"
                                                                : "1px solid rgba(255,255,255,0.06)",
                                                        backgroundColor:
                                                            index % 2 === 0
                                                                ? "rgba(255,255,255,0.02)"
                                                                : "rgba(255,255,255,0.035)",
                                                    }}
                                                >
                                                    <Box sx={{ px: 1.5, py: 1.25 }}>
                                                        <Typography variant="body2">
                                                            #{noTvHistory.length - index}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ px: 1.5, py: 1.25 }}>
                                                        <Typography variant="body2">
                                                            {entry.wait}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ px: 1.5, py: 1.25 }}>
                                                        <Typography variant="body2">
                                                            {entry.parity}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )
                                        )}
                                    </Box>
                                </Box>
                            ) : null}
                        </Box>
                    )}
                </Paper>
            </Box>
        </Paper>
    );
});

export default CalibrationDynamicToolPanel;
