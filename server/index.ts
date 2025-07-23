import express from "express";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.BOT_TOKEN!;
const port = process.env.PORT || 3000;

// Инициализация бота в режиме polling
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Добро пожаловать в SmartShopBuddy! 🛒");
});

// Express сервер (можно расширить, например, принимать данные от клиента)
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("SmartShopBuddy backend работает 🚀");
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
