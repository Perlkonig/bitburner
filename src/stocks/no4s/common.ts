import { NS } from "@ns";

export const STOCK_PORT = 19;

// static data to be run once (per reset) and written to a file:
// - spread (* 1000)
// - max position
// - vol (*10000)
//     calibrating vol requires a tick to see a set of price changes

const STOCKS_FILE = "/tmp/stocks.txt";

export interface ICommonStockData {
    s: number;
    mp: number;
    vol: number;
}

export interface ICommonStockInfo {
    [k: string]: ICommonStockData
}

async function get_static_stock_data(ns: NS): Promise<ICommonStockInfo> {
	const ret: ICommonStockInfo = {};
    const p: {[k: string]: number} = {};
	for (const ticker of ns.stock.getSymbols()) {
        p[ticker] = ns.stock.getPrice(ticker);
		const p0 = p[ticker];
		ret[ticker] = {
			s : Math.round(1000 * (ns.stock.getAskPrice(ticker) / p0 - 1)),
			mp : ns.stock.getMaxShares(ticker),
            vol: 0
		}
	}
	wait_tick:
	while (true) {
		await ns.sleep(1000);
		for (const ticker in ret)
			if (ns.stock.getPrice(ticker) !== p[ticker])
				break wait_tick;
	}
	// convert p to (absolute) returns
	for (const ticker in p) {
		const p0 = p[ticker];
        const p1 = ns.stock.getPrice(ticker);
		p[ticker] = (p1 > p0) ? p1 / p0 - 1 : p0 / p1 - 1
	}
	// ECP vol is from 40..50 / 100
	next_draw:
	for (let i=40; i<=50; ++i) {
		const draw = p["ECP"]/(i / 10000);
		for (const ticker in p) {
            ret[ticker].vol = Math.round(p[ticker] * 10000 / draw);
			const vol = ret[ticker].vol;
			if (Math.abs(p[ticker] - draw * vol / 10000) > 1e-6)
			continue next_draw;
		}
		return ret;
	}
	throw "unable to calibrate vol";
}

export function load_static_stock_data(ns: NS): ICommonStockInfo {
	return JSON.parse(ns.read(STOCKS_FILE)) as ICommonStockInfo;
}

export async function write_static_stock_data(ns: NS): Promise<void> {
	ns.write(STOCKS_FILE, JSON.stringify(await get_static_stock_data(ns)), "w");
}

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	await write_static_stock_data(ns);
}
