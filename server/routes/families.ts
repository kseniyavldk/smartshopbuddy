import { Router } from "express";
import Cart from "../models/Cart";
import { checkRole } from "../middleware/checkRole";

const router = Router();

router.get("/:chatId", async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const carts = await Cart.find({ chatId }).lean();

    res.json({
      families: carts.map((c) => ({ familyId: c.familyId, id: c._id })) || [],
      activeFamilyId: null,
    });
  } catch (err) {
    console.error("GET /families/:chatId error", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:chatId/add", checkRole("admin"), async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const { familyId } = req.body;
    if (!familyId) return res.status(400).json({ error: "familyId required" });

    let cart = await Cart.findOne({ chatId, familyId });
    if (!cart) {
      cart = new Cart({ chatId, familyId, products: [], archivedProducts: [] });
      await cart.save();
    }

    res.json(cart);
  } catch (err) {
    console.error("POST /families/:chatId/add error", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:chatId/switch/:familyId", async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const { familyId } = req.params;
    if (!familyId) return res.status(400).json({ error: "familyId required" });

    const cart = await Cart.findOne({ chatId, familyId });
    if (!cart) return res.status(404).json({ error: "Family not found" });

    res.json({ activeFamilyId: familyId });
  } catch (err) {
    console.error("PUT /families/:chatId/switch/:familyId error", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete(
  "/:chatId/remove/:itemId",
  checkRole("admin"),
  async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const { itemId } = req.params;

      const cart = await Cart.findOne({ chatId });
      if (!cart) return res.status(404).json({ error: "Cart not found" });

      await Cart.findByIdAndDelete(itemId);
      await cart.updateOne({ $pull: { products: { _id: itemId } } });

      const updated = await Cart.findById(cart._id);
      res.json(updated);
    } catch (err) {
      console.error("DELETE /families/:chatId/remove/:itemId error", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/:chatId/archive/:itemId",
  checkRole("admin"),
  async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const { itemId } = req.params;

      const cart = await Cart.findOne({ chatId });
      if (!cart) return res.status(404).json({ error: "Cart not found" });

      const productIndex = cart.products.findIndex(
        (p) => p._id?.toString() === itemId
      );
      if (productIndex === -1)
        return res.status(404).json({ error: "Item not found" });

      const product = cart.products[productIndex];
      cart.archivedProducts.push({
        _id: product._id,
        text: product.text,
        bought: product.bought,
        updatedBy: product.updatedBy,
        updatedAt: product.updatedAt,
        archivedAt: new Date(),
      });

      cart.products.splice(productIndex, 1);
      await cart.save();

      res.json({ message: "Item archived", product });
    } catch (err) {
      console.error("POST /families/:chatId/archive/:itemId error", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.delete(
  "/:chatId/archive/:itemId",
  checkRole("admin"),
  async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const { itemId } = req.params;

      const cart = await Cart.findOne({ chatId });
      if (!cart) return res.status(404).json({ error: "Cart not found" });

      const archivedIndex = cart.archivedProducts.findIndex(
        (p) => p._id?.toString() === itemId
      );
      if (archivedIndex === -1)
        return res.status(404).json({ error: "Item not found in archive" });

      cart.archivedProducts.splice(archivedIndex, 1);
      await cart.save();

      res.json({ message: "Item deleted from archive" });
    } catch (err) {
      console.error("DELETE /families/:chatId/archive/:itemId error", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.get("/:chatId/items", async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const carts = await Cart.find({ chatId });
    res.json(carts);
  } catch (err) {
    console.error("GET /families/:chatId/items error", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
