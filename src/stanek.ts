import { MyNS } from "../MyTypes";

enum ConfigID {
    Bladeburner = "BB",
    Combat = "COMBAT",
}

interface IFragment {
    id: number;
    rootX: number;
    rootY: number;
    rot: 0|1|2|3;
}

interface IConfig {
    name: ConfigID;
    width: number;
    height: number;
    fragments: IFragment[];
}

const Configs: IConfig[] = [
    {
        name: ConfigID.Bladeburner,
        width: 6,
        height: 5,
        fragments: [
            // faster hacking
            {
                id: 5,
                rootX: 2,
                rootY: 1,
                rot: 3,
            },
            // strength
            {
                id: 10,
                rootX: 0,
                rootY: 1,
                rot: 1,
            },
            // BB
            {
                id: 30,
                rootX: 3,
                rootY: 2,
                rot: 0,
            },
            // agility
            {
                id: 16,
                rootX: 3,
                rootY: 0,
                rot: 0,
            },
            // defense
            {
                id: 12,
                rootX: 3,
                rootY: 3,
                rot: 0,
            },
            // dexterity
            {
                id: 14,
                rootX: 0,
                rootY: 0,
                rot: 2,
            },
            // facrep
            {
                id: 25,
                rootX: 0,
                rootY: 3,
                rot: 0,
            },
        ],
    },
];

/** @param {MyNS} ns **/
export async function main(ns: MyNS): Promise<void> {
    // get gift
    const haveGift = ns.stanek.acceptGift();
    if (! haveGift) {
        ns.tprint(`Unable to accept gift.`);
        ns.exit();
    }

    // get size
    const w = ns.stanek.giftWidth();
    const h = ns.stanek.giftHeight();

    // check if config was given
    let confid: ConfigID|undefined = undefined;
    if (ns.args.length > 0) {
        confid = ns.args[0] as ConfigID;
    }

    // TODO:
    // if not, guess the config from game state

    // look up the preset config for this size
    if (confid === undefined) {
        ns.tprint(`No config ID was provided nor could one be deduced.`);
        ns.exit();
    }
    const config = Configs.find(c => c.name === confid && c.width === w && c.height === h);
    if (config === undefined) {
        ns.tprint(`Could not find a config that matched the given inputs:\nID: ${confid}, Width: ${w}, Height: ${h}`);
        ns.exit();
    }

    // prompt if any fragment has charges
    const threshold = 0;
    let chargeCount = 0;
    for (const frag of ns.stanek.activeFragments()) {
        chargeCount += frag.numCharge;
    }
    if (chargeCount > threshold) {
        const result = await ns.prompt(`If you proceed you will lose the ${chargeCount} charges in your current gift. Do you wish to proceed?`);
        if (! result) {
            ns.tprint(`Aborting.`);
            ns.exit();
        }
    }

    // clear gift and configure
    ns.stanek.clearGift();
    for (const frag of config.fragments) {
        const success = ns.stanek.placeFragment(frag.rootX, frag.rootY, frag.rot, frag.id);
        if (! success) {
            ns.tprint(`Error placing fragments. Aborting.`);
            ns.exit();
        }
    }

    ns.tprint("Done!");
}
