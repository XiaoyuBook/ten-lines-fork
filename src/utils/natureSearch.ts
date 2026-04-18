import type { FilterOptionsState } from "@mui/material/useAutocomplete";

import { EN_NATURES, ZH_NATURES, ZH_NATURES_RAW } from "../i18n";

const normalizeNatureSearchText = (value: string) =>
    value.trim().toLocaleLowerCase();

const getNatureSearchAliases = (nature: number) => {
    if (nature < 0) {
        return [];
    }

    return [
        EN_NATURES[nature] ?? "",
        ZH_NATURES_RAW[nature] ?? "",
        ZH_NATURES[nature] ?? "",
    ];
};

export const filterNatureOptions = (
    options: number[],
    state: FilterOptionsState<number>
) => {
    const query = normalizeNatureSearchText(state.inputValue);

    if (query === "") {
        return options;
    }

    return options.filter((option) =>
        getNatureSearchAliases(option).some((alias) =>
            normalizeNatureSearchText(alias).startsWith(query)
        )
    );
};
