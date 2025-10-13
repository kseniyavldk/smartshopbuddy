import { Router } from "express";
import { Cart } from "../models/Cart";
import { parseChatId } from "../utils/parseChatId";
import { checkRole } from "../middleware/checkRole";

const router = Router();

router.get("/:chatId", async (req, res) => {
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
    console.error("[GET /families/:chatId] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:chatId/add", checkRole("admin"), async (req, res) => {
  const chatIdNum = parseChatId(req.params.chatId);
  if (!chatIdNum) return res.status(400).json({ error: "Invalid chatId" });

  const { familyId, role } = req.body;
  if (!familyId) return res.status(400).json({ error: "familyId required" });

  let cart = await Cart.findOne({ chatId: chatIdNum });
  if (!cart) cart = new Cart({ chatId: chatIdNum, products: [] });

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

router.put("/:chatId/switch/:familyId", async (req, res) => {
  const chatIdNum = Number(req.params.chatId);
  const { familyId } = req.params;

  if (isNaN(chatIdNum))
    return res.status(400).json({ error: "Invalid chatId" });
  if (!familyId) return res.status(400).json({ error: "familyId required" });

  try {
    const cart = await Cart.findOne({ chatId: req.params.chatId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    if (!cart.familyIds.includes(familyId)) {
      return res
        .status(400)
        .json({ error: "Family not found in user's families" });
    }

    cart.activeFamilyId = familyId;
    await cart.save();

    res.json({ activeFamilyId: cart.activeFamilyId });
  } catch (e) {
    console.error("[PUT /families/:chatId/switch/:familyId] error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
