import express from "express";
import Cart from "../models/Cart";

const router = express.Router();

router.get("/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { familyId } = req.query;

    let cart = await Cart.findOne({ chatId, familyId: familyId || undefined });
    if (!cart) {
      cart = await Cart.create({
        chatId,
        familyId: familyId as string | undefined,
        products: [],
        archivedProducts: [],
      });
    }

    res.json(cart);
  } catch (err) {
    console.error("GET /cart/:chatId error", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/:chatId/add", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text, username, familyId } = req.body;

    const cart = await Cart.findOneAndUpdate(
      { chatId, familyId: familyId || undefined },
      {
        $push: {
          products: {
            text,
            bought: false,
            updatedBy: username || "anonymous",
            updatedAt: new Date(),
          },
        },
      },
      { new: true, upsert: true }
    );

    res.json(cart);
  } catch (err) {
    console.error("POST /cart/:chatId/add error", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/:chatId/toggle/:id", async (req, res) => {
  try {
    const { chatId, id } = req.params;
    const { familyId } = req.body;

    const cart = await Cart.findOne({
      chatId,
      familyId: familyId || undefined,
    });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const product = cart.products.find((p) => String(p._id) === String(id));
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.bought = !product.bought;
    product.updatedAt = new Date();

    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error("PUT /cart/:chatId/toggle/:id error", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/:chatId/archive/:id", async (req, res) => {
  try {
    const { chatId, id } = req.params;
    const { familyId } = req.body;

    const cart = await Cart.findOne({
      chatId,
      familyId: familyId || undefined,
    });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const index = cart.products.findIndex((p) => String(p._id) === String(id));
    if (index === -1)
      return res.status(404).json({ message: "Product not found" });

    const [product] = cart.products.splice(index, 1);
    product.archivedAt = new Date();
    cart.archivedProducts.push(product);

    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error("POST /cart/:chatId/archive/:id error", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/:chatId/restore/:id", async (req, res) => {
  try {
    const { chatId, id } = req.params;
    const { familyId } = req.body;

    const cart = await Cart.findOne({
      chatId,
      familyId: familyId || undefined,
    });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const index = cart.archivedProducts.findIndex(
      (p) => String(p._id) === String(id)
    );
    if (index === -1)
      return res.status(404).json({ message: "Product not found" });

    const [product] = cart.archivedProducts.splice(index, 1);
    delete product.archivedAt;
    cart.products.push(product);

    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error("POST /cart/:chatId/restore/:id error", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/:chatId/archive", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { familyId } = req.query;

    const cart = await Cart.findOne({
      chatId,
      familyId: familyId || undefined,
    });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    res.json(cart.archivedProducts);
  } catch (err) {
    console.error("GET /cart/:chatId/archive error", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/:chatId/archive/:id", async (req, res) => {
  try {
    const { chatId, id } = req.params;
    const { familyId } = req.body;

    const cart = await Cart.findOne({
      chatId,
      familyId: familyId || undefined,
    });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const index = cart.archivedProducts.findIndex(
      (p) => String(p._id) === String(id)
    );
    if (index === -1)
      return res.status(404).json({ message: "Product not found in archive" });

    cart.archivedProducts.splice(index, 1);
    await cart.save();

    res.json({ message: "Item deleted from archive" });
  } catch (err) {
    console.error("DELETE /cart/:chatId/archive/:id error", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
