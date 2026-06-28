import MainModuleFactory, { type MainModule } from "./generated";
import { expose } from "comlink";

let main_module: MainModule;

MainModuleFactory()
    .then((module) => {
        main_module = module;
        expose(main_module);
        postMessage({ ready: true });
    })
    .catch((error) => {
        postMessage({
            ready: false,
            error: error instanceof Error ? error.message : String(error),
        });
    });
