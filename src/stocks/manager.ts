import { NS } from "@ns";
import { IPriceHistory } from "./daemon";
import { sidebar, createSidebarItem } from "lib/box/box";
import { BoxNode } from "../../MyTypes";
import { getVolatility, getForecast } from "stocks/lib";

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

/** Map of symbols to servers; also serves as hard-coded list of symbols */
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

const commission = 100000;
const reserve = 500 * commission;
const sleepTime = 6;
const shortAvailable = false;
let overallProfit = 0;
let overallValue = 0;
let globalSpent = 0;
let globalCashed = 0;

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    // Disable default Logging
    ns.disableLog("ALL");

    const box: BoxNode = createSidebarItem("Stocks", "<p>Loading...</p>", "\ueb03") as BoxNode;

    while (true) {
        if ( (sidebar !== null) && (! sidebar.contains(box)) ) {
            ns.exit();
        }

        if (ns.stock.hasWSEAccount() && ns.stock.hasTIXAPIAccess()) {
            await tendStocks(ns);
        }
        renderBox(ns, box);

        // Wait for next cycle
        await ns.sleep(sleepTime * 1000);
    }
}

const renderBox = (ns: NS, box: BoxNode): void => {
    const money = ns.getServerMoneyAvailable("home");
    let body = ""
    if (! ns.stock.hasWSEAccount()) {
        body += `<p style="color: red">Need WSE account</p><progress max="200000000" value="${money}"></progress>`
    } else if (! ns.stock.hasTIXAPIAccess()) {
        body += `<p style="color: red">Need TIX API access</p><progress max="5000000000" value="${money}"></progress>`
    // } else if (! ns.stock.has4SData()) {
    //     body += `<p style="color: red">Need 4S data</p><progress max="5000000000" value="${money}"></progress>`
    // } else if (! ns.stock.has4SDataTIXAPI()) {
    //     body += `<p style="color: red">Need 4S API access</p><progress max="100000000000" value="${money}"></progress>`
    } else {
        body += `<p>Portfolio value: $${ns.formatNumber(overallValue, 2)}</p>`;
        if (overallProfit > 0) {
            body += `<p style="color: green">Portfolio profit: $${ns.formatNumber(overallProfit, 2)}</p>`;
        } else {
            body += `<p style="color: red">Portfolio profit: $${ns.formatNumber(overallProfit, 2)}</p>`;
        }
        body += `<p>Total cash invested: $${ns.formatNumber(globalSpent, 2)}</p>`;
        body += `<p>Total cash received: $${ns.formatNumber(globalCashed, 2)}</p>`;
        let ror = 0;
        if (globalSpent > 0) {
            ror = (globalCashed + overallValue - globalSpent) / globalSpent;
        }
        body += `<p>Overall RoR: ${ns.formatPercent(ror, 2)}</p>`;
    }

    box.body.innerHTML = body;
    box.recalcHeight();
}

// Used to throttle the amount of total money spent on stocks in any given tick
const getSpendingMoney = (ns: NS) => {
    let factor = 0.5;
    const processes = ns.ps("home").map(p => p.filename);
    if (processes.includes("purchase-servers.js")) {
        factor = 0.25;
    }
    return ns.getServerMoneyAvailable("home") * factor;
}

const tendStocks = async (ns: NS): Promise<void> => {
    ns.print("");
    const stocks = await getAllStocks(ns)
    stocks.sort((a, b) => b.profitPotential - a.profitPotential);

    const longStocks = new Set<string>();
    const shortStocks = new Set<string>();
    overallValue = 0;
    overallProfit = 0;

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
                globalCashed += saleTotal;
                const saleCost = stock.longPrice * stock.longShares;
                const saleProfit = saleTotal - saleCost - 2 * commission;
                // globalProfit += saleProfit;
                stock.longShares = 0;
                shortStocks.add(stock.sym);
                ns.print(`WARN ${stock.summary} SOLD for $${ns.formatNumber(saleProfit, 1)} profit`);
            }
        }
        if (stock.shortShares > 0) {
            if (stock.forecast < 0.5) {
                shortStocks.add(stock.sym);
                ns.print(`INFO ${stock.summary} SHORT $${ns.formatNumber(stock.cost + stock.profit, 1)} ${ns.formatNumber(100 * stock.profit / stock.cost, 2)}%`);
                overallValue += (stock.cost + stock.profit);
                overallProfit += stock.profit;
            }
            else {
                const salePrice = ns.stock.sellShort(stock.sym, stock.shortShares);
                const saleTotal = salePrice * stock.shortShares;
                globalCashed += saleTotal;
                const saleCost = stock.shortPrice * stock.shortShares;
                const saleProfit = saleTotal - saleCost - 2 * commission;
                // globalProfit += saleProfit;
                stock.shortShares = 0;
                longStocks.add(stock.sym);
                ns.print(`WARN ${stock.summary} SHORT SOLD for $${ns.formatNumber(saleProfit, 1)} profit`);
            }
        }
    }

    for (const stock of stocks) {
        const money = getSpendingMoney(ns);
        if (stock.forecast > 0.55) {
            longStocks.add(stock.sym);
            if (money > reserve) {
                const sharesToBuy = Math.min(stock.maxShares, Math.floor((money - commission) / stock.askPrice));
                const salePrice = ns.stock.buyStock(stock.sym, sharesToBuy);
                if (salePrice > 0) {
                    ns.print(`WARN ${stock.summary} LONG BOUGHT ${ns.formatNumber(sharesToBuy, 1)}`);
                    globalSpent += (sharesToBuy * salePrice) + commission;
                }
            }
        }
        else if (stock.forecast < 0.45 && shortAvailable) {
            shortStocks.add(stock.sym);
            if (money > reserve) {
                const sharesToBuy = Math.min(stock.maxShares, Math.floor((money - commission) / stock.bidPrice));
                const salePrice = ns.stock.buyShort(stock.sym, sharesToBuy);
                if (salePrice > 0) {
                    ns.print(`WARN ${stock.summary} SHORT BOUGHT ${ns.formatNumber(sharesToBuy, 1)}`);
                    globalSpent += (sharesToBuy * salePrice) + commission;
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

const getAllStocks = async (ns: NS): Promise<IHolding[]> => {
    let history: IPriceHistory = {};
    if (!ns.stock.has4SData() || !ns.stock.has4SDataTIXAPI()) {
        // get latest price information
        const handle = ns.getPortHandle(4);
        while (handle.empty()) {
            await ns.sleep(200);
        }
        history = JSON.parse(handle.read() as string);
    }

    // make a lookup table of all stocks and all their properties
    const stockSymbols = Object.keys(symServer);
    const stocks: IHolding[] = [];
    for (const sym of stockSymbols) {

        let forecast = 0;
        let volatility = 0;
        if (ns.stock.has4SData() && ns.stock.has4SDataTIXAPI()) {
            forecast = ns.stock.getForecast(sym);
            volatility = ns.stock.getVolatility(sym);
        } else {
            forecast = getForecast(history[sym]);
            volatility = getVolatility(history[sym]);
        }

        const pos = ns.stock.getPosition(sym);
        const stock: IHolding = {
            sym: sym,
            longShares: pos[0],
            longPrice: pos[1],
            shortShares: pos[2],
            shortPrice: pos[3],
            forecast,
            volatility,
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
