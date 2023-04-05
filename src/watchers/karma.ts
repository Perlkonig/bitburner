import { BoxNode, MyNS } from "../../MyTypes";
import { createSidebarItem, sidebar } from "lib/box/box";
import { seconds2string } from "lib/time";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function main(ns: MyNS): Promise<void> {
    const karmaTarget = 54000;
    let karma = ns.heart.break();
    let lastKarma = karma;
    const deltas: number[] = [];
    const sleeptime = 5;
    const box: BoxNode = createSidebarItem("Karma", `<p id="karmaStr">${ns.formatNumber(karma, 2)}</p><p><progress id="karmaBar" max="${karmaTarget}" value="${Math.abs(karma)}"></progress></p>`, "\ueb05") as BoxNode;

    while (true) {
        if ( (sidebar === null) || (!sidebar.contains(box)) ) {
            ns.exit();
        }
        karma = ns.heart.break();
        if (Math.abs(karma) >= karmaTarget) {
            ns.tprint("Karma target reached. Starting gang management script.");
            ns.toast("Karma target reached.", "success", null);
            sidebar.removeChild(box);
            ns.exec("gang.js", "home");
            await ns.sleep(500);
            ns.exec("sleeves.js", "home");
            ns.exit();
        }
        const delta = Math.abs(karma - lastKarma);
        deltas.push(delta);
        if (deltas.length > 10) {
            deltas.splice(0,1);
        }
        const avgDelta = deltas.reduce((acc, curr) => { return acc + curr; }, 0) / deltas.length;
        const rate = avgDelta / sleeptime;
        const needed = karmaTarget - Math.abs(karma);
        let time: number|undefined = undefined;
        if (rate > 0) {
            time = needed / rate;
        }
        let timeStr = "";
        if (time !== undefined) {
            timeStr = ` (~${seconds2string(ns, time)} remaining)`
        }
        box.body.innerHTML = `<p id="karmaStr">${ns.formatNumber(karma, 2)}${timeStr}</p><p><progress id="karmaBar" max="${karmaTarget}" value="${Math.abs(karma)}"></progress></p>`;
        lastKarma = karma
        await ns.sleep(sleeptime * 1000);
    }
}
