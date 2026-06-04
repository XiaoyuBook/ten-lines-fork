export const BINGO_TV_FLUCTUATION_FRAMES = 314;

export type BingoAdvanceRange = [number, number];
export type BingoAdvanceRangePage = {
    label: string;
    range: BingoAdvanceRange;
};
export type BingoRowEntry = {
    initialSeed: number;
    advances: number;
};

export function buildBingoAdvanceRanges(
    advancesRange: number[],
    tvFluctuationMode: boolean
): BingoAdvanceRange[] {
    return buildBingoAdvanceRangePages(advancesRange, tvFluctuationMode).map(
        (page) => page.range
    );
}

export function buildBingoAdvanceRangePages(
    advancesRange: number[],
    tvFluctuationMode: boolean
): BingoAdvanceRangePage[] {
    const baseRange: BingoAdvanceRange = [advancesRange[0] ?? 0, advancesRange[1] ?? 0];
    if (!tvFluctuationMode) {
        return [{ label: "0", range: baseRange }];
    }

    const pages: BingoAdvanceRangePage[] = [];
    const beforeRange: BingoAdvanceRange = [
        baseRange[0] - BINGO_TV_FLUCTUATION_FRAMES,
        baseRange[1] - BINGO_TV_FLUCTUATION_FRAMES,
    ];
    if (beforeRange[1] >= 0) {
        pages.push({
            label: "-314",
            range: [Math.max(0, beforeRange[0]), beforeRange[1]],
        });
    }
    pages.push({ label: "0", range: baseRange });
    pages.push({
        label: "+314",
        range: [
            baseRange[0] + BINGO_TV_FLUCTUATION_FRAMES,
            baseRange[1] + BINGO_TV_FLUCTUATION_FRAMES,
        ],
    });

    return pages;
}

export function mergeBingoRows<T extends BingoRowEntry>(...rowGroups: T[][]): T[][] {
    const rowsBySeed = new Map<number, T[]>();

    for (const rows of rowGroups) {
        for (const row of rows) {
            const seedRows = rowsBySeed.get(row.initialSeed) ?? [];
            seedRows.push(row);
            rowsBySeed.set(row.initialSeed, seedRows);
        }
    }

    return Array.from(rowsBySeed.values()).map((rows) =>
        rows.sort((left, right) => left.advances - right.advances)
    );
}
