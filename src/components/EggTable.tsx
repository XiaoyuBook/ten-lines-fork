import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { memo } from "react";

import { useI18n } from "../i18n";
import { hexSeed } from "../tenLines";
import type { ExtendedEggGeneratorState } from "../tenLines/generated";
import { formatInheritanceSlot } from "./frlgEggHelpers";

const EggTable = memo(function EggTable({
    rows,
    showInheritance,
}: {
    rows: ExtendedEggGeneratorState[];
    showInheritance: boolean;
}) {
    const { t, resources } = useI18n();

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("table.heldSeed")}</TableCell>
                        <TableCell>{t("table.heldSeedTime")}</TableCell>
                        <TableCell>{t("table.heldSettings")}</TableCell>
                        <TableCell>{t("table.heldAdvances")}</TableCell>
                        <TableCell>{t("table.pickupSeed")}</TableCell>
                        <TableCell>{t("table.pickupSeedTime")}</TableCell>
                        <TableCell>{t("table.pickupSettings")}</TableCell>
                        <TableCell>{t("table.pickupAdvances")}</TableCell>
                        <TableCell>{t("table.pid")}</TableCell>
                        <TableCell>{t("table.shiny")}</TableCell>
                        <TableCell>{t("table.nature")}</TableCell>
                        <TableCell>{t("table.ability")}</TableCell>
                        <TableCell>{t("table.ivs")}</TableCell>
                        {showInheritance && (
                            <TableCell>{t("table.inheritance")}</TableCell>
                        )}
                        <TableCell>{t("table.hidden")}</TableCell>
                        <TableCell>{t("table.power")}</TableCell>
                        <TableCell>{t("table.gender")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => {
                        if (index === 1000) {
                            return <TableRow key={index}>...</TableRow>;
                        }
                        if (index > 1000) {
                            return null;
                        }

                        return (
                            <TableRow key={index}>
                                <TableCell>
                                    {hexSeed(row.heldInitialSeed, 16)}
                                </TableCell>
                                <TableCell>{row.heldSeedTime}</TableCell>
                                <TableCell>{row.heldSettings}</TableCell>
                                <TableCell>{row.heldAdvances}</TableCell>
                                <TableCell>
                                    {hexSeed(row.pickupInitialSeed, 16)}
                                </TableCell>
                                <TableCell>{row.pickupSeedTime}</TableCell>
                                <TableCell>{row.pickupSettings}</TableCell>
                                <TableCell>{row.pickupAdvances}</TableCell>
                                <TableCell>{hexSeed(row.pid, 32)}</TableCell>
                                <TableCell>{resources.shininess[row.shiny]}</TableCell>
                                <TableCell>{resources.natures[row.nature]}</TableCell>
                                <TableCell>
                                    {row.ability}:{" "}
                                    {resources.abilities[row.abilityIndex - 1]}
                                </TableCell>
                                <TableCell>{row.ivs.join("/")}</TableCell>
                                {showInheritance && (
                                    <TableCell>
                                        {row.inheritance
                                            .map(formatInheritanceSlot)
                                            .join("/")}
                                    </TableCell>
                                )}
                                <TableCell>{resources.types[row.hiddenPower]}</TableCell>
                                <TableCell>{row.hiddenPowerStrength}</TableCell>
                                <TableCell>{resources.genders[row.gender]}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
});

export default EggTable;
