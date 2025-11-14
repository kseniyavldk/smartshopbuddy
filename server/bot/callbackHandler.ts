import TelegramBot, { CallbackQuery } from "node-telegram-bot-api";
import Cart, { ICart } from "../models/Cart";
import { escapeMarkdownV2, sendCart } from "./helpers";

export const registerCallbackHandler = (bot: TelegramBot) => {
  bot.on("callback_query", async (query: CallbackQuery) => {
    try {
      if (!query.data || !query.from) return;

      const chatId = query.from.id.toString();
      const userCart: ICart | null = await Cart.findOne({ chatId });
      if (!userCart) return;

      const index = parseInt(query.data.replace("bought_", ""), 10);
      if (isNaN(index) || !userCart.products[index]) return;

      userCart.products[index].bought = !userCart.products[index].bought;
      userCart.products[index].updatedAt = new Date();

      await userCart.save();

      await sendCart(bot, chatId, userCart);

      if (query.id) {
        await bot.answerCallbackQuery(query.id, { text: "Обновлено" });
      }
    } catch (error) {
      console.error("callback handler error", error);
    }
  });
};
