import fs from "fs";
import type {
    CellType,
    GroupData,
    GroupType,
    RowData,
    RowType,
} from "../types/ExcelType";
import * as ExcelJs from "exceljs";
import { Parser } from "csv-parse";
import { Readable } from "stream";

/**
 * @param {Buffer} buffer
 * @returns {RowData}
 */
const makeRowsFromXl = async (buffer: any): Promise<RowData> => {
    const rowsData: RowData = [];
    const workbook = new ExcelJs.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.getWorksheet(1);
    console.log("Putting rows in rowsData");
    worksheet?.eachRow((row, _) => {
        rowsData.push(row.values as any);
    });
    return rowsData;
};

/**
 *
 * @param {string} delimiter
 * @param {Buffer} buffer
 * @returns {RowData}
 */
const makeRowsFromCSV = async (
    delimiter: string,
    buffer: any
): Promise<RowData> => {
    const rowsData: RowData = [];
    var parser = new Parser({
        delimiter: delimiter,
        trim: true,
        skip_empty_lines: true,
        columns: false,
    });

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    console.log("Putting rows in rowsData...");
    for await (const record of stream.pipe(parser)) {
        let values;
        try {
            values = Object.values(JSON.parse(record)).map((v: any) =>
                !Number.isNaN(parseFloat(v)) ? parseFloat(v) : v
            );
        } catch (err) {
            values = Object.values(record).map((v: any) =>
                !Number.isNaN(parseFloat(v)) ? parseFloat(v) : v
            );
        }

        values.unshift(null);
        rowsData.push(values);
    }
    return rowsData;
};

/**
 *
 * @param {GroupData} data
 * @param {string} column
 * @param {RowType} headers
 * @param {"asc" | "des"} direction
 * @returns RowData
 */
function sorting(
    data: RowType[],
    column: string,
    headers: RowType,
    direction: "asc" | "des"
): RowData {
    const sortColumnIndex = headers.indexOf(column);

    if (sortColumnIndex >= 0) {
        data.sort((a: RowType, b: RowType) => {
            let valA = a[sortColumnIndex];
            let valB = b[sortColumnIndex];

            if (typeof valA === "string") valA = valA.toLowerCase();
            if (typeof valB === "string") valB = valB.toLowerCase();

            if (valA < valB) return direction === "asc" ? -1 : 1;
            if (valA > valB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    }

    return data;
}

/**
 *
 * @param {RowData} data
 * @param {RowType} desiredList
 * @returns {RowData}
 */
function getDesired(data: RowData, desiredList: string[]): RowData {
    console.log("Data[0]:", data[0]);
    console.log("Desired: ", desiredList);
    const header = data[0].slice(1);
    console.log("Header: ", header);
    const indexes: number[] = data[0]
        .map((item: CellType, idx: number) =>
            desiredList.includes(item as string) ? idx : -1
        )
        .filter((index: number) => index >= 0); // Ensure '0' index is included

    console.log("Indexes: ", indexes);

    return data.map((row: RowType) => {
        const newItem = row.filter((cell: string | number, idx: number) =>
            indexes.includes(idx)
        );
        return newItem;
    });
}

/**
 *
 * @param {RowData} data
 * @param {string} column to group from
 * @param {RowType} headers
 * @returns {GroupData | RowData}
 */
function grouping(
    data: RowData,
    column: string,
    headers: RowType
): GroupData | RowData {
    const groupIndex = headers.indexOf(column);
    // console.log("GroupIndex: ", groupIndex);
    if (groupIndex == -1) return data;
    let groupedData = [];
    let currentGroup = [];
    let lastValue = null;

    for (let i = 1; i < data.length; i++) {
        let row = data[i];
        if (lastValue !== null && row[groupIndex] !== lastValue) {
            groupedData.push([headers].concat(currentGroup));
            currentGroup = [];
        }
        currentGroup.push(row);
        lastValue = row[groupIndex];
    }

    if (currentGroup.length > 0) {
        groupedData.push([headers, ...currentGroup]);
    }

    return groupedData;
}

/**
 *
 * @param {RowData} data
 * @returns {RowData}
 */
function shiftInRow(data: RowData): RowData {
    return data.map((row: RowType) => {
        let firstNonEmptyIndex = row.findIndex(
            (cell) => cell !== null && cell !== undefined && cell !== ""
        );
        return firstNonEmptyIndex === -1 ? [] : row.slice(firstNonEmptyIndex);
    });
}

/**
 *
 * @param {GroupData} data
 * @param {RowType} headers
 * @returns {RowType[]} To be not included in the rowData
 */
function getSums(data: GroupData, headers: RowType): RowType[] {
    let groupSums: RowType[] = [];
    data.forEach((group: GroupType) => {
        let sums: RowType = new Array(headers.length).fill(0);
        for (let i = 1; i < group.length; i++) {
            let row = group[i];
            for (let j = 0; j < row.length; j++) {
                if (typeof sums[j] === "number") {
                    sums[j] = (sums[j] as number) + (row[j] as number);
                } else {
                    sums[j] = "";
                }
            }
        }
        sums = sums.map((sum: CellType) => {
            if (typeof sum === "number") {
                const d = sum as number;
                return d.toFixed(2);
            } else {
                return sum;
            }
        });
        groupSums.push(sums);
    });
    return groupSums;
}

/**
 *
 * @param {GroupData} data
 * @param {RowType} headers
 * @param {RowType} sums
 * @returns {RowType[]}
 */
function getAvg(
    data: GroupData,
    headers: RowType,
    sums: RowType[] | null
): RowType[] {
    if (!sums) var allSums = getSums(data, headers);
    else var allSums = sums;

    const avgs = data.map((group, idx) => {
        let copyGroup = [...group];
        copyGroup = copyGroup.slice(1);
        const copySize = copyGroup.length;

        return allSums[idx].map((sum: number | string) =>
            !Number.isNaN(sum) ? ((sum as number) / copySize).toFixed(2) : " "
        );
    });
    return avgs;
}

export {
    sorting,
    getDesired,
    grouping,
    shiftInRow,
    getSums,
    getAvg,
    makeRowsFromXl,
    makeRowsFromCSV,
};
