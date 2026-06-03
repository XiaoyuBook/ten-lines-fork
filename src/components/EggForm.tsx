import { proxy } from "comlink";
import { useMemo, useState } from "react";
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    MenuItem,
    TextField,
    Typography,
    type SxProps,
    type Theme,
} from "@mui/material";

import { getAllGameOptions, getName, useI18n } from "../i18n";
import fetchTenLines, { fetchSeedData, SEED_IDENTIFIER_TO_GAME } from "../tenLines";
import type { ExtendedEggGeneratorState } from "../tenLines/generated";
import IvEntry from "./IvEntry";
import NumericalInput from "./NumericalInput";
import RangeInput from "./RangeInput";
import EggParentSettings, { type EggParentState } from "./EggParentSettings";
import EggTable from "./EggTable";
import {
    FRLG_EGG_METHODS,
    buildSeedSettingKey,
    filterFrlgEggGameOptions,
    isCompatibleEggParentPair,
} from "./frlgEggHelpers";

const DEFAULT_IVS = ["0", "0", "0", "0", "0", "0"];
const DEFAULT_IV_RANGES: [string, string][] = [
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
    ["0", "31"],
];

type SeedSettings = {
    sound: string;
    buttonMode: string;
    seedButton: string;
    extraButton: string;
};

const DEFAULT_SEED_SETTINGS: SeedSettings = {
    sound: "mono",
    buttonMode: "a",
    seedButton: "a",
    extraButton: "none",
};

const parseDecimal = (value: string) => parseInt(value, 10);
const parseRange = (value: [string, string]) => value.map(parseDecimal);
const parseIvs = (value: string[]) => value.map(parseDecimal);

function copyIvRanges() {
    return DEFAULT_IV_RANGES.map((range) => [...range] as [string, string]);
}

function copySeedSettings(): SeedSettings {
    return { ...DEFAULT_SEED_SETTINGS };
}

export default function EggForm({
    sx,
    hidden,
}: {
    sx?: SxProps<Theme>;
    hidden?: boolean;
}) {
    const { t, resources } = useI18n();
    const [game, setGame] = useState("fr");
    const [trainerID, setTrainerID] = useState("0");
    const [secretID, setSecretID] = useState("0");
    const [method, setMethod] = useState("11");
    const [compatibility, setCompatibility] = useState("70");
    const [maxResults, setMaxResults] = useState("1000");
    const [eggSpecies, setEggSpecies] = useState("1");
    const [heldSettings, setHeldSettings] = useState(copySeedSettings);
    const [pickupSettings, setPickupSettings] = useState(copySeedSettings);
    const [heldAdvances, setHeldAdvances] = useState<[string, string]>([
        "0",
        "100",
    ]);
    const [pickupAdvances, setPickupAdvances] = useState<[string, string]>([
        "0",
        "100",
    ]);
    const [heldAdvancesValid, setHeldAdvancesValid] = useState(true);
    const [pickupAdvancesValid, setPickupAdvancesValid] = useState(true);
    const [heldOffset, setHeldOffset] = useState("0");
    const [pickupOffset, setPickupOffset] = useState("0");
    const [parentA, setParentA] = useState<EggParentState>({
        ivs: [...DEFAULT_IVS],
        gender: "0",
    });
    const [parentB, setParentB] = useState<EggParentState>({
        ivs: [...DEFAULT_IVS],
        gender: "1",
    });
    const [parentAValid, setParentAValid] = useState(true);
    const [parentBValid, setParentBValid] = useState(true);
    const [shininess, setShininess] = useState("255");
    const [nature, setNature] = useState("-1");
    const [gender, setGender] = useState("255");
    const [ability, setAbility] = useState("255");
    const [hiddenPower, setHiddenPower] = useState("-1");
    const [ivRanges, setIvRanges] = useState(copyIvRanges);
    const [ivRangesValid, setIvRangesValid] = useState(true);
    const [showInheritance, setShowInheritance] = useState(false);
    const [rows, setRows] = useState<ExtendedEggGeneratorState[]>([]);
    const [searching, setSearching] = useState(false);
    const [message, setMessage] = useState("");

    const gameOptions = useMemo(
        () => filterFrlgEggGameOptions(getAllGameOptions(t)),
        [t]
    );
    const parentPairIsCompatible = isCompatibleEggParentPair(
        parseDecimal(parentA.gender),
        parseDecimal(parentB.gender)
    );
    const inputsAreValid =
        parentAValid &&
        parentBValid &&
        heldAdvancesValid &&
        pickupAdvancesValid &&
        ivRangesValid;

    const runSearch = async () => {
        setMessage("");
        setRows([]);

        if (!parentPairIsCompatible) {
            setMessage(t("messages.incompatibleEggParents"));
            return;
        }
        if (!inputsAreValid) {
            return;
        }

        setSearching(true);
        let receivedResults = 0;
        try {
            const tenLines = await fetchTenLines();
            const seedData = await fetchSeedData(game);
            const heldKey = buildSeedSettingKey(
                heldSettings.sound,
                heldSettings.buttonMode,
                heldSettings.seedButton
            );
            const pickupKey = buildSeedSettingKey(
                pickupSettings.sound,
                pickupSettings.buttonMode,
                pickupSettings.seedButton
            );
            const heldSeeds = await tenLines.get_contiguous_seed_list(
                seedData,
                heldKey,
                game,
                heldSettings.extraButton
            );
            const pickupSeeds = await tenLines.get_contiguous_seed_list(
                seedData,
                pickupKey,
                game,
                pickupSettings.extraButton
            );

            if (heldSeeds.length === 0) {
                setMessage(t("messages.noHeldEggSeeds"));
                return;
            }
            if (pickupSeeds.length === 0) {
                setMessage(t("messages.noPickupEggSeeds"));
                return;
            }

            await tenLines.check_seeds_frlg_egg(
                heldSeeds,
                pickupSeeds,
                parseRange(heldAdvances),
                parseRange(pickupAdvances),
                parseDecimal(heldOffset),
                parseDecimal(pickupOffset),
                SEED_IDENTIFIER_TO_GAME[game],
                parseDecimal(trainerID),
                parseDecimal(secretID),
                parseDecimal(method),
                parseDecimal(compatibility),
                [parseIvs(parentA.ivs), parseIvs(parentB.ivs)],
                [parseDecimal(parentA.gender), parseDecimal(parentB.gender)],
                parseDecimal(eggSpecies),
                parseDecimal(shininess),
                parseDecimal(nature),
                parseDecimal(gender),
                parseDecimal(ability),
                parseDecimal(hiddenPower),
                ivRanges.map(parseRange),
                parseDecimal(maxResults),
                heldKey,
                pickupKey,
                proxy((batch: ExtendedEggGeneratorState[]) => {
                    receivedResults += batch.length;
                    setRows((currentRows) => [...currentRows, ...batch]);
                }),
                proxy((nextSearching: boolean) => setSearching(nextSearching))
            );

            if (receivedResults === 0) {
                setMessage(t("messages.noEggResults"));
            } else if (receivedResults >= parseDecimal(maxResults)) {
                setMessage(t("messages.eggResultsCapHit"));
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setSearching(false);
        }
    };

    if (hidden) return null;

    return (
        <Box
            component="form"
            sx={{ ...sx, textAlign: "left" }}
            onSubmit={(event) => {
                event.preventDefault();
                void runSearch();
            }}
        >
            <Typography variant="h5" sx={{ mt: 2 }}>
                {t("tabs.egg")}
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                }}
            >
                <TextField
                    label={t("labels.game")}
                    value={game}
                    onChange={(event) => setGame(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    {gameOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label={t("labels.method")}
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    {FRLG_EGG_METHODS.map((option) => (
                        <MenuItem
                            key={option.value}
                            value={option.value.toString()}
                        >
                            {t(option.labelKey)}
                        </MenuItem>
                    ))}
                </TextField>
                <NumericalInput
                    label={t("labels.trainerId")}
                    name="eggTrainerID"
                    value={trainerID}
                    minimumValue={0}
                    maximumValue={65535}
                    onChange={(_, next) => setTrainerID(next.value)}
                />
                <NumericalInput
                    label={t("labels.secretId")}
                    name="eggSecretID"
                    value={secretID}
                    minimumValue={0}
                    maximumValue={65535}
                    onChange={(_, next) => setSecretID(next.value)}
                />
                <TextField
                    label={t("labels.compatibility")}
                    value={compatibility}
                    onChange={(event) => setCompatibility(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="20">20</MenuItem>
                    <MenuItem value="50">50</MenuItem>
                    <MenuItem value="70">70</MenuItem>
                </TextField>
                <NumericalInput
                    label={t("labels.maxResults")}
                    name="eggMaxResults"
                    value={maxResults}
                    minimumValue={1}
                    maximumValue={10000}
                    onChange={(_, next) => setMaxResults(next.value)}
                />
            </Box>

            <Typography variant="h6" sx={{ mt: 2 }}>
                {t("labels.heldSeedSettings")}
            </Typography>
            <SeedSettingsFields value={heldSettings} onChange={setHeldSettings} />
            <RangeInput
                label={t("labels.heldAdvances")}
                name="heldAdvances"
                value={heldAdvances}
                minimumValue={0}
                maximumValue={4294967295}
                onChange={(_, next) => {
                    setHeldAdvances(next.value);
                    setHeldAdvancesValid(next.isValid);
                }}
            />
            <NumericalInput
                label={t("labels.heldOffset")}
                name="heldOffset"
                value={heldOffset}
                minimumValue={0}
                maximumValue={4294967295}
                onChange={(_, next) => setHeldOffset(next.value)}
            />

            <Typography variant="h6" sx={{ mt: 2 }}>
                {t("labels.pickupSeedSettings")}
            </Typography>
            <SeedSettingsFields
                value={pickupSettings}
                onChange={setPickupSettings}
            />
            <RangeInput
                label={t("labels.pickupAdvances")}
                name="pickupAdvances"
                value={pickupAdvances}
                minimumValue={0}
                maximumValue={4294967295}
                onChange={(_, next) => {
                    setPickupAdvances(next.value);
                    setPickupAdvancesValid(next.isValid);
                }}
            />
            <NumericalInput
                label={t("labels.pickupOffset")}
                name="pickupOffset"
                value={pickupOffset}
                minimumValue={0}
                maximumValue={4294967295}
                onChange={(_, next) => setPickupOffset(next.value)}
            />

            <Typography variant="h6" sx={{ mt: 2 }}>
                {t("labels.eggSettings")}
            </Typography>
            <TextField
                label={t("labels.eggSpecies")}
                value={eggSpecies}
                onChange={(event) => setEggSpecies(event.target.value)}
                select
                fullWidth
                margin="normal"
            >
                {resources.species.slice(1, 387).map((_species, index) => (
                    <MenuItem key={index + 1} value={(index + 1).toString()}>
                        {getName(resources, index + 1)}
                    </MenuItem>
                ))}
            </TextField>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                }}
            >
                <EggParentSettings
                    label={t("labels.parentA")}
                    value={parentA}
                    onChange={setParentA}
                    onValidityChange={setParentAValid}
                />
                <EggParentSettings
                    label={t("labels.parentB")}
                    value={parentB}
                    onChange={setParentB}
                    onValidityChange={setParentBValid}
                />
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                }}
            >
                <TextField
                    label={t("labels.shininess")}
                    value={shininess}
                    onChange={(event) => setShininess(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="255">{t("common.any")}</MenuItem>
                    <MenuItem value="1">{t("options.star")}</MenuItem>
                    <MenuItem value="2">{t("options.square")}</MenuItem>
                    <MenuItem value="3">{t("options.starSquare")}</MenuItem>
                </TextField>
                <TextField
                    label={t("labels.nature")}
                    value={nature}
                    onChange={(event) => setNature(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="-1">{t("common.any")}</MenuItem>
                    {resources.natures.map((name, index) => (
                        <MenuItem key={index} value={index.toString()}>
                            {name}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label={t("labels.gender")}
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="255">{t("common.any")}</MenuItem>
                    {resources.genders.slice(0, 2).map((name, index) => (
                        <MenuItem key={index} value={index.toString()}>
                            {name}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label={t("labels.ability")}
                    value={ability}
                    onChange={(event) => setAbility(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="255">{t("common.any")}</MenuItem>
                    <MenuItem value="0">0</MenuItem>
                    <MenuItem value="1">1</MenuItem>
                </TextField>
                <TextField
                    label={t("labels.hiddenPower")}
                    value={hiddenPower}
                    onChange={(event) => setHiddenPower(event.target.value)}
                    select
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="-1">{t("common.any")}</MenuItem>
                    {resources.types.map((type, index) => (
                        <MenuItem key={index} value={index.toString()}>
                            {type}
                        </MenuItem>
                    ))}
                </TextField>
            </Box>
            <IvEntry
                value={ivRanges}
                onChange={(_, next) => {
                    setIvRanges(next.value);
                    setIvRangesValid(next.isValid);
                }}
            />
            <FormControlLabel
                control={
                    <Checkbox
                        checked={showInheritance}
                        onChange={(event) =>
                            setShowInheritance(event.target.checked)
                        }
                    />
                }
                label={t("labels.showInheritance")}
            />

            {message !== "" && (
                <Typography color="error" sx={{ my: 1 }}>
                    {message}
                </Typography>
            )}
            <Button
                type="submit"
                variant="contained"
                disabled={searching || !inputsAreValid}
                fullWidth
                sx={{ my: 2 }}
            >
                {searching ? t("common.searching") : t("common.submit")}
            </Button>
            {rows.length > 0 && (
                <EggTable rows={rows} showInheritance={showInheritance} />
            )}
        </Box>
    );
}

function SeedSettingsFields({
    value,
    onChange,
}: {
    value: SeedSettings;
    onChange: (value: SeedSettings) => void;
}) {
    const { t } = useI18n();

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
                gap: 2,
            }}
        >
            <TextField
                label={t("labels.sound")}
                value={value.sound}
                onChange={(event) =>
                    onChange({ ...value, sound: event.target.value })
                }
                select
                fullWidth
                margin="normal"
            >
                <MenuItem value="mono">{t("common.mono")}</MenuItem>
                <MenuItem value="stereo">{t("common.stereo")}</MenuItem>
            </TextField>
            <TextField
                label={t("labels.buttonMode")}
                value={value.buttonMode}
                onChange={(event) =>
                    onChange({ ...value, buttonMode: event.target.value })
                }
                select
                fullWidth
                margin="normal"
            >
                <MenuItem value="a">A</MenuItem>
                <MenuItem value="h">{t("options.help")}</MenuItem>
                <MenuItem value="r">R</MenuItem>
            </TextField>
            <TextField
                label={t("labels.seedButton")}
                value={value.seedButton}
                onChange={(event) =>
                    onChange({ ...value, seedButton: event.target.value })
                }
                select
                fullWidth
                margin="normal"
            >
                <MenuItem value="a">A</MenuItem>
                <MenuItem value="start">{t("options.start")}</MenuItem>
                <MenuItem value="l">L</MenuItem>
            </TextField>
            <TextField
                label={t("labels.extraButton")}
                value={value.extraButton}
                onChange={(event) =>
                    onChange({ ...value, extraButton: event.target.value })
                }
                select
                fullWidth
                margin="normal"
            >
                <MenuItem value="none">{t("common.none")}</MenuItem>
                <MenuItem value="startup_select">
                    {t("options.startupSelect")}
                </MenuItem>
                <MenuItem value="startup_a">{t("options.startupA")}</MenuItem>
                <MenuItem value="blackout_r">{t("options.blackoutR")}</MenuItem>
                <MenuItem value="blackout_a">{t("options.blackoutA")}</MenuItem>
                <MenuItem value="blackout_l">{t("options.blackoutL")}</MenuItem>
                <MenuItem value="blackout_al">
                    {t("options.blackoutAL")}
                </MenuItem>
            </TextField>
        </Box>
    );
}
