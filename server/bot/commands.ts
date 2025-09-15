import TelegramBot, {
  InlineKeyboardButton,
  Message,
} from "node-telegram-bot-api";
import { Cart } from "../models/Cart";
import { escapeMarkdownV2, sendFamilyCart } from "./helpers";

export const registerCommands = (bot: TelegramBot) => {
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
    bot.sendMessage(chatId, escapeMarkdownV2(helpText), {
      parse_mode: "MarkdownV2",
    });
  });

  // /create
  bot.onText(/\/create/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const familyId = `${chatId}-${Date.now()}`;
      let cart = await Cart.findOne({ chatId });
      if (cart) {
        cart.familyId = familyId;
        cart.products = [];
        await cart.save();
      } else {
        cart = new Cart({ chatId, familyId, products: [] });
        await cart.save();
      }

      bot.sendMessage(
        chatId,
        `🎉 Семья создана!\nКод для присоединения: *${escapeMarkdownV2(
          familyId
        )}*`,
        { parse_mode: "MarkdownV2" }
      );
    } catch (error) {
      console.error("/create handler error", error);
      bot.sendMessage(msg.chat.id, "❌ Произошла ошибка при создании семьи.");
    }
  });

  // /join <код>
  bot.onText(/\/join (.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      const familyId = match?.[1]?.trim();
      if (!familyId)
        return bot.sendMessage(
          chatId,
          "❗ Укажите код семьи. Пример: /join <код>"
        );

      const familyCart = await Cart.findOne({ familyId });
      if (!familyCart)
        return bot.sendMessage(chatId, "❌ Семья с таким кодом не найдена.");

      let userCart = await Cart.findOne({ chatId });
      if (!userCart) {
        userCart = new Cart({ chatId, familyId, products: [] });
      } else {
        userCart.familyId = familyId;
      }
      await userCart.save();

      bot.sendMessage(
        chatId,
        `✅ Вы присоединились к семье ${escapeMarkdownV2(familyId)}`
      );
    } catch (error) {
      console.error("/join handler error", error);
      bot.sendMessage(
        msg.chat.id,
        "❌ Произошла ошибка при присоединении к семье."
      );
    }
  });

  // /cart
  bot.onText(/\/cart/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const userCart = await Cart.findOne({ chatId });
      if (!userCart || !userCart.familyId)
        return bot.sendMessage(
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );

      const canonicalCart = await Cart.findOne({
        familyId: userCart.familyId,
      }).sort({ createdAt: 1 });
      const cartText =
        canonicalCart?.products
          .map((p) => `${p.bought ? "✅" : "❌"} ${p.text}`)
          .join("\n") || "пусто";

      const inlineKeyboard: InlineKeyboardButton[][] =
        canonicalCart?.products.map((p, i) => [
          {
            text: `Купить "${escapeMarkdownV2(p.text)}"`,
            callback_data: `bought_${i}`,
          },
        ]) || [];

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

      const userCart = await Cart.findOne({ chatId });
      if (!userCart || !userCart.familyId)
        return bot.sendMessage(
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );

      const canonicalCart = await Cart.findOne({
        familyId: userCart.familyId,
      }).sort({ createdAt: 1 });
      canonicalCart!.products = canonicalCart!.products.filter(
        (p) => p.text !== textToRemove
      );
      await canonicalCart!.save();

      await sendFamilyCart(
        bot,
        userCart.familyId,
        `❌ "${escapeMarkdownV2(textToRemove)}" удален из корзины.`
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
      const userCart = await Cart.findOne({ chatId });
      if (!userCart || !userCart.familyId)
        return bot.sendMessage(
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );

      const canonicalCart = await Cart.findOne({
        familyId: userCart.familyId,
      }).sort({ createdAt: 1 });
      canonicalCart!.products = [];
      await canonicalCart!.save();

      await sendFamilyCart(bot, userCart.familyId, "🗑 Корзина очищена.");
    } catch (error) {
      console.error("/clear handler error", error);
      bot.sendMessage(msg.chat.id, "❌ Произошла ошибка при очистке корзины.");
    }
  });
};
