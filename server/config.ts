import dotenv from "dotenv";
dotenv.config();

export const TOKEN = process.env.BOT_TOKEN!;
export const URL = process.env.WEBHOOK_URL;
export const PORT = parseInt(process.env.PORT || "3000", 10);
export const USE_WEBHOOK = process.env.USE_WEBHOOK === "true";
export const MONGO_URI = process.env.MONGO_URI!;
