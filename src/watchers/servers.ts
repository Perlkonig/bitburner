import { NS } from "@ns";
import { createBox } from "lib/box/box";
import { BoxNode } from "../../MyTypes";
import { listServers } from "lib/network";

const sleep = 5;

interface IServerInfo {
    name: string;
    hlvl: number;
    moneyMax: number;
    moneyNow: number;
    securityMin: number;
    securityNow: number;
}

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

    const box = createBox("Servers", "<p>Loading...</p>", "\ueba3") as BoxNode;

	while (true) {

        const purchased = ns.getPurchasedServers();
        const servers = listServers(ns, "home").filter(s => ( (s !== "home") && (! s.startsWith("hacknet")) && (! purchased.includes(s)) ));
        const info: IServerInfo[] = [];
        for (const server of servers) {
            info.push({
                name: server,
                hlvl: ns.getServerRequiredHackingLevel(server),
                moneyMax: ns.getServerMaxMoney(server),
                moneyNow: ns.getServerMoneyAvailable(server),
                securityMin: ns.getServerMinSecurityLevel(server),
                securityNow: ns.getServerSecurityLevel(server)
            });
        }
        info.sort((a, b) => b.hlvl - a.hlvl);

        let body = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Available</th>
                        <th>Max</th>
                        <th>%</th>
                        <th>Hlvl</th>
                        <th>Sec. Min</th>
                        <th>Sec. Now</th>
                    </tr>
                <thead>
                <tbody>
        `;

        for (const server of info) {
            let percent = server.moneyNow / server.moneyMax;
            if (isNaN(percent)) {
                percent = 0;
            }
            body += `
                <tr>
                    <td><span style="color: green">${server.name}</span></td>
                    <td>${ns.formatNumber(server.moneyNow, 2)}</td>
                    <td>${ns.formatNumber(server.moneyMax, 2)}</td>
                    <td>${ns.formatPercent(percent, 1)}</td>
                    <td>${server.hlvl}</td>
                    <td>${ns.formatNumber(server.securityMin, 2)}</td>
                    <td>${ns.formatNumber(server.securityNow, 3)}</td>
                </tr>
            `;
        }

        body += `
                </tbody>
            </table>
        `;

        box.body.innerHTML = body;
        box.recalcHeight();

		await ns.sleep(sleep * 1000);
	}
}