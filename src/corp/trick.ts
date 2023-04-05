import { CityName, Division, NS } from "@ns";

const cities: CityName[] = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"] as CityName[];

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	ns.disableLog("disableLog"); ns.disableLog("sleep");

	if (! ns.corporation.hasCorporation()) {
        ns.tprint("No corporation to prepare!");
        ns.exit();
	}

    const division = ns.corporation.getDivision("Tobacco");
    if ( (ns.args.length === 0) || (ns.args[0] === "noinit") ) {
        const initialInvestFunds = ns.corporation.getInvestmentOffer().funds;
        ns.tprint("Initial investmant offer: $" + ns.formatNumber(initialInvestFunds, 1));
        for (const city of cities) {
            // put all employees into business to sell as much as possible
            const employees = ns.corporation.getOffice(division.name, city).employees;
            ns.corporation.setAutoJobAssignment(division.name, city, "Operations", 0);
            ns.corporation.setAutoJobAssignment(division.name, city, "Business", employees - 2); // workaround for bug
            ns.corporation.setAutoJobAssignment(division.name, city, "Business", employees - 1); // workaround for bug
            ns.corporation.setAutoJobAssignment(division.name, city, "Business", employees);
        }
        await ns.sleep(2000);
        // wait until after next selling phase
        ns.tprint("Waiting until after next selling phase")
        while (ns.corporation.getCorporation().state !== "START") {
            await ns.sleep(200);
        }
        ns.tprint("Setting sale amounts to MAX");
        for (const product of division.products) {
            ns.corporation.sellProduct(division.name, "Sector-12", product, "MAX", "MP", true);
        }
        // wait until next selling phase
        ns.tprint("Waiting until next selling phase");
        while (ns.corporation.getCorporation().state !== "SALE") {
            await ns.sleep(200);
        }
        // wait until selling phase complete
        ns.tprint("Waiting until after next cycle starts just to be safe.")
        while (ns.corporation.getCorporation().state !== "PURCHASE") {
            await ns.sleep(200);
        }

        ns.tprint("Investment offer for 10% shares: $" + ns.formatNumber(ns.corporation.getInvestmentOffer().funds, 1));
        ns.tprint("Funds before public: $" + ns.formatNumber(ns.corporation.getCorporation().funds, 1));

        ns.corporation.goPublic(800e6);

        ns.tprint("Funds after public: " + ns.formatNumber(ns.corporation.getCorporation().funds, 1));
        await ns.sleep(1000);
        for (const city of cities) {
            // set employees back to normal operation
            const employees = ns.corporation.getOffice(division.name, city).employees;
            ns.corporation.setAutoJobAssignment(division.name, city, "Business", 0);
            if (city === "Sector-12") {
                ns.corporation.setAutoJobAssignment(division.name, city, "Operations", 1);
                ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", (employees - 2));
                ns.corporation.setAutoJobAssignment(division.name, city, "Management", 1);
            }
            else {
                ns.corporation.setAutoJobAssignment(division.name, city, "Operations", 1);
                ns.corporation.setAutoJobAssignment(division.name, city, "Research & Development", (employees - 1));
            }
        }
    }

    if ( (ns.corporation.getCorporation().funds > 1e12) && ( (ns.args.length === 0) || (ns.args[0] === "init") ) ) {
        // with gained money, expand to the most profitable division
        ns.corporation.expandIndustry("Healthcare", "Healthcare");
        await initCities(ns, ns.corporation.getDivision("Healthcare"));

        ns.tprint("Trick complete and new division configured. Starting the management script.");
        ns.exec("/corp/manage.js", "home");
    } else {
        ns.tprint(`New division NOT created!`);
    }
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
