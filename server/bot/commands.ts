import TelegramBot, {
  InlineKeyboardButton,
  Message,
} from "node-telegram-bot-api";
import { Cart } from "../models/Cart";
import {
  escapeMarkdownV2,
  sendFamilyCart,
  generateFamilyId,
  getUserFamilyCart,
} from "./helpers";

// безопасная отправка сообщений
const safeSend = async (
  bot: TelegramBot,
  chatId: number,
  text: string,
  opts = {}
) => {
  try {
    return await bot.sendMessage(chatId, escapeMarkdownV2(text), {
      parse_mode: "MarkdownV2",
      ...opts,
    });
  } catch (e) {
    console.error("Telegram send error:", e, text);
  }
};

export const registerCommands = (bot: TelegramBot) => {
  // /start и /help
  bot.onText(/\/(start|help)/, (msg: Message) => {
    const chatId = msg.chat.id;
    const helpText = `
Привет! Я SmartShopBuddy 🛒
Команды:
/create - Создать семью
/join <код> - Присоединиться к семье
/cart - Показать корзину
/remove <товар> - Удалить товар
/clear - Очистить корзину
Добавляйте товары просто написав их в сообщении.
`;
    safeSend(bot, chatId, helpText);
  });

  // callback для кнопки "Купить"
  bot.on("callback_query", async (query) => {
    try {
      const data = query.data || "";
      if (!data.startsWith("bought_")) return;

      const index = parseInt(data.replace("bought_", ""), 10);
      const chatId = query.message?.chat?.id;
      if (Number.isNaN(index) || chatId == null) return;

      const carts = await getUserFamilyCart(chatId);
      if (!carts) return;

      const { canonicalCart } = carts;
      if (!canonicalCart.products[index]) return;

      canonicalCart.products[index].bought =
        !canonicalCart.products[index].bought;
      await canonicalCart.save();

      await bot.answerCallbackQuery(query.id, { text: "Обновлено" });

      const cartText =
        canonicalCart.products
          .map((p) => `${p.bought ? "✅" : "❌"} ${escapeMarkdownV2(p.text)}`)
          .join("\n") || "пусто";

      const inlineKeyboard: InlineKeyboardButton[][] =
        canonicalCart.products.map((p, i) => [
          {
            text: `Купить ${
              p.text.length > 20 ? p.text.slice(0, 20) + "…" : p.text
            }`,
            callback_data: `bought_${i}`,
          },
        ]);

      if (query.message?.message_id) {
        await bot.editMessageText(`🛒 Ваша корзина:\n${cartText}`, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: inlineKeyboard },
        });
      }
    } catch (error) {
      console.error("callback_query handler error", error);
    }
  });

  // /create
  bot.onText(/\/create/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const familyId = generateFamilyId(chatId);

      let cart = await Cart.findOne({ chatId });
      if (cart) {
        cart.familyId = familyId;
        cart.products = [];
      } else {
        cart = new Cart({ chatId, familyId, products: [] });
      }
      await cart.save();

      await safeSend(
        bot,
        chatId,
        `🎉 Семья создана!\nКод для присоединения: *${familyId}*`
      );
    } catch (error) {
      console.error("/create handler error", error);
      safeSend(bot, msg.chat.id, "❌ Произошла ошибка при создании семьи.");
    }
  });

  // /join <код>
  bot.onText(/\/join (.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      const familyId = match?.[1]?.trim();
      if (!familyId)
        return safeSend(
          bot,
          chatId,
          "❗ Укажите код семьи. Пример: /join <код>"
        );

      const familyCart = await Cart.findOne({ familyId });
      if (!familyCart)
        return safeSend(bot, chatId, "❌ Семья с таким кодом не найдена.");

      let userCart = await Cart.findOne({ chatId });
      if (!userCart) userCart = new Cart({ chatId, familyId, products: [] });
      else userCart.familyId = familyId;

      await userCart.save();
      await safeSend(bot, chatId, `✅ Вы присоединились к семье ${familyId}`);
    } catch (error) {
      console.error("/join handler error", error);
      safeSend(
        bot,
        msg.chat.id,
        "❌ Произошла ошибка при присоединении к семье."
      );
    }
  });

  // /cart
  bot.onText(/\/cart/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const carts = await getUserFamilyCart(chatId);
      if (!carts)
        return bot.sendMessage(
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );
      const { canonicalCart } = carts;

      const cartText =
        canonicalCart.products
          .map((p) => `${p.bought ? "✅" : "❌"} ${escapeMarkdownV2(p.text)}`)
          .join("\n") || "пусто";

      const inlineKeyboard: InlineKeyboardButton[][] =
        canonicalCart.products.map((p, i) => [
          {
            text: `Купить ${
              p.text.length > 20 ? p.text.slice(0, 20) + "…" : p.text
            }`,
            callback_data: `bought_${i}`,
          },
        ]);

      bot.sendMessage(chatId, `🛒 Ваша корзина:\n${cartText}`, {
        parse_mode: "MarkdownV2",
        reply_markup: { inline_keyboard: inlineKeyboard },
      });
    } catch (error) {
      console.error("/cart handler error", error);
      bot.sendMessage(
        msg.chat.id,
        "❌ Произошла ошибка при отображении корзины."
      );
    }
  });

  // /remove <товар>
  bot.onText(/\/remove (.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      const textToRemove = match?.[1]?.trim();
      if (!textToRemove)
        return bot.sendMessage(chatId, "❗ Укажите товар для удаления.");

      const carts = await getUserFamilyCart(chatId);
      if (!carts)
        return bot.sendMessage(
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );
      const { userCart, canonicalCart } = carts;

      const before = canonicalCart.products.length;
      canonicalCart.products = canonicalCart.products.filter(
        (p) => p.text.toLowerCase() !== textToRemove.toLowerCase()
      );
      const removed = before - canonicalCart.products.length;
      await canonicalCart.save();

      await sendFamilyCart(
        bot,
        userCart.familyId,
        removed > 0
          ? `❌ "${escapeMarkdownV2(textToRemove)}" удален из корзины.`
          : `ℹ️ Товар "${escapeMarkdownV2(textToRemove)}" не найден.`
      );
    } catch (error) {
      console.error("/remove handler error", error);
      bot.sendMessage(msg.chat.id, "❌ Произошла ошибка при удалении товара.");
    }
  });

  // /clear
  bot.onText(/\/clear/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const carts = await getUserFamilyCart(chatId);
      if (!carts)
        return bot.sendMessage(
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );
      const { userCart, canonicalCart } = carts;

      canonicalCart.products = [];
      await canonicalCart.save();
      await sendFamilyCart(bot, userCart.familyId, "🗑 Корзина очищена.");
    } catch (error) {
      console.error("/clear handler error", error);
      bot.sendMessage(msg.chat.id, "❌ Произошла ошибка при очистке корзины.");
    }
  });

  bot.on("message", async (msg) => {
    try {
      if (!msg.text || msg.text.startsWith("/")) return;
      const text = msg.text.trim();
      if (!text) return;

      const chatId = msg.chat.id;
      const carts = await getUserFamilyCart(chatId);
      if (!carts)
        return bot.sendMessage(
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );
      const { userCart, canonicalCart } = carts;

      const exists = canonicalCart.products.some(
        (p) => p.text.toLowerCase() === text.toLowerCase()
      );
      if (exists)
        return bot.sendMessage(
          chatId,
          `ℹ️ Товар уже в корзине: ${escapeMarkdownV2(text)}`,
          { parse_mode: "MarkdownV2" }
        );

      canonicalCart.products.push({ text, bought: false });
      await canonicalCart.save();

      await sendFamilyCart(
        bot,
        userCart.familyId,
        `➕ Добавлено: "${escapeMarkdownV2(text)}"`
      );
    } catch (error) {
      console.error("message add item handler error", error);
    }
  });
};
