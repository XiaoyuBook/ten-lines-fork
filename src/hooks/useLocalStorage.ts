import { useCallback, useEffect, useRef, useState } from "react";

export const LOCAL_STORAGE_SYNC_EVENT = "codex-local-storage-sync";

export function setLocalStorageValue<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(
        new CustomEvent(LOCAL_STORAGE_SYNC_EVENT, {
            detail: { key },
        })
    );
}

export default function useLocalStorage<T>(key: string, defaultValue: T) {
    const readStoredValue = useCallback(() => {
        try {
            const storedValue = localStorage.getItem(key);
            return storedValue ? JSON.parse(storedValue) : defaultValue;
        } catch (error) {
            console.error(error);
            return defaultValue;
        }
    }, [defaultValue, key]);

    const [value, setValue] = useState(() => {
        return readStoredValue();
    });
    const valueRef = useRef(value);

    const setStoredValue: typeof setValue = useCallback((nextValue) => {
        const resolvedValue =
            typeof nextValue === "function"
                ? (nextValue as (value: T) => T)(valueRef.current)
                : nextValue;

        valueRef.current = resolvedValue;
        setValue(resolvedValue);

        try {
            setLocalStorageValue(key, resolvedValue);
        } catch (error) {
            console.error(error);
        }
    }, [key]);

    useEffect(() => {
        const syncValue = () => {
            const storedValue = readStoredValue();
            valueRef.current = storedValue;
            setValue(storedValue);
        };

        const handleStorage = (event: StorageEvent) => {
            if (event.key === key) {
                syncValue();
            }
        };

        const handleLocalSync = (event: Event) => {
            const customEvent = event as CustomEvent<{ key?: string }>;
            if (customEvent.detail?.key === key) {
                syncValue();
            }
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, handleLocalSync);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener(
                LOCAL_STORAGE_SYNC_EVENT,
                handleLocalSync
            );
        };
    }, [key, readStoredValue]);

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(error);
        }
        valueRef.current = value;
    }, [key, value]);

    return [value, setStoredValue] as const;
}
