import { Request, Response, NextFunction } from "express";
import { Cart } from "../models/Cart";
import { parseChatId } from "../utils/parseChatId";

export function checkRole(requiredRole: "admin" | "member") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatIdNum = parseChatId(req.params.chatId);
      if (chatIdNum === null)
        return res.status(400).json({ error: "Invalid chatId" });

      const cart = await Cart.findOne({ chatId: chatIdNum });
      if (!cart) return res.status(404).json({ error: "Cart not found" });

      const activeFamilyId = cart.activeFamilyId;
      if (!activeFamilyId)
        return res.status(400).json({ error: "No active family selected" });

      const userRole = cart.familyRoles.get(activeFamilyId) || "member";

      if (requiredRole === "admin" && userRole !== "admin") {
        return res.status(403).json({ error: "Access denied: admin only" });
      }

      req.body.updatedBy = req.body.username || `chat_${chatIdNum}`;

      next();
    } catch (error) {
      console.error("[checkRole] error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
