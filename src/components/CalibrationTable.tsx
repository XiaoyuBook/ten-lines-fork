import {
    Button,
    ButtonGroup,
    Menu,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
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
    compareEntryCount,
    onAddToTarget,
    onAddToHistory,
}: {
    rows: ExtendedGeneratorState[] | ExtendedWildGeneratorState[];
    target: FRLGContiguousSeedEntry;
    gameConsole: string;
    isStatic: boolean;
    isMultiMethod: boolean;
    isTeachyTVMode: boolean;
    compareEntryCount: number;
    onAddToTarget: (row: CalibrationResultRow) => void;
    onAddToHistory: (row: CalibrationResultRow) => void;
}) {
    const { t, resources } = useI18n();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [menuRow, setMenuRow] = useState<CalibrationResultRow | null>(null);

    const defaultAddToTarget = compareEntryCount === 0;

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
                        <TableCell>{t("table.actions")}</TableCell>
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
                                <TableCell>
                                    <ButtonGroup size="small" variant="outlined">
                                        <Button
                                            variant="contained"
                                            onClick={() =>
                                                handleAdd(
                                                    row,
                                                    defaultAddToTarget
                                                        ? "target"
                                                        : "history"
                                                )
                                            }
                                        >
                                            {t(
                                                defaultAddToTarget
                                                    ? "compare.addToTarget"
                                                    : "compare.addToHistory"
                                            )}
                                        </Button>
                                        <Button
                                            onClick={(event) => {
                                                setMenuAnchor(event.currentTarget);
                                                setMenuRow(row);
                                            }}
                                        >
                                            v
                                        </Button>
                                    </ButtonGroup>
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
