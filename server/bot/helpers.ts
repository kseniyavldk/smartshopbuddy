import { Cart } from "../models/Cart";
import TelegramBot from "node-telegram-bot-api";

export const escapeMarkdownV2 = (text: string) => {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
};

export const sendFamilyCart = async (
  bot: TelegramBot,
  familyId: string,
  text: string
) => {
  const familyCarts = await Cart.find({ familyId });
  await Promise.all(
    familyCarts.map((member) =>
      bot.sendMessage(member.chatId, escapeMarkdownV2(text), {
        parse_mode: "MarkdownV2",
      })
    )
  );
};

export const getCanonicalFamilyCart = async (familyId: string) => {
  if (!familyId) return null;
  return Cart.findOne({ familyId }).sort({ createdAt: 1 });
};

export const generateFamilyId = (chatId: number | string) => {
  return `${chatId}-${Date.now()}`;
};

export const getUserFamilyCart = async (chatId: number) => {
  const userCart = await Cart.findOne({ chatId });
  if (!userCart?.familyId) return null;

  const canonicalCart = await getCanonicalFamilyCart(userCart.familyId);
  if (!canonicalCart) return null;

  return { userCart, canonicalCart };
};
