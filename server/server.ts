import mongoose from "mongoose";
import { app } from "./index";
import { PORT, MONGO_URI } from "./config";
import { startBot } from "./bot";

let server: import("http").Server | undefined;

const start = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB подключена");

    startBot();

    server = app.listen(PORT, () =>
      console.log(`🚀 Сервер запущен на http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ Ошибка подключения к MongoDB", err);
    process.exit(1);
  }
};

start();

async function gracefulShutdown(signal: string) {
  try {
    console.log(`${signal} received. Shutting down...`);
    await mongoose.connection.close();
    if (server)
      await new Promise((resolve) => server!.close(() => resolve(null)));
    console.log("Shutdown complete.");
    process.exit(0);
  } catch (e) {
    console.error("Error during shutdown", e);
    process.exit(1);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
