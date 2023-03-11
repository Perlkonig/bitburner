export const colours = ["Black", "Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "White", "Gray", "BrightRed", "BrightGreen", "BrightYellow", "BrightBlue", "BrightMagenta", "BrightCyan", "BrightWhite"];
const fgNums = [30, 31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97];
const bgNums = [40, 41, 42, 43, 44, 45, 46, 47, 100, 101, 102, 103, 104, 105, 106, 107];

export const foreground = new Map();
for (let i = 0; i < colours.length; i++) {
    foreground.set(colours[i], fgNums[i]);
}

export const background = new Map();
for (let i = 0; i < colours.length; i++) {
    background.set(colours[i], bgNums[i]);
}

export const lengthVisible = (str: string): number => {
    let len = 0;
    let count = true;
    for (const char of str) {
        if ( (count) && (char === "\x1b") ) {
            count = false;
        } else if ( (! count) && (char === "m") ) {
            count = true;
        } else if (count) {
            len++;
        }
    }
    return len;
}

const _code = (...codes: number[]): string => `\x1b[${codes.join(';')}m`;

export const code = (...colours: (string|null|undefined)[]): string|undefined => {
    const [fg, bg] = [...colours];
    const codes: number[] = [];
    if ( (fg !== undefined) && (fg !== null) ) {
        if (! foreground.has(fg)) {
            return undefined;
        } else {
            codes.push(foreground.get(fg));
        }
    }
    if ( (bg !== undefined) && (bg !== null) ) {
        if (! background.has(bg)) {
            return undefined;
        } else {
            codes.push(background.get(bg));
        }
    }
    if (codes.length > 0) {
        return _code(...codes);
    } else {
        return _code(0);
    }
}
