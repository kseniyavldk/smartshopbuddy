// server/bot.ts
import TelegramBot from "node-telegram-bot-api";
import { TOKEN, USE_WEBHOOK, URL } from "./config";
import { registerCommands } from "./bot/commands";

let bot: TelegramBot;

export const startBot = () => {
  if (USE_WEBHOOK) {
    bot = new TelegramBot(TOKEN, { webHook: true });
    bot.setWebHook(`${URL}/bot${TOKEN}`);
    console.log("📡 Бот работает через WEBHOOK");
  } else {
    bot = new TelegramBot(TOKEN, { polling: true });
    console.log("🔄 Бот работает через POLLING");
  }

  registerCommands(bot);
};

export { bot };
