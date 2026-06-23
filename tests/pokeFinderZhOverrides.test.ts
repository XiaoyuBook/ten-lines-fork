import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({
    appType: "custom",
    server: { middlewareMode: true },
});

try {
    const { I18nProvider, useI18n } = await server.ssrLoadModule(
        "/src/i18n.tsx"
    );

    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: {
            getItem: () => null,
            setItem: () => undefined,
        },
    });

    let resources:
        | ReturnType<typeof useI18n>["resources"]
        | undefined;

    function Probe() {
        resources = useI18n().resources;
        return null;
    }

    renderToString(createElement(I18nProvider, null, createElement(Probe)));

    assert.ok(resources);
    assert.equal(resources.species[233], "多边兽２型");
    assert.equal(resources.species[474], "多边兽乙型");
    assert.equal(resources.species[563], "迭失棺");
    assert.equal(resources.species[675], "霸道熊猫");
    assert.equal(resources.species[778], "谜拟丘");
    assert.equal(resources.species[827], "狡小狐");
    assert.equal(resources.species[828], "猾大狐");
    assert.equal(resources.species[848], "电音婴");
    assert.equal(resources.species[867], "迭失板");

    assert.equal(resources.abilities[105], "诱爆");
    assert.equal(resources.abilities[129], "咒术之躯");

    assert.equal(resources.frlgLocations[74], "第３岛码头");
    assert.equal(resources.frlgLocations[77], "第５岛空地");
    assert.equal(resources.frlgLocations[120], "第１岛");
    assert.equal(resources.frlgLocations[121], "第４岛");
    assert.equal(resources.frlgLocations[122], "第５岛");
} finally {
    await server.close();
}
