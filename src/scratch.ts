import { MyNS } from "../MyTypes";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function main(ns: MyNS): Promise<void> {
    const skills: [string,number][] = [];
    for (const skill of ns.bladeburner.getSkillNames()) {
        const lvl = ns.bladeburner.getSkillLevel(skill);
        skills.push([skill, lvl]);
    }
    skills.sort((a, b) => b[1] - a[1]);
    ns.tprint(JSON.stringify(skills, null, 2));
}

