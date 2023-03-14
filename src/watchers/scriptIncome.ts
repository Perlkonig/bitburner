import { NS } from "@ns";
import { createSidebarItem, sidebar } from "lib/box/box";
import { BoxNode } from "../../MyTypes";

const history: number[] = [];
const sleep = 5;
const period = 1; // in hours
const limit = Math.round((period * 60 * 60) / sleep);

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

    const box = createSidebarItem("Scripts", "<p>Loading...</p>", "\ueac9") as BoxNode;

	while (true) {
        if ( (sidebar !== null) && (! sidebar.contains(box)) ) {
            ns.exit();
        }

        let body = "";

        const [active, overall] = ns.getTotalScriptIncome();
        history.push(active);
        if (history.length > limit) {
            history.splice(0, 1);
        }
        const changeAbs = active - history[0];
        let changeRel = Infinity;
        if (history[0] !== 0) {
            changeRel = changeAbs / history[0];
        }

        body += `<p>Current: $${ns.formatNumber(active, 2)}/s`;
        if (! isNaN(changeRel)) {
            if (changeRel >= 0) {
                body += ` (<span style="color: green">${ns.formatPercent(changeRel, 1)}</span>)`
            } else {
                body += ` (<span style="color: red">${ns.formatPercent(changeRel, 1)}</span>)`
            }
        }
        body += "</p>";
        body += `<p>Since Augs: $${ns.formatNumber(overall, 2)}/s</p>`

        box.body.innerHTML = body;
        box.recalcHeight();

		await ns.sleep(sleep * 1000);
	}
}