import TelegramBot, { Message } from "node-telegram-bot-api";
import { Cart } from "../models/Cart";
import { escapeMarkdownV2, sendFamilyCart } from "./helpers";

export const registerMessageHandler = (bot: TelegramBot) => {
  bot.on("message", async (msg: Message) => {
    try {
      const chatId = msg.chat.id;
      const text = msg.text?.trim();
      if (!text || text.startsWith("/")) return;

      const userCart = await Cart.findOne({ chatId });
      if (!userCart || !userCart.familyId)
        return bot.sendMessage(
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );

      const canonicalCart = await Cart.findOne({
        familyId: userCart.familyId,
      }).sort({ createdAt: 1 });
      if (!canonicalCart)
        return bot.sendMessage(chatId, "❌ Не удалось найти семейную корзину.");

      const exists = canonicalCart.products.some(
        (p) => p.text.toLowerCase() === text.toLowerCase()
      );
      if (exists) {
        return bot.sendMessage(
          chatId,
          `ℹ️ Товар уже в корзине: ${escapeMarkdownV2(text)}`,
          { parse_mode: "MarkdownV2" }
        );
      }

      canonicalCart.products.push({ text, bought: false });
      await canonicalCart.save();

      const cartText = canonicalCart.products
        .map((p) => `${p.bought ? "✅" : "❌"} ${p.text}`)
        .join("\n");

      await sendFamilyCart(
        bot,
        userCart.familyId,
        `✅ "${escapeMarkdownV2(
          text
        )}" добавлен в корзину.\n\nТекущий список:\n${escapeMarkdownV2(
          cartText
        )}`
      );
    } catch (error) {
      console.error("message handler error", error);
      bot.sendMessage(
        msg.chat.id,
        "❌ Произошла ошибка при добавлении товара."
      );
    }
  });
};
