import { CityName, Division, NS } from "@ns";
import { BoxNode } from "/../MyTypes";
import { createSidebarItem, sidebar } from "/lib/box/box";

const cities: CityName[] = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"] as CityName[];

const upgradeList = [
	// lower priority value -> upgrade faster
	{ prio: 2, name: "Project Insight", },
	{ prio: 2, name: "DreamSense" },
	{ prio: 4, name: "ABC SalesBots" },
	{ prio: 4, name: "Smart Factories" },
	{ prio: 4, name: "Smart Storage" },
	{ prio: 8, name: "Neural Accelerators" },
	{ prio: 8, name: "Nuoptimal Nootropic Injector Implants" },
	{ prio: 8, name: "FocusWires" },
	{ prio: 8, name: "Speech Processor Implants" },
	{ prio: 8, name: "Wilson Analytics" },
];

const researchList = [
	// lower priority value -> upgrade faster
	{ prio: 10, name: "Overclock" },
	{ prio: 10, name: "uPgrade: Fulcrum" },
	{ prio: 3, name: "uPgrade: Capacity.I" },
	{ prio: 4, name: "uPgrade: Capacity.II" },
	{ prio: 10, name: "Self-Correcting Assemblers" },
	{ prio: 21, name: "Drones" },
	{ prio: 4, name: "Drones - Assembly" },
	{ prio: 10, name: "Drones - Transport" },
	{ prio: 26, name: "Automatic Drug Administration" },
	{ prio: 10, name: "CPH4 Injections" },
];

const jobList = ["Operations", "Engineer", "Business", "Management", "Research & Development", "Training"];

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

	if (! ns.corporation.hasCorporation()) {
        ns.tprint("No corporation to manage!");
        ns.exit();
	}

    const box: BoxNode = createSidebarItem("Corporation", "<p>Loading...</p>", "\ueb07") as BoxNode;

	while (true) {
        if ( (sidebar !== null) && (! sidebar.contains(box)) ) {
            ns.exit();
        }

		const corp = ns.corporation.getCorporation();
        manageShares(ns);
		for (const divName of corp.divisions.reverse()) {
			const division = ns.corporation.getDivision(divName);
			upgradeWarehouses(ns, division);
			upgradeCorp(ns);
			hireEmployees(ns, division);
			newProduct(ns, division);
			doResearch(ns, division);
		}

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
        body += `<p>Dividend %: ${ns.formatPercent(corp.dividendRate)}</p>`
        body += `<p>Dividend $: $${ns.formatNumber(corp.dividendEarnings, 2)}/s</p>`

        box.body.innerHTML = body;
        box.recalcHeight();

		await ns.sleep(5000);
	}
}

function manageShares(ns: NS): void {
    const corp = ns.corporation.getCorporation();
    const money = ns.getServerMoneyAvailable("home");
    if (corp.numShares < corp.totalShares) {
        ns.corporation.issueDividends(1);
        if ( ( (corp.sharePrice < 100) && (money > corp.sharePrice * (corp.totalShares - corp.numShares) * 2) ) || (money * 0.1 > corp.sharePrice * (corp.totalShares - corp.numShares)) ) {
            ns.toast("Buying back shares", "success", null);
            ns.corporation.buyBackShares(corp.totalShares - corp.numShares);
            ns.corporation.issueDividends(.5);
        }
    }
}

function hireEmployees(ns: NS, division: Division, productCity: CityName = "Sector-12" as CityName): void {
	while (ns.corporation.getCorporation().funds > (cities.length * ns.corporation.getOfficeSizeUpgradeCost(division.name, productCity, 3))) {
		// upgrade all cities + 3 employees if sufficient funds
		ns.print(division.name + " Upgrade office size");
		for (const city of cities) {
			ns.corporation.upgradeOfficeSize(division.name, city, 3);
			for (let i = 0; i < 3; i++) {
				ns.corporation.hireEmployee(division.name, city);
			}
		}
	}
	// check for unassigned employees
	for (const city of cities) {
		const office = ns.corporation.getOffice(division.name, city);
		const employees = office.employees;
		let unassigned = 0;
		// eslint-disable-next-line no-prototype-builtins
		if (office.employeeJobs.hasOwnProperty("Unassigned")) {
			unassigned = office.employeeJobs["Unassigned"];
		}
		if (unassigned > 0) {
			unassignWorkers(ns, division.name, city);
			if (ns.corporation.hasResearched(division.name, "Market-TA.II")) {
				// TODO: Simplify here. ProductCity config can always be used
				if (city == productCity) {
					ns.corporation.setAutoJobAssignment(division.name, city, "Operations", Math.ceil(employees / 5));
					ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", Math.ceil(employees / 5));
					ns.corporation.setAutoJobAssignment(division.name, city, "Business", Math.ceil(employees / 5));
					ns.corporation.setAutoJobAssignment(division.name, city, "Management", Math.ceil(employees / 10));
					const remainingEmployees = employees - (3 * Math.ceil(employees / 5) + Math.ceil(employees / 10));
					// ns.corporation.setAutoJobAssignment(division.name, city, "Training", Math.ceil(remainingEmployees));
                    ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", Math.ceil(remainingEmployees));

				}
				else {
					ns.corporation.setAutoJobAssignment(division.name, city, "Operations", Math.floor(employees / 10));
					ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", 1);
					ns.corporation.setAutoJobAssignment(division.name, city, "Business", Math.floor(employees / 5));
					ns.corporation.setAutoJobAssignment(division.name, city, "Management", Math.ceil(employees / 100));
					ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", Math.ceil(employees / 2));
					const remainingEmployees = employees - (Math.floor(employees / 5) + Math.floor(employees / 10) + 1 + Math.ceil(employees / 100) + Math.ceil(employees / 2));
					// ns.corporation.setAutoJobAssignment(division.name, city, "Training", Math.floor(remainingEmployees));
					ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", Math.ceil(employees / 2) + remainingEmployees);
				}
			}
			else {
				if (city == productCity) {
					ns.corporation.setAutoJobAssignment(division.name, city, "Operations", Math.floor((employees - 2) / 2));
					ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", Math.ceil((employees - 2) / 2));
					ns.corporation.setAutoJobAssignment(division.name, city, "Management", 2);
				}
				else {
					ns.corporation.setAutoJobAssignment(division.name, city, "Operations", 1);
					ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", 1);
					ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", (employees - 2));
				}
			}
		}
	}
}

function unassignWorkers(ns: NS, divname: string, city: CityName): void {
	for (const job of jobList) {
		ns.corporation.setAutoJobAssignment(divname, city, job, 0);
	}
}

function upgradeWarehouses(ns: NS, division: Division): void {
	for (const city of cities) {
		// check if warehouses are near max capacity and upgrade if needed
		const cityWarehouse = ns.corporation.getWarehouse(division.name, city);
		if (cityWarehouse.sizeUsed > 0.9 * cityWarehouse.size) {
			if (ns.corporation.getCorporation().funds > ns.corporation.getUpgradeWarehouseCost(division.name, city)) {
				ns.print(division.name + " Upgrade warehouse in " + city);
				ns.corporation.upgradeWarehouse(division.name, city);
			}
		}
	}
	if (ns.corporation.getUpgradeLevel("Wilson Analytics") > 20) {
		// Upgrade AdVert.Inc after a certain amount of Wilson Analytivs upgrades are available
		if (ns.corporation.getCorporation().funds > (4 * ns.corporation.getHireAdVertCost(division.name))) {
			ns.print(division.name + " Hire AdVert");
			ns.corporation.hireAdVert(division.name);
		}
	}
}

function upgradeCorp(ns:NS): void {
	for (const upgrade of upgradeList) {
		// purchase upgrades based on available funds and priority; see upgradeList
		if (ns.corporation.getCorporation().funds > (upgrade.prio * ns.corporation.getUpgradeLevelCost(upgrade.name))) {
			// those two upgrades ony make sense later once we can afford a bunch of them and already have some base marketing from DreamSense
			if ((upgrade.name != "ABC SalesBots" && upgrade.name != "Wilson Analytics") || (ns.corporation.getUpgradeLevel("DreamSense") > 20)) {
				ns.print("Upgrade " + upgrade.name + " to " + (ns.corporation.getUpgradeLevel(upgrade.name) + 1));
				ns.corporation.levelUpgrade(upgrade.name);
			}
		}
	}
	if (!ns.corporation.hasUnlockUpgrade("Shady Accounting") && ns.corporation.getUnlockUpgradeCost("Shady Accounting") * 2 < ns.corporation.getCorporation().funds) {
		ns.print("Unlock Shady Accounting")
		ns.corporation.unlockUpgrade("Shady Accounting");
	}
	else if (!ns.corporation.hasUnlockUpgrade("Government Partnership") && ns.corporation.getUnlockUpgradeCost("Government Partnership") * 2 < ns.corporation.getCorporation().funds) {
		ns.print("Unlock Government Partnership")
		ns.corporation.unlockUpgrade("Government Partnership");
	}
}

function doResearch(ns: NS, division: Division): void {
	const laboratory = "Hi-Tech R&D Laboratory"
	const marketTAI = "Market-TA.I";
	const marketTAII = "Market-TA.II";
	if (!ns.corporation.hasResearched(division.name, laboratory)) {
		// always research labaratory first
		if (division.research > ns.corporation.getResearchCost(division.name, laboratory)) {
			ns.print(division.name + " Research " + laboratory);
			ns.corporation.research(division.name, laboratory);
		}
	}
	else if (!ns.corporation.hasResearched(division.name, marketTAII)) {
		// always research Market-TA.I plus .II first and in one step
		const researchCost = ns.corporation.getResearchCost(division.name, marketTAI)
			+ ns.corporation.getResearchCost(division.name, marketTAII);

		if (division.research > researchCost * 1.1) {
			ns.print(division.name + " Research " + marketTAI);
			ns.corporation.research(division.name, marketTAI);
			ns.print(division.name + " Research " + marketTAII);
			ns.corporation.research(division.name, marketTAII);
			for (const product of division.products) {
				ns.corporation.setProductMarketTA1(division.name, product, true);
				ns.corporation.setProductMarketTA2(division.name, product, true);
			}
		}
		return;
	}
	else {
		for (const researchObject of researchList) {
			// research other upgrades based on available funds and priority; see researchList
			if (!ns.corporation.hasResearched(division.name, researchObject.name)) {
				if (division.research > (researchObject.prio * ns.corporation.getResearchCost(division.name, researchObject.name))) {
					ns.print(division.name + " Research " + researchObject.name);
					ns.corporation.research(division.name, researchObject.name);
				}
			}
		}
	}
}

function newProduct(ns: NS, division: Division): boolean {
	//ns.print("Products: " + division.products);
	const productNumbers = [];
	for (const product of division.products) {
		if (ns.corporation.getProduct(division.name, product).developmentProgress < 100) {
			return false;
		}
		else {
			productNumbers.push(product.charAt(product.length - 1));
			// initial sell value if nothing is defined yet is 0
			if (ns.corporation.getProduct(division.name, product).sCost == 0) {
				ns.print(division.name + " Start selling product " + product);
				ns.corporation.sellProduct(division.name, "Sector-12", product, "MAX", "MP", true);
				if (ns.corporation.hasResearched(division.name, "Market-TA.II")) {
					ns.corporation.setProductMarketTA1(division.name, product, true);
					ns.corporation.setProductMarketTA2(division.name, product, true);
				}
			}
		}
	}

	let numProducts = 3;
	// amount of products which can be sold in parallel is 3; can be upgraded
	if (ns.corporation.hasResearched(division.name, "uPgrade: Capacity.I")) {
		numProducts++;
		if (ns.corporation.hasResearched(division.name, "uPgrade: Capacity.II")) {
			numProducts++;
		}
	}

	if (productNumbers.length >= numProducts) {
		// discontinue the oldest product if over max amount of products
		ns.print(division.name + " Discontinue product " + division.products[0]);
		ns.corporation.discontinueProduct(division.name, division.products[0]);
	}

	// get the product number of the latest product and increase it by 1 for the mext product. Product names must be unique.
	let newProductNumber = 0;
	if (productNumbers.length > 0) {
		newProductNumber = parseInt(productNumbers[productNumbers.length - 1]) + 1;
		// cap product numbers to one digit and restart at 0 if > 9.
		if (newProductNumber > 9) {
			newProductNumber = 0;
		}
	}
	const newProductName = "Product-" + newProductNumber;
	let productInvest = 1e9;
	if (ns.corporation.getCorporation().funds < (2 * productInvest)) {
		if (ns.corporation.getCorporation().funds <= 0) {
			ns.print("WARN negative funds, cannot start new product development $" + ns.formatNumber(ns.corporation.getCorporation().funds, 1));
			return false;
		}
		else {
			productInvest = Math.floor(ns.corporation.getCorporation().funds / 2);
		}
	}
	ns.print("Start new product development " + newProductName);
	ns.corporation.makeProduct(division.name, "Sector-12", newProductName, productInvest, productInvest);
    return true;
}