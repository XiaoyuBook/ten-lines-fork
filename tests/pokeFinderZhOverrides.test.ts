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
    let translate: ((key: string) => string) | undefined;

    function Probe() {
        const i18n = useI18n();
        resources = i18n.resources;
        translate = i18n.t;
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

    assert.ok(translate);
    assert.equal(translate("options.oldRod"), "破旧钓竿");
    assert.equal(translate("options.goodRod"), "好钓竿");
    assert.equal(translate("options.superRod"), "厉害钓竿");
    assert.notEqual(translate("options.superRod"), "超级钓竿");

    assert.equal(translate("options.rockSmash"), "碎岩");
    assert.equal(translate("options.surfing"), "冲浪");
    assert.equal(translate("options.femaleCuteCharm"), "迷人之躯（雌性）");
    assert.equal(translate("options.maleCuteCharm"), "迷人之躯（雄性）");
    assert.equal(translate("options.magnetPull"), "磁力");
    assert.equal(translate("options.static"), "静电");
    assert.equal(translate("options.matchingSynchronize"), "匹配同步");

    assert.equal(translate("options.star"), "星星特效");
    assert.equal(translate("options.square"), "方块特效");
    assert.equal(translate("options.starSquare"), "星星／方块特效");
    assert.equal(translate("labels.shininess"), "异色");
    assert.equal(translate("table.shiny"), "异色");

    assert.equal(translate("options.starters"), "最初的伙伴");
    assert.equal(translate("options.fossils"), "化石复原宝可梦");
    assert.equal(translate("options.gifts"), "礼物宝可梦");
    assert.equal(translate("options.gameCorner"), "游戏城");
    assert.equal(translate("options.legends"), "传说的宝可梦");
    assert.equal(translate("options.events"), "活动赠送");
    assert.equal(translate("options.roamers"), "游走宝可梦");

    assert.equal(translate("labels.trainerId"), "训练家ID No.");
    assert.equal(translate("labels.secretId"), "里ID No.");
    assert.equal(translate("labels.hiddenPower"), "觉醒力量");
    assert.equal(translate("labels.perfectIvCount"), "满个体值数量");
    assert.equal(translate("labels.ivCalculator"), "个体值计算器");
    assert.equal(translate("labels.parentIvs"), "亲代个体值");
    assert.equal(translate("table.ivs"), "个体值");
    assert.equal(translate("table.hidden"), "觉醒力量属性");

    assert.equal(translate("options.male"), "雄性");
    assert.equal(translate("options.female"), "雌性");
    assert.equal(translate("options.genderless"), "无性别");
} finally {
    await server.close();
}
