import { CityName, NS } from "@ns";
import { BoxNode } from "/../MyTypes";
import { createSidebarItem, sidebar } from "/lib/box/box";

const cities: CityName[] = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"] as CityName[];

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	ns.disableLog("disableLog"); ns.disableLog("sleep");

	if (! ns.corporation.hasCorporation()) {
        ns.tprint("No corporation to prepare!");
        ns.exit();
	}

    const box: BoxNode = createSidebarItem("Prep Corp", "<p>Loading...</p>", "\ueb07") as BoxNode;

    const division = ns.corporation.getDivision("Tobacco");
    const product3 = ns.corporation.getProduct("Tobacco", division.products[2]);
    while (product3.developmentProgress < 100) {
        let totaldev = 0;
        for (const product of division.products) {
            totaldev += ns.corporation.getProduct("Tobacco", product).developmentProgress;
            ns.corporation.sellProduct(division.name, "Sector-12", product, "MAX", "MP", true);
        }

        const corp = ns.corporation.getCorporation();
        const profit = corp.revenue - corp.expenses;
        let body = "";
        body += `<p>Funds: `;
        if (corp.funds >= 0) {
            body += `<span style="color: green">$${ns.formatNumber(corp.funds, 2)}</span>`
        } else {
            body += `<span style="color: red">$${ns.formatNumber(corp.funds, 2)}</span>`
        }
        body += `</p>`;
        body += `<p>Profit: `;
        if (profit >= 0) {
            body += `<span style="color: green">$${ns.formatNumber(profit, 2)}/s</span>`
        } else {
            body += `<span style="color: red">$${ns.formatNumber(profit, 2)}/s</span>`
        }
        body += `</p>`;
        body += `<p>Development: ${ns.formatNumber(totaldev, 2)}</p>`;
        body += `<progress max="300" value="${totaldev}"></progress>`

        box.body.innerHTML = body;
        box.recalcHeight();

        await ns.sleep(5000);
    }

    // With all products developed, prepare for trick
	for (const product of division.products) {
		// stop selling products
		ns.corporation.sellProduct(division.name, "Sector-12", product, "0", "MP", true);
	}

	for (const city of cities) {
		// put all employees into production to produce as fast as possible
		const employees = ns.corporation.getOffice(division.name, city).employees;

		ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", 0);
		ns.corporation.setAutoJobAssignment(division.name, city, "Management", 0);
		ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", 0);
		ns.corporation.setAutoJobAssignment(division.name, city, "Operations", employees - 2); // workaround for bug
		ns.corporation.setAutoJobAssignment(division.name, city, "Operations", employees - 1); // workaround for bug
		ns.corporation.setAutoJobAssignment(division.name, city, "Operations", employees);
	}

	ns.tprint("Wait for warehouses to fill up");
	let allWarehousesFull = false;
	while (!allWarehousesFull) {
		allWarehousesFull = true;
        let capacity = 0;
        let used = 0;
		for (const city of cities) {
            const warehouse = ns.corporation.getWarehouse("Tobacco", city);
            capacity += warehouse.size;
            used += warehouse.sizeUsed;
			if (warehouse.sizeUsed <= (0.98 * warehouse.size)) {
				allWarehousesFull = false;
				break;
			}
		}

        const corp = ns.corporation.getCorporation();
        const profit = corp.revenue - corp.expenses;
        let body = "";
        body += `<p>Funds: `;
        if (corp.funds >= 0) {
            body += `<span style="color: green">$${ns.formatNumber(corp.funds, 2)}</span>`
        } else {
            body += `<span style="color: red">$${ns.formatNumber(corp.funds, 2)}</span>`
        }
        body += `</p>`;
        body += `<p>Profit: `;
        if (profit >= 0) {
            body += `<span style="color: green">$${ns.formatNumber(profit, 2)}/s</span>`
        } else {
            body += `<span style="color: red">$${ns.formatNumber(profit, 2)}/s</span>`
        }
        body += `</p>`;
        body += `<p>% filled: ${ns.formatPercent(used / capacity, 2)}</p>`;
        body += `<progress max="100" value="${(used / capacity) * 100}"></progress>`

        box.body.innerHTML = body;
        box.recalcHeight();

		await ns.sleep(5000);
	}

    if (sidebar !== null) {
        sidebar.removeChild(box);
    }
	ns.tprint("Warehouses are full. Ready to trick investors!");
    ns.toast("Warehouses are full. Ready to trick investors!", "success", null);
}

