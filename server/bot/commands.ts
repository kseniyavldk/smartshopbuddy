import TelegramBot, {
  InlineKeyboardButton,
  Message,
} from "node-telegram-bot-api";
import Cart, { IProduct } from "../models/Cart";
import {
  escapeMarkdownV2,
  sendCart,
  getUserCart,
  generateFamilyId,
} from "./helpers";

const safeSend = async (
  bot: TelegramBot,
  chatId: number,
  text: string,
  opts: Record<string, unknown> = {}
): Promise<Message | null> => {
  try {
    return await bot.sendMessage(chatId, escapeMarkdownV2(text), {
      parse_mode: "MarkdownV2",
      ...opts,
    });
  } catch (err) {
    console.error("Telegram send error:", err, text);
    return null;
  }
};

const formatCartMessage = (products: IProduct[]) => {
  const text =
    products
      .map((p) => `${p.bought ? "✅" : "❌"} ${escapeMarkdownV2(p.text)}`)
      .join("\n") || "пусто";

  const keyboard: InlineKeyboardButton[][] = products.map((p, i) => [
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

  // callback "купить"
  bot.on("callback_query", async (query) => {
    try {
      if (!query.data?.startsWith("bought_") || !query.message?.chat?.id)
        return;

      const chatId = query.message.chat.id;
      const index = parseInt(query.data.replace("bought_", ""), 10);
      if (Number.isNaN(index)) return;

      const cart = await getUserCart(chatId.toString());
      if (!cart) return;

      const product = cart.products[index];
      if (!product) return;

      product.bought = !product.bought;
      product.updatedAt = new Date();
      await cart.save();

      await bot.answerCallbackQuery(query.id, { text: "Обновлено" });

      const { text, keyboard } = formatCartMessage(cart.products);
      if (query.message.message_id) {
        await bot.editMessageText(`🛒 Ваша корзина:\n${text}`, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: keyboard },
        });
      }
    } catch (err) {
      console.error("callback_query handler error", err);
    }
  });

  // /create — создать семью
  bot.onText(/\/create/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const familyId = generateFamilyId(chatId);
      let cart = await getUserCart(chatId.toString());

      if (!cart) {
        cart = new Cart({
          chatId: chatId.toString(),
          familyId,
          activeFamilyId: familyId,
          products: [],
          archivedProducts: [],
          familyRoles: new Map([[familyId, "admin"]]),
        });
      } else {
        cart.familyId = familyId;
        cart.activeFamilyId = familyId;
        cart.familyRoles?.set(familyId, "admin");
      }

      await cart.save();
      await safeSend(
        bot,
        chatId,
        `🎉 Семья создана!\nКод для присоединения: *${familyId}*`
      );
    } catch (err) {
      console.error("/create handler error", err);
      safeSend(bot, chatId, "❌ Произошла ошибка при создании семьи.");
    }
  });

  // /join — присоединиться к семье
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

      const existingCart = await Cart.findOne({ familyId });
      if (!existingCart)
        return safeSend(bot, chatId, "❌ Семья с таким кодом не найдена.");

      let cart = await getUserCart(chatId.toString());
      if (!cart) {
        cart = new Cart({
          chatId: chatId.toString(),
          familyId,
          activeFamilyId: familyId,
          products: [],
          archivedProducts: [],
          familyRoles: new Map([[familyId, "member"]]),
        });
      } else {
        cart.activeFamilyId = familyId;
        cart.familyRoles?.set(familyId, "member");
      }

      await cart.save();
      await safeSend(bot, chatId, `✅ Вы присоединились к семье ${familyId}`);
    } catch (err) {
      console.error("/join handler error", err);
      safeSend(bot, chatId, "❌ Произошла ошибка при присоединении к семье.");
    }
  });

  // /cart — показать корзину
  bot.onText(/\/cart/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const cart = await getUserCart(chatId.toString());
      if (!cart)
        return safeSend(
          bot,
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );

      const { text, keyboard } = formatCartMessage(cart.products);
      await safeSend(bot, chatId, `🛒 Ваша корзина:\n${text}`, {
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (err) {
      console.error("/cart handler error", err);
      safeSend(bot, chatId, "❌ Произошла ошибка при отображении корзины.");
    }
  });

  // /remove <товар>
  bot.onText(/\/remove (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    try {
      const textToRemove = match?.[1]?.trim();
      if (!textToRemove)
        return safeSend(bot, chatId, "❗ Укажите товар для удаления.");

      const cart = await getUserCart(chatId.toString());
      if (!cart)
        return safeSend(
          bot,
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );

      const product = cart.products.find(
        (p) => p.text.toLowerCase() === textToRemove.toLowerCase()
      );
      if (product) {
        cart.products = cart.products.filter(
          (p) => p._id?.toString() !== product._id?.toString()
        );
        await cart.save();
        await sendCart(bot, cart.activeFamilyId!, cart);
      } else {
        await sendCart(bot, cart.activeFamilyId!, cart);
      }
    } catch (err) {
      console.error("/remove handler error", err);
      safeSend(bot, chatId, "❌ Произошла ошибка при удалении товара.");
    }
  });

  // /clear — очистка корзины
  bot.onText(/\/clear/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const cart = await getUserCart(chatId.toString());
      if (!cart)
        return safeSend(
          bot,
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );

      cart.products = [];
      await cart.save();
      await sendCart(bot, cart.activeFamilyId!, cart);
    } catch (err) {
      console.error("/clear handler error", err);
      safeSend(bot, chatId, "❌ Произошла ошибка при очистке корзины.");
    }
  });
};
