import express from "express";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Cart } from "./models/Cart";

dotenv.config();

const token = process.env.BOT_TOKEN!;
const port = process.env.PORT || 3000;

const bot = new TelegramBot(token, { polling: false });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  let cart = await Cart.findOne({ chatId });
  if (!cart) {
    cart = new Cart({ chatId, products: [] });
    await cart.save();
  }

  await bot.sendMessage(
    chatId,
    `Добро пожаловать в SmartShopBuddy! 🛒\nНапишите название товара, чтобы добавить его в корзину.\n\nПример: *Banana*, *Milk*, *Bread*`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/cart/, async (msg) => {
  const chatId = msg.chat.id;
  const cart = await Cart.findOne({ chatId });

  const cartText = cart?.products.join(", ") || "пусто";
  bot.sendMessage(chatId, `🛒 Ваша корзина: ${cartText}`);
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text || text.startsWith("/")) return;

  let cart = await Cart.findOne({ chatId });
  if (!cart) {
    cart = new Cart({ chatId, products: [] });
  }

  cart.products.push(text);
  await cart.save();

  const cartText = cart.products.join(", ");
  await bot.sendMessage(
    chatId,
    `✅ "${text}" добавлен в корзину.\n\nТекущая корзина: ${cartText}`
  );
});

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("SmartShopBuddy backend работает 🚀");
});

console.log("🔌 Попытка подключиться к MongoDB...");

mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => {
    console.log("✅ MongoDB подключена");

    app.listen(port, () => {
      console.log(`Сервер запущен на http://localhost:${port}`);
    });

    bot.startPolling();
  })
  .catch((err) => {
    console.error("❌ Ошибка подключения к MongoDB", err);
    process.exit(1);
  });

mongoose.connection.on("connected", () =>
  console.log("Mongoose: подключение установлено")
);
mongoose.connection.on("error", (err) =>
  console.error("Mongoose: ошибка подключения", err)
);
mongoose.connection.on("disconnected", () =>
  console.log("Mongoose: подключение закрыто")
);
