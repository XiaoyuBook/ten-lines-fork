export type GameOption = { value: string; label: string };
export type EggMethodOption = { value: number; labelKey: string };
export type EggCompatibilityOption = { value: number; labelKey: string };
export type EggGenderOption = { value: number; labelKey: string };

export const DEFAULT_FRLG_EGG_METHOD = 12;

export const FRLG_EGG_METHODS: EggMethodOption[] = [
    { value: 11, labelKey: "options.normal" },
    { value: 12, labelKey: "options.split" },
    { value: 13, labelKey: "options.alternate" },
    { value: 14, labelKey: "options.mixed" },
];

export const FRLG_EGG_COMPATIBILITY_OPTIONS: EggCompatibilityOption[] = [
    { value: 20, labelKey: "options.eggCompatibilityLow" },
    { value: 50, labelKey: "options.eggCompatibilityMedium" },
    { value: 70, labelKey: "options.eggCompatibilityHigh" },
];

export const EGG_GENDER_OPTIONS: EggGenderOption[] = [
    { value: 0, labelKey: "options.male" },
    { value: 1, labelKey: "options.female" },
    { value: 2, labelKey: "options.genderless" },
    { value: 3, labelKey: "options.ditto" },
];

export function isFrlgEggGame(game: string): boolean {
    return game.startsWith("fr") || game.startsWith("lg");
}

export function filterFrlgEggGameOptions(options: GameOption[]): GameOption[] {
    return options.filter((option) => isFrlgEggGame(option.value));
}

export function buildSeedSettingKey(sound: string, buttonMode: string, seedButton: string): string {
    return `${sound}_${buttonMode}_${seedButton}`;
}

export function isCompatibleEggParentPair(parentAGender: number, parentBGender: number): boolean {
    if (parentAGender === 0 && parentBGender === 1) {
        return true;
    }

    if (parentAGender === 1 && parentBGender === 0) {
        return true;
    }

    return parentAGender !== parentBGender && (parentAGender === 3 || parentBGender === 3);
}

export function formatInheritanceSlot(value: number): string {
    if (value === 1) {
        return "A";
    }

    if (value === 2) {
        return "B";
    }

    return "";
}
