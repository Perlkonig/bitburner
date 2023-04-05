import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    for (const frag of ns.stanek.activeFragments()) {
        if (frag.id < 100) {
            await ns.stanek.chargeFragment(frag.x, frag.y);
        }
    }
}
