import { NS } from "@ns";
import { assess, priceOrder } from "augs/lib";

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
    ns.tprint(`Sequence: ${sequence.join(", ")}`);
    ns.tprint(JSON.stringify(order, null, 2));
    ns.tprint(`Total augs: ${order.length}`);
    ns.tprint(`Total cost: ${ns.formatNumber(priceOrder(order), 2)}`);
}

