import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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

type OverlayRegion = {
    key: StatKey;
    x: number;
    y: number;
    width: number;
    height: number;
};

type PixelBand = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};

type RegionBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type SelectionStart = {
    rect: DOMRect;
    startX: number;
    startY: number;
};

const DEFAULT_STATS_REGION: RegionBox = {
    x: 0.705,
    y: 0.115,
    width: 0.255,
    height: 0.695,
};

const STAT_KEYS: StatKey[] = [
    "hp",
    "attack",
    "defense",
    "specialAttack",
    "specialDefense",
    "speed",
];

const MIN_REGION_WIDTH = 0.001;
const MIN_REGION_HEIGHT = 0.001;

const EMPTY_STAT_VALUES: StatValueMap = {
    hp: "",
    attack: "",
    defense: "",
    specialAttack: "",
    specialDefense: "",
    speed: "",
};

const getEmptyStats = (): StatValueMap => ({ ...EMPTY_STAT_VALUES });
const TESSERACT_SCRIPT_ID = "tesseract-js-runtime";
const TESSERACT_SCRIPT_SRC =
    "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js";

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

const prepareCropDataUrl = (
    image: HTMLImageElement,
    region: OverlayRegion,
    scale = 4
) => {
    const sourceX = Math.floor(image.width * region.x);
    const sourceY = Math.floor(image.height * region.y);
    const sourceWidth = Math.floor(image.width * region.width);
    const sourceHeight = Math.floor(image.height * region.height);
    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth * scale;
    canvas.height = sourceHeight * scale;
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Canvas is unavailable");
    }

    context.imageSmoothingEnabled = false;
    context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
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
        const binary = luminance > 175 ? 255 : 0;
        imageData.data[index] = binary;
        imageData.data[index + 1] = binary;
        imageData.data[index + 2] = binary;
        imageData.data[index + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);

    return canvas.toDataURL("image/png");
};

const parseRecognizedValue = (rawText: string) => {
    const matches = rawText.replace(/\s/g, "").match(/\d{1,3}/g);
    return matches?.[0] ?? "";
};

const isLikelyValueBoxPixel = (red: number, green: number, blue: number) => {
    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = maxChannel - minChannel;

    return luminance > 200 && saturation < 35;
};

const detectStatValueRegions = (
    image: HTMLImageElement,
    statsRegion: RegionBox
): OverlayRegion[] => {
    const sourceX = Math.floor(image.width * statsRegion.x);
    const sourceY = Math.floor(image.height * statsRegion.y);
    const sourceWidth = Math.max(1, Math.floor(image.width * statsRegion.width));
    const sourceHeight = Math.max(
        1,
        Math.floor(image.height * statsRegion.height)
    );

    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const context = canvas.getContext("2d");

    if (!context) {
        return [];
    }

    context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight
    );

    const imageData = context.getImageData(0, 0, sourceWidth, sourceHeight).data;
    const searchStartX = Math.floor(sourceWidth * 0.48);
    const rowScores = new Array<number>(sourceHeight).fill(0);
    const rowBounds = Array.from({ length: sourceHeight }, () => ({
        left: sourceWidth,
        right: -1,
    }));

    for (let y = 0; y < sourceHeight; y++) {
        for (let x = searchStartX; x < sourceWidth; x++) {
            const index = (y * sourceWidth + x) * 4;
            const red = imageData[index];
            const green = imageData[index + 1];
            const blue = imageData[index + 2];

            if (!isLikelyValueBoxPixel(red, green, blue)) {
                continue;
            }

            rowScores[y] += 1;
            rowBounds[y].left = Math.min(rowBounds[y].left, x);
            rowBounds[y].right = Math.max(rowBounds[y].right, x);
        }
    }

    const smoothedScores = rowScores.map((_value, index) => {
        const start = Math.max(0, index - 1);
        const end = Math.min(sourceHeight - 1, index + 1);
        let total = 0;
        for (let cursor = start; cursor <= end; cursor++) {
            total += rowScores[cursor];
        }
        return total / (end - start + 1);
    });

    const maxScore = smoothedScores.reduce((max, value) => Math.max(max, value), 0);
    if (maxScore === 0) {
        return [];
    }

    const threshold = Math.max(12, maxScore * 0.42);
    const bands: PixelBand[] = [];
    let currentBand: PixelBand | null = null;

    for (let y = 0; y < sourceHeight; y++) {
        if (smoothedScores[y] < threshold || rowBounds[y].right < rowBounds[y].left) {
            if (currentBand) {
                bands.push(currentBand);
                currentBand = null;
            }
            continue;
        }

        if (!currentBand) {
            currentBand = {
                top: y,
                bottom: y,
                left: rowBounds[y].left,
                right: rowBounds[y].right,
            };
            continue;
        }

        currentBand.bottom = y;
        currentBand.left = Math.min(currentBand.left, rowBounds[y].left);
        currentBand.right = Math.max(currentBand.right, rowBounds[y].right);
    }

    if (currentBand) {
        bands.push(currentBand);
    }

    const filteredBands = bands
        .filter((band) => band.bottom - band.top >= 6)
        .sort((leftBand, rightBand) => leftBand.top - rightBand.top);

    const selectedBands = filteredBands.slice(0, STAT_KEYS.length);
    if (selectedBands.length === 0) {
        return [];
    }

    return selectedBands.map((band, index) => {
        const paddingX = Math.max(2, Math.round(sourceWidth * 0.01));
        const paddingY = Math.max(2, Math.round(sourceHeight * 0.01));
        const left = Math.max(searchStartX, band.left - paddingX);
        const right = Math.min(sourceWidth, band.right + paddingX);
        const top = Math.max(0, band.top - paddingY);
        const bottom = Math.min(sourceHeight, band.bottom + paddingY);

        return {
            key: STAT_KEYS[index],
            x: statsRegion.x + (left / sourceWidth) * statsRegion.width,
            y: statsRegion.y + (top / sourceHeight) * statsRegion.height,
            width: ((right - left) / sourceWidth) * statsRegion.width,
            height: ((bottom - top) / sourceHeight) * statsRegion.height,
        };
    });
};

const clampRegion = (region: RegionBox): RegionBox => {
    const width = Math.min(Math.max(region.width, MIN_REGION_WIDTH), 1);
    const height = Math.min(Math.max(region.height, MIN_REGION_HEIGHT), 1);
    const x = Math.min(Math.max(region.x, 0), 1 - width);
    const y = Math.min(Math.max(region.y, 0), 1 - height);

    return { x, y, width, height };
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
    const previewContainerRef = useRef<HTMLDivElement | null>(null);
    const workerRef = useRef<TesseractWorker | null>(null);
    const [level, setLevel] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [statsRegion, setStatsRegion] =
        useState<RegionBox>(DEFAULT_STATS_REGION);
    const [draftRegion, setDraftRegion] = useState<RegionBox | null>(null);
    const [pendingRegion, setPendingRegion] = useState<RegionBox | null>(null);
    const [selectionStart, setSelectionStart] = useState<SelectionStart | null>(
        null
    );
    const [isSelectingRegion, setIsSelectingRegion] = useState(false);
    const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
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

        await worker.setParameters({
            tessedit_char_whitelist: "0123456789/",
            preserve_interword_spaces: "1",
            user_defined_dpi: "300",
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
        setStatsRegion(DEFAULT_STATS_REGION);
        setDraftRegion(null);
        setPendingRegion(null);
        setIsSelectingRegion(false);
        setSelectionDialogOpen(false);
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
        setDraftRegion(null);
        setPendingRegion(null);
        setIsSelectingRegion(false);
        setSelectionDialogOpen(false);
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
            const worker = await getWorker();
            const nextStats = getEmptyStats();
            const detectedRegions = detectStatValueRegions(image, statsRegion);

            if (detectedRegions.length === 0) {
                setStats(nextStats);
                setStatus(t("imageImport.noStatsFound"), "error");
                return;
            }

            for (const region of detectedRegions) {
                const cropDataUrl = prepareCropDataUrl(image, region);
                const result = await worker.recognize(cropDataUrl);
                const recognizedValue = parseRecognizedValue(result.data.text);

                if (region.key === "hp" && result.data.text.includes("/")) {
                    const hpParts = result.data.text
                        .replace(/\s/g, "")
                        .split("/")
                        .filter((entry) => /^\d+$/.test(entry));
                    nextStats[region.key] =
                        hpParts.length > 0 ? hpParts[hpParts.length - 1] : recognizedValue;
                    continue;
                }

                nextStats[region.key] = recognizedValue;
            }

            setStats(nextStats);

            const recognizedCount = statKeys.filter(
                (key) => nextStats[key] !== ""
            ).length;

            if (recognizedCount === 0) {
                setStatus(t("imageImport.noStatsFound"), "error");
            } else if (recognizedCount < statKeys.length) {
                setStatus(
                    t("imageImport.partialRecognition", {
                        count: `${recognizedCount}`,
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

    const startSelection = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isSelectingRegion) {
            return;
        }
        if (!previewContainerRef.current) {
            return;
        }

        const rect = previewContainerRef.current.getBoundingClientRect();
        const currentX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
        const currentY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);

        if (!selectionStart) {
            setSelectionStart({
                rect,
                startX: currentX,
                startY: currentY,
            });
            setDraftRegion(
                clampRegion({
                    x: currentX / rect.width,
                    y: currentY / rect.height,
                    width: 0.001,
                    height: 0.001,
                })
            );
            setStatus(t("imageImport.selectionFirstPointSet"), "info");
            return;
        }

        const left = Math.min(selectionStart.startX, currentX) / rect.width;
        const top = Math.min(selectionStart.startY, currentY) / rect.height;
        const width = Math.abs(currentX - selectionStart.startX) / rect.width;
        const height = Math.abs(currentY - selectionStart.startY) / rect.height;
        const nextRegion = clampRegion({
            x: left,
            y: top,
            width,
            height,
        });

        setPendingRegion(nextRegion);
        setDraftRegion(nextRegion);
        setSelectionStart(null);
        setSelectionDialogOpen(true);
        setIsSelectingRegion(false);
    };

    const confirmSelectedRegion = () => {
        if (pendingRegion) {
            setStatsRegion(clampRegion(pendingRegion));
        }
        setSelectionDialogOpen(false);
        setDraftRegion(null);
        setPendingRegion(null);
        setStatus(t("imageImport.selectionApplied"), "success");
    };

    const cancelSelectedRegion = () => {
        setSelectionDialogOpen(false);
        setDraftRegion(null);
        setPendingRegion(null);
        setSelectionStart(null);
        setStatus(t("imageImport.selectionCancelled"), "info");
    };

    const displayRegion = draftRegion ?? pendingRegion ?? statsRegion;

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
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                        <Button
                            variant={isSelectingRegion ? "contained" : "outlined"}
                            onClick={() => {
                                setIsSelectingRegion(true);
                                setSelectionStart(null);
                                setDraftRegion(null);
                                setPendingRegion(null);
                                setStatus(t("imageImport.selectionModeActive"), "info");
                            }}
                        >
                            {t("imageImport.startSelection")}
                        </Button>
                    </Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {t("imageImport.previewTitle")}
                    </Typography>
                    <Box
                        ref={previewContainerRef}
                        sx={{
                            position: "relative",
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "1px solid",
                            borderColor: "divider",
                            backgroundColor: "common.black",
                            cursor: isSelectingRegion ? "crosshair" : "default",
                        }}
                        onPointerDown={startSelection}
                    >
                        <Box
                            component="img"
                            src={previewUrl}
                            alt={t("imageImport.previewTitle")}
                            sx={{ display: "block", width: "100%", height: "auto" }}
                        />
                        <Box
                            sx={{
                                position: "absolute",
                                left: `${displayRegion.x * 100}%`,
                                top: `${displayRegion.y * 100}%`,
                                width: `${displayRegion.width * 100}%`,
                                height: `${displayRegion.height * 100}%`,
                                border: "2px solid rgba(255, 152, 0, 0.95)",
                                borderRadius: 1.5,
                                boxSizing: "border-box",
                                backgroundColor: "rgba(255, 152, 0, 0.08)",
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
                                    backgroundColor: "rgba(255, 152, 0, 0.95)",
                                }}
                            >
                                {t("imageImport.statsRegion")}
                            </Typography>
                        </Box>
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
            <Dialog
                open={selectionDialogOpen}
                onClose={cancelSelectedRegion}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>{t("imageImport.selectionConfirmTitle")}</DialogTitle>
                <DialogContent>
                    <Typography>{t("imageImport.selectionConfirmBody")}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelSelectedRegion}>
                        {t("imageImport.selectionRedo")}
                    </Button>
                    <Button variant="contained" onClick={confirmSelectedRegion}>
                        {t("imageImport.selectionConfirm")}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
