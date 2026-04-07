import { Box, Checkbox, FormControlLabel } from "@mui/material";
import { useState } from "react";
import { useI18n } from "../i18n";
import NumericalInput from "./NumericalInput";

function TeachyTVEntry({
    isTeachyTVMode,
    teachyTVRegularOut,
    onChange,
}: {
    isTeachyTVMode: boolean;
    teachyTVRegularOut: string;
    onChange: (
        isTeachyTVMode: boolean,
        teachyTVRegularOut: { isValid: boolean; value: string }
    ) => void;
}) {
    const { t } = useI18n();
    const [teachyTVRegularOutValid, setTeachyTVRegularOutValid] =
        useState(true);
    return (
        <Box
            sx={isTeachyTVMode ? { display: "flex", alignItems: "center" } : {}}
        >
            {isTeachyTVMode && (
                <NumericalInput
                    label={t("labels.minimumAdvancesOutsideTeachyTv")}
                    name="teachyTVRegularOut"
                    value={teachyTVRegularOut}
                    minimumValue={0}
                    maximumValue={100000000}
                    onChange={(_, value) => {
                        setTeachyTVRegularOutValid(value.isValid);
                        onChange(isTeachyTVMode, value);
                    }}
                />
            )}
            <FormControlLabel
                style={isTeachyTVMode ? { marginLeft: 8 } : {}}
                control={
                    <Checkbox
                        checked={isTeachyTVMode}
                        onChange={(e) => {
                            onChange(e.target.checked, {
                                value: teachyTVRegularOut,
                                isValid: teachyTVRegularOutValid,
                            });
                        }}
                    />
                }
                label={t("labels.teachyTvMode")}
                sx={{
                    whiteSpace: "nowrap",
                }}
            />
        </Box>
    );
}

export default TeachyTVEntry;
