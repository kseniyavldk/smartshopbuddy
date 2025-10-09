import TelegramBot, {
  InlineKeyboardButton,
  Message,
} from "node-telegram-bot-api";
import { Types } from "mongoose";
import { Cart, ICart, IProduct } from "../models/Cart";
import {
  escapeMarkdownV2,
  sendFamilyCart,
  generateFamilyId,
  getUserFamilyCart,
} from "./helpers";

const safeSend = async (
  bot: TelegramBot,
  chatId: number,
  text: string,
  opts = {}
): Promise<Message | null> => {
  try {
    return await bot.sendMessage(chatId, escapeMarkdownV2(text), {
      parse_mode: "MarkdownV2",
      ...opts,
    });
  } catch (e) {
    console.error("Telegram send error:", e, text);
    return null;
  }
};

const formatCartMessage = (cart: ICart) => {
  const text =
    cart.products
      .map((p) => `${p.bought ? "✅" : "❌"} ${escapeMarkdownV2(p.text)}`)
      .join("\n") || "пусто";

  const keyboard: InlineKeyboardButton[][] = cart.products.map((p, i) => [
    {
      text: `Купить ${p.text.length > 20 ? p.text.slice(0, 20) + "…" : p.text}`,
      callback_data: `bought_${i}`,
    },
  ]);

  return { text, keyboard };
};

export const registerCommands = (bot: TelegramBot) => {
  // /start и /help
  bot.onText(/\/(start|help)/, (msg) => {
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

      const { text, keyboard } = formatCartMessage(canonicalCart);
      if (query.message?.message_id) {
        await bot.editMessageText(`🛒 Ваша корзина:\n${text}`, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: keyboard },
        });
      }
    } catch (error) {
      console.error("callback_query handler error", error);
    }
  });

  // /create
  bot.onText(/\/create/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const familyId = generateFamilyId(chatId);
      let cart = await Cart.findOne({ chatId });

      if (cart) {
        cart.familyId = familyId;
        cart.products.splice(0, cart.products.length);
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
      safeSend(bot, chatId, "❌ Произошла ошибка при создании семьи.");
    }
  });

  // /join
  bot.onText(/\/join (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    try {
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
      safeSend(bot, chatId, "❌ Произошла ошибка при присоединении к семье.");
    }
  });

  // /cart
  bot.onText(/\/cart/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const carts = await getUserFamilyCart(chatId);
      if (!carts)
        return safeSend(
          bot,
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );

      const { canonicalCart } = carts;
      const { text, keyboard } = formatCartMessage(canonicalCart);

      await safeSend(bot, chatId, `🛒 Ваша корзина:\n${text}`, {
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (error) {
      console.error("/cart handler error", error);
      safeSend(bot, chatId, "❌ Произошла ошибка при отображении корзины.");
    }
  });

  // /remove
  bot.onText(/\/remove (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    try {
      const textToRemove = match?.[1]?.trim();
      if (!textToRemove)
        return safeSend(bot, chatId, "❗ Укажите товар для удаления.");

      const carts = await getUserFamilyCart(chatId);
      if (!carts)
        return safeSend(
          bot,
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );

      const { userCart, canonicalCart } = carts;

      if (!userCart.familyId) return;

      const product = canonicalCart.products.find(
        (p: Types.Subdocument<unknown, any, IProduct> & IProduct) =>
          p.text.toLowerCase() === textToRemove.toLowerCase()
      );

      if (product) {
        canonicalCart.products.pull(product._id);
        await canonicalCart.save();
        await sendFamilyCart(
          bot,
          userCart.familyId,
          `❌ "${escapeMarkdownV2(textToRemove)}" удален из корзины.`
        );
      } else {
        await sendFamilyCart(
          bot,
          userCart.familyId,
          `ℹ️ Товар "${escapeMarkdownV2(textToRemove)}" не найден.`
        );
      }
    } catch (error) {
      console.error("/remove handler error", error);
      safeSend(bot, chatId, "❌ Произошла ошибка при удалении товара.");
    }
  });

  // /clear
  bot.onText(/\/clear/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const carts = await getUserFamilyCart(chatId);
      if (!carts)
        return safeSend(
          bot,
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );

      const { userCart, canonicalCart } = carts;

      if (!userCart.familyId) return;

      canonicalCart.products.splice(0, canonicalCart.products.length);
      await canonicalCart.save();
      await sendFamilyCart(bot, userCart.familyId, "🗑 Корзина очищена.");
    } catch (error) {
      console.error("/clear handler error", error);
      safeSend(bot, chatId, "❌ Произошла ошибка при очистке корзины.");
    }
  });
};
