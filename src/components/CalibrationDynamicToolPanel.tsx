import {
    Alert,
    Box,
    Button,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { memo, useMemo, useState } from "react";

import useLocalStorage from "../hooks/useLocalStorage";
import { useI18n } from "../i18n";

const RATE_2X2 = 0.12;
const REFRESH_MS = 16.66667;
const DEFAULT_PARITY_FRAMES = 180;
const DEFAULT_BASE_TIME = 44250;
const DEFAULT_GOAL_WAIT = 5000;
const DEFAULT_TV_RATE = 18.71;

const STORAGE_KEY = "calibration-dynamic-tool";

interface DynamicToolStoredState {
    targetAdv: string;
    parityFrames: string;
    baseTime: string;
    tvRate: string;
    goalWait: string;
    lastTv: string;
    lastWait: string;
    actualHit: string;
    lastCalculatedTv: string;
    lastCalculatedWait: string;
    lastPhysicalTotal: string;
}

const DEFAULT_STATE: DynamicToolStoredState = {
    targetAdv: "",
    parityFrames: DEFAULT_PARITY_FRAMES.toString(),
    baseTime: DEFAULT_BASE_TIME.toString(),
    tvRate: DEFAULT_TV_RATE.toFixed(4),
    goalWait: DEFAULT_GOAL_WAIT.toString(),
    lastTv: "",
    lastWait: "",
    actualHit: "",
    lastCalculatedTv: "",
    lastCalculatedWait: "",
    lastPhysicalTotal: "",
};

function parseNumber(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return NaN;
    }
    return Number(trimmed);
}

function getSafeTV(rawTv: number) {
    const cycles = Math.floor(rawTv / REFRESH_MS);
    return (cycles + 0.5) * REFRESH_MS;
}

function FieldGroup({
    label,
    value,
    onChange,
    helperText,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    helperText?: string;
    disabled?: boolean;
}) {
    return (
        <TextField
            label={label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            helperText={helperText}
            disabled={disabled}
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

    const currentTvRate = useMemo(
        () => parseNumber(state.tvRate),
        [state.tvRate]
    );

    const updateField = (key: keyof DynamicToolStoredState, value: string) => {
        setState((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleCalculate = () => {
        const targetAdv = parseNumber(state.targetAdv);
        const parityFrames = parseNumber(state.parityFrames);
        const baseTime = parseNumber(state.baseTime);
        const tvRate = parseNumber(state.tvRate);
        const goalWait = parseNumber(state.goalWait);

        if (
            [targetAdv, parityFrames, baseTime, tvRate, goalWait].some((value) =>
                Number.isNaN(value)
            )
        ) {
            setFeedbackSeverity("warning");
            setFeedback(t("dynamicTool.invalidCalculation"));
            return;
        }

        const needAdv =
            targetAdv -
            parityFrames -
            baseTime * RATE_2X2 -
            goalWait * RATE_2X2;

        if (needAdv < 0) {
            setFeedbackSeverity("warning");
            setFeedback(t("dynamicTool.needAdvNegative"));
            return;
        }

        const rawTv = needAdv / tvRate;
        const safeTv = getSafeTV(rawTv);
        const tvDiffAdv = (safeTv - rawTv) * tvRate;
        const adjustedWait = goalWait - tvDiffAdv / RATE_2X2;
        const physicalTotal = safeTv + adjustedWait + baseTime;

        setState((current) => ({
            ...current,
            lastTv: safeTv.toFixed(2),
            lastWait: adjustedWait.toFixed(2),
            lastCalculatedTv: safeTv.toFixed(2),
            lastCalculatedWait: adjustedWait.toFixed(2),
            lastPhysicalTotal: physicalTotal.toFixed(4),
        }));
        setFeedbackSeverity("success");
        setFeedback(t("dynamicTool.savedPreviousRound"));
    };

    const handleCorrectRate = () => {
        const parityFrames = parseNumber(state.parityFrames);
        const baseTime = parseNumber(state.baseTime);
        const lastTv = parseNumber(state.lastTv);
        const lastWait = parseNumber(state.lastWait);
        const actualHit = parseNumber(state.actualHit);

        if (
            [parityFrames, baseTime, lastTv, lastWait, actualHit].some((value) =>
                Number.isNaN(value)
            )
        ) {
            setFeedbackSeverity("warning");
            setFeedback(t("dynamicTool.invalidCorrection"));
            return;
        }

        if (lastTv <= 0) {
            setFeedbackSeverity("warning");
            setFeedback(t("dynamicTool.invalidLastTv"));
            return;
        }

        const constantPart = parityFrames + (baseTime + lastWait) * RATE_2X2;
        const nextTvRate = (actualHit - constantPart) / lastTv;

        setState((current) => ({
            ...current,
            tvRate: nextTvRate.toFixed(4),
        }));
        setFeedbackSeverity("success");
        setFeedback(t("dynamicTool.rateUpdated"));
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
            <Typography variant="h6" sx={{ textAlign: "left", mb: 0.5 }}>
                {t("dynamicTool.title")}
            </Typography>
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

            <Box sx={{ display: "grid", gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                        {t("dynamicTool.calculateSection")}
                    </Typography>
                    <Box sx={{ display: "grid", gap: 1.5 }}>
                        <FieldGroup
                            label={t("dynamicTool.targetAdv")}
                            value={state.targetAdv}
                            onChange={(value) => updateField("targetAdv", value)}
                        />
                        <FieldGroup
                            label={t("dynamicTool.baseTime")}
                            value={state.baseTime}
                            onChange={(value) => updateField("baseTime", value)}
                            helperText={t("dynamicTool.baseTimeHint")}
                        />
                        <FieldGroup
                            label={t("dynamicTool.parityFrames")}
                            value={state.parityFrames}
                            onChange={(value) =>
                                updateField("parityFrames", value)
                            }
                        />
                        <FieldGroup
                            label={t("dynamicTool.goalWait")}
                            value={state.goalWait}
                            onChange={(value) => updateField("goalWait", value)}
                        />
                        <FieldGroup
                            label={t("dynamicTool.tvRate")}
                            value={state.tvRate}
                            onChange={(value) => updateField("tvRate", value)}
                        />
                        <Button variant="contained" onClick={handleCalculate}>
                            {t("dynamicTool.calculateAction")}
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
                        <FieldGroup
                            label={t("dynamicTool.lastTv")}
                            value={state.lastTv}
                            onChange={(value) => updateField("lastTv", value)}
                            helperText={t("dynamicTool.lastTvHint")}
                        />
                        <FieldGroup
                            label={t("dynamicTool.lastWait")}
                            value={state.lastWait}
                            onChange={(value) => updateField("lastWait", value)}
                            helperText={t("dynamicTool.lastWaitHint")}
                        />
                    </Box>

                    {state.lastCalculatedTv && state.lastCalculatedWait ? (
                        <Box sx={{ mt: 1.5, display: "grid", gap: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                                {t("dynamicTool.lastTvSaved")}:{" "}
                                {state.lastCalculatedTv} ms
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t("dynamicTool.lastWaitSaved")}:{" "}
                                {state.lastCalculatedWait} ms
                            </Typography>
                            {state.lastPhysicalTotal ? (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {t("dynamicTool.physicalTotal")}:{" "}
                                    {state.lastPhysicalTotal} ms
                                </Typography>
                            ) : null}
                        </Box>
                    ) : null}
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, textAlign: "left" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                        {t("dynamicTool.correctSection")}
                    </Typography>
                    <Box sx={{ display: "grid", gap: 1.5 }}>
                        <FieldGroup
                            label={t("dynamicTool.actualHit")}
                            value={state.actualHit}
                            onChange={(value) => updateField("actualHit", value)}
                        />
                        <Button variant="contained" onClick={handleCorrectRate}>
                            {t("dynamicTool.correctAction")}
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                            {t("dynamicTool.currentRate")}:{" "}
                            {Number.isNaN(currentTvRate)
                                ? state.tvRate
                                : currentTvRate.toFixed(4)}
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </Paper>
    );
});

export default CalibrationDynamicToolPanel;
