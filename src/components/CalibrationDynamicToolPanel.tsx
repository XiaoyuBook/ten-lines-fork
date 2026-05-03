import {
    Box,
    Button,
    Chip,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Snackbar,
    TextField,
    Typography,
} from "@mui/material";
import Alert from "@mui/material/Alert";
import { memo, useState, type MouseEvent as ReactMouseEvent } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import { useI18n } from "../i18n";

const FRAME_MS = 16.666666;
const ADV_PER_MS_NORMAL = 0.12;
const TV_SINGLE_BLOCK_TOTAL = 314;
const TV_BLOCK_EXTRA = 312;
const PARITY_SHIFT_MS = 17;
const DEFAULT_BASE_TIME_TV = 30000;
const DEFAULT_BASE_TIME_NO_TV = 13500;
const DEFAULT_REMAIN_TIME = 5000;
const DEFAULT_PARITY_TIME = 1500;
const MAX_LOG_ITEMS = 10;
const STORAGE_KEY = "calibration-dynamic-tool";

type DynamicToolMode = "tv" | "no-tv";
interface DynamicToolSnapshot {
    targetAdv: string;
    actualHit: string;
    parityTime: string;
    tvTime: string;
    remainTime: string;
    baseTimeTv: string;
    baseTimeNoTv: string;
    useTv: DynamicToolMode;
    hitSeed: boolean;
    lastDiff: string;
    tvBlacklist: string[];
}
interface DynamicToolLogEntry extends DynamicToolSnapshot {
    id: string;
    mode: DynamicToolMode;
}
interface DynamicToolStoredState {
    targetAdv: string; actualHit: string; parityTime: string; tvTime: string; remainTime: string;
    baseTimeTv: string; baseTimeNoTv: string; useTv: DynamicToolMode; hitSeed: boolean;
    lastDiff: string; tvBlacklist: string[]; logs: DynamicToolLogEntry[];
}

const DEFAULT_STATE: DynamicToolStoredState = {
    targetAdv: "", actualHit: "", parityTime: DEFAULT_PARITY_TIME.toFixed(0), tvTime: "0", remainTime: DEFAULT_REMAIN_TIME.toFixed(0),
    baseTimeTv: DEFAULT_BASE_TIME_TV.toFixed(0), baseTimeNoTv: DEFAULT_BASE_TIME_NO_TV.toFixed(0), useTv: "tv", hitSeed: true,
    lastDiff: "", tvBlacklist: [], logs: [],
};

const parseNumber = (value: string) => { const trimmed = value.trim(); return trimmed ? Number(trimmed) : NaN; };
const formatMs = (value: number) => value.toFixed(0);
const createSnapshot = (state: DynamicToolStoredState): DynamicToolSnapshot => ({
    targetAdv: state.targetAdv,
    actualHit: state.actualHit,
    parityTime: state.parityTime,
    tvTime: state.tvTime,
    remainTime: state.remainTime,
    baseTimeTv: state.baseTimeTv,
    baseTimeNoTv: state.baseTimeNoTv,
    useTv: state.useTv,
    hitSeed: state.hitSeed,
    lastDiff: state.lastDiff,
    tvBlacklist: [...state.tvBlacklist],
});
const getLogsForMode = (
    logs: DynamicToolLogEntry[],
    mode: DynamicToolMode
) => logs.filter((entry) => entry.mode === mode);
const appendLog = (logs: DynamicToolLogEntry[], entry: Omit<DynamicToolLogEntry, "id">) =>
    [{ id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, ...entry }, ...logs].slice(0, MAX_LOG_ITEMS);

const sectionCardSx = {
    p: { xs: 1.5, md: 2 },
    minWidth: 0,
    overflow: "hidden",
    textAlign: "left",
    borderRadius: 3,
    borderColor: "rgba(166, 214, 255, 0.12)",
    background:
        "linear-gradient(180deg, rgba(255,255,255,0.032), rgba(255,255,255,0.012))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

const fieldSx = {
    minWidth: 0,
    "& .MuiOutlinedInput-root": {
        minWidth: 0,
        borderRadius: 3,
        backgroundColor: "rgba(255,255,255,0.03)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
    },
};

const toggleGridSx = {
    mb: 2,
    display: "grid",
    gridTemplateColumns: {
        xs: "repeat(2, minmax(0, 1fr))",
        sm: "repeat(2, minmax(0, 180px))",
    },
    gap: 1,
    justifyContent: "start",
    minWidth: 0,
};

const metricGridSx = {
    display: "grid",
    gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(2, minmax(0, 1fr))",
    },
    gap: 1.5,
    minWidth: 0,
};

const toggleButtonBaseSx = {
    minWidth: 0,
    minHeight: 48,
    borderRadius: 3,
    fontWeight: 700,
    boxShadow: "none",
    whiteSpace: "nowrap",
};

function alignToSafePhase(targetMs: number, blacklist: number[]) {
    const frames = Math.round(targetMs / FRAME_MS - 0.5);
    let phaseLocked = (frames + 0.5) * FRAME_MS;
    for (const bad of blacklist) {
        if (Math.abs(phaseLocked - bad) < 4.0) { phaseLocked += FRAME_MS; break; }
    }
    return phaseLocked;
}

function normalizeState(value: unknown): DynamicToolStoredState {
    const current = value && typeof value === "object" ? (value as Partial<DynamicToolStoredState>) : {};
    return {
        ...DEFAULT_STATE,
        ...current,
        useTv: current.useTv === "no-tv" ? "no-tv" : "tv",
        hitSeed: typeof current.hitSeed === "boolean" ? current.hitSeed : true,
        tvBlacklist: Array.isArray(current.tvBlacklist) ? current.tvBlacklist.filter((v): v is string => typeof v === "string") : [],
        logs: Array.isArray(current.logs)
            ? current.logs.map((entry) => {
                  const next = entry && typeof entry === "object" ? (entry as Partial<DynamicToolLogEntry>) : {};
                  return {
                      id: typeof next.id === "string" && next.id ? next.id : globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
                      mode: next.mode === "no-tv" ? ("no-tv" as DynamicToolMode) : ("tv" as DynamicToolMode),
                      useTv: next.useTv === "no-tv" ? ("no-tv" as DynamicToolMode) : ("tv" as DynamicToolMode),
                      tvTime: typeof next.tvTime === "string" ? next.tvTime : "0",
                      remainTime: typeof next.remainTime === "string" ? next.remainTime : "5000",
                      parityTime: typeof next.parityTime === "string" ? next.parityTime : "1500",
                      targetAdv: typeof next.targetAdv === "string" ? next.targetAdv : "",
                      actualHit: typeof next.actualHit === "string" ? next.actualHit : "",
                      baseTimeTv: typeof next.baseTimeTv === "string" ? next.baseTimeTv : DEFAULT_BASE_TIME_TV.toFixed(0),
                      baseTimeNoTv: typeof next.baseTimeNoTv === "string" ? next.baseTimeNoTv : DEFAULT_BASE_TIME_NO_TV.toFixed(0),
                      hitSeed: typeof next.hitSeed === "boolean" ? next.hitSeed : true,
                      lastDiff: typeof next.lastDiff === "string" ? next.lastDiff : "",
                      tvBlacklist: Array.isArray(next.tvBlacklist)
                          ? next.tvBlacklist.filter((v): v is string => typeof v === "string")
                          : [],
                  };
              }).slice(0, MAX_LOG_ITEMS)
            : [],
    };
}

function ReadonlyValue({ label, value, helperText }: { label: string; value: string; helperText?: string }) {
    return (
        <TextField
            label={label}
            value={value}
            helperText={helperText}
            InputProps={{ readOnly: true }}
            onFocus={(event) => { event.target.select(); }}
            onClick={(event) => event.currentTarget.querySelector("input")?.select()}
            fullWidth
            sx={{
                ...fieldSx,
            }}
        />
    );
}

const CalibrationDynamicToolPanel = memo(function CalibrationDynamicToolPanel({
    floating = false,
    onToggleFloating,
    onHeaderMouseDown,
}: {
    floating?: boolean;
    onToggleFloating?: () => void;
    onHeaderMouseDown?: (event: ReactMouseEvent<HTMLDivElement>) => void;
}) {
    const { t } = useI18n();
    const [storedState, setState] = useLocalStorage<DynamicToolStoredState>(STORAGE_KEY, DEFAULT_STATE);
    const [feedback, setFeedback] = useState("");
    const [feedbackSeverity, setFeedbackSeverity] = useState<"success" | "warning">("success");
    const [rollbackCandidate, setRollbackCandidate] = useState<DynamicToolLogEntry | null>(null);
    const state = normalizeState(storedState);
    const displayedLogs = getLogsForMode(state.logs, state.useTv);
    const setField = (key: keyof DynamicToolStoredState, value: string | boolean) =>
        setState((current: DynamicToolStoredState) => ({ ...normalizeState(current), [key]: value }));

    const warn = (key: string) => { setFeedbackSeverity("warning"); setFeedback(t(key)); };
    const ok = (key: string) => { setFeedbackSeverity("success"); setFeedback(t(key)); };

    const handleInitialize = () => {
        const targetAdv = parseNumber(state.targetAdv);
        const baseTimeTv = parseNumber(state.baseTimeTv);
        const baseTimeNoTv = parseNumber(state.baseTimeNoTv);
        if ([targetAdv, baseTimeTv, baseTimeNoTv, parseNumber(state.parityTime)].some((value) => Number.isNaN(value))) return warn("dynamicTool.invalidCalculation");
        if (state.useTv === "tv") {
            const rawTv = (targetAdv - 180.0 - (baseTimeTv + DEFAULT_REMAIN_TIME) * ADV_PER_MS_NORMAL) / TV_BLOCK_EXTRA * FRAME_MS;
            const alignedTv = alignToSafePhase(rawTv, state.tvBlacklist.map(parseNumber).filter((value) => !Number.isNaN(value)));
            setState((current: DynamicToolStoredState) => {
                const next = normalizeState(current);
                return {
                    ...next,
                    tvTime: formatMs(alignedTv),
                    remainTime: "5000",
                    lastDiff: "",
                    actualHit: "",
                    logs: appendLog(next.logs, {
                        ...createSnapshot({
                            ...next,
                            tvTime: formatMs(alignedTv),
                            remainTime: "5000",
                            lastDiff: "",
                            actualHit: "",
                        }),
                        mode: "tv",
                        tvTime: formatMs(alignedTv),
                        remainTime: "5000",
                        parityTime: next.parityTime,
                    }),
                };
            });
        } else {
            const remainTime = (targetAdv - 180.0) / ADV_PER_MS_NORMAL - baseTimeNoTv;
            setState((current: DynamicToolStoredState) => {
                const next = normalizeState(current);
                return {
                    ...next,
                    tvTime: "0",
                    remainTime: formatMs(remainTime),
                    lastDiff: "",
                    actualHit: "",
                    logs: appendLog(next.logs, {
                        ...createSnapshot({
                            ...next,
                            tvTime: "0",
                            remainTime: formatMs(remainTime),
                            lastDiff: "",
                            actualHit: "",
                        }),
                        mode: "no-tv",
                        tvTime: "0",
                        remainTime: formatMs(remainTime),
                        parityTime: next.parityTime,
                    }),
                };
            });
        }
        ok("dynamicTool.calculateCompleted");
    };

    const handleCorrect = () => {
        const targetAdv = parseNumber(state.targetAdv);
        const actualAdv = parseNumber(state.actualHit);
        const parityTime = parseNumber(state.parityTime);
        const tvTime = parseNumber(state.tvTime);
        const remainTime = parseNumber(state.remainTime);
        const baseTimeTv = parseNumber(state.baseTimeTv);
        const baseTimeNoTv = parseNumber(state.baseTimeNoTv);
        if ([targetAdv, actualAdv, parityTime, remainTime, baseTimeTv, baseTimeNoTv].some((value) => Number.isNaN(value))) return warn("dynamicTool.invalidCorrection");
        if (state.useTv === "tv" && Number.isNaN(tvTime)) return warn("dynamicTool.invalidCorrection");

        let nextParityTime = parityTime;
        let nextTvTime = state.useTv === "tv" ? tvTime : 0;
        let nextRemainTime = remainTime;
        const nextBlacklist = [...state.tvBlacklist];
        const diff = targetAdv - actualAdv;
        if (state.hitSeed && targetAdv % 2 !== actualAdv % 2) { nextParityTime += PARITY_SHIFT_MS; }
        if (diff === 0) {
            // keep current values
        }
        else if (!state.hitSeed && Math.abs(diff) <= 1.0) {
            // seed-protection: keep current values
        }
        else if (state.useTv === "no-tv") { nextRemainTime += diff / ADV_PER_MS_NORMAL; }
        else {
            let residual = diff;
            const jumps = Math.round(diff / TV_SINGLE_BLOCK_TOTAL);
            if (Math.abs(jumps) >= 1.0 && Math.abs(diff - jumps * TV_SINGLE_BLOCK_TOTAL) <= 100.0) {
                nextBlacklist.push(formatMs(nextTvTime));
                nextTvTime += jumps * FRAME_MS;
                residual = diff - jumps * TV_SINGLE_BLOCK_TOTAL;
                nextTvTime = alignToSafePhase(nextTvTime, nextBlacklist.map(parseNumber).filter((value) => !Number.isNaN(value)));
            }
            if (Math.abs(residual) > 1000.0) {
                nextTvTime = alignToSafePhase(nextTvTime + (residual / TV_BLOCK_EXTRA) * FRAME_MS, nextBlacklist.map(parseNumber).filter((value) => !Number.isNaN(value)));
            } else {
                nextRemainTime += residual / ADV_PER_MS_NORMAL;
            }
        }

        setState((current: DynamicToolStoredState) => {
            const next = normalizeState(current);
            return {
                ...next,
                parityTime: formatMs(nextParityTime),
                tvTime: formatMs(nextTvTime),
                remainTime: formatMs(nextRemainTime),
                lastDiff: diff.toFixed(0),
                actualHit: "",
                tvBlacklist: nextBlacklist.slice(-8),
                logs: appendLog(next.logs, {
                    ...createSnapshot({
                        ...next,
                        parityTime: formatMs(nextParityTime),
                        tvTime: formatMs(nextTvTime),
                        remainTime: formatMs(nextRemainTime),
                        lastDiff: diff.toFixed(0),
                        actualHit: "",
                        tvBlacklist: nextBlacklist.slice(-8),
                    }),
                    mode: next.useTv, tvTime: formatMs(nextTvTime), remainTime: formatMs(nextRemainTime), parityTime: formatMs(nextParityTime),
                }),
            };
        });
        ok(diff === 0 ? "dynamicTool.perfectAligned" : "dynamicTool.correctionCompleted");
    };

    const handleCalculate = () => {
        if (state.actualHit.trim()) {
            handleCorrect();
            return;
        }
        handleInitialize();
    };

    const handleReset = () => {
        setState((current: DynamicToolStoredState) => {
            const next = normalizeState(current);
            return {
                ...DEFAULT_STATE,
                targetAdv: next.targetAdv,
            };
        });
        ok("dynamicTool.clearedState");
    };
    const handleRollbackConfirm = () => {
        if (!rollbackCandidate) return;
        setState((current: DynamicToolStoredState) => {
            const next = normalizeState(current);
            const rollbackIndex = next.logs.findIndex(
                (entry) => entry.id === rollbackCandidate.id
            );
            if (rollbackIndex === -1) {
                return next;
            }

            const rollbackEntry = next.logs[rollbackIndex];
            const rollbackLogs = next.logs.slice(rollbackIndex);

            return {
                ...next,
                targetAdv: rollbackEntry.targetAdv,
                actualHit: rollbackEntry.actualHit,
                parityTime: rollbackEntry.parityTime,
                tvTime: rollbackEntry.tvTime,
                remainTime: rollbackEntry.remainTime,
                baseTimeTv: rollbackEntry.baseTimeTv,
                baseTimeNoTv: rollbackEntry.baseTimeNoTv,
                useTv: rollbackEntry.useTv,
                hitSeed: rollbackEntry.hitSeed,
                lastDiff: rollbackEntry.lastDiff,
                tvBlacklist: [...rollbackEntry.tvBlacklist],
                logs: rollbackLogs,
            };
        });
        setRollbackCandidate(null);
        ok("dynamicTool.rollbackCompleted");
    };

    return (
        <>
            <Paper
                variant="outlined"
                sx={{
                    width: "100%",
                    minWidth: 0,
                    overflow: "hidden",
                    position: "relative",
                    boxSizing: "border-box",
                    borderRadius: 4,
                    p: { xs: 1.5, md: 2.25 },
                    background:
                        "linear-gradient(180deg, rgba(29,34,40,0.96), rgba(18,21,26,0.98))",
                    borderColor: "rgba(166,214,255,0.16)",
                    boxShadow:
                        "0 20px 52px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background:
                            "linear-gradient(135deg, rgba(143,200,247,0.16), transparent 28%, transparent 72%, rgba(143,200,247,0.08))",
                    },
                }}
            >
                <Box sx={{ position: "relative", zIndex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1.25, minWidth: 0 }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                            flex: 1,
                            cursor: floating ? "move" : "default",
                            userSelect: "none",
                        }}
                        onMouseDown={onHeaderMouseDown}
                    >
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h6" sx={{ textAlign: "left", fontWeight: 800, letterSpacing: 0.2 }}>
                                {t("dynamicTool.title")}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "left", mt: 0.35 }}>
                                {t("dynamicTool.historyUnit")}
                            </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {onToggleFloating ? (
                                <IconButton
                                    size="small"
                                    onClick={onToggleFloating}
                                    aria-label={t(
                                        floating
                                            ? "compare.minimize"
                                            : "compare.floatWindow"
                                    )}
                                >
                                    <Box
                                        component="span"
                                        sx={{ fontSize: "1rem", lineHeight: 1 }}
                                    >
                                        {floating ? "−" : "□"}
                                    </Box>
                                </IconButton>
                            ) : null}
                            <Button size="small" variant="outlined" onClick={handleReset}>{t("dynamicTool.clearAll")}</Button>
                        </Box>
                    </Box>
                </Box>
                <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
                    <Paper
                        variant="outlined"
                        sx={sectionCardSx}
                    >
                        <Typography variant="subtitle2" sx={{ mb: 1.75, fontWeight: 700 }}>{t("dynamicTool.modeSection")}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t("dynamicTool.modeLabel")}</Typography>
                        <Box sx={toggleGridSx}>
                            <Button
                                variant={state.useTv === "tv" ? "contained" : "outlined"}
                                onClick={() => setState((current: DynamicToolStoredState) => ({ ...normalizeState(current), useTv: "tv" }))}
                                sx={{
                                    ...toggleButtonBaseSx,
                                    color: state.useTv === "tv" ? "#0f1720" : "rgba(255,255,255,0.92)",
                                    borderColor: "rgba(143,200,247,0.45)",
                                    background: state.useTv === "tv" ? "linear-gradient(135deg, #8fc8f7, #74aee2)" : "transparent",
                                }}
                            >
                                {t("dynamicTool.modeTv")}
                            </Button>
                            <Button
                                variant={state.useTv === "no-tv" ? "contained" : "outlined"}
                                onClick={() => setState((current: DynamicToolStoredState) => ({ ...normalizeState(current), useTv: "no-tv" }))}
                                sx={{
                                    ...toggleButtonBaseSx,
                                    color: state.useTv === "no-tv" ? "#0f1720" : "rgba(255,255,255,0.92)",
                                    borderColor: "rgba(143,200,247,0.45)",
                                    background: state.useTv === "no-tv" ? "linear-gradient(135deg, #8fc8f7, #74aee2)" : "transparent",
                                }}
                            >
                                {t("dynamicTool.modeNoTv")}
                            </Button>
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t("dynamicTool.targetAdv")}</Typography>
                        <TextField
                            value={state.targetAdv}
                            onChange={(event) => setField("targetAdv", event.target.value)}
                            fullWidth
                            sx={fieldSx}
                        />
                    </Paper>

                    <Paper
                        variant="outlined"
                        sx={sectionCardSx}
                    >
                        <Typography variant="subtitle2" sx={{ mb: 1.75 }}>
                            {state.useTv === "tv" ? t("dynamicTool.tvParams") : t("dynamicTool.noTvParams")}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {t("dynamicTool.baseTimeInput")}
                        </Typography>
                        {state.useTv === "tv" ? (
                            <TextField
                                value={state.baseTimeTv}
                                onChange={(event) => setField("baseTimeTv", event.target.value)}
                                fullWidth
                                sx={{
                                    mb: 0.75,
                                    ...fieldSx,
                                }}
                            />
                        ) : (
                            <TextField
                                value={state.baseTimeNoTv}
                                onChange={(event) => setField("baseTimeNoTv", event.target.value)}
                                fullWidth
                                sx={{
                                    mb: 0.75,
                                    ...fieldSx,
                                }}
                            />
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {state.useTv === "tv"
                                ? t("dynamicTool.baseTimeTvHint")
                                : t("dynamicTool.baseTimeNoTvHint")}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t("dynamicTool.actualHit")}</Typography>
                        <TextField
                            value={state.actualHit}
                            onChange={(event) => setField("actualHit", event.target.value)}
                            placeholder={t("dynamicTool.actualHitPlaceholder")}
                            fullWidth
                            sx={{
                                mb: 0.75,
                                ...fieldSx,
                            }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {t("dynamicTool.actualHitHint")}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t("dynamicTool.seedStatusLabel")}</Typography>
                        <Box sx={toggleGridSx}>
                            <Button
                                variant={state.hitSeed ? "contained" : "outlined"}
                                onClick={() => setField("hitSeed", true)}
                                sx={{
                                    ...toggleButtonBaseSx,
                                    minHeight: 46,
                                    color: state.hitSeed ? "#0f1720" : "rgba(255,255,255,0.92)",
                                    borderColor: "rgba(143,200,247,0.45)",
                                    background: state.hitSeed ? "linear-gradient(135deg, #8fc8f7, #74aee2)" : "transparent",
                                }}
                            >
                                {t("dynamicTool.seedHit")}
                            </Button>
                            <Button
                                variant={!state.hitSeed ? "contained" : "outlined"}
                                onClick={() => setField("hitSeed", false)}
                                sx={{
                                    ...toggleButtonBaseSx,
                                    minHeight: 46,
                                    color: !state.hitSeed ? "#0f1720" : "rgba(255,255,255,0.92)",
                                    borderColor: "rgba(143,200,247,0.45)",
                                    background: !state.hitSeed ? "linear-gradient(135deg, #8fc8f7, #74aee2)" : "transparent",
                                }}
                            >
                                {t("dynamicTool.seedMiss")}
                            </Button>
                        </Box>

                        <Button
                            variant="contained"
                            onClick={handleCalculate}
                            fullWidth
                            sx={{
                                minHeight: 50,
                                borderRadius: 3,
                                fontWeight: 800,
                                letterSpacing: 0.4,
                                color: "#0f1720",
                                background: "linear-gradient(135deg, #8fc8f7, #74aee2)",
                                boxShadow: "0 10px 24px rgba(116, 174, 226, 0.28)",
                            }}
                        >
                            {t("dynamicTool.calculateAction")}
                        </Button>
                    </Paper>

                    <Paper
                        variant="outlined"
                        sx={sectionCardSx}
                    >
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>{t("dynamicTool.currentResultSection")}</Typography>
                        <Box sx={metricGridSx}>
                            <ReadonlyValue label={t("dynamicTool.currentParityLabel")} value={state.parityTime} />
                            <ReadonlyValue label={t("dynamicTool.currentTvLabel")} value={state.useTv === "tv" ? state.tvTime : t("dynamicTool.notUsedShort")} />
                            <ReadonlyValue label={t("dynamicTool.currentWaitLabel")} value={state.remainTime} />
                            <ReadonlyValue label={t("dynamicTool.currentBaseLabel")} value={state.useTv === "tv" ? state.baseTimeTv : state.baseTimeNoTv} />
                        </Box>
                        {state.lastDiff ? <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
                            <Chip label={`${t("dynamicTool.lastDiff")}: ${state.lastDiff}`} color={state.lastDiff === "0" ? "success" : "default"} variant="outlined" />
                        </Box> : null}
                    </Paper>

                    <Paper
                        variant="outlined"
                        sx={sectionCardSx}
                    >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
                            <Typography variant="subtitle2">{t("dynamicTool.historySection")}</Typography>
                            <Typography variant="caption" color="text.secondary">{t("dynamicTool.historyUnit")}</Typography>
                        </Box>
                        {displayedLogs.length === 0 ? <Typography variant="body2" color="text.secondary">{t("dynamicTool.emptyHistory")}</Typography> : (
                            <Box sx={{ minWidth: 0, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2.5, overflow: "hidden" }}>
                                <Box sx={{ display: "grid", minWidth: 0, gridTemplateColumns: state.useTv === "tv" ? "72px repeat(3, minmax(0, 1fr))" : "72px repeat(2, minmax(0, 1fr))", backgroundColor: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                    <Box sx={{ px: 1.5, py: 1 }}><Typography variant="caption" color="text.secondary">{t("dynamicTool.historyRound")}</Typography></Box>
                                    {state.useTv === "tv" ? <Box sx={{ px: 1.5, py: 1 }}><Typography variant="caption" color="text.secondary">{t("dynamicTool.historyTvShort")}</Typography></Box> : null}
                                    <Box sx={{ px: 1.5, py: 1 }}><Typography variant="caption" color="text.secondary">{t("dynamicTool.historyWaitShort")}</Typography></Box>
                                    <Box sx={{ px: 1.5, py: 1 }}><Typography variant="caption" color="text.secondary">{t("dynamicTool.historyParityShort")}</Typography></Box>
                                </Box>
                                {displayedLogs.map((entry, index) => (
                                    <Box
                                        key={entry.id}
                                        onClick={() => setRollbackCandidate(entry)}
                                        title={t("dynamicTool.rollbackHint")}
                                        sx={{
                                            display: "grid",
                                            minWidth: 0,
                                            gridTemplateColumns: state.useTv === "tv" ? "72px repeat(3, minmax(0, 1fr))" : "72px repeat(2, minmax(0, 1fr))",
                                            borderBottom: index === displayedLogs.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                                            backgroundColor: index % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.035)",
                                            cursor: "pointer",
                                            transition: "background-color 0.16s ease",
                                            "&:hover": {
                                                backgroundColor: "rgba(143,200,247,0.12)",
                                            },
                                            "&:hover .dynamic-tool-rollback-label": {
                                                opacity: 1,
                                            },
                                        }}
                                    >
                                        <Box sx={{ px: 1.5, py: 1.25, display: "flex", alignItems: "center", gap: 0.75 }}>
                                            <Typography variant="body2">#{displayedLogs.length - index}</Typography>
                                            <Typography
                                                variant="caption"
                                                className="dynamic-tool-rollback-label"
                                                sx={{ opacity: 0, color: "primary.light", transition: "opacity 0.16s ease" }}
                                            >
                                                {t("dynamicTool.rollbackAction")}
                                            </Typography>
                                        </Box>
                                        {state.useTv === "tv" ? <Box sx={{ px: 1.5, py: 1.25 }}><Typography variant="body2">{entry.tvTime}</Typography></Box> : null}
                                        <Box sx={{ px: 1.5, py: 1.25 }}><Typography variant="body2">{entry.remainTime}</Typography></Box>
                                        <Box sx={{ px: 1.5, py: 1.25 }}><Typography variant="body2">{entry.parityTime}</Typography></Box>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Paper>
                </Box>
                </Box>
            </Paper>
            <Snackbar open={Boolean(feedback)} autoHideDuration={2200} onClose={() => setFeedback("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert severity={feedbackSeverity} variant="filled" onClose={() => setFeedback("")} sx={{ width: "100%" }}>{feedback}</Alert>
            </Snackbar>
            <Dialog open={Boolean(rollbackCandidate)} onClose={() => setRollbackCandidate(null)} fullWidth maxWidth="xs">
                <DialogTitle>{t("dynamicTool.rollbackDialogTitle")}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {t("dynamicTool.rollbackDialogBody", {
                            round: rollbackCandidate
                                ? `#${displayedLogs.length - displayedLogs.findIndex((entry) => entry.id === rollbackCandidate.id)}`
                                : "-",
                        })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRollbackCandidate(null)}>{t("common.close")}</Button>
                    <Button variant="contained" onClick={handleRollbackConfirm}>{t("dynamicTool.rollbackConfirm")}</Button>
                </DialogActions>
            </Dialog>
        </>
    );
});

export default CalibrationDynamicToolPanel;
