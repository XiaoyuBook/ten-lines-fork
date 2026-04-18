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

type OverlayRegion = {
    key: StatKey;
    x: number;
    y: number;
    width: number;
    height: number;
};

type RegionBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type DragMode = "move" | "resize";

type DragState = {
    mode: DragMode;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startRegion: RegionBox;
};

const DEFAULT_STATS_REGION: RegionBox = {
    x: 0.705,
    y: 0.115,
    width: 0.255,
    height: 0.695,
};

const OVERLAY_REGIONS: OverlayRegion[] = [
    { key: "hp", x: 0, y: 0, width: 1, height: 0.12 },
    { key: "attack", x: 0, y: 0.182, width: 1, height: 0.12 },
    { key: "defense", x: 0, y: 0.364, width: 1, height: 0.12 },
    { key: "specialAttack", x: 0, y: 0.545, width: 1, height: 0.12 },
    { key: "specialDefense", x: 0, y: 0.727, width: 1, height: 0.12 },
    { key: "speed", x: 0, y: 0.909, width: 1, height: 0.12 },
];

const MIN_REGION_WIDTH = 0.12;
const MIN_REGION_HEIGHT = 0.25;

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

const clampRegion = (region: RegionBox): RegionBox => {
    const width = Math.min(Math.max(region.width, MIN_REGION_WIDTH), 1);
    const height = Math.min(Math.max(region.height, MIN_REGION_HEIGHT), 1);
    const x = Math.min(Math.max(region.x, 0), 1 - width);
    const y = Math.min(Math.max(region.y, 0), 1 - height);

    return { x, y, width, height };
};

const getAbsoluteOverlayRegions = (statsRegion: RegionBox): OverlayRegion[] =>
    OVERLAY_REGIONS.map((region) => ({
        ...region,
        x: statsRegion.x + statsRegion.width * region.x,
        y: statsRegion.y + statsRegion.height * region.y,
        width: statsRegion.width * region.width,
        height: statsRegion.height * region.height,
    }));

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
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [stats, setStats] = useState<StatValueMap>(getEmptyStats);
    const [feedback, setFeedback] = useState("");
    const [feedbackSeverity, setFeedbackSeverity] = useState<
        "success" | "info" | "warning" | "error"
    >("info");
    const [recognizing, setRecognizing] = useState(false);
    const [recognitionProgress, setRecognitionProgress] = useState(0);

    const statKeys = useMemo(
        () => OVERLAY_REGIONS.map((region) => region.key) as StatKey[],
        []
    );
    const absoluteOverlayRegions = useMemo(
        () => getAbsoluteOverlayRegions(statsRegion),
        [statsRegion]
    );
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

    useEffect(() => {
        if (!dragState) {
            return;
        }

        const handlePointerMove = (event: PointerEvent) => {
            if (
                !previewContainerRef.current ||
                dragState.pointerId !== event.pointerId
            ) {
                return;
            }

            const rect = previewContainerRef.current.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                return;
            }

            const deltaX = (event.clientX - dragState.startClientX) / rect.width;
            const deltaY =
                (event.clientY - dragState.startClientY) / rect.height;

            if (dragState.mode === "move") {
                setStatsRegion(
                    clampRegion({
                        ...dragState.startRegion,
                        x: dragState.startRegion.x + deltaX,
                        y: dragState.startRegion.y + deltaY,
                    })
                );
                return;
            }

            setStatsRegion(
                clampRegion({
                    ...dragState.startRegion,
                    width: dragState.startRegion.width + deltaX,
                    height: dragState.startRegion.height + deltaY,
                })
            );
        };

        const handlePointerUp = (event: PointerEvent) => {
            if (dragState.pointerId === event.pointerId) {
                setDragState(null);
            }
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [dragState]);

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

            for (const region of absoluteOverlayRegions) {
                const cropDataUrl = prepareCropDataUrl(image, region);
                const result = await worker.recognize(cropDataUrl);
                nextStats[region.key] = parseRecognizedValue(result.data.text);
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

    const startDrag =
        (mode: DragMode) => (event: React.PointerEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            setDragState({
                mode,
                pointerId: event.pointerId,
                startClientX: event.clientX,
                startClientY: event.clientY,
                startRegion: statsRegion,
            });
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
                        ref={previewContainerRef}
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
                        <Box
                            sx={{
                                position: "absolute",
                                left: `${statsRegion.x * 100}%`,
                                top: `${statsRegion.y * 100}%`,
                                width: `${statsRegion.width * 100}%`,
                                height: `${statsRegion.height * 100}%`,
                                border: "2px solid rgba(255, 152, 0, 0.95)",
                                borderRadius: 1.5,
                                boxSizing: "border-box",
                                backgroundColor: "rgba(255, 152, 0, 0.08)",
                                cursor: dragState?.mode === "move" ? "grabbing" : "grab",
                            }}
                            onPointerDown={startDrag("move")}
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
                            <Box
                                sx={{
                                    position: "absolute",
                                    right: -8,
                                    bottom: -8,
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    border: "2px solid white",
                                    backgroundColor: "rgba(255, 152, 0, 1)",
                                    cursor: "nwse-resize",
                                }}
                                onPointerDown={startDrag("resize")}
                            />
                        </Box>
                        {absoluteOverlayRegions.map((region) => (
                            <Box
                                key={region.key}
                                sx={{
                                    position: "absolute",
                                    left: `${region.x * 100}%`,
                                    top: `${region.y * 100}%`,
                                    width: `${region.width * 100}%`,
                                    height: `${region.height * 100}%`,
                                    border: "2px solid rgba(33, 150, 243, 0.9)",
                                    borderRadius: 1,
                                    boxSizing: "border-box",
                                    backgroundColor: "rgba(33, 150, 243, 0.08)",
                                    pointerEvents: "none",
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: "absolute",
                                        top: 2,
                                        left: 4,
                                        px: 0.5,
                                        borderRadius: 0.5,
                                        color: "common.white",
                                        backgroundColor: "rgba(33, 150, 243, 0.9)",
                                        pointerEvents: "none",
                                    }}
                                >
                                    {statLabels[region.key]}
                                </Typography>
                            </Box>
                        ))}
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
