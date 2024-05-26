import express from "express";
import cors from "cors";
import { excelRouter } from "./excel/excelController";

const app = express();
const allowedOrigins = ["https://excel-front-lovat.vercel.app"];

const corsOptions = {
    origin: function (origin: any, callback: any) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.use("/excel", cors(corsOptions), excelRouter);

const port = 5000;
app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
