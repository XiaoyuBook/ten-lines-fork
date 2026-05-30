import { JA_NATURES, ZH_NATURES_RAW } from "../i18n";

const SWITCH_JAPANESE_FRLG_GAMES = new Set(["fr_jpn_nx", "lg_jpn_nx"]);

const SOUND_LABELS: Record<string, string> = {
    mono: "单声道（モノラル）",
    stereo: "立体声（ステレオ）",
};

const BUTTON_MODE_LABELS: Record<string, string> = {
    a: "L=A（かたて）",
    h: "帮助（ヘルプ）",
    r: "LR（LR）",
};

const SEED_BUTTON_LABELS: Record<string, string> = {
    a: "A（A）",
    start: "Start（スタート）",
    l: "L（L）",
};

const EXTRA_BUTTON_LABELS: Record<string, string> = {
    none: "无（なし）",
    startup_select: "启动时 Select（セレクト）",
    startup_a: "启动时 A（A）",
    blackout_r: "黑屏后 R（R）",
    blackout_a: "黑屏后 A（A）",
    blackout_l: "黑屏后 L（L）",
    blackout_al: "黑屏后 A+L（A+L）",
};

const getLabel = (labels: Record<string, string>, value: string) =>
    labels[value] ?? value;

export const isSwitchJapaneseFRLGGame = (game: string) =>
    SWITCH_JAPANESE_FRLG_GAMES.has(game);

export const getSwitchJapaneseFRLGSoundLabel = (value: string) =>
    getLabel(SOUND_LABELS, value);

export const getSwitchJapaneseFRLGButtonModeLabel = (value: string) =>
    getLabel(BUTTON_MODE_LABELS, value);

export const getSwitchJapaneseFRLGSeedButtonLabel = (value: string) =>
    getLabel(SEED_BUTTON_LABELS, value);

export const getSwitchJapaneseFRLGExtraButtonLabel = (value: string) =>
    getLabel(EXTRA_BUTTON_LABELS, value);

export const getSwitchJapaneseFRLGNatureLabel = (nature: number) => {
    const chinese = ZH_NATURES_RAW[nature];
    const japanese = JA_NATURES[nature];

    return japanese && chinese ? `${chinese}（${japanese}）` : chinese ?? "";
};
