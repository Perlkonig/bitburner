// 89.15GB

import { CrimeType, Player } from "@ns";
import { BoxNode, MyNS } from "../../MyTypes";
import { createSidebarItem, sidebar } from "lib/box/box";
import { maxKarma, maxStats } from "lib/crime";
import { tick as bbTick } from "player/bladeburner";

const studyUntilHackLevel = 50;

// const megaCorps = ["Clarke Incorporated", "Bachman & Associates", "OmniTek Incorporated", "NWO", "Fulcrum Secret Technologies", "Blade Industries", "ECorp", "MegaCorp", "KuaiGong International", "Four Sigma"];

const cityFactions = ["Sector-12", "Chongqing", "New Tokyo", "Ishima", "Aevum", "Volhaven"];

// const crimes: CrimeType[] = ["Shoplift", "RobStore", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassination", "Heist"] as CrimeType[];

// const ignoreFactionAugs = new Map([
// 	["CyberSec", 'Cranial Signal Processors - Gen II'],
// 	["NiteSec", 'DataJack'],
// 	["The Black Hand", 'Embedded Netburner Module Core Implant'],
// 	["Sector-12", 'Neuralstimulator'],
// ])

// interface IPurchaseOrder {
//     augment: string;
//     cost: number;
//     faction: string;
//     repNeeded: number;
// }

let globalStatus = "";
let globalBBStatus = "";

/** @param {MyNS} ns **/
export async function main(ns: MyNS): Promise<void> {
	ns.disableLog("ALL");
    const box: BoxNode = createSidebarItem("Actions", "<p>Loading...</p>", "\ueb99") as BoxNode;

    while (true) {
        if ( (sidebar !== null) && (! sidebar.contains(box)) ) {
            if (ns.bladeburner.inBladeburner()) {
                ns.bladeburner.stopBladeburnerAction();
            }
            ns.exit();
        }

		const sleepTime = 5000;
		const player = ns.getPlayer();

        // programs
        getPrograms(ns, player);

        // home RAM
        upgradeHomeServer(ns, player);

        // always export when favour bonus
        exportSave(ns);

        /*
         * Player needs a few things at start:
         *   - Hacking level 50
         *   - Stats for BB
         *   - Karma for gang
         *
         * After that, let the bladeburner script manage activities
         * until you have "The Blade's Simulacrum."
         *
         * Once you can double-act, do other stuff
        */

        const hasStats = (player.skills.strength >= 100) && (player.skills.defense >= 100) && (player.skills.agility >= 100) && (player.skills.dexterity >= 100);
        const currWork = ns.singularity.getCurrentWork();
        if (ns.getHackingLevel() < studyUntilHackLevel) {
            if ( (currWork === null) || (! ("type" in currWork)) || (currWork.type !== "CLASS") ) {
                ns.singularity.universityCourse("rothman university", "Study Computer Science", ns.singularity.isFocused());
            }
            globalStatus = `Studying to hacking level ${studyUntilHackLevel}.`
        } else {
            if ( (ns.getPlayer().bitNodeN !== 8) && ( (! ns.bladeburner.inBladeburner()) && (! hasStats) ) ) {
                const crime = maxStats(ns, player, 100);
                if ( (currWork === null) || (! ("type" in currWork)) || (currWork["crimeType"] !== crime.type) ) {
                    ns.singularity.commitCrime(crime.type as CrimeType, ns.singularity.isFocused());
                }
                globalStatus = `Committing the crime that produces the best stat gains.`;
            } else {
                if ( (ns.getPlayer().bitNodeN !== 8) && (! ns.bladeburner.inBladeburner()) && (hasStats) ) {
                    ns.bladeburner.joinBladeburnerDivision();
                    ns.toast("Joining Bladeburners!", "success", null);
                } else if ( (! ns.bladeburner.inBladeburner()) && (! ns.gang.inGang()) && (ns.heart.break() > -54000) ) {
                    const crime = maxKarma(ns, player);
                    if ( (currWork === null) || (! ("type" in currWork)) || (currWork["crimeType"] !== crime.type) ) {
                        ns.singularity.commitCrime(crime.type as CrimeType, ns.singularity.isFocused());
                    }
                    globalStatus = `Committing the crime that produces the fastest karma loss.`;
                } else {
                    const installed = ns.singularity.getOwnedAugmentations(false);
                    if (installed.includes("The Blade's Simulacrum")) {
                        globalStatus = "You can double act! Let's do something with it!";
                    } else {
                        if (hasStats) {
                            globalStatus = "Letting the bladeburner script do its thing.";
                            ns.singularity.stopAction();
                        } else {
                            const crime = maxStats(ns, player, 100);
                            if ( (currWork === null) || (! ("type" in currWork)) || (currWork["crimeType"] !== crime.type) ) {
                                ns.singularity.commitCrime(crime.type as CrimeType, ns.singularity.isFocused());
                            }
                            globalStatus = `Committing the crime that most quickly gets our stats to 100.`;
                        }
                    }
                }
            }
        }

        if ( (ns.getPlayer().bitNodeN !== 8) && (ns.bladeburner.inBladeburner()) && (hasStats) && (ns.getHackingLevel() >= studyUntilHackLevel) ) {
            globalBBStatus = bbTick(ns);
        }

        joinFactions(ns);

        // gang
        if ( (! ns.gang.inGang()) && (ns.heart.break() <= -54000) ) {
            ns.gang.createGang("Slum Snakes");
            ns.exec("gang.js", "home");
            ns.toast("Gang created and management started.", "info", null);
        }

        // corp
        if ( (! ns.corporation.hasCorporation()) && (ns.getServerMoneyAvailable("home") > 150e9) ) {
            ns.toast("Seed funds available. Start corp!", "success", null);
        }

        renderBoxes(ns, box);
		await ns.sleep(sleepTime);
    }
}

const renderBoxes = (ns: MyNS, box:BoxNode): void => {
    let bodyStr = `<p>${globalStatus}</p><hr><div>${globalBBStatus}</div>`;
    if (ns.bladeburner.inBladeburner()) {
        const [curr, max] = ns.bladeburner.getStamina();
        const player = ns.getPlayer();
        bodyStr += `<p>Stamina:&nbsp;<progress max="${max}" value="${curr}"></progress></p>`;
        bodyStr += `<p>Health:&nbsp;<progress max="${player.hp.max}" value="${player.hp.current}"></progress></p>`;
    }
    box.body.innerHTML = bodyStr;
    box.recalcHeight();
}

const exportSave = (ns: MyNS) => {
    if (ns.singularity.exportGameBonus()) {
        ns.singularity.exportGame();
    }
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
        if (!cityFactions.includes(faction)) {
            ns.singularity.joinFaction(faction);
            globalStatus = `Joined ${faction}`;
        }
    }
}

const upgradeHomeServer = (ns: MyNS, player: Player) => {
	if (player.money > ns.singularity.getUpgradeHomeRamCost()) {
		if (!player.factions.includes("CyberSec") || ns.singularity.getUpgradeHomeRamCost() < 2e9
			|| ns.singularity.getUpgradeHomeRamCost() < 0.2 * player.money) {
			const success = ns.singularity.upgradeHomeRam();
			if (success) {
				ns.print("Upgraded Home Server RAM");
				ns.toast("Upgraded Home Server RAM");
			}
		}
	}
}

