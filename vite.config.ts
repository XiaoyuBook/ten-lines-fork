import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

function formatBuildTimestamp(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
    ].join("-") + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// https://vite.dev/config/
export default defineConfig(() => {
    const base = process.env.TEN_LINES_BASE || "/";
    const buildTimestamp = formatBuildTimestamp(new Date());
    return {
        assetsInclude: ["**/*.bin"],
        define: {
            __APP_BUILD_TIME__: JSON.stringify(buildTimestamp),
        },
        plugins: [
            react(),
            VitePWA({
                registerType: "autoUpdate",
                workbox: {
                    maximumFileSizeToCacheInBytes: 8000000,
                },
                devOptions: {
                    enabled: true,
                },
                includeAssets: ["**/*.bin"],
                manifest: {
                    name: "Ten Lines",
                    short_name: "Ten Lines",
                    description:
                        "Suite of tools for RNG Manipulation in Generation 3",
                    theme_color: "#79D4F5",
                },
            }),
        ],
        build: {
            minify: true,
        },
        base,
    };
});
