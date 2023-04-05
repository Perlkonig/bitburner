import { GangGenInfo, NS } from "@ns";
import { BoxNode } from "../MyTypes";
import { createSidebarItem, sidebar } from "lib/box/box";
import { seconds2string } from "lib/time";
import { wng } from "lib/names";

const tasks = ["Mug People", "Deal Drugs", "Strongarm Civilians", "Run a Con", "Armed Robbery", "Traffick Illegal Arms", "Threaten & Blackmail", "Human Trafficking", "Terrorism"];

const augmentationNames = ["Bionic Arms", "Bionic Legs", "Bionic Spine", "BrachiBlades", "Nanofiber Weave", "Synthetic Heart", "Synfibril Muscle", "Graphene Bone Lacings", "BitWire", "Neuralstimulator", "DataJack"];

const combatGangs = ["Speakers for the Dead", "The Dark Army", "The Syndicate", "Tetrads", "Slum Snakes"]

const hackingGangs = ["NiteSec", "The Black Hand"];

let lastRep = 0;
const deltas: number[] = [];
const sleepTime = 2;

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

	if (!ns.gang.inGang()) {
        const success = ns.gang.createGang("Slum Snakes");
        if (! success) {
            ns.tprint("Failed to create gang!")
            ns.exit();
        }
	}

    // Create initial box
    const box: BoxNode = createSidebarItem("Gang", `<p>Loading...</p>`, "\uea7e") as BoxNode;

	let territoryWinChance = 1;
	while (true) {
        if ((sidebar === null) || (!sidebar.contains(box))) {
            ns.exit();
        }

        const gangInfo = ns.gang.getGangInformation();
        const name = gangInfo.faction;
        const reputation = ns.singularity.getFactionRep(name);
        const delta = reputation - lastRep;
        deltas.push(delta);
        if (deltas.length > 10) {
            deltas.splice(0, 1);
        }
        lastRep = reputation;

        recruit(ns);
		equipMembers(ns);
		ascend(ns);
		territoryWinChance = territoryWar(ns);
		assignMembers(ns, territoryWinChance);

        renderBox(ns, box, territoryWinChance);
		await ns.sleep(sleepTime * 1000);
	}
}

function renderBox(ns: NS, box: BoxNode, winChance: number): void {
    let bodyStr = "";
    const gangInfo = ns.gang.getGangInformation();

    // membership information until full
    const members = ns.gang.getMemberNames();
    if (members.length < 12) {
        const respectNeeded = getRespectNeededToRecruitMember(ns);
        const respectRemaining = respectNeeded - gangInfo.respect;
        // Value is per cycle, and game cycle is 200ms
        const timeRemaining = respectRemaining / (gangInfo.respectGainRate * 5);
        bodyStr += `<p>Members ${members.length} / 12 (~${seconds2string(ns, timeRemaining)} to next)</p><progress max="${respectNeeded}" value="${gangInfo.respect}"></progress>`
    }

    // money generation
    bodyStr += `<p>Income: ${ns.formatNumber(gangInfo.moneyGainRate * 5, 2)}/sec</p>`

    // power
    bodyStr += `<p>Power: ${ns.formatNumber(gangInfo.power, 2)}`;

    if (gangInfo.territory < 1) {
        // territory
        bodyStr += `<p>Territory: ${ns.formatPercent(gangInfo.territory, 2)}`;

        // win chance
        bodyStr += "<p>";
        if (gangInfo.territoryWarfareEngaged) {
            bodyStr += `<span style="color: green">`;
        } else {
            bodyStr += `<span style="color: red">`;
        }
        bodyStr += `Win chance: ${ns.formatPercent(winChance, 2)}</span></p>`;
    }

    // calculate rep gain
    const avg = deltas.reduce((acc, curr) => { return acc + curr; }, 0) / deltas.length;
    const perSec = avg / sleepTime;
    const reputation = ns.singularity.getFactionRep(gangInfo.faction);
    // calc rep goal
    //   Get list of all gang-faction augments
    const augs = ns.singularity.getAugmentationsFromFaction(gangInfo.faction);
    //   Filter out ones we already have
    const owned = ns.singularity.getOwnedAugmentations(true);
    const unowned = augs.filter(a => ! owned.includes(a));
    //   Get maximum repreq
    const goal = Math.max(...unowned.map(a => ns.singularity.getAugmentationRepReq(a)));
    if (reputation < goal) {
        const needed = goal - reputation;
        const time = needed / perSec;
        bodyStr += `<p>~${seconds2string(ns, time)} to max rep (${ns.formatNumber(goal, 2)})</p>`;
    }

    box.body.innerHTML = bodyStr;
    box.recalcHeight();
}

function territoryWar(ns: NS) {
	const minWinChanceToStartWar = 0.8;
	const gangInfo = ns.gang.getGangInformation();
	// ns.print("Territory: " + gangInfo.territory);
	// sometimes territory is stuck at something like 99.99999999999983%
	// since clash chance takes time to decrease anyways, should not be an issue to stop a bit before 100,000000%
	if (gangInfo.territory < 0.9999) {
		const otherGangInfos = ns.gang.getOtherGangInformation();
		// ns.tprint(JSON.stringify(otherGangInfos, null, 2));
		const myGangPower = gangInfo.power;
		//ns.print("My gang power: " + myGangPower);
		let lowestWinChance = 1;
		for (const otherGang of combatGangs.concat(hackingGangs)) {
			if (otherGang == gangInfo.faction) {
				continue;
			}
			else if (otherGangInfos[otherGang].territory <= 0) {
				continue;
			}
			else {
				const otherGangPower = otherGangInfos[otherGang].power;
				const winChance = myGangPower / (myGangPower + otherGangPower);
				lowestWinChance = Math.min(lowestWinChance, winChance);
			}
		}
		if (lowestWinChance > minWinChanceToStartWar) {
			if (!gangInfo.territoryWarfareEngaged) {
				ns.print("WARN start territory warfare");
				ns.toast("Start territory warfare");
				ns.gang.setTerritoryWarfare(true);
			}
			ns.print("Territory win chance: " + lowestWinChance);
		}
		return lowestWinChance;
	}

	if (gangInfo.territoryWarfareEngaged) {
		ns.print("WARN stop territory warfate");
		ns.toast("Stop territory warfare");
		ns.gang.setTerritoryWarfare(false);
	}
	return 1;
}

function ascend(ns: NS) {
	const members = ns.gang.getMemberNames();
	for (const member of members) {
		// let memberInfo = ns.gang.getMemberInformation(member);
		// let memberCombatStats = (memberInfo.str + memberInfo.def + memberInfo.dex + memberInfo.agi) / 4;
		// ns.print("Member combat stats: " + memberCombatStats);
		// let memberAscensionMultiplier = (memberInfo.agi_asc_mult + memberInfo.def_asc_mult + memberInfo.dex_asc_mult + memberInfo.str_asc_mult) / 4;
		// ns.print("Member ascension multiplier: " + memberAscensionMultiplier);
		const memberAscensionResult = ns.gang.getAscensionResult(member);
		if (memberAscensionResult != undefined) {
			const memberAscensionResultMultiplier = (memberAscensionResult.agi + memberAscensionResult.def + memberAscensionResult.dex + memberAscensionResult.str) / 4;
			// ns.print("Member ascension result: " + memberAscensionResultMultiplier);
			if ((memberAscensionResultMultiplier > 1.3)) {
				ns.print("Ascend gang member " + member);
				ns.gang.ascendMember(member);
			}
		}
	}
}

function equipMembers(ns: NS) {
	const members = ns.gang.getMemberNames();
	for (const member of members) {
		const memberInfo = ns.gang.getMemberInformation(member);
		if (memberInfo.augmentations.length < augmentationNames.length) {
			for (const augmentation of augmentationNames) {
				if (ns.gang.getEquipmentCost(augmentation) < (0.01 * ns.getServerMoneyAvailable("home"))) {
					ns.print("Purchase augmentation for " + member + ": " + augmentation);
					ns.gang.purchaseEquipment(member, augmentation);
				}
			}
		}
	}
}

function assignMembers(ns: NS, territoryWinChance: number) {
	const members = ns.gang.getMemberNames();
	members.sort((a, b) => memberCombatStats(ns, b) - memberCombatStats(ns, a));
	const gangInfo = ns.gang.getGangInformation();
	let workJobs = Math.floor((members.length) / 2);
	let wantedLevelIncrease = 0;
	for (const member of members) {
		let highestTaskValue = 0;
		let highestValueTask = "Train Combat";
		const memberInfo = ns.gang.getMemberInformation(member);

		if (workJobs > 0 && gangInfo.territory < 1 && members.length >= 12 && territoryWinChance < 0.95) {
			// support territory warfare if max team size, not at max territory yet and win chance not high enough yet
			workJobs--;
			highestValueTask = "Territory Warfare";
		}
		else if (memberCombatStats(ns, member) < 50) {
			highestValueTask = "Train Combat";
		}
		else if (workJobs >= 0 && wantedLevelIncrease > 0) {
			workJobs--;
			highestValueTask = "Vigilante Justice";
			//ns.print("Wanted Level for Vigilante: " + ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(highestValueTask)))
			wantedLevelIncrease += ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(highestValueTask));
		}
		else if (workJobs > 0 && memberCombatStats(ns, member) > 50) {
			workJobs--;
			for (const task of tasks) {
				if (taskValue(ns, gangInfo, member, task) > highestTaskValue) {
					highestTaskValue = taskValue(ns, gangInfo, member, task)
					highestValueTask = task;
				}
			}
			wantedLevelIncrease += ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(highestValueTask));
			//ns.print("Wanted Level for Increase: " + ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(highestValueTask)))
		}


		if (memberInfo.task != highestValueTask) {
			// ns.print("Assign " + member + " to " + highestValueTask);
			ns.gang.setMemberTask(member, highestValueTask);
		}
	}
}

function taskValue(ns: NS, gangInfo: GangGenInfo, member: string, task: string) {
	// determine money and reputation gain for a task
	const respectGain = ns.formulas.gang.respectGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(task));
	let moneyGain = ns.formulas.gang.moneyGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(task));
	const wantedLevelIncrease = ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(task));
	const vigilanteWantedDecrease = ns.formulas.gang.wantedLevelGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats("Vigilante Justice"));
	if ( wantedLevelIncrease + vigilanteWantedDecrease > 0){
		// avoid tasks where more than one vigilante justice is needed to compensate
		return 0;
	}
	else if ( (2 * wantedLevelIncrease) + vigilanteWantedDecrease > 0){
		// Simple compensation for wanted level since we need more vigilante then
		// ToDo: Could be a more sophisticated formula here
		moneyGain *= 0.75;
	}

    if (ns.getPlayer().bitNodeN === 8) {
        moneyGain /= 100;
        moneyGain = Math.max(moneyGain, respectGain);
    }

    // calc rep goal
    //   Get list of all gang-faction augments
    const augs = ns.singularity.getAugmentationsFromFaction(gangInfo.faction);
    //   Filter out ones we already have
    const owned = ns.singularity.getOwnedAugmentations(true);
    const unowned = augs.filter(a => ! owned.includes(a));
    //   Get maximum repreq
    const goal = Math.max(...unowned.map(a => ns.singularity.getAugmentationRepReq(a)));

    // ns.singularity.getFactionRep(gangInfo.faction) > 2500000
	if ( (ns.getServerMoneyAvailable("home") > 10e15) && (ns.singularity.getFactionRep(gangInfo.faction) < goal) ) {
		// if we got all augmentations, money from gangs is probably not relevant anymore; so focus on respect
		// set money gain at least to respect gain in case of low money gain tasks like terrorism
		moneyGain /= 100; // compare money to respect gain value; give respect more priority
		moneyGain = Math.max(moneyGain, respectGain);
	}

	// return a value based on money gain and respect gain
	return respectGain * moneyGain;
}

function memberCombatStats(ns: NS, member: string) {
	const memberInfo = ns.gang.getMemberInformation(member);
	return (memberInfo.str + memberInfo.def + memberInfo.dex + memberInfo.agi) / 4;
}

function recruit(ns: NS) {
	if (ns.gang.canRecruitMember()) {
		// const members = ns.gang.getMemberNames();
		// const memberName = "Thug-" + members.length;
        const memberName = wng();
		ns.print("Recruit new gang member " + memberName);
		ns.gang.recruitMember(memberName);
	}
}

const getRespectNeededToRecruitMember = (ns: NS) =>  {
	const members = ns.gang.getMemberNames();
	// First N gang members are free (can be recruited at 0 respect)
	const numFreeMembers = 3;
	if (members.length < numFreeMembers) return 0;

	const i = members.length - (numFreeMembers - 1);
	return Math.pow(5, i);
}
