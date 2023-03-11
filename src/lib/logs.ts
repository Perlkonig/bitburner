import { NS } from "@ns";

export const dumplog = (ns: NS, fn: string, script: string, ...args: (string|number)[]) => {
    const log = ns.getScriptLogs(script, "home", ...args);
    ns.write(`dump_${fn}.txt`, log.join("\r\n"), "w");
}
