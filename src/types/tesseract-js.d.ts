declare module "tesseract.js" {
    export type LoggerMessage = {
        progress: number;
        status: string;
    };

    export type WorkerParams = {
        tessedit_char_whitelist?: string;
        preserve_interword_spaces?: string;
        user_defined_dpi?: string;
    };

    export type RecognizeResult = {
        data: {
            text: string;
        };
    };

    export type Worker = {
        setParameters: (params: WorkerParams) => Promise<unknown>;
        recognize: (image: string) => Promise<RecognizeResult>;
        terminate: () => Promise<unknown>;
    };

    export function createWorker(
        langs?: string | string[],
        oem?: number,
        options?: {
            logger?: (message: LoggerMessage) => void;
        }
    ): Promise<Worker>;
}
