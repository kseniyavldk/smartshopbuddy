import TelegramBot, { Message } from "node-telegram-bot-api";
import Cart, { ICart, IProduct } from "../models/Cart";
import { escapeMarkdownV2, sendFamilyCart } from "./helpers";

export const registerMessageHandler = (bot: TelegramBot) => {
  bot.on("message", async (msg: Message) => {
    try {
      const chatId = String(msg.chat.id);
      const text = msg.text?.trim();
      if (!text || text.startsWith("/")) return;

      const userCart = await Cart.findOne({ chatId }).exec();
      const activeFamilyId = (userCart as ICart & { activeFamilyId?: string })
        ?.activeFamilyId;

      if (!userCart || !activeFamilyId) {
        await bot.sendMessage(
          chatId,
          "❗ Сначала создайте или присоединитесь к семье."
        );
        return;
      }

      const carts = (userCart as ICart & { carts?: ICart[] }).carts ?? [];
      const familyCart = carts.find((c) => c.familyId === activeFamilyId) as
        | ICart
        | undefined;

      if (!familyCart) {
        await bot.sendMessage(chatId, "❌ Не удалось найти семейную корзину.");
        return;
      }

      familyCart.products = familyCart.products ?? [];

      const exists = familyCart.products.some(
        (p: IProduct) => p.text.toLowerCase() === text.toLowerCase()
      );
      if (exists) {
        await bot.sendMessage(
          chatId,
          `ℹ️ Товар уже в корзине: ${escapeMarkdownV2(text)}`,
          {
            parse_mode: "MarkdownV2",
          }
        );
        return;
      }

      const newProduct: IProduct = {
        text,
        bought: false,
        updatedAt: new Date(),
      };
      familyCart.products.push(newProduct);

      await userCart.save();

      const cartText = familyCart.products
        .map((p) => `${p.bought ? "✅" : "❌"} ${p.text}`)
        .join("\n");

      const confirmation = `✅ "${escapeMarkdownV2(
        text
      )}" добавлен в корзину.\n\nТекущий список:\n${escapeMarkdownV2(
        cartText
      )}`;

      try {
        await bot.sendMessage(chatId, confirmation, {
          parse_mode: "MarkdownV2",
          disable_web_page_preview: true,
        });
      } catch (err) {
        console.error("bot.sendMessage confirmation error:", err);
      }

      try {
        await sendFamilyCart(bot, chatId, activeFamilyId);
      } catch (err) {
        console.error("sendFamilyCart error:", err);
      }
    } catch (error) {
      console.error("message handler error", error);
      try {
        await bot.sendMessage(
          String(msg.chat.id),
          "❌ Произошла ошибка при добавлении товара."
        );
      } catch (e) {
        console.error("failed to notify user about error:", e);
      }
    }
  });
};
