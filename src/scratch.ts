import { MyNS } from "../MyTypes";
import { createSidebarItem } from "lib/box/box";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function main(ns: MyNS): Promise<void> {
    const karma = Math.abs(ns.heart.break());
    createSidebarItem("Karma", `<progress max="54000" value="${karma}"></progress>`, "\ueb05");
}
