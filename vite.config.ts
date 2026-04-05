import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(() => {
    const base = process.env.TEN_LINES_BASE || "/";
    return {
        assetsInclude: ["**/*.bin"],
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
