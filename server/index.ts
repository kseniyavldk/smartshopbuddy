// server/index.ts
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Cart } from "./models/Cart";

dotenv.config();

const token = process.env.BOT_TOKEN!;
const port = process.env.PORT || 3000;

const bot = new TelegramBot(token, { polling: true });

const MAX_ITEM_LENGTH = 50; // ограничение длины названия товара

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// /start — приветствие и создание корзины пользователя
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const cart = await Cart.findOneAndUpdate(
      { chatId },
      { $setOnInsert: { products: [] } },
      { upsert: true, new: true }
    );

    await bot.sendMessage(
      chatId,
      `Добро пожаловать в SmartShopBuddy! 🛒\nНапишите название товара, чтобы добавить его в корзину.\n\nПример: *Banana*, *Milk*, *Bread*\n\n/commands — список команд`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, "❌ Произошла ошибка, попробуйте позже.");
  }
});

// /commands — показать список команд
bot.onText(/\/commands/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `Команды:\n
/start — начать работу\n
/cart — показать корзину\n
/create — создать семью\n
/join <код> — присоединиться к семье\n
/delete <номер> — удалить товар из корзины\n
/toggle <номер> — отметить товар купленным/не купленным`
  );
});

// /cart — показать корзину с inline-кнопками
bot.onText(/\/cart/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const userCart = await Cart.findOne({ chatId });
    if (!userCart) {
      return bot.sendMessage(
        chatId,
        "❗ Сначала создайте или присоединитесь к семье."
      );
    }

    const familyCarts = await Cart.find({ familyId: userCart.familyId });
    if (familyCarts.length === 0) {
      return bot.sendMessage(chatId, "❌ Корзина семьи не найдена.");
    }

    const mainCart = familyCarts[0];
    if (mainCart.products.length === 0) {
      return bot.sendMessage(chatId, "🛒 Ваша корзина пуста.");
    }

    const cartText = mainCart.products
      .map((p, i) => `${i + 1}. ${p.bought ? "✅" : "⬜"} ${p.text}`)
      .join("\n");

    const inlineKeyboard = mainCart.products.map((_, i) => [
      { text: `Toggle ${i + 1}`, callback_data: `toggle_${i}` },
      { text: `Delete ${i + 1}`, callback_data: `delete_${i}` },
    ]);

    await bot.sendMessage(chatId, `🛒 Ваша корзина:\n${cartText}`, {
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, "❌ Произошла ошибка, попробуйте позже.");
  }
});

// /create — создать семью с уникальным familyId
bot.onText(/\/create/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const familyId = `${chatId}-${Date.now()}`;

    const cart = new Cart({ chatId, familyId, products: [] });
    await cart.save();

    await bot.sendMessage(
      chatId,
      `🎉 Семья создана!\nОтправьте этот код другим членам семьи, чтобы они присоединились:\n\n*${familyId}*`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, "❌ Произошла ошибка при создании семьи.");
  }
});

// /join <код> — присоединиться к существующей семье
bot.onText(/\/join (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const familyId = match?.[1]?.trim();

  if (!familyId) {
    return bot.sendMessage(
      chatId,
      "❗ Пожалуйста, укажите код семьи. Пример: /join <код>"
    );
  }

  try {
    const familyCart = await Cart.findOne({ familyId });
    if (!familyCart) {
      return bot.sendMessage(chatId, "❌ Семья с таким кодом не найдена.");
    }

    let userCart = await Cart.findOne({ chatId });
    if (!userCart) {
      userCart = new Cart({ chatId, familyId, products: [] });
    } else {
      userCart.familyId = familyId;
    }
    await userCart.save();

    await bot.sendMessage(chatId, `✅ Вы присоединились к семье ${familyId}`);
  } catch (error) {
    console.error(error);
    await bot.sendMessage(
      chatId,
      "❌ Произошла ошибка при присоединении к семье."
    );
  }
});

// Обработка callback кнопок toggle и delete
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message?.chat.id;
  const data = callbackQuery.data;

  if (!chatId || !data) return;

  try {
    const userCart = await Cart.findOne({ chatId });
    if (!userCart) {
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❗ Сначала создайте или присоединитесь к семье.",
      });
    }

    const familyCarts = await Cart.find({ familyId: userCart.familyId });
    if (familyCarts.length === 0) {
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Корзина семьи не найдена.",
      });
    }

    const mainCart = familyCarts[0];

    const [action, indexStr] = data.split("_");
    const index = parseInt(indexStr, 10);

    if (isNaN(index) || index < 0 || index >= mainCart.products.length) {
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Некорректный индекс товара.",
      });
    }

    if (action === "toggle") {
      mainCart.products[index].bought = !mainCart.products[index].bought;
      await mainCart.save();
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `Товар "${mainCart.products[index].text}" отмечен как ${
          mainCart.products[index].bought ? "купленный" : "не купленный"
        }`,
      });
    } else if (action === "delete") {
      const removed = mainCart.products.splice(index, 1);
      await mainCart.save();
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `Товар "${removed[0].text}" удалён из корзины`,
      });
    } else {
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Неизвестное действие.",
      });
    }

    // Обновляем сообщение с корзиной
    if (callbackQuery.message) {
      if (mainCart.products.length === 0) {
        await bot.editMessageText("🛒 Ваша корзина пуста.", {
          chat_id: callbackQuery.message.chat.id,
          message_id: callbackQuery.message.message_id,
        });
      } else {
        const cartText = mainCart.products
          .map((p, i) => `${i + 1}. ${p.bought ? "✅" : "⬜"} ${p.text}`)
          .join("\n");

        const inlineKeyboard = mainCart.products.map((_, i) => [
          { text: `Toggle ${i + 1}`, callback_data: `toggle_${i}` },
          { text: `Delete ${i + 1}`, callback_data: `delete_${i}` },
        ]);

        await bot.editMessageText(`🛒 Ваша корзина:\n${cartText}`, {
          chat_id: callbackQuery.message.chat.id,
          message_id: callbackQuery.message.message_id,
          reply_markup: { inline_keyboard: inlineKeyboard },
        });
      }
    }
  } catch (error) {
    console.error(error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Произошла ошибка, попробуйте позже.",
    });
  }
});

// Обработка сообщений с товарами (добавление в корзину)
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Игнорируем команды
  if (!text || text.startsWith("/")) return;

  if (text.length > MAX_ITEM_LENGTH) {
    return bot.sendMessage(
      chatId,
      `❗ Название товара слишком длинное (макс. ${MAX_ITEM_LENGTH} символов).`
    );
  }

  try {
    const userCart = await Cart.findOne({ chatId });
    if (!userCart) {
      return bot.sendMessage(
        chatId,
        "❗ Сначала создайте или присоединитесь к семье командой /create или /join <код>"
      );
    }

    const familyCarts = await Cart.find({ familyId: userCart.familyId });
    if (familyCarts.length === 0) {
      return bot.sendMessage(chatId, "❌ Корзина семьи не найдена.");
    }

    const mainCart = familyCarts[0];

    mainCart.products.push({ text, bought: false });
    await mainCart.save();

    await bot.sendMessage(chatId, `✅ Товар "${text}" добавлен в корзину!`);
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, "❌ Произошла ошибка, попробуйте позже.");
  }
});

// Запуск express-сервера (если нужен)
const app = express();
app.get("/", (_req, res) => res.send("SmartShopBuddy Bot is running."));
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
