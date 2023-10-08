import express from "express";
import { userRouter } from "./routers/userRouter.js";
import { categoryRouter } from "./routers/categoryRouter.js";
import { productRouter } from "./routers/productsRouter.js";
import bodyParser from "body-parser";


const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

app.get('/', (req, res) => {
    res.send("HOME");
});

app.use("/api/users", userRouter);
app.use("/", categoryRouter);
app.use("/api/products",productRouter);
export { app };
