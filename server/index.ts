import TelegramBot from "node-telegram-bot-api";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import { Cart } from "./models/Cart";
import { registerCommands } from "./bot/commands";
import { registerMessageHandler } from "./bot/messageHandler";
import { registerCallbackHandler } from "./bot/callbackHandler";
import { registerMainMenu } from "./bot/mainMenu";
import { TOKEN, URL, PORT, USE_WEBHOOK } from "./config";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173", "https://smartshopbuddy.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

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

/* -------------------- Вспомогательные функции -------------------- */

function parseChatId(chatId: string): number | null {
  const id = Number(chatId);
  return isNaN(id) ? null : id;
}

async function notifyFamilyMembers(chatId: number, message: string) {
  try {
    const cart = await Cart.findOne({ chatId });
    if (!cart) return;

    for (const memberId of cart.familyIds || []) {
      if (memberId !== String(chatId)) {
        await bot.sendMessage(memberId, message);
      }
    }
  } catch (e) {
    console.error("[notifyFamilyMembers] error:", e);
  }
}

/* -------------------- Маршруты -------------------- */

// Получение корзины
app.get("/api/cart/:chatId", async (req, res) => {
  try {
    const chatIdNum = parseChatId(req.params.chatId);
    if (chatIdNum === null)
      return res.status(400).json({ error: "Invalid chatId" });

    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    res.json({ products: cart.products });
  } catch (e) {
    console.error("[GET /api/cart/:chatId] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Архив корзины
app.get("/api/cart/:chatId/archive", async (req, res) => {
  try {
    const chatIdNum = Number(req.params.chatId);
    if (isNaN(chatIdNum))
      return res.status(400).json({ error: "Invalid chatId" });

    const cart = await Cart.findOne({ chatId: chatIdNum });
    const archived = cart?.archivedProducts || [];
    res.json({ archived });
  } catch (e) {
    console.error("[GET /api/cart/:chatId/archive] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Добавление товара
app.post("/api/cart/:chatId/add", async (req, res) => {
  try {
    const chatIdNum = parseChatId(req.params.chatId);
    if (chatIdNum === null)
      return res.status(400).json({ error: "Invalid chatId" });

    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ error: "Empty text" });

    let cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) cart = new Cart({ chatId: chatIdNum, products: [] });

    const normalized = text.toLowerCase();
    const exists = cart.products.some(
      (p) => p.text.toLowerCase() === normalized
    );

    if (!exists) {
      cart.products.push({ text, bought: false });
      await cart.save();
      await notifyFamilyMembers(chatIdNum, `🛒 Добавлен товар: ${text}`);
    }

    res.status(200).json({ products: cart.products });
  } catch (e) {
    console.error("[POST /api/cart/:chatId/add] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Переключение состояния "куплено"
app.put("/api/cart/:chatId/toggle/:id", async (req, res) => {
  try {
    const chatIdNum = Number(req.params.chatId);
    if (isNaN(chatIdNum))
      return res.status(400).json({ error: "Invalid chatId" });

    const { id } = req.params;
    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const product = cart.products.find(
      (p) => p._id instanceof mongoose.Types.ObjectId && p._id.toString() === id
    );
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.bought = !product.bought;
    await cart.save();

    const action = product.bought ? "✅ Куплен" : "↩️ Вернули в список";
    await notifyFamilyMembers(chatIdNum, `${action} товар: ${product.text}`);

    res.status(200).json({ products: cart.products });
  } catch (e) {
    console.error("[PUT /cart/:chatId/toggle/:id] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Восстановление из архива
app.post("/api/cart/:chatId/restore/:id", async (req, res) => {
  try {
    const chatIdNum = Number(req.params.chatId);
    const { id } = req.params;

    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const product = cart.archivedProducts.id(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    cart.products.push({ text: product.text, bought: false });
    product.deleteOne();
    await cart.save();

    await notifyFamilyMembers(
      chatIdNum,
      `♻️ Восстановлен товар: ${product.text}`
    );

    res.json({ products: cart.products, archived: cart.archivedProducts });
  } catch (e) {
    console.error("[POST /api/cart/:chatId/restore/:id] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Удаление товара
app.delete("/api/cart/:chatId/remove/:id", async (req, res) => {
  try {
    const chatIdNum = parseChatId(req.params.chatId);
    if (chatIdNum === null)
      return res.status(400).json({ error: "Invalid chatId" });

    const { id } = req.params;
    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const product = cart.products.id(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.deleteOne();
    await cart.save();

    res.status(200).json({ products: cart.products });
  } catch (e) {
    console.error("[DELETE /api/cart/:chatId/remove/:id] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Работа с семьями
app.get("/api/families/:chatId", async (req, res) => {
  try {
    const chatIdNum = Number(req.params.chatId);
    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    res.json({
      families: cart.familyIds,
      activeFamilyId: cart.activeFamilyId || null,
    });
  } catch (e) {
    console.error("[GET /api/families/:chatId] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/families/:chatId/add", async (req, res) => {
  try {
    const chatIdNum = Number(req.params.chatId);
    const { familyId } = req.body;
    if (!familyId) return res.status(400).json({ error: "familyId required" });

    let cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart)
      cart = new Cart({ chatId: chatIdNum, familyIds: [], products: [] });

    if (!cart.familyIds.includes(familyId)) {
      cart.familyIds.push(familyId);
      if (!cart.activeFamilyId) cart.activeFamilyId = familyId;
      await cart.save();
    }

    res.json({ families: cart.familyIds, activeFamilyId: cart.activeFamilyId });
  } catch (e) {
    console.error("[POST /api/families/:chatId/add] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/families/:chatId/switch/:familyId", async (req, res) => {
  try {
    const chatIdNum = Number(req.params.chatId);
    const { familyId } = req.params;

    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    if (!cart.familyIds.includes(familyId))
      return res.status(400).json({ error: "Family not found in list" });

    cart.activeFamilyId = familyId;
    await cart.save();

    res.json({ activeFamilyId: cart.activeFamilyId });
  } catch (e) {
    console.error("[PUT /api/families/:chatId/switch/:familyId] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* -------------------- Инициализация бота -------------------- */

registerCommands(bot);
registerMainMenu(bot);
registerMessageHandler(bot);
registerCallbackHandler(bot);

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});

export { app, bot };
