import { NS } from "@ns";
import { assess, getAugs } from "augs/lib";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    let sequence = ["specials", "bb", "facrep", "combat"];
    if (ns.args.length > 0) {
        if (ns.args[0] === "+") {
            sequence = [...sequence, ...(ns.args as string[]).slice(1)];
        } else {
            sequence = [...ns.args as string[]];
        }
    }
    const order = assess(ns, sequence);
    for (const aug of order) {
        const success = ns.singularity.purchaseAugmentation(aug.faction, aug.name);
        if (! success) {
            ns.tprint(`ERROR Could not purchase ${aug.name} from ${aug.faction}. Aborting.\n${JSON.stringify(aug)}`);
            ns.exit();
        }
    }

    const augs = getAugs(ns);
    const bestFaction = augs["nfg"].map(x => x.faction).sort((a, b) => ns.singularity.getFactionRep(b) - ns.singularity.getFactionRep(a))[0];
    while (true) {
        const success = ns.singularity.purchaseAugmentation(bestFaction, "NeuroFlux Governor");
        if (! success) { break; }
        await ns.sleep(500);
    }
    ns.tprint("Done!");
}

