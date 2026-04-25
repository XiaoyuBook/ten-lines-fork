import "./App.css";

import CssBaseline from "@mui/material/CssBaseline";
import {
    Box,
    Button,
    ButtonGroup,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, useSearchParams } from "react-router-dom";

import BingoPage, { getBingoActive } from "./components/BingoPage";
import CalibrationForm from "./components/CalibrationForm";
import IdComboForm from "./components/IdComboForm";
import InitialSeedForm from "./components/InitialSeedForm";
import SearcherForm from "./components/SearcherForm";
import useLocalStorage from "./hooks/useLocalStorage";
import { useI18n } from "./i18n";
import EmbeddedFrLgSeedsTimestamp from "./wasm/src/generated/frlg_seeds_timestamp.txt?raw";

const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#4c7dff",
        },
    },
    shape: {
        borderRadius: 14,
    },
});

type PageConfig = {
    value: number;
    label: string;
    shortLabel: string;
    icon: ReactNode;
    content: ReactNode;
};

function NavIcon({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <Box
            component="span"
            sx={{
                width: 18,
                height: 18,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "inherit",
            }}
        >
            {children}
        </Box>
    );
}

function ThemeIcon() {
    return (
        <NavIcon>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.8" />
                <path
                    d="M12 2.75V5.1M12 18.9v2.35M4.75 12H2.4M21.6 12h-2.35M5.64 5.64l1.67 1.67M16.69 16.69l1.67 1.67M18.36 5.64l-1.67 1.67M7.31 16.69l-1.67 1.67"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />
            </svg>
        </NavIcon>
    );
}

function SearchIcon() {
    return (
        <NavIcon>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path
                    d="M16 16L21 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />
            </svg>
        </NavIcon>
    );
}

function IdIcon() {
    return (
        <NavIcon>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <rect x="4" y="5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="14" y="5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="4" y="15" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="14" y="15" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
        </NavIcon>
    );
}

function SeedIcon() {
    return (
        <NavIcon>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                    d="M12 3C8.5 7.2 7 10.1 7 13a5 5 0 1010 0c0-2.9-1.5-5.8-5-10z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                />
            </svg>
        </NavIcon>
    );
}

function CalibrationIcon() {
    return (
        <NavIcon>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                    d="M4 17L9 12L13 16L20 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <circle cx="9" cy="12" r="1.5" fill="currentColor" />
                <circle cx="13" cy="16" r="1.5" fill="currentColor" />
                <circle cx="20" cy="8" r="1.5" fill="currentColor" />
            </svg>
        </NavIcon>
    );
}

function BingoIcon() {
    return (
        <NavIcon>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <path
                    d="M15 17l2 2l4-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </NavIcon>
    );
}

function TenLinesPages() {
    const { locale, setLocale, t } = useI18n();
    const [searchParams, setSearchParams] = useSearchParams();
    const [uiMode, setUiMode] = useLocalStorage<"legacy" | "modern">(
        "app-ui-mode",
        "legacy"
    );
    const [frlgSeedsTimestamp, setFrlgSeedsTimestamp] = useState(
        EmbeddedFrLgSeedsTimestamp.trim()
    );
    const currentPage = parseInt(searchParams.get("page") || "0", 10) || 0;
    const bingoActive = getBingoActive();
    const isModernUI = uiMode === "modern";
    const pageSx = useMemo(
        () => ({
            maxWidth: isModernUI ? "none" : 1100,
            width: "100%",
            minWidth: 0,
        }),
        [isModernUI]
    );
    const calibrationPageSx = useMemo(
        () => ({
            maxWidth: isModernUI ? "none" : 1680,
            width: "100%",
            minWidth: 0,
        }),
        [isModernUI]
    );

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
                    setFrlgSeedsTimestamp(timestampMatch[0].trim());
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

    const pages = useMemo<PageConfig[]>(() => {
        const nextPages: PageConfig[] = [
            {
                value: 2,
                label: t("tabs.searcher"),
                shortLabel: t("tabs.searcher"),
                icon: <SearchIcon />,
                content: (
                    <SearcherForm
                        key={2}
                        sx={pageSx}
                        hidden={currentPage !== 2}
                    />
                ),
            },
            {
                value: 4,
                label: t("tabs.idCombo"),
                shortLabel: t("tabs.idCombo"),
                icon: <IdIcon />,
                content: (
                    <IdComboForm
                        key={4}
                        sx={pageSx}
                        hidden={currentPage !== 4}
                    />
                ),
            },
            {
                value: 0,
                label: t("tabs.initialSeed"),
                shortLabel: t("tabs.initialSeed"),
                icon: <SeedIcon />,
                content: (
                    <InitialSeedForm
                        key={0}
                        sx={pageSx}
                        hidden={currentPage !== 0}
                    />
                ),
            },
            {
                value: 1,
                label: t("tabs.calibration"),
                shortLabel: t("tabs.calibration"),
                icon: <CalibrationIcon />,
                content: (
                    <CalibrationForm
                        key={1}
                        sx={calibrationPageSx}
                        hidden={currentPage !== 1}
                        uiMode={uiMode}
                    />
                ),
            },
        ];

        if (bingoActive) {
            nextPages.push({
                value: 3,
                label: t("tabs.bingo"),
                shortLabel: t("tabs.bingo"),
                icon: <BingoIcon />,
                content: <BingoPage key={3} hidden={currentPage !== 3} />,
            });
        }

        return nextPages;
    }, [bingoActive, calibrationPageSx, currentPage, pageSx, t]);

    const setCurrentPage = (newValue: number) => {
        setSearchParams((prev) => {
            prev.set("page", String(newValue));
            return prev;
        });
    };

    const legacyLayout = (
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
                    onChange={(_, newValue) => setCurrentPage(newValue)}
                    variant="fullWidth"
                    sx={{ flex: 1, minWidth: 400 }}
                >
                    {pages.map((page) => (
                        <Tab
                            key={page.value}
                            label={page.label}
                            value={page.value}
                        />
                    ))}
                </Tabs>
                <ButtonGroup size="small" variant="outlined">
                    <Button
                        variant={uiMode === "legacy" ? "contained" : "outlined"}
                        onClick={() => setUiMode("legacy")}
                    >
                        旧版 UI
                    </Button>
                    <Button
                        variant={uiMode === "modern" ? "contained" : "outlined"}
                        onClick={() => setUiMode("modern")}
                    >
                        新版 UI
                    </Button>
                </ButtonGroup>
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
            {pages.map((page) => page.content)}
        </Box>
    );

    const modernLayout = (
        <Box className="app-shell">
            <Box className="app-sidebar">
                <Box className="app-brand">
                    <Box className="app-brand-mark">
                        <span className="app-brand-ball" />
                    </Box>
                    <Typography variant="h6" className="app-brand-text">
                        PokéRNG
                    </Typography>
                </Box>
                <Box className="app-sidebar-nav">
                    {pages.map((page) => (
                        <Tooltip
                            key={page.value}
                            title={page.shortLabel}
                            placement="right"
                        >
                            <Button
                                className="app-nav-button"
                                variant="text"
                                onClick={() => setCurrentPage(page.value)}
                                data-active={currentPage === page.value ? "true" : "false"}
                                aria-label={page.shortLabel}
                            >
                                {page.icon}
                            </Button>
                        </Tooltip>
                    ))}
                </Box>
            </Box>
            <Box className="app-main">
                <Box className="app-topbar">
                    <Box>
                        <Typography variant="overline" className="app-kicker">
                            FRLG RNG TOOL
                        </Typography>
                        <Typography variant="h5" className="app-page-title">
                            {pages.find((page) => page.value === currentPage)?.label}
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Button
                            variant="outlined"
                            aria-label="theme"
                            sx={{
                                minWidth: 44,
                                width: 44,
                                px: 0,
                            }}
                        >
                            <ThemeIcon />
                        </Button>
                        <ButtonGroup size="small" variant="outlined">
                            <Button
                                variant={uiMode === "legacy" ? "contained" : "outlined"}
                                onClick={() => setUiMode("legacy")}
                            >
                                旧版 UI
                            </Button>
                            <Button
                                variant={uiMode === "modern" ? "contained" : "outlined"}
                                onClick={() => setUiMode("modern")}
                            >
                                新版 UI
                            </Button>
                        </ButtonGroup>
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
                </Box>
                <Box className="app-content">
                    {pages.map((page) => (
                        <Box
                            key={page.value}
                            className="modern-page-surface"
                        >
                            {page.content}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            {uiMode === "legacy" ? legacyLayout : modernLayout}
            {uiMode === "legacy" && (
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
            )}
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
