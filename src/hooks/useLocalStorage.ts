import { useCallback, useEffect, useState } from "react";

const LOCAL_STORAGE_SYNC_EVENT = "codex-local-storage-sync";

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

    const setStoredValue: typeof setValue = useCallback((nextValue) => {
        setValue((currentValue: T) => {
            const resolvedValue =
                typeof nextValue === "function"
                    ? (nextValue as (value: T) => T)(currentValue)
                    : nextValue;

            try {
                localStorage.setItem(key, JSON.stringify(resolvedValue));
                window.dispatchEvent(
                    new CustomEvent(LOCAL_STORAGE_SYNC_EVENT, {
                        detail: { key },
                    })
                );
            } catch (error) {
                console.error(error);
            }

            return resolvedValue;
        });
    }, [key]);

    useEffect(() => {
        const syncValue = () => {
            setValue(readStoredValue());
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
    }, [key, value]);

    return [value, setStoredValue] as const;
}
