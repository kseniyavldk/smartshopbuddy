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

function parseChatId(chatId: string): number | null {
  const id = Number(chatId);
  if (isNaN(id)) return null;
  return id;
}

app.get("/api/cart/:chatId", async (req, res) => {
  try {
    const chatIdNum = parseChatId(req.params.chatId);
    if (chatIdNum === null) {
      return res.status(400).json({ error: "Invalid chatId" });
    }

    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    res.json({ products: cart.products });
  } catch (e) {
    console.error("[GET /api/cart/:chatId] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/cart/family/:chatId", async (req, res) => {
  try {
    const chatIdNum = Number(req.params.chatId);
    if (isNaN(chatIdNum))
      return res.status(400).json({ error: "Invalid chatId" });

    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Family cart not found" });

    res.json({ products: cart.products });
  } catch (e) {
    console.error("[GET /cart/family/:chatId] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/cart/:chatId/archive", async (req, res) => {
  try {
    const chatIdNum = Number(req.params.chatId);
    if (isNaN(chatIdNum))
      return res.status(400).json({ error: "Invalid chatId" });

    let cart = await Cart.findOne({ chatId: chatIdNum });
    console.log(cart?.archivedProducts);

    const archived = cart?.archivedProducts || [];

    res.json({ archived });
  } catch (e) {
    console.error("[GET /api/cart/:chatId/archive] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/cart/:chatId/archive/:id", async (req, res) => {
  try {
    const chatIdNum = Number(req.params.chatId);
    const { id } = req.params;
    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const product = cart.archivedProducts.id(id);
    if (!product)
      return res.status(404).json({ error: "Product not found in archive" });

    product.deleteOne();
    await cart.save();

    res.json({ products: cart.products, archived: cart.archivedProducts });
  } catch (e) {
    console.error("[DELETE /api/cart/:chatId/archive/:id] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/cart/:chatId/archive/:id", async (req, res) => {
  try {
    const chatIdNum = Number(req.params.chatId);
    const { id } = req.params;
    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const productIndex = cart.products.findIndex(
      (p) => (p._id as mongoose.Types.ObjectId).toString() === id
    );

    if (productIndex === -1)
      return res.status(404).json({ error: "Product not found" });

    const [product] = cart.products.splice(productIndex, 1);
    cart.archivedProducts.push(product);
    await cart.save();

    res.json({ products: cart.products, archived: cart.archivedProducts });
  } catch (e) {
    console.error("[POST /cart/:chatId/archive/:id] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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

    res.json({ products: cart.products, archived: cart.archivedProducts });
  } catch (e) {
    console.error("[POST /api/cart/:chatId/restore/:id] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/families/:chatId", async (req, res) => {
  try {
    const chatIdNum = parseChatId(req.params.chatId);
    if (chatIdNum === null)
      return res.status(400).json({ error: "Invalid chatId" });

    const cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    res.json({
      families: cart.familyIds || [],
      roles: Object.fromEntries(cart.familyRoles || []),
      activeFamilyId: cart.activeFamilyId || null,
    });
  } catch (e) {
    console.error("[GET /api/families/:chatId] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/cart/:chatId/add", async (req, res) => {
  try {
    const chatIdNum = parseChatId(req.params.chatId);
    if (chatIdNum === null) {
      return res.status(400).json({ error: "Invalid chatId" });
    }

    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ error: "Empty text" });

    let cart = await Cart.findOne({ chatId: chatIdNum });
    if (!cart) {
      cart = new Cart({ chatId: chatIdNum, products: [] });
    }

    const normalized = text.toLowerCase();
    const exists = cart.products.some(
      (p) => p.text.toLowerCase() === normalized
    );

    if (!exists) {
      cart.products.push({ text, bought: false });
      await cart.save();
    }

    res.status(200).json({ products: cart.products });
  } catch (e) {
    console.error("[POST /api/cart/:chatId/add] error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

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

    res.status(200).json({ products: cart.products });
  } catch (e) {
    console.error("[PUT /cart/:chatId/toggle/:id] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.delete("/api/cart/:chatId/remove/:id", async (req, res) => {
  try {
    const chatIdNum = parseChatId(req.params.chatId);
    if (chatIdNum === null) {
      return res.status(400).json({ error: "Invalid chatId" });
    }

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

registerCommands(bot);
registerMainMenu(bot);
registerMessageHandler(bot);
registerCallbackHandler(bot);

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});

export { app, bot };
