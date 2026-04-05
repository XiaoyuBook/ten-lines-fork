import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { memo } from "react";
import { hexSeed } from "../tenLines";

export interface IDComboRow {
    advances: number;
    tid: number;
    sid: number;
    tsv: number;
    matchCount: number;
    examplePid: number;
    exampleSeed: number;
}

const IdComboTable = memo(function IdComboTable({
    rows,
}: {
    rows: IDComboRow[];
}) {
    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>ID Frame</TableCell>
                        <TableCell>TID</TableCell>
                        <TableCell>SID</TableCell>
                        <TableCell>TSV</TableCell>
                        <TableCell>Matching Targets</TableCell>
                        <TableCell>Example Seed</TableCell>
                        <TableCell>Example PID</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell>{row.advances}</TableCell>
                            <TableCell>{row.tid}</TableCell>
                            <TableCell>{row.sid}</TableCell>
                            <TableCell>{row.tsv}</TableCell>
                            <TableCell>{row.matchCount}</TableCell>
                            <TableCell>{hexSeed(row.exampleSeed, 32)}</TableCell>
                            <TableCell>{hexSeed(row.examplePid, 32)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
});

export default IdComboTable;
