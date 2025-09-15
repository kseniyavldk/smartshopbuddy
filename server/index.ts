import TelegramBot from "node-telegram-bot-api";
import express from "express";
import { registerCommands } from "./bot/commands";
import { registerMessageHandler } from "./bot/messageHandler";
import { registerCallbackHandler } from "./bot/callbackHandler";
import { TOKEN, URL, PORT, USE_WEBHOOK } from "./config";

const app = express();
app.use(express.json());

let bot: TelegramBot;

if (USE_WEBHOOK) {
  bot = new TelegramBot(TOKEN, { webHook: true });
  bot.setWebHook(`${URL}/bot${TOKEN}`);
  app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
} else {
  bot = new TelegramBot(TOKEN, { polling: true });
}

registerCommands(bot);
registerMessageHandler(bot);
registerCallbackHandler(bot);

export { app, bot };
