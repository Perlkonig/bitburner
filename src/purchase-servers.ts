import { NodeStats, NS } from "@ns";
import { createSidebarItem, sidebar } from "lib/box/box";
import { BoxNode } from "../MyTypes";

/**
 * At any moment, my options are as follows:
 *   - Buy a new server
 *   - Buy a new hacknet
 *   - Upgrade an existing server
 *   - Upgrade an existing hacknet to target level
 *
 * Set a RAM target
 * Look at all possible options and choose the cheapest one
 * Execute if possible
 *
*/

interface IOption {
    action: "buy" | "upgrade";
    serverType: "purchased" | "hacknet";
    serverIndex?: number | string;
    cost: number;
}

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

	const serverLimit = ns.getPurchasedServerLimit();
    const constsHN = ns.formulas.hacknetServers.constants();

    // Create initial box
    const box: BoxNode = createSidebarItem("Servers", `<p>Loading...</p>`, "\ueb50") as BoxNode;

	let ramTarget = calcRamTarget(ns);
	ns.tprint("Initial RAM tier: " + ns.formatNumber(ramTarget, 2));
	while (! allServersMaxed(ns)) {
        if ((sidebar === null) || (!sidebar.contains(box))) {
            ns.exit();
        }

        // assemble options
        const options: IOption[] = [];
        // new purchased server
        const ownedPurchased = ns.getPurchasedServers();
        if (ownedPurchased.length < serverLimit) {
            const cost = ns.getPurchasedServerCost(ramTarget);
            options.push({
                action: "buy",
                serverType: "purchased",
                cost
            });
        }
        // Upgrade an existing purchased server
        // But upgrade the smallest servers first
        if (ownedPurchased.length > 0) {
            const smallestSize = Math.min(...ownedPurchased.map(s => ns.getServerMaxRam(s)));
            if (smallestSize < ramTarget) {
                const smallestOwned = ownedPurchased.filter(s => ns.getServerMaxRam(s) === smallestSize);
                for (const server of smallestOwned) {
                    const cost = ns.getPurchasedServerUpgradeCost(server, ramTarget);
                    options.push({
                        action: "upgrade",
                        serverType: "purchased",
                        serverIndex: server,
                        cost
                    });
                }
            }
        }
        // Buy a new hacknet server
        const ownedHN = ns.hacknet.numNodes();
        if (ownedHN < constsHN.MaxServers) {
            let cost = ns.hacknet.getPurchaseNodeCost();
            const power = Math.round(Math.log2(ramTarget));
            cost += ns.formulas.hacknetServers.ramUpgradeCost(1, power);
            options.push({
                action: "buy",
                serverType: "hacknet",
                cost
            });
        }
        // Upgrade a hacknet server
        // But upgrade smallest ones first
        if (ownedHN > 0) {
            let smallestSize = Infinity;
            for (let i = 0; i < ownedHN; i++) {
                const hn = ns.hacknet.getNodeStats(i);
                smallestSize = Math.min(smallestSize, hn.ram);
            }
            const hns: [number, NodeStats][] = [];
            for (let i = 0; i < ownedHN; i++) {
                const hn = ns.hacknet.getNodeStats(i);
                if (hn.ram === smallestSize) {
                    hns.push([i, hn]);
                }
            }
            for (const [idx, stats] of hns) {
                const currPower = Math.round(Math.log2(stats.ram));
                const targetPower = Math.round(Math.log2(ramTarget));
                if (currPower < targetPower) {
                    const cost = ns.hacknet.getRamUpgradeCost(idx, targetPower - currPower);
                    options.push({
                        action: "upgrade",
                        serverType: "hacknet",
                        serverIndex: idx,
                        cost
                    });
                }
            }
        }

        // sort options by ascending cost
        let cheapest: IOption | undefined = undefined;
        if (options.length > 0) {
            options.sort((a, b) => a.cost - b.cost);
            cheapest = options[0];

            // Double the price to keep a buffer of cash
            if (ns.getServerMoneyAvailable("home") > cheapest.cost * 2) {
                if (cheapest.action === "buy") {
                    if (cheapest.serverType === "purchased") {
                        const result = ns.purchaseServer(`pserv-${ownedPurchased.length}`, ramTarget);
                        if (result === "") {
                            ns.tprint(`For some reason we could not purchase a new server with ${ns.formatNumber(ramTarget, 2)} RAM.`);
                        } else {
                            ns.tprint(`Purchased server "${result}" with ${ns.formatNumber(ramTarget, 2)} RAM.`)
                        }
                    } else {
                        const idx = ns.hacknet.purchaseNode();
                        if (idx === -1) {
                            ns.tprint(`Unable to buy new Hacknet server.`)
                        } else {
                            const targetPower = Math.round(Math.log2(ramTarget));
                            const success = ns.hacknet.upgradeRam(idx, targetPower);
                            if (! success) {
                                ns.tprint(`Unable to upgrade newly acquired Hacknet server #${idx} ${targetPower} times to ${ns.formatNumber(ramTarget, 2)} RAM.`);
                            } else {
                                ns.tprint(`Purchased a new Hacknet server (#${idx}) and upgraded it ${targetPower} times to ${ns.formatNumber(ramTarget, 2)} RAM.`);
                            }
                        }
                    }
                } else {
                    if (cheapest.serverType === "purchased") {
                        if (cheapest.serverIndex === undefined) {
                            throw new Error("INTERNAL: Server index not provided.");
                        }
                        if (typeof cheapest.serverIndex !== "string") {
                            throw new Error("INTERNAL: Non-string passed as server index.");
                        }
                        const success = ns.upgradePurchasedServer(cheapest.serverIndex, ramTarget);
                        if (! success) {
                            ns.tprint(`Failed to upgrade server "${cheapest.serverIndex}" to ${ns.formatNumber(ramTarget, 2)} RAM.`);
                        }
                    } else {
                        if (cheapest.serverIndex === undefined) {
                            throw new Error("INTERNAL: Server index not provided.");
                        }
                        if (typeof cheapest.serverIndex !== "number") {
                            throw new Error("INTERNAL: Non-numeric passed as server index.");
                        }
                        const stats = ns.hacknet.getNodeStats(cheapest.serverIndex);
                        const currPower = Math.round(Math.log2(stats.ram));
                        const targetPower = Math.round(Math.log2(ramTarget));
                        const delta = targetPower - currPower;
                        const success = ns.hacknet.upgradeRam(cheapest.serverIndex, delta);
                        if (! success) {
                            ns.tprint(`Unable to upgrade Hacknet server #${cheapest.serverIndex} ${delta} times to ${ns.formatNumber(ramTarget, 2)} RAM.`);
                        } else {
                            ns.tprint(`Upgraded Hacknet server #${cheapest.serverIndex} ${delta} times to ${ns.formatNumber(ramTarget, 2)} RAM.`);
                        }
                    }
                }
            }

            ramTarget = calcRamTarget(ns);
        } else {
            ns.tprint(`No apparent paths to target RAM ${ramTarget}. Doubling.`);
            ramTarget *= 2;
        }

        renderTail(ns, box, cheapest);
		await ns.sleep(5 * 1000);
	}
	ns.tprint("All purchased servers at maximum RAM. Exiting script.");
    if (sidebar !== null) {
        sidebar.removeChild(box);
    }
}

const renderTail = (ns: NS, box: BoxNode, cheapest: IOption | undefined): void => {
    const ownedPurchased = ns.getPurchasedServers();
    const maxPurchased = ns.getPurchasedServerLimit();
    const ownedHN = ns.hacknet.numNodes();
    const maxOwnedHN = ns.hacknet.maxNumNodes();
    const totalRam = totalOwnedRam(ns);
    const maxRam = totalMaxRam(ns);
    const totalHashes = ns.hacknet.numHashes();
    const maxHashes = ns.hacknet.hashCapacity();

    if (totalHashes / maxHashes > 0.9) {
        ns.toast(`Hacknet hashes over 90% full! Spend!`, "warning", null);
    }

    let bodyStr = `
    <p>Purchased: ${ownedPurchased.length} / ${maxPurchased}</p>
    <progress max="${maxPurchased}" value="${ownedPurchased.length}"></progress>
    <p>Hacknet: ${ownedHN} / ${maxOwnedHN}</p>
    <progress max="${maxOwnedHN}" value="${ownedHN}"></progress>
    <p>RAM: ${ns.formatRam(totalRam, 1)} / ${ns.formatRam(maxRam, 1)}</p>
    <progress max="${maxRam}" value="${totalRam}"></progress>
    <p>Hashes: ${ns.formatNumber(totalHashes, 2)} / ${maxHashes}</p>
    <progress max="${maxHashes}" value="${totalHashes}"></progress>
    <p>RAM Target: ${ns.formatRam(calcRamTarget(ns), 1)}</p>
    `;

    if (cheapest !== undefined) {
        bodyStr += `<p>Cheapest option: $${ns.formatNumber(cheapest.cost, 2)}</p>`;
    }

    box.body.innerHTML = bodyStr;
    box.recalcHeight();
}

const purchasedServersMaxed = (ns: NS): boolean => {
    // Own all purchased servers
    const owned = ns.getPurchasedServers();
    const maxOwned = ns.getPurchasedServerLimit();
    if (owned.length === maxOwned) {
        // all purchased servers at max ram
        let maxed = true;
        for (const server of owned) {
            if (ns.getServerMaxRam(server) < ns.getPurchasedServerMaxRam()) {
                maxed = false;
                break;
            }
        }
        if (maxed) {
            return true;
        }
    }
    return false;
}

const hacknetServersMaxed = (ns: NS): boolean => {
    // Own all hacknet servers
    const ownedHN = ns.hacknet.numNodes();
    const maxOwnedHN = ns.hacknet.maxNumNodes();
    const constants = ns.formulas.hacknetServers.constants();
    if (ownedHN === maxOwnedHN) {
        // all hacknet servers at max ram
        let maxed = true;
        for (let i = 0; i < ownedHN; i++) {
            const hn = ns.hacknet.getNodeStats(i);
            if (hn.ram < constants.MaxRam) {
                maxed = false;
                break;
            }
        }
        if (maxed) {
            return true;
        }
    }
    return false;
}

const allServersMaxed = (ns: NS): boolean => {
    return purchasedServersMaxed(ns) && hacknetServersMaxed(ns);
}

const totalMaxRam = (ns: NS): number => {
    let total = 0;
    total += ns.getPurchasedServerLimit() * ns.getPurchasedServerMaxRam();
    const maxOwnedHN = ns.hacknet.maxNumNodes();
    const constants = ns.formulas.hacknetServers.constants();
    total += maxOwnedHN * constants.MaxRam;
    return total;
}

const totalOwnedRam = (ns: NS): number => {
    let total = 0;
    for (const server of ns.getPurchasedServers()) {
        total += ns.getServerMaxRam(server);
    }
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        const hn = ns.hacknet.getNodeStats(i);
        total += hn.ram;
    }
    return total;
}

const calcRamTarget = (ns: NS): number => {
    let target = ns.getServerMaxRam("home") / 2;
    const percentOwned = totalOwnedRam(ns) / totalMaxRam(ns);
    target *= Math.pow(2, Math.floor(percentOwned / 0.25));
    const maxes: number[] = [];
    if (! purchasedServersMaxed(ns)) {
        maxes.push(ns.getPurchasedServerMaxRam());
    }
    if (! hacknetServersMaxed(ns)) {
        const constants = ns.formulas.hacknetServers.constants();
        maxes.push(constants.MaxRam);
    }
    const limit = Math.min(...maxes);
    if (target > limit) {
        target = limit;
    }
    return target;
}
