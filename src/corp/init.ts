import { CityName, Division, NS } from "@ns";

const cities: CityName[] = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"] as CityName[];

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	ns.disableLog("disableLog"); ns.disableLog("sleep");

	if (ns.fileExists("pragma_NoCorp.txt")) {
		ns.print(`Corporation management disabled by pragma.`);
		ns.tprint(`Corporation management disabled by pragma.`);
		ns.exit();
	}

	if (ns.corporation.hasCorporation()) {
        ns.tprint("You already have a corporation!");
        ns.exit();
	}

    ns.corporation.createCorporation("MyCorp", true);
    ns.corporation.expandIndustry("Tobacco", "Tobacco");
    initialCorpUpgrade(ns);
    const division = ns.corporation.getDivision("Tobacco");
    await initCities(ns, division);

    ns.tprint("Initial corp setup complete. Starting the prep script.");
    ns.exec("/corp/prep.js", "home");
}

function initialCorpUpgrade(ns: NS) {
	ns.corporation.unlockUpgrade("Smart Supply");
	ns.corporation.levelUpgrade("Smart Storage");
	ns.corporation.levelUpgrade("Smart Storage");
	ns.corporation.levelUpgrade("Smart Storage");
	ns.corporation.levelUpgrade("Smart Storage");
	ns.corporation.levelUpgrade("DreamSense");
	// upgrade employee stats
	ns.corporation.levelUpgrade("Nuoptimal Nootropic Injector Implants");
	ns.corporation.levelUpgrade("Speech Processor Implants");
	ns.corporation.levelUpgrade("Neural Accelerators");
	ns.corporation.levelUpgrade("FocusWires");
}

async function initCities(ns: NS, division: Division, productCity: CityName = "Sector-12" as CityName) {
	for (const city of cities) {
		ns.tprint("Expand " + division.name + " to City " + city);
		if (!division.cities.includes(city)) {
			ns.corporation.expandCity(division.name, city);
			ns.corporation.purchaseWarehouse(division.name, city);
		}

		ns.corporation.setSmartSupply(division.name, city, true); // does not work anymore, bug?

		if (city != productCity) {
			// setup employees
			for (let i = 0; i < 3; i++) {
				ns.corporation.hireEmployee(division.name, city);
			}
			ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", 3);
		}
		else {
			const warehouseUpgrades = 3;
			// get a bigger warehouse in the product city. we can produce and sell more here
			for (let i = 0; i < warehouseUpgrades; i++) {
				ns.corporation.upgradeWarehouse(division.name, city);
			}
			// get more employees in the main product development city
			const newEmployees = 9;
			ns.corporation.upgradeOfficeSize(division.name, productCity, newEmployees);
			for (let i = 0; i < newEmployees + 3; i++) {
				ns.corporation.hireEmployee(division.name, productCity);
			}
			ns.corporation.setAutoJobAssignment(division.name, productCity, "Operations", 4);
			ns.corporation.setAutoJobAssignment(division.name, productCity, "Engineer", 6);
			ns.corporation.setAutoJobAssignment(division.name, productCity, "Management", 2);
		}
		const warehouseUpgrades = 3;
		for (let i = 0; i < warehouseUpgrades; i++) {
			ns.corporation.upgradeWarehouse(division.name, city);
		}
	}

	ns.corporation.makeProduct(division.name, productCity, "Product-0", 1000000000, 1000000000);
	ns.corporation.makeProduct(division.name, productCity, "Product-1", 0, 0);
	ns.corporation.makeProduct(division.name, productCity, "Product-2", 0, 0);
}
