import { NS } from "@ns";
import { findServer } from "lib/network";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	if (ns.args.length === 1) {
		const target = ns.args[0] as string;
        const path = findServer(ns, target);
        if (path.length > 0) {
            let connectString = "";
            for (const server of path) {
                connectString += `connect ${server};`;
            }
            ns.tprint(path.join(" | "));
            ns.tprint(connectString);
        } else {
            ns.tprint("No path found.");
        }
	} else {
		ns.tprint("Usage: specify target server like: backdoor CSEC");
	}
}

