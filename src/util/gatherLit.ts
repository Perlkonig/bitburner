import { NS } from "@ns";
import { listServers } from "lib/network";

/** @param {NS} ns */
export async function main(ns: NS) {
	const servers = listServers(ns);

	// Do the following process for every server in the list
	for (const server of servers) {
		if (server === "home") { continue; }
        const files = ns.ls(server, ".lit");
		ns.tprint(`Found ${files}`);
        ns.scp(files, "home", server);
	}
	ns.tprint("DONE!");
}