import { Cart, ICart } from "../models/Cart";
import TelegramBot from "node-telegram-bot-api";

export const escapeMarkdownV2 = (text: string) =>
  text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");

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
