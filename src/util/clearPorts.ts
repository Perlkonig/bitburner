import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    for (const port of ns.args as number[]) {
        const h = ns.getPortHandle(port);
        h.clear();
    }
}
