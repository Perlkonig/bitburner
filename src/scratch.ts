import { MyNS } from "../MyTypes";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function main(ns: MyNS): Promise<void> {
    for (const frag of ns.stanek.fragmentDefinitions()) {
        ns.tprint(JSON.stringify(frag, null, 2));
    }
}

