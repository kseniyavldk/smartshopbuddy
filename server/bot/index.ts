import TelegramBot from "node-telegram-bot-api";
import { TOKEN, URL, USE_WEBHOOK } from "../config";
import { registerCommands } from "./commands";
import { registerMessageHandler } from "./messageHandler";
import { registerCallbackHandler } from "./callbackHandler";
import { registerMainMenu } from "./mainMenu";

let bot: TelegramBot;

if (USE_WEBHOOK) {
  bot = new TelegramBot(TOKEN, { webHook: true });
  bot.setWebHook(`${URL}/bot${TOKEN}`);
} else {
  bot = new TelegramBot(TOKEN, { polling: true });
}

registerCommands(bot);
registerMainMenu(bot);
registerMessageHandler(bot);
registerCallbackHandler(bot);

export { bot };
