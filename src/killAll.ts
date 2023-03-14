import { NS } from "@ns";
import { doc, sidebar } from "lib/box/box";

export async function main(ns: NS): Promise<void> {
    ns.killall("home", true);
    if (sidebar !== null) {
        doc.removeChild(sidebar);
    }
}
