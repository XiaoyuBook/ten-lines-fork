import { Button } from "@mui/material";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { memo } from "react";
import { useSearchParams } from "react-router-dom";
import { getName, useI18n } from "../i18n";
import { hexSeed } from "../tenLines";
import type {
    ExtendedSearcherState,
    ExtendedWildSearcherState,
} from "../tenLines/generated";

const SearcherTable = memo(function SearcherTable({
    rows,
    isStatic,
    isMultiMethod,
    showRequiredAdvances,
}: {
    rows:
        | (ExtendedSearcherState & { reachableAdvances?: number })[]
        | (ExtendedWildSearcherState & { reachableAdvances?: number })[];
    isStatic: boolean;
    isMultiMethod: boolean;
    showRequiredAdvances: boolean;
}) {
    const { t, resources } = useI18n();
    const [, setSearchParams] = useSearchParams();

    function openInInitialSeed(
        row: ExtendedSearcherState | ExtendedWildSearcherState,
        isAuxClick: boolean
    ) {
        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            params.set("targetSeed", hexSeed(row.seed, 32));
            params.set("page", "0");
            if (isAuxClick) {
                window.open(`?${params.toString()}`);
                return previous;
            }
            return params;
        });
    }

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("table.seed")}</TableCell>
                        {isMultiMethod && <TableCell>{t("table.method")}</TableCell>}
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
                        {showRequiredAdvances && (
                            <TableCell>{t("table.minReachableAdvances")}</TableCell>
                        )}
                        <TableCell>{t("table.openInInitialSeed")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => {
                        if (index === 1000) {
                            return <TableRow key={index}>...</TableRow>;
                        } else if (index > 1000) {
                            return null;
                        }
                        return (
                            <TableRow key={index}>
                                <TableCell>{hexSeed(row.seed, 32)}</TableCell>
                                {isMultiMethod && (
                                    <TableCell>
                                        {
                                            resources.methods[
                                                (row as ExtendedWildSearcherState).method
                                            ]
                                        }
                                    </TableCell>
                                )}
                                {!isStatic && (
                                    <TableCell>
                                        {(row as ExtendedWildSearcherState).encounterSlot}:{" "}
                                        {getName(
                                            resources,
                                            (row as ExtendedWildSearcherState).species,
                                            (row as ExtendedWildSearcherState).form
                                        )}
                                    </TableCell>
                                )}
                                {!isStatic && (
                                    <TableCell>
                                        {(row as ExtendedWildSearcherState).level}
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
                                {showRequiredAdvances && (
                                    <TableCell>{row.reachableAdvances ?? "-"}</TableCell>
                                )}

                                <TableCell>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => {
                                            openInInitialSeed(row, false);
                                        }}
                                        onMouseDown={(e) => {
                                            if (e.button === 1) {
                                                e.preventDefault();
                                                openInInitialSeed(row, true);
                                            }
                                        }}
                                    >
                                        {t("table.initialSeed")}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
});

export default SearcherTable;
