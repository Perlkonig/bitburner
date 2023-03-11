import { NS } from "@ns";

export const seconds2string = (ns: NS, seconds: number) => {
    let time = seconds;
    let unit = "seconds";
    if (time > 60) {
        time /= 60;
        unit = "minutes";
    }
    if (time > 60) {
        time /= 60;
        unit = "hours";
    }
    return `${ns.formatNumber(time, 1)} ${unit}`
}
