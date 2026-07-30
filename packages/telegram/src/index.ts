import { Bot } from "grammy";

export function createNodexBot(name: string, token?: string) {
  if (!token) {
    return { enabled: false as const, name, reason: "missing_token" };
  }
  const bot = new Bot(token);
  bot.command("start", (ctx) => ctx.reply(`Nodex ${name} bot is running in foundation mode.`));
  bot.command("health", (ctx) => ctx.reply("ok"));
  bot.catch((error) => {
    console.error({ bot: name, error }, "Telegram bot error");
  });
  return { enabled: true as const, name, bot };
}
