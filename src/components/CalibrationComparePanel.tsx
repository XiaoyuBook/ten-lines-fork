import {
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { memo, useState } from "react";

import { getName, useI18n } from "../i18n";
import { frameToMS, hexSeed } from "../tenLines";
import type {
    ExtendedGeneratorState,
    ExtendedWildGeneratorState,
} from "../tenLines/generated";

export type CalibrationResultRow =
    | ExtendedGeneratorState
    | ExtendedWildGeneratorState;

export type CalibrationCompareColumn =
    | "seed"
    | "advances"
    | "pid"
    | "shiny"
    | "nature"
    | "ability"
    | "ivs"
    | "hidden"
    | "power"
    | "gender";

export type CalibrationCompareMode = "target" | "previous";
export type CalibrationComparePosition = "left" | "right";

export interface CalibrationCompareSettings {
    enabled: boolean;
    position: CalibrationComparePosition;
    compareMode: CalibrationCompareMode;
    visibleColumns: CalibrationCompareColumn[];
    calculatorEnabled: boolean;
}

export interface CalibrationCompareEntry {
    id: string;
    row: CalibrationResultRow;
}

export const DEFAULT_COMPARE_COLUMNS: CalibrationCompareColumn[] = [
    "seed",
    "advances",
    "pid",
    "nature",
    "ivs",
    "hidden",
    "power",
];

function formatSignedDelta(value: number) {
    if (value === 0) {
        return "0";
    }
    return `${value > 0 ? "+" : ""}${value}`;
}

function getDeltaColor(value: number) {
    if (value > 0) {
        return "success.main";
    }
    if (value < 0) {
        return "error.main";
    }
    return "text.secondary";
}

function getAbilityText(
    row: CalibrationResultRow,
    resources: ReturnType<typeof useI18n>["resources"]
) {
    return `${row.ability}: ${resources.abilities[row.abilityIndex - 1]}`;
}

function getColumnValue(
    column: CalibrationCompareColumn,
    row: CalibrationResultRow,
    resources: ReturnType<typeof useI18n>["resources"]
) {
    switch (column) {
        case "seed":
            return hexSeed(row.initialSeed, 16);
        case "advances":
            return String(row.advances);
        case "pid":
            return hexSeed(row.pid, 32);
        case "shiny":
            return resources.shininess[row.shiny];
        case "nature":
            return resources.natures[row.nature];
        case "ability":
            return getAbilityText(row, resources);
        case "ivs":
            return row.ivs.join("/");
        case "hidden":
            return resources.types[row.hiddenPower];
        case "power":
            return String(row.hiddenPowerStrength);
        case "gender":
            return resources.genders[row.gender];
    }
}

function CompareCell({
    column,
    row,
    baseline,
    gameConsole,
}: {
    column: CalibrationCompareColumn;
    row: CalibrationResultRow;
    baseline: CalibrationResultRow | null;
    gameConsole: string;
}) {
    const { t, resources } = useI18n();

    if (column === "seed") {
        const delta = baseline
            ? frameToMS(row.seedTime / 16, gameConsole) -
              frameToMS(baseline.seedTime / 16, gameConsole)
            : null;

        return (
            <Box>
                <Typography variant="body2" fontWeight={600}>
                    {hexSeed(row.initialSeed, 16)}
                </Typography>
                {delta !== null && (
                    <Typography
                        variant="caption"
                        sx={{ color: getDeltaColor(delta) }}
                    >
                        ({formatSignedDelta(delta)}
                        {t("messages.ms")})
                    </Typography>
                )}
            </Box>
        );
    }

    if (column === "advances") {
        const delta = baseline ? row.advances - baseline.advances : null;

        return (
            <Box>
                <Typography variant="body2" fontWeight={600}>
                    {row.advances}
                </Typography>
                {delta !== null && (
                    <Typography
                        variant="caption"
                        sx={{ color: getDeltaColor(delta) }}
                    >
                        ({formatSignedDelta(delta)})
                    </Typography>
                )}
            </Box>
        );
    }

    return <>{getColumnValue(column, row, resources)}</>;
}

function TargetSummary({
    entry,
    visibleColumns,
    gameConsole,
    onDelete,
}: {
    entry: CalibrationCompareEntry;
    visibleColumns: CalibrationCompareColumn[];
    gameConsole: string;
    onDelete: () => void;
}) {
    const { t, resources } = useI18n();
    const isShiny = entry.row.shiny > 0;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 3,
                borderColor: isShiny ? "#d4af37" : "primary.main",
                background:
                    isShiny
                        ? "linear-gradient(135deg, rgba(212,175,55,0.30), rgba(212,175,55,0.10))"
                        : "linear-gradient(135deg, rgba(25,118,210,0.22), rgba(25,118,210,0.08))",
                boxShadow: isShiny
                    ? "0 0 0 1px rgba(212,175,55,0.2), 0 12px 28px rgba(212,175,55,0.12)"
                    : "none",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                        label={t("compare.target")}
                        color={isShiny ? "warning" : "primary"}
                        size="small"
                    />
                    {"species" in entry.row && (
                        <Typography variant="body2" color="text.secondary">
                            {getName(
                                resources,
                                entry.row.species,
                                entry.row.form
                            )}
                        </Typography>
                    )}
                </Box>
                <Tooltip title={t("compare.deleteTarget")}>
                    <IconButton
                        size="small"
                        color="inherit"
                        onClick={onDelete}
                        aria-label={t("compare.deleteTarget")}
                        sx={{
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.12)",
                            backgroundColor: "rgba(255,255,255,0.04)",
                            "&:hover": {
                                backgroundColor: "rgba(244,67,54,0.16)",
                                borderColor: "rgba(244,67,54,0.45)",
                            },
                        }}
                    >
                        <Box component="span" sx={{ fontSize: "0.95rem" }}>
                            🗑
                        </Box>
                    </IconButton>
                </Tooltip>
            </Box>
            <Box
                sx={{
                    mt: 1.5,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 1.25,
                }}
            >
                {visibleColumns.map((column) => (
                    <Box
                        key={column}
                        sx={{
                            px: 1.25,
                            py: 1,
                            borderRadius: 2,
                            backgroundColor: "rgba(255,255,255,0.04)",
                            textAlign: "left",
                        }}
                    >
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 0.5 }}
                        >
                            {t(`table.${column}`)}
                        </Typography>
                        <Box sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
                            <CompareCell
                                column={column}
                                row={entry.row}
                                baseline={null}
                                gameConsole={gameConsole}
                            />
                        </Box>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
}

function evaluateExpression(expression: string) {
    const sanitized = expression.replace(/\s+/g, "");
    if (!sanitized) {
        return "";
    }
    if (!/^[\d.+\-*/()]+$/.test(sanitized)) {
        return "ERR";
    }
    try {
        const result = Function(`"use strict"; return (${sanitized});`)();
        if (typeof result !== "number" || !Number.isFinite(result)) {
            return "ERR";
        }
        return Number.isInteger(result) ? String(result) : result.toFixed(4).replace(/\.?0+$/, "");
    } catch {
        return "ERR";
    }
}

function CompareCalculator() {
    const { t } = useI18n();
    const [expression, setExpression] = useState("");
    const [displayResult, setDisplayResult] = useState("0");

    const appendValue = (value: string) => {
        setExpression((current) => `${current}${value}`);
    };

    const handleEvaluate = () => {
        const result = evaluateExpression(expression);
        setDisplayResult(result || "0");
        if (result && result !== "ERR") {
            setExpression(result);
        }
    };

    const liveResult = evaluateExpression(expression);
    const keypad = [
        "7",
        "8",
        "9",
        "/",
        "4",
        "5",
        "6",
        "*",
        "1",
        "2",
        "3",
        "-",
        "0",
        ".",
        "(",
        ")",
    ];

    return (
        <Box sx={{ p: 2 }}>
            <Typography
                variant="subtitle2"
                sx={{ textAlign: "left", mb: 1.25 }}
            >
                {t("compare.calculator")}
            </Typography>
            <Paper
                variant="outlined"
                sx={{
                    p: 1.5,
                    borderRadius: 3,
                    backgroundColor: "rgba(255,255,255,0.02)",
                }}
            >
                <TextField
                    fullWidth
                    value={expression}
                    onChange={(event) => {
                        setExpression(event.target.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            handleEvaluate();
                        }
                    }}
                    variant="outlined"
                    inputProps={{
                        style: {
                            textAlign: "right",
                            fontSize: "1.2rem",
                            fontWeight: 600,
                        },
                    }}
                />
                <Box
                    sx={{
                        mt: 1,
                        minHeight: 28,
                        textAlign: "right",
                        color:
                            liveResult === "ERR" ? "error.main" : "text.secondary",
                    }}
                >
                    {expression && (
                        <Typography variant="body2">
                            = {liveResult || displayResult}
                        </Typography>
                    )}
                </Box>
                <Box
                    sx={{
                        mt: 1,
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: 1,
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={() => {
                            setExpression("");
                            setDisplayResult("0");
                        }}
                    >
                        {t("compare.clearShort")}
                    </Button>
                    <Button variant="outlined" onClick={() => appendValue("+")}>
                        +
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() =>
                            setExpression((current) => current.slice(0, -1))
                        }
                    >
                        <Box component="span" sx={{ lineHeight: 1 }}>
                            ←
                        </Box>
                    </Button>
                    <Button variant="contained" onClick={handleEvaluate}>
                        =
                    </Button>
                    {keypad.map((key) => (
                        <Button
                            key={key}
                            variant="outlined"
                            onClick={() => appendValue(key)}
                        >
                            {key}
                        </Button>
                    ))}
                </Box>
            </Paper>
        </Box>
    );
}

const CalibrationComparePanel = memo(function CalibrationComparePanel({
    targetEntry,
    historyEntries,
    settings,
    floating,
    gameConsole,
    onDeleteTarget,
    onDeleteHistoryEntry,
    onClearAll,
    onOpenSettings,
    onToggleFloating,
}: {
    targetEntry: CalibrationCompareEntry | null;
    historyEntries: CalibrationCompareEntry[];
    settings: CalibrationCompareSettings;
    floating: boolean;
    gameConsole: string;
    onDeleteTarget: () => void;
    onDeleteHistoryEntry: (id: string) => void;
    onClearAll: () => void;
    onOpenSettings: () => void;
    onToggleFloating: () => void;
}) {
    const { t } = useI18n();

    if (!settings.enabled) {
        return null;
    }

    return (
        <Paper
            variant="outlined"
            sx={{
                width: "100%",
                height: floating ? "100%" : "auto",
                minWidth: 0,
                borderRadius: 4,
                overflow: "hidden",
                background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                borderColor: "rgba(255,255,255,0.12)",
            }}
        >
            <Box sx={{ p: 2 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                    }}
                >
                    <Box>
                        <Typography variant="h6" sx={{ textAlign: "left" }}>
                            {t("compare.title")}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", textAlign: "left" }}
                        >
                            {t(
                                settings.compareMode === "target"
                                    ? "compare.modeTarget"
                                    : "compare.modePrevious"
                            )}
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Tooltip
                            title={t(
                                floating
                                    ? "compare.minimize"
                                    : "compare.floatWindow"
                            )}
                        >
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
                                    {floating ? "—" : "⧉"}
                                </Box>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={t("compare.settings")}>
                            <IconButton
                                size="small"
                                onClick={onOpenSettings}
                                aria-label={t("compare.settings")}
                            >
                                <Box
                                    component="span"
                                    sx={{ fontSize: "1.05rem", lineHeight: 1 }}
                                >
                                    ⚙
                                </Box>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={t("compare.clearAll")}>
                            <IconButton
                                size="small"
                                onClick={onClearAll}
                                aria-label={t("compare.clearAll")}
                                disabled={!targetEntry && historyEntries.length === 0}
                            >
                                <Box
                                    component="span"
                                    sx={{ fontSize: "1.05rem", lineHeight: 1 }}
                                >
                                    🗑
                                </Box>
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                    {targetEntry ? (
                        <TargetSummary
                            entry={targetEntry}
                            visibleColumns={settings.visibleColumns}
                            gameConsole={gameConsole}
                            onDelete={onDeleteTarget}
                        />
                    ) : (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 3,
                                textAlign: "left",
                                borderStyle: "dashed",
                                color: "text.secondary",
                            }}
                        >
                            <Typography variant="body2">
                                {t("compare.emptyTarget")}
                            </Typography>
                        </Paper>
                    )}
                </Box>
            </Box>

            <Divider />

            <Box sx={{ p: 2 }}>
                <Typography
                    variant="subtitle2"
                    sx={{ textAlign: "left", mb: 1.25 }}
                >
                    {t("compare.history")}
                </Typography>
                {historyEntries.length === 0 ? (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: "left" }}
                    >
                        {t("compare.emptyHistory")}
                    </Typography>
                ) : (
                    <TableContainer
                        component={Box}
                        sx={{
                            maxHeight: 520,
                            overflow: "auto",
                            borderRadius: 3,
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell width={52} align="center"></TableCell>
                                    <TableCell width={76}>
                                        {t("compare.record")}
                                    </TableCell>
                                    {settings.visibleColumns.map((column) => (
                                        <TableCell key={column}>
                                            {t(`table.${column}`)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {historyEntries.map((entry, index) => {
                                    const baseline =
                                        settings.compareMode === "previous"
                                            ? index === 0
                                                ? targetEntry?.row ?? null
                                                : historyEntries[index - 1].row
                                            : targetEntry?.row ?? null;

                                    return (
                                        <TableRow key={entry.id} hover>
                                            <TableCell>
                                                <Tooltip title={t("compare.delete")}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            onDeleteHistoryEntry(entry.id)
                                                        }
                                                        aria-label={t("compare.delete")}
                                                        sx={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 999,
                                                            border:
                                                                "1px solid rgba(255,255,255,0.12)",
                                                            backgroundColor:
                                                                "rgba(255,255,255,0.04)",
                                                            "&:hover": {
                                                                backgroundColor:
                                                                    "rgba(244,67,54,0.16)",
                                                                borderColor:
                                                                    "rgba(244,67,54,0.45)",
                                                            },
                                                        }}
                                                    >
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                fontSize: "0.9rem",
                                                            }}
                                                        >
                                                            🗑
                                                        </Box>
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={`#${index + 1}`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            {settings.visibleColumns.map((column) => (
                                                <TableCell
                                                    key={`${entry.id}-${column}`}
                                                >
                                                    <CompareCell
                                                        column={column}
                                                        row={entry.row}
                                                        baseline={baseline}
                                                        gameConsole={gameConsole}
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
            {settings.calculatorEnabled && (
                <>
                    <Divider />
                    <CompareCalculator />
                </>
            )}
        </Paper>
    );
});

export default CalibrationComparePanel;
