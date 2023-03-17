import { NS } from "@ns";

/** Each stock symbol and its list of consecutive prices */
export interface IPriceHistory {
    [k: string]: number[];
}
/** The maximum number of prices to remember */
const maxPrices = 100;

/** Hard code symbols to save 2GB */
const symbols = ["ECP","MGCP","BLD","CLRK","OMTK","FSIG","KGI","FLCM","STM","DCOMM","HLS","VITA","ICRS","UNV","AERO","OMN","SLRS","GPH","NVMD","WDS","LXO","RHOC","APHE","SYSC","CTK","NTLK","OMGA","FNS","JGN","SGC","CTYS","MDYN","TITN"];

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    // Disable default Logging
    ns.disableLog("ALL");

    const history: IPriceHistory = {};
    const handle = ns.getPortHandle(4);
    while (true) {
        for (const sym of symbols) {
            let prices: number[] = [];
            if (sym in history) {
                prices = history[sym];
            }
            prices.push(ns.stock.getPrice(sym));
            if (prices.length > maxPrices) {
                prices.splice(0, 1);
            }
            history[sym] = prices;
        }
        handle.clear();
        handle.write(JSON.stringify(history));
        await waitForTick(ns);
    }
}

async function waitForTick(ns: NS) {
    const s = ns.stock;
    const stocks = s.getSymbols()
    const getPrice = () => stocks.reduce((a: number, b: string) => { return a + s.getPrice(b) }, 0)
    const price = getPrice()
    while (price === getPrice()) {
        await ns.sleep(2000)
    }
}
