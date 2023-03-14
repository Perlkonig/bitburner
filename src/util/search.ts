import { NS } from "@ns";
import { listServers } from "lib/network";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	const searchStr = ns.args[0] as string;
	const servers = listServers(ns);
	ns.tprint(servers.filter(x => x.toLowerCase().includes(searchStr.toLowerCase())));
}