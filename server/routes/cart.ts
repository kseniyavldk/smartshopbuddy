import { Router } from "express";
import { Cart } from "../models/Cart";
import { parseChatId } from "../utils/parseChatId";

const router = Router();

router.get("/:chatId", async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null)
    return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  res.json({ products: cart.products });
});

router.post("/:chatId/add", async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null)
    return res.status(400).json({ error: "Invalid chatId" });

  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Empty text" });

  let cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) cart = new Cart({ chatId: chatIdNum, products: [] });

  const normalized = text.toLowerCase();
  const exists = cart.products.some((p) => p.text.toLowerCase() === normalized);

  if (!exists) {
    cart.products.push({ text, bought: false });
    await cart.save();
  }

  res.json({ products: cart.products });
});

router.put("/:chatId/toggle/:id", async (req, res) => {
  const chatIdNum = Number(req.params.chatId);
  if (isNaN(chatIdNum))
    return res.status(400).json({ error: "Invalid chatId" });

  const { id } = req.params;
  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const product = cart.products.id(id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  product.bought = !product.bought;
  await cart.save();

  res.json({ products: cart.products });
});

router.delete("/:chatId/remove/:id", async (req, res) => {
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

  res.json({ products: cart.products });
});

router.post("/:chatId/archive/:id", async (req, res) => {
  const chatIdNum = Number(req.params.chatId);
  const { id } = req.params;

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const product = cart.products.id(id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  cart.products.id(id)?.deleteOne();
  cart.archivedProducts.push(product);
  await cart.save();

  res.json({ products: cart.products, archived: cart.archivedProducts });
});

router.get("/:chatId/archive", async (req, res) => {
  const chatIdNum = Number(req.params.chatId);
  if (isNaN(chatIdNum))
    return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  res.json({ archived: cart.archivedProducts });
});

router.post("/:chatId/restore/:id", async (req, res) => {
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
});

export default router;
