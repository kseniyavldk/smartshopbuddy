import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { Cart } from "../models/Cart";
import { escapeMarkdownV2, sendFamilyCart } from "./helpers";

export const registerMainMenu = (bot: TelegramBot) => {
  const mainMenuKeyboard: InlineKeyboardButton[][] = [
    [{ text: "🛒 Показать корзину", callback_data: "menu_cart" }],
    [{ text: "➕ Добавить товар", callback_data: "menu_add" }],
    [{ text: "🗑 Очистить корзину", callback_data: "menu_clear" }],
    [{ text: "❌ Удалить товар", callback_data: "menu_remove" }],
    [
      {
        text: "🌐 Открыть приложение",
        web_app: { url: "https://smartshopbuddy.onrender.com/" },
      },
    ],
  ];

  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, "Выберите действие:", {
      reply_markup: { inline_keyboard: mainMenuKeyboard },
    });
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId || !query.data) return;

    const userCart = await Cart.findOne({ chatId });
    if (!userCart || !userCart.activeFamilyId) {
      await bot.answerCallbackQuery(query.id, {
        text: "❗ Сначала создайте или присоединитесь к семье.",
      });
      return;
    }

    const familyId = userCart.activeFamilyId;
    const familyCart = userCart.carts.find((c) => c.familyId === familyId);

    switch (query.data) {
      case "menu_cart": {
        if (!familyCart) {
          await bot.answerCallbackQuery(query.id, {
            text: "❌ Семейная корзина не найдена.",
          });
          return;
        }

        const cartText =
          familyCart.products.length > 0
            ? familyCart.products
                .map(
                  (p) => `${p.bought ? "✅" : "❌"} ${escapeMarkdownV2(p.text)}`
                )
                .join("\n")
            : "пусто";

        await bot.sendMessage(chatId, `🛒 Ваша корзина:\n${cartText}`, {
          parse_mode: "MarkdownV2",
        });
        await bot.answerCallbackQuery(query.id);
        break;
      }

      case "menu_add":
        await bot.sendMessage(
          chatId,
          "✏️ Напишите товар, который хотите добавить:"
        );
        await bot.answerCallbackQuery(query.id);
        break;

      case "menu_clear": {
        if (!familyCart) {
          await bot.answerCallbackQuery(query.id, {
            text: "❌ Семейная корзина не найдена.",
          });
          return;
        }

        familyCart.products.splice(0, familyCart.products.length);
        await userCart.save();

        await sendFamilyCart(bot, familyId, "🗑 Корзина очищена.");
        await bot.answerCallbackQuery(query.id);
        break;
      }

      case "menu_remove":
        await bot.sendMessage(
          chatId,
          "🗑 Напишите товар, который хотите удалить:"
        );
        await bot.answerCallbackQuery(query.id);
        break;
    }
  });
};
