import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { getUserFamilyCart, escapeMarkdownV2, sendFamilyCart } from "./helpers";

export const registerMainMenu = (bot: TelegramBot) => {
  const mainMenuKeyboard: InlineKeyboardButton[][] = [
    [{ text: "🛒 Показать корзину", callback_data: "menu_cart" }],
    [{ text: "➕ Добавить товар", callback_data: "menu_add" }],
    [{ text: "🗑 Очистить корзину", callback_data: "menu_clear" }],
    [{ text: "❌ Удалить товар", callback_data: "menu_remove" }],
  ];

  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, "Выберите действие:", {
      reply_markup: { inline_keyboard: mainMenuKeyboard },
    });
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    switch (query.data) {
      case "menu_cart": {
        const carts = await getUserFamilyCart(chatId);
        if (!carts) {
          await bot.answerCallbackQuery(query.id, {
            text: "Сначала создайте или присоединитесь к семье",
          });
          return;
        }
        const { canonicalCart } = carts;
        const cartText =
          canonicalCart.products
            .map((p) => `${p.bought ? "✅" : "❌"} ${escapeMarkdownV2(p.text)}`)
            .join("\n") || "пусто";
        await bot.sendMessage(chatId, `🛒 Ваша корзина:\n${cartText}`, {
          parse_mode: "MarkdownV2",
        });
        await bot.answerCallbackQuery(query.id);
        break;
      }
      case "menu_add":
        await bot.sendMessage(
          chatId,
          "Напишите товар, который хотите добавить:"
        );
        await bot.answerCallbackQuery(query.id);
        break;
      case "menu_clear":
        const carts = await getUserFamilyCart(chatId);
        if (!carts) return;
        const { userCart, canonicalCart } = carts;
        canonicalCart.products = [];
        await canonicalCart.save();
        await sendFamilyCart(bot, userCart.familyId, "🗑 Корзина очищена.");
        await bot.answerCallbackQuery(query.id);
        break;
      case "menu_remove":
        await bot.sendMessage(
          chatId,
          "Напишите товар, который хотите удалить:"
        );
        await bot.answerCallbackQuery(query.id);
        break;
    }
  });
};
