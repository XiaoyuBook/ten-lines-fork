import { useEffect, useState } from "react";
import React from "react";
import {
    Autocomplete,
    Box,
    Checkbox,
    FormControlLabel,
    MenuItem,
    TextField,
} from "@mui/material";
import { getLocation, getName, useI18n } from "../i18n";
import fetchTenLines, { Game } from "../tenLines";

function WildEncounterSelector({
    wildCategory,
    wildLocation,
    wildPokemon,
    wildLead,
    shouldFilterPokemon,
    onChange,
    game = Game.Gen3,
    allowAnyPokemon = false,
    isSearcher = false,
}: {
    wildCategory: number;
    wildLocation: number;
    wildPokemon: number;
    wildLead: number;
    shouldFilterPokemon: boolean;
    onChange: (
        wildCategory: number,
        wildLocation: number,
        wildPokemon: number,
        wildLead: number,
        shouldFilterPokemon: boolean
    ) => void;
    game?: number;
    allowAnyPokemon?: boolean;
    isSearcher?: boolean;
}) {
    const { t, resources } = useI18n();
    const [wildLocations, setWildLocations] = useState<number[]>([]);
    const [areaSpecies, setAreaSpecies] = useState<number[]>([]);

    useEffect(() => {
        const fetchWildLocations = async () => {
            const tenLines = await fetchTenLines();
            const locations = await tenLines.get_wild_locations(game, wildCategory);
            setWildLocations(locations);
            onChange(
                wildCategory,
                locations.includes(wildLocation)
                    ? wildLocation
                    : locations.length > 0
                      ? locations[0]
                      : 0,
                wildPokemon,
                wildLead,
                shouldFilterPokemon
            );
        };
        fetchWildLocations();
    }, [game, wildCategory, wildLead, wildLocation, wildPokemon, shouldFilterPokemon, onChange]);

    useEffect(() => {
        const fetchAreaSpecies = async () => {
            const tenLines = await fetchTenLines();
            const species = await tenLines.get_area_species(
                game,
                wildCategory,
                wildLocation
            );
            setAreaSpecies(species);
            onChange(
                wildCategory,
                wildLocation,
                allowAnyPokemon
                    ? wildPokemon === -1 || species.includes(wildPokemon)
                        ? wildPokemon
                        : -1
                    : species.includes(wildPokemon)
                      ? wildPokemon
                      : species.length > 0
                        ? species[0]
                        : 0,
                wildLead,
                shouldFilterPokemon
            );
        };
        fetchAreaSpecies();
    }, [allowAnyPokemon, game, wildCategory, wildLead, wildLocation, wildPokemon, shouldFilterPokemon, onChange]);

    const isEmerald = (game & Game.Emerald) == Game.Emerald;

    return (
        <React.Fragment>
            <TextField
                label={t("labels.category")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    onChange(
                        parseInt(event.target.value),
                        wildLocation,
                        wildPokemon,
                        wildLead,
                        shouldFilterPokemon
                    );
                }}
                value={wildCategory}
                select
                fullWidth
            >
                <MenuItem value="0">{t("options.grass")}</MenuItem>
                <MenuItem value="3">{t("options.rockSmash")}</MenuItem>
                <MenuItem value="4">{t("options.surfing")}</MenuItem>
                <MenuItem value="6">{t("options.oldRod")}</MenuItem>
                <MenuItem value="7">{t("options.goodRod")}</MenuItem>
                <MenuItem value="8">{t("options.superRod")}</MenuItem>
            </TextField>
            <Autocomplete
                options={wildLocations}
                onChange={(_event, newValue) => {
                    onChange(
                        wildCategory,
                        newValue ?? 0,
                        wildPokemon,
                        wildLead,
                        shouldFilterPokemon
                    );
                }}
                getOptionLabel={(option) =>
                    getLocation(resources, game, option) || ""
                }
                renderInput={(params) => (
                    <TextField {...params} label={t("labels.location")} margin="normal" />
                )}
                value={wildLocations.includes(wildLocation) ? wildLocation : undefined}
                isOptionEqualToValue={(option, value) => option === value}
                disablePortal
                disableClearable
                selectOnFocus
                fullWidth
            />
            <Box sx={{ display: "flex", alignItems: "center" }}>
                <TextField
                    label={t("labels.pokemon")}
                    margin="normal"
                    style={{ textAlign: "left" }}
                    onChange={(event) => {
                        onChange(
                            wildCategory,
                            wildLocation,
                            parseInt(event.target.value),
                            wildLead,
                            shouldFilterPokemon
                        );
                    }}
                    value={wildPokemon}
                    select
                    fullWidth
                >
                    {allowAnyPokemon && (
                        <MenuItem value="-1">{t("common.any")}</MenuItem>
                    )}
                    {areaSpecies.map((speciesForm) => (
                        <MenuItem key={speciesForm} value={speciesForm}>
                            {getName(resources, speciesForm & 0x7ff, speciesForm >> 11)}
                        </MenuItem>
                    ))}
                </TextField>
                {!allowAnyPokemon && (
                    <FormControlLabel
                        style={{ marginLeft: 8 }}
                        control={
                            <Checkbox
                                checked={shouldFilterPokemon}
                                onChange={(event) => {
                                    onChange(
                                        wildCategory,
                                        wildLocation,
                                        wildPokemon,
                                        wildLead,
                                        event.target.checked
                                    );
                                }}
                            />
                        }
                        label={t("common.filter")}
                        sx={{
                            whiteSpace: "nowrap",
                        }}
                    />
                )}
            </Box>
            {isEmerald && (
                <TextField
                    label={t("labels.lead")}
                    margin="normal"
                    style={{ textAlign: "left" }}
                    onChange={(event) => {
                        onChange(
                            wildCategory,
                            wildLocation,
                            wildPokemon,
                            parseInt(event.target.value),
                            shouldFilterPokemon
                        );
                    }}
                    value={wildLead}
                    select
                    fullWidth
                >
                    <MenuItem value="255">{t("common.none")}</MenuItem>
                    <MenuItem value="25">{t("options.femaleCuteCharm")}</MenuItem>
                    <MenuItem value="26">{t("options.maleCuteCharm")}</MenuItem>
                    <MenuItem value="27">{t("options.magnetPull")}</MenuItem>
                    <MenuItem value="28">{t("options.static")}</MenuItem>
                    <MenuItem value="32">
                        {t("options.hustlePressureVitalSpirit")}
                    </MenuItem>
                    {isSearcher ? (
                        <MenuItem value="0">{t("options.matchingSynchronize")}</MenuItem>
                    ) : (
                        resources.natures.map((nature, index) => (
                            <MenuItem key={index} value={index}>
                                {`${nature} ${t("messages.matchingSynchronizeSuffix")}`}
                            </MenuItem>
                        ))
                    )}
                </TextField>
            )}
        </React.Fragment>
    );
}

export default WildEncounterSelector;
