
// small subscriber to no4s/fit.js,
// monitors forecasts (if we have 4s data prints side-by-side comparison)
// and trading performance of no4s/trade.js

import { NS } from "@ns";

import { STOCK_PORT, load_static_stock_data, ICommonStockInfo } from "stocks/no4s/common";
import { IPortData } from "stocks/no4s/fit";

// 300 ticks (30m) half-life
const WEIGHT = 1 - 1 / (1800/6);

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

	let data: IPortData|undefined = undefined;
    const stocks: ICommonStockInfo = load_static_stock_data(ns);
	let lv, wret = 0, wret2 = 0, w = 0;
	while (true) {
		const str = ns.peek(STOCK_PORT);
		if (str !== "NULL PORT DATA") {
			const data2 = JSON.parse(str as string) as IPortData;
			if ( (data === undefined) || (data2.tick != data.tick) ) {
				data = data2;

				let lv1 = ns.getServerMoneyAvailable("home");
				const sorted = Object.keys(data.S);
				let has_4s = false;
				try {
					ns.stock.getForecast("ECP");
					has_4s = true;
				} catch { ns.print("WARN Error getting forecast for ECP"); }

				if (has_4s) {
					for (const ticker of sorted) {
						data.S[ticker].f2 = ns.stock.getForecast(ticker);
                    }
					sorted.sort((a,b) => data!.S[b].f2 - data!.S[a].f2);
				} else
					sorted.sort((a,b) => data!.S[b].f - data!.S[a].f);
				for (const ticker of sorted) {
					const { f, se_f, p } = data.S[ticker];
                    const bp = p * (1 - stocks[ticker].s / 1000);
					const ap = p * (1 + stocks[ticker].s / 1000);
					const Q = ns.stock.getPosition(ticker);
					let lv = 0;
					if (Q[0]) lv += Q[0] * bp - 1e5;
					if (Q[2]) lv += Q[2] * (2 * Q[3] - ap) - 1e5;
					lv1 += lv;
					if (has_4s) {
						const f2 = data.S[ticker].f2,
							err = (f - f2) / se_f;
						ns.printf("%5s: %.1f%% (%.1f%%)\t%10s\t%.1f%%\t%.2f", ticker, 100*f, 100*se_f, ns.formatNumber(lv, 3), 100*f2, err);
					} else {
						ns.printf("%5s: %.1f%% (%.1f%%)\t%10s", ticker, 100*f, 100*se_f, ns.formatNumber(lv, 3));
					}
				}
				if (lv) {
					wret2 *= WEIGHT; wret *= WEIGHT; w *= WEIGHT;
					const ret = Math.log(lv1) - Math.log(lv);
					wret2 += ret*ret; wret += ret; w += 1;
				}
				lv = lv1;
				const ret = wret / w, ret2 = wret2 / w, sd_ret = Math.sqrt(ret2 - ret * ret), se_ret = sd_ret/Math.sqrt(w);
				ns.printf("tick=%d lv=%s ret=%.3f%% (%.3f%%) sd_ret=%.3f%% ttf=%d sync=%d dll0=%.1f dll1=%.1f", data.tick, ns.formatNumber(lv, 3), 100*ret, 100*se_ret, 100*sd_ret, data.ttf, data.sync, data.dll0, data.dll1);
			}
		}
		await ns.sleep(1000);
	}
}
