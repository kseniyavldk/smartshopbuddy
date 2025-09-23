import TelegramBot from "node-telegram-bot-api";
import express from "express";
import cors from "cors";

import { Cart } from "./models/Cart";

import { registerCommands } from "./bot/commands";
import { registerMessageHandler } from "./bot/messageHandler";
import { registerCallbackHandler } from "./bot/callbackHandler";
import { TOKEN, URL, PORT, USE_WEBHOOK } from "./config";

const app = express();
app.use(express.json());

let bot: TelegramBot;

if (USE_WEBHOOK) {
  bot = new TelegramBot(TOKEN, { webHook: true });
  bot.setWebHook(`${URL}/bot${TOKEN}`);
  app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
} else {
  bot = new TelegramBot(TOKEN, { polling: true });
}

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.get("/api/cart/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;
    const cart = await Cart.findOne({ chatId: Number(chatId) });
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    res.json({ products: cart.products });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/cart/:chatId/add", async (req, res) => {
  try {
    const { chatId } = req.params;
    const text = String(req.body.text || "")
      .trim()
      .toLowerCase();
    if (!text) return res.status(400).json({ error: "Empty text" });

    let cart = await Cart.findOne({ chatId: Number(chatId) });
    if (!cart) {
      cart = new Cart({ chatId: Number(chatId), products: [] });
    }

    const exists = cart.products.some((p) => p.text.toLowerCase() === text);

    if (!exists) {
      cart.products.push({ text, bought: false });
      await cart.save();
    }

    res.status(200).json({ products: cart.products });
  } catch (e) {
    console.error("POST /api/cart/:chatId/add error", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

registerCommands(bot);
registerMessageHandler(bot);
registerCallbackHandler(bot);

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});

export { app, bot };
