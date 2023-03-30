import { Multipliers, NS } from "@ns";

export enum FactionNames {
    Illuminati = "Illuminati",
    Daedalus = "Daedalus",
    TheCovenant = "The Covenant",
    ECorp = "ECorp",
    MegaCorp = "MegaCorp",
    BachmanAssociates = "Bachman & Associates",
    BladeIndustries = "Blade Industries",
    NWO = "NWO",
    ClarkeIncorporated = "Clarke Incorporated",
    OmniTekIncorporated = "OmniTek Incorporated",
    FourSigma = "Four Sigma",
    KuaiGongInternational = "KuaiGong International",
    FulcrumSecretTechnologies = "Fulcrum Secret Technologies",
    BitRunners = "BitRunners",
    TheBlackHand = "The Black Hand",
    NiteSec = "NiteSec",
    Aevum = "Aevum",
    Chongqing = "Chongqing",
    Ishima = "Ishima",
    NewTokyo = "New Tokyo",
    Sector12 = "Sector-12",
    Volhaven = "Volhaven",
    SpeakersForTheDead = "Speakers for the Dead",
    TheDarkArmy = "The Dark Army",
    TheSyndicate = "The Syndicate",
    Silhouette = "Silhouette",
    Tetrads = "Tetrads",
    SlumSnakes = "Slum Snakes",
    Netburners = "Netburners",
    TianDiHui = "Tian Di Hui",
    CyberSec = "CyberSec",
    Bladeburners = "Bladeburners",
    ChurchOfTheMachineGod = "Church of the Machine God",
    ShadowsOfAnarchy = "Shadows of Anarchy",
}

export interface IAug {
    name: string;
    faction: string;
    price: number;
    priceBase: number;
    repreq: number;
    prereqs: string[];
    mults: Multipliers;
    weight: number;
}

export interface IAugCategories {
    [k: string]: IAug[];
}

interface IPurchaseOrder {
    name: string;
    faction: string;
    price: number;
    repreq: number;
}

export const COST_MULT = 1.9;
export const NFG_MULT = 1.14;

export const getAugs = (ns: NS): IAugCategories => {
    const augs: IAug[] = [];
    for (const faction of Object.values(FactionNames)) {
        for (const aug of ns.singularity.getAugmentationsFromFaction(faction)) {
            const price = ns.singularity.getAugmentationPrice(aug);
            const priceBase = ns.singularity.getAugmentationBasePrice(aug);
            const repreq = ns.singularity.getAugmentationRepReq(aug);
            const prereqs = ns.singularity.getAugmentationPrereq(aug).reverse();
            const mults = ns.singularity.getAugmentationStats(aug);
            const node = {
                name: aug,
                faction,
                price,
                priceBase,
                repreq,
                prereqs,
                mults,
                weight: 0
            };
            augs.push(node);
        }
    }
    const cats: IAugCategories = {};
    // specials
    cats["specials"] = augs.filter(x => isSpecial(x.mults));
    // bladeburner
    cats["bb"] = augs.filter(x => x.mults.bladeburner_analysis > 1 || x.mults.bladeburner_max_stamina > 1 || x.mults.bladeburner_stamina_gain > 1 || x.mults.bladeburner_success_chance > 1).filter(x => x.name !== "NeuroFlux Governor");
    cats["bb"].forEach((x) => x.weight = x.mults.bladeburner_analysis + x.mults.bladeburner_max_stamina + x.mults.bladeburner_stamina_gain + x.mults.bladeburner_success_chance);
    // faction reputation
    cats["facrep"] = augs.filter(x => x.mults.faction_rep > 1).filter(x => x.name !== "NeuroFlux Governor");
    cats["facrep"].forEach((x) => x.weight = x.mults.faction_rep);
    // combat stats
    cats["combat"] = augs.filter(x => x.mults.agility > 1 || x.mults.agility_exp > 1 || x.mults.defense > 1 || x.mults.defense_exp > 1 || x.mults.dexterity > 1 || x.mults.dexterity_exp > 1 || x.mults.strength > 1 || x.mults.strength_exp > 1).filter(x => x.name !== "NeuroFlux Governor");
    cats["combat"].forEach(x => x.weight = x.mults.agility + x.mults.agility_exp + x.mults.defense + x.mults.defense_exp + x.mults.dexterity + x.mults.dexterity_exp + x.mults.strength + x.mults.strength_exp)
    // hacking
    cats["hackingXp"] = augs.filter(x => x.mults.hacking > 1 || x.mults.hacking_exp > 1).filter(x => x.name !== "NeuroFlux Governor");
    cats["hackingXp"].forEach(x => x.weight = x.mults.hacking + x.mults.hacking_exp);
    cats["hackingOther"] = augs.filter(x => x.mults.hacking_chance > 1 || x.mults.hacking_grow > 1 || x.mults.hacking_money > 1 || x.mults.hacking_speed > 1).filter(x => x.name !== "NeuroFlux Governor");
    cats["hackingOther"].forEach(x => x.weight = x.mults.hacking_chance + x.mults.hacking_grow + x.mults.hacking_money + x.mults.hacking_speed);
    // nfg
    cats["nfg"] = augs.filter(x => x.name === "NeuroFlux Governor");

    // get names of currently categorized augs
    const categorized: Set<string> = new Set(...Object.values(cats).map(x => x.map(y => y.name)));
    cats["other"] = augs.filter(x => ! categorized.has(x.name));

    return cats;
}

const isSpecial = (mults: Multipliers): boolean => {
    for (const n of Object.values(mults)) {
        if (n !== 1) {
            return false;
        }
    }
    return true;
}

export const assess = (ns: NS, sequence = ["specials", "bb", "facrep", "combat", "hackingXp", "hackingOther"], costLimit = true): IPurchaseOrder[] => {
    const augs = getAugs(ns);
    let order: IPurchaseOrder[] = [];
    for (const cat of sequence) {
        if (! (cat in augs)) {
            ns.tprint(`ERROR No category found with the name ${cat}!`);
            break;
        }
        const haverep = augs[cat].filter(x => x.repreq <= ns.singularity.getFactionRep(x.faction)).sort((a, b) => b.price - a.price);
        for (const aug of haverep) {
            const neworder = addToOrder(ns, [...order], aug, augs);
            const cost = priceOrder(neworder)
            if (costLimit) {
                if (ns.getServerMoneyAvailable("home") >= cost) {
                    order = neworder;
                }
            } else {
                order = neworder;
            }
        }
    }
    return order
}

const addToOrder = (ns: NS, order: IPurchaseOrder[], aug: IAug, allAugs: IAugCategories): IPurchaseOrder[] => {
    // check if aug already in the order or if it's purchased but not installed
    const inOrder = order.find(x => x.name === aug.name) !== undefined;
    const purchased = ns.singularity.getOwnedAugmentations(true);
    if ( (inOrder) || (purchased.includes(aug.name)) ) {
        return [...order];
    }

    // Proceed
    if (aug.prereqs.length === 0) {
        const po: IPurchaseOrder = {
            name: aug.name,
            faction: aug.faction,
            price: aug.price,
            repreq: aug.repreq,
        };
        return [...order, po];
    } else {
        let neworder = [...order];
        const flat = Object.values(allAugs).reduce((acc, curr) => { return [...acc, ...curr]; }, []);
        for (const pre of aug.prereqs) {
            const preaug = flat.find(x => (x.name === pre) && (x.repreq <= ns.singularity.getFactionRep(x.faction)) );
            if (preaug !== undefined) {
                neworder = addToOrder(ns, neworder, preaug, allAugs);
            // If we can't purchase a prereq, don't add anything to the order
            } else {
                return [...order];
            }
        }
        const po: IPurchaseOrder = {
            name: aug.name,
            faction: aug.faction,
            price: aug.price,
            repreq: aug.repreq,
        };
        return [...neworder, po];
    }
}

// Assumes NFGs are always purchased at the very end, in one go
export const priceOrder = (order: IPurchaseOrder[]): number => {
    let cost = 0;
    let costMult = 1;
    let nfgMult = 1;
    for (const aug of order) {
        // NFGs are handled differently
        if (aug.name === "NeuroFlux Governor") {
            cost += aug.price * costMult * nfgMult;
            costMult *= COST_MULT;
            nfgMult *= NFG_MULT;
        } else {
            cost += aug.price * costMult;
            costMult *= COST_MULT;
        }
    }
    return cost;
}

export const countNfgs = (ns: NS): [string, number, number] => {
    // get non-gang faction with highest reputation
    let factions = ns.getPlayer().factions;
    if (ns.gang.inGang()) {
        const gang = ns.gang.getGangInformation();
        factions = factions.filter(f => f !== gang.faction)
    }
    const withrep: [string,number][] = factions.map(f => [f, ns.singularity.getFactionRep(f)]) ;
    withrep.sort((a, b) => b[1] - a[1]);
    const [faction ,currRep] = withrep[0];

    // buy NFGs
    let num = 0;
    let cost = 0;
    let price = ns.singularity.getAugmentationPrice("NeuroFlux Governor");
    let repreq = ns.singularity.getAugmentationRepReq("NeuroFlux Governor");
    const money = ns.getServerMoneyAvailable("home");
    while ( (repreq <= currRep) && (cost + price <= money) ) {
        num++;
        cost += price;
        price *= COST_MULT * NFG_MULT;
        repreq *= NFG_MULT;
    }

    return [faction, num, cost];
}
