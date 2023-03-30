import { NS } from "@ns";

export function parseArgs(ns: NS): [string[], Map<string,string|null>] {
    const raw = [];
    const flags = new Map<string,string|null>();
    for (const arg of ns.args as string[]) {
        if (arg.startsWith("--")) {
            const [left, right] = arg.split("=", 2);
            if (right !== undefined) {
                flags.set(left.substring(2), right);
            } else {
                flags.set(left.substring(2), null);
            }
        } else {
            raw.push(arg);
        }
    }
    return [raw, flags];
}
