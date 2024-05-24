import express from "express";
import multer from "multer";
import * as ExcelJs from "exceljs";
import type {
    GroupData,
    GroupType,
    RowData,
    RowType,
} from "../types/ExcelType";
import { makeRowsFromCSV, makeRowsFromXl } from "./manager";
import {
    getDesired,
    sorting,
    grouping,
    shiftInRow,
    getSums,
    getAvg,
} from "./manager";
const router = express.Router();

const storage = multer.memoryStorage();

function filter(_: unknown, file: Express.Multer.File, cb: any) {
    if (
        file.mimetype.includes("csv") ||
        file.mimetype === "application/vnd.ms-excel" ||
        file.mimetype ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
        cb(null, true);
    }
}
const upload = multer({ storage: storage, fileFilter: filter });

router.post("/csv-format", upload.single("file"), async (req, res) => {
    const startTime = Date.now();
    try {
        console.log("\nGot /csv-format request...");
        if (!req.file) {
            console.log("Req: ", req.body);
            return res.status(400).send("No file uploaded");
        }

        const {
            desired,
            groupBy,
            groupDir,
            sortBy,
            sortDir,
            delimiter,
            avgChosen,
            totalChosen,
        } = req.body;

        console.log("WorkBook being created...");

        const avg = JSON.parse(avgChosen);
        const total = JSON.parse(totalChosen);

        let desiredItems;
        try {
            desiredItems = JSON.parse(desired);
        } catch (e) {
            desiredItems = [];
        }

        let rowsData = [];
        let headers: RowType;

        if (!delimiter) {
            console.log("It's an xlsx...");
            rowsData = await makeRowsFromXl(req.file.buffer);
        } else {
            console.log("It's a csv...");
            console.log("Delimiter: ", delimiter);
            rowsData = await makeRowsFromCSV(delimiter, req.file.buffer);
        }

        if (rowsData.length == 0 && delimiter) {
            return res.status(400).send("Invalid delimiter provided.");
        }

        if (!rowsData[0].includes(desiredItems[0])) {
            console.log("We ain't found shit!");
            return res
                .status(400)
                .send(
                    "Invalid delimiter provided. Verify your CSV and try again."
                );
        }

        // Desired Items
        if (desiredItems.length > 0) {
            rowsData = getDesired(rowsData, desiredItems);
        } else rowsData = shiftInRow(rowsData);

        headers = rowsData[0];
        console.log("Header Result: ", headers);

        // Grouping
        if (groupBy !== "none") {
            console.log("Grouping by: ", groupBy);
            const sliced = rowsData.slice(1);
            rowsData = sorting(sliced, groupBy, headers, groupDir);
            rowsData = grouping(rowsData, groupBy, headers);
        } else {
            console.log("No Grouping.");
        }

        // Get Sums and Avg if applicable
        if (total) {
            console.log("Getting sums");
            var sums = getSums(rowsData as GroupData, headers);
            if (avg) {
                var avgs = getAvg(rowsData as GroupData, headers, sums);
            }
        }
        if (avg) {
            console.log("Getting average");
            var avgs = getAvg(rowsData as GroupData, headers, null);
        }

        // Sorting
        if (sortBy !== "none") {
            console.log("Sorting by: ", sortBy);
            if (groupBy !== "none" && sortBy !== groupBy) {
                rowsData = rowsData.map((row: RowType | GroupType) => {
                    const sliced = row.slice(1);
                    const newSlice = sorting(
                        sliced as RowType[],
                        sortBy,
                        headers,
                        sortDir
                    );
                    newSlice.unshift(headers);
                    return newSlice;
                });
            } else if (groupBy === "none") {
                const sliced = rowsData.slice(1);
                rowsData = sorting(
                    sliced as RowType[],
                    sortBy,
                    headers,
                    sortDir
                );
                rowsData.unshift(headers);
            }
        } else {
            console.log("No Sorting.");
        }

        console.log("New Excel Workbook and Worksheet being made.");

        const returnWorkbook = new ExcelJs.Workbook();
        const returnWorksheet = returnWorkbook.addWorksheet("Data");

        console.log("Writting into worksheet...");

        // Group is GroupData or RowData
        rowsData.forEach((group: any, idx: number) => {
            if (groupBy !== "none") {
                group.forEach((g: GroupType) => {
                    if (total || avg) returnWorksheet.addRow([null, ...g]);
                    else returnWorksheet.addRow(g);
                });
                if (total) {
                    const sumRow = ["Total", ...sums[idx]];
                    returnWorksheet.addRow(sumRow);
                }
                if (avg) {
                    const avgRow = ["Average", ...avgs[idx]];
                    returnWorksheet.addRow(avgRow);
                }

                returnWorksheet.addRow("");
                returnWorksheet.addRow("");
            } else {
                if (total || avg) returnWorksheet.addRow([null, ...group]);
                else returnWorksheet.addRow(group);
                if (total) {
                    const sumRow = ["Sum", ...sums[idx]];
                    returnWorksheet.addRow(sumRow);
                }
                if (avg) {
                    const avgRow = ["Average", ...avgs[idx]];
                    returnWorksheet.addRow(avgRow);
                }
            }
        });

        console.log("Done making worksheet rows.");

        if (desired) {
            const desiredText = desiredItems.join(",");
            returnWorksheet.addRow([`Desired:`, desiredText]);
        }
        if (groupBy !== "none") returnWorksheet.addRow([`GroupBy: `, groupBy]);
        if (sortBy !== "none") returnWorksheet.addRow([`SortBy: `, sortBy]);

        console.log("Writing into workbook...");

        const buffer = await returnWorkbook.xlsx.writeBuffer();

        res.set({
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="output.xlsx"',
        });

        console.log("Sending info...");
        res.status(200).send(buffer);
    } catch (error: any) {
        console.log("error: ", error.message);
        if (error.message.includes("Invalid Opening Quote")) {
            return res.status(400).send("Invalid delimiter provided");
        }
        return res.status(500).send(error);
    } finally {
        const elapsedTime = Date.now() - startTime;
        console.log(`Request completed in ${elapsedTime} ms`);
    }
});

export { router as excelRouter };
