import {
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    Paper,
    Tooltip,
    Typography,
} from "@mui/material";
import { memo, useMemo } from "react";

import { useI18n } from "../i18n";

export interface CalibrationRunHistoryValues {
    game: string;
    sound: string;
    buttonMode: string;
    button: string;
    heldButton: string;
    gameConsole: string;
    targetInitialSeed: string;
    seedLeeway: string;
    advancesMin: string;
    advancesMax: string;
    offset: string;
    overworldFrames: string;
    trainerID: string;
    secretID: string;
    teachyTVMode: boolean;
    ttvAdvancesMin: string;
    ttvAdvancesMax: string;
    staticCategory: number;
    staticPokemon: number;
    wildCategory: number;
    wildLocation: number;
    wildPokemon: number;
    wildLead: number;
    shouldFilterPokemon: boolean;
    method: number;
    shininess: number;
    nature: number;
    gender: number;
    ivRangeStrings: [string, string][];
}

export interface CalibrationRunHistoryEntry {
    id: string;
    createdAt: number;
    resultCount: number;
    values: CalibrationRunHistoryValues;
}

function formatIvRange([min, max]: [string, string]) {
    return min === max ? min : `${min}-${max}`;
}

function RunValue({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <Box
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
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
                {value}
            </Typography>
        </Box>
    );
}

const CalibrationRunHistoryPanel = memo(function CalibrationRunHistoryPanel({
    entries,
    onRestore,
    onDelete,
    onClear,
}: {
    entries: CalibrationRunHistoryEntry[];
    onRestore: (entry: CalibrationRunHistoryEntry) => void;
    onDelete: (id: string) => void;
    onClear: () => void;
}) {
    const { t, resources, locale } = useI18n();
    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            }),
        [locale]
    );

    return (
        <Paper
            variant="outlined"
            sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                borderRadius: 4,
                overflow: "hidden",
                background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                backdropFilter: "blur(14px)",
                borderColor: "rgba(255,255,255,0.12)",
            }}
        >
            <Box
                sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                }}
            >
                <Box sx={{ textAlign: "left" }}>
                    <Typography variant="h6">
                        {t("compare.runHistoryTitle")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t("compare.runHistorySubtitle", {
                            count: entries.length.toString(),
                        })}
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={onClear}
                    disabled={entries.length === 0}
                >
                    {t("compare.clearRuns")}
                </Button>
            </Box>

            <Divider />

            <Box
                sx={{
                    p: 2,
                    display: "grid",
                    gap: 1.5,
                    maxHeight: 520,
                    overflow: "auto",
                }}
            >
                {entries.length === 0 ? (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: "left" }}
                    >
                        {t("compare.emptyRunHistory")}
                    </Typography>
                ) : (
                    entries.map((entry, index) => {
                        const { values } = entry;
                        const natureText =
                            values.nature === -1
                                ? t("common.any")
                                : resources.natures[values.nature];
                        const shinyText =
                            resources.shininess[values.shininess] ??
                            String(values.shininess);
                        const genderText =
                            resources.genders[values.gender] ?? t("common.any");
                        const methodText =
                            resources.methods[values.method] ??
                            String(values.method);
                        const ivSummary = values.ivRangeStrings
                            .map(formatIvRange)
                            .join(" / ");

                        return (
                            <Paper
                                key={entry.id}
                                variant="outlined"
                                sx={{
                                    p: 1.5,
                                    borderRadius: 3,
                                    borderColor: "rgba(255,255,255,0.12)",
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 1,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <Chip
                                            label={`#${entries.length - index}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {dateFormatter.format(entry.createdAt)}
                                        </Typography>
                                        <Chip
                                            label={`${t("labels.resultCount")}: ${entry.resultCount}`}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </Box>
                                    <Box sx={{ display: "flex", gap: 0.5 }}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => onRestore(entry)}
                                        >
                                            {t("compare.restoreRun")}
                                        </Button>
                                        <Tooltip title={t("compare.delete")}>
                                            <IconButton
                                                size="small"
                                                onClick={() => onDelete(entry.id)}
                                                aria-label={t("compare.delete")}
                                            >
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        fontSize: "0.9rem",
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    X
                                                </Box>
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: 1, textAlign: "left" }}
                                >
                                    {values.game} / {values.gameConsole} / {methodText}
                                </Typography>

                                <Box
                                    sx={{
                                        mt: 1.25,
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(auto-fit, minmax(140px, 1fr))",
                                        gap: 1,
                                    }}
                                >
                                    <RunValue
                                        label={t("labels.targetSeed")}
                                        value={`${values.targetInitialSeed} (${t("labels.seedLeeway")}: ${values.seedLeeway})`}
                                    />
                                    <RunValue
                                        label={
                                            values.teachyTVMode
                                                ? t("labels.finalAPressFrame")
                                                : t("labels.advances")
                                        }
                                        value={`${values.advancesMin} - ${values.advancesMax}`}
                                    />
                                    <RunValue
                                        label={t("labels.offset")}
                                        value={values.offset}
                                    />
                                    <RunValue
                                        label={`${t("labels.trainerId")} / ${t("labels.secretId")}`}
                                        value={`${values.trainerID} / ${values.secretID}`}
                                    />
                                    <RunValue
                                        label={`${t("labels.shininess")} / ${t("labels.nature")} / ${t("labels.gender")}`}
                                        value={`${shinyText} / ${natureText} / ${genderText}`}
                                    />
                                    <RunValue
                                        label={t("table.ivs")}
                                        value={ivSummary}
                                    />
                                    {values.teachyTVMode && (
                                        <RunValue
                                            label={t("labels.teachyTvAdvances")}
                                            value={`${values.ttvAdvancesMin} - ${values.ttvAdvancesMax}`}
                                        />
                                    )}
                                    {values.overworldFrames !== "0" && (
                                        <RunValue
                                            label={t("labels.requiredOverworldFrames")}
                                            value={values.overworldFrames}
                                        />
                                    )}
                                    <RunValue
                                        label={t("labels.sound")}
                                        value={values.sound}
                                    />
                                    <RunValue
                                        label={`${t("labels.seedButton")} / ${t("labels.extraButton")}`}
                                        value={`${values.button} / ${values.heldButton}`}
                                    />
                                </Box>
                            </Paper>
                        );
                    })
                )}
            </Box>
        </Paper>
    );
});

export default CalibrationRunHistoryPanel;
