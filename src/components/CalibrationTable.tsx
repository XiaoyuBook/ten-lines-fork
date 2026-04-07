import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { memo } from "react";
import { getName, useI18n } from "../i18n";
import { frameToMS, hexSeed } from "../tenLines";
import type {
    ExtendedGeneratorState,
    ExtendedWildGeneratorState,
    FRLGContiguousSeedEntry,
} from "../tenLines/generated";

const CalibrationTable = memo(function CalibrationTable({
    rows,
    target,
    gameConsole,
    isStatic,
    isMultiMethod,
    isTeachyTVMode,
    isSwitch,
    overworldFrames,
}: {
    rows: ExtendedGeneratorState[] | ExtendedWildGeneratorState[];
    target: FRLGContiguousSeedEntry;
    gameConsole: string;
    isStatic: boolean;
    isMultiMethod: boolean;
    isTeachyTVMode: boolean;
    isSwitch: boolean;
    overworldFrames: number;
}) {
    const { t, resources } = useI18n();

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("table.seed")}</TableCell>
                        <TableCell>{t("table.advances")}</TableCell>
                        {isMultiMethod && <TableCell>{t("table.method")}</TableCell>}
                        {isTeachyTVMode && (
                            <TableCell>{t("table.finalAPressFrame")}</TableCell>
                        )}
                        {isTeachyTVMode && (
                            <TableCell>{t("table.teachyTvAdvances")}</TableCell>
                        )}
                        {isSwitch && (
                            <TableCell>{t("table.continueScreenFrames")}</TableCell>
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
                                {isSwitch && (
                                    <TableCell>
                                        {row.advances - overworldFrames * 2}
                                    </TableCell>
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
        </TableContainer>
    );
});

export default CalibrationTable;
