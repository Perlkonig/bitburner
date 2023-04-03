import { NS } from "@ns";
import { assess, getAugs, priceOrder, countNfgs, COST_MULT } from "lib/augs";
import { parseArgs } from "lib/cmd";

/**
 * Command-line flags:
 *      --afford        Limits the order to what you can afford with available cash
 *      --limit=#       Cuts the order of at the given number of augments
 *      --nfgs          Includes NFGs in the order; implies --afford
 *      --buy           Prompts and then potentially executes the purchase; implies --afford
 */

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const [raw, flags] = parseArgs(ns);
    const effCostMult = realCostMult(ns);
    const allAugs = getAugs(ns);
    let sequence = ["specials", "bb", "facrep", "combat"];
    if (raw.length > 0) {
        if (raw[0] === "+") {
            sequence = [...sequence, ...raw.slice(1)];
        } else {
            sequence = [...raw];
        }
        if (sequence[sequence.length - 1] === "*") {
            sequence.pop();
            sequence = [...sequence, ...Object.keys(allAugs).filter(cat => (! sequence.includes(cat)) && (cat !== "nfg"))];
        }
    }
    let costLimit = false;
    if ( (flags.has("afford")) || (flags.has("nfgs")) || (flags.has("buy")) ) {
        costLimit = true;
    }
    let order = assess(ns, sequence, costLimit, effCostMult);
    if (flags.has("limit")) {
        const limit = flags.get("limit");
        if ( (limit !== undefined) && (limit !== null) ) {
            const num = parseInt(limit, 10);
            if (num === undefined) {
                throw new Error(`Error converting ${limit} to an integer`);
            }
            if (order.length > num) {
                order = order.slice(0, num);
            }
        }
    }

    const [price, mult] = priceOrder(order, effCostMult);
    ns.tprint(`Sequence: ${sequence.join(", ")}`);
    ns.tprint(JSON.stringify(order, null, 2));
    ns.tprint(`Total augs: ${order.length}`);
    ns.tprint(`Total cost: ${ns.formatNumber(price, 2)}`);

    let nfgCost = 0;
    let nfgNum = 0;
    if (flags.has("nfgs")) {
        const [faction, num, cost] = countNfgs(ns, effCostMult, ns.getServerMoneyAvailable("home") - price, mult);
        nfgCost = cost;
        nfgNum = num;
        ns.tprint(`Could then purchase ${num} NFGs from ${faction} for $${ns.formatNumber(cost, 2)}`)
    }

    if (flags.has("buy")) {
        let prompt = `About to spend $${ns.formatNumber(price + nfgCost, 2)} on ${order.length + nfgNum} augments${nfgNum > 0 ? ", including NFGs" : ""}.`;
        prompt += "\nDo you wish to proceed?";
        const answer = await ns.prompt(prompt);
        if (answer) {
            for (const aug of order) {
                const success = ns.singularity.purchaseAugmentation(aug.faction, aug.name);
                if (! success) {
                    ns.tprint(`ERROR Could not purchase ${aug.name} from ${aug.faction}. Aborting.\n${JSON.stringify(aug)}`);
                    ns.exit();
                }
            }
            if (flags.has("nfgs")) {
                const bestFaction = allAugs["nfg"].map(x => x.faction).sort((a, b) => ns.singularity.getFactionRep(b) - ns.singularity.getFactionRep(a))[0];
                while (true) {
                    const success = ns.singularity.purchaseAugmentation(bestFaction, "NeuroFlux Governor");
                    if (! success) { break; }
                    await ns.sleep(500);
                }
                ns.tprint("Purchase complete!");
            }
        } else {
            ns.tprint("Aborting purchase.");
        }
    }
}

export const realCostMult = (ns: NS): number => {
    const srcs = ns.singularity.getOwnedSourceFiles();
    const eleven = srcs.filter(x => x.n === 11)[0];
    if (eleven !== undefined) {
        const eff = COST_MULT * [1, 0.96, 0.94, 0.93][eleven.lvl];
        ns.tprint(`Effective cost multiplier: ${eff}`);
        return eff;
    } else {
        return COST_MULT;
    }
}
