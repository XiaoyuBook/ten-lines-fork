import { setLocalStorageValue } from "../hooks/useLocalStorage";

const DYNAMIC_TOOL_STORAGE_KEY = "calibration-dynamic-tool";

function updateDynamicToolStorage(updates: Record<string, unknown>) {
    const rawValue = localStorage.getItem(DYNAMIC_TOOL_STORAGE_KEY);
    let current: Record<string, unknown> = {};

    try {
        current = rawValue ? (JSON.parse(rawValue) as Record<string, unknown>) : {};
    } catch {
        current = {};
    }

    setLocalStorageValue(DYNAMIC_TOOL_STORAGE_KEY, {
        ...current,
        ...updates,
    });
}

export function setDynamicToolTargetAdv(targetAdv: number | string) {
    updateDynamicToolStorage({
        targetAdv: String(targetAdv),
    });
}

export function setDynamicToolActualHit(actualHit: number | string) {
    updateDynamicToolStorage({
        actualHit: String(actualHit),
    });
}
