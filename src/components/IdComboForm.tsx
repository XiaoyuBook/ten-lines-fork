import { useMemo, useState } from "react";
import React from "react";
import { Box, Button, MenuItem, TextField, type SxProps, type Theme } from "@mui/material";
import { proxy } from "comlink";
import { useSearchParams } from "react-router-dom";

import fetchTenLines, { SEED_IDENTIFIER_TO_GAME, STATIC_2, STATIC_4 } from "../tenLines";
import type { ExtendedIDState, ExtendedSearcherState } from "../tenLines/generated";
import { GENDERS_EN, METHODS_EN, NATURES_EN, TYPES_EN } from "../tenLines/resources";
import IvEntry from "./IvEntry";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import StaticEncounterSelector from "./StaticEncounterSelector";
import IdComboTable, { type IDComboRow } from "./IdComboTable";

interface IdComboFormState {
    shininess: number;
    nature: number;
    gender: number;
    hiddenPower: number;
    ivRangeStrings: [string, string][];
    staticCategory: number;
    staticPokemon: number;
    method: number;
}

interface IdComboURLState {
    game: string;
    idAdvancesMin: string;
    idAdvancesMax: string;
    maxResults: string;
}

function useIdComboURLState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const game = searchParams.get("idGame") || "fr";
    const idAdvancesMin = searchParams.get("idAdvancesMin") || "1000";
    const idAdvancesMax = searchParams.get("idAdvancesMax") || "10000";
    const maxResults = searchParams.get("idMaxResults") || "2000";

    const setIdComboURLState = (state: Partial<IdComboURLState>) => {
        setSearchParams((prev) => {
            for (const [key, value] of Object.entries(state)) {
                prev.set(key, value);
            }
            return prev;
        });
    };

    return {
        game,
        idAdvancesMin,
        idAdvancesMax,
        maxResults,
        setIdComboURLState,
    };
}

function pidToTSV(pid: number) {
    const high = (pid >>> 16) & 0xffff;
    const low = pid & 0xffff;
    return ((high ^ low) >>> 3) & 0x1fff;
}

function getShinyType(pid: number, tid: number, sid: number) {
    const high = (pid >>> 16) & 0xffff;
    const low = pid & 0xffff;
    const psv = high ^ low;
    const tsv = tid ^ sid;

    if (tsv === psv) {
        return 2;
    }
    if ((tsv ^ psv) < 8) {
        return 1;
    }
    return 0;
}

export default function IdComboForm({
    sx,
    hidden,
}: {
    sx?: SxProps<Theme>;
    hidden?: boolean;
}) {
    const [formState, setFormState] = useState<IdComboFormState>({
        shininess: 3,
        nature: -1,
        gender: 255,
        hiddenPower: -1,
        ivRangeStrings: [
            ["0", "31"],
            ["0", "31"],
            ["0", "31"],
            ["0", "31"],
            ["0", "31"],
            ["0", "31"],
        ],
        staticCategory: 0,
        staticPokemon: 0,
        method: 1,
    });

    const {
        game,
        idAdvancesMin,
        idAdvancesMax,
        maxResults,
        setIdComboURLState,
    } = useIdComboURLState();

    const [rows, setRows] = useState<IDComboRow[]>([]);
    const [searching, setSearching] = useState(false);
    const [summary, setSummary] = useState("");

    const [ivRangesAreValid, setIvRangesAreValid] = useState(true);
    const [idRangeIsValid, setIdRangeIsValid] = useState(true);
    const [maxResultsIsValid, setMaxResultsIsValid] = useState(true);

    const ivRanges = ivRangesAreValid
        ? formState.ivRangeStrings.map((range) => [
              parseInt(range[0], 10),
              parseInt(range[1], 10),
          ])
        : [];

    const idRange = useMemo(
        () =>
            idRangeIsValid
                ? [parseInt(idAdvancesMin, 10), parseInt(idAdvancesMax, 10)]
                : [0, 0],
        [idAdvancesMin, idAdvancesMax, idRangeIsValid]
    );

    const isNotSubmittable =
        searching || !ivRangesAreValid || !idRangeIsValid || !maxResultsIsValid;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isNotSubmittable) {
            return;
        }

        const submit = async () => {
            const tenLines = await fetchTenLines();
            setSearching(true);
            setRows([]);
            setSummary("");

            const candidateResults: ExtendedSearcherState[] = [];

            await tenLines.search_seeds_static(
                SEED_IDENTIFIER_TO_GAME[game],
                0,
                0,
                formState.staticCategory,
                formState.staticPokemon,
                formState.method,
                255,
                formState.nature,
                formState.gender,
                formState.hiddenPower,
                ivRanges,
                proxy((results: ExtendedSearcherState[]) => {
                    candidateResults.push(...results);
                }),
                proxy(() => {})
            );

            if (candidateResults.length === 0) {
                setSummary("No matching static targets found for the selected filters.");
                setSearching(false);
                return;
            }

            const tsvCounts = new Map<number, number>();
            const tsvExamples = new Map<number, ExtendedSearcherState>();
            for (const result of candidateResults) {
                const tsv = pidToTSV(result.pid);
                tsvCounts.set(tsv, (tsvCounts.get(tsv) ?? 0) + 1);
                if (!tsvExamples.has(tsv)) {
                    tsvExamples.set(tsv, result);
                }
            }

            const idResults: ExtendedIDState[] =
                await tenLines.search_frlge_id_combos(
                    [...tsvCounts.keys()],
                    idRange[0],
                    idRange[1],
                    parseInt(maxResults, 10)
                );

            const mappedRows = idResults.map((idState) => {
                const example = tsvExamples.get(idState.tsv)!;
                const shiny = getShinyType(
                    example.pid,
                    idState.tid,
                    idState.sid
                );
                return {
                    advances: idState.advances,
                    tid: idState.tid,
                    sid: idState.sid,
                    tsv: idState.tsv,
                    shiny,
                    matchCount: tsvCounts.get(idState.tsv) ?? 0,
                    examplePid: example.pid,
                    exampleSeed: example.seed,
                };
            }).filter((row) => {
                if (formState.shininess === 3) {
                    return row.shiny === 1 || row.shiny === 2;
                }
                return row.shiny === formState.shininess;
            });

            setRows(mappedRows);
            setSummary(
                `Found ${candidateResults.length} matching target seed(s), ${tsvCounts.size} unique TSV(s), and ${mappedRows.length} TID/SID combo(s).${
                    mappedRows.length === parseInt(maxResults, 10)
                        ? " Results hit the max-results cap."
                        : ""
                }`
            );
            setSearching(false);
        };

        submit();
    };

    const isFRLGE = game.startsWith("fr") || game.startsWith("lg") || game.startsWith("e_");
    if (formState.staticCategory == 3 && !(game.startsWith("fr") || game.startsWith("lg"))) {
        formState.staticCategory = 0;
        setFormState(formState);
    }
    if (formState.staticCategory == 6 && !isFRLGE) {
        formState.staticCategory = 0;
        setFormState(formState);
    }
    if (formState.staticCategory == 8 && (game.startsWith("fr") || game.startsWith("lg"))) {
        formState.staticCategory = 0;
        setFormState(formState);
    }

    if (hidden) {
        return null;
    }

    return (
        <Box component="form" onSubmit={handleSubmit} sx={sx}>
            <Box sx={{ mt: 2, textAlign: "left" }}>
                Search for TID/SID combinations whose TSV makes the matching static target shiny.
            </Box>
            <TextField
                label="Game"
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => setIdComboURLState({ game: event.target.value })}
                value={game}
                select
                fullWidth
            >
                <MenuItem value="e_painting">Emerald</MenuItem>
                <MenuItem value="fr">FireRed (ENG)</MenuItem>
                <MenuItem value="fr_eu">FireRed (SPA/FRE/ITA/GER)</MenuItem>
                <MenuItem value="fr_jpn_1_0">FireRed (JPN) (1.0)</MenuItem>
                <MenuItem value="fr_jpn_1_1">FireRed (JPN) (1.1)</MenuItem>
                <MenuItem value="fr_nx">Switch FireRed</MenuItem>
                <MenuItem value="fr_mgba">FireRed (MGBA 10.5)</MenuItem>
                <MenuItem value="lg">LeafGreen (ENG)</MenuItem>
                <MenuItem value="lg_eu">LeafGreen (SPA/FRE/ITA/GER)</MenuItem>
                <MenuItem value="lg_jpn">LeafGreen (JPN)</MenuItem>
                <MenuItem value="lg_nx">Switch LeafGreen</MenuItem>
                <MenuItem value="lg_mgba">LeafGreen (MGBA 10.5)</MenuItem>
            </TextField>
            <RangeInput
                label="Advances"
                name="idAdvances"
                minimumValue={0}
                maximumValue={65535}
                value={[idAdvancesMin, idAdvancesMax]}
                onChange={(_, value) => {
                    setIdComboURLState({
                        idAdvancesMin: value.value[0],
                        idAdvancesMax: value.value[1],
                    });
                    setIdRangeIsValid(value.isValid);
                }}
            />
            <TextField
                label="Shininess"
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setFormState((data) => ({
                        ...data,
                        shininess: parseInt(event.target.value),
                    }));
                }}
                value={formState.shininess}
                select
                fullWidth
            >
                <MenuItem value="3">Star/Square</MenuItem>
                <MenuItem value="1">Star</MenuItem>
                <MenuItem value="2">Square</MenuItem>
            </TextField>
            <NumericalInput
                label="Max Results"
                margin="normal"
                onChange={(_event, value) => {
                    setIdComboURLState({ maxResults: value.value });
                    setMaxResultsIsValid(value.isValid);
                }}
                value={maxResults}
                minimumValue={1}
                maximumValue={20000}
                isHex={false}
                name="maxResults"
            />
            <TextField
                label="Method"
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setFormState((data) => ({
                        ...data,
                        method: parseInt(event.target.value),
                    }));
                }}
                value={formState.method}
                select
                fullWidth
            >
                {Object.entries(METHODS_EN)
                    .filter(([value]) => parseInt(value) <= STATIC_4 && parseInt(value) != STATIC_2)
                    .map(([value, name], index) => (
                        <MenuItem key={index} value={parseInt(value)}>
                            {name}
                        </MenuItem>
                    ))}
            </TextField>
            <StaticEncounterSelector
                staticCategory={formState.staticCategory}
                staticPokemon={formState.staticPokemon}
                game={SEED_IDENTIFIER_TO_GAME[game]}
                onChange={(staticCategory, staticPokemon) => {
                    setFormState((data) => ({
                        ...data,
                        staticCategory,
                        staticPokemon,
                    }));
                }}
            />
            <TextField
                label="Nature"
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setFormState((data) => ({
                        ...data,
                        nature: parseInt(event.target.value),
                    }));
                }}
                value={formState.nature}
                select
                fullWidth
            >
                <MenuItem value="-1">Any</MenuItem>
                {NATURES_EN.map((nature, index) => (
                    <MenuItem key={index} value={index}>
                        {nature}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                label="Gender"
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setFormState((data) => ({
                        ...data,
                        gender: parseInt(event.target.value),
                    }));
                }}
                value={formState.gender}
                select
                fullWidth
            >
                <MenuItem value="255">Any</MenuItem>
                {GENDERS_EN.slice(0, 2).map((gender, index) => (
                    <MenuItem key={index} value={index}>
                        {gender}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                label="Hidden Power"
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    setFormState((data) => ({
                        ...data,
                        hiddenPower: parseInt(event.target.value),
                    }));
                }}
                value={formState.hiddenPower}
                select
                fullWidth
            >
                <MenuItem value="-1">Any</MenuItem>
                {TYPES_EN.map((type, index) => (
                    <MenuItem key={index} value={index}>
                        {type}
                    </MenuItem>
                ))}
            </TextField>
            <IvEntry
                onChange={(_event, value) => {
                    setIvRangesAreValid(value.isValid);
                    setFormState((data) => ({
                        ...data,
                        ivRangeStrings: value.value,
                    }));
                }}
                value={formState.ivRangeStrings}
            />
            <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={isNotSubmittable}
                fullWidth
            >
                {searching ? "Searching..." : "Find TID/SID Combos"}
            </Button>
            {summary && (
                <Box sx={{ mt: 2, mb: 2, textAlign: "left" }}>
                    {summary}
                </Box>
            )}
            <IdComboTable rows={rows} />
        </Box>
    );
}
