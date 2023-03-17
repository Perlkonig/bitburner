import { NS } from "@ns";
import { listServers } from "lib/network"

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
    if (ns.fileExists("/pragma/NoContracts.txt", "home")) {
        ns.print(`WARN Contract solver suspended by pragma.`);
        ns.exit();
    }
    const servers = listServers(ns);

    for (const server of servers) {
        const onServer = ns.ls(server, ".cct");
        for (const contract of onServer) {
            const type = ns.codingcontract.getContractType(contract, server);
            if (solvableContractTypes.includes(type)) {
                const data = ns.codingcontract.getData(contract, server);
                ns.tprint(`Found '${type}' on '${server}'.`);
                const solution = solve(ns, type, data);
                let result = "";
                if (solution !== undefined) {
                    result = ns.codingcontract.attempt(solution, contract, server);
                }
                if (result.length === 0) {
                    ns.tprint(`\tFAILED\nData: ${JSON.stringify(data)}\nAnswer: ${solution}`);
                    ns.toast("Contract FAILED!", "error", null);
                    ns.write("/pragmas/NoContracts.txt", `\tFAILED\nType: ${type}\nServer: ${server}\nData: ${JSON.stringify(data)}\nAnswer: ${solution}`, "w");

                } else {
                    ns.tprint(`SOLVED!\n\t${result}`);
                    ns.toast(`Contract SOLVED!\n${result}`, "success", null);
                }
            } else {
                // ns.tprint(`Unknown contract type '${type}' on server '${server}'.`);
            }
        }
    }
}

// The following types are knowingly omitted:
//   - Total Ways to Sum II
//   - Compression II: LZ Decompression
//   - Compression III: LZ Compression

const solvableContractTypes = [
    "Algorithmic Stock Trader I",
    "Algorithmic Stock Trader II",
    "Algorithmic Stock Trader III",
    "Algorithmic Stock Trader IV",
    "Array Jumping Game",
    "Array Jumping Game II",
    "Compression I: RLE Compression",
	"Encryption I: Caesar Cipher",
    "Encryption II: Vigenère Cipher",
    "Find All Valid Math Expressions",
	"Find Largest Prime Factor",
    "Generate IP Addresses",
    "HammingCodes: Encoded Binary to Integer",
	"HammingCodes: Integer to Encoded Binary",
    "Merge Overlapping Intervals",
    "Minimum Path Sum in a Triangle",
    "Proper 2-Coloring of a Graph",
    "Sanitize Parentheses in Expression",
    "Shortest Path in a Grid",
    "Spiralize Matrix",
    "Subarray with Maximum Sum",
    "Total Ways to Sum",
    // "Total Ways to Sum II",
    "Unique Paths in a Grid I",
    "Unique Paths in a Grid II",
];

const solve = (ns: NS, type: string, data: unknown) => {
	let solution = undefined;
	switch (type) {
        case "Algorithmic Stock Trader I":
            solution = maxProfit([1, data as number[]]);
            break;
        case "Algorithmic Stock Trader II":
            solution = maxProfit([Math.ceil((data as number[]).length / 2), data as number[]]);
            break;
        case "Algorithmic Stock Trader III":
            solution = maxProfit([2, data as number[]]);
            break;
        case "Algorithmic Stock Trader IV":
            solution = maxProfit(data as [number, number[]]);
            break;
        case "Array Jumping Game":
            solution = arrayJump1(data as number[]);
            break;
        case "Array Jumping Game II":
            solution = arrayJump2(data as number[]);
            break;
        case "Compression I: RLE Compression":
            solution = compressRLE(data as string);
            break;
		case "Encryption I: Caesar Cipher":
			solution = caesar(...data as [string,number]);
			break;
        case "Encryption II: Vigenère Cipher":
            solution = vigenere(...data as [string,string]);
            break;
        case "Find All Valid Math Expressions":
            solution = waysToExpress(...data as [string,number]);
            break;
		case "Find Largest Prime Factor":
			solution = largestPrimeFactor(data as number);
			break;
        case "Generate IP Addresses":
            solution = generateIP(data as string);
            break;
        case "HammingCodes: Encoded Binary to Integer":
            solution = hammingB2I(data as string);
            break;
		case "HammingCodes: Integer to Encoded Binary":
			solution = hammingI2B(data as number);
			break;
        case "Merge Overlapping Intervals":
            solution = mergeIntervals(data as number[][]);
            break;
        case "Minimum Path Sum in a Triangle":
            solution = minTriangle(data as number[][]);
            break;
        case "Proper 2-Coloring of a Graph":
            solution = colour(...data as [number, number[][]]);
            break;
        case "Sanitize Parentheses in Expression":
            solution = sanitize(data as string);
            break;
        case "Shortest Path in a Grid":
            solution = shortestPath(data as number[][]);
            break;
        case "Spiralize Matrix":
            solution = spiralize(data as number[][]);
            break;
        case "Subarray with Maximum Sum":
            solution = maxSubSum(data as number[]);
            break;
        case "Total Ways to Sum":
            solution = solverWaysToSum(data as number);
            break;
        // case "Total Ways to Sum II":
        //     solution = waysToSum(...data);
        //     break;
        case "Unique Paths in a Grid I":
            solution = uniquePaths1(...data as [number, number]);
            break;
        case "Unique Paths in a Grid II":
            solution = uniquePaths2(data as number[][]);
            break;
		default:
			ns.tprint(`ERROR: Could not find a solution function for whitelisted type '${type}'! Exiting.`);
			ns.exit();
	}
	return solution;
};

const hammingI2B = (n: number) => {
	const bin: (number|null)[] = n.toString(2).split("").map(x => parseInt(x, 2));
    while (bin[0] === 0) {
        bin.splice(0, 1);
    }
    let numP = 1;
    while (2 ** numP < bin.length + numP + 1) {
        numP++;
    }
    bin.splice(0, 0, null);
    for (let i = 0; i < numP; i++) {
        const pos = 2 ** i;
        bin.splice(pos, 0, null);
    }
    const ones = [];
    for (let i = 0; i < bin.length; i++) {
        if (bin[i] === 1) {
            ones.push(i);
        }
    }
    const code = ones.reduce((prev, curr) => { return prev ^ curr; }, 0).toString(2).split("").map(x => parseInt(x, 2)).reverse();
    while (code.length < numP) { code.push(0); }
    for (let i = 0; i < numP; i++) {
        const pos = 2 ** i;
        bin[pos] = code[i];
    }
    const count = bin.filter(x => x === 1).length;
    bin[0] = count % 2;
    return bin.join("");
};

const hammingB2I = (instr: string) => {
    const bin = instr.split("").map(x => parseInt(x, 2));
    const ones = [];
    for (let i = 0; i < bin.length; i++) {
        if (bin[i] === 1) {
            ones.push(i);
        }
    }
    const errorPos = ones.reduce((prev, curr) => { return prev ^ curr; }, 0);
    // Only ever receive 1-bit errors, so if there's an error, just fix it
    if (errorPos > 0) {
        bin[errorPos] = (bin[errorPos] + 1) % 2;
    }
    const numP = Math.floor(Math.log2(bin.length));
    for (let i = numP; i >=0; i--) {
        bin.splice(2 ** i, 1);
    }
    bin.splice(0, 1);
    const decoded = parseInt(bin.join(""), 2);
    return decoded.toString(10);
}

const caesar = (str: string, dist: number) => {
    let final = "";
    for (const char of str) {
        if (char === " ") {
            final += " ";
        } else {
            let num = parseInt(char, 36) - 10;
            num -= dist;
            while (num < 0) { num += 26; }
            if (num > 26) {
                num = num % 26;
            }
            final += (num + 10).toString(36).toUpperCase();
        }
    }
    return final;
};

const largestPrimeFactor = (num: number) => {

    const getFactors = (num: number) => {
        const factors = new Set([1, num]);
        for (let i = 2; i < Math.ceil(num / 2) - 1; i++) {
            if (num % i === 0) {
                factors.add(i);
                factors.add(num / i)
            }
        }
        return [...factors].sort((a, b) => a - b);
    };

    const isPrime = (num: number) => {
        if (num < 2) { return false; }
        if (num === 2) { return  true; }
        if (num % 2 === 0) { return false; }
        return getFactors(num).length === 2;
    };

    return Math.max(...getFactors(num).filter(x => isPrime(x)));
};

const maxSubSum = (nums: number[]) => {
    if (nums.length === 1) {
        return nums[0];
    } else if (nums.length === 2) {
        return nums[0] + nums[1];
    } else {
        let maxSum = 0;
        for (let start = 0; start < nums.length; start++) {
            const restLen = nums.length - start - 1;
            for (let end = 0; end < restLen; end++) {
                let sub;
                if (end === 0) {
                    sub = nums.slice(start);
                } else {
                    sub = nums.slice(start, end * -1);
                }
                const sum = sub.reduce((prev, curr) => {return prev + curr;}, 0);
                maxSum = Math.max(sum, maxSum);
            }
        }
        return maxSum;
    }
}

interface IGridNode {
    id: string;
    x: number;
    y: number;
    value: string|number|boolean;
    parent?: IGridNode;
    neighbours: IGridNode[];
    visited: boolean;
}

interface IGrid {
    [k: string]: IGridNode;
}

const uniquePaths1 = (w: number, h: number): number => {
    // w = parseInt(w, 10);
    // h = parseInt(h, 10);
    const cells = [];
    for (let y = 0; y < h; y++) {
        const row = [];
        for (let x = 0; x < w; x++) {
            row.push(0);
        }
        cells.push(row);
    }
    const grid: IGrid = initGrid(cells);
    neighboursDR(grid);
    const start = grid[`0,0`];
    const end = grid[`${w - 1},${h - 1}`];
    const allPaths: string[][] = [];
    findPaths(start, end, allPaths);
    return allPaths.length;
};

const uniquePaths2 = (cells: number[][]): number => {
    // cells = cells.map(x => parseInt(x, 10));
    const grid = initGrid(cells);
    neighboursDR(grid);
    const start = grid[`0,0`];
    const end = grid[`${cells[0].length - 1},${cells.length - 1}`];
    const allPaths: string[][] = [];
    findPaths(start, end, allPaths);
    return allPaths.length;
};

const shortestPath = (cells: number[][]): string => {
    // cells = cells.map(a => a.map(b => parseInt(b, 10)));
    const grid = initGrid(cells);
    neighboursOrth(grid);
    const start = grid[`0,0`];
    const end = grid[`${cells[0].length - 1},${cells.length - 1}`];
    const path = findShortest(start, end);
    if (path.length < 2) {
        return "";
    }
    const dirs = path2dir(path);
    return dirs.join("");
};

const path2dir = (path: IGridNode[]): string[] => {
    const newpath = [];
    for (let i = 1; i < path.length; i++) {
        if (path[i].x > path[i-1].x) {
            newpath.push("R");
        } else if (path[i].x < path[i-1].x) {
            newpath.push("L");
        } else if (path[i].y > path[i-1].y) {
            newpath.push("D");
        } else {
            newpath.push("U");
        }
    }
    return newpath;
};

const findPaths = (start: IGridNode, end: IGridNode, allPaths: string[][], sofar = [start.id]) => {
    for (const node of start.neighbours) {
        if (node.id === end.id) {
            allPaths.push([...sofar, end.id]);
        } else if (! sofar.includes(node.id)) {
            sofar.push(node.id);
            findPaths(node, end, allPaths, [...sofar]);
            sofar.pop();
        }
    }
};

const findShortest = (start: IGridNode, end: IGridNode) => {
    start.visited = true;
    const queue = [start];
    while (queue.length > 0) {
        const node = queue[0];
        queue.splice(0,1);
        if (node.id === end.id) {
            break;
        }
        if (node.neighbours !== undefined) {
            for (const neighbour of node.neighbours.filter(x => !x.visited)) {
                neighbour.parent = node;
                neighbour.visited = true;
                queue.push(neighbour);
            }
        }
    }

    if (end.parent === undefined) {
        return [];
    } else {
        const path = [];
        let check = end;
        while (check.parent !== undefined) {
            path.push(check);
            check = check.parent;
        }
        path.push(start);
        return path.reverse();
    }
};

const initGrid = (vals: (string|number|boolean)[][]): IGrid => {
    const grid: IGrid = {};
    for (let y = 0; y < vals.length; y++) {
        for (let x = 0; x < vals[y].length; x++) {
            const node: IGridNode = {
                id: `${x},${y}`,
                x,
                y,
                value: vals[y][x],
                parent: undefined,
                visited: false,
                neighbours: []
            };
            grid[node.id] = node;
        }
    }
    return grid;
};

// const resetGrid = (grid: IGrid): void => {
//     Object.values(grid).forEach((node) => {
//         node.parent = undefined;
//         node.visited = false;
//     });
// };

const neighboursDR = (grid: IGrid): void => {
    for (const node of Object.values(grid)) {
        const results: IGridNode[] = [];
        const toTest = [`${node.x + 1},${node.y}`, `${node.x},${node.y + 1}`];
        for (const test of toTest) {
            // eslint-disable-next-line no-prototype-builtins
            if (grid.hasOwnProperty(test)) {
                if (grid[test].value === 0) {
                    results.push(grid[test])
                }
            }
        }
        node.neighbours = results;
    }
};

const neighboursOrth = (grid: IGrid) => {
    for (const node of Object.values(grid)) {
        const results = [];
        const toTest = [`${node.x + 1},${node.y}`, `${node.x},${node.y + 1}`, `${node.x - 1},${node.y}`, `${node.x},${node.y - 1}`];
        for (const test of toTest) {
            // eslint-disable-next-line no-prototype-builtins
            if (grid.hasOwnProperty(test)) {
                if (grid[test].value === 0) {
                    results.push(grid[test])
                }
            }
        }
        node.neighbours = results;
    }
};

// Outright stolen
const maxProfit = (arrayData: [number, number[]]): number => {
    let i, j, k;

    const maxTrades = arrayData[0];
    const stockPrices = arrayData[1];

    // WHY?
    let tempStr = "[0";
    for (i = 0; i < stockPrices.length; i++) {
        tempStr += ",0";
    }
    tempStr += "]";
    let tempArr = "[" + tempStr;
    for (i = 0; i < maxTrades - 1; i++) {
        tempArr += "," + tempStr;
    }
    tempArr += "]";

    const highestProfit = JSON.parse(tempArr);

    for (i = 0; i < maxTrades; i++) {
        for (j = 0; j < stockPrices.length; j++) { // Buy / Start
            for (k = j; k < stockPrices.length; k++) { // Sell / End
                if (i > 0 && j > 0 && k > 0) {
                    highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i][k - 1], highestProfit[i - 1][j - 1] + stockPrices[k] - stockPrices[j]);
                } else if (i > 0 && j > 0) {
                    highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i - 1][j - 1] + stockPrices[k] - stockPrices[j]);
                } else if (i > 0 && k > 0) {
                    highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i][k - 1], stockPrices[k] - stockPrices[j]);
                } else if (j > 0 && k > 0) {
                    highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i][k - 1], stockPrices[k] - stockPrices[j]);
                } else {
                    highestProfit[i][k] = Math.max(highestProfit[i][k], stockPrices[k] - stockPrices[j]);
                }
            }
        }
    }
    return highestProfit[maxTrades - 1][stockPrices.length - 1];
}

type Dir = "N"|"E"|"S"|"W";

const spiralize = (lst: number[][]): number[] => {

    const spiralMove = (x: number, y: number, dir: Dir) => {
        switch (dir) {
            case "N":
                return [x, y - 1];
            case "E":
                return [x + 1, y];
            case "S":
                return [x, y + 1];
            case "W":
                return [x - 1, y];
        }
    };

    const turnCW = (lastdir: Dir) => {
        switch (lastdir) {
            case "N":
                return "E";
            case "E":
                return "S";
            case "S":
                return "W";
            case "W":
                return "N";
        }
    };

    let lastdir: Dir = "E";
    let x = 0;
    let y = 0;
    const totalLen = lst.map(x => x.length).reduce((prev, curr) => { return prev + curr; }, 0);
    const spiralized = [lst[0][0]];
    const visited = [`${x},${y}`];
    while (spiralized.length < totalLen) {
        let [nx, ny] = spiralMove(x, y, lastdir);
        if ( (ny < 0) || (ny >= lst.length) || (nx < 0) || (nx >= lst[ny].length) || (visited.includes(`${nx},${ny}`)) ) {
            lastdir = turnCW(lastdir);
            [nx, ny] = spiralMove(x, y, lastdir)
        }
        x = nx; y = ny;
        spiralized.push(lst[y][x]);
        visited.push(`${x},${y}`);
    }
    return spiralized;
};

const minTriangle = (tri: number[][]): number => {
    const minTriangleRecursive = (tri: number[][], sums: number[], row = 0, col = 0, sum = 0) => {
        // If we've reached the last row
        if (row === tri.length - 1) {
            // add to the sum
            sums.push(sum += tri[row][col]);
        // Otherwise, recurse down each of the two possible paths
        } else {
            for (const delta of [0, 1]) {
                minTriangleRecursive(tri, sums, row + 1, col + delta, sum + tri[row][col]);
            }
        }
    }

    const sums: number[] = [];
    minTriangleRecursive(tri, sums);
    return Math.min(...sums);
}

const compressRLE = (instr: string): string => {
    const groupString = (instr: string) => {
        const groups = [];
        const re = /^(.)\1*/;
        while (instr.length > 0) {
            const m = re.exec(instr);
            if (m !== null) {
                groups.push(m[0]);
                instr = instr.slice(m[0].length);
            }
        }
        return groups;
    }

    if ( (instr === undefined) || (instr === null) || (instr.length < 1) ) {
        return "";
    }
    const groups = groupString(instr);
    let compressed = "";
    for (let grp of groups) {
        const numGroups = Math.ceil(grp.length / 9);
        for (let i = 0; i < numGroups; i++) {
            const realLen = Math.min(9, grp.length);
            compressed += `${realLen}${grp[0]}`;
            grp = grp.substring(realLen);
        }
    }
    return compressed;
}

const generateIP = (instr: string): string[] => {

    const combinationsOrdered = (n: number, k: number) => {

        const recurse = (n: number, len: number, start: number, results: number[][], sofar: number[] = []) => {
            if (len === 0) {
                results.push(sofar);
            } else {
                for (let i = start; i <= n - len; i++) {
                    recurse(n, len - 1, i + 1, results, [...sofar, i]);
                }
            }
        }

        const results: number[][] = [];
        recurse(n, k, 0, results);
        return results;
    }

    const results: string[] = [];
    if ( (instr.length < 4) || (instr.length > 12) ) {
        return results;
    }

    for (const combo of combinationsOrdered(instr.length, 3)) {
        const inlst = [...instr];
        for (const idx of [...combo].reverse()) {
            inlst.splice(idx + 1, 0, ".");
        }
        const octets = inlst.join("").split(".");
        let valid = true;
        if (octets.length === 4) {
            for (const octet of octets) {
                if (octet.length === 0) {
                    valid = false;
                    break;
                }
                const int = parseInt(octet, 10);
                if (
                    (octet.length > 3) ||
                    ( (octet.startsWith("0")) && (octet.length > 1) ) ||
                    (int > 255)
                ) {
                    valid = false;
                    break;
                }
            }
        } else {
            valid = false;
        }
        if (valid) {
            results.push(octets.join("."));
        }
    }
    return results;
}

const mergeIntervals = (inlst: number[][]): number[][] => {
    const intervals = [...inlst];
    intervals.sort((a, b) => { return a[0] - b[0]; });
    for (let i = 0; i < intervals.length - 1; i++) {
        if (intervals[i+1][0] <= intervals[i][1]) {
            if (intervals[i+1][1] > intervals[i][1]) {
                intervals[i][1] = intervals[i+1][1];
            }
            intervals.splice(i + 1, 1);
            i = i - 1;
        }
    }
    return intervals;
}

const vigenere = (plaintext: string, keyword: string): string => {

    const genSquare = (primer = "ABCDEFGHIJKLMNOPQRSTUVWXYZ") => {

        const rotArray = (arr: string, k: number) => arr.slice(k).concat(arr.slice(0, k));

        const square = new Map();
        for (let k = 0; k < primer.length; k++) {
            square.set(primer[k], rotArray(primer, k));
        }
        return square;
    }

    const primer = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const square = genSquare(primer);
    let ciphertext = "";
    for (let i = 0; i < plaintext.length; i++) {
        const row = square.get(plaintext[i]);
        const key = keyword[i % keyword.length];
        const idx = primer.indexOf(key);
        ciphertext += row[idx];
    }
    return ciphertext;
}

const arrayJump1 = (lst: number[]): number => {

    const recurse = (lst: number[], idx = 0) => {
        if (idx === lst.length - 1) {
            return true;
        }

        for (let n = 1; n <= lst[idx]; n++) {
            const result = recurse(lst, idx + n);
            if (result) {
                return true;
            }
        }
        return false;
    }

    const result = recurse(lst);
    if (result) { return 1;}
    else { return 0; }
}

const arrayJump2 = (lst: number[]): number => {

    const recurse = (lst: number[], jumps: number[], idx = 0, sofar = 0) => {
        if (idx === lst.length - 1) {
            jumps.push(sofar);
        }

        for (let n = 1; n <= lst[idx]; n++) {
            recurse(lst, jumps, idx + n, sofar + 1);
        }
    }

    const jumps: number[] = [];
    recurse(lst, jumps);
    if (jumps.length === 0) {
        return 0;
    } else {
        return Math.min(...jumps);
    }
}

const sanitize = (instr: string): string[] => {

    const isValid = (instr: string) => {
        let count = 0;
        for (const char of instr) {
            if (char === "(") { count++; }
            else if (char === ")") { count--; }
            if (count < 0) { return false; }
        }
        if (count !== 0) { return false; }
        return true;
    }

    function *combos(inlst: number[], length: number, with_repetition = false, position = 0, elements: number[] = []): Generator<number[]> {
		const size = inlst.length;

		for (let i = position; i < size; i++) {
			elements.push(inlst[i]);

			if (elements.length === length) yield elements;
			else yield* combos(inlst, length, with_repetition, (with_repetition === true ? i : i + 1), elements);

			elements.pop();
		}
	}

    const maxDels = instr.split("").filter(c => c === "(" || c === ")").length;

    const idxs: number[] = [];
    for (let i = 0; i < instr.length; i++) {
        if ( (instr[i] === "(") || (instr[i] === ")") ) {
            idxs.push(i);
        }
    }

    const valid = new Set<string>();
    if (isValid(instr)) {
        valid.add(instr);
    } else {
        for (let dels = 1; dels <= maxDels; dels++) {
            for (const combo of combos(idxs, dels)) {
                const descending = [...combo].sort((a, b) => { return b - a; });
                let newstr = instr;
                for (const idx of descending) {
                    const newlst = newstr.split("");
                    newlst.splice(idx, 1);
                    newstr = newlst.join("");
                }
                if (isValid(newstr)) {
                    valid.add(newstr);
                }
            }

            if (valid.size > 0) { break; }
        }
    }
    if (valid.size === 0) {
        return [""];
    } else {
        return [...valid];
    }
}

// Outright stolen
function solverWaysToSum(arrayData: number): number {
    const ways: number[] = [];
    ways[0] = 1;

    for (let a = 1; a <= arrayData; a++) {
        ways[a] = 0;
    }

    for (let i = 1; i <= arrayData - 1; i++) {
        for (let j = i; j <= arrayData; j++) {
            ways[j] += ways[j - i];
        }
    }

    return ways[arrayData];
}

// Outright stolen
function waysToExpress(instr: string, target: number): string {
    //ns.tprint("solverWaysToExpress()");
    //await ns.sleep(1000);
    let i: number; let j: number;

    const operatorList = ["", "+", "-", "*"];
    const validExpressions = [];

    const tempPermutations = Math.pow(4, (instr.length - 1));

    for (i = 0; i < tempPermutations; i++) {

        //if (!Boolean(i % 100000)) {
        //    ns.tprint(i + "/" + tempPermutations + ", " + validExpressions.length + " found.");
        //    await ns.sleep(100);
        //}

        const arraySummands = [];
        let candidateExpression = instr.substr(0, 1);
        arraySummands[0] = parseInt(instr.substr(0, 1));

        for (j = 1; j < instr.length; j++) {
            candidateExpression += operatorList[(i >> ((j - 1) * 2)) % 4] + instr.substr(j, 1);

            const rollingOperator = operatorList[(i >> ((j - 1) * 2)) % 4];
            let rollingOperand = parseInt(instr.substr(j, 1));

            switch (rollingOperator) {
                case "":
                    rollingOperand = rollingOperand * (arraySummands[arraySummands.length - 1] / Math.abs(arraySummands[arraySummands.length - 1]));
                    arraySummands[arraySummands.length - 1] = arraySummands[arraySummands.length - 1] * 10 + rollingOperand;
                    break;
                case "+":
                    arraySummands[arraySummands.length] = rollingOperand;
                    break;
                case "-":
                    arraySummands[arraySummands.length] = 0 - rollingOperand;
                    break;
                case "*":
                    while (j < instr.length - 1 && ((i >> (j * 2)) % 4) === 0) {
                        j += 1;
                        candidateExpression += instr.substr(j, 1);
                        rollingOperand = rollingOperand * 10 + parseInt(instr.substr(j, 1));
                    }
                    arraySummands[arraySummands.length - 1] = arraySummands[arraySummands.length - 1] * rollingOperand;
                    break;
            }
        }

        const rollingTotal = arraySummands.reduce(function(a, b) { return a + b; });

        //if(target == eval(candidateExpression)){
        if (target === rollingTotal) {
            validExpressions[validExpressions.length] = candidateExpression;
        }
    }

    return JSON.stringify(validExpressions);
}

interface IColouredVertex {
    id: number;
    colour: number | undefined;
    neighbours: IColouredVertex[];
    cluster: number | undefined;
}

const colour = (n: number, edges: number[][]): number[] => {

    const chooseColour = (v: IColouredVertex): number | undefined => {
        const adj = new Set();
        for (const n of v.neighbours) {
            adj.add(n.colour);
        }
        if ( (adj.has(0)) && (adj.has(1)) ) {
            return undefined;
        } else if (adj.has(0)) {
            return 1;
        } else {
            return 0;
        }
    }

    // initialize vertices, including adding edges
    const vs: IColouredVertex[] = [];
    for (let i = 0; i < n; i++) {
        vs.push({id: i, colour: undefined, neighbours: [], cluster: undefined});
    }
    for (const [left, right] of edges) {
        vs[left].neighbours.push(vs[right]);
        vs[right].neighbours.push(vs[left]);
    }

    // assign `cluster` to find disconnected subgraphs
    let cluster = 0;
    while (vs.filter(v => v.cluster ===  undefined).length > 0) {
        // Choose starting id
        const startv = vs.find(v => v.cluster === undefined);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tovisit = [startv!.id];
        const visited = [];
        while (tovisit.length > 0) {
            const v = vs[tovisit[0]];
            visited.push(v.id);
            tovisit.splice(0, 1);
            if (v.cluster === undefined) {
                v.cluster = cluster;
            }
            for (const n of v.neighbours) {
                if (! visited.includes(n.id)) {
                    tovisit.push(n.id);
                }
            }
        }
        cluster++;
    }

    // For each cluster, colour it
    const minCluster = Math.min(...vs.map(v => v.cluster as number));
    const maxCluster = Math.max(...vs.map(v => v.cluster as number));
    for (let cluster = minCluster; cluster <= maxCluster; cluster++) {
        // Choose starting id
        const startv = vs.find(v => v.cluster === cluster);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tovisit = [startv!.id];
        const visited = [];
        while (tovisit.length > 0) {
            const v = vs[tovisit[0]];
            visited.push(tovisit[0]);
            tovisit.splice(0, 1);
            if (v.colour === undefined) {
                v.colour = chooseColour(v);
            }
            for (const n of v.neighbours) {
                if (! visited.includes(n.id)) {
                    tovisit.push(n.id);
                }
            }
        }
    }

    if (vs.findIndex(v => v.colour === undefined) !== -1) {
        return [];
    } else {
        return vs.map(v => v.colour as number);
    }
}