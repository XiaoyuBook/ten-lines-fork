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
import { useI18n } from "../i18n";
import { hexSeed } from "../tenLines";

export interface IDComboRow {
    advances: number;
    tid: number;
    sid: number;
    tsv: number;
    shiny: number;
    matchCount: number;
    exampleIvs: number[];
    examplePid: number;
    exampleSeed: number;
    game: string;
}

const IdComboTable = memo(function IdComboTable({
    rows,
}: {
    rows: IDComboRow[];
}) {
    const { t, resources } = useI18n();
    const [, setSearchParams] = useSearchParams();

    function openInInitialSeed(row: IDComboRow, isAuxClick: boolean) {
        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            params.set("targetSeed", hexSeed(row.exampleSeed, 32));
            params.set("game", row.game);
            params.set("trainerID", row.tid.toString());
            params.set("secretID", row.sid.toString());
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
                        <TableCell>{t("table.advances")}</TableCell>
                        <TableCell>TID</TableCell>
                        <TableCell>SID</TableCell>
                        <TableCell>TSV</TableCell>
                        <TableCell>{t("table.shiny")}</TableCell>
                        <TableCell>{t("table.matchingTargets")}</TableCell>
                        <TableCell>{t("table.ivs")}</TableCell>
                        <TableCell>{t("table.exampleSeed")}</TableCell>
                        <TableCell>{t("table.examplePid")}</TableCell>
                        <TableCell>{t("table.openInInitialSeed")}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell>{row.advances}</TableCell>
                            <TableCell>{row.tid}</TableCell>
                            <TableCell>{row.sid}</TableCell>
                            <TableCell>{row.tsv}</TableCell>
                            <TableCell>{resources.shininess[row.shiny]}</TableCell>
                            <TableCell>{row.matchCount}</TableCell>
                            <TableCell>{row.exampleIvs.join("/")}</TableCell>
                            <TableCell>{hexSeed(row.exampleSeed, 32)}</TableCell>
                            <TableCell>{hexSeed(row.examplePid, 32)}</TableCell>
                            <TableCell>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => {
                                        openInInitialSeed(row, false);
                                    }}
                                    onMouseDown={(event) => {
                                        if (event.button === 1) {
                                            event.preventDefault();
                                            openInInitialSeed(row, true);
                                        }
                                    }}
                                >
                                    {t("table.initialSeed")}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
});

export default IdComboTable;
