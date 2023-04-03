import { MyNS } from "../MyTypes";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function main(ns: MyNS): Promise<void> {
    const mults = ns.singularity.getAugmentationStats("ECorp HVMind Implant");
    ns.tprint(JSON.stringify(mults,  null, 2));
}

