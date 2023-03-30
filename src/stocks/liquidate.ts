import { NS } from "@ns";
import { getAllStocks, commission } from "lib/stocks";

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    ns.print("Received LIQUIDATION command");
    const stocks = await getAllStocks(ns);
    for (const stock of stocks) {
        if (stock.longShares > 0) {
            const salePrice = ns.stock.sellStock(stock.sym, stock.longShares);
            const saleTotal = salePrice * stock.longShares;
            const saleCost = stock.longPrice * stock.longShares;
            const saleProfit = saleTotal - saleCost - 2 * commission;
            stock.longShares = 0;
            ns.tprint(`WARN ${stock.summary} SOLD for $${ns.formatNumber(saleProfit, 1)} profit`);
        }
        if (stock.shortShares > 0) {
            const salePrice = ns.stock.sellShort(stock.sym, stock.shortShares);
            const saleTotal = salePrice * stock.shortShares;
            const saleCost = stock.shortPrice * stock.shortShares;
            const saleProfit = saleTotal - saleCost - 2 * commission;
            stock.shortShares = 0;
            ns.tprint(`WARN ${stock.summary} SHORT SOLD for $${ns.formatNumber(saleProfit, 1)} profit`);
        }
    }
}
