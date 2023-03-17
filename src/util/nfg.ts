import { NS } from "@ns";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function main(ns: NS): Promise<void> {
    const faction = ns.args[0] as string;
    let cost = ns.singularity.getAugmentationPrice("NeuroFlux Governor");
    while (ns.getServerMoneyAvailable("home") > cost) {
        let repNeeded = ns.singularity.getAugmentationRepReq("NeuroFlux Governor");
        while (ns.singularity.getFactionRep(faction) < repNeeded) {
            const success = ns.corporation.bribe(faction, 10**15);
            if (! success) {
                ns.tprint("Can't afford the bribes");
                ns.exit();
            }
            repNeeded = ns.singularity.getAugmentationRepReq("NeuroFlux Governor");
            await ns.sleep(200);
        }
        const success = ns.singularity.purchaseAugmentation(faction, "NeuroFlux Governor");
        if (! success) { break; }
        cost = ns.singularity.getAugmentationPrice("NeuroFlux Governor");
        await ns.sleep(200);
    }
    ns.tprint("Did all we could afford.");
}

