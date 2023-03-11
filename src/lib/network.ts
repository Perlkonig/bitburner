import { NS } from "@ns";

export function listServers(ns: NS, host = "home") {
    const servers = new Set([host]);
    scanAll(ns, host, servers);
    return [...servers];
}

export function scanAll(ns: NS, host: string, servers: Set<string>) {
    const hosts = ns.scan(host);
    for (let i = 0; i < hosts.length; i++) {
        if (!servers.has(hosts[i])) {
            servers.add(hosts[i]);
            scanAll(ns, hosts[i], servers);
        }
    }
}

// scan all servers from home and nuke them if we can
export function scanAndNuke(ns: NS) {
    const servers = new Set(["home"]);
    scanAll(ns, "home", servers);
    const accessibleServers = new Set();
    for (const server of servers) {
        if (server.startsWith("hacknet-node")) { continue; } // for BitNode 9 to permit hacking on the Hacknet Servers
        if (ns.hasRootAccess(server)) {
            accessibleServers.add(server)
        } else {
            let portOpened = 0;
            if (ns.fileExists("BruteSSH.exe")) {
                ns.brutessh(server);
                portOpened++;
            }
            if (ns.fileExists("FTPCrack.exe")) {
                ns.ftpcrack(server);
                portOpened++;
            }
            if (ns.fileExists("HTTPWorm.exe")) {
                ns.httpworm(server);
                portOpened++;
            }
            if (ns.fileExists("relaySMTP.exe")) {
                ns.relaysmtp(server);
                portOpened++;
            }
            if (ns.fileExists("SQLInject.exe")) {
                ns.sqlinject(server);
                portOpened++;
            }
            if (ns.getServerNumPortsRequired(server) <= portOpened) {
                ns.nuke(server);
                accessibleServers.add(server);
            }
        }
    }
    return accessibleServers;
}
