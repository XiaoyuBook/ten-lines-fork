import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { memo } from "react";

import { getName, useI18n } from "../i18n";
import { hexSeed } from "../tenLines";
import type { ExtendedWildGeneratorState } from "../tenLines/generated";
import {
    advancePokeRng,
    getFrlgHeldItemName,
    getFrlgHeldSearchOffsets,
    predictFrlgHeldItemAtOffsets,
    type FrlgHeldSearchMode,
} from "../utils/frlgHeldItems";

export interface FrlgHeldItemResultsTableProps {
    rows: ExtendedWildGeneratorState[];
    standardOffset: number;
    searchMode: FrlgHeldSearchMode;
}

const FrlgHeldItemResultsTable = memo(function FrlgHeldItemResultsTable({
    rows,
    standardOffset,
    searchMode,
}: FrlgHeldItemResultsTableProps) {
    const { locale, t, resources } = useI18n();
    const searchOffsets = getFrlgHeldSearchOffsets(
        standardOffset,
        searchMode
    );

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("table.advances")}</TableCell>
                        <TableCell>{t("table.seed")}</TableCell>
                        <TableCell>{t("table.slot")}</TableCell>
                        <TableCell>{t("table.level")}</TableCell>
                        <TableCell>{t("table.heldItem")}</TableCell>
                        <TableCell>{t("table.heldRng")}</TableCell>
                        <TableCell>{t("table.pid")}</TableCell>
                        <TableCell>{t("table.nature")}</TableCell>
                        <TableCell>{t("table.ability")}</TableCell>
                        <TableCell>{t("table.ivs")}</TableCell>
                        <TableCell>{t("table.hidden")}</TableCell>
                        <TableCell>{t("table.power")}</TableCell>
                        <TableCell>{t("table.gender")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.slice(0, 1000).map((row, index) => {
                        const heldPrediction = predictFrlgHeldItemAtOffsets({
                            species: row.species,
                            iv2EndSeed: row.iv2EndSeed,
                            offsets: searchOffsets,
                        });

                        return (
                            <TableRow
                                key={`${row.initialSeed}-${row.advances}-${row.method}-${row.pid}-${index}`}
                            >
                                <TableCell>{row.advances}</TableCell>
                                <TableCell>
                                    {hexSeed(
                                        advancePokeRng(
                                            row.initialSeed,
                                            row.advances
                                        ),
                                        32
                                    )}
                                </TableCell>
                                <TableCell>
                                    {row.encounterSlot}: {getName(
                                        resources,
                                        row.species,
                                        row.form
                                    )}
                                </TableCell>
                                <TableCell>{row.level}</TableCell>
                                <TableCell>
                                    <Box sx={{ whiteSpace: "nowrap" }}>
                                        {heldPrediction?.rolls.map((roll) => (
                                            <Typography
                                                key={roll.offset}
                                                component="div"
                                                variant="body2"
                                            >
                                                +{roll.offset}: {getFrlgHeldItemName(
                                                    locale,
                                                    roll.itemId
                                                )}
                                            </Typography>
                                        )) ?? "—"}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ whiteSpace: "nowrap" }}>
                                        {heldPrediction?.rolls.map((roll) => (
                                            <Typography
                                                key={roll.offset}
                                                component="div"
                                                variant="body2"
                                            >
                                                +{roll.offset}: {hexSeed(
                                                    roll.seed >>> 16,
                                                    16
                                                )} % 100 = {roll.roll}
                                            </Typography>
                                        )) ?? "—"}
                                    </Box>
                                </TableCell>
                                <TableCell>{hexSeed(row.pid, 32)}</TableCell>
                                <TableCell>
                                    {resources.natures[row.nature]}
                                </TableCell>
                                <TableCell>
                                    {row.ability}: {resources.abilities[
                                        row.abilityIndex - 1
                                    ]}
                                </TableCell>
                                <TableCell>{row.ivs.join("/")}</TableCell>
                                <TableCell>
                                    {resources.types[row.hiddenPower]}
                                </TableCell>
                                <TableCell>{row.hiddenPowerStrength}</TableCell>
                                <TableCell>
                                    {resources.genders[row.gender]}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
});

export default FrlgHeldItemResultsTable;
