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

export const generateFamilyId = (chatId: string | number) => {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${chatId}-${randomPart}`;
};

export const getUserCart = async (
  chatId: string | number
): Promise<ICart | null> => {
  const cart = await Cart.findOne({ chatId: String(chatId) }).exec();
  return cart;
};

export const sendCart = async (
  bot: TelegramBot,
  chatId: string | number,
  cart: ICart
) => {
  if (!cart || cart.products.length === 0) {
    try {
      await bot.sendMessage(chatId, "Корзина пуста");
    } catch (err) {
      console.error("bot.sendMessage error:", err);
    }
    return;
  }

  const lines = cart.products.map((p: IProduct, idx: number) => {
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
      await bot.sendMessage(chatId, part, { parse_mode: "MarkdownV2" });
    } catch (err) {
      console.error("bot.sendMessage chunk error:", err);
    }
  }
};
