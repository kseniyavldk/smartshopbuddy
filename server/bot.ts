import TelegramBot from "node-telegram-bot-api";
import { TOKEN, USE_WEBHOOK, URL } from "./config";

let bot: TelegramBot;

export const startBot = async () => {
  if (USE_WEBHOOK) {
    bot = new TelegramBot(TOKEN, { webHook: true });
    await bot.setWebHook(`${URL}/bot${TOKEN}`);
    console.log("📡 Бот работает через WEBHOOK");
  } else {
    const tempBot = new TelegramBot(TOKEN);
    await tempBot.deleteWebHook();
    console.log("✅ Старый webhook удалён");

    bot = new TelegramBot(TOKEN, { polling: true });
    console.log("🔄 Бот работает через POLLING");
  }
};

export { bot };
