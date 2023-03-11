import { MyNS } from "../MyTypes";
import { CrimeStats, CrimeType, NS, SleevePerson } from "@ns";

const crimes: CrimeType[] = ["Shoplift", "RobStore", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassination", "Heist"] as CrimeType[];
const karmaTarget = 54000;

/** @param {NS} ns */
export async function main(ns: MyNS): Promise<void> {
    const karma = ns.heart.break();
	const numSleeves = ns.sleeve.getNumSleeves();
	for (let i=0; i<numSleeves; i++){
        // If not yet at karma target, choose highest karmic return
        if (Math.abs(karma) < karmaTarget) {
            const crime = maxKarma(ns, ns.sleeve.getSleeve(i));
            ns.sleeve.setToCommitCrime(i, crime.type as CrimeType);
            ns.tprint(`Setting sleeve #${i + 1} to crime ${crime.type}.`);
        } else {
            ns.sleeve.setToCommitCrime(i, "Homicide");
            ns.tprint(`Setting sleeve #${i + 1} to default action of Homicide.`);
        }
	}
}

const maxKarma = (ns: NS, player: SleevePerson): CrimeStats => {
    let bestReturn = 0;
    let bestCrime: CrimeStats | undefined = undefined;

    for (const crime of crimes) {
        const stats = ns.singularity.getCrimeStats(crime);
        const chance = ns.formulas.work.crimeSuccessChance(player, crime);
        const expected = stats.karma * chance / stats.time;
        if (expected > bestReturn) {
            bestReturn = expected;
            bestCrime = stats;
        }
    }

    if (bestCrime === undefined) {
        throw new Error("There should always be at least one possible crime.");
    }

    return bestCrime;
}
