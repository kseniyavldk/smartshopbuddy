import TelegramBot from "node-telegram-bot-api";
import Cart, { ICart, IProduct } from "../models/Cart";

export const escapeMarkdownV2 = (text: string) =>
  String(text ?? "").replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");

const splitMessage = (text: string, max = 3900) => {
  const parts: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if ((current + "\n" + line).length > max) {
      if (current) parts.push(current);
      if (line.length > max) {
        for (let i = 0; i < line.length; i += max) {
          parts.push(line.slice(i, i + max));
        }
        current = "";
      } else {
        current = line;
      }
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) parts.push(current);
  return parts;
};

export const getUserFamilyCart = async (
  chatId: string,
  familyId?: string
): Promise<ICart | null> => {
  const query: any = { chatId };
  if (familyId) query.familyId = familyId;

  const cartDoc = await Cart.findOne(query).exec();
  if (!cartDoc) return null;

  const cart = cartDoc.toObject() as ICart;

  cart.products = Array.isArray(cart.products) ? cart.products : [];
  cart.archivedProducts = Array.isArray(cart.archivedProducts)
    ? cart.archivedProducts
    : [];

  return cart;
};

export const sendFamilyCart = async (
  bot: TelegramBot,
  chatId: string,
  familyId?: string
) => {
  const cart = await getUserFamilyCart(chatId, familyId);
  if (!cart || cart.products.length === 0) {
    try {
      await bot.sendMessage(chatId, "Корзина пуста");
    } catch (err) {
      console.error("bot.sendMessage error:", err);
    }
    return;
  }

  const lines = cart.products.map((p, idx) => {
    const name = escapeMarkdownV2(p.text);
    const bought = p.bought ? "✅" : "❌";
    return `${idx + 1}. ${name} ${bought}`;
  });

  const header = cart.familyId
    ? `Корзина (${escapeMarkdownV2(cart.familyId)}):\n`
    : "Корзина:\n";
  const text = header + lines.join("\n");

  const parts = splitMessage(text);
  for (const part of parts) {
    try {
      await bot.sendMessage(chatId, part, {
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      });
    } catch (err) {
      console.error("bot.sendMessage chunk error:", err);
    }
  }
};
