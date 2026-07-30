import { createNodexBot } from "@nodex/telegram";

const result = createNodexBot("client", process.env.TELEGRAM_CLIENT_BOT_TOKEN);
if (!result.enabled) console.info("Client bot disabled locally: missing token");
else await result.bot.start();
