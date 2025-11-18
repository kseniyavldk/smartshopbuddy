import express from "express";
import cors from "cors";
import cartRouter from "./routes/cart";

export const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

app.use("/api/cart", cartRouter);
