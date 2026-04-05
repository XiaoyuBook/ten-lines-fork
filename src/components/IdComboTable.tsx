import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { Button } from "@mui/material";
import { memo } from "react";
import { hexSeed } from "../tenLines";
import { SHININESS_EN } from "../tenLines/resources";
import { useSearchParams } from "react-router-dom";

export interface IDComboRow {
    advances: number;
    tid: number;
    sid: number;
    tsv: number;
    shiny: number;
    matchCount: number;
    examplePid: number;
    exampleSeed: number;
}

const IdComboTable = memo(function IdComboTable({
    rows,
}: {
    rows: IDComboRow[];
}) {
    const [, setSearchParams] = useSearchParams();

    function openInInitialSeed(row: IDComboRow, isAuxClick: boolean) {
        setSearchParams((previous) => {
            const params = new URLSearchParams(previous);
            params.set("targetSeed", hexSeed(row.exampleSeed, 32));
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
                        <TableCell>Advances</TableCell>
                        <TableCell>TID</TableCell>
                        <TableCell>SID</TableCell>
                        <TableCell>TSV</TableCell>
                        <TableCell>Shiny</TableCell>
                        <TableCell>Matching Targets</TableCell>
                        <TableCell>Example Seed</TableCell>
                        <TableCell>Example PID</TableCell>
                        <TableCell>Open In Initial Seed</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell>{row.advances}</TableCell>
                            <TableCell>{row.tid}</TableCell>
                            <TableCell>{row.sid}</TableCell>
                            <TableCell>{row.tsv}</TableCell>
                            <TableCell>{SHININESS_EN[row.shiny]}</TableCell>
                            <TableCell>{row.matchCount}</TableCell>
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
                                    Initial Seed
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
