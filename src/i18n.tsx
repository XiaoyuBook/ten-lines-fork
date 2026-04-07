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
import forms_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/forms_zh.txt?raw";
import natures_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/natures_zh.txt?raw";
import powers_zh_txt from "./wasm/lib/PokeFinder/Source/Core/Resources/i18n/zh/powers_zh.txt?raw";
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

const I18nContext = createContext<I18nContextValue | null>(null);

const parseMap = (text: string) => {
    return Object.fromEntries(parseList(text).map((line) => line.split(",")));
};

const parseList = (text: string) => {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
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
        genders: ["Male", "Female", "-"],
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
            [STATIC_1]: "静态 1",
            [STATIC_2]: "静态 2",
            [STATIC_4]: "静态 4",
            [WILD_1]: "野生 1",
            [WILD_2]: "野生 2",
            [WILD_4]: "野生 4",
            [COMBINED_WILD_METHOD]: "全部野生方法",
        },
        genders: ["公", "母", "-"],
        shininess: ["否", "星闪", "方闪"],
        natures: parseList(natures_zh_txt),
        abilities: parseList(abilities_zh_txt),
        species: ["蛋", ...parseList(species_zh_txt)],
        forms: Object.fromEntries(
            parseList(forms_zh_txt).map((line) => {
                const [species, form, name] = line.split(",");
                return [`${species}-${form}`, name];
            })
        ),
        types: parseList(powers_zh_txt),
        frlgLocations: parseMap(frlg_en_txt),
        rsLocations: parseMap(rs_en_txt),
        eLocations: parseMap(e_en_txt),
        games: {
            [Game.None]: "无",
            [Game.Ruby]: "红宝石",
            [Game.Sapphire]: "蓝宝石",
            [Game.RS]: "红宝石 / 蓝宝石",
            [Game.Emerald]: "绿宝石",
            [Game.Ruby | Game.Emerald]: "红宝石 / 绿宝石",
            [Game.Sapphire | Game.Emerald]: "蓝宝石 / 绿宝石",
            [Game.RSE]: "红宝石 / 蓝宝石 / 绿宝石",
            [Game.FireRed]: "火红",
            [Game.LeafGreen]: "叶绿",
            [Game.FRLG]: "火红 / 叶绿",
            [Game.FRLG | Game.Emerald]: "火红 / 叶绿 / 绿宝石",
            [Game.Gen3]: "第三世代",
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
            mono: "Mono",
            stereo: "Stereo",
            yesNoSeparator: "/",
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
        },
        table: {
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
            searcher: "搜索器",
            idCombo: "ID 组合",
            initialSeed: "初始 Seed",
            calibration: "校准",
            bingo: "宾果",
        },
        language: {
            chinese: "中文",
            english: "English",
        },
        common: {
            submit: "提交",
            searching: "搜索中...",
            any: "任意",
            none: "无",
            filter: "筛选",
            showSeeds: "显示 Seed",
            reset: "重置",
            mono: "单声道",
            stereo: "立体声",
            yesNoSeparator: "/",
        },
        footer: {
            credit:
                '原始 "10 lines" 由 Shao 制作，FRLG seed 数据由 blisy、po、HunarPG、10Ben、Real96、Papa Jefé 与 銉堛儙 收集',
            poweredBy: "技术支持",
            seedDataAsOf: "FRLG seed 数据更新时间",
        },
        labels: {
            minimum: "最小",
            maximum: "最大",
            game: "游戏",
            sound: "声音",
            buttonMode: "按键模式",
            seedButton: "Seed 按键",
            extraButton: "额外按键",
            console: "设备",
            targetSeed: "目标 Seed",
            seedLeeway: "Seed 容差 +/-",
            advances: "消耗帧",
            finalAPressFrame: "最终 A 按下帧",
            offset: "偏移",
            teachyTvAdvances: "教学电视消耗帧",
            requiredOverworldFrames: "所需大地图帧数",
            teachyTvMode: "教学电视模式",
            trainerId: "Trainer ID",
            secretId: "Secret ID",
            method: "方法",
            shininess: "闪光",
            nature: "性格",
            gender: "性别",
            hiddenPower: "觉醒力量",
            category: "分类",
            pokemon: "宝可梦",
            location: "地点",
            lead: "首发特性",
            resultCount: "结果数量",
            allowedAdvances: "允许的消耗帧范围",
            maxResults: "最大结果数",
            tidFilter: "TID 筛选",
            sidFilter: "SID 筛选",
            ivCalculator: "IV 计算器",
            minimumAdvancesOutsideTeachyTv: "教学电视外的最少消耗帧",
        },
        options: {
            rubyPaintingSeed: "红宝石绘画 Seed",
            sapphirePaintingSeed: "蓝宝石绘画 Seed",
            emeraldPaintingSeed: "绿宝石绘画 Seed",
            emerald: "绿宝石",
            fireRedEng: "火红（英文）",
            fireRedEu: "火红（西/法/意/德）",
            fireRedJpn10: "火红（日版）1.0",
            fireRedJpn11: "火红（日版）1.1",
            switchFireRed: "Switch 火红（英/西/法/意/德）",
            fireRedMgba: "火红（英文）（mGBA 10.5）",
            leafGreenEng: "叶绿（英文）",
            leafGreenEu: "叶绿（西/法/意/德）",
            leafGreenJpn: "叶绿（日版）",
            switchLeafGreen: "Switch 叶绿（英/西/法/意/德）",
            leafGreenMgba: "叶绿（英文）（mGBA 10.5）",
            help: "帮助",
            startupSelect: "启动时 Select",
            startupA: "启动时 A",
            blackoutR: "黑屏后 R",
            blackoutA: "黑屏后 A",
            blackoutL: "黑屏后 L",
            blackoutAL: "黑屏后 A+L",
            switch1: "Nintendo Switch 1",
            switch2: "Nintendo Switch 2",
            gba: "Game Boy Advance",
            gbp: "Game Boy Player",
            nds: "Nintendo DS",
            firm3ds: "Nintendo 3DS（open_agb_firm）",
            star: "星闪",
            square: "方闪",
            starSquare: "星闪/方闪",
            starters: "御三家",
            fossils: "化石",
            gifts: "赠送",
            gameCorner: "游戏角",
            stationary: "定点",
            legends: "传说",
            events: "活动",
            roamers: "游走",
            blisyEvents: "Blisy 电子卡活动",
            grass: "草丛",
            rockSmash: "碎岩",
            surfing: "冲浪",
            oldRod: "破旧钓竿",
            goodRod: "好钓竿",
            superRod: "超级钓竿",
            femaleCuteCharm: "迷人之躯（母）",
            maleCuteCharm: "迷人之躯（公）",
            magnetPull: "磁力",
            static: "静电",
            hustlePressureVitalSpirit: "活力/压迫感/干劲",
            matchingSynchronize: "匹配同步",
            shinyLocked: "锁闪",
            lockBreak: "破锁",
        },
        table: {
            seed: "Seed",
            advances: "消耗帧",
            method: "方法",
            finalAPressFrame: "最终 A 按下帧",
            teachyTvAdvances: "教学电视消耗帧",
            continueScreenFrames: "继续界面帧数",
            slot: "槽位",
            level: "等级",
            pid: "PID",
            shiny: "闪光",
            nature: "性格",
            ability: "特性",
            ivs: "IV",
            hidden: "觉醒属性",
            power: "威力",
            gender: "性别",
            minReachableAdvances: "最小可达消耗帧",
            openInInitialSeed: "在初始 Seed 中打开",
            openInCalibration: "在校准中打开",
            matchingTargets: "匹配目标数",
            exampleSeed: "示例 Seed",
            examplePid: "示例 PID",
            seedDec: "Seed（十进制）",
            seedHex: "Seed（十六进制）",
            estimatedTotalFrames: "估计总帧数",
            estimatedTotalTime: "估计总时间",
            seedTime: "Seed 时间",
            settings: "设置",
            calibration: "校准",
            initialSeed: "初始 Seed",
        },
        messages: {
            noKnownSeeds: "当前游戏和设置下没有已知 Seed",
            requiredForIvCalculation: "进行 IV 计算时必填",
            ivCalculationDisabled: "IV 计算已关闭，正在搜索全部性格。",
            filterByReachableAdvances: "按可达消耗帧筛选",
            idComboIntro: "搜索能让匹配静态目标变闪的 TID/SID 组合。",
            noMatchingStaticTargets: "所选条件下没有匹配的静态目标。",
            noMatchingAdvances: "没有目标落在所选消耗帧范围内。",
            exactIdSummary:
                "找到 {candidateCount} 个匹配目标 Seed、{tsvCount} 个唯一 TSV，以及 {resultCount} 个符合所选 TID/SID 的匹配目标。",
            comboSummary:
                "找到 {candidateCount} 个匹配目标 Seed、{tsvCount} 个唯一 TSV，以及 {resultCount} 个 TID/SID 组合。",
            resultsCapHit: "结果已达到最大数量上限。",
            optionalExactTidFilter: "可选的精确 TID 筛选",
            optionalExactSidFilter: "可选的精确 SID 筛选",
            leaveBlankOrEnterId: "留空或输入 0-65535",
            findTidSidCombos: "查找 TID/SID 组合",
            ms: "毫秒",
            settingsSeedButton: "Seed 按键",
            settingsExtraButton: "额外按键",
            matchingSynchronizeSuffix: "同步",
        },
        errors: {
            invalidInput: "输入无效",
            valueMustBeBetween: "值必须在 {min} 到 {max} 之间",
            lineMissing: "第 {line} 行缺少 {field}",
            lineInvalid: "第 {line} 行的 {field} 无效",
            noPossibleIv: "{stat} 不存在可行 IV",
        },
        stats: {
            hp: "HP",
            attack: "攻击",
            defense: "防御",
            specialAttack: "特攻",
            specialDefense: "特防",
            speed: "速度",
        },
    },
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [localeValue, setLocaleValue] = useLocalStorage<Locale>(
        "locale",
        "zh"
    );
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
            typeof species === "number" ? species : parseInt(species)
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
    return [
        { value: "e_painting", label: t("options.emerald") },
        ...getAllGameOptions(t).slice(3),
    ];
}

export function getConsoleOptions(t: (key: string) => string, isSwitch: boolean) {
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
