import { MyNS } from "../MyTypes";
import { wng } from "lib/names";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function main(ns: MyNS): Promise<void> {
    let num = 5;
    if (ns.args.length > 0) {
        num = ns.args[0] as number;
    }
    for (let i = 0; i < num; i++) {
        ns.tprint(wng());
    }
}
