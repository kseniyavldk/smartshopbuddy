import express from "express";
import cors from "cors";
import cartRoutes from "./routes/cart";
import familiesRoutes from "./routes/families";
import { bot } from "./bot";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173", "https://smartshopbuddy.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use("/api/cart", cartRoutes);
app.use("/api/families", familiesRoutes);

export { app, bot };
