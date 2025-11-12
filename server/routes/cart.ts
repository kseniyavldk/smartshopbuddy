import express from "express";
import Cart from "../models/Cart";

const router = express.Router();

router.get("/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;
    let cart = await Cart.findOne({ chatId });

    if (!cart) {
      cart = await Cart.create({ chatId, products: [], archivedProducts: [] });
    }

    res.json(cart);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

router.post("/:chatId/add", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text, username } = req.body;

    const cart = await Cart.findOneAndUpdate(
      { chatId },
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
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

router.put("/:chatId/toggle/:id", async (req, res) => {
  try {
    const { chatId, id } = req.params;
    const cart = await Cart.findOne({ chatId });
    if (!cart) return res.status(404).send("Cart not found");

    const product = cart.products.find((p) => p._id?.toString() === id);
    if (product) {
      product.bought = !product.bought;
      product.updatedAt = new Date();
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

router.post("/:chatId/archive/:id", async (req, res) => {
  try {
    const { chatId, id } = req.params;
    const cart = await Cart.findOne({ chatId });
    if (!cart) return res.status(404).send("Cart not found");

    const productIndex = cart.products.findIndex(
      (p) => p._id?.toString() === id
    );
    if (productIndex === -1) return res.status(404).send("Product not found");

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


    res.json(cart);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:chatId/archive/:id", async (req, res) => {
  try {
    const { chatId, id } = req.params;
    const cart = await Cart.findOne({ chatId });
    if (!cart) return res.status(404).send("Cart not found");

    cart.archivedProducts = cart.archivedProducts.filter(
      (p) => p._id?.toString() !== id
    );

    await cart.save();
    res.json(cart);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

router.post("/:chatId/restore/:id", async (req, res) => {
  try {
    const { chatId, id } = req.params;
    const cart = await Cart.findOne({ chatId });
    if (!cart) return res.status(404).send("Cart not found");

    const archivedIndex = cart.archivedProducts.findIndex(
      (p) => p._id?.toString() === id
    );
    if (archivedIndex === -1) return res.status(404).send("Product not found");

    const product = cart.archivedProducts[archivedIndex];
    cart.products.push(product);
    cart.archivedProducts.splice(archivedIndex, 1);

    await cart.save();
    res.json(cart);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

router.get("/:chatId/archive", async (req, res) => {
  try {
    const { chatId } = req.params;
    const cart = await Cart.findOne({ chatId });
    if (!cart) return res.status(404).send("Cart not found");

    res.json(cart.archivedProducts);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
