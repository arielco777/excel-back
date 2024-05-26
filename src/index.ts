import express from "express";
import cors from "cors";
import { excelRouter } from "./excel/excelController";

const app = express();
app.use(
    cors({
        origin: "excel-front-lovat.vercel.app",
    })
);

app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.use("/excel", excelRouter);

const port = 5000;
app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
