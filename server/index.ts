import express from "express";
import cors from "cors";

import { PORT } from "./config";
import { bot } from "./bot";
import cartRoutes from "./routes/cart";
import familiesRoutes from "./routes/families";

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

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});

export { app, bot };
