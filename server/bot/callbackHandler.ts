import TelegramBot, { CallbackQuery } from "node-telegram-bot-api";
import { Cart } from "../models/Cart";
import { escapeMarkdownV2, sendFamilyCart } from "./helpers";

export const registerCallbackHandler = (bot: TelegramBot) => {
  bot.on("callback_query", async (query: CallbackQuery) => {
    try {
      if (!query.data || !query.from) return;
      const chatId = query.from.id;
      const userCart = await Cart.findOne({ chatId });
      if (!userCart || !userCart.familyId) return;

      const canonicalCart = await Cart.findOne({
        familyId: userCart.familyId,
      }).sort({ createdAt: 1 });
      if (!canonicalCart) return;

      const index = parseInt(query.data.replace("bought_", ""));
      if (canonicalCart.products[index]) {
        canonicalCart.products[index].bought = true;
        await canonicalCart.save();

        const cartText = canonicalCart.products
          .map((p) => `${p.bought ? "✅" : "❌"} ${p.text}`)
          .join("\n");
        await sendFamilyCart(
          bot,
          userCart.familyId,
          `🛒 "${escapeMarkdownV2(
            canonicalCart.products[index].text
          )}" отмечен как купленный.\n\nТекущий список:\n${escapeMarkdownV2(
            cartText
          )}`
        );
      }

      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error("callback handler error", error);
    }
  });
};
