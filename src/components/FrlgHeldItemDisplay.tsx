import { Alert, Box, Tooltip, Typography } from "@mui/material";

import { useI18n } from "../i18n";
import { hexSeed } from "../tenLines";
import {
    FRLG_HELD_ITEM_SOURCE_COMMIT,
    getFrlgHeldItemName,
    getFrlgHeldItemProbabilities,
    getFrlgHeldItemSlots,
    getFrlgHeldOffsetProfiles,
    type FrlgHeldPrediction,
    type FrlgHeldPredictionContext,
} from "../utils/frlgHeldItems";

export function FrlgHeldItemNotice({
    profileSet,
    game,
    encounterCategory,
    location,
    method,
    species,
}: {
    profileSet: FrlgHeldPredictionContext["profileSet"];
    game: number;
    encounterCategory: number;
    location?: number;
    method: number;
    species: number;
}) {
    const { locale, t, resources } = useI18n();
    const slots = species >= 0 ? getFrlgHeldItemSlots(species & 0x7ff) : undefined;
    if (location === undefined || (species >= 0 && !slots)) {
        return null;
    }

    const probabilities = slots
        ? getFrlgHeldItemProbabilities(slots)
              .map(
                  ({ itemId, percent }) =>
                      `${getFrlgHeldItemName(locale, itemId)} ${percent}%`
              )
              .join(" / ")
        : undefined;
    const profiles = getFrlgHeldOffsetProfiles(
        profileSet,
        game,
        encounterCategory,
        location,
        method
    );
    const profileText = profiles
        .map((profile) => {
            const sampleText = profile.samples
                ? `, ${t("heldItems.samples", {
                      count: String(profile.samples),
                  })}`
                : "";
            return `${resources.methods[profile.method]} +${profile.baseOffset}${
                profile.status === "variable"
                    ? `/+${profile.alternateOffset}`
                    : ""
            }${sampleText}`;
        })
        .join("; ");

    return (
        <Alert
            severity={
                profiles.some((profile) => profile.status === "variable")
                    ? "warning"
                    : "info"
            }
            sx={{ my: 1, textAlign: "left" }}
        >
            {probabilities && (
                <Typography component="div" variant="body2">
                    <strong>{t("heldItems.sourceData")}</strong> {probabilities}
                </Typography>
            )}
            <Typography component="div" variant="body2">
                {profiles.length > 0
                    ? t("heldItems.profileAvailable", {
                          profiles: profileText,
                      })
                    : t("heldItems.profileUnavailable")}
            </Typography>
            {profiles.length > 0 && (
                <Typography component="div" variant="caption">
                    {t("heldItems.interferenceWarning")}
                </Typography>
            )}
            <Typography component="div" variant="caption" color="text.secondary">
                pret/pokefirered {FRLG_HELD_ITEM_SOURCE_COMMIT.slice(0, 8)}
            </Typography>
        </Alert>
    );
}

function predictionTooltip(
    prediction: FrlgHeldPrediction,
    baselineLabel: string,
    alternateLabel: string,
    statusLabel: string
) {
    const sampleText = prediction.profile.samples
        ? ` · n=${prediction.profile.samples}`
        : "";
    return `${statusLabel}${sampleText} · ${baselineLabel}: +${
        prediction.baseline.offset
    } ${prediction.baseline.roll} (${hexSeed(
        prediction.baseline.seed,
        32
    )}) · ${alternateLabel}: +${prediction.alternate.offset} ${
        prediction.alternate.roll
    } (${hexSeed(prediction.alternate.seed, 32)})`;
}

export function FrlgHeldItemValue({
    prediction,
}: {
    prediction?: FrlgHeldPrediction;
}) {
    const { locale, t } = useI18n();
    if (!prediction) {
        return <>—</>;
    }

    const baselineName = getFrlgHeldItemName(
        locale,
        prediction.baseline.itemId
    );
    const alternateName = getFrlgHeldItemName(
        locale,
        prediction.alternate.itemId
    );
    const differs = prediction.baseline.itemId !== prediction.alternate.itemId;
    const statusLabel = t(
        prediction.profile.status === "variable"
            ? "heldItems.variableProfile"
            : "heldItems.verifiedProfile"
    );

    return (
        <Tooltip
            title={predictionTooltip(
                prediction,
                t("heldItems.baseline"),
                t("heldItems.alternate"),
                statusLabel
            )}
        >
            <Box sx={{ whiteSpace: "nowrap" }}>
                <Typography component="div" variant="body2">
                    {baselineName}
                </Typography>
                {(differs || prediction.profile.status === "variable") && (
                    <Typography
                        component="div"
                        variant="caption"
                        color="warning.main"
                    >
                        +1: {alternateName}
                    </Typography>
                )}
            </Box>
        </Tooltip>
    );
}

export function FrlgHeldRngValue({
    prediction,
}: {
    prediction?: FrlgHeldPrediction;
}) {
    const { t } = useI18n();
    if (!prediction) {
        return <>—</>;
    }

    const statusLabel = t(
        prediction.profile.status === "variable"
            ? "heldItems.variableProfile"
            : "heldItems.verifiedProfile"
    );

    return (
        <Tooltip
            title={predictionTooltip(
                prediction,
                t("heldItems.baseline"),
                t("heldItems.alternate"),
                statusLabel
            )}
        >
            <Box sx={{ whiteSpace: "nowrap" }}>
                <Typography component="div" variant="body2">
                    +{prediction.baseline.offset} · {prediction.baseline.roll}
                </Typography>
                <Typography component="div" variant="caption" color="text.secondary">
                    +{prediction.alternate.offset} · {prediction.alternate.roll}
                </Typography>
            </Box>
        </Tooltip>
    );
}
