import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    TextField,
    Typography,
} from "@mui/material";

import { useI18n } from "../i18n";

type TesseractModule = NonNullable<Window["Tesseract"]>;
type TesseractWorker = Awaited<ReturnType<TesseractModule["createWorker"]>>;
type TesseractLoggerMessage = {
    progress: number;
    status: string;
};

type StatKey =
    | "hp"
    | "attack"
    | "defense"
    | "specialAttack"
    | "specialDefense"
    | "speed";

type StatValueMap = Record<StatKey, string>;

type RegionBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type PixelRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

type CanvasImage = {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    data: Uint8ClampedArray;
};

type PreparedImage = {
    normalized: CanvasImage;
    crop: PixelRect;
    scale: number;
    originalWidth: number;
    originalHeight: number;
};

type DetectedLayout = {
    panelRect: PixelRect;
    statRects: Record<StatKey, PixelRect>;
    score: number;
};

const STAT_KEYS: StatKey[] = [
    "hp",
    "attack",
    "defense",
    "specialAttack",
    "specialDefense",
    "speed",
];

const TARGET_IMAGE_WIDTH = 800;
const FIXED_STAT_LAYOUT: Record<StatKey, RegionBox> = {
    hp: { x: 0.77, y: 0.12, width: 0.205, height: 0.085 },
    attack: { x: 0.84, y: 0.245, width: 0.14, height: 0.078 },
    defense: { x: 0.84, y: 0.34, width: 0.14, height: 0.078 },
    specialAttack: { x: 0.84, y: 0.435, width: 0.14, height: 0.078 },
    specialDefense: { x: 0.84, y: 0.53, width: 0.14, height: 0.078 },
    speed: { x: 0.84, y: 0.625, width: 0.14, height: 0.078 },
};
const EMPTY_STAT_VALUES: StatValueMap = {
    hp: "",
    attack: "",
    defense: "",
    specialAttack: "",
    specialDefense: "",
    speed: "",
};

const TESSERACT_SCRIPT_ID = "tesseract-js-runtime";
const TESSERACT_SCRIPT_SRC =
    "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js";

const getEmptyStats = (): StatValueMap => ({ ...EMPTY_STAT_VALUES });
const rectWidth = (rect: PixelRect) => rect.right - rect.left;
const rectHeight = (rect: PixelRect) => rect.bottom - rect.top;
const rectCenterX = (rect: PixelRect) => (rect.left + rect.right) / 2;
const rectCenterY = (rect: PixelRect) => (rect.top + rect.bottom) / 2;

const loadImage = (file: Blob) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image"));
        };
        image.src = objectUrl;
    });

const snapshotCanvas = (canvas: HTMLCanvasElement): CanvasImage => {
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Canvas is unavailable");
    }

    return {
        canvas,
        width: canvas.width,
        height: canvas.height,
        data: context.getImageData(0, 0, canvas.width, canvas.height).data,
    };
};

const createCanvasFromImage = (image: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas is unavailable");
    }

    context.drawImage(image, 0, 0);
    return snapshotCanvas(canvas);
};

const getPixel = (
    image: CanvasImage,
    x: number,
    y: number
): [number, number, number] => {
    const index = (y * image.width + x) * 4;
    return [image.data[index], image.data[index + 1], image.data[index + 2]];
};

const rgbToHsv = (red: number, green: number, blue: number) => {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let hue = 0;
    if (delta !== 0) {
        if (max === r) {
            hue = 60 * (((g - b) / delta) % 6);
        } else if (max === g) {
            hue = 60 * ((b - r) / delta + 2);
        } else {
            hue = 60 * ((r - g) / delta + 4);
        }
    }

    return {
        hue: hue < 0 ? hue + 360 : hue,
        saturation: max === 0 ? 0 : delta / max,
        value: max,
    };
};

const clampRect = (
    rect: PixelRect,
    maxWidth: number,
    maxHeight: number
): PixelRect => ({
    left: Math.max(0, Math.min(rect.left, maxWidth - 1)),
    top: Math.max(0, Math.min(rect.top, maxHeight - 1)),
    right: Math.max(1, Math.min(rect.right, maxWidth)),
    bottom: Math.max(1, Math.min(rect.bottom, maxHeight)),
});

const expandRect = (
    rect: PixelRect,
    paddingX: number,
    paddingY: number,
    maxWidth: number,
    maxHeight: number
) =>
    clampRect(
        {
            left: rect.left - paddingX,
            top: rect.top - paddingY,
            right: rect.right + paddingX,
            bottom: rect.bottom + paddingY,
        },
        maxWidth,
        maxHeight
    );

const insetRect = (rect: PixelRect, insetX: number, insetY: number): PixelRect => ({
    left: rect.left + insetX,
    top: rect.top + insetY,
    right: rect.right - insetX,
    bottom: rect.bottom - insetY,
});

const cropBlackBorder = (image: CanvasImage) => {
    let left = image.width;
    let right = -1;
    let top = image.height;
    let bottom = -1;

    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const [red, green, blue] = getPixel(image, x, y);
            const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
            if (Math.max(red, green, blue) < 20 && luminance < 24) {
                continue;
            }

            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
        }
    }

    if (right < left || bottom < top) {
        return {
            image,
            crop: { left: 0, top: 0, right: image.width, bottom: image.height },
        };
    }

    const crop = expandRect(
        { left, top, right: right + 1, bottom: bottom + 1 },
        2,
        2,
        image.width,
        image.height
    );

    const canvas = document.createElement("canvas");
    canvas.width = rectWidth(crop);
    canvas.height = rectHeight(crop);
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas is unavailable");
    }

    context.drawImage(
        image.canvas,
        crop.left,
        crop.top,
        rectWidth(crop),
        rectHeight(crop),
        0,
        0,
        rectWidth(crop),
        rectHeight(crop)
    );

    return {
        image: snapshotCanvas(canvas),
        crop,
    };
};

const resizeCanvasImage = (image: CanvasImage, targetWidth: number) => {
    const scale = targetWidth / image.width;
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas is unavailable");
    }

    context.imageSmoothingEnabled = false;
    context.drawImage(image.canvas, 0, 0, targetWidth, targetHeight);

    return {
        image: snapshotCanvas(canvas),
        scale,
    };
};

const buildMask = (
    image: CanvasImage,
    predicate: (red: number, green: number, blue: number, x: number, y: number) => boolean,
    bounds?: PixelRect
) => {
    const mask = new Uint8Array(image.width * image.height);
    const startX = bounds?.left ?? 0;
    const endX = bounds?.right ?? image.width;
    const startY = bounds?.top ?? 0;
    const endY = bounds?.bottom ?? image.height;

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const pixelIndex = y * image.width + x;
            const offset = pixelIndex * 4;
            mask[pixelIndex] = predicate(
                image.data[offset],
                image.data[offset + 1],
                image.data[offset + 2],
                x,
                y
            )
                ? 1
                : 0;
        }
    }

    return mask;
};

const dilateMask = (mask: Uint8Array, width: number, height: number) => {
    const next = new Uint8Array(mask.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let active = 0;
            for (let dy = -1; dy <= 1 && active === 0; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                        continue;
                    }
                    if (mask[ny * width + nx] === 1) {
                        active = 1;
                        break;
                    }
                }
            }
            next[y * width + x] = active;
        }
    }

    return next;
};

const erodeMask = (mask: Uint8Array, width: number, height: number) => {
    const next = new Uint8Array(mask.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let active = 1;
            for (let dy = -1; dy <= 1 && active === 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                        active = 0;
                        break;
                    }
                    if (mask[ny * width + nx] === 0) {
                        active = 0;
                        break;
                    }
                }
            }
            next[y * width + x] = active;
        }
    }

    return next;
};

const closeAndOpenMask = (mask: Uint8Array, width: number, height: number) => {
    const closed = erodeMask(dilateMask(mask, width, height), width, height);
    return dilateMask(erodeMask(closed, width, height), width, height);
};

const findConnectedComponents = (
    mask: Uint8Array,
    width: number,
    height: number,
    bounds?: PixelRect,
    minArea = 1
) => {
    const visited = new Uint8Array(mask.length);
    const components: PixelRect[] = [];
    const startX = bounds?.left ?? 0;
    const endX = bounds?.right ?? width;
    const startY = bounds?.top ?? 0;
    const endY = bounds?.bottom ?? height;

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const startIndex = y * width + x;
            if (mask[startIndex] === 0 || visited[startIndex] === 1) {
                continue;
            }

            const queueX = [x];
            const queueY = [y];
            visited[startIndex] = 1;
            let area = 0;
            let left = x;
            let right = x;
            let top = y;
            let bottom = y;

            while (queueX.length > 0) {
                const currentX = queueX.pop()!;
                const currentY = queueY.pop()!;
                area += 1;
                left = Math.min(left, currentX);
                right = Math.max(right, currentX);
                top = Math.min(top, currentY);
                bottom = Math.max(bottom, currentY);

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) {
                            continue;
                        }
                        const nextX = currentX + dx;
                        const nextY = currentY + dy;
                        if (
                            nextX < startX ||
                            nextY < startY ||
                            nextX >= endX ||
                            nextY >= endY
                        ) {
                            continue;
                        }

                        const nextIndex = nextY * width + nextX;
                        if (mask[nextIndex] === 0 || visited[nextIndex] === 1) {
                            continue;
                        }

                        visited[nextIndex] = 1;
                        queueX.push(nextX);
                        queueY.push(nextY);
                    }
                }
            }

            if (area >= minArea) {
                components.push({
                    left,
                    top,
                    right: right + 1,
                    bottom: bottom + 1,
                });
            }
        }
    }

    return components;
};

const pickPrimaryRows = (components: PixelRect[], count: number) =>
    [...components]
        .sort((leftRect, rightRect) => rectCenterY(leftRect) - rectCenterY(rightRect))
        .slice(0, count);

const prepareImageForDetection = (image: HTMLImageElement): PreparedImage => {
    const original = createCanvasFromImage(image);
    const cropped = cropBlackBorder(original);
    const resized = resizeCanvasImage(cropped.image, TARGET_IMAGE_WIDTH);

    return {
        normalized: resized.image,
        crop: cropped.crop,
        scale: resized.scale,
        originalWidth: image.width,
        originalHeight: image.height,
    };
};

const detectPanelLayout = (image: CanvasImage): DetectedLayout | null => {
    const yellowMask = closeAndOpenMask(
        buildMask(image, (red, green, blue, x) => {
            if (x < image.width * 0.45) {
                return false;
            }
            const hsv = rgbToHsv(red, green, blue);
            return hsv.hue >= 35 && hsv.hue <= 70 && hsv.saturation >= 0.25 && hsv.value >= 0.5;
        }),
        image.width,
        image.height
    );

    const candidatePanels = findConnectedComponents(
        yellowMask,
        image.width,
        image.height,
        {
            left: Math.floor(image.width * 0.45),
            top: 0,
            right: image.width,
            bottom: image.height,
        },
        Math.floor(image.width * image.height * 0.01)
    );

    let bestLayout: DetectedLayout | null = null;

    for (const candidate of candidatePanels) {
        const panel = expandRect(candidate, 6, 6, image.width, image.height);
        const panelWidth = rectWidth(panel);
        const panelHeight = rectHeight(panel);
        if (panelWidth < image.width * 0.18 || panelHeight < image.height * 0.22) {
            continue;
        }

        const leftBounds = {
            left: panel.left,
            top: panel.top,
            right: panel.left + Math.floor(panelWidth * 0.58),
            bottom: panel.bottom,
        };
        const rightBounds = {
            left: panel.left + Math.floor(panelWidth * 0.42),
            top: panel.top,
            right: panel.right,
            bottom: panel.bottom,
        };

        const labelMask = closeAndOpenMask(
            buildMask(image, (red, green, blue, x, y) => {
                if (
                    x < leftBounds.left ||
                    x >= leftBounds.right ||
                    y < leftBounds.top ||
                    y >= leftBounds.bottom
                ) {
                    return false;
                }

                const hsv = rgbToHsv(red, green, blue);
                const maxChannel = Math.max(red, green, blue);
                const minChannel = Math.min(red, green, blue);
                const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
                return (
                    hsv.value >= 0.35 &&
                    hsv.value <= 0.82 &&
                    hsv.saturation <= 0.28 &&
                    luminance >= 85 &&
                    luminance <= 190 &&
                    blue >= red - 15 &&
                    blue >= green - 15 &&
                    maxChannel - minChannel <= 75
                );
            }, leftBounds),
            image.width,
            image.height
        );

        const rawLabelRects = findConnectedComponents(
            labelMask,
            image.width,
            image.height,
            leftBounds,
            Math.floor(panelWidth * panelHeight * 0.002)
        ).filter((rect) => {
            const width = rectWidth(rect);
            const height = rectHeight(rect);
            return (
                width >= panelWidth * 0.18 &&
                height >= panelHeight * 0.035 &&
                height <= panelHeight * 0.18 &&
                width / Math.max(height, 1) >= 1.15
            );
        });

        if (rawLabelRects.length < 6) {
            continue;
        }

        const labelRects = pickPrimaryRows(rawLabelRects, 6);
        const valueMask = closeAndOpenMask(
            buildMask(image, (red, green, blue, x, y) => {
                if (
                    x < rightBounds.left ||
                    x >= rightBounds.right ||
                    y < rightBounds.top ||
                    y >= rightBounds.bottom
                ) {
                    return false;
                }

                const hsv = rgbToHsv(red, green, blue);
                const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
                return hsv.value >= 0.82 && hsv.saturation <= 0.22 && luminance >= 200;
            }, rightBounds),
            image.width,
            image.height
        );

        const valueRects = findConnectedComponents(
            valueMask,
            image.width,
            image.height,
            rightBounds,
            Math.floor(panelWidth * panelHeight * 0.0025)
        ).filter((rect) => {
            const width = rectWidth(rect);
            const height = rectHeight(rect);
            return (
                width >= panelWidth * 0.12 &&
                height >= panelHeight * 0.04 &&
                height <= panelHeight * 0.2 &&
                width / Math.max(height, 1) >= 1.05
            );
        });

        if (valueRects.length < 5) {
            continue;
        }

        const statRects = {} as Record<StatKey, PixelRect>;
        const usedValueIndexes = new Set<number>();
        let matchedValues = 0;

        for (let index = 0; index < STAT_KEYS.length; index++) {
            const key = STAT_KEYS[index];
            const labelRect = labelRects[index];
            let bestValueIndex = -1;
            let bestDistance = Number.POSITIVE_INFINITY;

            for (let valueIndex = 0; valueIndex < valueRects.length; valueIndex++) {
                if (usedValueIndexes.has(valueIndex)) {
                    continue;
                }

                const valueRect = valueRects[valueIndex];
                const distance = Math.abs(
                    rectCenterY(valueRect) - rectCenterY(labelRect)
                );

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestValueIndex = valueIndex;
                }
            }

            const maxDistance = panelHeight * (index === 0 ? 0.11 : 0.08);
            if (bestValueIndex >= 0 && bestDistance <= maxDistance) {
                usedValueIndexes.add(bestValueIndex);
                statRects[key] = expandRect(
                    valueRects[bestValueIndex],
                    2,
                    2,
                    image.width,
                    image.height
                );
                matchedValues += 1;
                continue;
            }

            const labelHeight = rectHeight(labelRect);
            statRects[key] = clampRect(
                {
                    left: panel.left + Math.floor(panelWidth * 0.62),
                    top: Math.max(panel.top, Math.round(rectCenterY(labelRect) - labelHeight * 0.8)),
                    right: panel.right - Math.floor(panelWidth * 0.04),
                    bottom: Math.min(panel.bottom, Math.round(rectCenterY(labelRect) + labelHeight * 0.8)),
                },
                image.width,
                image.height
            );
        }

        const allRects = [...labelRects, ...Object.values(statRects)];
        const panelRect = expandRect(
            {
                left: Math.min(...allRects.map((rect) => rect.left)),
                top: Math.min(...allRects.map((rect) => rect.top)),
                right: Math.max(...allRects.map((rect) => rect.right)),
                bottom: Math.max(...allRects.map((rect) => rect.bottom)),
            },
            6,
            6,
            image.width,
            image.height
        );

        const score =
            matchedValues * 20 +
            rawLabelRects.length * 3 +
            valueRects.length * 2 +
            rectCenterX(panelRect) / image.width;

        if (!bestLayout || score > bestLayout.score) {
            bestLayout = { panelRect, statRects, score };
        }
    }

    return bestLayout;
};

const mapRectToOriginalRegion = (
    rect: PixelRect,
    prepared: PreparedImage
): RegionBox => {
    const sourceLeft = prepared.crop.left + rect.left / prepared.scale;
    const sourceTop = prepared.crop.top + rect.top / prepared.scale;
    const sourceRight = prepared.crop.left + rect.right / prepared.scale;
    const sourceBottom = prepared.crop.top + rect.bottom / prepared.scale;

    return {
        x: sourceLeft / prepared.originalWidth,
        y: sourceTop / prepared.originalHeight,
        width: (sourceRight - sourceLeft) / prepared.originalWidth,
        height: (sourceBottom - sourceTop) / prepared.originalHeight,
    };
};

const fixedRegionToPixelRect = (
    image: CanvasImage,
    region: RegionBox
): PixelRect =>
    clampRect(
        {
            left: Math.round(region.x * image.width),
            top: Math.round(region.y * image.height),
            right: Math.round((region.x + region.width) * image.width),
            bottom: Math.round((region.y + region.height) * image.height),
        },
        image.width,
        image.height
    );

const getFixedLayout = (image: CanvasImage): DetectedLayout => {
    const statRects = Object.fromEntries(
        STAT_KEYS.map((key) => [key, fixedRegionToPixelRect(image, FIXED_STAT_LAYOUT[key])])
    ) as Record<StatKey, PixelRect>;

    const allRects = Object.values(statRects);
    const panelRect = expandRect(
        {
            left: Math.min(...allRects.map((rect) => rect.left)) - Math.round(image.width * 0.2),
            top: Math.min(...allRects.map((rect) => rect.top)) - Math.round(image.height * 0.03),
            right: Math.max(...allRects.map((rect) => rect.right)),
            bottom: Math.max(...allRects.map((rect) => rect.bottom)) + Math.round(image.height * 0.02),
        },
        0,
        0,
        image.width,
        image.height
    );

    return {
        panelRect,
        statRects,
        score: 0,
    };
};

const createBinaryCropDataUrl = (
    image: CanvasImage,
    rect: PixelRect,
    scale: number
) => {
    const sourceRect = clampRect(rect, image.width, image.height);
    const width = Math.max(1, rectWidth(sourceRect));
    const height = Math.max(1, rectHeight(sourceRect));
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas is unavailable");
    }

    context.imageSmoothingEnabled = false;
    context.drawImage(
        image.canvas,
        sourceRect.left,
        sourceRect.top,
        width,
        height,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < imageData.data.length; index += 4) {
        const red = imageData.data[index];
        const green = imageData.data[index + 1];
        const blue = imageData.data[index + 2];
        const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
        const binary = luminance > 178 ? 255 : 0;
        imageData.data[index] = binary;
        imageData.data[index + 1] = binary;
        imageData.data[index + 2] = binary;
        imageData.data[index + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);

    return canvas.toDataURL("image/png");
};

const parseNumericValue = (rawText: string) => {
    const matches = rawText.replace(/\s/g, "").match(/\d{1,3}/g);
    return matches?.[0] ?? "";
};

const extractHpValue = (rawText: string) => {
    const compact = rawText.replace(/\s/g, "");
    const exact = compact.match(/(\d{1,3})\/(\d{1,3})/);
    if (exact) {
        return { value: exact[2], strong: true };
    }

    const groups = compact.match(/\d{1,3}/g);
    if (!groups || groups.length === 0) {
        return { value: "", strong: false };
    }

    return {
        value: groups[groups.length - 1],
        strong: groups.length >= 2,
    };
};

const isValidStatValue = (value: string) => {
    const parsed = parseInt(value, 10);
    return !Number.isNaN(parsed) && parsed >= 1 && parsed <= 999;
};

const loadTesseractRuntime = () =>
    new Promise<TesseractModule>((resolve, reject) => {
        if (window.Tesseract) {
            resolve(window.Tesseract);
            return;
        }

        const existingScript = document.getElementById(
            TESSERACT_SCRIPT_ID
        ) as HTMLScriptElement | null;

        if (existingScript) {
            existingScript.addEventListener("load", () => {
                if (window.Tesseract) {
                    resolve(window.Tesseract);
                    return;
                }
                reject(new Error("Tesseract runtime not available"));
            });
            existingScript.addEventListener("error", () => {
                reject(new Error("Failed to load Tesseract runtime"));
            });
            return;
        }

        const script = document.createElement("script");
        script.id = TESSERACT_SCRIPT_ID;
        script.src = TESSERACT_SCRIPT_SRC;
        script.async = true;
        script.onload = () => {
            if (window.Tesseract) {
                resolve(window.Tesseract);
                return;
            }
            reject(new Error("Tesseract runtime not available"));
        };
        script.onerror = () => {
            reject(new Error("Failed to load Tesseract runtime"));
        };
        document.head.appendChild(script);
    });

export default function IvImageImportPanel({
    currentLineCount,
    natureSelected,
    onAppendLine,
}: {
    currentLineCount: number;
    natureSelected: boolean;
    onAppendLine: (level: number, stats: number[]) => Promise<void>;
}) {
    const { locale, t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const workerRef = useRef<TesseractWorker | null>(null);
    const [level, setLevel] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [detectedPanelRegion, setDetectedPanelRegion] = useState<RegionBox | null>(
        null
    );
    const [detectedRegions, setDetectedRegions] = useState<
        Partial<Record<StatKey, RegionBox>>
    >({});
    const [stats, setStats] = useState<StatValueMap>(getEmptyStats);
    const [feedback, setFeedback] = useState("");
    const [feedbackSeverity, setFeedbackSeverity] = useState<
        "success" | "info" | "warning" | "error"
    >("info");
    const [recognizing, setRecognizing] = useState(false);
    const [recognitionProgress, setRecognitionProgress] = useState(0);

    const statKeys = useMemo(() => STAT_KEYS, []);
    const statLabels = useMemo(
        () =>
            locale === "zh"
                ? {
                      hp: "HP",
                      attack: "\u653b\u51fb (Attack)",
                      defense: "\u9632\u5fa1 (Defense)",
                      specialAttack: "\u7279\u653b (Sp. Atk)",
                      specialDefense: "\u7279\u9632 (Sp. Def)",
                      speed: "\u901f\u5ea6 (Speed)",
                  }
                : {
                      hp: t("stats.hp"),
                      attack: t("stats.attack"),
                      defense: t("stats.defense"),
                      specialAttack: "Sp. Atk",
                      specialDefense: "Sp. Def",
                      speed: t("stats.speed"),
                  },
        [locale, t]
    );

    useEffect(() => {
        return () => {
            if (previewUrl !== "") {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    useEffect(() => {
        return () => {
            if (workerRef.current) {
                void workerRef.current.terminate();
            }
        };
    }, []);

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const file = Array.from(event.clipboardData?.items ?? [])
                .find((item) => item.type.startsWith("image/"))
                ?.getAsFile();

            if (!file) {
                return;
            }

            event.preventDefault();
            void loadSelectedImage(file);
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    });

    const setStatus = (
        message: string,
        severity: "success" | "info" | "warning" | "error"
    ) => {
        setFeedback(message);
        setFeedbackSeverity(severity);
    };

    const getWorker = async () => {
        if (workerRef.current) {
            return workerRef.current;
        }

        const Tesseract = await loadTesseractRuntime();
        const worker = await Tesseract.createWorker("eng", 1, {
            logger: (message: TesseractLoggerMessage) => {
                if (message.status === "recognizing text") {
                    setRecognitionProgress(Math.round(message.progress * 100));
                }
            },
        });

        workerRef.current = worker;
        return worker;
    };

    const loadSelectedImage = async (file: File) => {
        if (previewUrl !== "") {
            URL.revokeObjectURL(previewUrl);
        }
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setDetectedPanelRegion(null);
        setDetectedRegions({});
        setStats(getEmptyStats());
        setRecognitionProgress(0);
        setStatus(t("imageImport.imageLoaded"), "info");
    };

    const clearAll = () => {
        if (previewUrl !== "") {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl("");
        setImageFile(null);
        setDetectedPanelRegion(null);
        setDetectedRegions({});
        setStats(getEmptyStats());
        setRecognitionProgress(0);
        setFeedback("");
    };

    const handleFileSelection = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        void loadSelectedImage(file);
        event.target.value = "";
    };

    const recognizeRegion = async (
        worker: TesseractWorker,
        image: CanvasImage,
        rect: PixelRect,
        allowSlash: boolean
    ) => {
        const attemptOffsets = [0, -2, 2, -4, 4];
        let fallbackValue = "";

        await worker.setParameters({
            tessedit_char_whitelist: allowSlash ? "0123456789/" : "0123456789",
            preserve_interword_spaces: "1",
            user_defined_dpi: "300",
        });

        for (const offset of attemptOffsets) {
            const shiftedRect = clampRect(
                {
                    left: rect.left,
                    top: rect.top + offset,
                    right: rect.right,
                    bottom: rect.bottom + offset,
                },
                image.width,
                image.height
            );
            const innerRect = insetRect(
                shiftedRect,
                allowSlash ? 2 : 3,
                allowSlash ? 1 : 2
            );
            const cropRect =
                rectWidth(innerRect) > 4 && rectHeight(innerRect) > 4
                    ? innerRect
                    : shiftedRect;

            const result = await worker.recognize(
                createBinaryCropDataUrl(image, cropRect, allowSlash ? 4 : 5)
            );
            const rawText = result.data.text;

            if (allowSlash) {
                const hpCandidate = extractHpValue(rawText);
                if (fallbackValue === "" && hpCandidate.value !== "") {
                    fallbackValue = hpCandidate.value;
                }
                if (hpCandidate.strong && isValidStatValue(hpCandidate.value)) {
                    return hpCandidate.value;
                }
                continue;
            }

            const numericValue = parseNumericValue(rawText);
            if (fallbackValue === "" && numericValue !== "") {
                fallbackValue = numericValue;
            }
            if (isValidStatValue(numericValue)) {
                return numericValue;
            }
        }

        return fallbackValue;
    };

    const recognizeStats = async () => {
        if (!imageFile) {
            setStatus(t("imageImport.noImage"), "warning");
            return;
        }

        setRecognizing(true);
        setRecognitionProgress(0);
        setStatus(t("imageImport.recognizing"), "info");

        try {
            const image = await loadImage(imageFile);
            const prepared = prepareImageForDetection(image);
            const worker = await getWorker();
            const evaluateLayout = async (layout: DetectedLayout) => {
                const nextStats = getEmptyStats();
                for (const key of statKeys) {
                    nextStats[key] = await recognizeRegion(
                        worker,
                        prepared.normalized,
                        layout.statRects[key],
                        key === "hp"
                    );
                }

                return {
                    layout,
                    stats: nextStats,
                    recognizedCount: statKeys.filter((key) =>
                        isValidStatValue(nextStats[key])
                    ).length,
                };
            };

            const fixedAttempt = await evaluateLayout(
                getFixedLayout(prepared.normalized)
            );
            const detectedLayout =
                fixedAttempt.recognizedCount >= 4
                    ? null
                    : detectPanelLayout(prepared.normalized);
            const detectedAttempt = detectedLayout
                ? await evaluateLayout(detectedLayout)
                : null;
            const bestAttempt =
                detectedAttempt &&
                detectedAttempt.recognizedCount > fixedAttempt.recognizedCount
                    ? detectedAttempt
                    : fixedAttempt;

            if (bestAttempt.recognizedCount === 0) {
                setDetectedPanelRegion(null);
                setDetectedRegions({});
                setStats(getEmptyStats());
                setStatus(t("imageImport.noStatsFound"), "error");
                return;
            }

            setDetectedPanelRegion(
                mapRectToOriginalRegion(bestAttempt.layout.panelRect, prepared)
            );
            setDetectedRegions(
                Object.fromEntries(
                    statKeys.map((key) => [
                        key,
                        mapRectToOriginalRegion(bestAttempt.layout.statRects[key], prepared),
                    ])
                ) as Record<StatKey, RegionBox>
            );
            setStats(bestAttempt.stats);

            if (bestAttempt.recognizedCount < statKeys.length) {
                setStatus(
                    t("imageImport.partialRecognition", {
                        count: `${bestAttempt.recognizedCount}`,
                        total: `${statKeys.length}`,
                    }),
                    "warning"
                );
            } else {
                setStatus(t("imageImport.recognitionComplete"), "success");
            }
        } catch {
            setStatus(t("imageImport.recognitionFailed"), "error");
        } finally {
            setRecognizing(false);
        }
    };

    const appendLine = async () => {
        const parsedLevel = parseInt(level, 10);
        if (!natureSelected) {
            setStatus(t("imageImport.requiresNature"), "warning");
            return;
        }
        if (Number.isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 100) {
            setStatus(t("imageImport.invalidLevel"), "warning");
            return;
        }

        const parsedStats = statKeys.map((key) => parseInt(stats[key], 10));
        if (
            parsedStats.some(
                (value) => Number.isNaN(value) || value < 1 || value > 999
            )
        ) {
            setStatus(t("imageImport.invalidStats"), "warning");
            return;
        }

        try {
            await onAppendLine(parsedLevel, parsedStats);
            setStatus(
                t("imageImport.appended", {
                    nextCount: `${currentLineCount + 1}`,
                }),
                "success"
            );
        } catch {
            setStatus(t("imageImport.appendFailed"), "error");
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                mt: 1.5,
                p: 2,
                textAlign: "left",
                borderStyle: "dashed",
            }}
        >
            <Typography variant="h6">{t("imageImport.title")}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t("imageImport.description")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {t("imageImport.queueHint", {
                    count: `${currentLineCount}`,
                    nextCount: `${currentLineCount + 1}`,
                })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t("imageImport.adjustHint")}
            </Typography>

            {!natureSelected && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                    {t("imageImport.requiresNature")}
                </Alert>
            )}

            <TextField
                label={t("labels.level")}
                margin="normal"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                fullWidth
            />

            <Box
                sx={{
                    mt: 1,
                    p: 2,
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    backgroundColor: "action.hover",
                    cursor: "pointer",
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                    event.preventDefault();
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files?.[0];
                    if (file) {
                        void loadSelectedImage(file);
                    }
                }}
            >
                <Typography variant="body1">
                    {t("imageImport.dropzoneTitle")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t("imageImport.dropzoneHint")}
                </Typography>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileSelection}
                />
            </Box>

            {previewUrl !== "" && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {t("imageImport.previewTitle")}
                    </Typography>
                    <Box
                        sx={{
                            position: "relative",
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "1px solid",
                            borderColor: "divider",
                            backgroundColor: "common.black",
                        }}
                    >
                        <Box
                            component="img"
                            src={previewUrl}
                            alt={t("imageImport.previewTitle")}
                            sx={{ display: "block", width: "100%", height: "auto" }}
                        />
                        {detectedPanelRegion && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: `${detectedPanelRegion.x * 100}%`,
                                    top: `${detectedPanelRegion.y * 100}%`,
                                    width: `${detectedPanelRegion.width * 100}%`,
                                    height: `${detectedPanelRegion.height * 100}%`,
                                    border: "2px solid rgba(255, 152, 0, 0.95)",
                                    borderRadius: 1.5,
                                    boxSizing: "border-box",
                                    backgroundColor: "rgba(255, 152, 0, 0.06)",
                                    pointerEvents: "none",
                                }}
                            />
                        )}
                        {statKeys.map((key) => {
                            const region = detectedRegions[key];
                            if (!region) {
                                return null;
                            }

                            return (
                                <Box
                                    key={key}
                                    sx={{
                                        position: "absolute",
                                        left: `${region.x * 100}%`,
                                        top: `${region.y * 100}%`,
                                        width: `${region.width * 100}%`,
                                        height: `${region.height * 100}%`,
                                        border: "2px solid rgba(33, 150, 243, 0.95)",
                                        borderRadius: 1.5,
                                        boxSizing: "border-box",
                                        backgroundColor: "rgba(33, 150, 243, 0.08)",
                                        pointerEvents: "none",
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            position: "absolute",
                                            top: 4,
                                            left: 6,
                                            px: 0.75,
                                            borderRadius: 0.75,
                                            color: "common.white",
                                            backgroundColor:
                                                "rgba(33, 150, 243, 0.95)",
                                        }}
                                    >
                                        {statLabels[key]}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}

            <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                    variant="contained"
                    onClick={() => void recognizeStats()}
                    disabled={recognizing || !imageFile}
                >
                    {recognizing ? t("imageImport.recognizing") : t("imageImport.recognize")}
                </Button>
                <Button variant="outlined" onClick={clearAll} disabled={!imageFile}>
                    {t("imageImport.clear")}
                </Button>
                {recognizing && (
                    <Box
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1,
                            color: "text.secondary",
                        }}
                    >
                        <CircularProgress size={18} />
                        <Typography variant="body2">
                            {recognitionProgress}%
                        </Typography>
                    </Box>
                )}
            </Box>

            {feedback !== "" && (
                <Alert severity={feedbackSeverity} sx={{ mt: 1.5 }}>
                    {feedback}
                </Alert>
            )}

            <Box
                sx={{
                    mt: 2,
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                }}
            >
                {statKeys.map((key) => (
                    <TextField
                        key={key}
                        label={statLabels[key]}
                        value={stats[key]}
                        onChange={(event) =>
                            setStats((current) => ({
                                ...current,
                                [key]: event.target.value,
                            }))
                        }
                        fullWidth
                    />
                ))}
            </Box>

            <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => void appendLine()}
            >
                {t("imageImport.appendAction")}
            </Button>
        </Paper>
    );
}
