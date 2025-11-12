import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cartRouter from "./routes/cart";

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const MONGO = process.env.MONGO_URI || "mongodb://localhost:27017/smartshopbuddy";

export const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

app.use("/api/cart", cartRouter);

mongoose
  .connect(MONGO)
  .then(() => {
    console.log("Mongo connected");
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection error:", err);
    process.exit(1);
  });
