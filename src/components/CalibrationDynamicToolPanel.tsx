import {
    Alert,
    Box,
    Button,
    ButtonGroup,
    Chip,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { memo, useMemo, useState } from "react";

import useLocalStorage from "../hooks/useLocalStorage";
import { useI18n } from "../i18n";

const RATE_2X2 = 0.12;
const REFRESH_MS = 16.66667;
const TV_STEP = 314;
const DEFAULT_PARITY_FRAMES = 180;
const DEFAULT_BASE_TIME = 34600;
const DEFAULT_GOAL_WAIT = 5000;
const DEFAULT_TV_RATE = 18.71;
const MAX_HISTORY_ITEMS = 8;
const STORAGE_KEY = "calibration-dynamic-tool";

type DynamicToolMode = "tv" | "no-tv";

interface DynamicToolHistoryEntry {
    id: string;
    tv: string;
    wait: string;
    mode: DynamicToolMode;
}

interface DynamicToolStoredState {
    targetAdv: string;
    actualHit: string;
    tvRate: string;
    lastTv: string;
    lastWait: string;
    currentTv: string;
    currentWait: string;
    currentTotal: string;
    lockedTv: string;
    useTv: DynamicToolMode;
    forceShift: boolean;
    history: DynamicToolHistoryEntry[];
}

const DEFAULT_STATE: DynamicToolStoredState = {
    targetAdv: "",
    actualHit: "",
    tvRate: DEFAULT_TV_RATE.toFixed(4),
    lastTv: "",
    lastWait: "",
    currentTv: "",
    currentWait: "",
    currentTotal: "",
    lockedTv: "",
    useTv: "tv",
    forceShift: false,
    history: [],
};

function parseNumber(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return NaN;
    }
    return Number(trimmed);
}

function isPerfectStable(ms: number) {
    const cycles = ms / REFRESH_MS;
    const fraction = cycles - Math.floor(cycles);
    return fraction >= 0.45 && fraction <= 0.55;
}

function findPerfectTv(rawMs: number, mustShift: boolean, oldTv: number) {
    let target = Math.round(rawMs);
    if (mustShift && Math.abs(target - oldTv) < 5) {
        target += 8;
    }

    for (let i = 0; i < 20; i += 1) {
        if (isPerfectStable(target + i)) {
            return target + i;
        }
        if (isPerfectStable(target - i)) {
            return target - i;
        }
    }

    return target;
}

function createHistoryEntry(
    tv: string,
    wait: string,
    mode: DynamicToolMode
): DynamicToolHistoryEntry {
    return {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        tv,
        wait,
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
    const [state, setState] = useLocalStorage<DynamicToolStoredState>(
        STORAGE_KEY,
        DEFAULT_STATE
    );
    const [feedback, setFeedback] = useState("");
    const [feedbackSeverity, setFeedbackSeverity] = useState<
        "success" | "warning"
    >("success");

    const currentTvRate = useMemo(() => {
        const parsed = parseNumber(state.tvRate);
        return Number.isNaN(parsed) ? DEFAULT_TV_RATE : parsed;
    }, [state.tvRate]);

    const setField = (key: keyof DynamicToolStoredState, value: string) => {
        setState((current: DynamicToolStoredState) => ({
            ...current,
            [key]: value,
        }));
    };

    const appendHistory = (
        current: DynamicToolStoredState,
        tv: string,
        wait: string
    ) => [
        createHistoryEntry(tv, wait, current.useTv),
        ...current.history,
    ].slice(0, MAX_HISTORY_ITEMS);

    const handleCalculate = () => {
        const targetAdv = parseNumber(state.targetAdv);

        if (Number.isNaN(targetAdv)) {
            setFeedbackSeverity("warning");
            setFeedback(t("dynamicTool.invalidCalculation"));
            return;
        }

        if (state.useTv === "no-tv") {
            const needed =
                targetAdv -
                DEFAULT_PARITY_FRAMES -
                DEFAULT_BASE_TIME * RATE_2X2;
            const finalWait = Math.round(needed / RATE_2X2);

            setState((current: DynamicToolStoredState) => ({
                ...current,
                currentTv: t("dynamicTool.notUsedShort"),
                currentWait: finalWait.toString(),
                currentTotal: (DEFAULT_BASE_TIME + finalWait).toFixed(0),
                lastTv: "0",
                lastWait: finalWait.toString(),
                history: appendHistory(current, "0", finalWait.toString()),
                forceShift: false,
            }));
            setFeedbackSeverity("success");
            setFeedback(t("dynamicTool.savedPreviousRound"));
            return;
        }

        const lockedTv = parseNumber(state.lockedTv);
        const finalTv =
            lockedTv > 0 && !state.forceShift
                ? lockedTv
                : findPerfectTv(
                      (targetAdv -
                          DEFAULT_PARITY_FRAMES -
                          (DEFAULT_BASE_TIME + DEFAULT_GOAL_WAIT) * RATE_2X2) /
                          currentTvRate,
                      state.forceShift,
                      lockedTv > 0 ? lockedTv : 0
                  );

        const actualTvAdv = finalTv * currentTvRate;
        const remainingAdv =
            targetAdv -
            DEFAULT_PARITY_FRAMES -
            DEFAULT_BASE_TIME * RATE_2X2 -
            actualTvAdv;
        const finalWait = Math.round(remainingAdv / RATE_2X2);

        setState((current: DynamicToolStoredState) => ({
            ...current,
            currentTv: finalTv.toString(),
            currentWait: finalWait.toString(),
            currentTotal: (DEFAULT_BASE_TIME + finalTv + finalWait).toFixed(0),
            lastTv: finalTv.toString(),
            lastWait: finalWait.toString(),
            lockedTv: finalTv.toString(),
            history: appendHistory(
                current,
                finalTv.toString(),
                finalWait.toString()
            ),
            forceShift: false,
        }));
        setFeedbackSeverity("success");
        setFeedback(
            lockedTv > 0 && !state.forceShift
                ? t("dynamicTool.savedPreviousRoundLocked")
                : t("dynamicTool.savedPreviousRound")
        );
    };

    const handleCorrectRate = () => {
        const lastTv = parseNumber(state.lastTv);
        const lastWait = parseNumber(state.lastWait);
        let actualHit = parseNumber(state.actualHit);

        if ([lastTv, lastWait, actualHit].some((value) => Number.isNaN(value))) {
            setFeedbackSeverity("warning");
            setFeedback(t("dynamicTool.invalidCorrection"));
            return;
        }

        if (lastTv <= 0) {
            setFeedbackSeverity("warning");
            setFeedback(t("dynamicTool.invalidLastTv"));
            return;
        }

        const expected =
            DEFAULT_PARITY_FRAMES +
            (DEFAULT_BASE_TIME + lastWait) * RATE_2X2 +
            lastTv * currentTvRate;
        const diff = actualHit - expected;
        let nextForceShift = false;
        let feedbackKey = "dynamicTool.rateUpdated";

        if (Math.abs(diff) >= 200) {
            nextForceShift = true;
            actualHit = diff > 0 ? actualHit - TV_STEP : actualHit + TV_STEP;
            feedbackKey = "dynamicTool.detectedShift";
        } else if (Math.abs(diff) < 1000) {
            feedbackKey = "dynamicTool.keepLockedTv";
        }

        const nextTvRate =
            (actualHit -
                (DEFAULT_PARITY_FRAMES +
                    (DEFAULT_BASE_TIME + lastWait) * RATE_2X2)) /
            lastTv;

        setState((current: DynamicToolStoredState) => ({
            ...current,
            tvRate: nextTvRate.toFixed(4),
            forceShift: nextForceShift,
            lockedTv: Math.round(lastTv).toString(),
        }));
        setFeedbackSeverity("success");
        setFeedback(t(feedbackKey));
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
                                ...current,
                                useTv: "tv",
                            }));
                        }}
                    >
                        {t("dynamicTool.modeTv")}
                    </Button>
                    <Button
                        variant={
                            state.useTv === "no-tv" ? "contained" : "outlined"
                        }
                        onClick={() => {
                            setState((current: DynamicToolStoredState) => ({
                                ...current,
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
                    {t("dynamicTool.currentRate")}: {currentTvRate.toFixed(4)}
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
                        <ReadonlyValue
                            label={t("dynamicTool.baseTime")}
                            value={DEFAULT_BASE_TIME.toString()}
                            helperText={t("dynamicTool.baseTimeHint")}
                        />
                        <Button variant="contained" onClick={handleCalculate}>
                            {t("dynamicTool.calculateAction")}
                        </Button>
                    </Box>
                </Paper>

                {state.useTv === "tv" && (
                    <>
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
                                <Button
                                    variant="contained"
                                    onClick={handleCorrectRate}
                                >
                                    {t("dynamicTool.correctAction")}
                                </Button>
                            </Box>
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
                            </Box>
                        </Paper>
                    </>
                )}

                <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                        {t("dynamicTool.currentResultSection")}
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns:
                                state.useTv === "tv"
                                    ? "repeat(auto-fit, minmax(160px, 1fr))"
                                    : "1fr",
                            gap: 1.5,
                        }}
                    >
                        {state.useTv === "tv" && (
                            <ReadonlyValue
                                label={t("dynamicTool.currentTvLabel")}
                                value={state.currentTv}
                            />
                        )}
                        <ReadonlyValue
                            label={t("dynamicTool.currentWaitLabel")}
                            value={state.currentWait}
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
                        {t("dynamicTool.historySection")}
                    </Typography>
                    {state.history.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            {t("dynamicTool.emptyHistory")}
                        </Typography>
                    ) : (
                        <Box sx={{ display: "grid", gap: 1 }}>
                            {state.history.map((
                                entry: DynamicToolHistoryEntry,
                                index: number
                            ) => (
                                <Box
                                    key={entry.id}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 1,
                                        flexWrap: "wrap",
                                        p: 1.25,
                                        borderRadius: 2,
                                        backgroundColor:
                                            "rgba(255,255,255,0.035)",
                                    }}
                                >
                                    <Chip
                                        size="small"
                                        label={`#${state.history.length - index}`}
                                        variant="outlined"
                                    />
                                    {entry.mode === "tv" && (
                                        <Typography variant="body2">
                                            _TV: {entry.tv} ms
                                        </Typography>
                                    )}
                                    <Typography variant="body2">
                                        _剩余: {entry.wait} ms
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        {entry.mode === "tv"
                                            ? t("dynamicTool.modeTv")
                                            : t("dynamicTool.modeNoTv")}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Paper>
            </Box>
        </Paper>
    );
});

export default CalibrationDynamicToolPanel;
