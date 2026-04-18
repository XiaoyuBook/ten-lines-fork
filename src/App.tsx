import "./App.css";

import CssBaseline from "@mui/material/CssBaseline";
import {
    Box,
    Button,
    ButtonGroup,
    Tab,
    Tabs,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { BrowserRouter, useSearchParams } from "react-router-dom";

import CalibrationForm from "./components/CalibrationForm";
import BingoPage, { getBingoActive } from "./components/BingoPage";
import IdComboForm from "./components/IdComboForm";
import InitialSeedForm from "./components/InitialSeedForm";
import SearcherForm from "./components/SearcherForm";
import { useI18n } from "./i18n";
import EmbeddedFrLgSeedsTimestamp from "./wasm/src/generated/frlg_seeds_timestamp.txt?raw";

const darkTheme = createTheme({
    palette: {
        mode: "dark",
    },
});

function TenLinesPages() {
    const { locale, setLocale, t } = useI18n();
    const [searchParams, setSearchParams] = useSearchParams();
    const [frlgSeedsTimestamp, setFrlgSeedsTimestamp] = useState(
        EmbeddedFrLgSeedsTimestamp.trim()
    );
    const currentPage = parseInt(searchParams.get("page") || "0") ?? 0;
    const bingoActive = getBingoActive();
    const pageSx = { maxWidth: 1100, width: "100%", minWidth: 0 };
    const calibrationPageSx = { maxWidth: 1680, width: "100%", minWidth: 0 };

    useEffect(() => {
        let cancelled = false;

        const loadTimestamp = async () => {
            try {
                const sep = import.meta.env.BASE_URL.endsWith("/") ? "" : "/";
                const url = `${import.meta.env.BASE_URL}${sep}generated/frlg_seeds_timestamp.txt?ts=${Date.now()}`;
                const response = await fetch(url, { cache: "no-store" });
                if (!response.ok) return;
                const rawText = await response.text();
                const timestampMatch = rawText.match(
                    /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/
                );
                if (!cancelled && timestampMatch) {
                    const timestamp = timestampMatch[0].trim();
                    setFrlgSeedsTimestamp(timestamp);
                }
            } catch {
                // Keep embedded fallback timestamp when runtime fetch fails.
            }
        };

        void loadTimestamp();

        return () => {
            cancelled = true;
        };
    }, []);

    const pages = [
        <InitialSeedForm
            key={0}
            sx={pageSx}
            hidden={currentPage != 0}
        />,
        <CalibrationForm
            key={1}
            sx={calibrationPageSx}
            hidden={currentPage != 1}
        />,
        <SearcherForm
            key={2}
            sx={pageSx}
            hidden={currentPage != 2}
        />,
        <IdComboForm
            key={4}
            sx={pageSx}
            hidden={currentPage != 4}
        />,
        bingoActive && <BingoPage key={3} hidden={currentPage != 3} />,
    ];

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Box>
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        flexWrap: "wrap",
                    }}
                >
                    <Tabs
                        value={currentPage}
                        onChange={(_, newValue) => {
                            setSearchParams((prev) => {
                                prev.set("page", newValue);
                                return prev;
                            });
                        }}
                        variant="fullWidth"
                        sx={{ flex: 1, minWidth: 400 }}
                    >
                        <Tab label={t("tabs.searcher")} value={2} />
                        <Tab label={t("tabs.idCombo")} value={4} />
                        <Tab label={t("tabs.initialSeed")} value={0} />
                        <Tab label={t("tabs.calibration")} value={1} />
                        {bingoActive && <Tab label={t("tabs.bingo")} value={3} />}
                    </Tabs>
                    <ButtonGroup size="small" variant="outlined">
                        <Button
                            variant={locale === "zh" ? "contained" : "outlined"}
                            onClick={() => setLocale("zh")}
                        >
                            {t("language.chinese")}
                        </Button>
                        <Button
                            variant={locale === "en" ? "contained" : "outlined"}
                            onClick={() => setLocale("en")}
                        >
                            {t("language.english")}
                        </Button>
                    </ButtonGroup>
                </Box>
                {pages}
            </Box>

            <footer>
                {t("footer.credit")}
                <br />
                {t("footer.poweredBy")}{" "}
                <a href="https://github.com/Admiral-Fish/PokeFinder">
                    PokeFinderCore
                </a>
                <br />
                {t("footer.seedDataAsOf")} {frlgSeedsTimestamp}
            </footer>
        </ThemeProvider>
    );
}

function App() {
    return (
        <BrowserRouter>
            <TenLinesPages />
        </BrowserRouter>
    );
}

export default App;
