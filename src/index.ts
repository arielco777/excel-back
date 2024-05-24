import express from "express";
import cors from "cors";
import { excelRouter } from "./excel/excelController";

const app = express();
app.use(
    cors({
        origin: "http://localhost:3000",
    })
);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.use(
    cors({
        origin: "http://localhost:3000",
    })
);

app.use("/excel", excelRouter);

const port = 5000;
app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
