import mongoose from "mongoose";
import { app } from "./app";
import { PORT, MONGO_URI } from "./config";
import { startBot } from "./bot";

async function start() {
  try {
    console.log("🌐 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, { dbName: "smartshopbuddy" });
    console.log("✅ MongoDB connected");

    await startBot();

    app.listen(PORT, () =>
      console.log(`🚀 API running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ Failed to start server:", err);
  }
}

start();
