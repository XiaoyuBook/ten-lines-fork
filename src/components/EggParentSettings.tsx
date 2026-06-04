import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { useI18n } from "../i18n";
import NumericalInput from "./NumericalInput";
import { EGG_GENDER_OPTIONS } from "./frlgEggHelpers";

export type EggParentState = {
    ivs: string[];
    gender: string;
};

function EggParentSettings({
    label,
    value,
    onChange,
    onValidityChange,
}: {
    label: string;
    value: EggParentState;
    onChange: (value: EggParentState) => void;
    onValidityChange?: (isValid: boolean) => void;
}) {
    const { t } = useI18n();
    const [ivValidities, setIvValidities] = useState([
        true,
        true,
        true,
        true,
        true,
        true,
    ]);

    useEffect(() => {
        onValidityChange?.(ivValidities.every(Boolean));
    }, [ivValidities, onValidityChange]);

    const updateIv = (index: number, nextValue: string, isValid: boolean) => {
        const nextIvs = [...value.ivs];
        nextIvs[index] = nextValue;
        onChange({ ...value, ivs: nextIvs });

        setIvValidities((current) => {
            const nextValidities = [...current];
            nextValidities[index] = isValid;
            return nextValidities;
        });
    };

    return (
        <Box sx={{ my: 2 }}>
            <Typography variant="h6">{label}</Typography>
            <TextField
                label={t("labels.parentGender")}
                value={value.gender}
                onChange={(event) =>
                    onChange({ ...value, gender: event.target.value })
                }
                select
                fullWidth
                margin="normal"
            >
                {EGG_GENDER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value.toString()}>
                        {t(option.labelKey)}
                    </MenuItem>
                ))}
            </TextField>
            <Typography variant="subtitle1">{t("labels.parentIvs")}</Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(3, minmax(0, 1fr))",
                        md: "repeat(6, minmax(0, 1fr))",
                    },
                    gap: 1,
                }}
            >
                {[
                    t("stats.hp"),
                    t("stats.attack"),
                    t("stats.defense"),
                    t("stats.specialAttack"),
                    t("stats.specialDefense"),
                    t("stats.speed"),
                ].map((statLabel, index) => (
                    <NumericalInput
                        key={statLabel}
                        label={statLabel}
                        name={`${label.replace(/\s+/g, "")}Iv${index}`}
                        value={value.ivs[index]}
                        minimumValue={0}
                        maximumValue={31}
                        onChange={(_, next) =>
                            updateIv(index, next.value, next.isValid)
                        }
                    />
                ))}
            </Box>
        </Box>
    );
}

export default EggParentSettings;
