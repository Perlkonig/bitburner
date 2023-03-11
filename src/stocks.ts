import { NS } from "@ns";
import { dumplog } from "lib/logs";

// requires 4s Market Data TIX API Access

// defines if stocks can be shorted (see BitNode 8)
const shortAvailable = false;

const commission = 100000;
const reserve = 500 * commission;

const symServer: {[k: string]: string} = {
	"WDS": "",
	"ECP": "ecorp",
	"MGCP": "megacorp",
	"BLD": "blade",
	"CLRK": "clarkinc",
	"OMTK": "omnitek",
	"FSIG": "4sigma",
	"KGI": "kuai-gong",
	"DCOMM": "defcomm",
	"VITA": "vitalife",
	"ICRS": "icarus",
	"UNV": "univ-energy",
	"AERO": "aerocorp",
	"SLRS": "solaris",
	"GPH": "global-pharm",
	"NVMD": "nova-med",
	"LXO": "lexo-corp",
	"RHOC": "rho-construction",
	"APHE": "alpha-ent",
	"SYSC": "syscore",
	"CTK": "comptek",
	"NTLK": "netlink",
	"OMGA": "omega-net",
	"JGN": "joesguns",
	"SGC": "sigma-cosmetics",
	"CTYS": "catalyst",
	"MDYN": "microdyne",
	"TITN": "titan-labs",
	"FLCM": "fulcrumtech",
	"STM": "stormtech",
	"HLS": "helios",
	"OMN": "omnia",
	"FNS": "foodnstuff"
}

interface IHolding {
    sym: string;
    longShares: number;
    longPrice: number;
    shortShares: number;
    shortPrice: number;
    forecast: number;
    volatility: number;
    askPrice: number;
    bidPrice: number;
    maxShares: number;
    cost: number;
    profit: number;
    profitPotential: number;
    summary: string;
}

// Used to throttle the amount of total money spent on stocks
const getSpendingMoney = (ns: NS) => {
    let factor = 0.75;
    const processes = ns.ps("home").map(p => p.filename);
    if (processes.includes("purchase-servers.js")) {
        factor = 0.25;
    }
    return ns.getServerMoneyAvailable("home") * factor;
}

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    /* This handle is used to communicate between this and the player action script.
    * When the player action script is ready to install augmentations, it sends the string `LIQUIDATE` to the port.
    * When this script sees this word, it clears the port, liquidates all stocks, and exits.
    * Just before exiting, it posts the string `DONE` to the port so the player action script knows it can continue.
    */
    const port = ns.getPortHandle(20);

	while (true) {
        if (port.peek() === "LIQUIDATE") {
            port.clear();
            liquidate(ns);
            port.write("DONE");
            dumplog(ns, "stocks", "stocks.js");
            ns.exit();
        }

        if (ns.fileExists("pragma_NoStocks.txt")) {
            ns.print(`Stock market disabled by pragma`);
            ns.tprint(`Stock market disabled by pragma`);
            ns.exit();
        }

		if (! ns.stock.hasWSEAccount()) {
			ns.stock.purchaseWseAccount();
		} else if (! ns.stock.has4SData()) {
			ns.stock.purchase4SMarketData();
		} else if (! ns.stock.hasTIXAPIAccess()) {
			ns.stock.purchaseTixApi();
		} else if (! ns.stock.has4SDataTIXAPI()) {
			ns.stock.purchase4SMarketDataTixApi();
		}
        const canTrade = ns.stock.hasTIXAPIAccess();
        const has4s = ns.stock.has4SDataTIXAPI();

		if ( canTrade && has4s ) {
			tendStocks(ns);
		}

		await ns.sleep(5 * 1000);
	}
}

const tendStocks = (ns: NS): void => {
    ns.print("");
    const stocks = getAllStocks(ns);

    stocks.sort((a, b) => b.profitPotential - a.profitPotential);

    const longStocks = new Set<string>();
    const shortStocks = new Set<string>();
    let overallValue = 0;
    let overallProfit = 0;

    for (const stock of stocks) {
        if (stock.longShares > 0) {
            if (stock.forecast > 0.5) {
                longStocks.add(stock.sym);
                ns.print(`INFO ${stock.summary} LONG ${ns.formatNumber(stock.cost + stock.profit, 1)} ${ns.formatNumber(100 * stock.profit / stock.cost, 2)}%`);
                overallValue += (stock.cost + stock.profit);
                overallProfit += stock.profit;
            }
            else {
                const salePrice = ns.stock.sellStock(stock.sym, stock.longShares);
                const saleTotal = salePrice * stock.longShares;
                const saleCost = stock.longPrice * stock.longShares;
                const saleProfit = saleTotal - saleCost - 2 * commission;
                stock.longShares = 0;
                shortStocks.add(stock.sym);
                ns.print(`WARN ${stock.summary} SOLD for ${ns.nFormat(saleProfit, "$0.0a")} profit`);
            }
        }
        if (stock.shortShares > 0) {
            if (stock.forecast < 0.5) {
                shortStocks.add(stock.sym);
                ns.print(`INFO ${stock.summary} SHORT ${ns.nFormat(stock.cost + stock.profit, "0.0a")} ${ns.formatNumber(100 * stock.profit / stock.cost, 2)}%`);
                overallValue += (stock.cost + stock.profit);
                overallProfit += stock.profit;
            }
            else {
                const salePrice = ns.stock.sellShort(stock.sym, stock.shortShares);
                const saleTotal = salePrice * stock.shortShares;
                const saleCost = stock.shortPrice * stock.shortShares;
                const saleProfit = saleTotal - saleCost - 2 * commission;
                stock.shortShares = 0;
                longStocks.add(stock.sym);
                ns.print(`WARN ${stock.summary} SHORT SOLD for ${ns.nFormat(saleProfit, "$0.0a")} profit`);
            }
        }
    }

    for (const stock of stocks) {
        const money = getSpendingMoney(ns);
        //ns.print(`INFO ${stock.summary}`);
        if (stock.forecast > 0.55) {
            longStocks.add(stock.sym);
            //ns.print(`INFO ${stock.summary}`);
            if (money > reserve) {
                const sharesToBuy = Math.min(stock.maxShares, Math.floor((money - commission) / stock.askPrice));
                if (ns.stock.buyStock(stock.sym, sharesToBuy) > 0) {
                    ns.print(`WARN ${stock.summary} LONG BOUGHT ${ns.nFormat(sharesToBuy, "$0.0a")}`);
                }
            }
        }
        else if (stock.forecast < 0.45 && shortAvailable) {
            shortStocks.add(stock.sym);
            //ns.print(`INFO ${stock.summary}`);
            if (money > reserve) {
                const sharesToBuy = Math.min(stock.maxShares, Math.floor((money - commission) / stock.bidPrice));
                if (ns.stock.buyShort(stock.sym, sharesToBuy) > 0) {
                    ns.print(`WARN ${stock.summary} SHORT BOUGHT $${ns.formatNumber(sharesToBuy, 1)}`);
                }
            }
        }
    }
    ns.print("Stock value: " + ns.formatNumber(overallValue, 1) + ` (Profit: ${ns.formatNumber(overallProfit, 1)})`);

    // send stock market manipulation orders to hack manager
    const growStockPort = ns.getPortHandle(1); // port 1 is grow
    const hackStockPort = ns.getPortHandle(2); // port 2 is hack
    if (growStockPort.empty() && hackStockPort.empty()) {
        // only write to ports if empty
        for (const sym of longStocks) {
            //ns.print("INFO grow " + sym);
            growStockPort.write(symServer[sym]);
        }
        for (const sym of shortStocks) {
            //ns.print("INFO hack " + sym);
            hackStockPort.write(symServer[sym]);
        }
    }
}

export const liquidate = (ns: NS): void => {
    ns.print("Received LIQUIDATION command");
    const stocks = getAllStocks(ns);
    for (const stock of stocks) {
        if (stock.longShares > 0) {
            const salePrice = ns.stock.sellStock(stock.sym, stock.longShares);
            const saleTotal = salePrice * stock.longShares;
            const saleCost = stock.longPrice * stock.longShares;
            const saleProfit = saleTotal - saleCost - 2 * commission;
            stock.longShares = 0;
            ns.print(`WARN ${stock.summary} SOLD for $${ns.formatNumber(saleProfit, 1)} profit`);
        }
        if (stock.shortShares > 0) {
            const salePrice = ns.stock.sellShort(stock.sym, stock.shortShares);
            const saleTotal = salePrice * stock.shortShares;
            const saleCost = stock.shortPrice * stock.shortShares;
            const saleProfit = saleTotal - saleCost - 2 * commission;
            stock.shortShares = 0;
            ns.print(`WARN ${stock.summary} SHORT SOLD for $${ns.formatNumber(saleProfit, 1)} profit`);
        }
    }
}

export const getAllStocks = (ns: NS): IHolding[] => {
    // make a lookup table of all stocks and all their properties
    if ( (! ns.stock.hasWSEAccount()) ||
         (! ns.stock.hasTIXAPIAccess()) ||
         (! ns.stock.has4SData()) ||
         (! ns.stock.has4SDataTIXAPI()) ) {
        return [];
    }

    const stockSymbols = ns.stock.getSymbols();
    const stocks: IHolding[] = [];
    for (const sym of stockSymbols) {

        const pos = ns.stock.getPosition(sym);
        const stock: IHolding = {
            sym: sym,
            longShares: pos[0],
            longPrice: pos[1],
            shortShares: pos[2],
            shortPrice: pos[3],
            forecast: ns.stock.getForecast(sym),
            volatility: ns.stock.getVolatility(sym),
            askPrice: ns.stock.getAskPrice(sym),
            bidPrice: ns.stock.getBidPrice(sym),
            maxShares: ns.stock.getMaxShares(sym),
            cost: 0,
            profit: 0,
            profitPotential: 0,
            summary: ""
        };

        const longProfit = stock.longShares * (stock.bidPrice - stock.longPrice) - 2 * commission;
        const shortProfit = stock.shortShares * (stock.shortPrice - stock.askPrice) - 2 * commission;
        stock.profit = longProfit + shortProfit;
        stock.cost = (stock.longShares * stock.longPrice) + (stock.shortShares * stock.shortPrice)

        // profit potential as chance for profit * effect of profit
        const profitChance = 2 * Math.abs(stock.forecast - 0.5);
        const profitPotential = profitChance * (stock.volatility);
        stock.profitPotential = profitPotential;

        stock.summary = `${stock.sym}: ${stock.forecast.toFixed(3)} ± ${stock.volatility.toFixed(3)}`;
        stocks.push(stock);
    }
    return stocks;
}

// Approximates value at a moment in time, ignoring commissions
export const evaluateStocks = (ns: NS): number => {
    if ( (! ns.stock.hasWSEAccount()) ||
         (! ns.stock.hasTIXAPIAccess()) ||
         (! ns.stock.has4SData()) ||
         (! ns.stock.has4SDataTIXAPI()) ) {
        return 0;
    }

	const stocks = getAllStocks(ns);
	let value = 0;
	for (const stock of stocks) {
		if (stock.longShares > 0) {
			value += stock.longShares * stock.bidPrice;
		}
		if (stock.shortShares > 0) {
			value += stock.shortShares * stock.askPrice;
		}
	}
	return value;
}
