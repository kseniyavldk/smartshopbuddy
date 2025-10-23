import { Cart, ICart, IFamilyCart } from "../models/Cart";
import TelegramBot from "node-telegram-bot-api";

export const escapeMarkdownV2 = (text: string) =>
  text?.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1") || "";

export const sendFamilyCart = async (
  bot: TelegramBot,
  familyId: string,
  text: string
) => {
  if (!familyId) return;

  const members = await Cart.find({ familyIds: familyId });
  await Promise.allSettled(
    members.map((m) =>
      bot.sendMessage(m.chatId, escapeMarkdownV2(text), {
        parse_mode: "MarkdownV2",
      })
    )
  );
};

export const generateFamilyId = (chatId: number | string) =>
  `${chatId}-${Date.now()}`;

export const getUserFamilyCart = async (
  chatId: number
): Promise<{ userCart: ICart; familyCart: IFamilyCart } | null> => {
  const userCart = await Cart.findOne({ chatId }).exec();
  if (!userCart?.activeFamilyId) return null;

  const familyCart = userCart.carts.find(
    (c) => c.familyId === userCart.activeFamilyId
  );
  if (!familyCart) return null;

  return { userCart, familyCart };
};
