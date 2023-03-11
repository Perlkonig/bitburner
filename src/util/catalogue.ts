import { NS } from "@ns";
import { listServers } from "lib/network";

/** @param {NS} ns */
export async function main(ns: NS) {
	const servers = listServers(ns);

	// Do the following process for every server in the list
    const black = ["hack.js", "grow.js", "weaken.js"];
    const catalogue: {[key: string]: string[]} = {};
	for (const server of servers) {
		if (server === "home") { continue; }
        const files = ns.ls(server).filter(x => ! black.includes(x));
        catalogue[server] = files;
	}
    ns.write("catalogue.txt", JSON.stringify(catalogue, null, 2), "w");
	ns.tprint("DONE!");
}