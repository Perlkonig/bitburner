import { NS } from "@ns";
import { getAugs } from "augs/lib";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const augs = getAugs(ns);
    const bestFaction = augs["nfg"].map(x => x.faction).sort((a, b) => ns.singularity.getFactionRep(b) - ns.singularity.getFactionRep(a))[0];
    while (true) {
        const success = ns.singularity.purchaseAugmentation(bestFaction, "NeuroFlux Governor");
        if (! success) { break; }
        await ns.sleep(500);
    }
    ns.tprint("Done!");
}


