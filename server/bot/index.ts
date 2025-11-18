import TelegramBot from "node-telegram-bot-api";
import { TOKEN, URL, USE_WEBHOOK } from "../config";
import { registerCommands } from "./commands";
import { registerMessageHandler } from "./messageHandler";
import { registerCallbackHandler } from "./callbackHandler";
import { registerMainMenu } from "./mainMenu";

let bot: TelegramBot;

export const startBot = async () => {
  if (USE_WEBHOOK) {
    bot = new TelegramBot(TOKEN, { webHook: true });
    await bot.setWebHook(`${URL}/bot${TOKEN}`);
    console.log("📡 Бот работает через WEBHOOK");
  } else {
    bot = new TelegramBot(TOKEN, { polling: true });
    console.log("🔄 Бот работает через POLLING");
  }

  registerCommands(bot);
  registerMainMenu(bot);
  registerMessageHandler(bot);
  registerCallbackHandler(bot);

  console.log("🤖 Telegram Bot started");
};

export { bot };
