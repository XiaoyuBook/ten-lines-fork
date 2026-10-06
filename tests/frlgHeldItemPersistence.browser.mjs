// Run after building the app and WASM. Uses the real worker, not mocked results.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";

const server = await preview({
    build: { outDir: process.env.TEST_BUILD_DIR || "dist" },
    preview: { host: "127.0.0.1", port: 0, strictPort: true },
});
let browser;
let page;

try {
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
    const context = await browser.newContext({
        baseURL: server.resolvedUrls.local[0],
        serviceWorkers: "block",
        viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() => {
        localStorage.setItem("locale", JSON.stringify("en"));
    });
    // Use the repository's real seed binaries, avoiding OS/browser download
    // middleware that can replace .bin responses with empty 204 responses.
    // Search results and the WASM worker are not mocked.
    await context.route("**/generated/*.bin", async (route) => {
        const filename = new URL(route.request().url()).pathname.split("/").pop();
        await route.fulfill({
            path: fileURLToPath(new URL(`../public/generated/${filename}`, import.meta.url)),
            contentType: "application/octet-stream",
        });
    });
    page = await context.newPage();
    page.setDefaultTimeout(60_000);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => console.error(request.url(), request.failure()));
    const combo = (label) => page.getByRole("combobox", { name: new RegExp(`^${label}`) });

    async function waitForEnabled(locator) {
        await locator.waitFor({ state: "visible" });
        const element = await locator.elementHandle();
        try {
            await page.waitForFunction(
                (node) => node.isConnected && !node.disabled &&
                    node.getAttribute("aria-disabled") !== "true",
                element,
            );
        } finally {
            await element.dispose();
        }
    }

    async function selectOption(label, option) {
        const input = combo(label);
        await waitForEnabled(input);
        await input.click();
        await page.getByRole("option", { name: option, exact: true }).click();
        await page.waitForFunction(
            ({ id, text }) => document.getElementById(id)?.textContent.trim() === text,
            { id: await input.getAttribute("id"), text: option },
        );
    }

    async function returnToHeldItems(expectedRows) {
        await page.getByRole("tab", { name: "Held Items", exact: true }).click();
        await page.getByRole("heading", { name: "FRLG Wild Held Items", exact: true }).waitFor();
        await waitForEnabled(combo("Pokemon"));
        assert.equal(await combo("Pokemon").innerText(), "Meowth");
        assert.equal(await combo("Location").innerText(), "Route 5");
        assert.equal(await page.locator('input[name="heldStandardOffset"]').inputValue(), "167");
        assert.deepEqual(await page.locator("tbody tr").allTextContents(), expectedRows);
    }

    await page.goto("?page=7&game=fr_nx&gameConsole=NX&heldSeedSound=mono&heldTargetInitialSeed=70FE");
    console.log(`Browser regression running at ${page.url()}`);
    await selectOption("Pokemon", "Meowth");
    await selectOption("Location", "Route 5");
    console.log("Selected Route 5 / Meowth.");
    // A custom offset must survive selector remounts, not revert to the preset.
    await page.locator('input[name="heldStandardOffset"]').fill("167");
    const submit = page.getByRole("button", { name: "Submit", exact: true });
    await waitForEnabled(submit);
    await submit.click();
    await page.locator("tbody tr").first().waitFor({ state: "visible" });
    await waitForEnabled(submit);
    const resultRows = await page.locator("tbody tr").allTextContents();
    assert(resultRows.length > 0, "Real held-item search must produce results");
    console.log(`Searched ${resultRows.length} held-item targets using the real WASM worker.`);

    for (const tab of ["Egg Searcher", "Searcher", "Calibration", "Egg Searcher"]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        await returnToHeldItems(resultRows);
    }

    // The result's transfer button must retain the originating search too.
    await page.locator("tbody tr").first().getByRole("button", { name: "Calibration", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("page"), "1");
    await returnToHeldItems(resultRows);
    await page.locator("tbody tr").first().getByRole("button", { name: "Initial Seed", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("page"), "0");
    await returnToHeldItems(resultRows);

    // Changing localization reloads selector resources without changing inputs.
    await page.getByRole("button", { name: "中文", exact: true }).click();
    await waitForEnabled(combo("宝可梦"));
    assert.equal(await page.locator('input[name="heldStandardOffset"]').inputValue(), "167");
    assert.equal(await page.locator("tbody tr").count(), resultRows.length);
    await page.getByRole("button", { name: "English", exact: true }).click();
    await returnToHeldItems(resultRows);

    // Real input changes must still invalidate stale results.
    await page.locator('input[name="heldStandardOffset"]').fill("168");
    await page.locator("tbody tr").first().waitFor({ state: "detached" });
    await selectOption("Category", "Surfing");
    await waitForEnabled(combo("Pokemon"));
    assert.equal(await page.locator("tbody tr").count(), 0);
    assert.notEqual(await combo("Pokemon").innerText(), "Meowth");
    assert.deepEqual(pageErrors, [], "Navigation must not cause browser errors");

    // A failed load for another game must not corrupt the retained FireRed list.
    await context.route("**/generated/lg_eng_nx.bin", (route) => route.fulfill({ status: 503, body: "Test load failure" }));
    await selectOption("Game", "Switch LeafGreen (ENG/SPA/FRE/ITA/GER)");
    await page.getByText("Failed to fetch seeds file", { exact: false }).waitFor();
    await selectOption("Game", "Switch FireRed (ENG/SPA/FRE/ITA/GER)");
    await selectOption("Category", "Grass");
    await waitForEnabled(combo("Pokemon"));
    await waitForEnabled(submit);
    assert.equal(await page.locator("tbody tr").count(), 0);

    assert.deepEqual(pageErrors.filter((message) => message !== "Failed to fetch seeds file"), [], "Only the injected load failure is expected");
    console.log(`Passed held-item tab/transfer/language persistence and input invalidation (${resultRows.length} real results).`);
} catch (error) {
    if (page) {
        console.error(`Failure at ${page.url()}`);
        console.error((await page.locator("body").innerText()).slice(0, 4500));
        await mkdir("test-results", { recursive: true });
        await page.screenshot({ path: "test-results/held-item-persistence-failure.png", fullPage: true });
    }
    throw error;
} finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
