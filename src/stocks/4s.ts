import { NS } from "@ns";
import { sidebar, createSidebarItem } from "lib/box/box";
import { BoxNode } from "../../MyTypes";
import { getAllStocks, commission } from "lib/stocks";

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


const reserve = 500 * commission;
const sleepTime = 6;
const shortAvailable = true;
let overallProfit = 0;
let overallValue = 0;
let globalSpent = 0;
let globalCashed = 0;
let firstAmt = 0;
let firstTime = 0;

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    // Disable default Logging
    ns.disableLog("ALL");

    globalSpent = 0;
    globalCashed = 0;
    firstAmt = ns.getServerMoneyAvailable("home");
    firstTime = Date.now();
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
        if (ror <= 0) {
            body += `<p style="color: red">Overall RoR: ${ns.formatPercent(ror, 2)}</p>`;
        } else {
            body += `<p style="color: green">Overall RoR: ${ns.formatPercent(ror, 2)}</p>`;
        }

        if (firstAmt !== 0) {
            const delta = ns.getServerMoneyAvailable("home") + overallValue - firstAmt;
            const pc = delta / firstAmt;
            const time = (Date.now() - firstTime) / 1000;
            const persec = delta / time;
            body += `<p>Session: $${ns.formatNumber(delta, 2)} (${ns.formatPercent(pc, 2)})</p>`;
            body += `<p>$${ns.formatNumber(persec, 2)}/sec</p>`;
        }
    }

    box.body.innerHTML = body;
    box.recalcHeight();
}

// Used to throttle the amount of total money spent on stocks in any given tick
const getSpendingMoney = (ns: NS) => {
    let factor = 1;
    const processes = ns.ps("home").map(p => p.filename);
    if (processes.includes("purchase-servers.js")) {
        factor = 0.5;
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
                globalCashed += saleTotal - commission;
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
                globalCashed += saleTotal - commission;
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

