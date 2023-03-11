import { NS } from "./NetscriptDefinitions";

export interface MyNS extends NS {
    heart: {
        break(): number;
    }
}

export interface BoxNode extends Node {
    body: HTMLElement;
    recalcHeight(): void;
}