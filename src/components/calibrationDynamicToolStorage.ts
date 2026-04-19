import { setLocalStorageValue } from "../hooks/useLocalStorage";

const DYNAMIC_TOOL_STORAGE_KEY = "calibration-dynamic-tool";

export function setDynamicToolTargetAdv(targetAdv: number | string) {
    const rawValue = localStorage.getItem(DYNAMIC_TOOL_STORAGE_KEY);
    let current: Record<string, unknown> = {};

    try {
        current = rawValue ? (JSON.parse(rawValue) as Record<string, unknown>) : {};
    } catch {
        current = {};
    }

    setLocalStorageValue(DYNAMIC_TOOL_STORAGE_KEY, {
        ...current,
        targetAdv: String(targetAdv),
    });
}
