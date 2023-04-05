import { BladeburnerCurAction, CityName } from "@ns";
import { MyNS } from "../../MyTypes";

const cities = ["Sector-12", "Chongqing", "New Tokyo", "Ishima", "Aevum", "Volhaven"];

// const actionsGeneral = ["Training","Field Analysis","Recruitment","Diplomacy","Hyperbolic Regeneration Chamber","Incite Violence"];
const actionsContracts = ["Tracking","Bounty Hunter","Retirement"].reverse();
// Remove "Raid" to avoid the chaos hit
const actionsOperations = ["Investigation","Undercover Operation","Sting Operation"/*,"Raid"*/,"Stealth Retirement Operation","Assassination"].reverse();
const actionsBlackOps = ["Operation Typhoon","Operation Zero","Operation X","Operation Titan","Operation Ares","Operation Archangel","Operation Juggernaut","Operation Red Dragon","Operation K","Operation Deckard","Operation Tyrell","Operation Wallace","Operation Shoulder of Orion","Operation Hyron","Operation Morpheus","Operation Ion Storm","Operation Annihilus","Operation Ultron","Operation Centurion","Operation Vindictus","Operation Daedalus"];
// const skills = ["Blade's Intuition","Cloak","Short-Circuit","Digital Observer","Tracer","Overclock","Reaper","Evasive System","Datamancer","Cyber's Edge","Hands of Midas","Hyperdrive"];

const skillPriority = new Map<string, number>([
    // Tracer is a 1 just because it should be levelled early,
    // but it's capped
    ["Tracer", 1],
    ["Blade's Intuition", 1],
    ["Digital Observer", 1],
    ["Reaper", 1],
    ["Evasive System", 1],
    ["Cloak", 1.25],
    ["Short-Circuit", 1.25],
    ["Overclock", 1.25],
    ["Hyperdrive", 1.25],
]);

const skillCaps = new Map<string, number>([
    ["Tracer", 5],
    ["Cloak", 25],
    ["Short-Circuit", 25],
    ["Overclock", 90],
    // ["Hyperdrive", 20],
]);

const lowStaminaThresh = 0.5;
const highStaminaThresh = 0.99;
const lowHPThresh = 0; //0.2;
const highHPThresh = 0; //0.8;

// /** @param {NS} ns **/
// export async function main(ns: MyNS): Promise<void> {
// }

let msgs: string[] = [];
export let restTriggered = false;

export const tick = (ns: MyNS): string => {
    msgs = [];
    allocateSkills(ns);
    chooseCity(ns);

    // Find out what the best option is
    const best = chooseAction(ns);
    if (best === undefined) {
        if (ns.heart.break() > -54000) {
            ns.bladeburner.stopBladeburnerAction();
            const focused = ns.singularity.isFocused();
            const work = ns.singularity.getCurrentWork();
            if ( (work === null) || (! ("type" in work)) || (work.type !== "CRIME") || (work.crimeType !== "Homicide") ) {
                ns.singularity.commitCrime("Homicide", focused);
            }
            msgs.push("Committing homicide to advance karma.");
        } else {
            msgs.push("Choosing to do nothing. Go work out or something!");
        }
    } else {
        // Compare it to what we're doing and change if necessary
        const curr = ns.bladeburner.getCurrentAction();
        // ns.tprint(`Curr: ${JSON.stringify(curr)}, Best: ${JSON.stringify(best)}`);
        if ( (curr.type === best.type) && (curr.name === best.name) ) {
            // ns.print("Allowing the current action to continue.");
            msgs.push("Allowing the current action to continue.");
        } else {
            const success = ns.bladeburner.startAction(best.type, best.name);
            if (success) {
                ns.print(`Changing action. Type: ${best.type}, Name: ${best.name}`);
                msgs.push(`Changing action. Type: ${best.type}, Name: ${best.name}`);
                if (best.type === "BlackOp") {
                    ns.toast("Black Op in progress!", "warning", null);
                }
            } else {
                ns.print(`ERROR Failed to change action. Type: ${best.type}, Name: ${best.name}`);
                msgs.push(`ERROR Failed to change action. Type: ${best.type}, Name: ${best.name}`);
            }
        }
    }

    return `<p>${msgs.join("</p><p>")}</p>`;
}

const chooseCity = (ns: MyNS): void => {
    const city = ns.bladeburner.getCity();
    const population = ns.bladeburner.getCityEstimatedPopulation(city);
    if (population <= 1e9) {
        const pops = cities.filter(n => ns.bladeburner.getCityEstimatedPopulation(n as CityName) > 1e9);
        if (pops.length > 0) {
            const success = ns.bladeburner.switchCity(pops[0] as CityName);
            if (success) {
                ns.print(`Switching to the city ${pops[0]}.`);
                msgs.push(`Switching to the city ${pops[0]}.`);
                return;
            } else {
                ns.print(`ERROR Failed to move to the city ${pops[0]}.`);
                msgs.push(`ERROR Failed to move to the city ${pops[0]}.`);
            }
        } else {
            const largest = cities.sort((a, b) => ns.bladeburner.getCityEstimatedPopulation(b as CityName) - ns.bladeburner.getCityEstimatedPopulation(a as CityName))[0];
            if (largest !== city) {
                const success = ns.bladeburner.switchCity(largest as CityName);
                if (success) {
                    ns.print(`Switching to the largest city ${largest}.`);
                    msgs.push(`Switching to the largest city ${largest}.`);
                    return;
                } else {
                    ns.print(`ERROR Failed to move to the largest city ${largest}.`);
                    msgs.push(`ERROR Failed to move to the largest city ${largest}.`);
                }
            }
        }
    }
}

const allocateSkills = (ns: MyNS): void => {
    for (const [name, weight] of [...skillPriority.entries()].sort(() => Math.random() - Math.random())) {
        const pts = ns.bladeburner.getSkillPoints();
        const level = ns.bladeburner.getSkillLevel(name);
        if ( (skillCaps.has(name)) && (level >= skillCaps.get(name)!) ) {
            continue;
        }
        const cost = ns.bladeburner.getSkillUpgradeCost(name)
        if (pts >= weight * cost) {
            const success = ns.bladeburner.upgradeSkill(name);
            if (success) {
                ns.print(`Upgraded skill ${name} to level ${ns.bladeburner.getSkillLevel(name)}.`);
                msgs.push(`Upgraded skill ${name} to level ${ns.bladeburner.getSkillLevel(name)}.`);
            } else {
                ns.print(`ERROR Something went wrong upgrading skill ${name}.`);
                msgs.push(`ERROR Something went wrong upgrading skill ${name}.`);
            }
        }
    }
}

const chooseAction = (ns: MyNS): BladeburnerCurAction|undefined => {
    const [currStamina, maxStamina] = ns.bladeburner.getStamina();
    const player = ns.getPlayer();

    if ( (currStamina <= (maxStamina * lowStaminaThresh)) || ( (currStamina <= (maxStamina * highStaminaThresh)) && (restTriggered) ) || (player.hp.current <= (player.hp.max * lowHPThresh)) || ( (player.hp.current <= (player.hp.max * highHPThresh) ) && (restTriggered) ) ) {
        restTriggered = true;
        if (ns.heart.break() > -54000) {
            return undefined;
        } else {
            return {type: "General", name: "Hyperbolic Regeneration Chamber"};
        }
    } else {
        restTriggered = false;
        // Black Ops first
        const blackOps = [...actionsBlackOps].filter(n => ns.bladeburner.getBlackOpRank(n) <= ns.bladeburner.getRank()).filter(n => ns.bladeburner.getActionCountRemaining("BlackOp", n) === 1).sort((a, b) => ns.bladeburner.getBlackOpRank(a) - ns.bladeburner.getBlackOpRank(b));
        let blackOp: string|undefined = undefined;
        if (blackOps.length > 0) {
            blackOp = blackOps[0];
        }
        if (blackOp !== undefined) {
            const [successMin, successMax] = ns.bladeburner.getActionEstimatedSuccessChance("BlackOp", blackOp);
            const successAvg = (successMin + successMax) / 2;
            if (successAvg > 0.85) {
                return {type: "BlackOp", name: blackOp};
            }
        }

        // Operations
        for (const name of actionsOperations) {
            const [successMin, successMax] = ns.bladeburner.getActionEstimatedSuccessChance("Operation", name);
            const successAvg = (successMin + successMin + successMax) / 3;
            const count = ns.bladeburner.getActionCountRemaining("Operation", name);
            // const successes = ns.bladeburner.getActionSuccesses("Operation", name)
            // const failures = ns.bladeburner.
            if ( (successAvg>= 0.75) && (count > 0) ) {
                return {type: "Operation", name};
            }
        }

        // Contracts
        for (const name of actionsContracts) {
            const [successMin, successMax] = ns.bladeburner.getActionEstimatedSuccessChance("Contract", name);
            const successAvg = (successMin + successMin + successMax) / 3;
            const count = ns.bladeburner.getActionCountRemaining("Contract", name);
            if ( (successAvg >= 0.60) && (count > 0) ) {
                return {type: "Contract", name};
            }
        }

        // If none of those are available, do something else minorly useful
        const city = ns.bladeburner.getCity();
        const chaos = ns.bladeburner.getCityChaos(city);
        if (chaos > 45) {
            return {type: "General", name: "Diplomacy"};
        }
    }
    return {type: "General", name: "Field Analysis"};
}