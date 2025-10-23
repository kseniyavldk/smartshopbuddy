import mongoose from "mongoose";
import { app } from "./index";
import { PORT, MONGO_URI } from "./config";

async function start() {
  try {
    console.log("🌐 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      dbName: "smartshopbuddy",
    });
    console.log("✅ MongoDB connected");

    mongoose.connection.on("disconnected", () => console.log("⚠️ MongoDB disconnected"));
    mongoose.connection.on("error", (err) => console.error("❌ MongoDB connection error:", err));

    app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

start();
