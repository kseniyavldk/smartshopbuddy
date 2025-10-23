import { Router } from "express";
import { Cart, IFamilyCart, IProduct } from "../models/Cart";
import { parseChatId } from "../utils/parseChatId";
import { checkRole } from "../middleware/checkRole";

const router = Router();

router.get("/:chatId", async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null) return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  res.json({
    families: cart.familyIds || [],
    roles: Object.fromEntries(cart.familyRoles || []),
    activeFamilyId: cart.activeFamilyId || null,
  });
});

router.post("/:chatId/add", checkRole("admin"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null) return res.status(400).json({ error: "Invalid chatId" });

  const { familyId, role } = req.body;
  if (!familyId) return res.status(400).json({ error: "familyId required" });

  let cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) cart = new Cart({ chatId: chatIdNum, products: [], familyIds: [], familyRoles: {}, activeFamilyId: null });

  if (!cart.familyIds.includes(familyId)) {
    cart.familyIds.push(familyId);
    cart.familyRoles.set(familyId, role || "member");
    if (!cart.activeFamilyId) cart.activeFamilyId = familyId;
    await cart.save();
  }

  res.json({
    families: cart.familyIds,
    roles: Object.fromEntries(cart.familyRoles),
    activeFamilyId: cart.activeFamilyId,
  });
});

router.put("/:chatId/toggle/:id", checkRole("member"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null) return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find(c => c.familyId === activeFamilyId);
  if (!familyCart) return res.status(404).json({ error: "Family cart not found" });

  const product = familyCart.products.id(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  product.bought = !product.bought;
  product.updatedBy = req.body.updatedBy || "";
  await cart.save();

  res.json({ products: familyCart.products });
});

router.put("/:chatId/switch/:familyId", async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null) return res.status(400).json({ error: "Invalid chatId" });

  const { familyId } = req.params;
  if (!familyId) return res.status(400).json({ error: "familyId required" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  if (!cart.familyIds.includes(familyId)) {
    return res.status(400).json({ error: "Family not found in user's families" });
  }

  cart.activeFamilyId = familyId;
  await cart.save();

  res.json({ activeFamilyId: cart.activeFamilyId });
});

router.delete("/:chatId/remove/:id", checkRole("admin"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null) return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find(c => c.familyId === activeFamilyId);
  if (!familyCart) return res.status(404).json({ error: "Family cart not found" });

  const product = familyCart.products.id(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  product.deleteOne();
  await cart.save();

  res.json({ products: familyCart.products });
});

router.post("/:chatId/archive/:id", checkRole("admin"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null) return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find(c => c.familyId === activeFamilyId);
  if (!familyCart) return res.status(404).json({ error: "Family cart not found" });

  const product = familyCart.products.id(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const archivedProduct = familyCart.products.id(req.params.id) as IProduct;
  archivedProduct.deleteOne();
  familyCart.archivedProducts.push(archivedProduct);
  await cart.save();

  res.json({
    products: familyCart.products,
    archived: familyCart.archivedProducts,
  });
});

router.get("/:chatId/archive", async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null) return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find(c => c.familyId === activeFamilyId);
  if (!familyCart) return res.status(404).json({ error: "Family cart not found" });

  res.json({ archived: familyCart.archivedProducts });
});

router.post("/:chatId/restore/:id", checkRole("admin"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (chatIdNum === null) return res.status(400).json({ error: "Invalid chatId" });

  const cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  const activeFamilyId = cart.activeFamilyId;
  const familyCart = cart.carts.find(c => c.familyId === activeFamilyId);
  if (!familyCart) return res.status(404).json({ error: "Family cart not found" });

  const archivedProduct = familyCart.archivedProducts.id(req.params.id);
  if (!archivedProduct) return res.status(404).json({ error: "Product not found" });

  const restoredProduct = familyCart.products.create({
    text: archivedProduct.text,
    bought: false,
    updatedBy: req.body.updatedBy || "",
  });
  familyCart.products.push(restoredProduct);
  archivedProduct.deleteOne();

  await cart.save();

  res.json({
    products: familyCart.products,
    archived: familyCart.archivedProducts,
  });
});

export default router;
