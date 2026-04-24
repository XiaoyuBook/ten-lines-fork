import { createContext, useContext } from "react";

import abilities_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/abilities_en.txt?raw";
import e_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/e_en.txt?raw";
import forms_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/forms_en.txt?raw";
import frlg_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/frlg_en.txt?raw";
import natures_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/natures_en.txt?raw";
import powers_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/powers_en.txt?raw";
import rs_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/rs_en.txt?raw";
import species_en_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/en/species_en.txt?raw";
import abilities_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/abilities_zh.txt?raw";
import e_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/e_zh.txt?raw";
import forms_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/forms_zh.txt?raw";
import frlg_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/frlg_zh.txt?raw";
import natures_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/natures_zh.txt?raw";
import powers_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/powers_zh.txt?raw";
import rs_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/rs_zh.txt?raw";
import species_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/species_zh.txt?raw";
import useLocalStorage from "./hooks/useLocalStorage";
import {
    COMBINED_WILD_METHOD,
    Game,
    STATIC_1,
    STATIC_2,
    STATIC_4,
    WILD_1,
    WILD_2,
    WILD_4,
} from "./tenLines";

export type Locale = "en" | "zh";

type TranslationValue = string | { [key: string]: TranslationValue };

type I18nContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
};

type ResourceBundle = {
    methods: Record<number, string>;
    genders: string[];
    shininess: string[];
    natures: string[];
    abilities: string[];
    species: string[];
    forms: Record<string, string>;
    types: string[];
    frlgLocations: Record<string, string>;
    rsLocations: Record<string, string>;
    eLocations: Record<string, string>;
    games: Record<number, string>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const parseList = (text: string) =>
    text
        .replace(/^\uFEFF/, "")
        .split("\n")
        .map((line) => line.trim().replace(/^\uFEFF/, ""))
        .filter((line) => line !== "");

const parseMap = (text: string) =>
    Object.fromEntries(
        parseList(text).map((line) => {
            const [key, ...rest] = line.split(",");
            return [key, rest.join(",")];
        })
    );

export const EN_NATURES = parseList(natures_en_txt);
export const ZH_NATURES_RAW = parseList(natures_zh_txt);
export const ZH_NATURES = ZH_NATURES_RAW.map((nature, index) => {
    const english = EN_NATURES[index];
    return english ? `${nature} (${english})` : nature;
});

const RESOURCES: Record<Locale, ResourceBundle> = {
    en: {
        methods: {
            [STATIC_1]: "Static 1",
            [STATIC_2]: "Static 2",
            [STATIC_4]: "Static 4",
            [WILD_1]: "Wild 1",
            [WILD_2]: "Wild 2",
            [WILD_4]: "Wild 4",
            [COMBINED_WILD_METHOD]: "All Wild Methods",
        },
        genders: ["\u2642", "\u2640", "-"],
        shininess: ["No", "Star", "Square"],
        natures: parseList(natures_en_txt),
        abilities: parseList(abilities_en_txt),
        species: ["Egg", ...parseList(species_en_txt)],
        forms: Object.fromEntries(
            parseList(forms_en_txt).map((line) => {
                const [species, form, name] = line.split(",");
                return [`${species}-${form}`, name];
            })
        ),
        types: parseList(powers_en_txt),
        frlgLocations: parseMap(frlg_en_txt),
        rsLocations: parseMap(rs_en_txt),
        eLocations: parseMap(e_en_txt),
        games: {
            [Game.None]: "None",
            [Game.Ruby]: "Ruby",
            [Game.Sapphire]: "Sapphire",
            [Game.RS]: "Ruby & Sapphire",
            [Game.Emerald]: "Emerald",
            [Game.Ruby | Game.Emerald]: "Ruby & Emerald",
            [Game.Sapphire | Game.Emerald]: "Sapphire & Emerald",
            [Game.RSE]: "Ruby, Sapphire & Emerald",
            [Game.FireRed]: "FireRed",
            [Game.LeafGreen]: "LeafGreen",
            [Game.FRLG]: "FireRed & LeafGreen",
            [Game.FRLG | Game.Emerald]: "FireRed, LeafGreen & Emerald",
            [Game.Gen3]: "Generation 3",
        },
    },
    zh: {
        methods: {
            [STATIC_1]: "\u9759\u6001 1",
            [STATIC_2]: "\u9759\u6001 2",
            [STATIC_4]: "\u9759\u6001 4",
            [WILD_1]: "\u91ce\u751f 1",
            [WILD_2]: "\u91ce\u751f 2",
            [WILD_4]: "\u91ce\u751f 4",
            [COMBINED_WILD_METHOD]: "\u5168\u90e8\u91ce\u751f\u65b9\u6cd5",
        },
        genders: ["\u2642", "\u2640", "-"],
        shininess: ["\u5426", "\u661f\u95ea", "\u65b9\u95ea"],
        natures: ZH_NATURES,
        abilities: parseList(abilities_zh_txt),
        species: ["\u86cb", ...parseList(species_zh_txt)],
        forms: Object.fromEntries(
            parseList(forms_zh_txt).map((line) => {
                const [species, form, name] = line.split(",");
                return [`${species}-${form}`, name];
            })
        ),
        types: parseList(powers_zh_txt),
        frlgLocations: parseMap(frlg_zh_txt),
        rsLocations: parseMap(rs_zh_txt),
        eLocations: parseMap(e_zh_txt),
        games: {
            [Game.None]: "\u65e0",
            [Game.Ruby]: "\u7ea2\u5b9d\u77f3",
            [Game.Sapphire]: "\u84dd\u5b9d\u77f3",
            [Game.RS]: "\u7ea2\u5b9d\u77f3 / \u84dd\u5b9d\u77f3",
            [Game.Emerald]: "\u7eff\u5b9d\u77f3",
            [Game.Ruby | Game.Emerald]:
                "\u7ea2\u5b9d\u77f3 / \u7eff\u5b9d\u77f3",
            [Game.Sapphire | Game.Emerald]:
                "\u84dd\u5b9d\u77f3 / \u7eff\u5b9d\u77f3",
            [Game.RSE]:
                "\u7ea2\u5b9d\u77f3 / \u84dd\u5b9d\u77f3 / \u7eff\u5b9d\u77f3",
            [Game.FireRed]: "\u706b\u7ea2",
            [Game.LeafGreen]: "\u53f6\u7eff",
            [Game.FRLG]: "\u706b\u7ea2 / \u53f6\u7eff",
            [Game.FRLG | Game.Emerald]:
                "\u706b\u7ea2 / \u53f6\u7eff / \u7eff\u5b9d\u77f3",
            [Game.Gen3]: "\u7b2c\u4e09\u4e16\u4ee3",
        },
    },
};

const TRANSLATIONS: Record<Locale, TranslationValue> = {
    en: {
        tabs: {
            searcher: "Searcher",
            idCombo: "ID Combo",
            initialSeed: "Initial Seed",
            calibration: "Calibration",
            bingo: "Bingo",
        },
        language: {
            chinese: "中文",
            english: "English",
        },
        common: {
            submit: "Submit",
            searching: "Searching...",
            any: "Any",
            none: "None",
            filter: "Filter",
            showSeeds: "Show Seeds",
            reset: "Reset",
            close: "Close",
            mono: "Mono",
            stereo: "Stereo",
        },
        footer: {
            credit:
                'Original "10 lines" was created by Shao, FRLG seeds farmed by blisy, po, HunarPG, 10Ben, Real96, Papa Jefé, and 銉堛儙',
            poweredBy: "Powered by",
            seedDataAsOf: "FRLG seed data as of",
        },
        labels: {
            minimum: "Minimum",
            maximum: "Maximum",
            game: "Game",
            sound: "Sound",
            buttonMode: "Button Mode",
            seedButton: "Seed Button",
            extraButton: "Extra Button",
            console: "Console",
            targetSeed: "Target Seed",
            seedLeeway: "Seed +/-",
            advances: "Advances",
            finalAPressFrame: "Final A Press Frame",
            offset: "Offset",
            teachyTvAdvances: "TeachyTV Advances",
            requiredOverworldFrames: "Required Overworld Frames",
            teachyTvMode: "TeachyTV Mode",
            trainerId: "Trainer ID",
            secretId: "Secret ID",
            method: "Method",
            shininess: "Shininess",
            nature: "Nature",
            gender: "Gender",
            hiddenPower: "Hidden Power",
            perfectIvCount: "Perfect IV Count",
            category: "Category",
            pokemon: "Pokemon",
            location: "Location",
            lead: "Lead",
            resultCount: "Result Count",
            allowedAdvances: "Allowed Advances",
            maxResults: "Max Results",
            tidFilter: "TID Filter",
            sidFilter: "SID Filter",
            ivCalculator: "IV Calculator",
            minimumAdvancesOutsideTeachyTv:
                "Minimum Advances Outside of TeachyTV",
        },
        options: {
            rubyPaintingSeed: "Ruby Painting Seed",
            sapphirePaintingSeed: "Sapphire Painting Seed",
            emeraldPaintingSeed: "Emerald Painting Seed",
            emerald: "Emerald",
            fireRedEng: "FireRed (ENG)",
            fireRedEu: "FireRed (SPA/FRE/ITA/GER)",
            fireRedJpn10: "FireRed (JPN) (1.0)",
            fireRedJpn11: "FireRed (JPN) (1.1)",
            switchFireRed: "Switch FireRed (ENG/SPA/FRE/ITA/GER)",
            fireRedMgba: "FireRed (ENG) (MGBA 10.5)",
            leafGreenEng: "LeafGreen (ENG)",
            leafGreenEu: "LeafGreen (SPA/FRE/ITA/GER)",
            leafGreenJpn: "LeafGreen (JPN)",
            switchLeafGreen: "Switch LeafGreen (ENG/SPA/FRE/ITA/GER)",
            leafGreenMgba: "LeafGreen (ENG) (MGBA 10.5)",
            help: "Help",
            startupSelect: "Startup Select",
            startupA: "Startup A",
            blackoutR: "Blackout R",
            blackoutA: "Blackout A",
            blackoutL: "Blackout L",
            blackoutAL: "Blackout A+L",
            switch1: "Nintendo Switch 1",
            switch2: "Nintendo Switch 2",
            gba: "Game Boy Advance",
            gbp: "Game Boy Player",
            nds: "Nintendo DS",
            firm3ds: "Nintendo 3DS (open_agb_firm)",
            star: "Star",
            square: "Square",
            starSquare: "Star/Square",
            starters: "Starters",
            fossils: "Fossils",
            gifts: "Gifts",
            gameCorner: "Game Corner",
            stationary: "Stationary",
            legends: "Legends",
            events: "Events",
            roamers: "Roamers",
            blisyEvents: "Blisy's E-Reader Events",
            grass: "Grass",
            rockSmash: "Rock Smash",
            surfing: "Surfing",
            oldRod: "Old Rod",
            goodRod: "Good Rod",
            superRod: "Super Rod",
            femaleCuteCharm: "Female Cute Charm",
            maleCuteCharm: "Male Cute Charm",
            magnetPull: "Magnet Pull",
            static: "Static",
            hustlePressureVitalSpirit: "Hustle/Pressure/Vital Spirit",
            matchingSynchronize: "Matching Synchronize",
            perfect1v: "1V",
            perfect2v: "2V",
            perfect3v: "3V",
            perfect4v: "4V",
            perfect5v: "5V",
            perfect6v: "6V",
            shinyLocked: "Shiny Locked",
            lockBreak: "Lock Break",
            start: "Start",
            select: "Select",
            startup: "Startup",
            blackout: "Blackout",
        },
        table: {
            actions: "Actions",
            seed: "Seed",
            advances: "Advances",
            method: "Method",
            finalAPressFrame: "Final A Press Frame",
            teachyTvAdvances: "TeachyTV Advances",
            continueScreenFrames: "Continue Screen Frames",
            slot: "Slot",
            level: "Level",
            pid: "PID",
            shiny: "Shiny",
            nature: "Nature",
            stats: "Stats",
            ability: "Ability",
            ivs: "IVs",
            hidden: "Hidden",
            power: "Power",
            gender: "Gender",
            rowsPerPage: "Rows per page",
            minReachableAdvances: "Min Reachable Advances",
            openInInitialSeed: "Open In Initial Seed",
            openInCalibration: "Open In Calibration",
            matchingTargets: "Matching Targets",
            exampleSeed: "Example Seed",
            examplePid: "Example PID",
            seedDec: "Seed (dec)",
            seedHex: "Seed (hex)",
            estimatedTotalFrames: "Estimated Total Frames",
            estimatedTotalTime: "Estimated Total Time",
            seedTime: "Seed Time",
            settings: "Calibration Page Settings",
            calibration: "Calibration",
            initialSeed: "Initial Seed",
        },
        compare: {
            title: "Calibration Compare",
            target: "Target",
            history: "History",
            record: "Record",
            settings: "Calibration Page Settings",
            floatWindow: "Float Window",
            minimize: "Minimize",
            settingsShort: "Set",
            clearAll: "Clear All",
            clearShort: "Clr",
            delete: "Delete",
            deleteTarget: "Delete Target",
            emptyTarget: "Add a result as the target to start comparing.",
            emptyHistory: "Historical results added later will appear here.",
            display: "Display",
            enable: "Enable compare table",
            enableCalculator: "Enable calculator",
            autoAddTarget: "Auto-add calibration target",
            position: "Panel Position",
            positionLeft: "Left",
            positionRight: "Right",
            compareMode: "Comparison Mode",
            modeTarget: "Always compare with target",
            modePrevious: "Compare with previous history entry",
            visibleColumns: "Visible Columns",
            resultVisibleColumns: "Result Table Columns",
            addToTarget: "Add to Target",
            addToHistory: "Add to History",
            reAddHistory: "Add to History Again",
            addedTarget: "Added as target",
            addedHistory: "Added to history",
            resultsTitle: "Calibration Results",
            calculator: "Calculator",
            wildLevelFilter: "Filter wild results by the first IV line level",
            wildLevelFilterStaticHint:
                "This filter is only available when the calibration method is wild.",
            wildLevelFilterHint:
                "When enabled, only wild results matching the first IV input line level are shown. Current first-line level: {level}",
        },
        dynamicTool: {
            title: "Dynamic Calibration Tool",
            subtitle:
                "Use one calculate button for both initialization and correction. Leave actual hit empty for a fresh calculation, or fill it in to correct from the last result.",
            showTool: "Show Dynamic Tool",
            hideTool: "Hide Dynamic Tool",
            toggleInSettings: "Show dynamic calibration tool",
            modeSection: "Mode And Input",
            modeTv: "TV Mode",
            modeNoTv: "Normal Mode",
            currentResultSection: "Current Script Parameters",
            historySection: "Adjustment Log",
            targetAdv: "Target Advances",
            baseTimeTv: "TV Base Time (ms)",
            baseTimeNoTv: "Normal Base Time (ms)",
            baseTimeTvHint: "Default from the reference code is 30000 ms.",
            baseTimeNoTvHint: "Default from the reference code is 13500 ms.",
            parityAutoHint:
                "Parity time is maintained internally. It only moves by +17 ms when seed parity needs correction.",
            calculateAction: "Calculate",
            actualHit: "Actual Hit Advances",
            actualHitHint: "Leave empty to initialize. Fill it in to correct from the current parameters.",
            currentTvLabel: "_TV Time",
            currentWaitLabel: "_Remaining Wait",
            currentParityLabel: "_Parity Time",
            currentBaseLabel: "Current Base Time",
            physicalTotal: "total_wait",
            lastDiff: "Last Diff",
            invalidCalculation: "Please enter valid initialization values.",
            invalidCorrection: "Please enter valid current parameters and hit advances.",
            calculateCompleted: "Initialization completed.",
            correctionCompleted: "Correction completed.",
            perfectAligned: "Perfect alignment.",
            clearedState: "All cached state has been cleared.",
            clearAll: "Clear All",
            notUsedShort: "Not used",
            seedQuestion: "Did you hit the target seed?",
            seedHit: "Yes",
            seedMiss: "No",
            historyUnit: "Unit: ms",
            historyRound: "Round",
            historyTvShort: "_TV",
            historyWaitShort: "_Remaining",
            historyParityShort: "_Parity",
            emptyHistory:
                "Each calculation will append the resulting parameters here.",
        },
        messages: {
            noKnownSeeds: "No known seeds for this game & settings",
            requiredForIvCalculation: "Required for IV calculation",
            ivCalculationDisabled:
                "IV calculation disabled. Searching all Natures.",
            filterByReachableAdvances: "Filter by reachable advances",
            usePerfectIvFilter: "Use perfect IV filter",
            idComboIntro:
                "Search for TID/SID combinations whose TSV makes the matching static target shiny.",
            noMatchingStaticTargets:
                "No matching static targets found for the selected filters.",
            noMatchingAdvances:
                "No matching targets fall within the selected advances range.",
            calibrationNoResultsTitle:
                "No calibration results were found. Please check:",
            calibrationNoResultsCheck1:
                "Whether sound, button mode, seed button, extra button, and device all match each other.",
            calibrationNoResultsCheck2:
                "Whether the Pokemon's gender or IV values were entered incorrectly.",
            calibrationNoResultsCheck3:
                "Whether the seed range and advance range should be expanded. If TeachyTV / TV advances are being used, expand the advance search range further.",
            exactIdSummary:
                "Found {candidateCount} matching target seed(s), {tsvCount} unique TSV(s), and {resultCount} matching target(s) for the selected TID/SID.",
            comboSummary:
                "Found {candidateCount} matching target seed(s), {tsvCount} unique TSV(s), and {resultCount} TID/SID combo(s).",
            resultsCapHit: "Results hit the max-results cap.",
            optionalExactTidFilter: "Optional exact TID filter",
            optionalExactSidFilter: "Optional exact SID filter",
            leaveBlankOrEnterId: "Leave blank or enter 0-65535",
            findTidSidCombos: "Find TID/SID Combos",
            ms: "ms",
            settingsSeedButton: "Seed Button",
            settingsExtraButton: "Extra Button",
            matchingSynchronizeSuffix: "Synchronize",
        },
        imageImport: {
            title: "Import From Screenshot",
            description:
                "Paste or upload a Pokemon Skills screenshot. The tool reads the six stat values from the upper-right panel and lets you append them as a new IV line.",
            queueHint:
                "Current lines: {count}. Import will append line {nextCount}.",
            imageLoaded:
                "Screenshot loaded. Select one ROI for HP and one ROI for the other five stats before starting recognition.",
            noImage: "Paste or upload a screenshot first.",
            requiresRoi: "Select a manual ROI before starting recognition.",
            requiresDualRoi:
                "Select both ROI regions before starting recognition: one for HP and one for the other five stats.",
            recognizing: "Recognizing...",
            recognize: "Recognize Stats",
            recognitionComplete:
                "Recognition complete. Review the values below before appending.",
            recognitionFailed:
                "Recognition failed. Try a clearer screenshot or enter the values manually.",
            noStatsFound:
                "No stat values were detected inside the selected ROI regions.",
            partialRecognition:
                "Detected {count}/{total} values. Please review and fill in any missing fields.",
            requiresNature:
                "Select a Nature in the calibration form before appending a screenshot entry.",
            invalidLevel: "Enter a valid level between 1 and 100.",
            invalidStats: "Enter all six stat values before appending.",
            appendAction: "Append As New Line",
            appended: "Appended a new IV line. Total lines: {nextCount}.",
            appendFailed:
                "Could not append this screenshot entry. Please verify the values and try again.",
            clear: "Clear",
            dropzoneTitle:
                "Click to upload, drag a screenshot here, or press Ctrl+V",
            dropzoneHint:
                "Suggested flow: set Nature, enter Level, paste a screenshot, recognize, then append.",
            previewTitle: "Recognition Preview",
            adjustHint:
                "Manual ROI only: select one ROI for HP and another ROI for the other five stats. Click a selection button, choose the top-left corner, then choose the bottom-right corner.",
            startRoiSelection: "Select ROI",
            startHpRoiSelection: "Select HP ROI",
            startStatsRoiSelection: "Select 5-Stat ROI",
            roiSelectionModeActive:
                "ROI selection mode is active. Click once for the top-left corner, then click again for the bottom-right corner.",
            hpRoiSelectionModeActive:
                "HP ROI selection mode is active. Click once for the top-left corner, then click again for the bottom-right corner.",
            statsRoiSelectionModeActive:
                "5-stat ROI selection mode is active. Click once for the top-left corner, then click again for the bottom-right corner.",
            roiFirstPointSet:
                "Top-left corner recorded. Click again to set the bottom-right corner.",
            roiApplied:
                "ROI applied. Recognition will use only this selected region.",
            hpRoiApplied:
                "HP ROI applied. Recognition will use this region for HP only.",
            statsRoiApplied:
                "5-stat ROI applied. Recognition will use this region for Attack, Defense, Sp. Atk, Sp. Def, and Speed.",
        },
        errors: {
            invalidInput: "Invalid input",
            valueMustBeBetween: "Value must be between {min} and {max}",
            lineMissing: "Line {line} Missing {field}",
            lineInvalid: "Line {line} Invalid {field}",
            noPossibleIv: "No Possible {stat} IV",
        },
        stats: {
            hp: "HP",
            attack: "Attack",
            defense: "Defense",
            specialAttack: "Special Attack",
            specialDefense: "Special Defense",
            speed: "Speed",
        },
    },
    zh: {
        tabs: {
            searcher: "\u641c\u7d22\u5668",
            idCombo: "ID \u7ec4\u5408",
            initialSeed: "\u521d\u59cb Seed",
            calibration: "\u6821\u51c6",
            bingo: "\u5bbe\u679c",
        },
        language: {
            chinese: "\u4e2d\u6587",
            english: "English",
        },
        common: {
            submit: "\u63d0\u4ea4",
            searching: "\u641c\u7d22\u4e2d...",
            any: "\u4efb\u610f",
            none: "\u65e0",
            filter: "\u7b5b\u9009",
            showSeeds: "\u663e\u793a Seed",
            reset: "\u91cd\u7f6e",
            close: "\u5173\u95ed",
            mono: "\u5355\u58f0\u9053",
            stereo: "\u7acb\u4f53\u58f0",
        },
        footer: {
            credit:
                '\u539f\u59cb "10 lines" \u7531 Shao \u5236\u4f5c\uff0cFRLG seed \u6570\u636e\u7531 blisy\u3001po\u3001HunarPG\u300110Ben\u3001Real96\u3001Papa Jef\u00e9 \u4e0e \u9299\u5806\u5139 \u6536\u96c6',
            poweredBy: "\u6280\u672f\u652f\u6301",
            seedDataAsOf: "FRLG seed \u6570\u636e\u66f4\u65b0\u65f6\u95f4",
        },
        labels: {
            minimum: "\u6700\u5c0f",
            maximum: "\u6700\u5927",
            game: "\u6e38\u620f",
            sound: "\u58f0\u97f3",
            buttonMode: "\u6309\u952e\u6a21\u5f0f",
            seedButton: "Seed \u6309\u952e",
            extraButton: "\u989d\u5916\u6309\u952e",
            console: "\u8bbe\u5907",
            targetSeed: "\u76ee\u6807 Seed",
            seedLeeway: "Seed \u5bb9\u5dee +/-",
            advances: "\u6d88\u8017\u5e27",
            finalAPressFrame: "\u6700\u7ec8 A \u6309\u4e0b\u5e27",
            offset: "\u504f\u79fb",
            teachyTvAdvances: "\u6559\u5b66\u7535\u89c6\u6d88\u8017\u5e27",
            requiredOverworldFrames: "\u6240\u9700\u5927\u5730\u56fe\u5e27\u6570",
            teachyTvMode: "\u6559\u5b66\u7535\u89c6\u6a21\u5f0f",
            trainerId: "Trainer ID",
            secretId: "Secret ID",
            method: "\u65b9\u6cd5",
            shininess: "\u5f02\u8272",
            nature: "\u6027\u683c",
            gender: "\u6027\u522b",
            hiddenPower: "\u89c9\u9192\u529b\u91cf",
            perfectIvCount: "\u6ee1\u80fd\u529b\u6570\u91cf",
            category: "\u5206\u7c7b",
            pokemon: "\u5b9d\u53ef\u68a6",
            location: "\u5730\u70b9",
            lead: "\u9996\u53d1\u7279\u6027",
            resultCount: "\u7ed3\u679c\u6570\u91cf",
            allowedAdvances: "\u5141\u8bb8\u7684\u6d88\u8017\u5e27\u8303\u56f4",
            maxResults: "\u6700\u5927\u7ed3\u679c\u6570",
            tidFilter: "TID \u7b5b\u9009",
            sidFilter: "SID \u7b5b\u9009",
            ivCalculator: "IV \u8ba1\u7b97\u5668",
            minimumAdvancesOutsideTeachyTv:
                "\u6559\u5b66\u7535\u89c6\u5916\u7684\u6700\u5c11\u6d88\u8017\u5e27",
        },
        options: {
            rubyPaintingSeed: "\u7ea2\u5b9d\u77f3\u7ed8\u753b Seed",
            sapphirePaintingSeed: "\u84dd\u5b9d\u77f3\u7ed8\u753b Seed",
            emeraldPaintingSeed: "\u7eff\u5b9d\u77f3\u7ed8\u753b Seed",
            emerald: "\u7eff\u5b9d\u77f3",
            fireRedEng: "\u706b\u7ea2\uff08\u82f1\u6587\uff09",
            fireRedEu: "\u706b\u7ea2\uff08\u897f/\u6cd5/\u610f/\u5fb7\uff09",
            fireRedJpn10: "\u706b\u7ea2\uff08\u65e5\u7248\uff091.0",
            fireRedJpn11: "\u706b\u7ea2\uff08\u65e5\u7248\uff091.1",
            switchFireRed:
                "Switch \u706b\u7ea2\uff08\u82f1/\u897f/\u6cd5/\u610f/\u5fb7\uff09",
            fireRedMgba:
                "\u706b\u7ea2\uff08\u82f1\u6587\uff09\uff08mGBA 10.5\uff09",
            leafGreenEng: "\u53f6\u7eff\uff08\u82f1\u6587\uff09",
            leafGreenEu: "\u53f6\u7eff\uff08\u897f/\u6cd5/\u610f/\u5fb7\uff09",
            leafGreenJpn: "\u53f6\u7eff\uff08\u65e5\u7248\uff09",
            switchLeafGreen:
                "Switch \u53f6\u7eff\uff08\u82f1/\u897f/\u6cd5/\u610f/\u5fb7\uff09",
            leafGreenMgba:
                "\u53f6\u7eff\uff08\u82f1\u6587\uff09\uff08mGBA 10.5\uff09",
            help: "\u5e2e\u52a9",
            startupSelect: "\u542f\u52a8\u65f6 Select",
            startupA: "\u542f\u52a8\u65f6 A",
            blackoutR: "\u9ed1\u5c4f\u540e R",
            blackoutA: "\u9ed1\u5c4f\u540e A",
            blackoutL: "\u9ed1\u5c4f\u540e L",
            blackoutAL: "\u9ed1\u5c4f\u540e A+L",
            switch1: "Nintendo Switch 1",
            switch2: "Nintendo Switch 2",
            gba: "Game Boy Advance",
            gbp: "Game Boy Player",
            nds: "Nintendo DS",
            firm3ds: "Nintendo 3DS\uff08open_agb_firm\uff09",
            star: "\u661f\u95ea",
            square: "\u65b9\u95ea",
            starSquare: "\u661f\u95ea/\u65b9\u95ea",
            starters: "\u5fa1\u4e09\u5bb6",
            fossils: "\u5316\u77f3",
            gifts: "\u8d60\u9001",
            gameCorner: "\u6e38\u620f\u89d2",
            stationary: "\u5b9a\u70b9",
            legends: "\u4f20\u8bf4",
            events: "\u6d3b\u52a8",
            roamers: "\u6e38\u8d70",
            blisyEvents: "Blisy \u7535\u5b50\u5361\u6d3b\u52a8",
            grass: "\u8349\u4e1b",
            rockSmash: "\u788e\u5ca9",
            surfing: "\u51b2\u6d6a",
            oldRod: "\u7834\u65e7\u9493\u7aff",
            goodRod: "\u597d\u9493\u7aff",
            superRod: "\u8d85\u7ea7\u9493\u7aff",
            femaleCuteCharm: "\u8ff7\u4eba\u4e4b\u8eaf\uff08\u6bcd\uff09",
            maleCuteCharm: "\u8ff7\u4eba\u4e4b\u8eaf\uff08\u516c\uff09",
            magnetPull: "\u78c1\u529b",
            static: "\u9759\u7535",
            hustlePressureVitalSpirit:
                "\u6d3b\u529b/\u538b\u8feb\u611f/\u5e72\u52b2",
            matchingSynchronize: "\u5339\u914d\u540c\u6b65",
            perfect1v: "1V",
            perfect2v: "2V",
            perfect3v: "3V",
            perfect4v: "4V",
            perfect5v: "5V",
            perfect6v: "6V",
            shinyLocked: "\u5f02\u8272\u9501\u5b9a",
            lockBreak: "\u7834\u9501",
            start: "\u5f00\u59cb",
            select: "\u9009\u62e9",
            startup: "\u542f\u52a8",
            blackout: "\u9ed1\u5c4f",
        },
        table: {
            actions: "\u64cd\u4f5c",
            seed: "Seed",
            advances: "\u6d88\u8017\u5e27",
            method: "\u65b9\u6cd5",
            finalAPressFrame: "\u6700\u7ec8 A \u6309\u4e0b\u5e27",
            teachyTvAdvances: "\u6559\u5b66\u7535\u89c6\u6d88\u8017\u5e27",
            continueScreenFrames: "\u7ee7\u7eed\u754c\u9762\u5e27\u6570",
            slot: "\u69fd\u4f4d",
            level: "\u7b49\u7ea7",
            pid: "PID",
            shiny: "\u5f02\u8272",
            nature: "\u6027\u683c",
            stats: "\u80fd\u529b\u503c",
            ability: "\u7279\u6027",
            ivs: "IV",
            hidden: "\u89c9\u9192\u5c5e\u6027",
            power: "\u5a01\u529b",
            gender: "\u6027\u522b",
            rowsPerPage: "\u6bcf\u9875\u884c\u6570",
            minReachableAdvances: "\u6700\u5c0f\u53ef\u8fbe\u6d88\u8017\u5e27",
            openInInitialSeed: "\u5728\u521d\u59cb Seed \u4e2d\u6253\u5f00",
            openInCalibration: "\u5728\u6821\u51c6\u4e2d\u6253\u5f00",
            matchingTargets: "\u5339\u914d\u76ee\u6807\u6570",
            exampleSeed: "\u793a\u4f8b Seed",
            examplePid: "\u793a\u4f8b PID",
            seedDec: "Seed\uff08\u5341\u8fdb\u5236\uff09",
            seedHex: "Seed\uff08\u5341\u516d\u8fdb\u5236\uff09",
            estimatedTotalFrames: "\u4f30\u8ba1\u603b\u5e27\u6570",
            estimatedTotalTime: "\u4f30\u8ba1\u603b\u65f6\u95f4",
            seedTime: "Seed \u65f6\u95f4",
            settings: "\u6821\u51c6\u9875\u9762\u8bbe\u7f6e",
            calibration: "\u6821\u51c6",
            initialSeed: "\u521d\u59cb Seed",
        },
        compare: {
            title: "\u6821\u51c6\u5bf9\u7167",
            target: "\u76ee\u6807",
            history: "\u5386\u53f2",
            record: "\u8bb0\u5f55",
            settings: "\u6821\u51c6\u9875\u9762\u8bbe\u7f6e",
            floatWindow: "\u6d6e\u7a97",
            minimize: "\u6700\u5c0f\u5316",
            settingsShort: "\u8bbe",
            clearAll: "\u6e05\u7a7a",
            clearShort: "\u6e05",
            delete: "\u5220\u9664",
            deleteTarget: "\u5220\u9664\u76ee\u6807",
            emptyTarget:
                "\u5148\u4ece\u4e0b\u65b9\u7ed3\u679c\u8868\u91cc\u52a0\u5165\u4e00\u6761\u76ee\u6807\u6570\u636e\u3002",
            emptyHistory:
                "\u540e\u7eed\u52a0\u5165\u7684\u5386\u53f2\u6570\u636e\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002",
            display: "\u663e\u793a",
            enable: "\u542f\u7528\u5bf9\u7167\u8868",
            enableCalculator: "\u542f\u7528\u8ba1\u7b97\u5668",
            autoAddTarget: "\u6821\u51c6\u81ea\u52a8\u6dfb\u52a0\u76ee\u6807",
            position: "\u8868\u683c\u4f4d\u7f6e",
            positionLeft: "\u5de6\u4fa7",
            positionRight: "\u53f3\u4fa7",
            compareMode: "\u5bf9\u6bd4\u65b9\u5f0f",
            modeTarget: "\u59cb\u7ec8\u4e0e\u76ee\u6807\u5bf9\u6bd4",
            modePrevious: "\u4e0e\u4e0a\u4e00\u6761\u5386\u53f2\u5bf9\u6bd4",
            visibleColumns: "\u663e\u793a\u5217",
            resultVisibleColumns: "\u7ed3\u679c\u8868\u663e\u793a\u5217",
            addToTarget: "\u52a0\u5230\u76ee\u6807",
            addToHistory: "\u52a0\u5230\u5386\u53f2",
            reAddHistory: "\u518d\u6b21\u52a0\u5165\u5386\u53f2",
            addedTarget: "\u5df2\u6dfb\u52a0\u4e3a\u76ee\u6807",
            addedHistory: "\u5df2\u6dfb\u52a0\u5230\u5386\u53f2",
            resultsTitle: "\u6821\u51c6\u7ed3\u679c",
            calculator: "\u8ba1\u7b97\u5668",
            wildLevelFilter:
                "\u6309 IV \u7b2c\u4e00\u884c\u7684\u7b49\u7ea7\u7b5b\u9009\u91ce\u751f\u7ed3\u679c",
            wildLevelFilterStaticHint:
                "\u8be5\u7b5b\u9009\u53ea\u6709\u5728\u6821\u51c6\u65b9\u6cd5\u4e3a\u91ce\u751f\u65f6\u624d\u53ef\u7528\u3002",
            wildLevelFilterHint:
                "\u5f00\u542f\u540e\uff0c\u53ea\u663e\u793a\u7b49\u4e8e IV \u8f93\u5165\u7b2c\u4e00\u884c\u7b49\u7ea7\u7684\u91ce\u751f\u7ed3\u679c\u3002\u5f53\u524d\u7b2c\u4e00\u884c\u7b49\u7ea7\uff1a{level}",
        },
        dynamicTool: {
            title: "\u52a8\u6001\u4fee\u6b63\u5de5\u5177",
            subtitle:
                "\u53ea\u4fdd\u7559\u4e00\u4e2a\u8ba1\u7b97\u6309\u94ae\uff1a`\u5b9e\u9645\u547d\u4e2d` \u7559\u7a7a\u65f6\u7528\u6765\u521d\u59cb\u8ba1\u7b97\uff0c\u586b\u4e86\u4e4b\u540e\u5c31\u6309\u5f53\u524d\u7ed3\u679c\u8fdb\u884c\u4fee\u6b63\u3002",
            showTool: "\u663e\u793a\u52a8\u6001\u4fee\u6b63\u5de5\u5177",
            hideTool: "\u9690\u85cf\u52a8\u6001\u4fee\u6b63\u5de5\u5177",
            toggleInSettings: "\u663e\u793a\u52a8\u6001\u4fee\u6b63\u5de5\u5177",
            modeSection: "\u6a21\u5f0f\u4e0e\u8f93\u5165",
            modeTv: "TV \u6a21\u5f0f",
            modeNoTv: "\u666e\u901a\u6a21\u5f0f",
            currentResultSection: "\u5f53\u524d\u811a\u672c\u53c2\u6570",
            historySection: "\u8c03\u6574\u65e5\u5fd7",
            targetAdv: "\u76ee\u6807 Advances",
            baseTimeTv: "TV \u57fa\u7840\u65f6\u95f4 (ms)",
            baseTimeNoTv: "\u666e\u901a\u57fa\u7840\u65f6\u95f4 (ms)",
            baseTimeTvHint: "\u53c2\u8003\u4ee3\u7801\u9ed8\u8ba4\u503c\u4e3a 30000 ms\u3002",
            baseTimeNoTvHint: "\u53c2\u8003\u4ee3\u7801\u9ed8\u8ba4\u503c\u4e3a 13500 ms\u3002",
            parityAutoHint:
                "\u5947\u5076\u65f6\u95f4\u7531\u5de5\u5177\u5185\u90e8\u7ef4\u62a4\uff0c\u53ea\u6709\u5728 seed \u5947\u5076\u9700\u8981\u4fee\u6b63\u65f6\u624d\u4f1a +17 ms\u3002",
            calculateAction: "\u8ba1\u7b97",
            actualHit: "\u5b9e\u9645\u547d\u4e2d Advances",
            actualHitHint: "\u7559\u7a7a\u65f6\u505a\u521d\u59cb\u8ba1\u7b97\uff0c\u586b\u4e86\u4e4b\u540e\u5c31\u6309\u5f53\u524d\u53c2\u6570\u8fdb\u884c\u4fee\u6b63\u3002",
            currentTvLabel: "_TV\u8fc7\u5e27\u65f6\u95f4",
            currentWaitLabel: "_\u5269\u4f59\u5e27\u6570\u65f6\u95f4",
            currentParityLabel: "_\u5947\u5076\u65f6\u95f4",
            currentBaseLabel: "\u5f53\u524d\u57fa\u7840\u65f6\u95f4",
            physicalTotal: "total_wait",
            lastDiff: "\u4e0a\u6b21\u504f\u5dee",
            invalidCalculation: "\u8bf7\u5148\u8f93\u5165\u6709\u6548\u7684\u521d\u59cb\u5316\u53c2\u6570\u3002",
            invalidCorrection: "\u8bf7\u5148\u8f93\u5165\u6709\u6548\u7684\u5f53\u524d\u53c2\u6570\u548c\u5b9e\u9645\u547d\u4e2d\u5e27\u6570\u3002",
            calculateCompleted: "\u521d\u59cb\u5316\u5b8c\u6210\u3002",
            correctionCompleted: "\u4fee\u6b63\u5b8c\u6210\u3002",
            perfectAligned: "\u5df2\u5b8c\u5168\u5bf9\u9f50\u3002",
            clearedState: "\u6240\u6709\u5de5\u5177\u7f13\u5b58\u5df2\u6e05\u7a7a\u3002",
            clearAll: "\u6e05\u7a7a\u5168\u90e8",
            notUsedShort: "\u4e0d\u4f7f\u7528",
            seedQuestion: "\u8fd9\u6b21 seed \u547d\u4e2d\u4e86\u5417\uff1f",
            seedHit: "\u547d\u4e2d",
            seedMiss: "\u672a\u547d\u4e2d",
            historyUnit: "\u5355\u4f4d\uff1ams",
            historyRound: "\u8f6e\u6b21",
            historyTvShort: "_TV",
            historyWaitShort: "_\u5269\u4f59",
            historyParityShort: "_\u5947\u5076",
            emptyHistory:
                "\u6bcf\u6b21\u8ba1\u7b97\u540e\uff0c\u7ed3\u679c\u53c2\u6570\u90fd\u4f1a\u8ffd\u52a0\u5230\u8fd9\u91cc\u3002",
        },
        messages: {
            noKnownSeeds:
                "\u5f53\u524d\u6e38\u620f\u548c\u8bbe\u7f6e\u4e0b\u6ca1\u6709\u5df2\u77e5 Seed",
            requiredForIvCalculation:
                "\u8fdb\u884c IV \u8ba1\u7b97\u65f6\u5fc5\u586b",
            ivCalculationDisabled:
                "IV \u8ba1\u7b97\u5df2\u5173\u95ed\uff0c\u6b63\u5728\u641c\u7d22\u5168\u90e8\u6027\u683c\u3002",
            filterByReachableAdvances:
                "\u6309\u53ef\u8fbe\u6d88\u8017\u5e27\u7b5b\u9009",
            usePerfectIvFilter:
                "\u6ee1\u80fd\u529b\u7b5b\u9009",
            idComboIntro:
                "\u641c\u7d22\u80fd\u8ba9\u5339\u914d\u9759\u6001\u76ee\u6807\u53d8\u95ea\u7684 TID/SID \u7ec4\u5408\u3002",
            noMatchingStaticTargets:
                "\u6240\u9009\u6761\u4ef6\u4e0b\u6ca1\u6709\u5339\u914d\u7684\u9759\u6001\u76ee\u6807\u3002",
            noMatchingAdvances:
                "\u6ca1\u6709\u76ee\u6807\u843d\u5728\u6240\u9009\u6d88\u8017\u5e27\u8303\u56f4\u5185\u3002",
            calibrationNoResultsTitle:
                "\u672a\u641c\u7d22\u5230\u6821\u51c6\u7ed3\u679c\uff0c\u8bf7\u68c0\u67e5\uff1a",
            calibrationNoResultsCheck1:
                "\u58f0\u97f3\u3001\u6309\u952e\u6a21\u5f0f\u3001seed\u6309\u952e\u3001\u989d\u5916\u6309\u952e\u548c\u8bbe\u5907\u662f\u5426\u4e00\u4e00\u5bf9\u5e94",
            calibrationNoResultsCheck2:
                "\u5b9d\u53ef\u68a6\u7684\u6027\u522b\u3001\u80fd\u529b\u503c\u662f\u5426\u586b\u5199\u9519\u8bef",
            calibrationNoResultsCheck3:
                "seed\u548c\u5e27\u6570\u662f\u5426\u9700\u8981\u6269\u5927\u8303\u56f4\uff0c\u5982\u679c\u4f7f\u7528\u4e86tv\u8fc7\u5e27\u5219\u9700\u8981\u8fdb\u4e00\u6b65\u6269\u5927\u5e27\u6570\u641c\u7d22\u8303\u56f4",
            exactIdSummary:
                "\u627e\u5230 {candidateCount} \u4e2a\u5339\u914d\u76ee\u6807 Seed\u3001{tsvCount} \u4e2a\u552f\u4e00 TSV\uff0c\u4ee5\u53ca {resultCount} \u4e2a\u7b26\u5408\u6240\u9009 TID/SID \u7684\u5339\u914d\u76ee\u6807\u3002",
            comboSummary:
                "\u627e\u5230 {candidateCount} \u4e2a\u5339\u914d\u76ee\u6807 Seed\u3001{tsvCount} \u4e2a\u552f\u4e00 TSV\uff0c\u4ee5\u53ca {resultCount} \u4e2a TID/SID \u7ec4\u5408\u3002",
            resultsCapHit:
                "\u7ed3\u679c\u5df2\u8fbe\u5230\u6700\u5927\u6570\u91cf\u4e0a\u9650\u3002",
            optionalExactTidFilter:
                "\u53ef\u9009\u7684\u7cbe\u786e TID \u7b5b\u9009",
            optionalExactSidFilter:
                "\u53ef\u9009\u7684\u7cbe\u786e SID \u7b5b\u9009",
            leaveBlankOrEnterId:
                "\u7559\u7a7a\u6216\u8f93\u5165 0-65535",
            findTidSidCombos: "\u67e5\u627e TID/SID \u7ec4\u5408",
            ms: "\u6beb\u79d2",
            settingsSeedButton: "Seed \u6309\u952e",
            settingsExtraButton: "\u989d\u5916\u6309\u952e",
            matchingSynchronizeSuffix: "\u540c\u6b65",
        },
        imageImport: {
            title: "\u4ece\u622a\u56fe\u5bfc\u5165",
            description:
                "\u7c98\u8d34\u6216\u4e0a\u4f20 Pokemon Skills \u754c\u9762\u622a\u56fe\u3002\u5de5\u5177\u4f1a\u8bfb\u53d6\u53f3\u4e0a\u89d2\u7684 6 \u4e2a\u80fd\u529b\u503c\uff0c\u5e76\u53ef\u4ee5\u5c06\u5b83\u4eec\u8ffd\u52a0\u5230 IV \u8f93\u5165\u7684\u65b0\u4e00\u884c\u3002",
            queueHint:
                "\u5f53\u524d\u5df2\u6709 {count} \u884c\uff0c\u5bfc\u5165\u540e\u4f1a\u8ffd\u52a0\u4e3a\u7b2c {nextCount} \u884c\u3002",
            imageLoaded:
                "\u622a\u56fe\u5df2\u8f7d\u5165\uff0c\u8bf7\u5148\u5206\u522b\u6846\u9009 HP \u533a\u57df\u548c\u5176\u4ed6 5 \u9879\u80fd\u529b\u503c\u533a\u57df\uff0c\u518d\u5f00\u59cb\u8bc6\u522b\u3002",
            noImage: "\u8bf7\u5148\u7c98\u8d34\u6216\u4e0a\u4f20\u622a\u56fe\u3002",
            requiresRoi:
                "\u5f00\u59cb\u8bc6\u522b\u524d\uff0c\u8bf7\u5148\u624b\u52a8\u6846\u9009 ROI\u3002",
            requiresDualRoi:
                "\u5f00\u59cb\u8bc6\u522b\u524d\uff0c\u8bf7\u5148\u6846\u9009\u4e24\u4e2a ROI\uff1a\u4e00\u4e2a\u7ed9 HP\uff0c\u4e00\u4e2a\u7ed9\u5176\u4ed6 5 \u9879\u80fd\u529b\u503c\u3002",
            recognizing: "\u6b63\u5728\u8bc6\u522b...",
            recognize: "\u8bc6\u522b\u80fd\u529b\u503c",
            recognitionComplete:
                "\u8bc6\u522b\u5b8c\u6210\uff0c\u8bf7\u5148\u68c0\u67e5\u4e0b\u65b9\u6570\u503c\u518d\u8ffd\u52a0\u3002",
            recognitionFailed:
                "\u8bc6\u522b\u5931\u8d25\uff0c\u8bf7\u6362\u66f4\u6e05\u6670\u7684\u622a\u56fe\uff0c\u6216\u8005\u624b\u52a8\u586b\u5199\u6570\u503c\u3002",
            noStatsFound:
                "\u5728\u6240\u9009 ROI \u533a\u57df\u5185\u6ca1\u6709\u8bc6\u522b\u5230\u80fd\u529b\u503c\u3002",
            partialRecognition:
                "\u5df2\u8bc6\u522b {count}/{total} \u4e2a\u6570\u503c\uff0c\u8bf7\u68c0\u67e5\u5e76\u8865\u5168\u7f3a\u5931\u9879\u3002",
            requiresNature:
                "\u8ffd\u52a0\u622a\u56fe\u6570\u636e\u524d\uff0c\u8bf7\u5148\u5728\u6821\u51c6\u8868\u5355\u91cc\u9009\u62e9\u6027\u683c\u3002",
            invalidLevel:
                "\u8bf7\u8f93\u5165 1 \u5230 100 \u4e4b\u95f4\u7684\u6709\u6548\u7b49\u7ea7\u3002",
            invalidStats:
                "\u8ffd\u52a0\u4e4b\u524d\uff0c\u8bf7\u786e\u8ba4 6 \u4e2a\u80fd\u529b\u503c\u90fd\u5df2\u586b\u5199\u3002",
            appendAction: "\u8ffd\u52a0\u4e3a\u65b0\u4e00\u884c",
            appended:
                "\u5df2\u8ffd\u52a0\u65b0\u7684 IV \u8f93\u5165\u884c\uff0c\u5f53\u524d\u603b\u884c\u6570\uff1a{nextCount}\u3002",
            appendFailed:
                "\u65e0\u6cd5\u8ffd\u52a0\u8fd9\u6761\u622a\u56fe\u6570\u636e\uff0c\u8bf7\u68c0\u67e5\u6570\u503c\u540e\u91cd\u8bd5\u3002",
            clear: "\u6e05\u7a7a",
            dropzoneTitle:
                "\u70b9\u51fb\u4e0a\u4f20\u3001\u62d6\u653e\u622a\u56fe\u5230\u6b64\u5904\uff0c\u6216\u76f4\u63a5\u6309 Ctrl+V",
            dropzoneHint:
                "\u5efa\u8bae\u6d41\u7a0b\uff1a\u5148\u9009\u6027\u683c\uff0c\u518d\u8f93\u5165\u7b49\u7ea7\uff0c\u7136\u540e\u7c98\u8d34\u622a\u56fe\u3001\u8bc6\u522b\uff0c\u6700\u540e\u8ffd\u52a0\u4e3a\u65b0\u4e00\u884c\u3002",
            previewTitle: "\u8bc6\u522b\u9884\u89c8",
            adjustHint:
                "\u73b0\u5728\u53ea\u652f\u6301\u624b\u52a8 ROI\uff1a\u9700\u8981\u5206\u522b\u6846\u9009 HP \u533a\u57df\u548c\u5176\u4ed6 5 \u9879\u80fd\u529b\u503c\u533a\u57df\u3002\u70b9\u51fb\u6309\u94ae\u540e\uff0c\u5148\u70b9\u5de6\u4e0a\u89d2\uff0c\u518d\u70b9\u53f3\u4e0b\u89d2\u3002",
            startRoiSelection: "\u6846\u9009 ROI",
            startHpRoiSelection: "\u6846\u9009 HP ROI",
            startStatsRoiSelection: "\u6846\u9009 5 \u9879 ROI",
            roiSelectionModeActive:
                "\u5df2\u8fdb\u5165 ROI \u6846\u9009\u6a21\u5f0f\uff0c\u8bf7\u5148\u70b9\u5de6\u4e0a\u89d2\uff0c\u518d\u70b9\u53f3\u4e0b\u89d2\u3002",
            hpRoiSelectionModeActive:
                "\u5df2\u8fdb\u5165 HP ROI \u6846\u9009\u6a21\u5f0f\uff0c\u8bf7\u5148\u70b9\u5de6\u4e0a\u89d2\uff0c\u518d\u70b9\u53f3\u4e0b\u89d2\u3002",
            statsRoiSelectionModeActive:
                "\u5df2\u8fdb\u5165 5 \u9879 ROI \u6846\u9009\u6a21\u5f0f\uff0c\u8bf7\u5148\u70b9\u5de6\u4e0a\u89d2\uff0c\u518d\u70b9\u53f3\u4e0b\u89d2\u3002",
            roiFirstPointSet:
                "\u5de6\u4e0a\u89d2\u5df2\u8bb0\u5f55\uff0c\u8bf7\u518d\u70b9\u4e00\u4e0b\u53f3\u4e0b\u89d2\u3002",
            roiApplied:
                "ROI \u5df2\u5e94\u7528\uff0c\u540e\u7eed\u8bc6\u522b\u53ea\u4f1a\u4f7f\u7528\u8fd9\u4e2a\u9009\u5b9a\u533a\u57df\u3002",
            hpRoiApplied:
                "HP ROI \u5df2\u5e94\u7528\uff0c\u540e\u7eed\u8bc6\u522b\u53ea\u4f1a\u7528\u5b83\u6765\u8bc6\u522b HP\u3002",
            statsRoiApplied:
                "5 \u9879 ROI \u5df2\u5e94\u7528\uff0c\u540e\u7eed\u8bc6\u522b\u4f1a\u7528\u5b83\u6765\u8bc6\u522b\u653b\u51fb/\u9632\u5fa1/\u7279\u653b/\u7279\u9632/\u901f\u5ea6\u3002",
        },
        errors: {
            invalidInput: "\u8f93\u5165\u65e0\u6548",
            valueMustBeBetween:
                "\u503c\u5fc5\u987b\u5728 {min} \u5230 {max} \u4e4b\u95f4",
            lineMissing: "\u7b2c {line} \u884c\u7f3a\u5c11 {field}",
            lineInvalid: "\u7b2c {line} \u884c\u7684 {field} \u65e0\u6548",
            noPossibleIv: "{stat} \u4e0d\u5b58\u5728\u53ef\u884c IV",
        },
        stats: {
            hp: "HP",
            attack: "\u653b\u51fb",
            defense: "\u9632\u5fa1",
            specialAttack: "\u7279\u653b",
            specialDefense: "\u7279\u9632",
            speed: "\u901f\u5ea6",
        },
    },
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [localeValue, setLocaleValue] = useLocalStorage<Locale>("locale", "zh");
    const locale = localeValue === "en" ? "en" : "zh";

    return (
        <I18nContext.Provider
            value={{
                locale,
                setLocale: setLocaleValue,
            }}
        >
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used within I18nProvider");
    }

    const translate = (key: string, replacements?: Record<string, string>) => {
        const value = key.split(".").reduce<string | TranslationValue>(
            (current, part) =>
                typeof current === "string" ? current : current[part],
            TRANSLATIONS[context.locale]
        );
        if (typeof value !== "string") {
            return key;
        }
        return Object.entries(replacements ?? {}).reduce(
            (result, [name, replacement]) =>
                result.split(`{${name}}`).join(replacement),
            value
        );
    };

    return {
        locale: context.locale,
        setLocale: context.setLocale,
        t: translate,
        resources: RESOURCES[context.locale],
    };
}

export function getLocation(
    resources: ResourceBundle,
    game: number,
    location: number
) {
    if (game & Game.RS) return resources.rsLocations[location];
    if (game & Game.Emerald) return resources.eLocations[location];
    return resources.frlgLocations[location];
}

export function getName(
    resources: ResourceBundle,
    species: number | string,
    form: number | string = 0
) {
    const speciesName =
        resources.species[
            typeof species === "number" ? species : parseInt(species, 10)
        ];
    const formName = resources.forms[`${species}-${form}`];

    return `${speciesName}${formName ? ` (${formName})` : ""}`;
}

export function getAllGameOptions(t: (key: string) => string) {
    return [
        { value: "r_painting", label: t("options.rubyPaintingSeed") },
        { value: "s_painting", label: t("options.sapphirePaintingSeed") },
        { value: "e_painting", label: t("options.emeraldPaintingSeed") },
        { value: "fr", label: t("options.fireRedEng") },
        { value: "fr_eu", label: t("options.fireRedEu") },
        { value: "fr_jpn_1_0", label: t("options.fireRedJpn10") },
        { value: "fr_jpn_1_1", label: t("options.fireRedJpn11") },
        { value: "fr_nx", label: t("options.switchFireRed") },
        { value: "fr_mgba", label: t("options.fireRedMgba") },
        { value: "lg", label: t("options.leafGreenEng") },
        { value: "lg_eu", label: t("options.leafGreenEu") },
        { value: "lg_jpn", label: t("options.leafGreenJpn") },
        { value: "lg_nx", label: t("options.switchLeafGreen") },
        { value: "lg_mgba", label: t("options.leafGreenMgba") },
    ];
}

export function getIdComboGameOptions(t: (key: string) => string) {
    return [{ value: "e_painting", label: t("options.emerald") }, ...getAllGameOptions(t).slice(3)];
}

export function getConsoleOptions(
    t: (key: string) => string,
    isSwitch: boolean
) {
    return isSwitch
        ? [
              { value: "NX", label: t("options.switch1") },
              { value: "NX2", label: t("options.switch2") },
          ]
        : [
              { value: "GBA", label: t("options.gba") },
              { value: "GBP", label: t("options.gbp") },
              { value: "NDS", label: t("options.nds") },
              { value: "3DS", label: t("options.firm3ds") },
          ];
}
