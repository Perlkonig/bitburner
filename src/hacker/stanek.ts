import { NS } from "@ns";
import { BoxNode } from "../../MyTypes";
import { sidebar, createSidebarItem/*, createBox*/ } from "lib/box/box";
// import { seconds2string } from "./lib/time";

// hack severs for this much of their money
// the money ratio is increased and decreased automatically, starting with this value initially
let hackMoneyRatio = 0.1;

// time to wait between checking and calculating new attacks (in ms)
const waitTimeBetweenManagementCycles = 1000;

// RAM requirement of the slave scripts for weak, grow & hack
// actually it's 1.7 for hack and 1.75 for weak & grow. Let's always use 1.75 for simpicity
// hard-coded to save RAM by not having to get ram via ns function
const slaveScriptRam = 1.75;

// names of the slave scripts
const weakenScriptName = "/helpers/weaken.js";
const growScriptName = "/helpers/grow.js";
const hackScriptName = "/helpers/hack.js";
const shareScriptName = "/helpers/share.js";
// const shareScriptRam = 4;
const stanekScriptName = "/helpers/stanek.js";
const stanekScriptRam = 7;

// list of slave script files
const files = [weakenScriptName, growScriptName, hackScriptName, shareScriptName, stanekScriptName];

// Backdoor script hooked in (requires singluarity functions SF4.1)
const singularityFunctionsAvailable = true;
const backdoorScript = "helpers/backdoor.js"
const backdoorScriptRam = 5.8;

// Solve Contract Script hooked in
const solveContractsScript = "contracts.js";
const solveContractsScriptRam = 23.4;

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    // Disable default Logging
    ns.disableLog("ALL");

    const boxRam = createSidebarItem("RAM (Stanek)", "<p>Loading...</p>", "\ueabe") as BoxNode;
    // const boxAttacks = createBox("Attacks", "<p>Loading...</p>", "\ueb01") as BoxNode;

    // automatically backdoor these servers. Requires singularity functions.
    const backdoorServers = new Set(["CSEC", "I.I.I.I", "avmnite-02h", "run4theh111z", "clarkinc", "nwo", "omnitek", "fulcrumtech", "fulcrumassets", "w0r1d_d43m0n"]);

    let servers: Set<string>;
    let freeRams: IFreeRams;

    // initially set hackMoneyRatio based on progress measured by home server RAM
    const homeRam = ns.getServerMaxRam("home");
    if (homeRam >= 65536) {
        hackMoneyRatio = 0.99;
        ns.tprint("Increase hackMoneyRatio to " + hackMoneyRatio)
    }
    else if (homeRam >= 16384) {
        hackMoneyRatio = 0.9;
        ns.tprint("Increase hackMoneyRatio to " + hackMoneyRatio)
    }
    else if (homeRam > 8192) {
        hackMoneyRatio = 0.5;
        ns.tprint("Increase hackMoneyRatio to " + hackMoneyRatio)
    }
    else if (homeRam > 2048) {
        hackMoneyRatio = 0.2;
        ns.tprint("Increase hackMoneyRatio to " + hackMoneyRatio)
    }
    ns.print("INFO initial hack money ratio: " + hackMoneyRatio);

    while (true) {
        if ( (sidebar !== null) && (! sidebar.contains(boxRam)) ) {
            ns.exit();
        }

        // scan and nuke all accesible servers
        servers = await scanAndNuke(ns);
        // ns.print(`servers:${[...servers.values()]}`)

        for (const server of servers) {
            // transfer files to the servers
            ns.scp(files, server);
            // ToDo: Not efficient to loop through all servers always. Could be optimized to track which server was optimized and scp only once.

            // backdoor faction servers automatically requires singularity module
            // modify singularityFunctionsAvailable at the top to de-/activate
            if (singularityFunctionsAvailable == true) {
                for (const backdoorServer of backdoorServers.values()) {
                    if ( (ns.fileExists("/pragmas/Stay.txt", "home")) && (backdoorServer.startsWith("w0")) ) {
                        continue;
                    }
                    if (server == backdoorServer) {
                        if (ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel()) {
                            const homeMaxRam = ns.getServerMaxRam("home");
                            const homeUsedRam = ns.getServerUsedRam("home")
                            const homeFreeRam = homeMaxRam - homeUsedRam;
                            if (homeFreeRam >= backdoorScriptRam) {
                                const backdoorSuccess = ns.exec(backdoorScript, "home", 1, server);
                                ns.print("INFO backdoor on " + server + " - " + backdoorSuccess);
                                backdoorServers.delete(backdoorServer);
                            }
                        }
                    }
                }
            }
        }

        // find servers with free RAM and calculate free RAM for each plus overall available RAM
        freeRams = getFreeRam(ns, servers);
        //ns.tprint(`freeRams:${freeRams.map(value => JSON.stringify(value))}`)
        const body = `
            <p>Free: ${ns.formatRam(freeRams.overallFreeRam, 2)} / ${ns.formatRam(freeRams.overallMaxRam, 2)}</p>
            <progress max="${freeRams.overallMaxRam}" value="${freeRams.overallFreeRam}"></progress>
        `;
        boxRam.body.innerHTML = body;
        boxRam.recalcHeight();

        // Hook for solve contracts script here if enough RAM is free.
        const homeMaxRam = ns.getServerMaxRam("home");
        const homeUsedRam = ns.getServerUsedRam("home")
        const homeFreeRam = homeMaxRam - homeUsedRam;
        if (homeFreeRam > solveContractsScriptRam) {
            if (! ns.fileExists("/pragmas/NoContracts.txt", "home")) {
                // ns.print("INFO checking for contracts to solve");
                ns.exec(solveContractsScript, "home");
            } else {
                ns.print(`WARN Contract checking disabled by pragma.`)
            }
        }

        for (const server of servers) {
            const maxRam = ns.getServerMaxRam(server);
            const usedRam = ns.getServerUsedRam(server)
            const freeRam = maxRam - usedRam;
            const stanekThreads = Math.floor(freeRam / stanekScriptRam);
            if (stanekThreads > 0) {
                ns.print("INFO share threads " + stanekThreads);
                ns.exec(stanekScriptName, server, stanekThreads);
                freeRams.overallFreeRam -= stanekThreads * stanekScriptRam;
            }
        }

        // if lots of RAM to spare and money is not an issue, spam weak attacks for hacking XP gain
        // if (ramUsage < 0.8 && hackMoneyRatio >= 0.99) {
            // xpWeaken(ns, freeRams, servers, targets);
            // ramUsage = (freeRams.overallMaxRam - freeRams.overallFreeRam) / freeRams.overallMaxRam;
        // }

        //ns.print("INFO RAM utilization: " + Math.round(ramUsage * 100) + " % ");

        await ns.sleep(waitTimeBetweenManagementCycles);
    }
}

interface IFreeRam {
    host: string;
    freeRam: number;
}

interface IFreeRams {
    serverRams: IFreeRam[];
    overallFreeRam: number;
    overallMaxRam: number;
}

// filter the list for servers where we can run script on
function getFreeRam(ns: NS, servers: Set<string>): IFreeRams {
    const serverRams: IFreeRam[] = [];
    let overallFreeRam = 0;
    let overallMaxRam = 0;

    let homeEntry: IFreeRam | undefined = undefined;
    for (const server of servers) {
        const maxRam = ns.getServerMaxRam(server);
        const usedRam = ns.getServerUsedRam(server)
        let freeRam = maxRam - usedRam;
        // round down to full hack slots
        freeRam = Math.floor(freeRam / slaveScriptRam) * slaveScriptRam
        overallMaxRam += maxRam;
        if (freeRam >= slaveScriptRam) {
            if (server === "home") {
                homeEntry = { host: server, freeRam };
            } else {
                serverRams.push({ host: server, freeRam });
            }
            overallFreeRam += freeRam;
        }
    }
    // deploy threads on servers with lots of free RAM first
    serverRams.sort((a, b) => b.freeRam - a.freeRam);
    if (homeEntry !== undefined) {
        serverRams.push(homeEntry);
    }

    return { serverRams, overallFreeRam, overallMaxRam };
}

// scan all servers from home and nuke them if we can
async function scanAndNuke(ns: NS): Promise<Set<string>> {
    const servers = new Set<string>(["home"]);
    scanAll(ns, "home", servers);
    const accessibleServers = new Set<string>();
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

function scanAll(ns: NS, host: string, servers: Set<string>) {
    const hosts = ns.scan(host);
    for (let i = 0; i < hosts.length; i++) {
        if (!servers.has(hosts[i])) {
            servers.add(hosts[i]);
            scanAll(ns, hosts[i], servers);
        }
    }
}

