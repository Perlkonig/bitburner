import { lengthVisible } from "lib/ansi";

export type Alignment = "LEFT" | "RIGHT" | "CENTRE";

export interface ITableColumn {
    /** Total width of the column, including padding. */
    width: number;
    /** How text will be arranged within the cell. Defaults to LEFT. */
    alignment?: Alignment;
    /** Internal padding of the text. Takes room away from actual text. Defaults to 0.*/
    padding?: number;
}

class TableColumn implements ITableColumn {
    public width: number;
    public alignment: Alignment = "LEFT";
    public padding = 0;

    constructor(col: ITableColumn) {
        this.width = col.width;
        if (col.alignment !== undefined) {
            this.alignment = col.alignment;
        }
        if (col.padding !== undefined) {
            this.padding = col.padding;
        }

        // Sanity checks
        if (this.width < 1) {
            throw new Error("Width must be at least 1.");
        }
        if (this.width <= this.padding) {
            throw new Error("Width must be greater than any padding.");
        }
    }

    public visibleWidth(): number {
        return this.width - this.padding;
    }

    public render(str: string): string {
        let rendered = str;

        // Adjust for length first
        const visible = lengthVisible(str);
        // If the string is too long and contains invisible chars, throw
        if ( (visible > this.visibleWidth()) && (visible !== str.length) ) {
            throw new Error("A provided string is too long and contains invisible characters, so can't be truncated.");
        } else if (visible > this.visibleWidth()) {
            rendered = str.slice(0, this.visibleWidth() - 1) + "\u2026";
        }

        // Now pad for alignment
        if (lengthVisible(rendered) < this.visibleWidth()) {
            const delta = this.visibleWidth() - lengthVisible(rendered);
            let lpad = 0; let rpad = 0;
            switch (this.alignment) {
                case "LEFT":
                    rpad = delta;
                    break;
                case "RIGHT":
                    lpad = delta;
                    break;
                case "CENTRE":
                    lpad = Math.floor(delta / 2);
                    rpad = Math.ceil(delta / 2);
                    break;
            }
            for (let i = 0; i < lpad; i++) {
                rendered = " " + rendered;
            }
            for (let i = 0; i < rpad; i++) {
                rendered += " ";
            }
        }

        return rendered;
    }
}

export interface ITableLayout {
    /** The width of the spacing between columns, or a string expressing the exact characters to place between columns. Defaults to 1.*/
    gutter?: number | string;
    /** The columns themselves. */
    columns: ITableColumn[];
}

export type TableData = string[][];

export class TableLayout implements ITableLayout {
    public gutter: number | string = 1;
    public columns: TableColumn[] = [];

    constructor(layout: ITableLayout) {
        if (layout.gutter !== undefined) {
            this.gutter = layout.gutter;
        }
        for (const col of layout.columns) {
            this.columns.push(new TableColumn(col));
        }

        // Sanity checks
        if (this.columns.length < 1) {
            throw new Error("You must define at least one column.");
        }
    }

    public totalWidth(): number {
        let width = 0;
        for (const col of this.columns) {
            width += col.width;
        }
        if (typeof this.gutter === "number") {
            width += this.gutter * (this.columns.length - 1);
        } else {
            width += this.gutter.length * (this.columns.length - 1);
        }
        return width;
    }

    protected renderGutter(): string {
        if (typeof this.gutter === "string") {
            return this.gutter;
        } else {
            let str = "";
            for (let i = 0; i < this.gutter; i++) {
                str += " ";
            }
            return str;
        }
    }

    public render(data: TableData): string {
        let rendered = "";
        for (const row of data) {
            if (row.length !== this.columns.length) {
                throw new Error("Your table data must provide data for every defined column, even if it's an empty string.");
            }
            for (let i = 0; i < row.length; i++) {
                const col = this.columns[i];
                const cell = col.render(row[i]);
                rendered += cell;
                if (i < row.length - 1) {
                    rendered += this.renderGutter();
                }
            }
        }
        return rendered;
    }
}