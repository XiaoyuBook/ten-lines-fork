import { useEffect, useState } from "react";
import React from "react";
import { MenuItem, TextField } from "@mui/material";
import { useI18n, getName } from "../i18n";
import fetchTenLines, { Game } from "../tenLines";
import type { EnumeratedStaticTemplate3 } from "../tenLines/generated";

function StaticEncounterSelector({
    staticCategory,
    staticPokemon,
    onChange,
    game = Game.Gen3,
}: {
    staticCategory: number;
    staticPokemon: number;
    onChange: (staticCategory: number, staticPokemon: number) => void;
    game?: number;
}) {
    const { t, resources } = useI18n();
    const [staticTemplates, setStaticTemplates] = useState<
        EnumeratedStaticTemplate3[]
    >([]);

    useEffect(() => {
        const fetchStaticTemplates = async () => {
            const tenLines = await fetchTenLines();
            const templates = (
                await tenLines.get_static_template_info(staticCategory)
            ).filter(
                (template: EnumeratedStaticTemplate3) => template.version & game
            );
            setStaticTemplates(templates);
            onChange(
                staticCategory,
                templates.some(
                    (template: EnumeratedStaticTemplate3) =>
                        template.index == staticPokemon
                )
                    ? staticPokemon
                    : templates.length > 0
                      ? templates[0].index
                      : 0
            );
        };
        fetchStaticTemplates();
    }, [staticCategory, game]);

    const isFRLG = game & Game.FRLG;
    const isFRLGE = game & (Game.FRLG | Game.Emerald);

    return (
        <React.Fragment>
            <TextField
                label={t("labels.category")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    onChange(parseInt(event.target.value), staticPokemon);
                }}
                value={staticCategory}
                select
                fullWidth
            >
                <MenuItem value="0">{t("options.starters")}</MenuItem>
                <MenuItem value="1">{t("options.fossils")}</MenuItem>
                <MenuItem value="2">{t("options.gifts")}</MenuItem>
                {isFRLG && <MenuItem value="3">{t("options.gameCorner")}</MenuItem>}
                <MenuItem value="4">{t("options.stationary")}</MenuItem>
                <MenuItem value="5">{t("options.legends")}</MenuItem>
                {isFRLGE && <MenuItem value="6">{t("options.events")}</MenuItem>}
                <MenuItem value="7">{t("options.roamers")}</MenuItem>
                {!isFRLG && (
                    <MenuItem value="8">{t("options.blisyEvents")}</MenuItem>
                )}
            </TextField>
            <TextField
                label={t("labels.pokemon")}
                margin="normal"
                style={{ textAlign: "left" }}
                onChange={(event) => {
                    onChange(staticCategory, parseInt(event.target.value));
                }}
                value={staticPokemon}
                select
                fullWidth
            >
                {staticTemplates.map((template) => (
                    <MenuItem key={template.index} value={template.index}>
                        {`${getName(resources, template.species, template.form)}${
                            template.shiny == 1
                                ? ` (${t("options.shinyLocked")})`
                                : template.species == 251
                                  ? ` (${t("options.lockBreak")})`
                                  : ""
                        } - ${resources.games[template.version]}`}
                    </MenuItem>
                ))}
            </TextField>
        </React.Fragment>
    );
}

export default StaticEncounterSelector;
