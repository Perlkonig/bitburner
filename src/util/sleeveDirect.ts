import { CrimeType, NS } from "@ns";

const crimes = ["Shoplift", "RobStore", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassination", "Heist"];
const stats = ["Strength", "Dexterity", "Defense", "Agility"];

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	const numSleeves = ns.sleeve.getNumSleeves();
	for (let i=0; i<numSleeves; i++){
		if (ns.args.length === 1) {
			if (crimes.includes(ns.args[0] as string)) {
				ns.sleeve.setToCommitCrime(i, ns.args[0] as CrimeType);
			} else if (ns.args[0] === "shock") {
				ns.sleeve.setToShockRecovery(i);
			} else if (ns.args[0] === "sync") {
				ns.sleeve.setToSynchronize(i);
			} else if (stats.includes(ns.args[0] as string)) {
                ns.sleeve.setToGymWorkout(i, "Powerhouse Gym", ns.args[0] as string);
            }
		}
	}
}