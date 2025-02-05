import { NS } from "@ns";
// import { IPriceHistory } from "../stocks/daemon";

export interface IHolding {
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

export const commission = 100000;

export const getAllStocks = async (ns: NS): Promise<IHolding[]> => {
    // make a lookup table of all stocks and all their properties
    const stockSymbols = Object.keys(symServer);
    const stocks: IHolding[] = [];
    for (const sym of stockSymbols) {

        let forecast = 0;
        let volatility = 0;
        if (ns.stock.has4SData() && ns.stock.has4SDataTIXAPI()) {
            forecast = ns.stock.getForecast(sym);
            volatility = ns.stock.getVolatility(sym);
        // } else {
        //     forecast = getForecast(history[sym]);
        //     volatility = getVolatility(history[sym]);
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

export const getVolatility = (lst: number[], p = 14): number => {
    // Must have a minimum number of entries to calculate
    if (lst.length < p) {
        return 0;
    }

    const sub = [...lst].reverse().slice(0, p).reverse();
    const mean = sub.reduce((acc: number, curr: number) => { return acc + curr; }, 0) / sub.length;
    const diff: number[] = [];
    for (const n of sub) {
        diff.push((n - mean)**2);
    }
    const variance = diff.reduce((acc: number, curr: number) => { return acc + curr; }, 0) / diff.length;
    return Math.sqrt(variance);
}

/**
 * If there's not enough data to make a decision, then return 0 to avoid an initial buy.
 * But the default forecast, given enough data but no signal, is 50.
 */
export const getForecast = (lst: number[]): number => {
    // Must have a minimum number of entries to calculate
    if (lst.length < 30) {
        return 0;
    }

    const gains = numGains(lst)
    const rsi = calcRSI(lst);
    return (gains + rsi) / 2;
    // return numGains(lst);
    // const macd = calcMACD(lst);
    // const rsi = calcRSI(lst);
    // return (macd + rsi) / 2;
}

const numGains = (lst: number[], p = 14): number => {
    if (lst.length < p + 1) {
        return .5;
    }
    const sub = [...lst].reverse().slice(0, p + 1).reverse();
    let numGains = 0;
    for (let i = 1; i < sub.length; i++) {
        if (sub[i] > sub [i-1]) {
            numGains++;
        }
    }
    return numGains / p;
}

const calcRSI = (lst: number[], p = 14): number => {
    const sub = [...lst].reverse().slice(0, p+1).reverse();
    const pcc = calcPercentChange(sub);
    if (pcc === undefined) { return 0; }
    const gains = tabulateAvgGains(pcc);
    if (gains === undefined) { return 0; }
    const losses = tabulateAvgLosses(pcc);
    if (losses === undefined) { return 0; }
    const rs = gains[gains.length - 1] / losses[losses.length - 1];
    const rsi = 100 - (100 / (1 + rs));
    return rsi / 100;
}

const tabulateAvgGains = (lst: number[], p = 14): number[]|undefined => {
    if (lst.length < p) {
        return undefined;
    }
    const running: number[] = [];
    for (let start = 0; start < lst.length - p; start++) {
        const sub = lst.slice(start, start + p);
        let gains = 0;
        for (const n of sub) {
            if (n > 0) {
                gains += n;
            }
        }
        running.push(gains / p);
    }

    return running;
}

const tabulateAvgLosses = (lst: number[], p = 14): number[]|undefined => {
    if (lst.length < p) {
        return undefined;
    }
    const running: number[] = [];
    for (let start = 0; start < lst.length - p; start++) {
        const sub = lst.slice(start, start + p);
        let losses = 0;
        for (const n of sub) {
            if (n < 0) {
                losses += Math.abs(n);
            }
        }
        running.push(losses / p);
    }

    return running;
}


/**
 * Calculates the percent change for a given period (p) from the beginning to the end of a data set.
 * The resulting list will be one shorter than the length of the original list.
 */
const calcPercentChange = (lst: number[]): number[]|undefined => {
    if (lst.length < 2) {
        return undefined;
    }

    const running: number[] = [];
    for (let i = 1; i < lst.length; i++) {
        const curr = lst[i];
        const prev = lst[i-1];
        running.push((curr - prev) / prev * 100);
    }
    return running;
}

// const calcMACD = (lst: number[]): number => {
//     // Calculate the MACD line
//     const day26 = calcEMA(lst, 26);
//     if (day26 === undefined) { return 0; }
//     const day12 = calcEMA(lst, 12);
//     if (day12 === undefined) { return 0; }
//     // reverse the arrays so we can compare them from the ends
//     day26.reverse();
//     day12.reverse();
//     const macd: number[] = [];
//     for (let i = 0; i < day26.length; i++) {
//         macd.push(day12[i] - day26[i]);
//     }
//     //macd can stay reversed because it's easier to do the rest of the calculations

//     // Calculate the signal line
//     const signal = calcEMA(macd, 9);
//     if (signal === undefined) { return 0; }

//     // Calculate histogram (mcad - signal)
//     // reverse signal so we can compare from ends
//     signal.reverse();
//     const histogram: number[] = [];
//     for (let i = 0; i < signal.length; i++) {
//         histogram.push(macd[i] - signal[i]);
//     }
//     // everything can stay reversed for simplicity
//     // most recent data point is now index 0

//     // Now determine a forecast (percent chance of going up vs. down)
//     // Look to see if the histogram just crossed over
//     const crossedUp = (histogram[0] > 0) && (histogram[1] <= 0);
//     const crossedDown = (histogram[0] < 0) && (histogram[1] >= 0);
//     const relative = calcRelativePercent(histogram);

//     // If it crossed upwards, signal a buy.
//     // If it crossed downards, signal a sell.
//     // Otherwise return a percent based on the relative magnitude of the histogram
//     if (crossedUp) {
//         return 1;
//     } else if (crossedDown) {
//         return 0;
//     } else {
//         return 0.5;
//     }
// }

// const calcRelativePercent = (lst: number[]): number => {
//     if (lst[0] === 0) {
//         return 0;
//     }
//     const val = Math.abs(lst[0]);
//     let max = Math.max(...lst);
//     if (lst[0] < 0) {
//         max = Math.min(...lst);
//     }
//     return 1 - (val / max);
// }

/**
 * Calculates the EMAs for a given period (p) from the beginning to the end of a data set.
 * The resulting list will be the length of the original list minus the period.
 */
// const calcEMA = (lst: number[], p = 14): number[]|undefined => {
//     if (lst.length < p + 1) {
//         return undefined;
//     }
//     const initial = lst.slice(0, p);
//     const rest = lst.slice(p);
//     const factor = 2 / (p + 1);
//     const sma = initial.reduce((a: number, b: number) => {return a+b}, 0) / initial.length;
//     const running = [sma];
//     for (const n of rest) {
//         running.push((n * factor) + (running[running.length - 1] * (1 - factor)));
//     }
//     // remove the first simple moving average seed
//     running.splice(0,1);
//     return running;
// }
