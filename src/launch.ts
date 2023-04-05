// 3.15 GB
// 4.15 GB with script removal
import { BoxNode, MyNS } from "../MyTypes";
import { createBox } from "lib/box/box";

/**
 * Defines the individual scripts one can launch.
 *
 * @export
 * @interface ILaunchOption
 */
export interface ILaunchOption {
    /** Short, unique identifier of the script, used for indexing. No spaces or special characters. Must be unique. */
    uuid: string;
    /** Textual description of the script. */
    desription: string;
    /** The name of the script. If in a folder, include the leading slash. */
    script: string;
    /** The number of threads the script should launch with (usually just 1). */
    threads: number;
    /** Any arguments to pass to the script. */
    args: (string|number|boolean)[];
    /** The memory this script requires. Is regenerated at every call. */
    mem: number;
    /** The default order of this script relative to any others. Can be changed at launch time. */
    sequence: number;
    /** Whether this option has been selected. */
    selected: boolean;
}

export const launchBox = (options: ILaunchOption[], ram: number): Promise<ILaunchOption[]> => {
    const box = createBox("Script Launcher", genBody(options, ram), "\ueb32", "prompt") as BoxNode;
    box.recalcHeight();
    return new Promise<ILaunchOption[]>((resolve, reject) => {
        const button = box.body.querySelector("#btnLaunch");
        if (button === null) {
            return reject(new Error("Could not find the launch button!"));
        }
        button.addEventListener("click", () => {
            return box["remove"](resolve(options.filter(x => x.selected).sort((a, b) => a.sequence - b.sequence)));
        });
        const cancel = box.body.querySelector("#btnCancel");
        if (cancel === null) {
            return reject(new Error("Could not find the cancel button!"));
        }
        cancel.addEventListener("click", () => {
            return box["remove"](resolve([]));
        });

        for (const opt of options) {
            const cb = box.body.querySelector(`#${opt.uuid}`) as HTMLInputElement | null;
            if (cb === null) {
                return reject(new Error(`Could not attach event listener to the option ${opt.uuid}!`));
            }
            cb.addEventListener("change", (ev: Event) => {
                if (ev.target !== undefined) {
                    if ((ev.target as HTMLInputElement).checked) {
                        opt.selected = true;
                    } else {
                        opt.selected = false;
                    }
                    const rambox = box.body.querySelector(`#_RamDisplay`) as HTMLDivElement | null;
                    if (rambox !== null) {
                        rambox.innerHTML = renderRam(options, ram);
                    }
                }
            });
        }
    });
};

// Only gets called once because otherwise it causes issues.
const genBody = (options: ILaunchOption[], ram: number): string => {
    const ordered = options.sort((a, b) => a.sequence - b.sequence);
    let body = `
        <div>
            <div>
                Choose the scripts you wish to launch:
            </div>
            <div class="g2">
                <div class="l">
    `;
    for (const opt of ordered) {
        body += `<div><input type="checkbox" id="${opt.uuid}" name="${opt.uuid}"${opt.selected ? " checked" : ""}><label for="${opt.uuid}">${opt.desription}</label></div>`
    }
    body += `
                </div>
            </div>
            <div class="g2">
                <div id="_RamDisplay" class="l">
                    ${renderRam(options, ram)}
                </div>
                <div class="r">
                    <button id="btnLaunch">Launch!</button><button id="btnCancel">Cancel</button>
                </div>
            </div>
        </div>`;
    return body;
}

// Only renders the RAM display
const renderRam = (options: ILaunchOption[], ram: number): string => {
    const selected = options.filter(x => x.selected).sort((a, b) => a.sequence - b.sequence);
    const selectedRam = selected.reduce((acc, curr) => { return acc + curr.mem}, 0);
    if (selectedRam > ram) {
        return `<p>RAM: <span style="color: red">${selectedRam.toFixed(2)}</span> / ${ram}</p>`;
    } else {
        return `<p>RAM: <span style="color: green">${selectedRam.toFixed(2)}</span> / ${ram}</p>`;
    }
}

const launchScripts: ILaunchOption[] = [
    {
        uuid: "karma",
        desription: "Karma Watcher",
        script: "/watchers/karma.js",
        threads: 1,
        args: [],
        mem: 0,
        sequence: 5,
        selected: true
    },
    {
        uuid: "player",
        desription: "Player Action Manager",
        script: "/player/manage.js",
        threads: 1,
        args: [],
        mem: 0,
        sequence: 10,
        selected: true
    },
    {
        uuid: "hacker",
        desription: "Hack Controller",
        script: "/hacker/default.js",
        threads: 1,
        args: [],
        mem: 0,
        sequence: 1000000,
        selected: true
    },
    {
        uuid: "corp",
        desription: "Corporation Manager",
        script: "/corp/manage.js",
        threads: 1,
        args: [],
        mem: 0,
        sequence: 15,
        selected: false
    },
    {
        uuid: "gang",
        desription: "Gang Manager",
        script: "gang.js",
        threads: 1,
        args: [],
        mem: 0,
        sequence: 15,
        selected: false
    },
    {
        uuid: "stocks_no4s",
        desription: "No-4S Stock Trader",
        script: "/stocks/no4s/launch.js",
        threads: 1,
        args: [],
        mem: 24.2,
        sequence: 19,
        selected: true
    },
    {
        uuid: "stocks_4s",
        desription: "4S Stock Trader",
        script: "/stocks/4s.js",
        threads: 1,
        args: [],
        mem: 0,
        sequence: 19,
        selected: true
    },
    {
        uuid: "sleeves_default",
        desription: "Sleeve Assignment (Default)",
        script: "sleeves.js",
        threads: 1,
        args: [],
        mem: 0,
        sequence: 0,
        selected: true
    },
    {
        uuid: "sleeves_gym",
        desription: "Sleeve Assignment (Gym)",
        script: "sleeves.js",
        threads: 1,
        args: ["gym"],
        mem: 0,
        sequence: 0,
        selected: false
    },
    {
        uuid: "sleeves_uni",
        desription: "Sleeve Assignment (Study)",
        script: "sleeves.js",
        threads: 1,
        args: ["study"],
        mem: 0,
        sequence: 0,
        selected: false
    },
    {
        uuid: "stanek",
        desription: "Stanek's Gift",
        script: "stanek.js",
        threads: 1,
        args: ["BB"],
        mem: 0,
        sequence: 1,
        selected: false
    },
    {
        uuid: "servers",
        desription: "Purchase Servers",
        script: "purchase-servers.js",
        threads: 1,
        args: [],
        mem: 0,
        sequence: 20,
        selected: true,
    },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function main(ns: MyNS): Promise<void> {
    for (const opt of launchScripts) {
        if (opt.mem === 0) {
            opt.mem = ns.getScriptRam(opt.script, "home") * opt.threads;
        }
        if ( (opt.uuid === "gang") && (ns.gang.inGang()) ) {
            opt.selected = true;
        } else if ( (opt.uuid === "corp") && (ns.corporation.hasCorporation()) ) {
            opt.selected = true;
        }
    }
    let realopts = [...launchScripts];
    if (! ns.gang.inGang()) {
        realopts = realopts.filter(x => x.uuid !== "gang");
    } else {
        realopts = realopts.filter(x => x.uuid !== "karma");
    }
    if (! ns.corporation.hasCorporation()) {
        realopts = realopts.filter(x => x.uuid !== "corp");
    }
    if ( (! ns.stock.has4SData()) && (! ns.stock.has4SDataTIXAPI()) ) {
        realopts = realopts.filter(x => x.uuid !== "stocks_4s");
    } else {
        realopts = realopts.filter(x => x.uuid !== "stocks_no4s");
    }
    const maxram = ns.getServerMaxRam("home");
    const result = await launchBox(realopts, maxram - ns.getScriptRam("launch.ts", "home"));
    for (const opt of result) {
        ns.exec(opt.script, "home", opt.threads, ...opt.args);
        await ns.sleep(500);
    }
    ns.tprint("Launched!");
}

