import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = readdirSync(new URL(".", import.meta.url))
    .filter((name) => /\.test\.(ts|mjs)$/.test(name))
    .sort();

for (const file of files) {
    const { error, status } = spawnSync(
        process.execPath,
        ["--experimental-strip-types", `tests/${file}`],
        { stdio: "inherit" },
    );
    if (error) throw error;
    if (status !== 0) process.exit(status ?? 1);
}

console.log(`Passed ${files.length} unit/WASM regression suites.`);
