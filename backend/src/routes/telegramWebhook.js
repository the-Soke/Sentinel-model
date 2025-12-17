import express from "express";
import TelegramBot from "node-telegram-bot-api";

const router = express.Router();
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

router.post("/telegram", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

export default router;
