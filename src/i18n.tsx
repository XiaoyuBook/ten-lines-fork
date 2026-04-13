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
        natures: parseList(natures_zh_txt),
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
            settings: "Settings",
            calibration: "Calibration",
            initialSeed: "Initial Seed",
        },
        compare: {
            title: "Calibration Compare",
            target: "Target",
            history: "History",
            record: "Record",
            settings: "Compare Settings",
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
            position: "Panel Position",
            positionLeft: "Left",
            positionRight: "Right",
            compareMode: "Comparison Mode",
            modeTarget: "Always compare with target",
            modePrevious: "Compare with previous history entry",
            visibleColumns: "Visible Columns",
            addToTarget: "Add to Target",
            addToHistory: "Add to History",
            addedTarget: "Added as target",
            addedHistory: "Added to history",
            resultsTitle: "Calibration Results",
            calculator: "Calculator",
        },
        messages: {
            noKnownSeeds: "No known seeds for this game & settings",
            requiredForIvCalculation: "Required for IV calculation",
            ivCalculationDisabled:
                "IV calculation disabled. Searching all Natures.",
            filterByReachableAdvances: "Filter by reachable advances",
            idComboIntro:
                "Search for TID/SID combinations whose TSV makes the matching static target shiny.",
            noMatchingStaticTargets:
                "No matching static targets found for the selected filters.",
            noMatchingAdvances:
                "No matching targets fall within the selected advances range.",
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
            settings: "\u8bbe\u7f6e",
            calibration: "\u6821\u51c6",
            initialSeed: "\u521d\u59cb Seed",
        },
        compare: {
            title: "\u6821\u51c6\u5bf9\u7167",
            target: "\u76ee\u6807",
            history: "\u5386\u53f2",
            record: "\u8bb0\u5f55",
            settings: "\u5bf9\u7167\u8bbe\u7f6e",
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
            position: "\u8868\u683c\u4f4d\u7f6e",
            positionLeft: "\u5de6\u4fa7",
            positionRight: "\u53f3\u4fa7",
            compareMode: "\u5bf9\u6bd4\u65b9\u5f0f",
            modeTarget: "\u59cb\u7ec8\u4e0e\u76ee\u6807\u5bf9\u6bd4",
            modePrevious: "\u4e0e\u4e0a\u4e00\u6761\u5386\u53f2\u5bf9\u6bd4",
            visibleColumns: "\u663e\u793a\u5217",
            addToTarget: "\u52a0\u5230\u76ee\u6807",
            addToHistory: "\u52a0\u5230\u5386\u53f2",
            addedTarget: "\u5df2\u6dfb\u52a0\u4e3a\u76ee\u6807",
            addedHistory: "\u5df2\u6dfb\u52a0\u5230\u5386\u53f2",
            resultsTitle: "\u6821\u51c6\u7ed3\u679c",
            calculator: "\u8ba1\u7b97\u5668",
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
            idComboIntro:
                "\u641c\u7d22\u80fd\u8ba9\u5339\u914d\u9759\u6001\u76ee\u6807\u53d8\u95ea\u7684 TID/SID \u7ec4\u5408\u3002",
            noMatchingStaticTargets:
                "\u6240\u9009\u6761\u4ef6\u4e0b\u6ca1\u6709\u5339\u914d\u7684\u9759\u6001\u76ee\u6807\u3002",
            noMatchingAdvances:
                "\u6ca1\u6709\u76ee\u6807\u843d\u5728\u6240\u9009\u6d88\u8017\u5e27\u8303\u56f4\u5185\u3002",
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
