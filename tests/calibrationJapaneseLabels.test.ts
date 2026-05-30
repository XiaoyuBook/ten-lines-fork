import assert from "node:assert/strict";

import { createServer } from "vite";

const server = await createServer({
    appType: "custom",
    server: { middlewareMode: true },
});

try {
    const {
        getSwitchJapaneseFRLGButtonModeLabel,
        getSwitchJapaneseFRLGExtraButtonLabel,
        getSwitchJapaneseFRLGNatureLabel,
        getSwitchJapaneseFRLGSeedButtonLabel,
        getSwitchJapaneseFRLGSoundLabel,
        isSwitchJapaneseFRLGGame,
    } = await server.ssrLoadModule("/src/components/calibrationJapaneseLabels.ts");
    const { ZH_NATURES_RAW } = await server.ssrLoadModule("/src/i18n.tsx");

    assert.equal(isSwitchJapaneseFRLGGame("fr_jpn_nx"), true);
    assert.equal(isSwitchJapaneseFRLGGame("lg_jpn_nx"), true);
    assert.equal(isSwitchJapaneseFRLGGame("fr_nx"), false);

    assert.equal(getSwitchJapaneseFRLGSoundLabel("mono"), "单声道（モノラル）");
    assert.equal(getSwitchJapaneseFRLGSoundLabel("stereo"), "立体声（ステレオ）");

    assert.equal(getSwitchJapaneseFRLGButtonModeLabel("a"), "L=A（かたて）");
    assert.equal(getSwitchJapaneseFRLGButtonModeLabel("h"), "帮助（ヘルプ）");
    assert.equal(getSwitchJapaneseFRLGButtonModeLabel("r"), "LR（LR）");

    assert.equal(getSwitchJapaneseFRLGSeedButtonLabel("a"), "A（A）");
    assert.equal(getSwitchJapaneseFRLGSeedButtonLabel("start"), "Start（スタート）");
    assert.equal(getSwitchJapaneseFRLGSeedButtonLabel("l"), "L（L）");

    assert.equal(getSwitchJapaneseFRLGExtraButtonLabel("none"), "无（なし）");
    assert.equal(
        getSwitchJapaneseFRLGExtraButtonLabel("startup_select"),
        "启动时 Select（セレクト）"
    );
    assert.equal(
        getSwitchJapaneseFRLGExtraButtonLabel("blackout_al"),
        "黑屏后 A+L（A+L）"
    );

    assert.equal(
        getSwitchJapaneseFRLGNatureLabel(0),
        `${ZH_NATURES_RAW[0]}（がんばりや）`
    );
    assert.equal(
        getSwitchJapaneseFRLGNatureLabel(1),
        `${ZH_NATURES_RAW[1]}（さみしがり）`
    );
    assert.ok(!getSwitchJapaneseFRLGNatureLabel(0).includes("Hardy"));
} finally {
    await server.close();
}
