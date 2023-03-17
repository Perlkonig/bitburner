// 122.30 GB
// 117.30 GB
import { CrimeStats, CrimeType, FactionWorkType, Player } from "@ns";
import { BoxNode, MyNS } from "../MyTypes";
import { createSidebarItem, sidebar, doc } from "lib/box/box";
import { evaluateStocks } from "stocks.js";
import { dumplog } from "lib/logs";
import { seconds2string } from "lib/time";

const studyUntilHackLevel = 50;

const megaCorps = ["Clarke Incorporated", "Bachman & Associates", "OmniTek Incorporated", "NWO", "Fulcrum Secret Technologies", "Blade Industries", "ECorp", "MegaCorp", "KuaiGong International", "Four Sigma"];

const cityFactions = ["Sector-12", "Chongqing", "New Tokyo", "Ishima", "Aevum", "Volhaven"];

const crimes: CrimeType[] = ["Shoplift", "RobStore", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassination", "Heist"] as CrimeType[];

const ignoreFactionAugs = new Map([
	["CyberSec", 'Cranial Signal Processors - Gen II'],
	["NiteSec", 'DataJack'],
	["The Black Hand", 'Embedded Netburner Module Core Implant'],
	["Sector-12", 'Neuralstimulator'],
])

interface IPurchaseOrder {
    augment: string;
    cost: number;
    faction: string;
    repNeeded: number;
}

let netWorth = 0;
let globalStatus = "";

/** @param {MyNS} ns **/
export async function main(ns: MyNS): Promise<void> {
	ns.disableLog("ALL");

    const boxFactions: BoxNode = createSidebarItem("Factions", "<p>Loading...</p>", "\ueaad") as BoxNode;
    const boxPlayer: BoxNode = createSidebarItem("Status", "<p>Loading...</p>", "\ueb99") as BoxNode;


    while (true) {
        if ( (sidebar !== null) && ( (! sidebar.contains(boxFactions)) || (! sidebar.contains(boxPlayer)) ) ) {
            if (! sidebar.contains(boxFactions)) {
                sidebar.removeChild(boxFactions);
            }
            if (! sidebar.contains(boxPlayer)) {
                sidebar.removeChild(boxPlayer);
            }
            ns.exit();
        }

		let sleepTime = 5000;
		const player = ns.getPlayer();
		netWorth = player.money + evaluateStocks(ns);

        getPrograms(ns, player);

        joinFactions(ns);

        await buyAugments(ns, player);

        upgradeHomeServer(ns, player);

        const factionsForReputation = getFactionsForReputation(ns, player);
		ns.print("Factions for Reputation: " + [...factionsForReputation.keys()]);

        const actionUseful = currentActionUseful(ns, player, factionsForReputation);
		ns.print("Current action useful: " + actionUseful);

        if (!actionUseful) {
			sleepTime = chooseAction(ns, sleepTime, player, factionsForReputation);
		}

		const currWork = ns.singularity.getCurrentWork();
		if (currWork !== null) {
			ns.print("WorkFactionName: " + currWork.factionName);
			// ns.print("WorkFactionDescription: " + player.currentWorkFactionDescription)
			ns.print("workType: " + currWork.type);
			ns.print("companyName: " + currWork.companyName);
			ns.print("jobs: " + JSON.stringify(player.jobs));
			ns.print(`net worth: ${ns.formatNumber(netWorth, 1)}`);
		}

		//ns.print("Corps to work for: " + getCorpsForReputation(factionsForReputation))
		ns.print("sleep for " + sleepTime + " ms")

        renderBoxes(ns, boxFactions, boxPlayer);
		await ns.sleep(sleepTime);
    }
}

const renderBoxes = (ns: MyNS, factionBox: BoxNode, playerBox: BoxNode): void => {
    // Factions
    let facBody = "";
    const player = ns.getPlayer();
    const factionsForReputation = getFactionsForReputation(ns, player);
    for (const [name, repRemaining] of factionsForReputation) {
        const gainRates = ns.formulas.work.factionGains(player, "hacking", ns.singularity.getFactionFavor(name));
        // seems a cycle is .2 ms, so RepGainRate * 5 is gain per second
        const reputationTimeRemaining = repRemaining / (gainRates.reputation * 5);
        // ns.print("Reputation remaining: " + ns.formatNumber(repRemaining, 1) + " in " + seconds2string(ns, reputationTimeRemaining));

        const rep = ns.singularity.getFactionRep(name);
        const maxrep = maxAugmentRep(ns, name);
        facBody += `<p>${name} (Max in ~${seconds2string(ns, reputationTimeRemaining)})</p><progress max="${maxrep}" value="${rep}">${ns.formatPercent(rep / maxrep, 2)}</progress>`;
    }
    factionBox.body.innerHTML = facBody;
    factionBox.recalcHeight();

    // Player
    playerBox.body.innerHTML = `<p>${globalStatus}</p>`;
    playerBox.recalcHeight();
}

const getPrograms = (ns: MyNS, player: Player) => {
	if (player.money > 1700000) {
		ns.singularity.purchaseTor();
	}
	else {
		return;
	}
	ns.singularity.purchaseProgram("BruteSSH.exe");
	ns.singularity.purchaseProgram("FTPCrack.exe");
	ns.singularity.purchaseProgram("relaySMTP.exe");
    ns.singularity.purchaseProgram("HTTPWorm.exe");
    ns.singularity.purchaseProgram("SQLInject.exe");
}

function joinFactions(ns: MyNS) {
	const newFactions = ns.singularity.checkFactionInvitations();
	for (const faction of newFactions) {
		if ( (!cityFactions.includes(faction)) && (maxAugmentRep(ns, faction) > 0) ) {
			ns.singularity.joinFaction(faction);
			ns.print("Joined " + faction);
		}
	}
}

function maxAugmentRep(ns: MyNS, faction: string) {
	const purchasedAugmentations = ns.singularity.getOwnedAugmentations(true);
	const augmentations = ns.singularity.getAugmentationsFromFaction(faction);
	const newAugmentations = augmentations.filter(val => !purchasedAugmentations.includes(val));

	if (newAugmentations.length > 0) {
		let maxReputationRequired = 0;
		for (const augmentation of newAugmentations) {
			if (ignoreFactionAugs.has(faction)) {
				if (ignoreFactionAugs.get(faction) == augmentation) {
					// ignore some augmentations which we want to buy from later factions
					//ns.print("Ignore aug " + augmentation + " for faction " + faction)
					continue;
				}
			}
			maxReputationRequired = Math.max(maxReputationRequired, ns.singularity.getAugmentationRepReq(augmentation));
		}
		return maxReputationRequired;
	}
	return 0;
}

/*
 * Only buy augments in one of two scenarios:
 *   - When you can afford all of the augments of a single faction
 *   - When you have enough reputation that you can donate for rep in the next run
 * This function also installs the purchased augments immediately, resetting the run.
 */
const buyAugments = async (ns: MyNS, player: Player) => {
	// Get list of joined factions and the remaining rep needed to buy desired/available augments
	const replist: [string, number][] = [];
	for (const faction of player.factions) {
		const maxRep = maxAugmentRep(ns, faction);
		if (maxRep > 0) {
			replist.push([faction, maxRep - ns.singularity.getFactionRep(faction)]);
		}
	}
	// sort in ascending order
	replist.sort((a, b) => { return a[1] - b[1]; })

	// If the smallest "reputation needed" value is >=0, then do the favour tests
	if ( (replist.length > 0) && (replist[0][1] >= 0) ) {
		let faction = replist[0][0];
		const currWork = ns.singularity.getCurrentWork();
		if ( (currWork !== null) && (currWork.factionName !== undefined) ) {
			if (currWork.factionName !== faction) {
				faction = currWork.factionName;
			}
		}

		// If we can already donate, make a 10% donation.
		if (ns.singularity.getFactionFavor(faction) >= ns.getFavorToDonate()) {
			if (! ns.fileExists("pragma_NoDonations.txt")) {
				const factor = 0.1;
				const donation = ns.getServerMoneyAvailable("home") * factor;
				const success = ns.singularity.donateToFaction(faction, donation);
				if (success) {
					ns.print(`INFO Donated $${ns.formatNumber(donation, 1)} to faction "${faction}"`);
                    globalStatus = `Donated $${ns.formatNumber(donation, 1)} to faction "${faction}"`;
				} else {
					ns.print(`ERROR Unable to donate $${ns.formatNumber(donation, 1)} to faction "${faction}".`);
				}
			} else {
				ns.print(`WARN Able to donate to faction, but prevented by pragma.`);
			}
		// If we have accrued enough rep that resetting would allow us to donate next run, then let's reset.
		} else {
			const potentialFavor = ns.singularity.getFactionFavor(faction) + ns.singularity.getFactionFavorGain(faction);
			if (potentialFavor >= ns.getFavorToDonate())	 {
				// get purchase order
				const sortedAugmentations = getSortedPurchaseOrder(ns, faction);
				// make sure we can afford at least the first item on that list
				if ( (sortedAugmentations.length > 0) && (netWorth >= sortedAugmentations[0].cost) ) {
					// If so, buy all we can and reset
                    ns.tail();
                    globalStatus = "RESETTING";
					ns.print("INFO Reached favour threshold. Resetting early.");
					ns.print("Liquidating and buying augments.");
					await liquidateStocks(ns);

					// buy all the augments
					for (const po of sortedAugmentations) {
						const success = ns.singularity.purchaseAugmentation(faction, po.augment);
						if (! success) {
							ns.print(`Could not purchase the augment "${po.augment}" from faction "${po.faction}".`)
						} else {
							ns.print(`Purchased the augment "${po.augment}" from faction "${po.faction}".`)
						}
					}
					await reset(ns, player);
				} else if (sortedAugmentations.length > 0) {
					const needed = sortedAugmentations[0].cost - netWorth;
					const income = ns.getTotalScriptIncome()[0];
					let timeToEarn = 0;
					if (income> 0) {
						timeToEarn = needed / income;
					}

					ns.print(`INFO Favour threshold reached, but waiting until we have ${ns.formatNumber(sortedAugmentations[0].cost, 1)} (~${seconds2string(ns, timeToEarn)}).`)
                    globalStatus = `Favour threshold reached, but waiting until we have ${ns.formatNumber(sortedAugmentations[0].cost, 1)} (~${seconds2string(ns, timeToEarn)}).`
				} else {
					ns.print(`INFO Favour threshold reached, but waiting until we can purchase at least one augment.`);
                    globalStatus = `Favour threshold reached, but waiting until we can purchase at least one augment.`;
				}
			} else {
				ns.print(`INFO Favour for "${faction}" if we reset now: ${potentialFavor}.`);
                globalStatus = `Favour for "${faction}" if we reset now: ${potentialFavor}.`;
			}
		}
	// Otherwise, if less than zero, then we can just purchase as usual.
	} else {
		// We only want the list of factions for which we actually have the rep we need,
		// and we only need the faction names now.
		const factionNames = replist.filter(x => x[1] <= 0).map(x => x[0]);
		if (factionNames.length > 0) {
			// ns.print(`Assembling a purchase order for the following factions: ${JSON.stringify(factionNames)}`);
			// Now assemble and sort the purchase order
			const sortedAugmentations = getSortedPurchaseOrder(ns, ...factionNames);
			const overallAugmentationCost = pricePurchaseOrder(ns, [...sortedAugmentations]);
			// Need to capture rare edge case where Red Pill is the only augment to buy (zero cost)
			if ( (overallAugmentationCost > 0) || ( (sortedAugmentations.length === 1) && (sortedAugmentations[0].augment === "The Red Pill") ) ) {
				// If we can afford it, go for it
				// Consider the value of the stocks as well
				if (netWorth > overallAugmentationCost) {
                    ns.tail();
					ns.print("Liquidating and buying all augments.");
					// liquidate stocks if it hasn't happened already
					await liquidateStocks(ns);

					// buy all the augments
					let canReset = true;
					for (const po of sortedAugmentations) {
						const success = ns.singularity.purchaseAugmentation(po.faction, po.augment);
						if (! success) {
							canReset = false;
							ns.print(`Could not purchase the augment "${po.augment}" from faction "${po.faction}"! Halting the reset.`)
							ns.tprint(`Could not purchase the augment "${po.augment}" from faction "${po.faction}"! Halting the reset.`)
							ns.exit();
							break;
						}
					}

					if (canReset) {
						await reset(ns, player);
					}
				} else {
					const needed = overallAugmentationCost - netWorth;
					const income = ns.getTotalScriptIncome()[0];
					let timeToEarn = 0;
					if (income > 0) {
						timeToEarn = needed / income;
					}
					ns.print(`INFO Have enough reputation, but now need $${ns.formatNumber(overallAugmentationCost, 1)} (~${seconds2string(ns, timeToEarn)}).`);
                    globalStatus = `Have enough reputation to buy all augments, but now need $${ns.formatNumber(overallAugmentationCost, 1)} (~${seconds2string(ns, timeToEarn)}).`;
				}
			}
		}
	}
}

export const getSortedPurchaseOrder = (ns: MyNS, ...factions: string[]): IPurchaseOrder[] => {
	const sortedAugmentations: IPurchaseOrder[] = []; //[augment, cost, faction, rep]
	const purchasedAugmentations = ns.singularity.getOwnedAugmentations(true);
	for (const faction of factions) {
		const augmentations = ns.singularity.getAugmentationsFromFaction(faction);
		const newAugmentations = augmentations.filter(val => !purchasedAugmentations.includes(val));
		for (const augmentation of newAugmentations) {
			if (ignoreFactionAugs.get(faction) == augmentation) {
				// ignore some augmentations which we want to buy from later factions
				//ns.print("Ignore aug " + augmentation + " for faction " + faction)
				continue;
			}
			const repNeeded = ns.singularity.getAugmentationRepReq(augmentation);
			if (repNeeded <= ns.singularity.getFactionRep(faction)) {
                sortedAugmentations.push({
                    augment: augmentation,
                    cost: ns.singularity.getAugmentationPrice(augmentation),
                    faction,
                    repNeeded
                });
			}
		}
	}

	// costs are the second element in the 2d arrays
	sortedAugmentations.sort((a, b) => b.cost - a.cost);

	const orderedAugments: IPurchaseOrder[] = [];
	for (const po of sortedAugmentations) {
		// does this aug has prereqs
		const prereqs = ns.singularity.getAugmentationPrereq(po.augment).reverse();
		if (prereqs.length > 0) {
			for (const prereq of prereqs) {
				// is the prereq already owned
				if (purchasedAugmentations.includes(prereq)) {
					continue;
				// is it already in the final order
				} else if (orderedAugments.findIndex(x => x.augment === prereq) !== -1) {
					continue;
				} else {
					// is the prereq later in the PO
					const idx = sortedAugmentations.findIndex(x => x.augment === prereq);
					if (idx !== -1) {
						orderedAugments.push(sortedAugmentations[idx]);
					}
				}
			}
		}
		// is this aug already in the list
		if (orderedAugments.findIndex(x => x.augment === po.augment) !== -1) {
			continue;
		}

		orderedAugments.push(po);
	}
	return orderedAugments;
}

export const pricePurchaseOrder = (ns: MyNS, order: IPurchaseOrder[]) => {
	let augmentationCostMultiplier = 1;
	let overallAugmentationCost = 0;

	for (const po of order) {
		overallAugmentationCost += po.cost * augmentationCostMultiplier;
		augmentationCostMultiplier *= 1.9;
	}

	return overallAugmentationCost;
}

const liquidateStocks = async (ns: MyNS) => {
	ns.kill("purchase-servers.js", "home");
	const processes = ns.ps("home").map(p => p.filename);
	if (processes.includes("stocks.js")) {
		const port = ns.getPortHandle(20); // See `stocks.js` for explanation of port 20
		ns.print("Liquidating stocks");
		port.write("LIQUIDATE");
		while (port.empty() || port.peek() !== "DONE") {
			await ns.sleep(1000);
		}
		ns.print("Liquidation acknowledged");
		port.clear();
	}
}

// Put everything you want to do before reset here
const resetPrep = async (ns: MyNS, player: Player) => {
	// stocks are sold in advance of purchasing anything
    // But remove sidebar items
    if (sidebar !== null) {
        for (const child of sidebar.children) {
            sidebar.removeChild(child)
        }
    }

	// buy as many infinite augments as we can
	let replist: [string, number][] = [];
	for (const faction of player.factions) {
		replist.push([faction, ns.singularity.getFactionRep(faction)]);
	}
	// You can't buy NeuroFlux Governors from a gang faction.
	// If you have a gang, remove it from the list.
	if (ns.gang.inGang()) {
		const gang = ns.gang.getGangInformation();
		replist = replist.filter(f => f[0] !== gang.faction);
	}
	replist.sort((a, b) => {return b[1] - a[1];});
	const bestFaction = replist[0][0];
	while (true) {
		const augs = ns.singularity.getAugmentationsFromFaction(bestFaction).filter(x => x.startsWith("NeuroFlux Governor"));
		// ns.print(`Found ${augs.length} augs starting with "NeuroFlux Governor"`);
		if (augs.length !== 1) { break; }
		if (ns.getServerMoneyAvailable("home") >= ns.singularity.getAugmentationPrice(augs[0])) {
			const success = ns.singularity.purchaseAugmentation(bestFaction, augs[0]);
			if (success) {
				ns.print(`Purchased ${augs[0]}`);
			} else {
				break;
			}
		} else {
			break;
		}
		await ns.sleep(500);
	}

	// upgrade ram and cores as much as we can
	while (ns.getServerMoneyAvailable("home") > ns.singularity.getUpgradeHomeRamCost()) {
		ns.print("Upgrading home RAM");
		const success = ns.singularity.upgradeHomeRam();
		if (! success) { break; }
	}
	while (ns.getServerMoneyAvailable("home") > ns.singularity.getUpgradeHomeCoresCost()) {
		ns.print("Upgrading home cores");
		const success = ns.singularity.upgradeHomeCores();
		if (! success) { break; }
	}
}

// This is the code that actually performs the reset
const reset = async (ns: MyNS, player: Player) => {
	ns.print("About to reset!")
	ns.toast("About to reset!", "warning", 30000);
	// do all the pre-reset stuff you want to do
	await resetPrep(ns, player);
	dumplog(ns, "actions", "playerActions.js");

    // Kill everything and clear the sidebar (sometimes causes graphical glitches otherwise)
    ns.killall("home", true);
    if (sidebar !== null) {
        doc.body.removeChild(sidebar);
    }

	// reset
	if (ns.singularity.exportGameBonus()) {
		ns.singularity.exportGame();
	} else {
		await ns.sleep(10000);
	}
	ns.singularity.installAugmentations("go.js");
}

const upgradeHomeServer = (ns: MyNS, player: Player) => {
	if (player.money > ns.singularity.getUpgradeHomeRamCost()) {
		if (!player.factions.includes("CyberSec") || ns.singularity.getUpgradeHomeRamCost() < 2e9
			|| (ns.stock.has4SDataTIXAPI() && ns.singularity.getUpgradeHomeRamCost() < 0.2 * player.money)) {
			// Upgrade slowly in the first run while we save money for 4S or the first batch of augmentations
			// Assumption: We wont't join Cybersec after the first run anymore
			// ToDo: Beautification: At Max Home Server Ram, it still tries to upgrade RAM -> prevent that
			const success = ns.singularity.upgradeHomeRam();
			if (success) {
				ns.print("Upgraded Home Server RAM");
				ns.toast("Upgraded Home Server RAM");
			}
		}
	}
}

const getFactionsForReputation = (ns: MyNS, player: Player): Map<string, number> => {
	const factionsWithAugmentations = new Map<string, number>();
	for (const faction of player.factions) {
		const maxReputationRequired = maxAugmentRep(ns, faction);
		if (ns.singularity.getFactionRep(faction) < maxReputationRequired) {
			factionsWithAugmentations.set(faction, maxReputationRequired - ns.singularity.getFactionRep(faction));
		}
	}
	return factionsWithAugmentations;
}

const getCorpsForReputation = (ns: MyNS, factions: Map<string, number>) => {
	const corpsWithoutFaction = []
	for (const corp of megaCorps) {
		if (!factions.has(corp) && maxAugmentRep(ns, corp) > 0) {
			corpsWithoutFaction.push(corp);
		}
	}
	return corpsWithoutFaction;
}

const currentActionUseful = (ns: MyNS, player: Player, factions: Map<string, number>) => {
	const playerControlPort = ns.getPortHandle(3); // port 2 is hack
	const currWork = ns.singularity.getCurrentWork();
	if (currWork === null) {
		return false;
	} else {
		if (currWork.type === "FACTION") {
			if (factions.has(currWork.factionName)) {
				const repRemaining = factions.get(currWork.factionName); // - player.workRepGained;
				if ( (repRemaining !== undefined) && (repRemaining > 0) ) {
					// working for a faction needing more reputation for augmentations
					if (playerControlPort.empty() && currWork.factionWorkType == "hacking") {
						// only write to ports if empty
						ns.print("ns.share() to increase faction reputation");
						playerControlPort.write(1);

					}
					else if (playerControlPort.empty()) {
						// only write to ports if empty
						playerControlPort.write(0);
					}
					if (ns.fileExists("Formulas.exe")) {
						const gainRates = ns.formulas.work.factionGains(player, "hacking", ns.singularity.getFactionFavor(currWork.factionName));
						// seems a cycle is .2 ms, so RepGainRate * 5 is gain per second
						const reputationTimeRemaining = repRemaining / (gainRates.reputation * 5);
						ns.print("Reputation remaining: " + ns.formatNumber(repRemaining, 1) + " in " + seconds2string(ns, reputationTimeRemaining));
					}
					return true;
				}
				else {
					ns.print("Max Reputation @ " + currWork.factionName);
					ns.toast("Max Reputation @ " + currWork.factionName, "success", 5000);
					return false;
				}
			}
			else {
				if (playerControlPort.empty()) {
					// only write to ports if empty
					playerControlPort.write(0);
				}

			}

		}
		else { // not hacking for a faction
			if (playerControlPort.empty()) {
				// only write to ports if empty
				playerControlPort.write(0);
			}
		}
		if (currWork.type == "COMPANY" && currWork.companyName != "") {
			// for unknown reasons it might happen to have the work type "working for company" without actually working for one
			// just to make sure, also check that we have a company.

			const reputationGoal = 200000; // 200 but some is lost when stop working ; 266667
			// ToDo: except fulcrum + 66.666 k and bachman not hacked

			const reputation = ns.singularity.getCompanyRep(currWork.companyName); // + (player.workRepGained * 3 / 4);
			ns.print("Company reputation: " + ns.nFormat(reputation, "0a"));
			if (reputation > reputationGoal) { return false; }
			if (factions.has(currWork.companyName)) {
				return false;
			}
			applyForPromotion(ns, player, currWork.companyName);
			return true;
		}
		if (currWork.type == "CLASS") {
			if (ns.getHackingLevel() < studyUntilHackLevel) {
				return true;
			}
		}
	}
	return false;
}

const applyForPromotion = (ns: MyNS, player: Player, corp: string): boolean => {

	const career = "it"

	const success = ns.singularity.applyToCompany(corp, career);

	if (success) {
		ns.toast("Got a company promotion!");
	}
	return ns.singularity.workForCompany(corp, ns.singularity.isFocused());
}

const chooseAction = (ns: MyNS, sleepTime: number, player: Player, factionsAll: Map<string,number>): number => {
	// Ignore gang faction in calculation
	const factions = new Map(factionsAll);
	if (ns.gang.inGang()) {
		const gang = ns.gang.getGangInformation();
		if (factions.has(gang.faction)) {
			factions.delete(gang.faction);
		}
	}

	const focus = ns.singularity.isFocused();

	if (ns.getHackingLevel() < studyUntilHackLevel) {
		ns.singularity.universityCourse("rothman university", "Study Computer Science", focus);
	}
	else if (factions.size > 0) {
		// pick the faction with the least needed rep
		const sorted = [...factions.entries()].sort((a, b) => { return a[1] - b[1]});
		const faction = sorted[0][0];
		// var faction = factions.keys().next().value;
		const factionsFieldWork = ["Slum Snakes", "Tetrads"];
		let wType: FactionWorkType = "hacking" as FactionWorkType;
		if (factionsFieldWork.includes(faction)) {
			wType = "field" as FactionWorkType;
		}
		const success = ns.singularity.workForFaction(faction, wType, focus);
		if (success) {
			ns.print("Start working for faction " + faction);
			ns.toast("Start working for faction " + faction, "success", 5000);
		}
		else {
			ns.print("Could not perform intended action: " + faction + " -> " + wType);
		}
	}
	else if (player.skills.hacking >= 250) {
		const corpsToWorkFor = getCorpsForReputation(ns, factions);
		//ns.print("Corps to work for: " + corpsToWorkFor);
		if (corpsToWorkFor.length > 0) {
			applyForPromotion(ns, player, corpsToWorkFor[0]);
			ns.print("Start working for " + corpsToWorkFor[0]);
			ns.toast("Start working for " + corpsToWorkFor[0]);
		}
	}
	else if (focus) {
		const crimeTime = commitCrime(ns, player);
		return crimeTime;
	}
	else {
		ns.toast("Crime Time! Please focus on something to start crimes.", "warning");
	}
	return sleepTime;
}

const commitCrime = (ns: MyNS, player: Player, combatStatsGoal = 300) => {
	// Calculate the risk value of all crimes

	ns.print("Karma: " + ns.formatNumber(ns.heart.break(), 2));
	ns.print("Kills: " + player.numPeopleKilled);

	let bestCrime = "";
	let bestCrimeValue = 0;
	let bestCrimeStats: CrimeStats | undefined = undefined;
	for (const crime of crimes) {
		const crimeChance = ns.singularity.getCrimeChance(crime);
		const crimeStats = ns.singularity.getCrimeStats(crime);
		if (crime == "Assassination" && player.numPeopleKilled < 30 && crimeChance > 0.98) {
			bestCrime = "Assassination";
			bestCrimeStats = crimeStats;
			break;
		}
		else if (crime == "Homicide" && player.numPeopleKilled < 30 && crimeChance > 0.98) {
			bestCrime = "Homicide";
			bestCrimeStats = crimeStats;
			break;
		}
		let crimeValue = 0;
		if (player.skills.strength < combatStatsGoal) {
			crimeValue += 100000 * crimeStats.strength_exp;
		}
		if (player.skills.defense < combatStatsGoal) {
			crimeValue += 100000 * crimeStats.defense_exp;
		}
		if (player.skills.dexterity < combatStatsGoal) {
			crimeValue += 100000 * crimeStats.dexterity_exp;
		}
		if (player.skills.agility < combatStatsGoal) {
			crimeValue += 100000 * crimeStats.agility_exp;
		}
		crimeValue += crimeStats.money;
		crimeValue = crimeValue * crimeChance / (crimeStats.time + 10);
		if (crimeValue > bestCrimeValue) {
			bestCrime = crime;
			bestCrimeValue = crimeValue;
			bestCrimeStats = crimeStats;
		}
	}

    if ( (bestCrime === undefined) || (bestCrimeStats === undefined) ) {
        throw new Error("Crime stats should never be undefined.");
    }

	ns.singularity.commitCrime(bestCrime as CrimeType);

	ns.print("Crime value " + ns.formatNumber(bestCrimeValue, 0) + " for " + bestCrime);
	return bestCrimeStats.time + 10;
}


