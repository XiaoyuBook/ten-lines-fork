type TesseractLoggerMessage = {
        progress: number;
        status: string;
    };

type TesseractWorkerParams = {
        tessedit_char_whitelist?: string;
        preserve_interword_spaces?: string;
        user_defined_dpi?: string;
    };

type TesseractRecognizeResult = {
        data: {
            text: string;
        };
    };

type TesseractWorker = {
        setParameters: (params: TesseractWorkerParams) => Promise<unknown>;
        recognize: (image: string) => Promise<TesseractRecognizeResult>;
        terminate: () => Promise<unknown>;
    };

type TesseractModule = {
    createWorker: (
        langs?: string | string[],
        oem?: number,
        options?: {
            logger?: (message: TesseractLoggerMessage) => void;
        }
    ) => Promise<TesseractWorker>;
};

declare global {
    interface Window {
        Tesseract?: TesseractModule;
    }
}

export {};
