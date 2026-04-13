import {
    Box,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip,
} from "@mui/material";
import { memo, useEffect, useMemo, useState } from "react";

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
    onAdd,
}: {
    rows: ExtendedGeneratorState[] | ExtendedWildGeneratorState[];
    target: FRLGContiguousSeedEntry;
    gameConsole: string;
    isStatic: boolean;
    isMultiMethod: boolean;
    isTeachyTVMode: boolean;
    hasTarget: boolean;
    onAdd: (row: CalibrationResultRow, destination: "target" | "history") => void;
}) {
    const { t, resources } = useI18n();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    const defaultAddToTarget = !hasTarget;
    const cappedRows = useMemo(() => rows.slice(0, 1000), [rows]);
    const paginatedRows = useMemo(
        () =>
            cappedRows.slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage
            ),
        [cappedRows, page, rowsPerPage]
    );

    useEffect(() => {
        const maxPage = Math.max(
            0,
            Math.ceil(cappedRows.length / rowsPerPage) - 1
        );
        if (page > maxPage) {
            setPage(maxPage);
        }
    }, [cappedRows.length, page, rowsPerPage]);

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
                    {paginatedRows.map((row, index) => {
                        const absoluteIndex = page * rowsPerPage + index;
                        const seedMS = frameToMS(row.seedTime / 16, gameConsole);
                        const offsetMS =
                            seedMS - frameToMS(target.seedTime / 16, gameConsole);

                        return (
                            <TableRow key={absoluteIndex}>
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
                                                    onAdd(
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
            <TablePagination
                component="div"
                count={cappedRows.length}
                page={page}
                onPageChange={(_event, nextPage) => {
                    setPage(nextPage);
                }}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                }}
                rowsPerPageOptions={[20, 50, 100]}
                labelRowsPerPage={t("table.rowsPerPage")}
            />
        </TableContainer>
    );
});

export default CalibrationTable;
