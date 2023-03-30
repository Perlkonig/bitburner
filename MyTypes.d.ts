import { NS } from "./NetscriptDefinitions";

export interface MyNS extends NS {
    heart: {
        break(): number;
    }
}

export interface BoxNode extends Node {
    body: HTMLDivElement;
    head: HTMLDivElement;
    "Toggle Type": () => void;
    toggleType: () => void;
    "Recalculate Height": () => void;
    logTarget: HTMLElement;
    log: (msg: string, timestamp: boolean) => HTMLElement;
    recalcHeight(): void;
    contextItems: {
        [k: string]: {
            name: string;
            fn: () => void;
            cFn: () => void;
        }
    }
    addContextItem: (name: string, fn: () => void, cFn: () => void) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    remove: (arg0?: any) => void;
    cancel: () => void;
    "Foat to Top": () => void;
    "Sink to Bottom": () => void;
}