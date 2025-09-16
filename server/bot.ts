import TelegramBot from "node-telegram-bot-api";
import { TOKEN, USE_WEBHOOK, URL } from "./config";
import { registerCommands } from "./bot/commands";

let bot: TelegramBot;

export const startBot = async () => {
  if (USE_WEBHOOK) {
    bot = new TelegramBot(TOKEN, { webHook: true });
    await bot.setWebHook(`${URL}/bot${TOKEN}`);
    console.log("📡 Бот работает через WEBHOOK");
  } else {
    bot = new TelegramBot(TOKEN, { polling: true });
    await bot.deleteWebHook();
    console.log("🔄 Бот работает через POLLING");
  }

  registerCommands(bot);
};

export { bot };
