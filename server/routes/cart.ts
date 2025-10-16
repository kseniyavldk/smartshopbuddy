import { Router } from "express";
import { Cart, IProduct, IFamilyCart } from "../models/Cart";
import { parseChatId } from "../utils/parseChatId";
import { checkRole } from "../middleware/checkRole";

const router = Router();

router.get("/:chatId", async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null)
    return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find((c) => c.familyId === activeFamilyId);
  if (!familyCart)
    return res.status(404).json({ error: "Family cart not found" });

  res.json({ products: familyCart.products, activeFamilyId });
});

router.post("/:chatId/add", checkRole("member"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null)
    return res.status(400).json({ error: "Invalid chatId" });

  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Empty text" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  if (!activeFamilyId)
    return res.status(400).json({ error: "No active family" });

  let familyCart = cart.carts.find((c) => c.familyId === activeFamilyId);

  if (!familyCart) {
    familyCart = cart.carts.create({
      familyId: activeFamilyId,
      products: [],
      archivedProducts: [],
    });
    cart.carts.push(familyCart);
  }

  const normalized = text.toLowerCase();
  const exists = familyCart.products.some(
    (p) => p.text.toLowerCase() === normalized
  );

  if (!exists) {
    const newProduct = familyCart.products.create({
      text,
      bought: false,
      updatedBy: req.body.updatedBy,
    });
    familyCart.products.push(newProduct);
    await cart.save();
  }

  res.json({ products: familyCart.products });
});

router.put("/:chatId/toggle/:id", checkRole("member"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null)
    return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find((c) => c.familyId === activeFamilyId);
  if (!familyCart)
    return res.status(404).json({ error: "Family cart not found" });

  const product = familyCart.products.id(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  product.bought = !product.bought;
  product.updatedBy = req.body.updatedBy;
  await cart.save();

  res.json({ products: familyCart.products });
});

router.delete("/:chatId/remove/:id", checkRole("admin"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null)
    return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find((c) => c.familyId === activeFamilyId);
  if (!familyCart)
    return res.status(404).json({ error: "Family cart not found" });

  const product = familyCart.products.id(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  product.updatedBy = req.body.updatedBy;
  await cart.save();
  product.deleteOne();
  await cart.save();

  res.json({ products: familyCart.products });
});

router.post("/:chatId/archive/:id", checkRole("admin"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null)
    return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find((c) => c.familyId === activeFamilyId);
  if (!familyCart)
    return res.status(404).json({ error: "Family cart not found" });

  const product = familyCart.products.id(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  product.updatedBy = req.body.updatedBy;
  await cart.save();

  familyCart.products.id(req.params.id)?.deleteOne();
  familyCart.archivedProducts.push(product);
  await cart.save();

  res.json({
    products: familyCart.products,
    archived: familyCart.archivedProducts,
  });
});

router.get("/:chatId/archive", async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null)
    return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find((c) => c.familyId === activeFamilyId);
  if (!familyCart)
    return res.status(404).json({ error: "Family cart not found" });

  res.json({ archived: familyCart.archivedProducts });
});

router.post("/:chatId/restore/:id", checkRole("admin"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null)
    return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find((c) => c.familyId === activeFamilyId);
  if (!familyCart)
    return res.status(404).json({ error: "Family cart not found" });

  const product = familyCart.archivedProducts.id(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const restoredProduct = familyCart.products.create({
    text: product.text,
    bought: false,
    updatedBy: req.body.updatedBy,
  });
  familyCart.products.push(restoredProduct);
  product.deleteOne();
  await cart.save();

  res.json({
    products: familyCart.products,
    archived: familyCart.archivedProducts,
  });
});

export default router;
