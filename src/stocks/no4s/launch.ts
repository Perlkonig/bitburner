import { NS } from "@ns";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	ns.exec("/stocks/no4s/common.js", "home");
	await ns.sleep(500);
	ns.exec("/stocks/no4s/fit.js", "home");
	await ns.sleep(500);
	ns.exec("/stocks/no4s/trade.js", "home")
	await ns.sleep(500);
}
