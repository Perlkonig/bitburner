// Converts a percentage into an ASCII progress bar based on a given width.
// Assumes `percent` is between 0 and 100 inclusive.
export const progressBar = (percent: number, width: number): string|undefined => {
    if ( (percent === undefined) || (percent === null) || (percent < 0) || (percent > 100) ) {
        return undefined;
    }
    if ( (width === undefined) || (width === null) || (width < 1) ) {
        return undefined;
    }

    const boxInc = 8;
    const boxChars = ["\u2500", "\u258F", "\u258E", "\u258D", "\u258C", "\u258B", "\u258A", "\u2589", "\u2588"];

    const bar = [];
    const chunk = 100 / width;
    let remaining = percent;
    for (let i = 0; i < width; i++) {
        if (remaining >= chunk) {
            bar.push(boxInc);
            remaining -= chunk;
        } else if (remaining <= 0) {
            bar.push(0);
        } else {
            bar.push(Math.floor(remaining / chunk / (1 / boxInc)));
            remaining = 0;
        }
    }
    return bar.map(b => boxChars[b]).join("");
}