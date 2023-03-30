// sample trading engine for use with no4s/fit.js
import { NS } from "@ns";
import { BoxNode } from "/../MyTypes";
import { createSidebarItem, sidebar } from "/lib/box/box";

import { STOCK_PORT, load_static_stock_data, ICommonStockInfo } from "stocks/no4s/common";
import { IPortData } from "stocks/no4s/fit";

// take no action until we have accumulated this much confidence on dll1
const DLL1_THRESH = 6;
// liquidate if confidence below this
const LIQUIDATION_SHARPE_THRESH = 1;
// don't acquire unless confidence greater than this
const ACQUISITION_SHARPE_THRESH = 4;
// risk lambda for score calculation
const LAMBDA = 1;

const canShort = true;
const commission = 100000;
let totalSpent = 0;
let totalCashed = 0;
let currentValue = 0;
let firstAmt = 0;
let firstTime = 0;

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

const renderBox = (ns: NS, box: BoxNode) => {
    let body = ""
    body += `<p>Portfolio value: $${ns.formatNumber(currentValue, 2)}</p>`;
    body += `<p>Total cash invested: $${ns.formatNumber(totalSpent, 2)}</p>`;
    body += `<p>Total cash received: $${ns.formatNumber(totalCashed, 2)}</p>`;
    let ror = 0;
    if (totalSpent > 0) {
        ror = (totalCashed + currentValue - totalSpent) / totalSpent;
    }
    body += `<p>Overall RoR: ${ns.formatPercent(ror, 2)}</p>`;

    if (firstAmt !== 0) {
        const delta = ns.getServerMoneyAvailable("home") + currentValue - firstAmt;
        const pc = delta / firstAmt;
        const time = (Date.now() - firstTime) / 1000;
        const persec = delta / time;
        body += `<p>Session: $${ns.formatNumber(delta, 2)} (${ns.formatPercent(pc, 2)})</p>`;
        body += `<p>$${ns.formatNumber(persec, 2)}/sec</p>`;
    }

    box.body.innerHTML = body;
    box.recalcHeight();
}

function trading_capital(ns: NS): number {
	const balance = ns.getServerMoneyAvailable("home");
	// start trading at $10M
	if (balance > 1e7) {
        return balance;
    }
    return 0;
}

interface ITargets {
    [k: string]: {
        ret75: number;
        sd75: number;
        cost: number;
        score: number;
    }
}

function tick(ns: NS, stocks: ICommonStockInfo, S: IPortData): void {
	if (S.dll1 > DLL1_THRESH) {

        const longSymbols = new Set<string>();
        const shortSymbols = new Set<string>();

		/***************************
		  * LIQUIDATION, and calculation of acquisition scores
		 */
		const targets: ITargets = {};
		for (const ticker in stocks) {
			const [long, , short, ] = ns.stock.getPosition(ticker),
				f = S.S[ticker].f,
				sharpe = (f - .5) / S.S[ticker].se_f,
				mv = stocks[ticker].vol / 10000;
			if (long && !(sharpe > LIQUIDATION_SHARPE_THRESH)) {
				const price = ns.stock.sellStock(ticker, 1 / 0);
                totalCashed += (long * price) - commission;
				ns.print(`SLD ${long} ${ticker}`);
                shortSymbols.add(ticker);
			} else if (long) {
                longSymbols.add(ticker);
            }
			if (canShort && short && !(sharpe < -LIQUIDATION_SHARPE_THRESH)) {
				const price = ns.stock.sellShort(ticker, 1 / 0);
                totalCashed += (short * price) - commission;
				ns.print(`SLD SHORT ${short} ${ticker}`);
                longSymbols.add(ticker);
			} else if (short) {
                shortSymbols.add(ticker);
            }

			if (Math.abs(sharpe) > ACQUISITION_SHARPE_THRESH) {
				const E = Math.pow(f + f * mv / 2 + (1 - f) * (mv > 0 ? Math.log(1 + mv) / mv : 1), S.ttf),
					E2 = Math.pow(f / 3 * (3 + mv * (3 + mv)) + (1 - f) / (1 + mv), S.ttf),
					ret75 = E - 1,
					cost = 2 * stocks[ticker].s / 1000,
					sd75 = Math.sqrt(E2 - E * E),
					score = Math.abs(ret75) - cost - LAMBDA * sd75;
				if (score > 0)
					targets[ticker] = { ret75, sd75, cost, score };
			}
		}

		/*************************
		 * ACQUISITION
		 */
		for (const ticker of Object.keys(targets).sort((a, b) => targets[b].score - targets[a].score)) {
			ns.print(`${ticker}: score=${targets[ticker].score} ret75=${targets[ticker].ret75} cost=${targets[ticker].cost} sd75=${targets[ticker].sd75}`);
			const capital = trading_capital(ns);

			if (S.S[ticker].f > .5) {
				const ap = S.S[ticker].p * (1 + stocks[ticker].s / 1000),
					pos = ns.stock.getPosition(ticker)[0],
					Q = Math.floor(Math.min(stocks[ticker].mp - pos, (capital - 1e5) / ap));
				if (Q > 0) {
                    const price = ns.stock.buyStock(ticker, Q);
					if (price > 0) {
						ns.print(`BOT ${Q} ${ticker}`);
                        totalSpent += (price * Q) + commission;
                        longSymbols.add(ticker);
                    } else {
						ns.tprint(`ERROR: failed to buy ${Q} ${ticker} capital=${ns.formatNumber(capital, 2)} ap=${ns.formatNumber(ap, 2)}`);
                    }
				}
			} else {
				const bp = S.S[ticker].p * (1 - stocks[ticker].s / 1000),
					pos = ns.stock.getPosition(ticker)[2],
					Q = Math.floor(Math.min(stocks[ticker].mp - pos, (capital - 1e5) / bp));
				if (canShort && Q > 0) {
                    const price = ns.stock.buyShort(ticker, Q);
					if (price > 0) {
						ns.print(`BOT SHORT ${Q} ${ticker}`);
                        totalSpent += (price * Q) + commission;
                        shortSymbols.add(ticker);
                    } else {
						ns.tprint(`ERROR: failed to buyShort ${Q} ${ticker} capital=${ns.formatNumber(capital, 2)} bp=${ns.formatNumber(bp, 2)}`);
                    }
				}
			}
		}

        // send stock market manipulation orders to hack manager
        const growStockPort = ns.getPortHandle(1); // port 1 is grow
        const hackStockPort = ns.getPortHandle(2); // port 2 is hack
        if (growStockPort.empty() && hackStockPort.empty()) {
            // only write to ports if empty
            for (const sym of longSymbols) {
                //ns.print("INFO grow " + sym);
                growStockPort.write(symServer[sym]);
            }
            for (const sym of shortSymbols) {
                //ns.print("INFO hack " + sym);
                hackStockPort.write(symServer[sym]);
            }
        }
	} else {
		for (const ticker in stocks) {
            const [long, , short, ] = ns.stock.getPosition(ticker);
			const longprice = ns.stock.sellStock(ticker, 1 / 0);
            if (longprice) {
                totalCashed += (longprice * long) - commission;
            }
            if (canShort) {
                const shortprice = ns.stock.sellShort(ticker, 1 / 0);
                if (shortprice) {
                    totalCashed += (shortprice * short) - commission;
                }
            }
		}
	}
}

const evaluate = (ns: NS, stocks: ICommonStockInfo) => {
    currentValue = 0;
    for (const ticker in stocks) {
        const [longShares, longPrice, shortShares, shortPrice] = ns.stock.getPosition(ticker);
        const askPrice = ns.stock.getAskPrice(ticker);
        const bidPrice = ns.stock.getBidPrice(ticker);
        if (longShares > 0) {
            const profit = longShares * (bidPrice - longPrice) - 2 * commission;
            const cost = longShares * longPrice;
            currentValue += profit + cost;
        }
        if (shortShares > 0) {
            const profit = shortShares * (shortPrice - askPrice) - 2 * commission;
            const cost = shortShares * shortPrice;
            currentValue += profit + cost;
        }
    }
}

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");
    totalSpent = 0;
    totalCashed = 0;
    currentValue = 0;
    firstAmt = ns.getServerMoneyAvailable("home");
    firstTime = Date.now();
    const box = createSidebarItem("Stocks", "<p>Loading...</p>", "\ueb03") as BoxNode;

	const stocks = load_static_stock_data(ns);
    let S: IPortData|undefined = undefined;

	while (true) {
        if ( (sidebar !== null) && (! sidebar.contains(box)) ) {
            ns.exit();
        }
		const str = ns.peek(STOCK_PORT);
		if (str !== "NULL PORT DATA") {
			const S2 = JSON.parse(str as string) as IPortData;
			if ( (S === undefined) || (S2.tick !== S.tick) ) {
				S = S2;
				tick(ns, stocks, S);
			}
		}
        evaluate(ns, stocks);
        renderBox(ns, box);
		await ns.sleep(1000);
	}
}
