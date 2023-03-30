import { CrimeStats, CrimeType, NS, Player, SleevePerson } from "@ns";

const crimes: CrimeType[] = ["Shoplift", "RobStore", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide", "Grand Theft Auto", "Kidnap", "Assassination", "Heist"] as CrimeType[];

export const maxKarma = (ns: NS, player: SleevePerson|Player): CrimeStats => {
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

export const maxMoney = (ns: NS, player: SleevePerson|Player): CrimeStats => {
    let bestReturn = 0;
    let bestCrime: CrimeStats | undefined = undefined;

    for (const crime of crimes) {
        const stats = ns.singularity.getCrimeStats(crime);
        const chance = ns.formulas.work.crimeSuccessChance(player, crime);
        const expected = stats.money * chance / stats.time;
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

export const maxStats = (ns: NS, player: SleevePerson|Player, target: number|undefined = undefined): CrimeStats => {
    let bestReturn = 0;
    let bestCrime: CrimeStats | undefined = undefined;

    for (const crime of crimes) {
        const stats = ns.singularity.getCrimeStats(crime);
        const chance = ns.formulas.work.crimeSuccessChance(player, crime);
        let totalCombat = stats.strength_exp + stats.defense_exp + stats.agility_exp + stats.dexterity_exp;
        if (target !== undefined) {
            totalCombat = 0;
            if (player.skills.strength < target) {
                totalCombat += stats.strength_exp;
            }
            if (player.skills.defense < target) {
                totalCombat += stats.defense_exp;
            }
            if (player.skills.agility < target) {
                totalCombat += stats.agility_exp;
            }
            if (player.skills.dexterity < target) {
                totalCombat += stats.dexterity_exp;
            }
        }
        const expected = totalCombat * chance / stats.time;
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
