import TelegramBot, { InlineKeyboardButton, Message } from "node-telegram-bot-api";
import { Cart, IProduct, IFamilyCart } from "../models/Cart";
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

const formatCartMessage = (familyCart: IFamilyCart) => {
  const text =
    familyCart.products
      .map((p) => `${p.bought ? "✅" : "❌"} ${escapeMarkdownV2(p.text)}`)
      .join("\n") || "пусто";

  const keyboard: InlineKeyboardButton[][] = familyCart.products.map((p, i) => [
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
      const { userCart, familyCart } = carts;

      if (!familyCart.products[index]) return;

      familyCart.products[index].bought = !familyCart.products[index].bought;
      await userCart.save();

      await bot.answerCallbackQuery(query.id, { text: "Обновлено" });

      const { text, keyboard } = formatCartMessage(familyCart);
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

  bot.onText(/\/create/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const familyId = generateFamilyId(chatId);
      let userCart = await Cart.findOne({ chatId });

      if (!userCart) {
        userCart = new Cart({ chatId, activeFamilyId: familyId, carts: [] });
      } else {
        userCart.activeFamilyId = familyId;
      }

      const newFamilyCart = userCart.carts.create({
        familyId,
        products: [],
        archivedProducts: [],
      });

      userCart.carts.push(newFamilyCart);
      await userCart.save();

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

  bot.onText(/\/join (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    try {
      const familyId = match?.[1]?.trim();
      if (!familyId)
        return safeSend(bot, chatId, "❗ Укажите код семьи. Пример: /join <код>");

      const existingCart = await Cart.findOne({ "carts.familyId": familyId });
      if (!existingCart)
        return safeSend(bot, chatId, "❌ Семья с таким кодом не найдена.");

      let userCart = await Cart.findOne({ chatId });
      if (!userCart) userCart = new Cart({ chatId, activeFamilyId: familyId, carts: [] });
      else userCart.activeFamilyId = familyId;

      if (!userCart.carts.find((c) => c.familyId === familyId)) {
        const newFamilyCart = userCart.carts.create({
          familyId,
          products: [],
          archivedProducts: [],
        });
        userCart.carts.push(newFamilyCart);
      }

      await userCart.save();
      await safeSend(bot, chatId, `✅ Вы присоединились к семье ${familyId}`);
    } catch (error) {
      console.error("/join handler error", error);
      safeSend(bot, chatId, "❌ Произошла ошибка при присоединении к семье.");
    }
  });

  bot.onText(/\/cart/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const carts = await getUserFamilyCart(chatId);
      if (!carts) return safeSend(bot, chatId, "❗ Сначала создайте или присоединитесь к семье.");

      const { familyCart } = carts;
      const { text, keyboard } = formatCartMessage(familyCart);

      await safeSend(bot, chatId, `🛒 Ваша корзина:\n${text}`, {
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (error) {
      console.error("/cart handler error", error);
      safeSend(bot, chatId, "❌ Произошла ошибка при отображении корзины.");
    }
  });

  bot.onText(/\/remove (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    try {
      const textToRemove = match?.[1]?.trim();
      if (!textToRemove) return safeSend(bot, chatId, "❗ Укажите товар для удаления.");

      const carts = await getUserFamilyCart(chatId);
      if (!carts) return safeSend(bot, chatId, "❗ Сначала создайте или присоединитесь к семье.");

      const { userCart, familyCart } = carts;

      const product = familyCart.products.find(
        (p: IProduct) => p.text.toLowerCase() === textToRemove.toLowerCase()
      );

      if (product) {
        familyCart.products.pull(product._id);
        await userCart.save();
        await sendFamilyCart(bot, userCart.activeFamilyId!, `❌ "${escapeMarkdownV2(textToRemove)}" удален из корзины.`);
      } else {
        await sendFamilyCart(bot, userCart.activeFamilyId!, `ℹ️ Товар "${escapeMarkdownV2(textToRemove)}" не найден.`);
      }
    } catch (error) {
      console.error("/remove handler error", error);
      safeSend(bot, chatId, "❌ Произошла ошибка при удалении товара.");
    }
  });

  bot.onText(/\/clear/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const carts = await getUserFamilyCart(chatId);
      if (!carts) return safeSend(bot, chatId, "❗ Сначала создайте или присоединитесь к семье.");

      const { userCart, familyCart } = carts;

      familyCart.products.splice(0, familyCart.products.length);
      await userCart.save();
      await sendFamilyCart(bot, userCart.activeFamilyId!, "🗑 Корзина очищена.");
    } catch (error) {
      console.error("/clear handler error", error);
      safeSend(bot, chatId, "❌ Произошла ошибка при очистке корзины.");
    }
  });
};
