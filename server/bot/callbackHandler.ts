import TelegramBot, { CallbackQuery } from "node-telegram-bot-api";
import { Cart } from "../models/Cart";
import { escapeMarkdownV2, sendFamilyCart } from "./helpers";

export const registerCallbackHandler = (bot: TelegramBot) => {
  bot.on("callback_query", async (query: CallbackQuery) => {
    try {
      if (!query.data || !query.from) return;

      const chatId = query.from.id;
      const userCart = await Cart.findOne({ chatId });

      if (!userCart || !userCart.activeFamilyId) return;

      const familyId = userCart.activeFamilyId;

      const familyCart = userCart.carts.find(
        (c) => c.familyId === familyId
      );
      if (!familyCart) return;

      const index = parseInt(query.data.replace("bought_", ""));
      if (isNaN(index) || !familyCart.products[index]) return;

      familyCart.products[index].bought = true;

      await userCart.save();

      const cartText = familyCart.products
        .map((p) => `${p.bought ? "✅" : "❌"} ${p.text}`)
        .join("\n");

      await sendFamilyCart(
        bot,
        familyId,
        `🛒 "${escapeMarkdownV2(
          familyCart.products[index].text
        )}" отмечен как купленный.\n\nТекущий список:\n${escapeMarkdownV2(
          cartText
        )}`
      );

      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error("callback handler error", error);
    }
  });
};
