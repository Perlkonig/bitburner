import { MyNS } from "../MyTypes";
import { CrimeType } from "@ns";
import { maxKarma, maxMoney, maxStats } from "lib/crime";

const crimes = ["Shoplift", "RobStore", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassination", "Heist"];
const stats = ["Strength", "Dexterity", "Defense", "Agility"];
const karmaTarget = 54000;

/** @param {NS} ns */
export async function main(ns: MyNS): Promise<void> {
    const karma = ns.heart.break();
	const numSleeves = ns.sleeve.getNumSleeves();
	for (let i=0; i<numSleeves; i++){
        // First check for command-line argument
        if (ns.args.length > 0) {
            if (ns.args[0] === "study") {
                ns.sleeve.setToUniversityCourse(i, "Rothman University", "Algorithms");
                ns.tprint(`Setting sleeve #${i + 1} to study Algorithms.`);
            } else if (ns.args[0] === "money") {
                const crime = maxMoney(ns, ns.sleeve.getSleeve(i));
                ns.sleeve.setToCommitCrime(i, crime.type as CrimeType);
                ns.tprint(`Setting sleeve #${i + 1} to crime ${crime.type} to maximize money.`);
            } else if (ns.args[0] === "gym") {
                if (i < numSleeves / 2) {
                    ns.sleeve.setToGymWorkout(i, "Powerhouse Gym", "Agility");
                } else {
                    ns.sleeve.setToGymWorkout(i, "Powerhouse Gym", "Defense");
                }
            } else if (crimes.includes(ns.args[0] as string)) {
                ns.sleeve.setToCommitCrime(i, ns.args[0] as CrimeType);
            } else if (ns.args[0] === "shock") {
                ns.sleeve.setToShockRecovery(i);
            } else if (ns.args[0] === "sync") {
                ns.sleeve.setToSynchronize(i);
            } else if (stats.includes(ns.args[0] as string)) {
                ns.sleeve.setToGymWorkout(i, "Powerhouse Gym", ns.args[0] as string);
            }
        } else if (! ns.bladeburner.inBladeburner()) {
            const crime = maxStats(ns, ns.sleeve.getSleeve(i), 100);
            ns.sleeve.setToCommitCrime(i, crime.type as CrimeType);
            ns.tprint(`Setting sleeve #${i + 1} to crime ${crime.type} to maximize stats.`);
            // ns.sleeve.setToCommitCrime(i, "Mug");
            // ns.tprint(`Setting sleeve #${i + 1} to default action of Mug.`);

        // If not yet at karma target, choose highest karmic return
        } else if (Math.abs(karma) < karmaTarget) {
            const crime = maxKarma(ns, ns.sleeve.getSleeve(i));
            ns.sleeve.setToCommitCrime(i, crime.type as CrimeType);
            ns.tprint(`Setting sleeve #${i + 1} to crime ${crime.type} to maximize karma.`);

        // Otherwise go for most stats
        } else {
            const crime = maxStats(ns, ns.sleeve.getSleeve(i));
            ns.sleeve.setToCommitCrime(i, crime.type as CrimeType);
            ns.tprint(`Setting sleeve #${i + 1} to crime ${crime.type} to maximize stats.`);
            // ns.sleeve.setToCommitCrime(i, "Mug");
            // ns.tprint(`Setting sleeve #${i + 1} to default action of Mug.`);
        }
	}
}
