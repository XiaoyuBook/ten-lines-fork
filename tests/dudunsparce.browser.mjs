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
        baseURL: server.resolvedUrls.local[0], serviceWorkers: "block",
        viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() => localStorage.setItem("locale", JSON.stringify("en")));
    await context.route("**/generated/*.bin", (route) => route.fulfill({
        path: fileURLToPath(new URL(`../public/generated/${new URL(route.request().url()).pathname.split("/").pop()}`, import.meta.url)),
        contentType: "application/octet-stream",
    }));
    page = await context.newPage();
    page.setDefaultTimeout(60_000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const combo = (name) => page.getByRole("combobox", { name: new RegExp(`^${name}`) });
    async function enabled(locator) {
        await locator.waitFor({ state: "visible" });
        const deadline = Date.now() + 60_000;
        while (Date.now() < deadline) {
            if (await locator.isEnabled() && await locator.getAttribute("aria-disabled") !== "true") return;
            await page.waitForTimeout(50);
        }
        throw new Error(`Control did not become enabled: ${locator}`);
    }
    async function select(name, option) {
        await enabled(combo(name));
        await combo(name).click();
        await page.getByRole("option", { name: option, exact: true }).click();
    }
    async function search() {
        const submit = page.getByRole("button", { name: "Submit", exact: true });
        await enabled(submit);
        await submit.click();
        await page.locator("tbody tr").first().waitFor();
        await enabled(submit);
        const pids = [];
        const pidColumn = (await page.locator("thead th").allTextContents()).indexOf("PID");
        assert(pidColumn >= 0);
        for (const row of await page.locator("tbody tr").all()) {
            pids.push(Number.parseInt(await row.locator("td").nth(pidColumn).innerText(), 16));
        }
        return pids;
    }

    await page.goto("?page=2&game=fr_nx&gameConsole=NX&reachableAdvancesFilter=false");
    await select("Method", "Wild 1");
    await enabled(combo("Location"));
    await combo("Location").fill("Three Island Port");
    await page.getByRole("option", { name: "Three Island Port", exact: true }).click();
    await select("Pokemon", "Dunsparce");
    const checkbox = page.getByRole("checkbox", { name: "Three-Segment Dudunsparce", exact: true });
    await checkbox.waitFor();
    assert.equal(await checkbox.isChecked(), false);
    const fixtureIvs = [21, 29, 17, 9, 11, 10];
    for (const [index, name] of ["hpRange", "atkRange", "defRange", "spaRange", "spdRange", "speRange"].entries()) {
        const inputs = page.locator(`input[name="${name}"]`);
        await inputs.nth(0).fill(String(fixtureIvs[index]));
        await inputs.nth(1).fill(String(fixtureIvs[index]));
    }
    const baseline = await search();
    assert(baseline.some((pid) => pid % 100 !== 0));
    await checkbox.check();
    const filtered = await search();
    assert(filtered.length > 0);
    assert.deepEqual(filtered, baseline.filter((pid) => pid % 100 === 0));
    assert(filtered.includes(498681500), "The known eligible Dunsparce must survive the real worker search");

    await combo("Nature").fill("Adamant");
    await page.getByRole("option", { name: "Adamant", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByText(/current Nature filter cannot match/).waitFor();
    await select("Pokemon", "Any");
    await checkbox.waitFor({ state: "detached" });
    await select("Pokemon", "Dunsparce");
    assert.equal(await checkbox.isChecked(), false, "Switching away must reset the species-specific option");
    await page.getByRole("button", { name: "中文", exact: true }).click();
    await page.getByRole("checkbox", { name: "三节土龙节节", exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(`Passed Three-Segment Dudunsparce browser regression (${filtered.length}/${baseline.length} real targets), Nature warning, species reset and Chinese label.`);
} catch (error) {
    if (page) {
        console.error((await page.locator("body").innerText()).slice(0, 3000));
        await mkdir("test-results", { recursive: true });
        await page.screenshot({ path: "test-results/dudunsparce-failure.png", fullPage: true });
    }
    throw error;
} finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
