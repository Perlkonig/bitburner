import { NS } from "@ns";
import { countNfgs } from "augs/lib";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    const [faction, num, cost] = countNfgs(ns);
    ns.tprint(`Can afford to buy ${num} NFGs from ${faction} for a total of ${ns.formatNumber(cost, 2)}`);
}

