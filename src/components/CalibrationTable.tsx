import {
    Box,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
} from "@mui/material";
import { memo, useState } from "react";

import { getName, useI18n } from "../i18n";
import { frameToMS, hexSeed } from "../tenLines";
import type {
    ExtendedGeneratorState,
    ExtendedWildGeneratorState,
    FRLGContiguousSeedEntry,
} from "../tenLines/generated";

import type { CalibrationResultRow } from "./CalibrationComparePanel";

const CalibrationTable = memo(function CalibrationTable({
    rows,
    target,
    gameConsole,
    isStatic,
    isMultiMethod,
    isTeachyTVMode,
    hasTarget,
    onAddToTarget,
    onAddToHistory,
}: {
    rows: ExtendedGeneratorState[] | ExtendedWildGeneratorState[];
    target: FRLGContiguousSeedEntry;
    gameConsole: string;
    isStatic: boolean;
    isMultiMethod: boolean;
    isTeachyTVMode: boolean;
    hasTarget: boolean;
    onAddToTarget: (row: CalibrationResultRow) => void;
    onAddToHistory: (row: CalibrationResultRow) => void;
}) {
    const { t, resources } = useI18n();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [menuRow, setMenuRow] = useState<CalibrationResultRow | null>(null);

    const defaultAddToTarget = !hasTarget;

    const closeMenu = () => {
        setMenuAnchor(null);
        setMenuRow(null);
    };

    const handleAdd = (
        row: CalibrationResultRow,
        destination: "target" | "history"
    ) => {
        if (destination === "target") {
            onAddToTarget(row);
        } else {
            onAddToHistory(row);
        }
        closeMenu();
    };

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell width={72} align="center">
                            {t("table.actions")}
                        </TableCell>
                        <TableCell>{t("table.seed")}</TableCell>
                        <TableCell>{t("table.advances")}</TableCell>
                        {isMultiMethod && <TableCell>{t("table.method")}</TableCell>}
                        {isTeachyTVMode && (
                            <TableCell>{t("table.finalAPressFrame")}</TableCell>
                        )}
                        {isTeachyTVMode && (
                            <TableCell>{t("table.teachyTvAdvances")}</TableCell>
                        )}
                        {!isStatic && <TableCell>{t("table.slot")}</TableCell>}
                        {!isStatic && <TableCell>{t("table.level")}</TableCell>}
                        <TableCell>{t("table.pid")}</TableCell>
                        <TableCell>{t("table.shiny")}</TableCell>
                        <TableCell>{t("table.nature")}</TableCell>
                        <TableCell>{t("table.ability")}</TableCell>
                        <TableCell>{t("table.ivs")}</TableCell>
                        <TableCell>{t("table.hidden")}</TableCell>
                        <TableCell>{t("table.power")}</TableCell>
                        <TableCell>{t("table.gender")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => {
                        if (index === 1000) {
                            return <TableRow key={index}>...</TableRow>;
                        } else if (index > 1000) {
                            return null;
                        }
                        const seedMS = frameToMS(row.seedTime / 16, gameConsole);
                        const offsetMS =
                            seedMS - frameToMS(target.seedTime / 16, gameConsole);

                        return (
                            <TableRow key={index}>
                                <TableCell align="center">
                                    <Box
                                        sx={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            p: 0.25,
                                            borderRadius: 999,
                                            border: "1px solid rgba(144,202,249,0.28)",
                                            backgroundColor: "rgba(144,202,249,0.08)",
                                        }}
                                    >
                                        <Tooltip
                                            title={t(
                                                defaultAddToTarget
                                                    ? "compare.addToTarget"
                                                    : "compare.addToHistory"
                                            )}
                                        >
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                aria-label={t(
                                                    defaultAddToTarget
                                                        ? "compare.addToTarget"
                                                        : "compare.addToHistory"
                                                )}
                                                sx={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 999,
                                                    backgroundColor:
                                                        "primary.main",
                                                    color: "primary.contrastText",
                                                    "&:hover": {
                                                        backgroundColor:
                                                            "primary.dark",
                                                    },
                                                }}
                                                onClick={() =>
                                                    handleAdd(
                                                        row,
                                                        defaultAddToTarget
                                                            ? "target"
                                                            : "history"
                                                    )
                                                }
                                            >
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        fontSize: "1.05rem",
                                                        fontWeight: 700,
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    +
                                                </Box>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={t("compare.moreActions")}>
                                            <Button
                                                size="small"
                                                variant="text"
                                                color="primary"
                                                aria-label={t("compare.moreActions")}
                                                sx={{
                                                    minWidth: 24,
                                                    px: 0.5,
                                                    borderRadius: 999,
                                                }}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setMenuAnchor(
                                                        event.currentTarget
                                                    );
                                                    setMenuRow(row);
                                                }}
                                            >
                                                <Box
                                                    component="span"
                                                    sx={{ fontSize: "0.75rem" }}
                                                >
                                                    v
                                                </Box>
                                            </Button>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <div style={{ float: "left" }}>
                                        {hexSeed(row.initialSeed, 16)} | {seedMS}
                                    </div>
                                    <span>{t("messages.ms")}</span> (
                                    {offsetMS >= 0 && "+"}
                                    {offsetMS}
                                    {t("messages.ms")})
                                </TableCell>
                                <TableCell>{row.advances}</TableCell>
                                {isMultiMethod && (
                                    <TableCell>
                                        {
                                            resources.methods[
                                                (row as ExtendedWildGeneratorState).method
                                            ]
                                        }
                                    </TableCell>
                                )}
                                {isTeachyTVMode && (
                                    <TableCell>
                                        {row.advances - row.ttvAdvances * 313 + row.ttvAdvances}
                                    </TableCell>
                                )}
                                {isTeachyTVMode && (
                                    <TableCell>{row.ttvAdvances}</TableCell>
                                )}
                                {!isStatic && (
                                    <TableCell>
                                        {(row as ExtendedWildGeneratorState).encounterSlot}:{" "}
                                        {getName(
                                            resources,
                                            (row as ExtendedWildGeneratorState).species,
                                            (row as ExtendedWildGeneratorState).form
                                        )}
                                    </TableCell>
                                )}
                                {!isStatic && (
                                    <TableCell>
                                        {(row as ExtendedWildGeneratorState).level}
                                    </TableCell>
                                )}
                                <TableCell>{hexSeed(row.pid, 32)}</TableCell>
                                <TableCell>{resources.shininess[row.shiny]}</TableCell>
                                <TableCell>{resources.natures[row.nature]}</TableCell>
                                <TableCell>
                                    {row.ability}: {resources.abilities[row.abilityIndex - 1]}
                                </TableCell>
                                <TableCell>{row.ivs.join("/")}</TableCell>
                                <TableCell>{resources.types[row.hiddenPower]}</TableCell>
                                <TableCell>{row.hiddenPowerStrength}</TableCell>
                                <TableCell>{resources.genders[row.gender]}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
                <MenuItem
                    onClick={() => {
                        if (menuRow) {
                            handleAdd(menuRow, "target");
                        }
                    }}
                >
                    {t("compare.addToTarget")}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (menuRow) {
                            handleAdd(menuRow, "history");
                        }
                    }}
                >
                    {t("compare.addToHistory")}
                </MenuItem>
            </Menu>
        </TableContainer>
    );
});

export default CalibrationTable;
